---
paths:
  - '**/*.{ts,tsx}'
---

# TypeScript style

Formatting is prettier (`.prettierrc.json`) and the rest of the style is eslint `error`s that block
CI — run lint instead of memorising them. What follows is only what an error message won't tell you.

## Domain logic is written as classes

Business logic — especially in `packages/core` — is class-based, and new code follows that. When
several functions in one domain area keep taking the same arguments, those repeated arguments belong
in the constructor and the functions become methods:

```ts
// instead of
export function estimateFee(xpub: Xpub, network: Network, utxos: Utxo[], rate: FeeRate) {}
export function buildTransaction(xpub: Xpub, network: Network, utxos: Utxo[], to: Address) {}

// prefer
export class BtcTransactionBuilder {
    public constructor(
        private readonly xpub: Xpub,
        private readonly network: Network,
        private readonly utxos: Utxo[]
    ) {}

    public estimateFee(rate: FeeRate) {}
    public buildTransaction(to: Address) {}
}
```

Existing examples to model on: `NumberFormatter`, `LedgerController`, `TreeStorage`, and the
`ApiClient` subclasses (`BtcApi`, `PriceApi`, …).

A lone function stays a function — don't wrap a single operation in a class just to have one. Pure
helpers without shared state stay functions too.

## File and directory names

Nothing in lint or CI reads a filename, so the case is on review:

- **PascalCase** for a component and for every file that exists only to serve it —
  `TableCell.tsx`, `TableCell.styles.ts`, `Screen.context.ts`, `ConfirmationScreen.types.ts`. A
  module whose single export is a class or a React context takes the same form
  (`DmkLoggerAdapter.ts`, `BannerContext.ts`).
- **camelCase** for a module named after the hook it exports: `useHistoryGroups.ts`,
  `useTransactionDetails.ts`. One hook per file — once a second export appears the name no longer
  describes the file, and it becomes kebab-case.
- **kebab-case** for everything else: pure logic, builders, view models, schemas, constants
  (`transaction-details-view.ts`, `btc-transaction-status.ts`, `date-groups.ts`,
  `btc-derivation-path.ts`), the Panda recipes (`app-layout.recipe.ts`), and the fixed module names
  `index.ts`, `keys.ts`, `types.ts`, `api.ts`.
- Directories split the same way: a component owns a PascalCase directory (`shared/ui/TableCell/`,
  `screens/TransactionScreen/`), a slice a kebab-case one (`features/transaction-details/`,
  `features/add-wallet/`).

`packages/core` prefixes an interface module with `I-` and keeps the rest kebab (`I-btc-wallet.ts`);
that names the interface, it does not exempt the file from the rule.

About two dozen files still carry a camelCase name that is not a hook (`sentAmount.ts`,
`resolveSource.ts`, `fuzzySearch.ts`, …). Rename one when you are already editing it — not as a
sweep, and never together with a behaviour change, where the diff hides the move.

## Types

`any` is banned, and unknown input (API responses, storage contents) is `unknown` parsed by a zod
schema — zod is available in every package through `catalog:`. The ban is a lint error; reaching for
zod rather than a cast is not.

## Equality

`eqeqeq: smart` plus the local rule `iseq/no-strict-eq-when-isEq` (`eslint-rules/isEqPlugin.js`):
if a type exposes `isEq`/`isEqual`/`eq`/`equals`, compare with that method instead of `===`/`!==` —
otherwise you compare references and the check silently never holds. This matters for domain value
objects (addresses, amounts, ids).
