# Safely — cross-platform wallet (pnpm monorepo)

Local-first BTC wallet: private keys and the mnemonic never leave the device; state is synced
between the user's devices as E2EE snapshots through the sync server (the server only ever holds
ciphertext). Platform-independent logic lives in `packages/*`; the apps in `apps/*` are thin
adapters — they implement the DI interfaces and render UI.

## Repository map

Dependencies flow strictly bottom-up in this table; imports in the other direction are forbidden.

| Package                     | Role                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/slottree`         | CRDT slot tree + deterministic cbor: the primitive under all synced state. Has a formal spec.                                                  |
| `packages/sync`             | E2EE sync protocol: key hierarchy, device onboarding, device list, snapshots, SSE stream, xstate machine, generated OpenAPI client.            |
| `packages/sync-storage`     | Versioned schemas of user state (`v1`, `v2`, …) on top of slottree, plus migrations.                                                           |
| `packages/core`             | Wallet domain: BTC (xpub, PSBT, fee estimation), Ledger, external APIs (config/price/rate/exchange), entities, DI interfaces. No React.        |
| `packages/ux`               | React layer shared by every app: FSD (`shared` → `entities` → `features`), react-query, zustand, xstate forms. No RN/DOM specifics.            |
| `apps/mobile`               | Expo dev-client (iOS/Android): FSD + `screens`, native modules `modules/safely-*`, unistyles, i18n.                                            |
| `packages/xhr-event-source` | EventSource over XHR for platforms without native SSE.                                                                                         |

Platform capabilities reach the domain through DI interfaces from `@safely/core` (`src/di/`:
`IStorage`, `ISecretEncryptor`, `ILoggerTransport`, `QrScanner`, `IPushNotifications`).
Implementations live in the app, never in a package: a package that needs a native API declares an
interface instead of importing the platform.

## Commands

Node version comes from `.nvmrc` (`nvm use`); pnpm only (`preinstall` blocks npm/yarn).

- `pnpm -r run compile` — `tsc --noEmit` across all packages; CI always runs this
- `pnpm --filter <pkg> run lint|test|compile` — single package (`<pkg>` is the package.json name,
  e.g. `@safely/core`, `mobile`)
- `pnpm -r run lint`, `pnpm -r run test` — everything; CI runs them only for changed packages
  (`--filter "...[<merge-base>]"`), and for all packages when root-level files change
- `pnpm lint:scripts` — the root `scripts/` tooling, which belongs to no package and which
  `pnpm -r` therefore skips; CI runs it on every pull request. `apps/mobile/scripts` needs no
  separate call — mobile's `lint` covers `./src ./scripts`
- mobile: `pnpm --filter mobile ios|android|start` — dev-client, not Expo Go

Dependency versions go through `catalog:` in `pnpm-workspace.yaml` only: add the version to the
catalog and reference `catalog:` from the package's package.json. `minimumReleaseAge: 5760` means
pnpm refuses packages published less than four days ago.

Root-level tooling stays at the root: `eslint`, its plugins and `prettier` are installed once in the
root package.json, and a package only adds the `"lint": "eslint ./src"` script. The node scripts
under `scripts/` are linted too — plain ESM, recommended rules plus prettier, none of the TS/React
layers; new tooling goes in one of those two directories so it is covered by default. Model a new
package's devDependencies on `@safely/ux` or `@safely/core` — `typescript`, `@types/*` and bundler
plugins yes, root tooling no.

## Pitfalls the tooling won't catch

- **UI strings only via i18n** (`useTranslate()` from `@safely/ux`) — no lint rule guards a hardcoded
  string, so it passes lint, CI and review.
- **`packages/sync/src/api/generated/**` is a generated OpenAPI client** — hand edits pass CI and get
  silently overwritten on the next regeneration. Keep wrappers and domain logic outside `generated/`.
- **Log through the logger, never `console`**, and run sensitive data through `filterSensitiveData`
  from `@safely/core`.
- **Import cycles are an eslint error** (`import/no-cycle`) — never suppress it. Modules call helpers
  at module-load time (e.g. `defineQueryKeys(...)` in `keys.ts`), so a cycle yields `undefined`
  instead of the export and crashes the app at startup.

Everything else is enforced mechanically — layer boundaries, `any`, `console`, import order, type
imports, naming. The full rule set lives in `eslint.config.js`; run lint instead of memorising it, and
see `.claude/rules/typescript-style.md` for the conventions whose reason isn't obvious from the error
message.

## Where the details are

Topic rules in `.claude/rules/` load automatically when you open files in the matching area:
`typescript-style.md`, `fsd-layers.md`, `sync-and-crypto.md`, `mobile-app.md`, `testing.md`.

Specs — read before changing the sync protocol or the state format; the rules files do not restate
them:

- `packages/sync/doc/spec.md` — keys, device onboarding, device list, snapshots, server behaviour
- `packages/sync/doc/threat-model.md` — threat model: what counts as compromise, what is out of scope
- `packages/slottree/docs/spec.md` + `implementation.md` + `versioning-examples.md` — CRDT tree
  format, merge protocol, versioning

## Keeping these instructions current

`CLAUDE.md` and `.claude/rules/*.md` are part of the change, not documentation written afterwards.
Whenever a change makes something here wrong, incomplete or misleading, update it in the same PR:

- package or app added, removed, renamed, or the dependency direction changed → the repository map
  above
- new script, or a changed lint/test/compile/CI command → the Commands section above
- new lint rule, boundary or eslint config change → "Rules that break the build or CI" plus
  `typescript-style.md` / `fsd-layers.md`
- new layer, path alias, or state-management convention → `fsd-layers.md`
- sync protocol, state format or schema version changed → the spec first, then `sync-and-crypto.md`
- native module, EAS profile, i18n or theming change → `mobile-app.md`
- new test location, naming or tooling → `testing.md`
- a new spec or long-form doc appeared → add a pointer under "Where the details are"

If you had to be corrected twice about the same thing, or you hit a pitfall that isn't written down,
propose the edit here instead of only fixing the code. A rule that only applies to part of the tree
goes into a new `.claude/rules/` file with `paths:` frontmatter, not into more lines here — keep this
file under ~150 lines. Removing a stale instruction matters as much as adding a new one: a wrong rule
costs more than a missing one.

Never put secrets or sensitive data in these files — `CLAUDE.md`, nested `CLAUDE.md`s,
`.claude/rules/*.md`, `CLAUDE.local.md`: no keys, tokens, passwords, mnemonics, xprv/xpub, real
addresses or user data. Every one is read verbatim into the model's context each session, and all
but `CLAUDE.local.md` are committed — a value written here lands in every transcript, and usually in
git history too. Point at where the value lives (`.env`, the secret manager) instead.

## Before finishing a task

1. `pnpm -r run compile` (or `--filter` the packages you touched)
2. lint and test for the packages you touched
3. if you changed a native module with a `*Core` type (`safely-crypto`, `safely-store-country`), run
   its Swift/Kotlin host tests (see `.claude/rules/mobile-app.md`)
4. if the change touched anything listed under "Keeping these instructions current", update
   `CLAUDE.md` / `.claude/rules/*` in the same PR

PRs target `master`; a non-draft PR triggers CI and the Claude review workflow
(`.github/workflows/claude-review.yml`; re-run it by commenting `@claude review`).
