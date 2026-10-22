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
| `safely-flame`              | Flame view key, address, contract decoding, note opening and transfer building over the prebuilt `@runflame/wallet-rn`, installed as `globalThis.flameSdk` |
| `safely-push-content`       | `setWalletNames` — `target_ref → wallet name` dictionary shared with the push pipeline |

`safely-capture-prevention` is the exception: `platforms: ["ios"]`, no `android/` at all — the facade
swaps in an `expo-screen-capture` based component on Android. Everything else is iOS + Android.

`safely-crypto`, `safely-store-country` and `safely-push-content` are arranged so the core is testable
without Xcode or the Android SDK: pure logic sits in a `*Core` type (`ios/Pbkdf2Core/Pbkdf2Core.swift`,
`ios/PushContentCore/PushContentCore.swift`, the `*Core.kt` files) reachable through a host-only
SwiftPM package (`ios/Package.swift`) or Gradle harness (`android/host-test`), while the Expo module
wrappers only call into it. Write new native logic the same way: computation in a `*Core` type,
platform calls in the module. Host tests: `pnpm --filter mobile run test:ios` / `test:android` (or
`test:all`) chain the modules' `swift test` / `./gradlew test` in `apps/mobile/package.json` — append
a new module there. `safely-store-country`'s Swift tests are not in the chain; run `swift test` in its
`ios/` by hand when you touch it.

CI (`swift-core-tests`, `kotlin-core-tests` in `.github/workflows/ci.yml`) runs the `safely-crypto`,
`safely-masked-input` and `safely-push-content` harnesses whenever a PR touches `apps/mobile/**`; add a
step there for a new module.

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
- Only `viewKey` and `buildTransfer` take the portfolio's 64-byte BIP-39 seed (a `Uint8Array`, never
  the mnemonic); `viewKey` returns the account's bech32f view key, and `address` and `openNotes`
  build a view wallet (`Wallet.fromViewKey`) from it. `buildTransfer` builds a spend wallet, opens
  each confidential input's note itself (the blindings never cross the bridge), then proves and signs;
  binary inputs travel as three parallel arrays and the rest as one `TransferPlan` record (outputs as
  parallel `addresses`/`qtys`/`memos`, an empty memo for none), because
  Kotlin Expo functions take at most 8 arguments. Each call builds its `Wallet` and drops it before returning (Kotlin
  also zeroes its seed copy). Never log the seed or the view key — the view key reads every amount
  and memo. The library's `reason` is passed through as is — log it only through
  `filterSensitiveData`.
- Bridge encoding: u64 amounts travel as decimal strings in both directions (a JS number loses
  precision above 2^53) and `safely-flame/index.ts` converts them from and to `bigint`; a missing note travels as an empty
  `Uint8Array`, because Expo has no optional array elements. Seeds and contracts are copied into
  plain `Uint8Array`s first, as in `safely-crypto` (a polyfilled `Buffer` crashes the bridge); the
  facade zeroes its own seed copy once native returns, core zeroes the original.
- The module only implements `SafelyFlame` from `@safely/core`; `safely-flame/index.ts` installs it
  as `globalThis.flameSdk`. Keys, balances and history live in core and `@safely/ux`.
- **Flame lives only in a devnet portfolio** (`PortfolioFlameDevnet`, `type: 'FLAME_DEVNET'`, sync-storage v7):
  a BIP-39 phrase stored like a BIP-39 portfolio's, **no BTC chain**, and one Flame account
  (`DerivationChainItemFlame`) on the receiving path `{0,0}`. BIP-39 (testnet included), Ledger and
  watch-only portfolios have no Flame at all. The devnet node runs Flame's `testnet` network
  (`FLAME_DEVNET_NETWORK`, `tf1…` addresses) and the portfolio reports `networkType: TESTNET`, so
  every testnet rule (zero rates, no contacts, no pushes) applies to it. Balance and history count
  only the native flavor (`Scalar::ONE`, `FLAME_NATIVE_FLAVOR`); FLM has 8 decimals. The node URL is
  `blockchains.flame.<network>.rpc_url` from the boot config; until the config serves it,
  `useFlameApi` falls back to `https://dev-flamed.safely.app/` for testnet.
- **No UI creates a devnet portfolio.** Mobile imports one from
  `safely://import-flame-devnet-wallet?testseed=<phrase>`: the `import-flame-devnet-wallet` path maps
  to `ImportFlameDevnetWalletSheet`, a screen with no UI that goes through `useLockAwareLinking`, so it runs
  only after unlock. It parses the phrase (`parseFlameDevnetSeedParam`: quotes, `+`/`%20`, case),
  unlocks the secure store, adds the portfolio (or finds the one with the same phrase hash) and makes
  it active (`useImportFlameDevnetPortfolioFromSeed` → `useImportFlameDevnetPortfolio`). With no account it
  only shows a toast; a link that cold-starts the app leaves nothing under the sheet, so it resets
  instead of going back.
- `flame` holds `{ viewKey, address, predicate }`, all computed once at portfolio creation
  (the mnemonic is already in hand): the chain builds its `wallets` from them synchronously, so the
  address needs no native call at startup, and scans with the view key, so the seed is never touched
  again for Flame. Like `SignableBtcWallet.sign`, a `FlameWallet` carries its own operations —
  `readAmounts` (opens the notes with the view key) and `buildTransfer` — so the estimator and the
  transaction template take the wallet alone, never the chain. **The view key is stored in plaintext.** It sits only inside the E2EE snapshot, but on every device it is
  readable without the passcode and reads every amount and memo — encrypting it is a planned,
  separate change. The chain caches every read amount per output id, except an output read without
  its note (`missing`), whose contract failed to decode, or whose opening hit a native error (`error`):
  native code reports any per-item exception the same way, so a transient one would stick.
- The outputs query is persisted like BTC's UTXO (`usePersistQuery`, schema `sFlameWalletScan`). It
  stores the scan entries as the node served them (base64) plus the read amounts, and `select`
  rebuilds `FlameOutputs` — `FlameOutputs` itself holds `Uint8Array`s that JSON cannot carry. Memos
  never reach disk: `persistSanitizers` in `cache-config.ts` strips them from the scan as the
  persister writes it, so a restored cache shows amounts without memos until the next scan opens
  the notes again in memory.
- **Screens follow the portfolio's chains, not its type**, because a portfolio is planned to hold
  BTC and Flame together. `resolvePortfolioWallets` / `useActivePortfolioWallets` (ux) answer
  `PortfolioWallets` — `{ btc, flame }` — today a devnet portfolio has only `flame` and every other only `btc` — and that is
  the one place a combined portfolio will change. Hooks for a chain that may be absent take the wallet
  or `null` (`useBtcWalletUtxo`, `useBtcBalance`, `useBtcRatedAmount`, `useFlameWalletOutputs`,
  `useFlameRatedAmount`): without a wallet the query runs `skipToken` under a wallet-less key
  (`utxo.none`, `walletId: null`) with `initialData: null`, so it settles as `null` instead of
  pending and a derived total does not wait on it. `usePortfolioAssets(wallets)` /
  `usePortfolioTotalBalance(wallets)` sit on top of them: home shows the fiat total of every
  chain, the crypto unit and the subtitle address of the first chain (BTC, then FLM), one asset cell
  per chain (`ITEM_BY_CHAIN`), and the BTC chart only when there is a BTC chain; the wallet list shows
  each portfolio's fiat total the same way; receive has a tab per chain (`RECEIVE_BY_CHAIN`, no tabs
  for one); buy needs a BTC chain. `useActiveBtcWallet` / `useActiveFlameWallet` throw when the chain
  is absent, so a chain-specific part is only mounted where the chain is, and the BTC/FLM asset
  screens pop to the top when their chain disappears. The network badge is decided once in
  `resolvePortfolioNetworkBadge` (`testnet`, neutral; `Devnet`, purple, for a devnet portfolio) and
  drawn by `NetworkBadge`.
- **Sending FLM.** A testnet address is bech32m with HRP `tf` and a 64-byte payload (112 characters,
  past bech32's 90-character limit); `FlameAddress` validates it in JS, so the form stays synchronous.
  The mainnet HRP is unknown, so no mainnet address validates. **The send flow is one, not one per
  chain**, because a portfolio is planned to hold BTC and Flame together. `useSendChains()` (ux)
  returns a BTC part only when the portfolio has a signable BTC wallet and a Flame part only when it
  has a Flame wallet, built from the same wallet-or-`null` hooks, and `useSendForm`,
  `useEstimateAssetTransfer`, `useSendAssetTransfer` and `useFetchMaxValue` dispatch on the
  recipient's / form result's `blockchain`.
  The form allows exactly the chains with an own address (`ownAddresses`): a recipient on any other
  chain is `UNSUPPORTED_BLOCKCHAIN`, the recipient's chain picks the asset, and suggestions are built
  per allowed chain (Flame ones are the other devnet portfolios). Today a devnet wallet therefore
  sends only FLM to a Flame address and any other wallet only BTC to a BTC address. A zero-rated
  asset (FLM, any testnet asset) is entered in crypto only.
  `FlameEstimator` spends the largest readable native-flavor outputs first, pays the fixed
  `FLAME_TRANSFER_FEE` (1000 sparks; the node has no fee market yet) with a `FLAME_TRANSFER_GAS`
  limit of 1,000,000, and returns change to the wallet's own address `{0,0}`, the only predicate the
  scan watches. A proof outlives its tip by one block, so `FlameTransactionTemplate.send` fetches
  `proofs`, builds and calls `submit_tx` back to back, and rebuilds once on `MEMPOOL_REJECTED`.
  The amount step shows an encrypted memo field for a Flame recipient only (`AmountView.setMemo`);
  the form clamps it to `FLAME_MEMO_MAX_BYTES` (8102 UTF-8 bytes, the library's limit) and drops it
  when the recipient changes. The template puts it on the recipient's output only, never on change;
  the library seals it into that output's note, so only the recipient's view key reads it.
  The sender therefore can't read its own memo back from the chain, and a sent memo is deliberately
  not stored anywhere: history shows only a received memo, from the opened note
  (`FlameOutputAmount.memo` → `FlameActivityItem.memo`); the confirmation screen shows the memo
  being sent.
  Spent inputs stay unspent in the scan until the transfer confirms: `pending-spends.ts` holds them
  back from the next estimate in memory, until the scan reports them spent. There is no explorer
  link and no contact saving for a Flame recipient (contacts restore every address as BTC).
- History marks a transaction as sent when it spends any of the wallet's outputs, even unreadable
  ones — not when the spent sum is positive.
- **No counterparty in Flame history.** `scan` returns only outputs on the wallet's own predicate,
  and the chain holds predicates, not addresses, so neither the sender of a receipt nor the
  recipient of a send is known: the list and `FlameTransactionScreen` show an "Unknown
  sender/recipient" placeholder. The predicate is the address's spending key `S`, and its tracking
  address is `bech32m("tc", S)` (`FlameAddress.toTracking`, no native call). The receive modal
  bolds the data the full address shares with it and dims the rest (`FlameAddress.splitByTracking`): 51 characters,
  occasionally 52 when the view key's first bits happen to match.
- Core tests run with a fake `flameSdk` installed by `packages/core/test/setup-crypto.ts` (creating a
  devnet portfolio calls `viewKey` and `address`); Flame-specific tests swap in their own mock.
- **Desktop has no Flame yet** (planned before the release): it installs a rejecting `flameSdk` mock
  (`unsupportedFlameSdk`) and nothing else — no flag, no filtering, so a synced devnet portfolio
  reaches the desktop UI as is.
- Open: release builds with R8 have not been tried; JNA and the generated `com.flame.wallet` classes
  will need keep rules before the module is used outside a dev-client.

## UI

- Styling is `react-native-unistyles`. The token values live in `@safely/ux/theme` — shared with the
  web targets — and `src/shared/unistyles` only feeds them to `StyleSheet.configure` (currently only
  `dark`, which is also the initial theme). Take colors and spacing from the theme instead of
  hardcoding them, and edit the values in `packages/ux/src/shared/theme`, not here.
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

The strings live in `@safely/ux/translations` (`packages/ux/src/shared/i18n/translations/`), shared
with the web targets; `src/shared/i18n` only creates the i18next instance and detects the language.
The source of strings is `en.json`; the other locale files are produced by translation and are not
edited by hand. Add new copy to `en.json` and read it through `useTranslate()`. Supported locales are
also listed in `app.config.js` (`CFBundleLocalizations`) — update it when adding a language.

## Build and release

- EAS profiles are in `eas.json` (`staging-base`, `staging-cached`, `production`; build numbers come
  from `appVersionSource: remote`).
- Tester distribution runs through the EAS Workflow `.eas/workflows/build-and-distribute.yml`;
  trigger it locally with `pnpm --filter mobile run build`. It fires on a push to `master` or to a
  `release/<major>.<minor>.<patch>` branch (`release/1.4.0`, pattern `release/*.*.*`) — a
  differently named `release/*` branch is deliberately ignored — and on manual dispatch. Read that
  file's comments before editing it — EAS Workflows has sharp edges the syntax doesn't hint at:
  - `on.push.branches` globs support only `*`, `**` and `!`. A character class is not an error, it
    just never matches: `release/[0-9]*.[0-9]*.[0-9]*` passed minimatch and triggered nothing on
    `release/1.3.0`. Validate the version elsewhere (`release-draft.yml` does).
  - `env:` must be job-level. A step-level `env:` is unsupported and its `${{ }}` values arrive as
    raw literals; interpolate inside `run:` instead, or put the value on the job.
  - a custom `steps:` job starts with an empty working dir — `- uses: eas/checkout` first, otherwise
    committed files are missing. After checkout, cwd is the Expo project root (`apps/mobile`), so
    reference scripts project-relative (`scripts/eas-report.mjs`).
  - EAS doesn't quote-safely interpolate values into its internal bash: unescaped `` ( ) ` $ " ' \ ``
    in a changelog cause exit 141 / empty logs, which is why the workflow strips them up front.
- Android release builds run R8 (minify + resource shrinking) through `expo-build-properties` in
  `app.config.js`; what it breaks and how to check a feature against it: `android-minification.md`.
- `plugins/withNetworkSecurityConfig.js` makes Android trust user-installed CAs (Proxyman/Charles
    on a real device) in debuggable builds and in the staging APK — gated on `EAS_BUILD_PROFILE` being
    in an explicit allowlist, so `production` (and any new profile) keeps system CAs only. A new
    tester profile that needs a proxy goes into that allowlist; never widen it to production.

- Icons: `pnpm --filter mobile run icons` (`scripts/generate-icons-file.js`); the generated file is
  not hand-edited.
- Wallet names in pushes: the backend sends fallback `title`/`body` plus `data.target_ref`,
  `data.title_template`, `data.body_template` (`{{wallet_name}}` placeholder) and
  `mutableContent: true`. `safely-push-content` owns the `target_ref → name` file (App Group
  `group.com.safely.wallet` on iOS, `noBackupFilesDir` on Android); the same `PushContentCore`
  substitutes the placeholder in the iOS Notification Service Extension (target
  `SafelyNotificationService`, generated by `plugins/withPushContentExtension.js` — it copies
  `NotificationService.swift` + `PushContentCore.swift` from the module, so edit them there) and in
  `SafelyNotificationsService` on Android (a `NotificationsService` subclass registered with a higher
  priority in the module manifest). Unknown placeholder or unknown ref → original text. Changing the
  extension means a dev-client rebuild; EAS signs it via `extra.eas.build.experimental.ios.appExtensions`.
  Expo 56 consumes its own modules as prebuilt Maven artifacts in release builds, so a Gradle
  `project(':expo-notifications')` dependency only resolves because `expo.autolinking.android.buildFromSource`
  in `package.json` lists `expo-notifications` — keep that entry while `safely-push-content` subclasses
  its service.
- Sync-device events (device linked / device signed out) are pushes from the backend, not local
  notifications. The syncer keeps a `PUT /devices/{id}/syncs/{sync_id}` per enabled account
  (`sync_id = sha256(accountId)`, `deriveNotificationSyncId`; `syncIds` stored like `groupIds`),
  independent of wallet groups. The acting device announces through `usePushSubscriptionSyncer()?.announceSyncEvent` —
  the inviting device in `useConnectAccountToNewDevice`, the archiving device in `DeviceSupportWizardModal`, the
  leaving device in `useSignOutAccountConfirmation` and `useEraseAllData` (every account); observers never announce, so nothing to
  dedupe. The announce carries only ids (no device name: the backend text is fixed) and is
  best-effort (one attempt, logged); with pushes off `sender_device_id` is omitted, since an
  unenrolled sender has nothing to be excluded from.
- Android push tokens need Firebase: `android.googleServicesFile` points at the committed
  `apps/mobile/google-services.json` (client config of the Firebase project `safely-wallet`, no
  secrets — the FCM service account for sending lives in EAS credentials). Without it
  `getExpoPushTokenAsync` throws on Android and push registration never happens.
