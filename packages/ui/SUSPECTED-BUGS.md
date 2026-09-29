# Suspected bugs

Things that look like bugs but haven't been confirmed.  Add to the right section;  when one is confirmed and
fixed, or disproven, delete it (note a disproof in a line at the top if the reasoning is worth keeping).
`[V]` = checked against the code by hand.  Everything else is unverified.

Entry format:  `` - `path/to/file.ts` `symbol()`: what looks wrong, why, and how to prove it. ``

## 1. Behavior bugs

- `src/icons/Icons.ts` `get("zoom")`: returns nothing (reported by the docs-site icons page);  the Fomantic
  `zoom` alias may point at an FA6 name that no longer exists.  Prove:  `await Icons.get("zoom")` is `undefined`.

## 2. Accessibility

## 3. Styling / CSS

## 4. Types / API surface
