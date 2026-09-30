# Suspected bugs

Things that look like bugs but haven't been confirmed.  Add to the right section;  when one is confirmed and
fixed, or disproven, delete it (note a disproof in a line at the top if the reasoning is worth keeping).
`[V]` = checked against the code by hand.  Everything else is unverified.

Disproven:  `Icons.get("zoom")` isn't missing -- it is Font Awesome's `zoom` BRAND logo (a documented clash;  Fomantic's magnifier
is `<html ui-icon-names="fomantic">` or `magnifying-glass-plus`), pinned in `Icons.test.ts`.  (2026-09-30:  `Icons` is gone;
with icon packs `zoom` is in `fa7-brands`, and the `fomantic` pack gives the magnifier.)

Disproven:  `--ui-comments-minimal` (`comment.css`) isn't a misnamed private switch -- it is a documented OWNER token
(`PART_OWNER_TOKENS.commentsMinimal`, `parts.css` "Owner tokens"), public like `--ui-card-layout`, since `parts.css` reads it.

Entry format:  `` - `path/to/file.ts` `symbol()`: what looks wrong, why, and how to prove it. ``

## 1. Behavior bugs

- `src/elements/UIElement.tsx` `mount()`:  errors thrown in a `createEffect` COMPUTE set up there (e.g.
  `hostStates()`) never reach the fork's error boundary -- logged, but no `:state(errored)` and no fallback.  The
  table family switched its class-mirror effect to `createRenderEffect` to get the fallback (`table.test.tsx`).
- `src/components/checkbox/UIRadio.tsx` `keyDown()` + `RadioGroup.step()`:  neither checks `readonly`, so arrow keys
  probably change a read-only radio group (clicks are cancelled, arrows aren't).  Prove:  a `readonly` group, focus
  the chosen radio, press Arrow Down.  (Docs pass, 2026-09-30.)
- `src/components/dropdown/SlottedItems.ts` ~line 88:  reads only `selected`, so `<ui-item active>` inside a dropdown
  isn't taken as the value, though the item vocabulary calls `active` a general alias.  The item docs page says the
  alias works in lists and menus only.  (Docs pass, 2026-09-30.)
- `src/components/search/UISearch.tsx` results rendering:  dev Solid logs `STRICT_READ_UNTRACKED ... read directly in
  <For>` (path `<Show> › div.children › <Show> › <Show> › <Show> › <For>`) when a search renders its results open
  from the start (`open value="a"`, a `category` search too), so some result data may not update reactively.  Prove:
  load `/components/search/` under `yarn site:dev` and watch the console.  (Docs pass, 2026-09-30.)
- `src/components/search/search.vocabulary.en.ts` `parts`:  the root `<div class="ui search">`, which declares every
  `--ui-search-*` token, has no part name, so tokens read at the root can't be themed from the page (the docs use
  `::part(input)` / `::part(results)`, which cover the tokens used there).  (Docs pass, 2026-09-30.)

- `src/elements/NativeFallback.ts` `classes()`:  reads host ATTRIBUTES only, ignoring a vocabulary `default` on a
  class-bearing kind, so a fallback drops a default class the element emits (`<ui-flyout>`'s `position` default
  `left`:  `FlyoutFallback` adds it back itself;  `<ui-sidebar>`'s fallback omits `left` too).  Prove:  render a
  fallback for any vocabulary with `default` on a `color` / `keyOnly` attribute.  (Transition / dimmer / flyout /
  sidebar / shape pass, 2026-09-30.)
- `src/components/modal/modal.test.tsx` "waits for the transition before ui-show / ui-hide":
  `document.querySelector("style")?.remove()` removes the FIRST `<style>` in the document -- possibly one of the
  test page's own, not the test's speed-up rule -- which may leak into later tests.  A copy of it made the flyout's
  later clicks time out until the flyout test added its own slower rule instead.  (2026-09-30.)

## 2. Accessibility
- `src/components/breadcrumb/examples/elements/states.html` line 5:  this `<ui-breadcrumb>` has no `aria-label`, so on
  a page with other breadcrumbs two `<nav>` landmarks share the default name.  The docs page adds one.  (Docs pass,
  2026-09-30.)

## 3. Styling / CSS

- `src/components/items/items.css` / `card.css` / `grid.css`:  a group host that is a size container
  (`container-type: inline-size`) seems to keep its root's top margin from collapsing with the heading above it, so
  element markup shows a bigger gap than the static class grammar (seen in the Items examples' screenshots).
  Prove:  compare `<h4>` bottom to the first item's top in both columns of `yarn dev`.
- `src/components/items/items.css` mobile stacking:  Fomantic's `.ui.items > .item > .image { width: auto }` also
  sizes a static `ui tiny image` to its NATURAL width (ported faithfully);  a `<ui-image size="tiny">` element keeps
  80px.  Static and element markup differ below 768px.

- `src/components/list/list.css` + `parts.css`:  a slotted `<img>` / `<ui-image>` followed by `<ui-content>` in a
  list item puts the content BELOW the image:  `parts.css` makes content after a first child a table cell, but
  the image is an inline block.  The `image` shorthand works (`--ui-item-media: image`);  a clean fix needs an
  image owner-display token in `image.css`.
- `test/sheets.ts` `Sheets.classPhrases()`:  probes `"equal"` for EVERY `width` attribute, so a width without
  `canEqual` logs a `ClassBuilder` dev warning in css tests.  Harmless noise.
- [V] Every family's `<name>.css`:  the public `--ui-<family>-*` tokens are DECLARED on the shadow root's box
  (`.ui.button { --ui-button-radius: ... }`, `button.css` ~line 83;  same in checkbox, input, form, message, grid,
  image, text, flag, loader, placeholder, list, menu, popup, modal), so a value set on the host or an ancestor never
  reaches the box:  the inner declaration beats the inherited one.  Checked in the browser:  `--ui-button-radius:
  20px` on `<ui-button>` or its parent leaves the inner `<button>` at 6px;  `ui-button::part(button) { ... }` works.
  The existing docs pages (`button.mdx` "Theming", `dropdown.mdx`, and `label` / `segment` / `container` / `divider`
  if they say "on the element") promise host / ancestor theming;  the new pages (2026-09-30) teach `::part()`.
  Either the sheets should declare defaults so a host value wins (e.g. `:host` in a low layer, or `var(--x, default)`
  at the use site), or the docs and `docs/theming.md` should say `::part()`.  Only the GLOBAL tokens (`--ui-radius`)
  inherit as documented.
- [V] `src/components/table/table.css` ~line 977:  every `<ui-table>` narrower than 768px of its OWN width stacks unless
  `unstackable` (Fomantic's default is by viewport).  The docs site's example column is ~655px at every window
  width, so every table example on `/components/table/` shows the stacked mobile layout (a `site-note` on the page
  says so).  Maybe only `stackable` tables should follow the host's width, or the default should stay viewport-based.
- `src/components/grid/examples/elements/responsive.html` (Doubling, Reversed, "Width per device") and
  `src/components/image/examples/elements/variations.html` (Size):  fixed 850 / 1000 / 1200px wrappers overflow a
  normal page column;  the docs pages clamp them (`max-width` + `resize`) or trim sizes.
- `src/styles/native.css` ~lines 182-221:  `data-variation="visible"` shows the CSS-only tooltip but the full-size
  transform only applies on `:hover` / `:focus-visible`, so a `visible` tooltip stays at 80% scale.  Unverified.
- `src/components/popup/examples/elements/types.html`:  `data-tooltip` on a `<ui-button>` (a focus-delegating host)
  may never match `:focus-visible` on the host, so the CSS tooltip may not show on keyboard focus.  Unverified.

- [V] `src/components/segment/segment.css` + `UISegment.tsx`:  `<ui-segments inverted>` doesn't invert its members:  a
  member `<ui-segment>` stays light and white (static `.ui.inverted.segments > .ui.segment` too:  the member root keeps
  the light scheme, so `--ui-segment-inverted-background` resolves white).  A fix needs the group to hand a private
  token down AND `UISegment`'s inline `--ui-inverted: 0` on its root (which beats the sheet) to follow it.  Checked
  in a browser probe, 2026-09-30.
- [V] `src/components/label/label.css`:  an un-coloured `<ui-label>` inside a `ui-red` wrapper (or any ancestor setting
  `--ui-color`) paints red:  nothing resets the colour tokens, by design for `<ui-labels color>`.  Statistic, menu and
  segment reset them (host / slot);  label probably wants the statistic's pattern (host reset + a private group
  token).  Checked in a browser probe, 2026-09-30.

## 4. Types / API surface

- `src/components/emoji/emoji.vocabulary.en.ts:38`:  says "`Thumbs Up` works too", but that becomes `thumbs_up`,
  which isn't in the data (`thumbsup` is), so it draws nothing.  `emoji.test.tsx:30` only tests the spelling
  conversion.  Fix the doc or add an alias.
- `src/components/emoji/emoji.css:59` `--ui-emoji-size-medium: 3`:  never used by the element (`medium` emits no
  class), only by hand-written class grammar;  listed as a token anyway.

- `src/runtime/runtime.types.ts` `OverlayEntry`:  its docstring says `closeOnOutsideClick` defaults to `false` for
  `modal` / `toast`, but `Overlays.open()` defaults it to `true` for every kind except `toast` (and `docs/runtime.md`
  agrees with the code).  `<ui-modal>` sets it explicitly, so nothing depends on it yet;  one of them is wrong.
- `src/components/form/form.css` lines 93-94:  `--ui-form-equal-width` and `--ui-form-unstackable` are internal 0/1
  switches but carry the public `--ui-form-` prefix, so the docs' generated token table lists them as public.
- `src/components/checkbox/checkbox.vocabulary.en.ts` `<ui-radio>` `type`:  `kind: "color"` for a look (`slider` /
  `toggle`), so the docs' API table labels it a colour.  Probably wants `valueAndKey` / `enum`.
- `src/components/input/input.vocabulary.en.ts` ~line 95:  `label` is described as "Label text", but with
  `labeled="corner"` / `"left corner"` it's read as an ICON name (`UIInput.cornerGlyph`).
- `src/components/message/examples/elements/content.html` line 15:  the "List" example says "Only the header, no
  content block" but has no header.
- `site/src/content/components/button.mdx` / `dropdown.mdx` "Framework usage":  the Solid 2 snippets use
  `on:ui-toggle` / `on:ui-change`;  AGENTS.md says Solid 2 has no `on:` namespace (a `ref` + `addEventListener`,
  as `tools/frameworks/solid/app.tsx`).  The new pages use the `ref` pattern.
