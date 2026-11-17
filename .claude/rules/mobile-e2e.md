---
paths:
  - 'apps/mobile/.maestro/**'
  - 'apps/mobile/.eas/workflows/**'
  - 'apps/mobile/src/shared/constants/testID.ts'
---

# Mobile e2e (Maestro)

The flows live in `apps/mobile/.maestro`, one file per step of a **chain**: each flow starts from the
state the previous one left (onboarding → add wallets → recovery phrase → watch-only → import → send
→ sign out + onboarding import), so the order matters and a failed flow invalidates the rest.

- **The order is stated twice and must stay identical**: `executionOrder.flowsOrder` in
  `.maestro/config.yaml` (local runs) and `flow_path` of the EAS job `e2e_android`
  (`.eas/workflows/build-and-distribute.yml`). EAS does not document whether a directory in
  `flow_path` honours `config.yaml`, and a wrong order on CI would run the chain on the wrong state
  while spending real BTC — so CI gets the explicit list. A new flow goes into both.
- **Shared steps are subflows** in `.maestro/subflows/` (`enter-passcode.yaml` with `SCREEN_ID`,
  `finish-onboarding.yaml`); the `'*.yaml'` glob in `config.yaml` does not reach them. Every flow
  assumes passcode 1234.
- **Never set `retries` on the EAS job.** A retry reruns flows out of the chain's state, and
  `send-asset` would broadcast a second real payment.
- **Never filter the chain by tag** (`--exclude-tags`): `flowsOrder` names every flow, and dropping
  one breaks the order.
- **A local run** goes from `apps/mobile` against an installed release or dev-client build:
  `maestro test .maestro -e MAESTRO_SEED_PHRASE=… -e MAESTRO_IMPORTED_WALLET_ADDRESS=…
  -e MAESTRO_WATCH_ONLY_ADDRESS=… -e MAESTRO_RECIPIENT_ADDRESS=…` (the values live in the EAS
  environment). There is deliberately no package script for it: the chain **erases all app data on
  the device** (`clearState`, then sign-out) and **sends real BTC** from the `MAESTRO_SEED_PHRASE`
  wallet — never run it against a personal install.
- The `MAESTRO_*` values come from the EAS environment (locally: `-e` or the shell); Maestro exposes
  `MAESTRO_`-prefixed variables to flows. `MAESTRO_SEED_PHRASE` is a funded wallet: a command `label`
  only renames the printed step, and Maestro's debug logs and the EAS artifacts still carry the typed
  text. Treat those artifacts as secret.
- **`send-asset` matches its own transaction by amount.** Every run sends from the same wallet, so a
  pending tx of an earlier run may still be in the history. The amount is random per run with
  exactly 3 significant digits and no trailing zero, because a history row rounds a crypto amount
  below 1 to 3 significant digits and shows it without the fee (the default of "show full sent
  amount"). About 1 run in 90 can still match an older pending tx — accepted for a smoke check.
- Selectors are testIDs from `src/shared/constants/testID.ts`, never visible text: the app is
  localized. Add an id only together with the flow that uses it.
- The flows run on the minified release APK, see `android-minification.md`.
