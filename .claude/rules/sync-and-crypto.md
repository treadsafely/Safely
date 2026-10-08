---
paths:
  - 'packages/sync/**/*.ts'
  - 'packages/slottree/**/*.ts'
  - 'packages/sync-storage/**/*.ts'
---

# Sync, state format and cryptography

This is the riskiest part of the repository: a mistake here doesn't break the current session, it
breaks cross-device compatibility or user privacy. The format and the protocol are specified —
change the spec and the code together, never the code alone.

- `packages/sync/doc/spec.md` — key hierarchy, offline/online account creation, device onboarding and
  reconnect, device list and its signatures, snapshots and proofs, server validation, SSE stream.
- `packages/sync/doc/threat-model.md` — what compromise of each key means, trust boundaries, known
  limitations (notably device revocation) and what is out of scope.
- `packages/slottree/docs/spec.md` — slot types, stamps (author + time), merge protocol;
  `implementation.md` and `versioning-examples.md` cover the implementation and versioning examples.

## Invariants

- The server only ever sees ciphertext and metadata. Nothing decrypted goes into API calls,
  analytics or logs; keys and secrets must not leak through error messages (`filterSensitiveData`).
- Cryptography comes from `@noble/*` and `@scure/*` via `catalog:` (hashes, curves, ciphers, bip32,
  bip39, btc-signer). Don't write your own primitives, key encodings or KDFs.
- On-device secret encryption goes through `ISecretEncryptor` (`packages/core/src/di`), i.e. the
  platform's secure storage — not JS-side constants.
- slottree's cbor encoding is deterministic: changing the encoding or field order changes merge
  results and hashes. That is a new format version, not an in-place edit.
- User-state schemas are versioned: `packages/sync-storage/src/v1` … `v5`, `actual-version.ts`. A new
  field or a different shape means a new version plus a migration plus migration tests
  (`packages/sync-storage/test/v<N>/`, through the public slottree API: build a snapshot with the
  previous version list, open it with `syncedStorageVersions`, check both directions); older
  versions must stay readable.
- **`src/v<N>` imports from `src/v<N-1>` only** — prefer its barrel (`'../../v<N-1>'`) and
  `structure.ts`; never `v<N-2>` or older. Each version re-exports everything it keeps, so the
  previous one always has what you need; skipping a version
  silently picks up a schema that a later version has already replaced (e.g. v1's `sPortfolioType`
  without `LEDGER`). Lint does not catch this.
- `packages/sync/src/api/generated/**` is the generated OpenAPI client (`apis/`, `models/`,
  `runtime.ts`). Hand edits get overwritten — change the API spec/generation instead, and keep
  wrappers and domain logic outside `generated/`.
- Sync lifecycle logic is the xstate machine in `packages/sync/src/sync-machine`; add behaviour as a
  state/transition, not as an external flag.

## Tests

Merge and versioning are covered by property-based tests (fast-check) in
`packages/slottree/test/properties/**`. After changing slottree or sync-storage, run the whole
package's suite (`pnpm --filter @safely/slottree run test`), not just the file you touched — the
invariants cross-check each other.
