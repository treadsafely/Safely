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
  `release/<major>.<minor>.<patch>` branch (`release/1.4.0`) — a differently named `release/*` branch
  is deliberately ignored — and on manual dispatch. Read that file's comments before editing
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
