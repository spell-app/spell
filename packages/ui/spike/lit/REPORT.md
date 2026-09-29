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
