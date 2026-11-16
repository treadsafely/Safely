// The Windows half of the desktop secret store: a thin bridge from Node to Windows Hello.
// Four calls, no state and no crypto of ours — the key never leaves the platform, what comes back
// is a signature, a yes/no, or a status. Every call blocks a libuv worker thread on the WinRT
// operation; the renderer waits on a promise. See .claude/rules/desktop-secret-store-windows.md.

#include <napi.h>

#include <windows.h>

#include <UserConsentVerifierInterop.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Security.Credentials.UI.h>
#include <winrt/Windows.Security.Credentials.h>
#include <winrt/Windows.Security.Cryptography.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/base.h>

#include <chrono>
#include <cstdint>
#include <functional>
#include <string>
#include <vector>

namespace {

using winrt::Windows::Foundation::AsyncStatus;
using winrt::Windows::Foundation::IAsyncOperation;
using winrt::Windows::Security::Credentials::KeyCredential;
using winrt::Windows::Security::Credentials::KeyCredentialAttestationStatus;
using winrt::Windows::Security::Credentials::KeyCredentialCreationOption;
using winrt::Windows::Security::Credentials::KeyCredentialManager;
using winrt::Windows::Security::Credentials::KeyCredentialRetrievalResult;
using winrt::Windows::Security::Credentials::KeyCredentialStatus;
using winrt::Windows::Security::Credentials::UI::UserConsentVerificationResult;
using winrt::Windows::Security::Credentials::UI::UserConsentVerifier;
using winrt::Windows::Security::Cryptography::CryptographicBuffer;
using winrt::Windows::Storage::Streams::IBuffer;

// What a task hands back to JavaScript: a status string, an optional byte payload and a flag.
struct Outcome {
  std::string status;
  std::vector<uint8_t> bytes;
  bool flag = false;
};

using Task = std::function<Outcome()>;
using Resolve = std::function<Napi::Value(Napi::Env, const Outcome&)>;

std::string HresultMessage(const char* operation, HRESULT code) {
  char buffer[64];
  snprintf(buffer, sizeof(buffer), "%s failed with HRESULT 0x%08lX", operation,
           static_cast<unsigned long>(code));
  return buffer;
}

class Worker : public Napi::AsyncWorker {
 public:
  Worker(Napi::Env env, const char* operation, Task task, Resolve resolve)
      : Napi::AsyncWorker(env),
        deferred_(Napi::Promise::Deferred::New(env)),
        operation_(operation),
        task_(std::move(task)),
        resolve_(std::move(resolve)) {}

  Napi::Promise Promise() { return deferred_.Promise(); }

 protected:
  void Execute() override {
    try {
      outcome_ = task_();
    } catch (const winrt::hresult_error& error) {
      SetError(HresultMessage(operation_, error.code()));
    } catch (...) {
      SetError(std::string(operation_) + " failed");
    }
  }

  void OnOK() override {
    Napi::Env env = Env();
    Napi::HandleScope scope(env);
    deferred_.Resolve(resolve_(env, outcome_));
  }

  void OnError(const Napi::Error& error) override {
    Napi::HandleScope scope(Env());
    deferred_.Reject(error.Value());
  }

 private:
  Napi::Promise::Deferred deferred_;
  const char* operation_;
  Task task_;
  Resolve resolve_;
  Outcome outcome_;
};

Napi::Value Queue(Napi::Env env, const char* operation, Task task, Resolve resolve) {
  auto* worker = new Worker(env, operation, std::move(task), std::move(resolve));
  worker->Queue();
  return worker->Promise();
}

Napi::Value ResolveFlag(Napi::Env env, const Outcome& outcome) {
  return Napi::Boolean::New(env, outcome.flag);
}

Napi::Value ResolveUndefined(Napi::Env env, const Outcome&) { return env.Undefined(); }

Napi::Value ResolveSignResult(Napi::Env env, const Outcome& outcome) {
  Napi::Object result = Napi::Object::New(env);
  result.Set("status", Napi::String::New(env, outcome.status));
  if (outcome.status == "signed") {
    result.Set("signature",
               Napi::Buffer<uint8_t>::Copy(env, outcome.bytes.data(), outcome.bytes.size()));
  }
  return result;
}

// A retrieval status in the vocabulary the store understands; "signed" is set by the caller.
const char* StatusOf(KeyCredentialStatus status) {
  switch (status) {
    case KeyCredentialStatus::Success:
      return "signed";
    case KeyCredentialStatus::UserCanceled:
    case KeyCredentialStatus::UserPrefersPassword:
      return "cancelled";
    case KeyCredentialStatus::NotFound:
      return "notFound";
    default:
      return "failed";
  }
}

HWND WindowOf(const Napi::Value& value) {
  if (!value.IsBuffer()) {
    return nullptr;
  }
  Napi::Buffer<uint8_t> buffer = value.As<Napi::Buffer<uint8_t>>();
  if (buffer.Length() != sizeof(HWND)) {
    return nullptr;
  }
  HWND window = nullptr;
  memcpy(&window, buffer.Data(), sizeof(HWND));
  return window;
}

std::vector<uint8_t> BytesOf(const IBuffer& buffer) {
  winrt::com_array<uint8_t> bytes;
  CryptographicBuffer::CopyToByteArray(buffer, bytes);
  return std::vector<uint8_t>(bytes.begin(), bytes.end());
}

// The Hello dialog belongs to another process, and Windows does not let that process take the
// foreground from ours: after the first prompt of a launch it opens behind the app and only
// flashes in the taskbar. We hold the foreground, so we hand it over — once, so a user who then
// switches away is not dragged back. KeePassXC and Bitwarden find the dialog the same way.
template <typename Operation>
auto AwaitPrompt(Operation operation) {
  bool handedOver = false;

  while (operation.wait_for(std::chrono::milliseconds(200)) == AsyncStatus::Started) {
    if (handedOver) {
      continue;
    }
    HWND prompt = FindWindowW(L"Credential Dialog Xaml Host", nullptr);
    if (prompt != nullptr) {
      handedOver = GetForegroundWindow() == prompt || SetForegroundWindow(prompt) != 0;
    }
  }

  return operation.get();
}

Napi::Value IsSupported(const Napi::CallbackInfo& info) {
  return Queue(
      info.Env(), "IsSupportedAsync",
      [] {
        Outcome outcome;
        outcome.flag = KeyCredentialManager::IsSupportedAsync().get();
        return outcome;
      },
      ResolveFlag);
}

// sign(credentialName, mode, challenge, windowHandle): the credential is created on the first
// launch and opened afterwards, and the signature is what the store derives its file key from.
// The key must attest to a TPM, checked once at creation: a later launch opens a credential that
// already passed, and a transient attestation failure there must not lock an initialised store.
// The window handle is accepted for parity with the consent prompt; the key credential API takes
// none, which is why its dialog is brought forward by AwaitPrompt instead.
Napi::Value Sign(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() || !info[2].IsBuffer()) {
    Napi::TypeError::New(env, "sign(credentialName: string, mode: string, challenge: Buffer, windowHandle)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string name = info[0].As<Napi::String>().Utf8Value();
  std::string mode = info[1].As<Napi::String>().Utf8Value();
  Napi::Buffer<uint8_t> challengeBuffer = info[2].As<Napi::Buffer<uint8_t>>();
  std::vector<uint8_t> challenge(challengeBuffer.Data(), challengeBuffer.Data() + challengeBuffer.Length());

  return Queue(
      env, "RequestSignAsync",
      [name, mode, challenge] {
        Outcome outcome;
        winrt::hstring credentialName = winrt::to_hstring(name);

        KeyCredentialRetrievalResult retrieval =
            mode == "create"
                ? AwaitPrompt(KeyCredentialManager::RequestCreateAsync(
                      credentialName, KeyCredentialCreationOption::FailIfExists))
                : KeyCredentialManager::OpenAsync(credentialName).get();

        if (retrieval.Status() != KeyCredentialStatus::Success) {
          outcome.status = StatusOf(retrieval.Status());
          return outcome;
        }

        KeyCredential credential = retrieval.Credential();

        if (mode == "create") {
          auto attestation = credential.GetAttestationAsync().get();

          if (attestation.Status() == KeyCredentialAttestationStatus::TemporaryFailure) {
            outcome.status = "failed";
            return outcome;
          }
          if (attestation.Status() != KeyCredentialAttestationStatus::Success) {
            outcome.status = "unsupported";
            return outcome;
          }
        }

        IBuffer input = CryptographicBuffer::CreateFromByteArray(
            winrt::array_view<const uint8_t>(challenge.data(), challenge.data() + challenge.size()));
        auto signing = AwaitPrompt(credential.RequestSignAsync(input));

        outcome.status = StatusOf(signing.Status());
        if (signing.Status() == KeyCredentialStatus::Success) {
          outcome.bytes = BytesOf(signing.Result());
        }
        return outcome;
      },
      ResolveSignResult);
}

// verifyPresence(windowHandle, message): the consent dialog, parented to our window through the
// desktop interop factory so it opens over the app rather than behind it.
Napi::Value VerifyPresence(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[1].IsString()) {
    Napi::TypeError::New(env, "verifyPresence(windowHandle, message: string)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  HWND window = WindowOf(info[0]);
  std::string message = info[1].As<Napi::String>().Utf8Value();

  return Queue(
      env, "RequestVerificationAsync",
      [window, message] {
        Outcome outcome;
        winrt::hstring text = winrt::to_hstring(message);
        UserConsentVerificationResult result = UserConsentVerificationResult::DeviceNotPresent;

        if (window == nullptr) {
          result = UserConsentVerifier::RequestVerificationAsync(text).get();
        } else {
          auto factory =
              winrt::get_activation_factory<UserConsentVerifier, ::IUserConsentVerifierInterop>();
          IAsyncOperation<UserConsentVerificationResult> operation{nullptr};
          winrt::check_hresult(factory->RequestVerificationForWindowAsync(
              window, static_cast<HSTRING>(winrt::get_abi(text)),
              winrt::guid_of<IAsyncOperation<UserConsentVerificationResult>>(),
              winrt::put_abi(operation)));
          result = operation.get();
        }

        outcome.flag = result == UserConsentVerificationResult::Verified;
        return outcome;
      },
      ResolveFlag);
}

Napi::Value DeleteCredential(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "deleteCredential(credentialName: string)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string name = info[0].As<Napi::String>().Utf8Value();

  return Queue(
      env, "DeleteAsync",
      [name] {
        KeyCredentialManager::DeleteAsync(winrt::to_hstring(name)).get();
        return Outcome{};
      },
      ResolveUndefined);
}

// WinRT needs COM on the calling thread, and a libuv worker has no apartment of its own: keeping
// the process-wide MTA alive once makes every worker an implicit member of it. The cookie is
// never decremented — the module lives as long as the process.
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  CO_MTA_USAGE_COOKIE cookie = nullptr;
  CoIncrementMTAUsage(&cookie);

  exports.Set("isSupported", Napi::Function::New(env, IsSupported));
  exports.Set("sign", Napi::Function::New(env, Sign));
  exports.Set("verifyPresence", Napi::Function::New(env, VerifyPresence));
  exports.Set("deleteCredential", Napi::Function::New(env, DeleteCredential));
  return exports;
}

}  // namespace

NODE_API_MODULE(hello, Init)
