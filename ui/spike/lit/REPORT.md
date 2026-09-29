# Milestone 0 — Lit spike report

`ui-button` (+ `ui-buttons`, `ui-or`) and `ui-dropdown` (+ `ui-item`) on **Lit 3.3.3** with **standard decorators**, on the shared foundation. Measured 2026-09-29: Node 22.17, Vite 8.3.1, Vitest 5.0.2, chromium 1243.

How to reproduce, from `spike/lit/`:
- `yarn test`, `yarn build`, `yarn ts`
- `yarn measure`: bundle numbers, written to `measure-results.json`
- `yarn smoke`: framework, translation, duplicate-Lit and perf pages in headless chromium, written to `smoke-results.json`. Needs network for esm.sh / unpkg.
- `yarn ssr`
- `yarn dev`, then open `/demo/index.html`

Results: `yarn test` 57 tests pass (button 27, dropdown 26, translation 4); `yarn build`, `yarn ts`, `yarn ssr`, `yarn smoke` pass.

## (a) Bundle

Setup: lib entries `button` and `dropdown`, Lit bundled in, `sideEffects` declared in `package.json`.
- "As emitted" is Vite's lib-mode ES output, which keeps whitespace.
- "Min+gz" re-minifies each chunk with esbuild, which is closer to what an app ships. Gzip level 9.

| Chunk | Raw | Gzip (as emitted) | Min+gz | Loaded |
|---|--:|--:|--:|---|
| `button.js` (entry: `UIButton`, `UIButtons`, `UIOr` + vocabularies) | 16.1 KB | 4.3 KB | 3.7 KB | eager |
| `dropdown.js` (entry: `UIDropdown`, `UIItem`, `FormElement`, `Validator`, `MenuOptions`, `dropdown.css`) | 84.4 KB | 22.1 KB | 20.6 KB | eager |
| `button-*.js` (shared: Lit, `UIElement`, `$/vocabulary`, `ClassBuilder`, `Icons` + alias maps, `button.css`, runtime loader) | 152.0 KB | 40.1 KB | 37.7 KB | eager |
| `UIRuntime-*.js` | 171.4 KB | 28.1 KB | 26.9 KB | lazy (`UI.load()`) |
| `solid-*.js` × 19 (icon data) | 8.7–54 KB each | 3.0–17.2 KB each | | lazy |
| `regular-*.js` (icon data) | 106.7 KB | 30.6 KB | | lazy |
| `brands-*.js` (icon data) | 575.5 KB | 224.3 KB | | lazy |
| `search-*.js` (icon search terms) | 131.4 KB | 35.4 KB | | lazy, never loaded |

Cost excluding the `UIRuntime` chunk and icon data. The static icon alias maps (47.4 KB min, 14.1 KB min+gz) are subtracted.

| | Min+gz |
|---|--:|
| **`ui-button` alone** (separate button-only build) | **27.3 KB** |
| **`ui-button` + `ui-dropdown`** | **47.9 KB** |

Breakdown, min+gz per group. Each group is gzipped on its own, so rows don't add up exactly.

| Group | button alone | button + dropdown |
|---|--:|--:|
| Lit | 6.0 | 7.2 |
| spike element core (`UIElement`, `VocabularyProperties`, `IconRenderer`, + `FormElement`) | 3.3 | 4.3 |
| spike button classes | 3.7 | 3.7 |
| spike dropdown classes | — | 6.2 |
| `button.css` / `dropdown.css` | 4.0 | 4.0 + 4.6 |
| `$/vocabulary` | 4.3 | 4.3 |
| `$/elements` (`ClassBuilder`, `Shorthand`; + `MenuOptions`, `Validator`) | 2.7 | 7.2 |
| vocabulary files | 2.1 | 4.2 |
| `$/icons`, runtime loader, `$/util` | 2.9 | 2.9 |

- **Decorator helpers.** esbuild's lowered decorator helpers cost about 2.2 KB min (1.2 KB gzip) per chunk that has decorators. Three eager chunks carry them.
- **Tree shaking.** Without `"sideEffects"`, button alone was 31.3 KB. The barrel re-exports the decorated `FormElement`, which counts as a side effect, so it and `Validator` get pulled into every chunk that imports the barrel.
- **No virtualizer.** Items render only while the menu is open.

## (b) Lines of code and ergonomics

| File | Lines | Code lines |
|---|--:|--:|
| `elements/UIElement.ts` | 305 | 168 |
| `elements/VocabularyProperties.ts` | 165 | 121 |
| `elements/FormElement.ts` | 124 | 72 |
| `elements/IconRenderer.ts` | 46 | 29 |
| `elements/elements.types.ts` | 98 | 41 |
| `button/UIButton.ts` | 254 | 166 |
| `button/UIButtons.ts` | 29 | 19 |
| `button/UIOr.ts` | 25 | 15 |
| `dropdown/UIDropdown.ts` | 746 | 560 |
| `dropdown/UIItem.ts` | 68 | 42 |
| `button.test.ts` | 253 | 214 |
| `dropdown.test.ts` | 389 | 336 |

**Declaring attributes.** It takes one line: `class UIButton extends UIElement.for(buttonVocabulary)`.
- `for()` calls Lit's `createProperty()` for each vocabulary attribute. The attribute name comes from the vocabulary, the converter from `Converters` by kind, primitives reflect, and `json` attributes are properties only.
- A mapped type derives all property types from the `as const` vocabulary, so there are no hand-written fields.
- A component can retype what the vocabulary can't express through a type argument, e.g. `value: DropdownValue`.
- Event, slot, part and text names are type-checked too, via `EventName<this["vocabulary"]>` etc.: `this.emit("ui-bogus")` is a compile error.
- Templates read slot and part names through `slotName()` / `partName()`, never literals.

**Booleans, arrays, rich data.**
- Booleans use `Converters.boolean` (so `yes` / `no` work) and reflect as `""` or a removed attribute.
- Lit's `useDefault` keeps defaults out of the DOM and restores them when an attribute is removed. It only works when the start value isn't `undefined`; otherwise Lit swallows the first real change.
- Arrays are plain properties, reflected as `a,b`.
- `options` is a property only.

**Standard decorators** worked everywhere they were used: `@proto static`, `@state() accessor`, `@property({ attribute: false }) accessor content`.
- A member-name clash (a `part()` method vs `HTMLElement.part`) shows up as "Unable to resolve signature of property decorator" on every decorator in every subclass, far from the real cause.
- Decorated classes count as side effects, which defeats tree shaking through barrels.
- `@customElement` wasn't used, because tags come from the vocabulary (`UIButton.define()`).
- `@proto` fit well. Its `protoDefined` hook mirrors `delegatesFocus` into Lit's `shadowRootOptions`, which SSR reads.

**Templating.** Lit templates map 1:1 onto the markup contract, using keyed `repeat()`, `live()` and `ifDefined()`. Awkward spots:
- `<a>` vs `<button>` needs two templates.
- The caret `<span>` must stay whitespace-free for `:empty`. oxfmt reflows templates, so a test guards it.
- `Icons.svg()` returns a DOM node that Lit would replace on every render. `IconRenderer` produces the same `<svg>` markup as a template instead.

**Conventions.** Classes-over-functions fits Lit naturally, and vocabulary-driven names fit via `createProperty()`. Spike-internal imports are relative: the root tsconfig includes `spike/` with no alias for a spike's own `src/`.

## (c) Performance

Setup: 1000 options, `search selection` dropdown.
- "Update" is `performance.now()` around the input event plus `await updateComplete`, as the brief specified.
- "Frame" adds the next `requestAnimationFrame`. Headless runs at 60 Hz, so frame times are tied to vsync.

| Measurement | min | avg | max |
|---|--:|--:|--:|
| Test, 10 keystrokes narrowing `"a lemon 12"`: update | 0.0 | **0.78 ms** | 4.8 |
| Perf page, same keystrokes: update | 0.3 | 1.05 | 5.3 |
| Perf page, same keystrokes: frame | 10.2 | 16.3 | 19.4 |
| "Churn", alternating `a` / `e` (hundreds of rows each time): update | 3.6 | 6.2 | 15.7 |
| Churn: frame | 15.5 | 16.5 | 17.0 |

- **First open, rendering 1000 items:** 12.6 ms in the test; on the perf page, 13.6 ms update and 19.4 ms to the next frame.
- **The assertion** (average under 16 ms) passes.
- **Timer resolution:** Chromium clamps timers to 0.1 ms, hence the 0.0 minimum.

## (d) Framework smoke pages

Each page mounts `<ui-dropdown>` with an `options` array property, `value="b"` and `open`, then clicks an option. Framework state and `el.value` must both become `"a"`.

| Page | Result | What it needed |
|---|---|---|
| vanilla | PASS | nothing |
| React 19.3.0 (`createElement`, esm.sh) | PASS | plain props plus `"onui-change"`; React 19 sets them as properties |
| Vue 3.5.43 (unpkg ESM build) | PASS | `isCustomElement`; `:options`, `:value`, `:open`, `@ui-change` |
| Solid 1.9.9 (`solid-js/h`, esm.sh) | PASS | `prop:options`, `prop:value`, `prop:open`, `on:ui-change` |
| Svelte | skipped | needs a compiler |

- `options` always arrived as a property; no page set an `options` attribute.
- Lit's `__saveInstanceProperties()` already provides the "upgrade property" backstop, and a test confirms it.
- **Controlled values:** re-setting `el.value` in a `ui-change` handler reverts the UI (tested).
- **React caveat:** a React handler that rejects a change (doesn't call `setValue`) leaves the element showing the new value while React state keeps the old one. React won't re-set a prop that hasn't changed.

## (e) Forms and accessibility

**Forms.**
- `FormElement` (72 code lines) covers: `setFormValue`, with one `FormData` entry per value for multiple; `setValidity` from `Validator` (`required` becomes `valueMissing`); `:state(invalid)`; reset and disabled-fieldset callbacks; the constraint-validation getters. All of it is tested; Lit caused no friction.
- **Submit buttons:** `<ui-button type="submit">` calls `internals.form.requestSubmit()`. `name=value` is sent by setting the form value just for the duration of `requestSubmit()` (tested), because a custom element can't be the form's `submitter`.
- **Known gap:** pressing Enter in a text field doesn't find a custom element as the form's default button.
- **Focus:** `delegatesFocus` caused no friction.

**Accessibility.**
- `aria-activedescendant` requires the listbox in the combobox's own shadow root. So `<ui-item>` carries rich content as attributes (`icon`, `image`, `flag`, `description`, `text`); its light-DOM children contribute only their text.
- The combobox's accessible name comes from, in order: the host's `aria-label` (forwarded; axe doesn't flag it on the host), `internals.labels`, the placeholder, then `aria-labelledby` pointing at `.text`.
- A host `aria-label` on `<ui-button>` is forwarded to the inner button, for icon-only buttons.
- axe passes on all 9 element-markup example pages with `color-contrast` turned off; that rule fails on the original fragments too.
- To satisfy axe's listbox rules: the "no results" message is a disabled `role=option`; dividers are `<hr role=none>`; headers are `role=presentation`.

## (f) SSR / Declarative Shadow DOM

**Result: PASS.** `@lit-labs/ssr` 4.1.0, loading the components through Vite's `ssrLoadModule()`, renders `<ui-button primary>` inside a `<template shadowrootmode="open" shadowrootdelegatesfocus>` with the correct classes, and renders the dropdown's trigger.

**Guarding needed: 3 one-line guards,** all for light DOM that the SSR shim doesn't provide (`children`, `childNodes`, `internals.labels`). Nothing was needed for `UI.load()` or `window`.

**Limits:**
- **No styles in the server output.** Sheets live in `UI.styles` rather than Lit's `static styles`, so a server-rendered page is unstyled until the runtime loads.
- **Slotted items aren't visible on the server.** The dropdown renders its raw value (`r`, not `Red`); the `text` attribute is the first-paint answer.
- **Hydration not tested.**

## (g) Testing

- **Suite:** Vitest browser mode, 57 tests in about 1.4 s.
- **Interaction:** `userEvent` drives clicks and keys into shadow roots without help.
- **Recording numbers:** `commands.writeFile` records the perf numbers, because browser-test console output doesn't reach the terminal.
- **Shared helpers:** `$test/fixture` and `$test/a11y` only work once `vitest` and `axe-core` are deduplicated in the spike's Vite config.
- **Synchronization:** `updateComplete` is the only thing needed, except when polling for icons to appear or waiting one macrotask for item changes.
- **CloseWatcher:** Chromium groups CloseWatchers created without a user action in between, so the "Escape closes only the top overlay" test needs a real key press between the two opens.
- **Screenshots:** comparing the side-by-side demo caught two CSS contract mismatches that no unit test did.

## (h) Translation hook

`UIButton.define("ie-boton", spanish)` and the matching calls for `ie-desplegable` and `ie-elemento` work: the demo page passes and 4 tests pass.

- **How it works:** `define()` creates a subclass that redeclares every property under its localized name. That's about 5 lines, and it answers `translation.md`'s open question about Lit fixing attribute names at declaration time.
- **Values:** converters map localized values to canonical on read (`rojo` → `red`) and back on reflect (`azul`, `basico`).
- **Classes and parts:** `<ie-boton primario color="rojo" tamano="grande">` gets `class="ui large red primary button"` and `part="button boton"`.
- **Events:** the dropdown dispatches `ie-cambio` only, never `ui-change`.
- **Strict names:** canonical attribute names are ignored on localized tags.
- **Items:** `<ie-elemento>` is recognized with `instanceof UIItem`, not by tag.
- **Runtime:** the localized vocabulary is registered in `UI.vocabulary` once the runtime loads.

## (i) Risks

**Dependencies.**
- `lit` 3.3.3 is stable.
- `@lit-labs/ssr` 4.1.0 is a Labs package.
- Standard decorators are the less-documented path in Lit, and they depend on the esbuild pre-pass.

**Two copies of Lit.** The test page loads Lit from esm.sh (`lit@3.2.1?dev`, which resolved to the same versions) next to the spike's bundled copy.
- Both copies render and update correctly.
- `litElementVersions` lists both.
- The dev build logs "Multiple versions of Lit loaded"; it's a warning only, and only in dev builds.
- No conflicts were observed. The `UI` runtime is shared through `globalThis`, independent of Lit.

**Other risks.**
- The React "rejected change" drift described in (d).
- Unstyled SSR output, described in (f).
- The runtime chunk alone is 26.9 KB min+gz, against the plan's budget of 20 KB for runtime plus tokens.

## (j) Foundation bugs in `src/`

1. **Slot fallback vs child selectors.** `button.css:7` prescribes the icon svg as fallback content inside `<slot name="icon">`. The sizing rules at `button.css:453-454` (`.icon > svg`, `.icon > ::slotted(svg)`) and `dropdown.css:250-251` match neither, so labeled-icon glyphs filled their whole block. The same applies to `dropdown.css:550` (`.text > img`, `.text > .icon`) versus content in the `trigger` slot. Workaround in the spike: the content is rendered as a sibling of the slot (`UIButton.renderIcon()`, `UIDropdown.renderText()`).
2. **Palette contrast.** White text fails WCAG 4.5:1 on the original fragments as well, so this is a `src/styles/colors.css` issue, not the elements: red 4.38:1, orange 2.85, green / positive 2.87, teal 2.7, blue / primary 4.28, pink 3.93, basic green 4.18, inverted secondary 2.17.
3. **Missing `content` attribute.** `button.vocabulary.en.ts` has none, though the plan lists `content` shorthand. The spike exposes it as a property only.
4. **Icon data in every component.** `src/icons/Icons.ts:1-3` statically imports the alias maps: 14.1 KB min+gz, more than Lit, in the eager chunk of anything with an icon. The template import in `Icons.#loadChunk` also pulls `search.json` (131 KB) into the build as a chunk nothing loads.
5. **Component texts aren't registered with `UI.i18n`.** `I18n.t("or")` only works because a missing key returns the key itself.
6. **No "remove value" text** in `dropdown.vocabulary.en.ts` for a label's delete button. The spike uses `clear` plus the value ("Clear Angular").

Files: element core `src/elements/`; components `src/components/{button,dropdown}/` incl. `examples/*.html`; `src/dictionary.es.ts`, `src/translate.test.ts`; pages `demo/` (`index`, `perf`, `translate`, `frameworks/*`); scripts `ssr.ts`, `smoke.ts`, `measure.ts`.

## Batch 1

Adds `ui-icon` / `ui-icons`, `ui-label` / `ui-labels`, the 13 content parts, `ui-divider`, `ui-segment` / `ui-segments` and `ui-container`, all on the Lit element core. Also fixes three things from both batch-0 reports:
- **Texts:** each component's vocabulary `texts` are registered with `UI.i18n`.
- **Caret:** the dropdown renders its caret slot only while it's occupied. Lit already did this; it's now tested.
- **`aria-label`:** host `aria-label` forwarding is now shared.

Measured 2026-09-29 on the same toolchain as batch 0.

**Results:**
- `yarn test`: 156 tests pass in 1.8 s.
- `yarn build`, `yarn ts` and `yarn ssr` pass.
- `yarn lint` and `yarn format:check` are clean. Both are spike-local; see `PAPERCUTS.md`.

### Bundle

Setup:
- One lib entry per family (`vite.config.ts` `COMPONENTS`).
- "Alone" means a build with just that entry: the entry plus its static imports, minus the lazy `UIRuntime` chunk and the icon data.
- "Own" means the family's spike classes, its sheet and its vocabulary, each gzipped separately.
- Sizes are min+gz, in kB (1000 bytes).

| Family | Alone | Own | Own: classes / css / vocabulary |
|---|--:|--:|---|
| `button` (`ui-button`, `ui-buttons`, `ui-or`) | 27.7 | 9.8 | 3.6 / 4.0 / 2.1 |
| `dropdown` (`ui-dropdown`, `ui-item`) | 45.0 | 13.5 | 6.1 / 4.7 / 2.7 |
| `icon` (`ui-icon`, `ui-icons`) | 22.1 | 5.0 | 1.9 / 1.8 / 1.2 |
| `label` (`ui-label`, `ui-labels`) | 24.6 | 7.3 | 2.7 / 3.1 / 1.5 |
| `parts` (13 parts + `PartElement`) | 26.5 | 10.0 | 2.9 / 5.0 / 2.1 |
| `divider` | 19.8 | 2.9 | 1.4 / 0.9 / 0.6 |
| `segment` (`ui-segment`, `ui-segments`) | 21.6 | 6.5 | 2.0 / 3.1 / 1.4 |
| `container` | 17.5 | 2.6 | 1.3 / 0.8 / 0.6 |
| **`ui-button` + `ui-dropdown`** | **48.7** | | |
| **all eight families** | **84.6** | | |

- **Shared floor:** about 15 kB. That is `container` alone minus its own cost: Lit 7.5, the spike core 5.9 (all of it), and `ClassBuilder` / `OwnerContext` from `$/elements`, `$/vocabulary`, `Icons`, the runtime loader and `$/util`.
- **Cost of the content-part machinery:** `ContentPart`, `PartOwners` and `OwnerController` add about 1.1 kB gzip to the core. `lit/static-html.js` (used to vary a part's tag) adds about 0.5 kB.
- **Icon alias maps:** `Icons.ts` now loads them lazily (0.25 kB left in the eager closure), so batch 0's "minus 14.1 kB alias maps" correction no longer applies. `button` alone is 27.7 kB without that correction (27.3 kB with it in batch 0).
- **`label` doesn't import `parts.css`:** a statistic's label adopts it by registry name (`PARTS_SHEET`), and whoever loads the owner loads the parts.

### LOC (lines / code lines)

| File | Lines | Code |
|---|--:|--:|
| `elements/UIElement.ts` (+85: registration, texts, slotchange, aria-label, `sheetNames()`) | 390 | 211 |
| `elements/VocabularyProperties.ts` | 176 | 125 |
| `elements/ContentPart.ts` | 95 | 60 |
| `elements/OwnerController.ts` | 71 | 43 |
| `elements/PartOwners.ts` | 87 | 39 |
| `elements/IconRenderer.ts` | 50 | 30 |
| `elements/elements.types.ts` | 146 | 53 |
| `icon/UIIcon.ts`, `UIIcons.ts` | 51, 28 | 26, 16 |
| `label/UILabel.ts`, `UILabels.ts` | 157, 20 | 103, 11 |
| `parts/UIHeader.ts` | 32 | 18 |
| `parts/UIAvatar.ts`, `UIDate.ts`, `UIContent.ts` | 21, 15, 13 | 13, 9, 7 |
| `parts/` 8 plain parts (`UIMeta` ...) + `PartElement.ts` | 8–14 each | 3–6 each |
| `parts/OwnerStub.ts` (demo / test owners) | 56 | 38 |
| `divider/UIDivider.ts` | 38 | 23 |
| `segment/UISegment.ts`, `UISegments.ts` | 49, 28 | 32, 18 |
| `container/UIContainer.ts` | 27 | 18 |
| `testing/AXTree.ts` | 64 | 44 |
| tests: icon / label / parts / divider / segment / container | 166 / 224 / 301 / 75 / 137 / 65 | 137 / 191 / 252 / 58 / 112 / 51 |

The whole batch is about 480 code lines of elements. Most parts are one line:
```ts
class UIMeta extends PartElement.for(metaVocabulary) {}
```

### Ergonomics, per component

**Icon.**
- Trivial: 26 code lines.
- Host ARIA through internals (`role=img`, `ariaLabel`, `ariaHidden`) is three assignments.
- `IconRenderer` gained a `style` argument.
- The one fight was the vocabulary's `style` attribute. A Lit property named `style` replaces the host's `CSSStyleDeclaration`. `VocabularyProperties.propertyName()` now renames names in `RESERVED_PROPERTIES` to `<noun><Name>` (`iconStyle`, `dividerHidden`), and the `PropertyName` type mirrors that rename. The attribute keeps its name.

**Label.**
- The most logic in the batch:
  - `<a>` vs `<span>` roots
  - icon-only detection
  - an image URL on a keyOnly attribute
  - the statistic-label mode
- `image` is keyOnly (boolean converter), yet may carry a URL. The element reads the raw attribute, since the converter discards the value.
- The contract's `<slot name="icon">svg</slot>` fallback works here (unlike button's), because `label.css` uses a descendant `.icon svg` selector.
- An icon-only `<span>` root with a forwarded `aria-label` becomes `role=img`, since `aria-label` is prohibited on a generic element.

**Parts.**
- The easiest part to write, once `ContentPart` existed.
- A tag that varies (`div` / `span` / `time` / `a` / `h1`–`h6`) needs `lit/static-html.js` `literal`s. One template covers every part root.
- The owned-header decision is a single `if (this.owner)`, because `OwnerController` re-renders the host when the owner changes.

**Divider, segment, container.**
- Mechanical: 18–32 code lines each.
- The segment declares `--ui-inverted: 0|1` inline on its root.
- `disabled` makes the root `inert`, which reaches slotted content through the flat tree (tested).
- `loading` sets host `aria-busy` and renders a visually hidden `role=status`.
- A scrolling segment, container or modal `ui-content` gets `tabindex=0`, because axe's `scrollable-region-focusable` fails without it.

**What fought the conventions.**
- A `display: contents` host swallows inline box styles: an example's `style="width: 2em"` on `<ui-avatar>` did nothing. The avatar example sizes through `::part(avatar)` instead.
- Adding an owner-only style needs a `<style>` in the page, which is correct but surprising to authors.

### Owner context and `ContentPart` design

- **`PartOwners`** is a static, page-wide registry filled by `UIElement.define()`:
  - part noun → (owner tag → owner noun), from each vocabulary's `ownsParts`, canonical and translated tags alike
  - tag → "is a content part"
  - the connected `OwnerController`s
- **`find()`** wraps `OwnerContext.find()`. Its `barrier` is any registered component that is not a part; owners match before the barrier. So a header inside a segment inside a card stays standalone, while an app's own unregistered wrappers don't block. Lookup is by tag, so upgrade order never matters.
- **`OwnerController`** is a Lit `ReactiveController` used by `ContentPart`, `UIIcon` (`direct: true`, parent must be `<ui-icons>`) and `UILabel` (a statistic's `label`):
  - it resolves on `hostConnected`, which also covers reparenting
  - it swaps `:state(in-<owner>)` and never sets the `in-<owner>` class
  - it calls `requestUpdate()` and an optional `onChange`; the label uses `onChange` to re-adopt sheets with `parts`
- **Re-resolution.** Every `UIElement` shadow root reports `slotchange` (with `flatten`) to `PartOwners.reslotted()`, which re-resolves tracked elements in or under the newly assigned nodes. A late owner registration re-resolves every connected tracker.
- **What the tests cover:**
  - slot boundary (an owner with a shadow root slotting a part)
  - shadow boundary (a `<ui-header>` rendered in the owner's own shadow root)
  - a segment barrier
  - nested owners (card > content > item > content > header resolves to `item`)
  - header in header (`depth` 1 through `ui-content`)
  - reparenting
  - re-slotting through `slot=` into a slot behind a barrier, with no reconnect
  - a late owner registration
  - no static class ever set
- **Owner tokens.** A header in a plain segment inside an inverted one reads `--ui-inverted: 0`; reversed, it reads 1 with `color-scheme: dark`.
- **`--ui-part`** is declared on every part root by `parts.css` (tested through computed style), so the element adds nothing.
- **`OwnerStub`** (`x-card`, `x-feed`, `x-statistic` ...) stands in for owners that don't exist yet. These are light-DOM elements registered as real owners, so the demo and axe exercise the production lookup path.

**Platform limits hit.**
- **Nobody tells an element it was re-slotted.** Only the slot gets `slotchange`, so owners have to report it. A part slotted into a non-`UIElement` owner that re-slots it isn't re-resolved; it is again on reconnect.
- **`slotchange` timing.** It fires after the owner's first render assigns its slots, so a part resolves twice: once on connect (through the light parent, which gives the same answer) and once on `slotchange`. The tests wait two `updateComplete` rounds.
- **`:state()` on a `display: contents` host** matches fine in `:host(:state(x)) > .root`. Structural pseudo-classes read the host's position, as the CSS expects.
- **`display: contents` and accessibility.** Chrome keeps a `display: contents` host with an internals `role=img` + `ariaLabel` in the accessibility tree as `image "Home"`, and drops it when `ariaHidden`. This was verified against Chrome's real tree through CDP (`testing/AXTree.ts`, `Accessibility.getPartialAXTree`), not only axe.

### Visual comparison

The side-by-side demo is at `demo/index.html` (`?only=<family>`), with all 30 new pairs, compared through full-section screenshots.
- **Harness fix:** the element side now opts into `ui-typography`. Light-DOM `<p>` margins had made every segment look taller, a harness difference and not a contract one.
- **Matches:** icons, labels (ribbons, corners, attached, floating, tags, image + detail), headers (page, content, icon, sub, dividing, block, attached, inverted, owned), statistic values and labels, dividers, segments and containers.
- **Remaining differences:**
  - `ui-segments` nested in `ui-segments` keeps its own box: foundation bug 5 below.
  - A link inside `<ui-detail>` is unstyled: bug 6 below.
  - Stub owners carry no colour: a red message header and a red statistic render uncoloured.

### Tests

156 tests in total: button 29, dropdown 28, icon 17, label 22, parts 30, divider 7, segment 14, container 5, translation 4.

What the new tests cover:
- class output per vocabulary attribute (every keyOnly, keyOrValue bare and valued, yes/no, `medium` as a no-op)
- `:state()`s and events (`ui-remove`, cancelable, reported as prevented; the label is never removed)
- slots and parts
- owner resolution (see above)
- header levels, roles and `aria-level` when owned
- icon ARIA, including the CDP accessibility-tree checks
- i18n: `has("or")` / `has("remove")`, and a registered translation pack winning
- the dropdown caret slot
- `aria-label` forwarding
- axe on all 30 element-markup examples with `color-contrast` off. `heading-order` is also off for the segment and parts examples: the fragments nest `<h1>`–`<h6>` demos under `<h4>` section titles, in the originals too. The label examples' bare `<input>`s got `aria-label`s, since the originals fail axe's `label` rule.

### Foundation bugs in `src/`

1. **`style` attribute.** `icon/icon.vocabulary.en.ts:40` names an attribute `style`, which shadows `HTMLElement.style`. It needs `property: "iconStyle"`, or a rename (`set`?). The spike renames it generically.
2. **`hidden` attribute.** `divider/divider.vocabulary.en.ts:27` names an attribute `hidden`, which is the global attribute. With `divider.css:33` (`:host([hidden]) { display: none }`) and the UA sheet, `<ui-divider hidden>` hides the whole host instead of leaving spacing (tested). It needs another name, e.g. `spacer`.
3. **Default `--ui-inverted` missing.** `segment/segment.css:477` and `parts/parts.css:1082` set `--ui-inverted: 1` but never declare the default `0` on every root, as `PART_OWNER_TOKENS` requires. The spike's segment declares it inline. Separately, `segment.css` keeps a plain segment inside an inverted one in the dark scheme, so `--ui-inverted: 0` there sits beside `color-scheme: dark`. That needs a decision.
4. **`image` carries two values.** In `label/label.vocabulary.en.ts:28`, `image` is `keyOnly` but documented as also taking a URL. No attribute kind carries both, so the element reads the raw attribute. It should be a keyOrValue-like kind, or a separate `src`.
5. **Nested groups.** `segment/segment.css:367-375` (`.ui.segments > .segments`: a divider line and no box of its own) has no shadow or token twin. A nested `<ui-segments>` keeps its own border and shadow.
6. **Links in a detail.** `parts/parts.vocabulary.en.ts:336`: `ui-detail` has no `href`, though Fomantic has `a.detail`. `label.css:433` (`.ui.label ::slotted(a)`) can't reach a link slotted into a `<ui-detail>`, so it renders in the UA link colour.
7. **Segment owns no parts.** `segment.vocabulary.en.ts:6` has no `ownsParts`, and no `in-segment` rule exists. Segment is an owner of TOKENS only, and a barrier for part lookup. Used as-is.
8. **Batch-0 bugs 1 and 2 still stand:** the slot-fallback vs child selectors in `button.css` / `dropdown.css`, and palette contrast.

**Files:**
- element core: `src/elements/{ContentPart,OwnerController,PartOwners}.ts`
- components: `src/components/{icon,label,parts,divider,segment,container}/`, including `examples/*.html`
- `src/testing/AXTree.ts`
- `demo/index.ts`
- `measure.ts`
- `.oxlintrc.json`
