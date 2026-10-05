---
paths:
  - '**/test/**/*.{ts,tsx}'
  - '**/*.{test,spec}.{ts,tsx}'
---

# Tests

vitest is the runner in every package. Tests are **not** colocated with source: they live in
`<pkg>/test/**` and mirror the `src/` structure (`packages/core/test/blockchain-api/btc/…`). Rare
exceptions such as `packages/core/src/entities/auth-cert/auth-cert.spec.ts` are not a model for new
code.

The extension follows the package's convention, not personal taste:

- `packages/slottree`, `packages/ux` — `*.spec.ts` / `*.spec.tsx`
- `packages/core`, `apps/mobile` — `*.test.ts`

## Running

```
pnpm --filter @safely/core run test        # whole package
pnpm --filter @safely/slottree run test
pnpm --filter mobile run test              # JS tests only (test:js)
pnpm --filter mobile run test:all          # plus swift test and ./gradlew test
```

A single file: `pnpm --filter <pkg> exec vitest run <path>`. CI runs `test` only for changed
packages and their dependents, and for everything when root-level files change.

## What is tested how

- Merge, versioning and mutation invariants of slottree are property-based with `fast-check`
  (`packages/slottree/test/properties/**`). A new invariant of the state format belongs there, not in
  a single example case.
- React code in `packages/ux` uses `@testing-library/react` on `happy-dom`.
- xstate machines are tested through machine transitions (`packages/ux/test/forms/**`), not through UI.
- Mobile JS tests only have the `@mobile/shared` alias (`apps/mobile/vitest.config.mts`) — test shared
  logic there, not screens.

`no-console` is off in tests, but logs are not a substitute for assertions. Tests need no network:
external APIs and the sync server are mocked.
