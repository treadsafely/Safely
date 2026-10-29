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

## A class's runtime name is explicit, never `constructor.name`

Any name a human or a log reads — a logger child tag, a `toJSON` id, an error label — is passed in
as a string, never read from `this.constructor.name`. Production bundles are minified (esbuild on
desktop, R8 on Android), so `constructor.name` comes out mangled (`t`, `e`) at runtime, and the log
or id it feeds is then unreadable with nothing failing in dev. `ApiClient` is the pattern: the
subclass hands its name to `super(apiName, …)` and the base uses `this.apiName` for `logger.child`
and `toJSON`. Desktop's `keepNames` esbuild flag only keeps names in stack traces — it is not a
licence to rely on `constructor.name` in logic.

## File and directory names

Nothing in lint or CI reads a filename, so the case is on review:

- **PascalCase** for a component and for every file that exists only to serve it —
  `TableCell.tsx`, `TableCell.styles.ts`, `Screen.context.ts`, `ConfirmationScreen.types.ts`. A
  module whose single export is a class or a React context takes the same form
  (`DmkLoggerAdapter.ts`, `BannerContext.ts`).
- **camelCase** for a module named after the hook it exports: `useBtcHistoryGroups.ts`,
  `useBtcTransactionDetails.ts`. One hook per file — once a second export appears the name no longer
  describes the file, and it becomes kebab-case.
- **kebab-case** for everything else: pure logic, builders, view models, schemas, constants
  (`transaction-details-view.ts`, `btc-transaction-status.ts`, `date-groups.ts`,
  `btc-derivation-path.ts`), the Panda recipes (`app-layout.recipe.ts`), and the fixed module names
  `index.ts`, `keys.ts`, `types.ts`, `api.ts`.
- Directories split the same way: a component owns a PascalCase directory (`shared/ui/TableCell/`,
  `screens/BtcTransactionScreen/`), a slice a kebab-case one (`features/transaction-details/`,
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

## No chained ternaries

A ternary carries one `?`. When a value depends on more than one condition, don't chain them
(`a ? x : b ? y : z`) — that reads as a puzzle and the next case gets bolted on as a third `?`.
Use instead:

- **a config structure** when the choice is a lookup — a `Record`/object keyed by the discriminant
  (`TYPE_BADGES[portfolio.type]`, `NETWORK_BADGES` behind `resolvePortfolioNetworkBadge`), so adding
  a case is adding an entry;
- **a named variable or a small function with early returns** when the conditions are not a single
  key (`byQtyDescending` in `flame-estimator.ts`, `resolvePortfolioNetworkBadge`).

In JSX the same applies: a chain of `cond ? <A/> : other ? <B/> : <C/>` becomes a lookup or a child
component that returns early. Existing chains are not swept; don't add new ones.

## A path that must not run throws, never returns stand-in data

When a dependency has to be supplied but the caller guarantees it is never used — a callback a
preview never calls, a port a read-only path never reaches — implement it with `throw new Error(…)`
naming why it is unreachable, not with a mock value (a random key, an empty list, `0`). A stand-in
value turns the day the guarantee breaks into silently wrong data; a throw turns it into an error at
the call that broke it. If the path *is* reached, it is not a stand-in: give it a real
implementation, or change the type so the dependency is not needed there at all.

## Equality

`eqeqeq: smart` plus the local rule `iseq/no-strict-eq-when-isEq` (`eslint-rules/isEqPlugin.js`):
if a type exposes `isEq`/`isEqual`/`eq`/`equals`, compare with that method instead of `===`/`!==` —
otherwise you compare references and the check silently never holds. This matters for domain value
objects (addresses, amounts, ids).
