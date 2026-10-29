---
paths:
    - 'apps/desktop/src/renderer/features/ledger/**'
    - 'apps/desktop/src/main/security.ts'
    - 'packages/web-ui/src/features/ledger/**'
    - 'packages/ux/src/features/ledger/**'
---

# Ledger on the web targets

The flow is `packages/web-ui/src/features/ledger/`: the same screens mobile has, as cards —
connect, discovery, pairing, success/unsuccess, import accounts, customize — driven by
`useLedgerFlow` and rendered by `LedgerModals`, plus `LedgerSignModal` for signing and
`DerivedWalletsList` for the wallet settings. Every step binds to `@safely/ux` alone
(`useLedgerDeviceScan`, `useLedgerPairing`, `useLedgerAccounts`, `LedgerSessionProvider`), which is
why the whole thing is shared and the app contributes one object: the transport.

Three callers hold a `useLedgerFlow` each, and they are independent states by design: the add-wallet
flow (`openLedger`), the wallet settings' "find more wallets" (`useWalletFlow.openFindMore`, which
sets `findMorePortfolioId` on the session) and the desktop onboarding, which passes
`onAccountsSelected` so the import step hands the selection to the passcode step instead of saving —
there is no account to save into yet, hence `portfolios: []` there. That is also why the flow never
calls an account-bound hook itself: `useSaveLedgerAccounts` (and anything over `usePortfolios` /
`useActiveAccount`) throws on the Welcome screen, where no account exists, so the add-wallet and
wallet flows call it and pass the result in as `saveAccounts`.

## The provider sits above the Suspense boundary

`LedgerSessionProvider` sits between the `ErrorBoundary` and the `Suspense` in `AppProviders`, the
way mobile keeps it inside `RootErrorBoundary` and above `RootSuspenseGate`. The accounts query's `queryFn` (`useAccountsQueryConfig`) calls
`attachAccountsToStore`, whose transform captures `useLedgerSessionPort()` from the render that
created the query — on a cold cache that is the first render, which suspends and is thrown away.
With the provider inside the boundary that render's provider instance is discarded too, the
restored `PortfolioLedger`s keep its `withSession`, and a signing then calls `setActiveActor` on a
fiber that never mounted: React warns "Can't perform a React state update on a component that
hasn't mounted yet", no sign modal appears and the send button stays pending. Above the boundary
the instance is the one that commits.

## The transport is WebHID, and it needs no picker

`apps/desktop/src/renderer/features/ledger/create-ledger-transport.ts` builds the DMK with
`@ledgerhq/device-transport-kit-web-hid`; the identifier is `webHidIdentifier` (`WEB-HID`), and
`transportIdentifier` is what `listenToAvailableDevices` filters on. Pin that package to a version
whose peer range covers the catalog's `@ledgerhq/device-management-kit` — `1.2.4` already wants
`^1.7.0`.

The transport's `listenToAvailableDevices` is `navigator.hid.getDevices()` plus the `connect` /
`disconnect` events, and `getDevices()` only lists devices the page already holds permission for.
Main grants that up front: `setDevicePermissionHandler` in `main/security.ts` answers `true` for
`deviceType: 'hid'` with Ledger's vendor id (`0x2c97`, written out so the kit stays out of the main
bundle) and `false` for everything else, and the check handler answers `true` for `hid` so the API
is reachable at all. The consequence is the one that makes the discovery card work like mobile's:
a plugged-in Ledger appears with no chooser, and unplugging it empties the list. The DMK's
`startDiscovering` (`navigator.hid.requestDevice`) is never called; Electron has no built-in HID
picker, so a `select-hid-device` handler would be needed before anyone does.

`test/main/security.test.ts` pins both halves — the `hid` check and the vendor filter.

## Sandbox

The HID device is opened from processes that inherit the main binary's sandbox, and IOKit refuses
a HID device to a sandboxed process without `com.apple.security.device.usb`, which is why the key
is on `signing/entitlements.plist` and `verify-signature.sh` fails without it. This is a sandbox
entitlement, not a capability: the provisioning profile does not have to change for it.

**Not yet verified on a signed build.** `pnpm start` is unsandboxed, so it proves the flow and not
the entitlement; the first TestFlight build with a Ledger plugged in is what shows whether the MAS
sandbox lets Chromium's HID service through. If `getDevices()` comes back empty there while the
development build lists the device, the entitlement is the first suspect.

## What differs from mobile, and on purpose

- The copy for the USB steps is its own set of keys (`addWallet.connectLedger.screen.steps.usb`,
  `discovery.subtitleUsb`, `pairingUnsuccess.subtitleUsb`); the Bluetooth keys stay mobile's.
- The sign modal opens itself: `LedgerSessionProvider`'s `onSigningStart` is optional — mobile
  navigates to its sheet from it, the web passes nothing — and `LedgerSignModal` (mounted in
  `MainPage` next to the send flow) renders whenever `activeActor` is set. The provider clears the
  actor when the machine finishes or fails to start, so `activeActor !== null` means "a signing is
  in progress" and nothing keeps a finished actor's hooks (and its `useActivePortfolio()`) mounted.
  Mobile's sheet keeps its own copy of the actor for the dismiss animation. Closing the modal sends
  `CANCEL`, exactly as mobile's sheet does.
- Everything that is not a view is shared through `@safely/ux`, and mobile calls the same thing:
  `useLedgerDiscovery`, `useLedgerPairingSteps`, `useLedgerSigningSteps`, `useLedgerImport`,
  `useSaveLedgerAccounts`, `useLedgerPortfolioSource`, `getLedgerPortfolioDraft`, `getLedgerDerivationName`,
  `resolveLedgerStepStatus`, `getLedgerModelName` / `getLedgerModelLabel` / `getLedgerWalletName`,
  `getLedgerImageKey` and the session's `disconnect`. The PNGs live in
  `@safely/ux/assets/images/ledger/*` for the web; mobile keeps its copies under `resources/` and
  maps `getLedgerImageKey` onto them. A new piece of Ledger logic goes to ux first, never in as a
  copy of mobile's.
- The sidebar and the wallet picker render a Ledger as a group — a header that selects nothing and
  one row per derivation. The sidebar reorders both the group among the wallets and the derivations
  inside it (`useReorderList` nested in `LedgerWalletCell`, the inner drag stops propagation), and
  the home header shows the active derivation's name and index.
