#import <Foundation/Foundation.h>
#import <Security/Security.h>

#include <napi.h>

#include <functional>
#include <string>
#include <vector>

namespace {

// kSecUseDataProtectionKeychain is required in every query: without it the same call reaches the
// legacy file-based keychain, where items are guarded by phishable per-item ACLs instead of by the
// access group our provisioning profile grants.
NSMutableDictionary* ServiceQuery(NSString* service) {
  return [@{
    (__bridge id)kSecClass : (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecUseDataProtectionKeychain : @YES,
    (__bridge id)kSecAttrSynchronizable : @NO,
    (__bridge id)kSecAttrService : service
  } mutableCopy];
}

NSMutableDictionary* ItemQuery(NSString* service, NSString* account) {
  NSMutableDictionary* query = ServiceQuery(service);
  query[(__bridge id)kSecAttrAccount] = account;

  return query;
}

// Not `@(value.c_str())`: a key holding a NUL would be truncated there, and two keys would collide.
NSString* ToNSString(const std::string& value) {
  return [[NSString alloc] initWithBytes:value.data()
                                  length:value.size()
                                encoding:NSUTF8StringEncoding];
}

std::string StatusMessage(const char* operation, OSStatus status) {
  return std::string(operation) + " failed with OSStatus " + std::to_string(status);
}

// What every operation may produce: nothing, one value, or a list of accounts.
struct ItemResult {
  bool found = false;
  std::vector<std::string> values;
};

// Returns false and fills `error` instead of throwing: C++ exceptions are off (see binding.gyp).
using ItemTask = std::function<bool(ItemResult&, std::string&)>;

using ResolveResult = std::function<Napi::Value(Napi::Env, const ItemResult&)>;

// Every call reaches securityd over XPC, and the store is on the app's hot path: doing that on the
// main thread would stall the Electron main loop on every read.
class ItemWorker : public Napi::AsyncWorker {
 public:
  ItemWorker(Napi::Env env, ItemTask task, ResolveResult resolve)
      : Napi::AsyncWorker(env),
        deferred_(Napi::Promise::Deferred::New(env)),
        task_(std::move(task)),
        resolve_(std::move(resolve)) {}

  Napi::Promise Promise() { return deferred_.Promise(); }

 protected:
  void Execute() override {
    @autoreleasepool {
      std::string message;

      if (!task_(result_, message)) {
        SetError(message);
      }
    }
  }

  void OnOK() override {
    Napi::Env env = Env();
    Napi::HandleScope scope(env);

    deferred_.Resolve(resolve_(env, result_));
  }

  void OnError(const Napi::Error& error) override {
    Napi::HandleScope scope(Env());

    deferred_.Reject(error.Value());
  }

 private:
  Napi::Promise::Deferred deferred_;
  ItemTask task_;
  ResolveResult resolve_;
  ItemResult result_;
};

Napi::Value ResolveUndefined(Napi::Env env, const ItemResult&) { return env.Undefined(); }

Napi::Value ResolveBuffer(Napi::Env env, const ItemResult& result) {
  if (!result.found) {
    return env.Null();
  }

  const std::string& value = result.values.front();

  return Napi::Buffer<uint8_t>::Copy(env, reinterpret_cast<const uint8_t*>(value.data()),
                                     value.size());
}

Napi::Value ResolveStrings(Napi::Env env, const ItemResult& result) {
  Napi::Array accounts = Napi::Array::New(env, result.values.size());

  for (size_t index = 0; index < result.values.size(); index++) {
    accounts.Set(index, Napi::String::New(env, result.values[index]));
  }

  return accounts;
}

Napi::Value Queue(Napi::Env env, ItemTask task, ResolveResult resolve) {
  ItemWorker* worker = new ItemWorker(env, std::move(task), std::move(resolve));

  worker->Queue();

  return worker->Promise();
}

bool RunDelete(NSDictionary* query, std::string& error) {
  OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);

  // Deleting what is not there is the contract of `removeItem`, not a failure.
  if (status != errSecSuccess && status != errSecItemNotFound) {
    error = StatusMessage("SecItemDelete", status);

    return false;
  }

  return true;
}

// Reads answer errSecItemNotFound with or without the entitlement, so only a write reveals whether
// this build may reach the data protection keychain at all: without it SecItemAdd answers
// errSecMissingEntitlement (-34018).
Napi::Value IsAvailable(const Napi::CallbackInfo& info) {
  @autoreleasepool {
    NSString* service = @"com.safely.wallet-desktop.keychain-probe";
    NSMutableDictionary* item = ItemQuery(service, @"probe");
    item[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly;
    item[(__bridge id)kSecValueData] = [NSData dataWithBytes:"\x01" length:1];

    // A previous run that died between the add and the delete would otherwise fail this one.
    SecItemDelete((__bridge CFDictionaryRef)ItemQuery(service, @"probe"));

    OSStatus status = SecItemAdd((__bridge CFDictionaryRef)item, NULL);

    if (status != errSecSuccess) {
      return Napi::Boolean::New(info.Env(), false);
    }

    SecItemDelete((__bridge CFDictionaryRef)ItemQuery(service, @"probe"));

    return Napi::Boolean::New(info.Env(), true);
  }
}

Napi::Value Get(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "get(service: string, account: string)").ThrowAsJavaScriptException();

    return env.Undefined();
  }

  std::string service = info[0].As<Napi::String>().Utf8Value();
  std::string account = info[1].As<Napi::String>().Utf8Value();

  return Queue(
      env,
      [service, account](ItemResult& result, std::string& error) {
        NSMutableDictionary* query = ItemQuery(ToNSString(service), ToNSString(account));
        query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
        query[(__bridge id)kSecReturnData] = @YES;

        CFTypeRef found = NULL;
        OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &found);

        if (status == errSecItemNotFound) {
          return true;
        }

        if (status != errSecSuccess) {
          error = StatusMessage("SecItemCopyMatching", status);

          return false;
        }

        NSData* data = (__bridge_transfer NSData*)found;

        result.found = true;
        result.values.push_back(
            std::string(reinterpret_cast<const char*>(data.bytes), data.length));

        return true;
      },
      ResolveBuffer);
}

Napi::Value Set(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsString() || !info[1].IsString() || !info[2].IsString()) {
    Napi::TypeError::New(env, "set(service: string, account: string, value: string)")
        .ThrowAsJavaScriptException();

    return env.Undefined();
  }

  std::string service = info[0].As<Napi::String>().Utf8Value();
  std::string account = info[1].As<Napi::String>().Utf8Value();
  std::string value = info[2].As<Napi::String>().Utf8Value();

  return Queue(
      env,
      [service, account, value](ItemResult&, std::string& error) {
        NSData* data = [NSData dataWithBytes:value.data() length:value.size()];
        NSMutableDictionary* item = ItemQuery(ToNSString(service), ToNSString(account));
        item[(__bridge id)kSecAttrAccessible] =
            (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly;
        item[(__bridge id)kSecValueData] = data;

        OSStatus status = SecItemAdd((__bridge CFDictionaryRef)item, NULL);

        if (status == errSecDuplicateItem) {
          // The accessibility travels with the update, so an item left by an earlier policy
          // converges on the current one instead of keeping the weaker class it was created with.
          NSDictionary* update = @{
            (__bridge id)kSecValueData : data,
            (__bridge id)kSecAttrAccessible :
                (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly
          };

          status = SecItemUpdate(
              (__bridge CFDictionaryRef)ItemQuery(ToNSString(service), ToNSString(account)),
              (__bridge CFDictionaryRef)update);
        }

        if (status != errSecSuccess) {
          error = StatusMessage("SecItemAdd", status);

          return false;
        }

        return true;
      },
      ResolveUndefined);
}

Napi::Value Remove(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "remove(service: string, account: string)")
        .ThrowAsJavaScriptException();

    return env.Undefined();
  }

  std::string service = info[0].As<Napi::String>().Utf8Value();
  std::string account = info[1].As<Napi::String>().Utf8Value();

  return Queue(
      env,
      [service, account](ItemResult&, std::string& error) {
        return RunDelete(ItemQuery(ToNSString(service), ToNSString(account)), error);
      },
      ResolveUndefined);
}

Napi::Value Keys(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "keys(service: string)").ThrowAsJavaScriptException();

    return env.Undefined();
  }

  std::string service = info[0].As<Napi::String>().Utf8Value();

  return Queue(
      env,
      [service](ItemResult& result, std::string& error) {
        NSMutableDictionary* query = ServiceQuery(ToNSString(service));
        query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitAll;
        query[(__bridge id)kSecReturnAttributes] = @YES;

        CFTypeRef found = NULL;
        OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &found);

        if (status == errSecItemNotFound) {
          return true;
        }

        if (status != errSecSuccess) {
          error = StatusMessage("SecItemCopyMatching", status);

          return false;
        }

        NSArray* items = (__bridge_transfer NSArray*)found;

        for (NSDictionary* attributes in items) {
          id account = attributes[(__bridge id)kSecAttrAccount];

          // We always write a string; anything else in our access group is malformed, and reading
          // it as one would crash main rather than skip one key.
          if ([account isKindOfClass:[NSString class]]) {
            result.values.push_back([account UTF8String]);
          }
        }

        return true;
      },
      ResolveStrings);
}

Napi::Value Clear(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "clear(service: string)").ThrowAsJavaScriptException();

    return env.Undefined();
  }

  std::string service = info[0].As<Napi::String>().Utf8Value();

  return Queue(
      env,
      [service](ItemResult&, std::string& error) {
        return RunDelete(ServiceQuery(ToNSString(service)), error);
      },
      ResolveUndefined);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isAvailable", Napi::Function::New(env, IsAvailable));
  exports.Set("get", Napi::Function::New(env, Get));
  exports.Set("set", Napi::Function::New(env, Set));
  exports.Set("remove", Napi::Function::New(env, Remove));
  exports.Set("keys", Napi::Function::New(env, Keys));
  exports.Set("clear", Napi::Function::New(env, Clear));

  return exports;
}

}  // namespace

NODE_API_MODULE(keychain, Init)
