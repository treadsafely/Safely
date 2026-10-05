---
paths:
  - 'packages/ux/src/**/*.{ts,tsx}'
  - 'apps/mobile/src/**/*.{ts,tsx}'
---

# FSD layers in `@safely/ux` and `apps/mobile`

Boundaries are enforced by `eslint-plugin-boundaries` (`eslint.config.js`, `boundaries/element-types`).
An "upward" import is a build error, not a style nit.

`packages/ux/src`: `shared` → `entities` → `features`
`apps/mobile/src`: `shared` → `entities` → `features` → `screens` → `app`

A layer may only import layers to its left. `shared` knows nothing about `entities`; `entities`
knows nothing about `features`; in mobile, `features` knows nothing about `screens` or `app`, and so on.

## What goes where

- `shared` — reusable with no domain meaning: UI primitives, formatting, contexts and providers,
  query-client wrappers, i18n, logger, storage adapters.
- `entities` — one domain entity: its queries/mutations, cache keys, selectors, and small
  presentational components for that entity (`account`, `asset`, `portfolio`, `contact`, …).
- `features` — a user scenario that composes entities (`blockchain-send`, `exchange`, `ledger`,
  `receive`, `onboarding`, …).
- `apps/mobile/src/screens` — a navigation screen: a directory with `<Name>Screen.tsx` /
  `<Name>Modal.tsx`. A screen composes features and holds no domain logic of its own.
- `apps/mobile/src/app` — entry point: navigation, providers, error boundary, storage and
  tanstack-query bootstrapping.

Put new code in the lowest layer that fits. If a feature needs something from `screens`, the logic
should move down into `features` — don't move the import up.

## Layer public API

Every layer and every module inside it is re-exported through `index.ts` (`packages/ux/src/index.ts`
→ `shared`/`entities`/`features` → modules). Externally the `@safely/ux` package exposes a single
barrel plus `@safely/ux/assets/icons/*`. Inside the package, import a module through its `index.ts`,
not through an internal file.

Mobile uses the `tsconfig.json` aliases for internal imports: `@mobile/shared`, `@mobile/entities`,
`@mobile/features`, `@mobile/screens`, `@mobile/app` (and their `/*` variants). Relative paths are
for imports within a single module only.

## State and data

- Server data uses tanstack-query. Cache keys are declared with `defineQueryKeys` from
  `packages/ux/src/shared/query-core/query-key-factory`, usually in the module's `keys.ts`; never
  write literal key arrays. These calls run at module import time — that's why import cycles are
  hard-banned.
- Local client state is a zustand store inside its own module.
- The account store (`entities/account/sync-storage`) is filled inside the accounts query's
  `queryFn`, never in an effect: an account the list query has published must already have its
  store entry, or a gated child reads an empty portfolio list and throws (SAF-770). The provider
  effect only subscribes to changes and re-reads the snapshot after subscribing.
- Multi-step flows and forms (send, exchange, onboarding) are xstate machines; the machine lives next
  to its scenario (`packages/ux/src/features/forms/**`).
- Query-cache persistence goes through `query-core/persistence.ts` and the managers in
  `apps/mobile/src/app/tanstack-query-managers.ts` — don't hand-roll a cache.
