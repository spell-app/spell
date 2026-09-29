# Suspected bugs

Things that look like bugs but haven't been confirmed.  Add to the right section;  when one is confirmed and
fixed, or disproven, delete it (note a disproof in a line at the top if the reasoning is worth keeping).
`[V]` = checked against the code by hand.  Everything else is unverified.

Entry format:  `` - `path/to/file.ts` `symbol()`: what looks wrong, why, and how to prove it. ``

## 1. Behavior bugs

- `src/icons/Icons.ts` `get("zoom")`: returns nothing (reported by the docs-site icons page);  the Fomantic
  `zoom` alias may point at an FA6 name that no longer exists.  Prove:  `await Icons.get("zoom")` is `undefined`.

- `src/components/icon/icon.vocabulary.en.ts:40` attribute `style`:  a property named `style` replaces the host's
  `style` object (CSSStyleDeclaration).  Both spikes had to rename the PROPERTY (`iconStyle`);  the vocabulary
  should declare `property: "iconStyle"` (or rename the attribute to `variant`).  [V] Lit batch-1 report.
- `src/components/divider/divider.vocabulary.en.ts:27` + `divider.css:33` attribute `hidden`:  the global HTML
  `hidden` attribute hides the whole host, so `<ui-divider hidden>` disappears instead of keeping its spacing.
  Needs a different attribute name (`invisible`?) or the host CSS must override `[hidden]`.  [V] Lit batch-1.
- `src/components/label/label.vocabulary.en.ts:28` `image`:  declared as a boolean (`keyOnly`) but documented as
  taking a URL;  the element has to read the raw attribute.  Should be `kind: "string"` with presence meaning
  "image label" and a value meaning the `src`.  [V] Lit batch-1.
- `src/components/parts/parts.vocabulary.en.ts:336` `ui-detail` has no `href`, yet `label.css:433` styles a link
  inside a detail, which a shadow sheet can't reach when the link is slotted.  Either give `ui-detail` an
  `href` (renders `<a class="detail">`) or use `::slotted(a)`.  [V] Lit batch-1.

## 2. Accessibility

## 3. Styling / CSS

- `src/components/segment/segment.css:477` and `src/components/parts/parts.css:1082`:  `--ui-inverted` is
  never declared with a default (`0`) on the segment root, so a plain segment inside an inverted one inherits
  the dark scheme.  Decide whether nested plain segments should reset (`--ui-inverted: 0; color-scheme: light`)
  -- Fomantic resets to light.  [V] Lit batch-1.
- `src/components/segment/segment.css:367-375`:  the nested-group rules (`.ui.segments > .ui.segments`) have no
  shadow-DOM equivalent, so a `ui-segments` inside `ui-segments` keeps its own box.  Needs `::slotted(ui-segments)`
  on the host side or an owner token.  [V] Lit batch-1.

## 4. Types / API surface
