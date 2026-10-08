# Secret Zeroization

Key material handled by `@safely/core` is cleared as soon as an operation ends, on both the success
and the failure path. **Zeroization in JavaScript is best effort**: it removes the copies this
package owns, shortening the window in which secrets are recoverable from process memory. It is not
a guarantee that no copy remains.

## What the code does

- Buffers a function allocates are overwritten with zeros in a `finally` block, so an exception
  cannot skip the cleanup.
- BIP32 private nodes are cleared with `HDKey.wipePrivateData()` once the derivation or signature
  they were needed for is complete.
- An account path is walked one child index at a time rather than through `HDKey.derive(path)`,
  which keeps the nodes it creates along the way to itself. Every node above the account one —
  the master node and each intermediate, such as `m/84'` and `m/84'/0'` — is wiped as soon as its
  child exists, because it grants at least as much as the account key does.
- A function clears only what it allocated. Values returned to a caller belong to that caller, which
  clears them in turn — `BtcBip39SeedProducer.getSeed` returns a seed that
  `BtcBip32NodeProducer.getPortfolioDerivation` clears.

## Known limits

- **Strings cannot be overwritten.** JavaScript strings are immutable, so a mnemonic held as
  `string[]` stays readable until the runtime reclaims it. Only bytes derived from it are cleared.
- **Garbage collection has no defined timing.** Unreachable objects are not overwritten when they
  become unreachable, and the runtime may have copied them while moving memory.
- **Copies made below this package are out of reach**, including those made by dependencies, native
  modules, and the platform's crypto primitives.
