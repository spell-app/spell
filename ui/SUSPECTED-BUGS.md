# Suspected bugs

Things that look like bugs but haven't been confirmed.  Add to the right section;  when one is confirmed and
fixed, or disproven, delete it (note a disproof in a line at the top if the reasoning is worth keeping).
`[V]` = checked against the code by hand.  Everything else is unverified.

Entry format:  `` - `path/to/file.ts` `symbol()`: what looks wrong, why, and how to prove it. ``

## 1. Behavior bugs

- `src/icons/Icons.ts` `resolve()`: the Fomantic alias map is applied even when a `style` is given, so
  `Icons.get("apple", "brands")` resolves to `apple-whole` (solid) and returns nothing;  `"zoom"` also returns
  nothing.  Found by the docs-site icons page.  Prove:  `await new Icons().get("apple", "brands")` is `undefined`.
  Fix shape:  look the name up in the requested style first, apply Fomantic aliases only when that misses.

## 2. Accessibility

## 3. Styling / CSS

## 4. Types / API surface
