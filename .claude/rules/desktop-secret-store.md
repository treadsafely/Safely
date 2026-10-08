---
paths:
  - 'apps/desktop/src/main/store/**'
  - 'apps/desktop/src/main/plugins/keychain/**'
  - 'apps/desktop/src/shared/ipc.ts'
  - 'apps/desktop/src/renderer/platform/**'
  - 'apps/desktop/src/renderer/features/**'
  - 'apps/desktop/src/renderer/shared/**'
  - 'apps/desktop/src/main/biometry.ts'
  - 'apps/desktop/native/keychain/**'
  - 'apps/desktop/test/main/store/**'
  - 'apps/desktop/test/main/plugins/**'
  - 'apps/desktop/vite.main.config.ts'
  - 'apps/desktop/forge.config.ts'
  - 'apps/desktop/signing/**'
  - '.github/workflows/desktop-preview.yml'
---

# The desktop secret store (macOS)

The `encrypted` and `secureEncrypted` scopes are **generic-password items in the macOS data
protection keychain**, one item per key of the store. There is no data key, no encryption of ours and
no secret file on disk. This is the same design the mobile app runs
(`apps/mobile/src/app/storage.ts` — `expo-secure-store` plus `safely-secure-store-enum`), on the same
`SecItem` API.

The threat it is designed against is *code running as the user on the same machine*, not a remote
attacker. The build targets macOS only, and the design uses a macOS-only guarantee; "When Windows
comes back" records what has to change if that target returns.

## The subject is a code signature, not a process

A process has no durable identity: the pid is reused, the path is replaced, the uid is shared with
every other program the user runs. The only identity macOS checks and an attacker cannot forge is the
**code signature**. Access to a data protection keychain item is decided by the access group in that
signature, so "only this app may read the data" means exactly:

> the ability to read is a function of the **code identity** and the **hardware instance**, not of
> owning the files and not of knowing the user's credentials.

Three consequences follow, and they are the design rather than caveats on it:

- a build with a different signature is a **different subject** — patching the bundle removes access
  instead of granting it;
- the same signature on another machine is a different subject, because `ThisDeviceOnly` items are
  bound to this Mac and reach neither iCloud, nor a backup, nor Migration Assistant;
- the same signature on the same machine **tomorrow** is the same subject. A code identity cannot
  separate sessions; only a passcode or a presence check can, and both now exist in the renderer
  while the *item* is still gated by nothing but the signature — see "What it deliberately does not
  protect".

## Item schema

```
kSecClass                     = kSecClassGenericPassword
kSecUseDataProtectionKeychain = YES          # on macOS SecItem defaults to the legacy keychain
kSecAttrService               = one per scope, see below
kSecAttrAccount               = the store key, verbatim
kSecAttrAccessible            = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
kSecAttrSynchronizable        = NO           # stated in every query, never left to a default
kSecValueData                 = the value, UTF-8
access group                  = the default one, our `application-identifier`
```

| Scope | Service | Holds |
| ----- | ------- | ----- |
| `encrypted` | `com.safely.wallet-desktop.encrypted` | `sync/dmk_pub`, `sync/sync_key`, `sync/self_ik_pub`, `sync/self_ik_prv`, `desktop_security/passcode` |
| `secureEncrypted` | `com.safely.wallet-desktop.secureEncrypted` | `sync/master_key`, `sync/vault_key`, `sync/dmk_prv` |

**The passcode is in `encrypted`, not in `secureEncrypted`, and that is not an oversight.** It is the
thing the gate checks, so reading it cannot itself go through the gate — `secureEncrypted` is the
scope `UnlockableSecuredEncryptedStorage` wraps, and putting the passcode there would be circular.
Mobile makes the same split. Both scopes are equally protected by the code signature; what differs is
only which items the renderer's unlockable wrapper covers. Everything the security module owns sits
under a `desktop_security` node (`src/renderer/shared/storage/structured/`), the way mobile uses
`child('mobile')`, so it cannot collide with the `sync` tree. `TreeStorage` escapes `_` as `_u`, so
that node reads `desktop_usecurity` in `regular.json` — grep the encoded form, not the source string.

**The accessibility is one constant, not a setting.** Both scopes are
`WhenUnlockedThisDeviceOnly`: nothing in this app is worth reading while the Mac is locked, and a
per-scope knob would only make it possible to pick the weaker class by accident. Mobile does split
the two (`AfterFirstUnlock` for `encrypted`, so background work survives a lock), and desktop
deliberately does not follow it there.

What "unlocked" means here is **not measured**, and the two readings differ: on iOS the class is
evicted the moment the screen locks, while on macOS the data protection keychain follows the login
session, so a screen saver may well leave every item readable. Until it is checked on a signed build,
assume only that an operation can fail with `errSecInteractionNotAllowed` and arrive as
`UNAVAILABLE` — the app keeps running through a lock, so the sync engine has to treat those failures
as transient and never as "no account". If the stricter reading holds and hurts, moving the sync scope
to `AfterFirstUnlock` is a **deliberate** change made in this file, not a choice handed to a call
site.

The access group is not set explicitly: omitting `kSecAttrAccessGroup` uses the app's own group,
which is exactly the isolation we want and one fewer string to get wrong. The services are tied to
the bundle id — changing either abandons everything stored under it, because the access group changes
with the bundle id and the old items stop being visible at all.

**Nothing large goes here.** CRDT snapshots are written to `opts.storage`
(`packages/sync/src/initialize.ts`), which is the `regular` scope — a plaintext file. The keychain
scopes hold a handful of hex strings. A change that starts routing bulk state through them needs a
size measurement first, and the 8 MB bound on `sValue` in `src/shared/ipc.ts` is not that
measurement.

## What carries the protection

1. reads and writes go through securityd, which decides by access group — another binary gets
   `errSecItemNotFound`, not a promptable dialog;
2. item data is encrypted under class keys the SEP holds, so a copied `keychain-2.db` opens nowhere
   else, with or without the user's password;
3. the hardened runtime keeps another process out of our memory while a value is in use.

All three are properties of the **signing chain**, not of this code. Without it the keychain reports
itself unavailable: a development build then runs on the stub, which protects nothing, and a packaged
build refuses to start rather than degrade to it.

## What it deliberately does not protect

- **Sessions are separated only by code the attacker is inside.** The renderer's gate
  (`src/renderer/features/`) asks for a passcode or Touch ID before it unlocks
  `UnlockableSecuredEncryptedStorage`, and against a person at the keyboard that is real. Against
  code running as the user it is not: the item carries no access control, so anything with our
  signature reads it without a prompt. Only `SecAccessControl` moves that check into the SEP.
- **A compromised renderer** can ask main for values — the domain crypto runs there. Closing that
  needs the signer in main plus a main-owned confirmation window, not a flag in the store. The same
  applies to Touch ID: main raises the prompt, but the renderer decides whether to ask, so a
  compromised renderer skips it.
- **Availability.** A process running as the user can delete `regular.json`, the app, or the whole
  `userData` directory; it can also destroy the user's entire keychain database, which is loud and
  indiscriminate but possible. What it cannot do is remove *our* items selectively. Local state is
  never the only copy: recovery is the mnemonic, and the synced state comes back from the server.
- **Rollback.** Nothing detects `regular.json` being replaced with an older copy. A monotonic counter
  in a keychain item would; it is not built.
- **root with SIP disabled**, kernel compromise, TCC bypass.

What it does close: files copied off the machine, the one-shot infostealer, a phished login password,
and a patched or repackaged bundle.

## Adding the presence factor later

`SecAccessControl` with `kSecAccessControlUserPresence` on the `secureEncrypted` items, enforced by
the SEP. `UserPresence` rather than `BiometryCurrentSet` is deliberate: it accepts the login
password, which is the only way a Mac without Touch ID can use the store at all.

Two things that come with it, and both are easy to miss:

- an item's access control is **immutable**. Adding the gate means writing new items and moving the
  values, which for this scope is three hex strings — not a data migration, but not an in-place
  attribute change either. Version the account names if it happens.
- listing must then pass an `LAContext` with `interactionNotAllowed = true` through
  `kSecUseAuthenticationContext`, or enumerating a gated scope raises a prompt. The mobile module has
  the same line and the reason next to it.

## Where the rest lives

```
userData/store/regular.json               plaintext: CRDT snapshots, query cache
userData/store/dev-keychain-*.json        development stub only, plaintext, never in a packaged build
~/Library/Logs/Safely/safely-<day>.ndjson sanitized warnings and errors with context, 7 days, 2 MB
```

`regular.json` is written temp file → `fsync` → `rename` → `fsync` of the directory
(`src/main/utils/atomic-file.ts`).

## The keychain layer

`apps/desktop/src/main/plugins/keychain/` holds the addon's surface (`types.ts`), the module that
loads it and an `index.ts` that re-exports them. The addon ships no declarations of its own,
so `types.ts` is the single description of the binary and nothing has to be kept in sync by hand. The
port **is** the addon's shape, so joining them takes no adapter and a native module that stops
providing what the store needs fails to compile:

```ts
export interface Keychain {
    isAvailable(): boolean;
    get(service: string, account: string): Promise<Buffer | null>;
    set(service: string, account: string, value: string): Promise<void>;
    remove(service: string, account: string): Promise<void>;
    keys(service: string): Promise<string[]>;
    clear(service: string): Promise<void>;
}
```

Everything is asynchronous because everything reaches securityd over XPC, and the store is on the
app's hot path — running that on the main thread would stall the Electron main loop on every read.
`get` returns bytes rather than a string: what we wrote is always UTF-8, what an item holds may not
be, and `KeychainStore` decides that a value which fails a strict decode is `CORRUPT` rather than
silently lossy.

**It is one exported constant, not a factory.** `keychain-addon.ts` requires the binary and checks
`isAvailable()` at import, then exports the addon itself; `KeychainStore` imports it directly and
takes only a service name. So a build that cannot reach the keychain dies while main's module graph
is still evaluating — before a window, a store or an IPC handler exists — and there is no `null` to
thread through the call sites.

That failure **logs and calls `process.exit(1)`; it must not throw.** A throw during module
evaluation reaches Electron's own uncaught-exception handler, which raises a modal dialog and waits
forever with nothing on stdout — measured on a packaged build, not feared. `process.exit` also types
as `never`, which is what narrows the export to a non-null `Keychain`.
`test/main/plugins/keychain/keychain-addon.test.ts` pins both halves — that it exits, and that it
does not throw — by mocking the logger and spying on `process.exit`.

`KeychainError` (in `keychain-store.ts`, carrying the `sKeychainErrorCode` the renderer sees) is for
per-operation failures only — by the time IPC can be answered, the keychain is known to work.

Prefix filtering and prefix deletion are **not** in the addon — they live in `KeychainStore`, where
they are testable without a signed build. The cost is N XPC calls for `removeWithPrefix`, and that is
the platform's floor: `kSecMatchItemList` is for the legacy keychain only, so there is no batch
delete by reference. `clear` is the exception — one attribute match deletes every item of a service.

Two rules the addon follows and a rewrite must keep:

- **`isAvailable()` must write.** Reads answer `errSecItemNotFound` with or without the entitlement,
  so only `SecItemAdd` reveals it — `errSecMissingEntitlement` (-34018). The probe adds a throwaway
  item under its own service and deletes it again. Verified on an unsigned host: `isAvailable()` is
  `false`, `get` still answers `null`, `set` answers -34018.
- **`kSecAttrAccount` is a `CFString`, written and matched as one.** securityd matches attributes
  type-sensitively; `expo-secure-store` writes `Data` and the mobile module has to mirror that
  exactly, or lookups miss and leave orphaned records. Desktop owns both sides and uses one type.

`set` is `SecItemAdd`, falling back to `SecItemUpdate` on `errSecDuplicateItem` — with the
accessibility in the update, so an item left by an earlier policy converges on the current one
instead of keeping the weaker class it was created with. The class itself is written in one place in
the addon; the port cannot pass another.

Packaging: an N-API addon in Objective-C++ at `apps/desktop/native/keychain`, built by the app's
`build:native` script, which `package` and `make` run first — deliberately not by `pnpm install`, see
`desktop-app.md`. Two things about shipping it were found the hard way:

- the forge vite plugin makes the packager ignore everything but `.vite`, so `node_modules` never
  reaches the app and the addon cannot be required by package name. It travels as `extraResource`
  into `Contents/Resources` and is loaded from `process.resourcesPath`. An `asar` unpack glob is not
  an alternative: `**/*.node` does not match inside the dot-directory the bundle lives in.
- it needs **no** rebuild for Electron. N-API is ABI-stable, so the binary built against Node loads
  as it is, and @electron/rebuild is switched off in `forge.config.ts` accordingly.

## Development builds

An unsigned `pnpm start` has no provisioning profile, so no access group exists and the real module
cannot work. Development builds get a stub instead: plain files in the development `userData`
(`dev-keychain-encrypted.json`), the same interface, a warning on every start.

**The choice between the addon and the stub is made by the bundler, not by code.** The stub is not a
module: `vite.main.config.ts` carries its source as a string and resolves `keychain-addon` to it,
through a plugin registered only while the dev server runs. So the code that uses it never branches,
nothing in `src/` can import it, and a packaged build has nothing to resolve it with — an import of
the stub there fails the build instead of shipping. The price is that the string is not type checked:
a member added to `Keychain` has to be added to it by hand, and its absence surfaces as a
`TypeError` on the first store operation in development.

The stub stores values in the clear, and that is deliberate: obfuscating them under a constant key
that ships in the same bundle would only make development data look protected.

## Build requirements

Every guarantee above is a property of the signature, so the store does not exist without these — how
the profiles and certificates are obtained is in `desktop-signing.md`:

- explicit App ID and an embedded provisioning profile (**Developer ID** for a release, **Mac
  Development** for a QA build); `com.apple.application-identifier` is not a string you may simply
  declare — `amfid` validates it against the profile, and without one the data protection keychain
  does not exist for the app, whatever the entitlements say;
- entitlements `com.apple.application-identifier`, `com.apple.developer.team-identifier` and
  `keychain-access-groups` on the **main binary only**: helpers must not get them, so the renderer
  process cannot reach the keychain group even when compromised. Only
  `com.apple.security.cs.allow-jit`, which V8 needs, is on both plists;
- signature, hardened runtime, notarisation; no
  `com.apple.security.cs.disable-library-validation` and no `get-task-allow`, or memory protection
  reopens quietly;
- the existing fuses (`RunAsNode`, inspector, `NODE_OPTIONS` off; asar integrity on).

Signing is env-driven and forge refuses an identity without a profile, because a signature whose
entitlements nothing validates produces an app that reaches no access group.

## Verifying a build

`apps/desktop/signing/verify-signature.sh <app>` checks the **signature**: that it verifies, that
the hardened runtime is on, that a profile is embedded and unexpired, that `application-identifier`
is on the main binary and **not** on a helper, that `get-task-allow` is nowhere. CI runs it as a gate
on every QA build (`.github/workflows/desktop-preview.yml`).

It cannot check that securityd honours any of it — a profile can be present, unexpired and still name
the wrong App ID or omit this machine. That half is exercised by **launching the app** and writing
through the encrypted-store panel in `ScaffoldView.tsx` — with one item per key that is the same path
the app takes on its first store call, so there is deliberately no headless self-test beside it.

What neither covers:

```
codesign -dvvv <app> 2>&1 | grep ^Authority
spctl -a -vvv -t exec <app>
```

The real proof of isolation is a second signed bundle with a different bundle id reading our service:
it must get `errSecItemNotFound` with no dialog. That check is manual — it cannot run in CI.

## Failure modes and recovery

| Event | Behaviour |
| ----- | --------- |
| Developer ID certificate rotated within the same team | no effect: access follows the access group, not the certificate |
| bundle id or Team ID changed | permanent loss — a different access group |
| provisioning profile expired | the entitlement stops being honoured for already-installed copies. A Developer ID profile is issued for **6570 days — 18 years**; development profiles get 365, which is why a test build stops working within the year |
| keychain reset, new Mac, logic board replaced | permanent loss — `ThisDeviceOnly` items are not portable, by design |
| the user's keychain database is destroyed | the store comes up empty: an honest first-run state, not a corrupt one |
| `regular.json` deleted | non-secret state is lost and re-synced; the keychain items are untouched |
| unsigned dev build ↔ packaged build | different worlds; dev is on the stub |
| any securityd failure | `UNAVAILABLE`, with the OSStatus on `cause` in main |
| an item that is not the UTF-8 we wrote | `CORRUPT` — never treated as absence, and never overwritten to "fix" it |

Device binding is a property, not a bug, but it makes an external recovery path mandatory: this
storage must never be the only copy of anything, and onboarding has to guarantee a recorded mnemonic
before the store is relied upon.

## Tests

The store imports the keychain rather than taking it, so the tests replace the module with
`vi.mock` and a fake (`apps/desktop/test/main/store/fake-keychain.ts` — a test double, not the
development stub, which is not importable; it is one shared instance, hence its `reset()`). Covered:
round trip, absent key, replace rather than duplicate, prefix listing and prefix deletion, empty
prefix behaving as `clear`, one service never touching another, values staying byte-exact across the
UTF-8 round trip, a non-UTF-8 item reported as `CORRUPT`, and a platform failure arriving as
`UNAVAILABLE` with the cause preserved.

`test/main/plugins/keychain/keychain-addon.test.ts` covers the other half: with no addon to load,
the module logs and exits instead of throwing.

The native part has no unit tests. What stands in for it is `verify-signature.sh` on the signature
and the app itself on a signed build.

## What was removed, and why it is not coming back

**`safeStorage` plus a Touch ID gate** (`systemPreferences.promptTouchID` minting a short-lived
ticket). `promptTouchID` is bound to no key — Electron's own documentation says it "will not protect
your user data"; `safeStorage` keeps its key in a `<AppName> Safe Storage` **legacy** keychain entry
whose ACL is phishable and pre-creatable (the Safe Storage key redefinition issue, seen in the wild
against Chrome) and encrypts with
AES-128-CBC without a MAC; and `canPromptTouchID()` is false on any Mac without Touch ID, so the gate
closed the store entirely on those machines.

**A Secure Enclave key sealing a data key.** An enclave-wrapped data key sat in a plain file next to
the store, and every value was encrypted under it. It worked on signed builds and was still removed:
the enclave key is non-extractable, the data key is not, and the data key is what decrypts the data —
it landed in main's memory on every operation, so against anything inside our process the indirection
bought nothing. The container was worse than the crypto: deleting that one small file left every
value unreadable while the app came up looking healthy, and our keychain items cannot be removed
selectively by an unentitled process.

Given up with it, and worth stating: the SEP presence check went too, so the app no longer refuses to
run on a Mac whose class keys are not hardware-bound. The premise was never measured, we accept a
possibly software-backed Keystore on Android without comment, and a gate CI needs an env var to
bypass is not a gate. Excluding old hardware belongs in the minimum system requirements.

## When Windows comes back

The research behind the macOS-only choice is in `apps/desktop/doc/windows-secret-store.md`, so it
does not have to be redone: why Windows Hello, TPM keys and DPAPI are all user-scoped rather than
app-scoped, what a non-exportable TPM key and a passcode as its PIN would still buy, why the
installer has to be per-machine, and why an elevated helper service is not worth building.

## Implementation status

Done: `native/keychain`, `src/main/plugins/keychain/`, `src/main/store/keychain-store.ts`, the third
IPC channel group, and `createSecureEncrypted()` returning a real storage. The addon compiles and
behaves correctly on an unsigned host (see the `isAvailable()` note above).

Not done, in order:

1. **run it on a signed build** — nothing here has been exercised against securityd with the
   entitlement in place, only against the fake and an unsigned host;
2. **`SecAccessControl` on the `secureEncrypted` items** — the renderer half is done (`securityGate`
   in `src/renderer/app/AppProviders.tsx`: passcode plus Touch ID through
   `systemPreferences.promptTouchID`), so accounts can be created and restored. What is missing is
   the SEP enforcing it on the item itself, which is the part a compromised renderer cannot skip;
3. the isolation claim itself — a second signed bundle with a different bundle id reading our
   service, which must answer `errSecItemNotFound` without a dialog.
