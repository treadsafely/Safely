---
paths:
  - 'apps/mobile/**/*'
---

# `apps/mobile` — Expo dev-client

The app runs as a **dev-client** only (`pnpm --filter mobile ios|android`), never in Expo Go,
because it ships its own native modules. `pnpm --filter mobile start` serves an already installed
client. If native dependencies or the config changed, rebuild the dev-client — `start` alone won't
pick it up.

Expo configuration is `app.config.js` (the version is read from `package.json`, so version bumps
happen there). The config plugin `plugins/withMMKVNoBackup.js` and the `shims/`
(`isomorphic-webcrypto` in particular) are wired from there and from `metro.config.js`; RN polyfills
live in `global-polyfills.ts`.

## Native modules

Local Expo modules live in `modules/`; a module's JS facade is always `modules/<name>/src/index.ts`,
and the platforms it actually ships are in its `expo-module.config.json`:

| Module                      | What it provides                                                                  |
| --------------------------- | --------------------------------------------------------------------------------- |
| `safely-crypto`             | `pbkdf2Sha512` on the platform crypto libs (CommonCrypto / JCE)                    |
| `safely-secure-store-enum`  | what `expo-secure-store` lacks: list keys, list by prefix, clear, delete by prefix |
| `safely-store-country`      | App Store / Play storefront country code (`getStoreCountryAsync`)                  |
| `safely-in-app-browser`     | `SFSafariViewController` / Android Custom Tabs                                     |
| `safely-masked-input`       | `MaskedInput` — native amount input with decimal masking                           |
| `safely-capture-prevention` | `CapturePreventionView` — hides its subtree from screenshots                       |
| `safely-flame`              | Flame view key, address, contract decoding and note opening over the prebuilt `@runflame/wallet-rn`, installed as `globalThis.flameSdk` |

`safely-capture-prevention` is the exception: `platforms: ["ios"]`, no `android/` at all — the facade
swaps in an `expo-screen-capture` based component on Android. Everything else is iOS + Android.

`safely-crypto` and `safely-store-country` are arranged so the core is testable without Xcode or the
Android SDK: pure logic sits in a `*Core` type (`ios/Pbkdf2Core/Pbkdf2Core.swift`,
`ios/CountryCodeCore/CountryCodeCore.swift`, the `*Core.kt` files) reachable through a host-only
SwiftPM package (`ios/Package.swift`) or Gradle harness, while the Expo module wrappers only call
into it. Write new native logic the same way: computation in a `*Core` type, platform calls in the
module. Host tests:

```
cd apps/mobile/modules/safely-crypto/ios && swift test
cd apps/mobile/modules/safely-crypto/android/host-test && ./gradlew test
cd apps/mobile/modules/safely-store-country/ios && swift test
```

CI (`swift-core-tests`, `kotlin-core-tests`) runs only the two `safely-crypto` ones whenever a PR
touches `apps/mobile/**` — `safely-store-country`'s Swift tests are local-only, so run them by hand
when you touch that module.

### `safely-flame`

A thin wrapper over the UniFFI bindings of `@runflame/wallet-rn` (Rust, prebuilt), and the deliberate
exception to the `*Core` arrangement above: the package ships an iOS-only xcframework and
Android-only `.so` files, so nothing of it runs on the host and a `*Core` split would buy no tests.
All logic sits in `SafelyFlameModule.swift` / `.kt`, and what can be tested lives in the JS facade
`src/index.ts`, covered by `apps/mobile/test/safely-flame.test.ts` against a mocked native module.

- **Native functions never throw for a Flame error.** They resolve `{ ok: true, value }` or
  `{ ok: false, code, reason }`, and the facade turns the latter into a `FlameError` with `kind` and
  `reason`. A thrown error would reach JS wrapped by Expo — on iOS its `message` is a
  `FunctionCallException` debug chain — so `reason` could only be recovered by parsing that text.
- **Batch calls fail per item, not as a whole.** `decodeContracts` and `openNotes` take many outputs,
  but the library decodes and opens one at a time: a library error on one item lands in that item
  (`{ decoded: false, code, reason }`, `{ opened: false, failure: 'error', code, reason }`), and only
  argument, key or network errors fail the call. Otherwise one undecodable output on the wallet's
  predicate would fail the whole scan and hide the balance. Core turns a failed item into
  `{ status: 'unreadable' }`.
- The facade validates arguments (network, `uint32` path) before calling native.
  The native side still checks ranges, because Expo converts a JS number to a fixed-width integer
  with a trapping `init` on iOS: an out-of-range value would crash instead of erroring.
- The `FlameError` → `ERR_FLAME_*` mapping is exhaustive on both platforms (no `default`/`else`), so
  a variant added by a `@runflame/wallet-rn` update fails the native build. That build runs on EAS
  or locally, not in PR CI, and the `kindByCode` table in `src/index.ts` is still checked by nothing.
- **The pod is linked by React Native's autolinking, not Expo's.** Expo's resolver only looks for a
  podspec one directory down (or at `apple.podspecPath`), and the package keeps it at its root, so
  Expo skips it on iOS and `use_native_modules!` picks it up. Android goes through Expo as the Gradle
  project `:runflame-wallet-rn`, the name `android/build.gradle` depends on.
- Only `viewKey` takes the portfolio's 64-byte BIP-39 seed (a `Uint8Array`, never the mnemonic) and
  returns the account's bech32f view key; `address` and `openNotes` build a view wallet
  (`Wallet.fromViewKey`) from it. Each call builds its `Wallet` and drops it before returning (Kotlin
  also zeroes its seed copy). Never log the seed or the view key — the view key reads every amount
  and memo. The library's `reason` is passed through as is — log it only through
  `filterSensitiveData`.
- Bridge encoding: u64 amounts travel as decimal strings (a JS number loses precision above 2^53)
  and `safely-flame/index.ts` turns them into `bigint`; a missing note travels as an empty
  `Uint8Array`, because Expo has no optional array elements. Seeds and contracts are copied into
  plain `Uint8Array`s first, as in `safely-crypto` (a polyfilled `Buffer` crashes the bridge); the
  facade zeroes its own seed copy once native returns, core zeroes the original.
- The module only implements `SafelyFlame` from `@safely/core`; `safely-flame/index.ts` installs it
  as `globalThis.flameSdk`. Keys, balances and history live in core and `@safely/ux`: the flame
  chain (`DerivationChainItemFlame`) exists only where the derivation stores `chains.flame`
  (sync-storage v5), and `PortfolioBip39.createSerializedPortfolio` writes it only for derivation 0 of
  a new testnet portfolio. Portfolios created before v5, derivations added later, mainnet, Ledger and
  watch-only portfolios have no flame. The chain uses the receiving path `{0,0}`. Balance and history
  count only the native flavor (`Scalar::ONE`, `FLAME_NATIVE_FLAVOR`); FLM has 8 decimals. The node
  URL is `blockchains.flame.<network>.rpc_url` from the boot config; without it the FLM asset is
  hidden.
- `chains.flame` holds `{ viewKey, address, predicate }`, all computed once at portfolio creation
  (the mnemonic is already in hand): the chain builds `wallet` from them synchronously, so the
  address needs no native call at startup, and scans with the view key, so the seed is never touched
  again for Flame. **The view key is stored in plaintext.** It sits only inside the E2EE snapshot, but on every device it is
  readable without the passcode and reads every amount and memo — encrypting it is a planned,
  separate change. The chain caches every read amount per output id, except an output read without
  its note (`missing`), whose contract failed to decode, or whose opening hit a native error (`error`):
  native code reports any per-item exception the same way, so a transient one would stick.
- The home list renders BTC, then FLM, from `useActiveBtcRatedAmount` / `useActiveFlameRatedAmount`
  — no sorting, no combined asset list; the FLM cell is hidden when there is no flame source or node,
  or the scan failed. Totals and the send flow count BTC only (FLM has no fiat price).
- History marks a transaction as sent when it spends any of the wallet's outputs, even unreadable
  ones — not when the spent sum is positive.
- Core tests run with a fake `flameSdk` installed by `packages/core/test/setup-crypto.ts` (creating a
  testnet portfolio calls `viewKey` and `address`); Flame-specific tests swap in their own mock.
- Open: release builds with R8 have not been tried; JNA and the generated `com.flame.wallet` classes
  will need keep rules before the module is used outside a dev-client.

## UI

- Styling is `react-native-unistyles`. The theme is configured once in `src/shared/unistyles`
  (currently only `dark`, which is also the initial theme). Take colors and spacing from the theme
  instead of hardcoding them.
- A screen is a directory under `src/screens`; navigation and providers live in `src/app`
  (`AppNavigation.tsx`, `AppContext.tsx`, `root-error-boundary`, `root-suspense`).
- **`src/shared/ui` does not depend on navigation.** Components there never call `useNavigation` /
  `useRoute` in a way that requires a navigator: `BottomSheet` only reports `onClose`, `Screen` and
  the header buttons read the navigation context optionally. Route behaviour ("closing this sheet
  means leaving the route") lives in `src/shared/navigation/BottomSheetScreen`, which sheet screens
  use instead of `BottomSheet`. This is what lets the same UI render outside the navigator.
- **The app lock is not a route.** `LockScreenProvider` (`entities/security`) owns `isLocked`;
  `features/app-lock` renders the lock UI in a `FullWindowOverlay` (iOS window level, like
  `BlurOverlay`), and `AppNavigation` wraps the navigator in `<Activity mode="hidden">` while
  locked, so protected screens run no effects and deep links apply only after unlock. Never
  reintroduce a `LockScreen` route or navigate to present the lock — that is the bug the security
  audit found (a `safely:///tab` link replaced the lock screen).
- Layers and the `@mobile/*` aliases: see `fsd-layers.md`.

## i18n

The source of strings is `src/shared/i18n/translations/en.json`; the other locale files are produced
by translation and are not edited by hand. Add new copy to `en.json` and read it through
`useTranslate()`. Supported locales are also listed in `app.config.js` (`CFBundleLocalizations`) —
update it when adding a language.

## Build and release

- EAS profiles are in `eas.json` (`staging-base`, `staging-cached`, `production`; build numbers come
  from `appVersionSource: remote`).
- Tester distribution runs through the EAS Workflow `.eas/workflows/build-and-distribute.yml`;
  trigger it locally with `pnpm --filter mobile run build`. Read that file's comments before editing
  it — EAS Workflows has sharp edges the syntax doesn't hint at:
  - `env:` must be job-level. A step-level `env:` is unsupported and its `${{ }}` values arrive as
    raw literals; interpolate inside `run:` instead, or put the value on the job.
  - a custom `steps:` job starts with an empty working dir — `- uses: eas/checkout` first, otherwise
    committed files are missing. After checkout, cwd is the Expo project root (`apps/mobile`), so
    reference scripts project-relative (`scripts/eas-report.mjs`).
  - EAS doesn't quote-safely interpolate values into its internal bash: unescaped `` ( ) ` $ " ' \ ``
    in a changelog cause exit 141 / empty logs, which is why the workflow strips them up front.
- Icons: `pnpm --filter mobile run icons` (`scripts/generate-icons-file.js`); the generated file is
  not hand-edited.
