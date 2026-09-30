# Suspected bugs

Things that look like bugs but haven't been confirmed.  Add to the right section;  when one is confirmed and
fixed, or disproven, delete it (note a disproof in a line at the top if the reasoning is worth keeping).
`[V]` = checked against the code by hand.  Everything else is unverified.

Disproven:  `Icons.get("zoom")` isn't missing -- it is Font Awesome's `zoom` BRAND logo (a documented clash;  Fomantic's magnifier
is `<html ui-icon-names="fomantic">` or `magnifying-glass-plus`), pinned in `Icons.test.ts`.

Entry format:  `` - `path/to/file.ts` `symbol()`: what looks wrong, why, and how to prove it. ``

## 1. Behavior bugs

- [V] `packages/solid-element/src/owner.ts` `lookupOwner()`:  a slotted child adopts the Solid owner stamped on
  the `<slot>` it is ASSIGNED to, so its whole reactive root is a child of whatever branch rendered that slot.  A
  component that re-creates its slot (`<Show>` / `<Switch>` / `<Dynamic>` switching root elements) DISPOSES every
  slotted component's root:  they stop updating, silently, and keep their last DOM.  Only reproduces when the
  runtime is already loaded (a synchronous first render, i.e. not the first test of a file).  Proof:  revert
  `UIItem.render()`'s single slot to `<slot />` inside the `<Dynamic>`, run `item.test.tsx` "keeps elements inside
  it alive when its box changes tag".  Worked around (one slot per render, moved between branches) in `UIMenu`,
  `UIItem`, `UIList`;  other families whose slot lives in a `<Show>` branch (`UILabel` statistic / standalone,
  `UIHeader` link / plain ...) likely have it.
- `src/elements/UIElement.tsx` `mount()`:  errors thrown in a `createEffect` COMPUTE set up there (e.g.
  `hostStates()`) never reach the fork's error boundary -- logged, but no `:state(errored)` and no fallback.  The
  table family switched its class-mirror effect to `createRenderEffect` to get the fallback (`table.test.tsx`).
- `src/runtime/Styles.ts` `refreshPage()`:  once `ui.css` is linked (`--ui-page-sheet: linked`) NO page sheets are
  pushed at all, including component page sheets `ui.css` doesn't contain (`table`, `scroll-lock`);  it should skip
  only the foundation / `typography` / `native` ones.  A page linking `ui.css` loses `<ui-table>`'s light-DOM look.
- `src/elements/UIElement.tsx` `define()`:  a class whose vocabulary tag has another prefix (`x-item-owner`)
  called with no `tag` is registered under the DEFAULT prefix instead (`ui-item-owner`, via
  `Vocabulary.define(undefined)`), with no warning.  Pass the tag explicitly (`StubOwner`, `item.test.tsx`).

## 2. Accessibility

## 3. Styling / CSS

- `src/components/list/list.css` + `parts.css`:  a slotted `<img>` / `<ui-image>` followed by `<ui-content>` in a
  list item puts the content BELOW the image:  `parts.css` makes content after a first child a table cell, but
  the image is an inline block.  The `image` shorthand works (`--ui-item-media: image`);  a clean fix needs an
  image owner-display token in `image.css`.
- `test/sheets.ts` `Sheets.classPhrases()`:  probes `"equal"` for EVERY `width` attribute, so a width without
  `canEqual` logs a `ClassBuilder` dev warning in css tests.  Harmless noise.

## 4. Types / API surface
