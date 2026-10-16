---
paths:
  - 'apps/mobile/modules/safely-masked-input/**'
  - 'apps/mobile/src/screens/SendAssetModal/**'
  - 'packages/ux/src/features/forms/send/**'
  - 'packages/core/src/utils/format/**'
---

# Amount input

An amount reaches the send form through three channels, each with its own parser. The rule is
the less trusted the source, the **stricter** the parsing — not the more forgiving.

| Channel | Parser |
| --- | --- |
| Keyboard typing | `MaskEngine` (native, Kotlin + Swift, in `safely-masked-input`) on mobile, `sanitizeAmount` (`packages/web-ui/src/features/send/amount-mask.ts`) on the web targets |
| Clipboard paste | `PastedAmountNormalizer` via `NumberFormatter.normalizePastedInput` |
| QR / deeplink (BIP21) | `NumberFormatter.normalizeCanonicalInput` |

The allowed number of fraction digits comes from `resolveAmountDecimals(inputType, asset)` only
(8 for BTC, 2 for fiat) — never compute it inline. Before that helper existed the mask and the
form disagreed, and fiat mode accepted 8 digits while the form kept 2.

## Typing — `MaskEngine`, and `sanitizeAmount` on the web

Both implement the rules below; the web one is a plain function because a DOM field has none of the
native pathologies (no suffix inside the editable text, no echo race), and it drops the segments and
the character mapping the native view needs for styling and the caret. What the web field does not
inherit is display: it shows exactly what the form holds, so the caret only has to survive dropped
characters (`resolveCaret`).

Runs per character on the live buffer, so it cannot reject input as a whole: it rebuilds the
value from whatever is in the field.

- a separator is `.`, `,` or the locale separator (`decimalSeparator`); the first one seen becomes the decimal point;
- a repeat of the **same** separator character is ignored, a **different** one is a grouping/decimal conflict and clears the value;
- a character typed after `decimals` is exhausted is ignored;
- anything unrecognised (letters, spaces, minus, `e`) is dropped silently;
- leading zeros collapse, a leading separator yields `0.`;
- the emitted and rendered separator is always `decimalSeparator`, whichever key was pressed;
- grouping is supported neither on input nor on display — that is why typing `1,000` yields `1.000`, and why **paste must never go through `MaskEngine`**.

## Paste — `PastedAmountNormalizer`

Parses **structurally**, not by device locale: it looks at the position of the last separator,
how many there are, and the group sizes. Anything ambiguous is rejected with
`UNRECOGNIZED_AMOUNT` — never guessed.

- digits, `.`, `,` and group spaces (regular, NBSP, NNBSP, thin, apostrophe) are allowed; anything else, including a sign, rejects the whole string;
- two different separators: the last is decimal, the first is grouping, and group sizes are validated (western 1–3 then 3s, Indian 1–2 then 2s then 3);
- a single separator seen twice or more is treated as grouping;
- a single separator with exactly three digits after it and a short integer part is rejected (`1,234` is indistinguishable from `1234` and `1.234`);
- a value more precise than `maxDecimals` is rejected, not truncated (otherwise `0.00001` in USD would silently become `0.00`);
- a currency code is not recognised: `100 USD` is always rejected, even when it matches the field's suffix;
- the result is canonical (`.`); `NumberFormatter` converts it to the locale separator.

## QR — `normalizeCanonicalInput`

BIP21 defines `amount` as a canonical decimal in BTC; the locale plays no part.

- only `^\d+(\.\d+)?$` after `trim` is accepted — a comma, grouping, an edge separator, a sign, an exponent or an empty string are rejected;
- leading zeros are preserved; the form normalises them later.

## Boundary cases worth memorising

These are the ones that look wrong until you check them — full tables live in
`amount-input-formats.md`.

| Channel | Input | Result | Why |
| --- | --- | --- | --- |
| typing | `1.5` then `,` | *(cleared)* | different separator = conflict |
| typing | `1.5` then `.` | `1.5` | same separator = ignored |
| typing | `1,000` | `1.000` | no grouping when typing |
| paste | `1,234` | reject | three digits after a single separator is ambiguous |
| paste | `1,2345` | `1.2345` | four digits is not a group size |
| paste | `1,23` | `1.23` | two digits is not a group size |
| paste | `1,000,000` | `1000000` | two separators prove grouping |
| paste | `1'000.50` | `1000.50` | apostrophe is a Swiss group separator |
| paste | `0.123` | `0.123` at 8 decimals, reject at 2 | precision must fit the field |
| paste | `100 USD` | reject | currency code is not stripped |
| QR | `1.234` | `1.234` | BIP21 is unambiguous, unlike the same paste |
| QR | `1,000.50` | reject | a valid generator never emits grouping |

## Native input invariants

These break easily — check them on any change inside `safely-masked-input`.

- **Echo race.** The native side numbers its edits (`userEditCount`), sends the number out with `onChangeText` as `eventCount`, and gets it back inside the Record prop `value` = `{ text, eventCount }`; a write carrying a stale number is discarded. The number and the value must travel in **one** prop — Expo applies props one at a time, order not guaranteed. Deciding staleness on the JS side does not work: the decision is made during render while the write lands one or two frames later. Debouncing does not fix it either.
- **The suffix lives inside the editable text**, which is the root of a whole class of bugs: `stripSuffix` would cut a matching tail off pasted text (hence pasted content is rebuilt from the `beforeTextChanged` snapshot, not read out of the buffer), the selection clamp must trim a selection rather than collapse it, and iOS `cut` does not copy to the pasteboard on its own (it needs an override, because `shouldChangeCharactersIn` always returns `false`).
- **`setRawInputType`, never `inputType`** on Android: the latter installs `DigitsKeyListener`, which strips a "foreign" separator before either `InputFilter` or `TextWatcher` sees it.
- Mask logic stays platform-free (`MaskEngine.kt` / `MaskEngine.swift`) so it can be tested on the host: `android/host-test` (`./gradlew test`) and `ios` (`swift test`), both wired into `ci.yml`.
