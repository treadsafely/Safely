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
  predicate would fail the whole read and hide the balance. Core turns a failed item into
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
  every binary value travels as a function argument of its own (`contracts`/`notes`/`proofs` per
  input, `memos` per output, an empty memo for none) and the rest as one `TransferPlan` record
  (network, path, parallel `addresses`/`qtys`, fee, gas; every field required, so a missing key
  rejects the call instead of falling back to a default path), because Kotlin Expo functions take
  at most 8 arguments. **Never put a `Uint8Array` inside a record:** on Android a record arrives as
  a `ReadableNativeMap`, where a typed array is a plain map, and its `ByteArray` conversion fails
  with `DynamicFromArray cannot be cast to byte[]`. A function argument is converted as a typed
  array, alone or as an array of them (`List<ByteArray>`); a record or map field is not. iOS
  converts both, so only Android breaks. The facade test asserts the plan holds no `Uint8Array` at
  any depth; the bridge itself is mocked there, so only a device build exercises the conversion.
  `validateReceivingAddress` and `memoMaxBytes` need no wallet and are synchronous (`Function`, not
  `AsyncFunction`), so the send form validates and clamps without awaiting; the first still answers
  an `{ ok, … }` outcome, unwrapped in the facade. Each async call builds its `Wallet` and drops it
  before returning (Kotlin
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
  (`FLAME_DEVNET_NETWORK`, `t1…i1…` addresses) and the portfolio reports `networkType: TESTNET`, so
  every testnet rule (no market price, no contacts, no pushes) applies to it. Balance and history count
  only flames, the native flavor: the SDK says so per output (`isNative` on a decoded clear contract
  and on an opened note, kept in `FlameOutputAmount`), so the app holds no flavor constant of its own;
  FLM has 8 decimals. The node URL is
  `blockchains.flame.<network>.rpc_url` from the boot config; until the config serves it,
  `useFlameApi` falls back to `https://dev-flamed.safely.app/` for testnet.
- **No UI creates a devnet portfolio.** Mobile imports one from
  `https://link.safely.app/import-flame-devnet-wallet#testseed=<phrase>` (a Universal Link / Android
  App Link) or `safely://import-flame-devnet-wallet?testseed=<phrase>`. The https link opens the app
  when it is installed and otherwise loads the page on `link.safely.app`, which sends the user to the
  store; the phrase rides in the fragment so that page's server never receives it, and
  `fragmentToQuery` in the linking options' `getStateFromPath` turns it back into the query React
  Navigation parses (it ignores a fragment). The app side is `ios.associatedDomains` and the
  `android.intentFilters` (`autoVerify`, every path of the host) in
  `app.config.js`, all built from its `UNIVERSAL_LINK_HOST`, which also goes to
  `extra.universalLinkHost` for `useLockAwareLinking` to read through `expo-constants` — change the
  host there and nowhere else; the domain must
  serve `/.well-known/apple-app-site-association` (app ID `<team>.com.safely.wallet`) and
  `/.well-known/assetlinks.json` (SHA-256 of the Play app-signing key and of the key EAS signs tester
  APKs with), with no redirect. The host exists only for app links, so the intent filter and the
  AASA (`"/": "/*"`) claim every path: a new deep link needs only its `linking.path`, no rebuild for
  the manifest, and a path the navigation does not know opens the app where it was. The
  `import-flame-devnet-wallet` path maps
  to `ImportFlameDevnetWalletModal`, a `presentation: 'modal'` screen (an iOS page sheet), which goes
  through `useLockAwareLinking`, so it runs only after unlock. A missing `extra.universalLinkHost`
  only drops the https prefix (logged), never the app. The modal reads `testseed` and the optional
  `walletName` through zod as a string or `''` — a link repeating the key (query plus fragment)
  delivers an array. It parses the phrase
  (`parseFlameDevnetSeedParam`: quotes, `+`/`%20`, case) and the name
  (`parseFlameDevnetWalletNameParam`: control and format characters dropped — any site can craft
  the link, and a bidi override or zero-width character would spoof the synced name — trimmed, cut
  to `PORTFOLIO_NAME_MAX_LENGTH`, blank → the default name below). The name is read once when the flow mounts: a repeated link for the same phrase
  leaves it as it is, so the confirmed name cannot change under a ticked checkbox. The flow is keyed by `testseed`, because a
  second link only updates the params of the open modal. The modal sits on top of whatever screen
  the user was on, onboarding included, and picks its branch once, by whether an account existed
  when it opened. **With no account** it shows the same confirmation with "a new account will be
  created" copy and the name "Wallet 1" (or the link's `walletName`); Import replaces the modal with `OnboardingPasscodeScreen`
  carrying a `flameDevnet` source (its own `MnemonicResource` copy — the modal closes its own on
  unmount) and `firstPortfolioName` (the name the confirmation showed), and the account is created there with the devnet portfolio as its first, as for an
  imported phrase. A link that arrives while a device sign-in is in the stack (`SignInScreen` in onboarding,
  `SignInModal` when adding an account) goes straight back:
  the device link could complete under the modal and add an account the branch does not know
  about, and the link must not abort a sign-in the user is in the middle of (the import's reset to
  the tabs would). The modal also
  leaves when the account it opened with disappears (signed out or archived from another device),
  and goes straight back for an account without a passcode (after a device sign-in, before passcode
  setup): the mobile security check throws without a passcode, so Import could not succeed, and
  skipping the check is not worth it for a link the user can open again.
  **With an account**, if a
  portfolio with the same phrase hash is
  already in the account (`useExistingFlameDevnetPortfolio`, read once when the modal opens — after
  its own import the list holds the wallet too), it makes that one active, toasts "already imported"
  and leaves without showing anything. Otherwise it first shows a confirmation
  ("Import Demo wallet" in the copy): the target account, a table of the wallet's name, balance and
  shortened address, a test-network note, and an "I came here from the runflame.org website"
  checkbox under the buttons that gates Import — a link can come from any site, so the user sees what lands in the wallet list. The address and balance
  come from `useFlameDevnetWalletPreview` → `PortfolioFlameDevnet.createPreviewFlameWallet`: the same
  `FlameWallet` the import would create (same id, so the persisted outputs carry over), derived
  without the secure store and kept only in a non-persisted query. Import then unlocks the secure
  store, adds the portfolio with the name and icon the preview showed (passed in, never resolved
  twice) or finds the one with the same phrase hash, and makes it active
  (`useImportFlameDevnetPortfolioFromSeed` → `useImportFlameDevnetPortfolio`). After an import or a
  duplicate it resets to the tabs. Cancel, close and a preview
  error always go back, so an onboarding step or an open flow underneath is kept. A link is
  dispatched on top of the initial route (`initialState` is always set, so React Navigation discards
  the initial URL — it still calls the linking options' `getInitialURL` on its first render, which
  therefore answers `null`, and `useLockAwareLinking`'s effect reads `Linking.getInitialURL()` and
  delivers it like any other link, after unlock), so there is always something to go back to; the reset to
  `resolveStartRoute` (`@mobile/shared/navigation`) is only a fallback. `resolveStartRoute` is the one
  place the start route is decided — `useInitialNavigationState` and `useRestrictionGuard` read it;
  never hand-write that choice again (the restriction guard once sent an account without a passcode
  to `WelcomeScreen`, which throws on an account). The passcode-setup route itself is
  `PASSCODE_SETUP_ROUTE`, shared by `resolveStartRoute` and the sign-in's reset to passcode setup. While the import writes, `usePreventRemove` keeps the modal on screen
  (see the UI section below), since the write cannot be cancelled and would reset the stack after
  the user left.
- `flame` holds `{ encryptedViewKey, receivingAddress, trackingAddress, predicate }`, all computed once at
  portfolio creation (`trackingAddress` is the receiving address's first half, as the SDK issues it)
  (the mnemonic is already in hand): the chain builds its `wallets` from them synchronously, so the
  address needs no native call at startup, and reads amounts with the view key, so the seed is never touched
  again for Flame. Like `SignableBtcWallet.sign`, a `FlameWallet` carries its own operations —
  `readAmounts` (opens the notes with the view key) and `buildTransfer` — so the estimator and the
  transaction template take the wallet alone, never the chain. **The view key is stored encrypted,
  and reads without the passcode.** It reads every amount and memo, so it never sits in the CRDT
  (regular MMKV storage) in the clear: `AccountDataKey.encryptor()` (`@safely/ux` `shared/security`)
  seals it with the account data key (`MKDerivationDomain.ACCOUNT_DATA_KEY`, spec §1.4), a general
  key for synced data that must read without the passcode. `useCreateAccount` derives it with the
  store it already unlocked; for an account that lacks it — onboarded, or created before the key
  existed — `AccountDataKey.get` derives it on first use through `UNSAFE_SKIP_SECURITY_CHECK_unlock`,
  as the onramp credential does. It is cached in the `encrypted` scope under the account's node, so
  deleting the account wipes it. Every device of the account derives the same key, so a
  portfolio created on one opens on another with no prompt. `readAmounts`
  decrypts the key only when there are confidential outputs and does not keep it. The preview,
  which may run with no account yet, never encrypts it: `createPreviewFlameWallet` builds a
  `ViewKeyFlameWallet` straight from the derived plaintext key, held in memory for as long as the
  preview query lives (`gcTime: 0`). The chain caches every read amount per output id, except an output read without
  its note (`missing`), whose contract failed to decode, or whose opening hit a native error (`error`):
  native code reports any per-item exception the same way, so a transient one would stick.
- **Balance is one set, pending or not.** `useFlameWalletOutputs` calls the node's
  `unspent(address, true)`: the node applies its mempool on top (outputs a pending transaction
  spends are left out, outputs it creates are added), and the app counts what comes back as one
  set — no confirmed/pending split, no safe/unsafe sender, no pending balance. A pending output has
  no membership proof yet, so a send that picks one fails on `proofs` and the user retries after the
  next block; with frequent devnet blocks that is accepted. The query is persisted
  (`usePersistQuery`, schema `sFlameWalletUnspent`): it stores the entries as the node served them
  (base64) and the read amounts, and `select` rebuilds `FlameOutputs` — which holds `Uint8Array`s
  that JSON cannot carry. Memos never reach disk: `persistSanitizers` in `cache-config.ts` strips
  them as the persister writes, so a restored cache shows amounts without memos until the next read
  opens the notes again in memory.
- **Flame history is built layer by layer like BTC's activity.** `fetchFlameActivity` (the
  counterpart of `fetchBtcActivity`) reads one page of the node's `history`: the first asks
  `with_pending` and lists the mempool on top, newest first; later pages follow the `older` cursor.
  `useFlameHistory` / `useGroupedFlameHistory` mirror `useBtcHistory` / `useGroupedBtcHistory` (an
  infinite query with the activity stale time, not persisted — it holds memos; pending items in
  their own group), `useFlameHistoryGroups` mirrors `useBtcHistoryGroups` through
  `buildFlameHistoryGroupViews` (both start from `useActivityRowContext`), and
  `useFlameHistoryPolling` mirrors `useBtcHistoryPolling` — both sit on `useNewActivityPolling` (3 s
  refetch while focused, a new first key raises the bubble and invalidates the balance). Mobile's
  `FlameHistoryList` and `BtcHistoryList` render the same `HistoryList` and differ only in these
  hooks; `FlameTransactionScreen` and `BtcTransactionScreen` render the same `TransactionDetails`
  (`features/transaction-details`) from `useFlameTransactionDetails` / `useBtcTransactionDetails`. Each entry carries the wallet's created and spent
  contracts with bytes and notes, so `toFlameHistoryItem` prices a send without paging back to its
  receipts: sent = spent − created − fee, with the fee apart, received = created. Timestamps are
  the block time (the node's mock core indexer: the minting machine's clock), or `received_at`
  while pending; either may be absent (genesis, a node restart).
- **A chain-specific symbol carries its chain, a shared one carries none.** `BtcHistoryList` /
  `FlameHistoryList` over `HistoryList`, `useBtcReceiveInfo` / `useFlameReceiveInfo`,
  `BtcAssetCell` / `FlameAssetCell` and `AssetLogo` (which picks `FlameLogo` or the asset image) in
  `entities/asset`. A new Flame part starts by finding its BTC counterpart and either sharing it or
  mirroring its name, layer and shape — a Flame-only variant of something BTC already has is the
  drift this rule prevents. Both lists scroll to the top on the user's own send through
  `useScrollToTopOnNewTx`, fed by `useLastBroadcastedBtcTx` / `useLatestPendingSentFlameTxId`.
- **Code that differs per chain dispatches on `blockchain`, never on a flag.** No
  `isFlame ? … : …`: a non-rendering difference is a `Record<Recipient['blockchain'], …>`
  (`SEND_FORM_FEATURES_BY_CHAIN`, `IS_ESTIMATE_ENABLED_BY_CHAIN`, `MISSING_CHAIN_ERROR`), a rendered one
  a small component that `switch`es on the discriminated form (`ChainRecipientCells`,
  `ChainFeeSubvalue` in `ConfirmationScreen`), a chain's own logic a function per chain behind a
  `switch` (`mapPortfolioToSuggestions`, `selectSendChain`, `useSendAssetTransfer`). What both
  chains do stays in one place and is composed in; no base classes or generic per-chain templates.
  A few repeated JSX lines are fine.
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
- **Sending FLM.** A receiving address is a Bech32f tracking address (`t1…` / `f1…`, the spending key)
  followed by the encryption key (`i1…` / `e1…`); `FlameAddress.validate` asks the SDK's synchronous
  `validateReceivingAddress`, so the form stays synchronous and the app encodes no address itself.
  **The send flow is one, not one per
  chain**, because a portfolio is planned to hold BTC and Flame together. `useSendChains()` (ux)
  returns a BTC part only when the portfolio has a signable BTC wallet and a Flame part only when it
  has a Flame wallet, built from the same wallet-or-`null` hooks, and `useSendForm`,
  `useEstimateAssetTransfer`, `useSendAssetTransfer` and `useFetchMaxValue` dispatch on the
  recipient's / form result's `blockchain`.
  The form allows exactly the chains with an own address (`ownAddresses`): a recipient on any other
  chain is `UNSUPPORTED_BLOCKCHAIN` — except a Flame address (mainnet or testnet) in a wallet with no
  Flame, which is `INVALID_WALLET_ADDRESS`, since Flame is a devnet-only chain for now; the recipient's chain picks the asset, and suggestions are built
  per allowed chain (Flame ones are the other devnet portfolios). Today a devnet wallet therefore
  sends only FLM to a Flame address and any other wallet only BTC to a BTC address. An asset without
  a non-zero price (FLM, any testnet asset) is entered in crypto only.
  `FlameEstimator` spends the largest readable native-flavor outputs first, pays the fixed
  `FLAME_TRANSFER_FEE` (1000 sparks; the node has no fee market yet) with a `FLAME_TRANSFER_GAS`
  limit of 1,000,000, and returns change to the wallet's own address `{0,0}`, the only address the
  wallet reads. A proof outlives its tip by one block, so `FlameTransactionTemplate.send` fetches
  `proofs`, builds and calls `submit_tx` back to back, and rebuilds once on `MEMPOOL_REJECTED`.
  The amount step shows an encrypted memo field for a Flame recipient only (`AmountView.setMemo`);
  the form clamps it to the SDK's `memoMaxBytes()` (UTF-8 bytes that fit the note's cell) and drops it
  when the recipient changes. The library seals a memo into its output's note, so only that
  output's owner reads it — the sender cannot open the recipient's note. The template therefore
  puts the same memo on the change output too, and history reads a sent memo back from the change
  exactly as it reads a received one from the opened note (`FlameOutputAmount.memo` →
  `FlameHistoryItem.memo`, the first memo among the wallet's created outputs); a sent memo is
  stored nowhere else. A send with no change (max, or an exact amount) has no output of the
  wallet's own, so its memo is not readable afterwards; neither is one sent before the change
  carried it.
  The node admits a transfer synchronously, so `useSendAssetTransfer` invalidates the balance and
  the history (`flameBlockchain`) and the next `unspent` already leaves the spent inputs out; there
  is no local broadcast cache like `BroadcastedBtcTx` and no store of the sent txid. The history
  scrolls to the top when its first item becomes a pending send of the wallet
  (`useLatestPendingSentFlameTxId`, read from the history itself), so the scroll waits until the
  refetched item is in the list; a send from another device of the same wallet scrolls it too, on
  purpose. There is no explorer
  link and no contact saving for a Flame recipient (contacts restore every address as BTC).
- History marks a transaction as sent when it spends any of the wallet's outputs, even unreadable
  ones — not when the spent sum is positive.
  An amount it could not read is shown as a lone dash with no sign, in the row and on the details
  screen alike (`buildFlameActivityAmountView`).
- **Counterparties in Flame history.** Each `history` entry lists the other side as
  `others_spent` (whose coins it spent) and `others_created` (whom it created coins for), each a
  predicate with its tracking address (`t1…` / `f1…`; schema default `[]` for an older node).
  `toFlameHistoryItem` follows flame-lib's CLI wallet: a receipt's sender is the first of
  `others_spent`; a send's recipient is the first of `others_created`, but only when no one
  else's coins were spent — otherwise those outputs are the other payer's change, and no recipient
  is shown. Only a tracking address is known, never the full receiving one (its encryption key is
  not on chain). `findPortfolioMetaByAddress` matches it against a devnet portfolio's
  `trackingAddress`, so the history row and the details screen — both through
  `resolveActivityCounterparty` in `features/activity-display`, for BTC as well — name a contact or
  an own wallet, and otherwise show the shortened address; with none, the "Unknown
  sender/recipient" placeholder stays. The receive modal (`QRCodeBlock.trackingAddress`) shows the receiving
  address at 13/18 and dims the encryption key after the tracking prefix (`text.secondary`).
- Core and ux tests run with a fake `flameSdk` installed by their `test/setup-crypto.ts` (creating a
  devnet portfolio calls `viewKey` and `address`; ux's fake tells a receiving address apart by its
  two HRP parts, for the send form); Flame-specific tests swap in their own mock.
- **Desktop has no Flame yet** (planned before the release): it installs a rejecting `flameSdk` mock
  (`unsupportedFlameSdk`, where `validateReceivingAddress` answers `false` so BTC address detection
  keeps working) and nothing else — no flag, no filtering, so a synced devnet portfolio
  reaches the desktop UI as is.
- Under R8 the module relies on two sets of consumer rules, nothing in `extraProguardRules`:
  `@runflame/wallet-rn`'s keeps JNA and the generated `com.flame.wallet` classes (see
  `android-minification.md`), and `expo-modules-core`'s keeps every `Record` with its field names,
  which are the JS keys. A minified staging APK reads wallets and balances; `buildTransfer` on a
  minified build is still to be confirmed by a send.

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
- **A screen that must not close while it writes blocks removal with `usePreventRemove`.** Disabling
  its buttons or setting `gestureEnabled: false` leaves the Android hardware back and any programmatic
  pop open, and a write that finishes after the screen is gone still runs its navigation and toast on
  whatever the user moved to. `usePreventRemove(isPending, …)` stops every removal, the native swipe
  included. Its callback receives the blocked action: a screen that navigates away itself when the
  write succeeds (a `reset` right after `await`, before `isPending` drops) dispatches that action
  from the callback once it knows the write is done — `ImportFlameDevnetWalletModal` is the example.
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
The source of strings is `en.json`; read copy through `useTranslate()`. Every key a task adds or
changes in `en.json` gets its translation in every other locale file of the directory (today `ru.json`)
before the task is done — never leave one for a later translation pass, since nothing in lint or CI
reports a missing key and i18next silently falls back to English. Keep Russian copy gender-neutral
("Ссылка открыта…", not "Я перешёл…"). Supported locales are also listed in `app.config.js`
(`CFBundleLocalizations`) — update it when adding a language.

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
