---
paths:
  - '**/*.{ts,tsx}'
---

# Comments in TypeScript

A comment earns its place only by carrying something the code cannot: a hidden nuance, a pitfall, a
fact about the world outside this file. Anything a reader gets from the name, the signature or the
two lines below it is noise — and noise is what a reader learns to skip, which is how the one
comment that mattered gets skipped too.

## The bar

Write a comment only when all three hold:

1. The fact is not visible in the code, and cannot be made visible by a better name or a smaller
   function.
2. Not knowing it leads to a wrong change — a swapped order, a deleted guard, a "simplification"
   that breaks something invisible.
3. It is about this line or this block.

Explaining _what_ the code does: delete it. Explaining _why the design is this way_ — rationale,
alternatives considered, architecture, threat model: that is a `.claude/rules/*.md` or
`apps/*/doc/*.md` entry, not a comment.

## The format

- **One line.** Not "usually one line" — one. If it doesn't fit, it isn't a comment; it's a rules
  file entry.
- `//` or `/* … */`, whichever reads better in place.
- **No JSDoc.** No `/** */` over exports, types, interfaces, functions or classes, not even a
  one-liner. The name and the type are the documentation; a contract a type cannot express is
  expressed by a narrower type, not by prose above it.
- No file headers, no section banners, no `// ---- helpers ----`.

## Exempt — still one line, but never dropped for being obvious

- The reason next to a suppression (`eslint-disable*`, `@ts-expect-error`, `biome-ignore`): a
  suppression nobody can review is worse than the lint error.
- `TODO` / `FIXME`, with enough context to act on.
- A pointer to something outside the repo that cannot be reconstructed from the code: an upstream
  bug, a spec clause, a URL, `see .claude/rules/x.md`.
- Generated-file headers (`@generated`, "do not edit") and license headers.

## Two examples

Deleted — the name and the type already say all of it:

```ts
/** Created after the app is ready: the path depends on `userData`. */
export function createStore(userData: string): Store {}
```

Kept — the code reads like a lossy fallback and is the opposite:

```ts
/* fatal on purpose: a value that is not the UTF-8 we wrote is a corrupt item, not a lossy one */
```

Shell, YAML, native sources and config files are out of scope — no types there, so they may explain
themselves at greater length.
