---
paths:
  - 'apps/desktop/native/hello/**'
  - 'apps/desktop/src/main/plugins/hello/**'
  - 'apps/desktop/src/main/store/sealed-*.ts'
  - 'apps/desktop/src/main/store/secret-backend.ts'
  - 'apps/desktop/src/main/store/keychain-backend.ts'
  - 'apps/desktop/src/renderer/features/secret-store/**'
  - 'apps/desktop/windows/**'
  - 'apps/desktop/test/main/store/sealed-*.ts'
  - 'apps/desktop/test/main/store/fake-hello.ts'
  - '.github/workflows/desktop-build-windows.yml'
---

# The desktop secret store (Windows)

The Windows half of `desktop-secret-store.md`: the same two scopes, the same IPC, the same
renderer gate, and a different thing underneath. Read the macOS file first — what is not restated
here is the same there.

**Nothing on Windows is scoped to our code signature.** DPAPI, Credential Manager, TPM keys and
Windows Hello keys all belong to the *user*; a full-trust MSIX gets a package identity and no
isolation from other processes of the same user, and the one scope that is per package — the
AppContainer — cannot run Electron. So the trust boundary here is **"code running as the user, plus
a Windows Hello prompt the user answers"**, not "code with our signature". The memory of our
processes is readable by any process of the same user, which macOS forbids without root.

## The design

One backend per platform, chosen once in `src/main/store/secret-backend.ts`, behind `SecretBackend`
(`store/types.ts`): the two secret scopes as `Store`s, an `unlock`, an `erase`, and the presence
check. `KeychainBackend` is macOS — unlocked from the start, Touch ID as the presence check.
`SealedBackend` is Windows:

- a **Windows Hello `KeyCredential`**, one per install, named `com.safely.wallet-desktop.<installId>`
  where `installId` is random and lives in the header. The key is non-exportable and TPM-backed,
  and every signature it makes raises the Hello prompt — PIN, fingerprint or face, whichever the
  user set up. Created with `FailIfExists` on the first launch, opened afterwards;
- a **random challenge** in the header, signed once per launch. The signature is deterministic
  (RSASSA-PKCS1-v1_5), which every implementation of this pattern relies on — KeePassXC, Bitwarden —
  and which the first Windows measurement must confirm. `HKDF-SHA256(signature, salt = challenge)`
  gives the wrapping key;
- a **random data key**, wrapped with AES-256-GCM under the wrapping key, with the canonical header
  (`version ‖ installId ‖ challenge`) as associated data: an edited header field fails to unwrap;
- **one AES-256-GCM blob per scope**, not an item per key: with clear key names and a ciphertext
  per item, a file edit could drop `desktop/passcode` or roll `passcodeLockout` back without any key,
  and the macOS file promises that editing a file resets no counter. Whole-file rollback is what
  remains, and it is undetected. The blob is the whole scope map as JSON, a random nonce per write,
  the scope name and format version as associated data, written through `JsonStore` with the
  `SealedCodec` (`store/sealed-codec.ts`) — the same write-through, atomic rename and serialised
  mutations as `regular.json`;
- the files, under `userData/store/`: `sealed-key.json` (the header, nothing secret in it),
  `sealed-encrypted.json`, `sealed-secure-encrypted.json`. Under the Store install `userData` is
  `%LOCALAPPDATA%\Packages\<package family>\LocalCache`.

The crypto is Node's `crypto` in main, not the addon: the addon (`native/hello`, C++/WinRT, N-API)
knows four things — `isSupported`, `sign`, `verifyPresence`, `deleteCredential` — and holds no
state. A data key in main's JavaScript heap is exactly as exposed as one in C++ in the same process,
and the TypeScript half is what the tests cover (`test/main/store/sealed-backend.test.ts`, with
`fake-hello.ts` as a deterministic signer).

## One prompt per launch, and what that costs

`unlock` runs once per launch, from the renderer's `SecretStoreGate` before anything reads a scope,
and the data key then stays in main until the process ends. Sync runs under the lock screen and
under a hidden window (`desktop-app.md`), reading `SyncKey` from the `encrypted` scope for every
snapshot; a key wiped on lock would raise Hello prompts from the background or stop the engine. So
`desktop-app.md`'s "there is no unlocked state in main" is **false on Windows** — this is the one
place main holds a secret, and a crash dump of main (WER) can contain it. `crashReporter` stays off.

`unlock` is single-flight and idempotent: a reload or a second retry while the prompt is up joins
the pending one, and once the key is held the answer is `unlocked` with `isPresenceVerified: false`
and no prompt. It takes no payload — the credential name, the challenge and the window handle never
cross IPC. Main waits for the window to be shown before asking for a signature: the window is
created hidden, and a prompt raised before `ready-to-show` has nothing to sit over.

A cold start that answered the prompt counts as the lock-screen unlock **while the biometry
toggle is on** (`SecretStoreSession`, held by the gate and read once by `AppLock`): with Hello as
an unlock factor the user would otherwise meet the Hello prompt and the lock screen back to back;
with the toggle off the passcode is the only factor, and the lock screen stays. The lock screen
locks the first time only after a background transition, as before.

The **presence check** before a sensitive action — the thing Touch ID does on macOS — is a separate
call, `UserConsentVerifier` through the same `safely:biometry:*` channels and the same `securityGate`,
bound to no key. The biometry toggle keeps its meaning: off means the passcode keypad on actions and
no Hello there. Its copy is chosen once, in `features/biometry/biometry-copy.ts`; `biometry.presence`
is a full sentence because, unlike macOS, Windows prints the message as given.

## Hello without a TPM is refused — decided 2026-11-10

Without a TPM the Hello key is a file under the PIN, and a copied NGC container can be attacked
offline with no anti-hammering. So `sign` checks the credential's attestation **when it creates
it** and answers `unsupported` unless it is `Success`; `TemporaryFailure` (a busy TPM) answers
`failed`, which the gate shows as "try again". A later launch opens a credential that already
passed, and does not attest again: a transient attestation failure there must not lock an
initialised store. A first launch that stops after the credential exists — the prompt cancelled,
the attestation refused, the header not written — deletes it best-effort, or every retry would
leave one more in the NGC container. Windows 11 requires a TPM 2.0, so what this excludes is
mostly Windows 10 machines and virtual machines. **A Parallels vTPM does not attest** — measured
2026-11-16 on Windows 11 ARM: `tpmtool getdeviceinformation` reports `Is Capable For Attestation:
False` (no EK certificate), the PIN prompt succeeds and the gate then shows `unsupported`. The real
store can therefore be exercised only on hardware; a VM covers the build, the package and the gate.

## Unlock outcomes

| Outcome | When | What the gate shows |
| --- | --- | --- |
| `unlocked` | the signature opened the header, or the key was already held | the app |
| `unsupported` | no Hello PIN set up, Hello disabled by policy, or no TPM attestation | "Windows Hello is required", retry only |
| `cancelled` | the user closed the prompt | retry |
| `failed` | a transient platform failure, or a header or scope file that cannot be read for a reason other than absence | retry |
| `lost` | the credential answers `NotFound` while a header exists; the header is missing or unreadable while scope files exist | erase and sign in again |
| `mismatch` | the signature does not open the header: a different credential, or an unstable signature | erase and sign in again |

A first run is **only** an absent header with absent or empty scope files: the Secure Enclave design
that macOS removed lost every value when its one small file went missing, and this store must never
start over on top of data. An unknown header version is `lost`, never a re-initialisation. `erase`
is never automatic — the gate asks for confirmation, says the recovery phrase is needed, and goes
through `clearAllData()` and a reload. The order inside `erase` matters: the data key is dropped
first, so a write still queued fails instead of recreating a scope file; the scope files go inside
their stores' write queues, then the header, then the credential — an orphaned credential is
harmless, an orphaned file is not. After the unlock, a scope blob that fails to authenticate is
`CORRUPT`, as on macOS, and reaches `FatalErrorPage`, which deliberately has no erase.

## What it deliberately does not protect

Everything in the macOS list, and these, which macOS closes and Windows cannot:

- **a one-shot infostealer while the app runs**: the data key is in main from launch, whatever the
  lock screen shows, and any process of the user reads our memory;
- **a patched install**: only the Store installation is protected (`WindowsApps` ACLs and the
  Package Integrity enforcement the Store applies); a copy of the app run by the user is the same
  subject and gets the same prompt;
- **a file edit resetting the lockout counter**: ruled out per entry by the one-blob design, but a
  copy of the whole scope file can be put back — undetected;
- **a prompt the user answers for someone else**: any process of the user that knows the credential
  name can ask Hello to sign, and the dialog looks the same. The random `installId` is a namespace
  against a second install of ours, not a secret.

The lock screen re-seals nothing; it is a UI gate, as on macOS.

## Failure modes

| Event | Behaviour |
| ----- | --------- |
| Hello PIN reset, NGC container reset | the credential is gone: `lost`, recovery from the mnemonic — the keychain-reset case of macOS |
| Hello disabled by policy, no PIN | `unsupported`; the app does not proceed |
| no TPM, or attestation unavailable | `unsupported` — decided above |
| new PC, reinstall from the Store | `userData` is gone with the package: a first run; an orphaned credential in the NGC container is harmless |
| header deleted, scope files present | `lost` |
| the credential of another install of ours | its own `installId`: separate header, separate credential, separate `erase` |
| the wrap does not open | `mismatch`, never a new header |
| prompt cancelled | `cancelled` / `UNAVAILABLE`, never "no account" |
| scope blob fails to authenticate after unlock | `CORRUPT`, never treated as absence |

## Development builds

`pnpm start` runs on the development stub on both platforms — the stub now replaces
`store/secret-backend.ts` whole (`vite.main.config.ts`): plain `JsonStore` files, `unlocked` at once,
Touch ID where the host has it. On Windows an unpackaged `userData` is under `%APPDATA%` (Roaming),
so those plaintext development files can travel with a roaming profile; development only. The
real store is exercised by `package:win32`, installed locally — `electron-windows-msix` signs a
local build with a development certificate it creates.

## Build

- `build:native:win32` is `node-gyp rebuild -C native/hello`; `package:win32` and `make:win32` run it
  first. It compiles only on Windows with the Visual Studio C++ tools and a Windows SDK that carries
  C++/WinRT (10.0.17763 or later; `binding.gyp` asks for C++20 and `WindowsApp.lib`). The addon is
  N-API and ships as `extraResource`, loaded from `process.resourcesPath` like `keychain.node`.
- On a Mac the addon can be *compile-checked* but not run: clang-cl from Homebrew llvm, `lld-link`
  from the `lld` formula, the SDK and CRT laid out by `xwin`, the Electron headers and `node.lib` for
  the import library. No script in the repo does this; it is a developer's convenience.
- `forge.config.ts` chooses by the **host** OS: the config is evaluated before `--platform` is
  known, and the addon builds only on the host anyway. `prePackage` still refuses a target the host
  cannot build. On Windows the maker is `@electron-forge/maker-msix` (7.11.2, the forge 7 line) over
  `electron-windows-msix`, with `windows/AppxManifest.xml` rendered into `out/windows/` by `preMake`:
  the identity (`SAFELY_MSIX_IDENTITY_NAME`, `SAFELY_MSIX_PUBLISHER`,
  `SAFELY_MSIX_PUBLISHER_DISPLAY_NAME`) is Partner Center's and public, the version is
  `<package version>.0` — the Store wants the fourth number at zero and every submission strictly
  higher, and how the third number advances per submission is **not decided yet**. `SAFELY_MSIX_UNSIGNED=true`
  skips the development certificate; CI sets it because the Store signs after certification, and
  whether Partner Center takes an unsigned package is one of the first-submission checks.
- `electron-windows-msix` looks for the Windows Kit whose version equals the manifest's `MinVersion`
  and fails when that exact SDK is not installed, so `forge.config.ts` passes the newest installed
  kit as `windowsKitVersion` (`newestWindowsKit()`). A locally signed build also needs PowerShell 7
  on the machine: the development certificate is created by a script the tool runs with `pwsh.exe`,
  which Windows does not ship.
- `binding.gyp` reads the node-addon-api include path with `<!(…)`, not `<!@(…)`: the list form
  splits the output like a shell and eats the backslashes of a Windows path — `napi.h` not found.
- The manifest declares `runFullTrust`, `internetClient`, the `webcam` capability for the QR
  scanner and the `safely` protocol. A packaged app cannot register a protocol from code — HKCU is
  virtualised — so `setAsDefaultProtocolClient` runs on macOS only, and the link arrives as a process
  argument: `process.argv` on a cold start, `second-instance` argv afterwards. `DeepLinkReceiver`
  accepts only an argument that parses as a URL of our scheme; a switch cannot hide inside one.
- The window uses `titleBarOverlay` on Windows (colours from `darkTheme`) where macOS has traffic
  lights; `AppLayout` takes `windowControls: 'left' | 'right' | null` and keeps the top-right clear
  on `right`. Tuned on real hardware, not here.
- `.github/workflows/desktop-build-windows.yml`, called by `desktop-staging.yml` in its own
  concurrency group, builds the package on `windows-latest` and keeps it as a run artifact for three
  days. No upload to the Store yet: the first submissions are by hand in Partner Center, to a
  private audience, then package flights.

## Not measured yet

Everything below is the first session on a Windows machine, in this order; the design stands or
falls on the first two:

1. the signature over the same challenge is identical across calls and reboots;
2. `RequestSignAsync` from Electron's main process raises the prompt over our window — partly
   measured 2026-11-16: the first prompt of a launch opens over the window, one after a cancel and
   "try again" opens behind it and only flashes in the taskbar, because the dialog is another
   process's window. `AwaitPrompt` in `hello.cpp` hands it the foreground (the class name
   `Credential Dialog Xaml Host`, as KeePassXC and Bitwarden do), verified the same day in the VM
   on Cancel → "try again"; real hardware is still to be checked;
3. attestation on real hardware (a Parallels vTPM does not attest, above);
4. `IsSupportedAsync` without a PIN, in a VM without a TPM, under a policy that disables Hello;
5. what the Hello dialog shows as the requesting application for the packaged app;
6. a second package with another identity reaching our credential after a prompt (expected: yes —
   recorded, not fixed);
7. camera and WebHID inside the package, and which capabilities they need;
8. how Windows passes the protocol URL in argv;
9. whether Partner Center accepts the unsigned package.
