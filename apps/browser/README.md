# apps/browser — placeholder

Reserved for the browser-extension target (MV3). Intentionally empty: no `package.json` yet, so
pnpm skips this directory while it has no manifest.

## What will live here

The extension build entry and the browser implementation of the platform contract — nothing else:

- **Entry points**: popup (and/or side panel), options page, background service worker, each built by
  Vite from the shared UI.
- **Platform injection**: this app's own platform contract and its implementation — storage
  (IndexedDB / `chrome.storage`), clipboard, external links (`chrome.tabs`), locale, app-state, QR
  scanning. `@safely/web-ui` declares no such interface: what a platform is differs per target, so
  describe it here rather than reusing `DesktopPlatform`.
- **Globals**: an equivalent of `../desktop/src/renderer/global-polyfills.ts` (`Buffer`,
  `IsomorphicEventSource`, `safelyCrypto.pbkdf2Sha512`) and this app's own Vite config — neither is
  provided by the shared package.
- **Manifest and packaging**: `manifest.json`, store artefacts, permissions.

## What will not live here

Screens, layout and design-system components, and the flows that drive them where those bind to
nothing but `@safely/ux` (`features/{add-wallet,wallet,account,contact}`). They belong to
`@safely/web-ui`, which is shared with `apps/desktop` and stays platform-independent — the same rule
that keeps `@safely/ux` free of React Native. `eslint-plugin-boundaries` enforces it: `web-ui` may not
import app code. Onboarding is the flow this app does write itself: it navigates, and it decides what
protects the secret before a passcode exists — a keychain on desktop, an open question here.

## Constraints to keep in mind before starting

- **MV3 CSP** forbids remote code and `unsafe-eval`. This is one reason the styling layer is
  zero-runtime (Panda): the build must not inject styles at runtime.
- **No privileged process.** Unlike Electron there is no main process, so nothing can reach an OS
  keychain item bound to the code signature, and there is no trusted confirmation window.
  Secret-at-rest protection has to be solved differently (passcode-derived key), and that decision
  needs its own threat-model entry.
- **Popup lifetime is short.** A popup is destroyed when it closes, so the sync engine only runs
  while a view is open unless it is hosted in the service worker — which MV3 terminates when idle.
- **SSE needs custom headers**, so the native `EventSource` is unusable here as well;
  `@safely/xhr-event-source` is reused as the `IsomorphicEventSource`, as desktop and mobile do —
  but note it needs `XMLHttpRequest`, which a service worker does not have.
