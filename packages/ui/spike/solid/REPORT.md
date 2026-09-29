# Milestone 0 spike: `@solidjs/element` on Solid 2.0 RC

The same two components as `spike/lit/`, built on `@solidjs/element` over the shared foundation (`src/`). This report holds facts and measurements only; the comparison and recommendation are in `docs/spike-lit-vs-solid.md`.

## Toolchain (what actually ran)

| Package | Version (pinned exactly) | Note |
|---|---|---|
| `solid-js` | `2.0.0-rc.11` | `next` dist-tag, published 2026-09-28 |
| `@solidjs/web` | `2.0.0-rc.11` | Was 1.x's `solid-js/web`. It also owns the JSX types: `jsxImportSource: "@solidjs/web"`, NOT `solid-js`. |
| `@solidjs/element` | `2.0.0-rc.11` | Depends on `component-register@^0.8.7` (0.8.8 installed). |
| `@solidjs/vite-plugin` | `3.0.0-next.46` | The renamed `vite-plugin-solid`. `vite-plugin-solid@next` (3.0.0-next.27) is now a shim that depends on it. |
| `@solidjs/compiler` | `2.0.0-rc.11` (transitive) | The new native (OXC/Rust) JSX compiler and the plugin's default backend. `compiler: "babel"` is the escape hatch. |
| vite / vitest / @vitest/browser-playwright / playwright / axe-core / typescript | 8.3.1 / 5.0.2 / 5.0.2 / 1.63.0 / 4.13.0 / 7.0.2 | The repo's versions. |

- **No fallback was needed.** The 2.0 RC toolchain worked on the first try: a smoke element with JSX, standard decorators and `@proto` rendered and updated in vitest browser mode within minutes. `solid-element@1.9` was never installed.
- **Decorators:** standard decorators still go through the repo's `vite.decorators.ts` (esbuild, `jsx: "preserve"`), listed BEFORE `solid()`. Both plugins are `enforce: "pre"`; they don't conflict.
- **Package setup:** `spike/solid/` is a self-contained yarn project: an empty `yarn.lock` so yarn doesn't treat it as part of the root project, and `.yarnrc.yml` with `yarnPath: ../../.yarn/releases/yarn-4.18.0.cjs`. Aliases: `$` → `../../src`, `$test` → `../../test`, and `$spike` → `./src`.
- **Config files:** `vite.shared.ts` holds the plugins, aliases, `resolve.dedupe`, `server.fs.allow` and lightningcss with the root's `CSS_TARGETS` and `customMedia`. `vite.config.ts` does the library build. `vitest.config.ts` defines two projects: `browser` (chromium) and `ssr` (node).
- **Commands (in `spike/solid/`):** `yarn test` runs the SSR project, then the browser project; `yarn build`; `yarn tsc --noEmit`; `yarn smoke` drives the framework pages, perf, translate and examples pages in headless chromium via Playwright plus a Vite dev server (needs network for esm.sh / unpkg); `yarn dev` serves `/demo/index.html`, `/demo/perf.html`, `/demo/translate.html` and `/demo/frameworks/*.html`.
- **Final state:** `yarn tsc --noEmit` clean; `yarn test`: 79 passed (1 SSR in node + 78 in chromium, across 5 browser test files); `yarn build` clean; root `oxlint` (type-aware) 0 findings on `spike/solid`; root `oxfmt --check` clean on `spike/solid`.

## (a) Bundle

**Setup.** `vite build` with `lib` entries `button` and `dropdown`. ES format, minified, nothing external, `keepNames: true`. "gzip" is `zlib` level 9 of each emitted file. Solid and the eager icon alias maps are forced into named chunks with `output.codeSplitting.groups`, so they can be counted separately (`advancedChunks` is deprecated in rolldown / Vite 8.3).

| Chunk | kB | kB gzip | What |
|---|---:|---:|---|
| `button.js` | 26.96 | **6.66** | `ui-button`, `ui-buttons`, `ui-or` controllers |
| `dropdown.js` | 88.31 | **22.38** | `ui-dropdown`, `ui-item`, `SlottedItems`, `FormElement`, `Validator`, `MenuOptions`, dropdown vocabulary, `dropdown.css` (4.64 gz) |
| `button-<hash>.js` (shared) | 68.64 | **16.61** | Element core (`ElementDefinition`, `UIHost`, `UIElement`, `Controlled`, `Cell`, `SlotContent`), `ClassBuilder`, `$/vocabulary`, `$/util`, `UI.load()`, `Icons`, button vocabulary, `button.css` (3.98 gz). Shared because the dropdown adopts `button.css` too. |
| `solid-runtime-<hash>.js` | 84.64 | **24.17** | `solid-js` + `@solidjs/signals` + `@solidjs/web` + `@solidjs/element` + `component-register` |
| `rolldown-runtime-<hash>.js` | 0.35 | 0.26 | Chunk loader helper |
| `UIRuntime-<hash>.js` | 171.47 | 28.09 | Shared `UI` runtime + foundation CSS. Dynamic import; excluded from the totals below. |
| `icon-aliases-<hash>.js` | 54.89 | 14.68 | `aliases.json` + `fomantic-aliases.json` + `fomantic-clashes.json`. A STATIC import of `Icons.ts`: excluded below as icon data, but eager. |
| `solid-<hash>.js` | 51.31 | 12.54 | Font Awesome "solid" chunk index (lazy) |
| `solid-0-b` … `solid-w-z` (16 files) | 8.68 – 54.04 each | 3.04 – 16.86 each | FA solid glyph data per letter range (lazy) |
| `regular-<hash>.js` | 106.74 | 30.59 | FA regular (lazy) |
| `brands-<hash>.js` | 575.48 | 224.33 | FA brands (lazy) |
| `search-<hash>.js` | 131.38 | 35.38 | `src/icons/data/search.json`. Emitted because `Icons.#loadChunk`'s template `import()` matches every JSON in `data/`; no component ever loads it. |

**Totals (gzip):**
- **Cost of `ui-button` alone** (excluding the `UIRuntime` chunk and icon data): `button.js` + shared + Solid + loader = **47.71 kB**. Of that, Solid is 24.17 and the `button.css` text is 3.98.
- **Cost of `ui-button` + `ui-dropdown`:** **70.09 kB**. Solid is 24.17; CSS text is 8.62.
- **Spike code + foundation JS + component CSS without Solid:** 23.54 kB (button), 45.92 kB (both).
- **Real first load of a page with one `<ui-button>`:** 47.71 + 14.68 (eager icon aliases) + 28.09 (`UI.load()`) = **90.48 kB**, before any icon glyph chunk.

**Where bytes go inside the chunks (sourcemap inspection):** the largest Solid pieces are `@solidjs/signals` `core.js` (105 kB source), `@solidjs/web` `web.js` (79 kB), `scheduler.js` (77 kB) and `solid.js` (47 kB). In `UIRuntime`, `colors.css` (65 kB source) dominates, then `animations.css`, `native.css` and `tokens.css`.

## (b) LOC and ergonomics

`wc -l` after `oxfmt`, comments and docstrings included.

**Element core (`spike/solid/src/`), 1183 lines:** `ElementDefinition.ts` 306, `UIElement.tsx` 274, `UIHost.ts` 126, `spike.types.ts` 119, `FormElement.ts` 115, `Controlled.ts` 80, `FormHost.ts` 75, `SlotContent.ts` 46, `Cell.ts` 23, `index.ts` 19.

**Components, 1311 lines:** `components/button/UIButton.tsx` 255, `UIButtons.tsx` 36, `UIOr.tsx` 25, `index.ts` 14; `components/dropdown/UIDropdown.tsx` 811, `SlottedItems.ts` 126, `UIItem.tsx` 32, `index.ts` 12.

**Tests and harness, 934 lines:** `button.test.tsx` 216, `dropdown.test.tsx` 429, `dropdown.perf.test.tsx` 25, `translate/translate.test.tsx` 51, `translate/es.ts` 23, `ssr/ssr.ssr.test.tsx` 51, `ssr/dsd.test.ts` 26, `SpikeFixture.ts` 35, `perf/PerfRun.ts` 101. Configs 186 LOC; demo pages, scripts and example rewrites about 1160 LOC.

**How attributes, properties, booleans and arrays are declared.**
- **Nothing is declared per attribute.** `ElementDefinition` walks the vocabulary and hands `component-register` one prop per attribute: `{ value, attribute, parse: false, reflect: false }`, keyed by the camelCase property name. `this.attrs.<camelName>` is a typed read-only getter over one lazy memo per attribute. Values are converted with `Converters`. Types come from the `as const` vocabulary.
- **`component-register`'s own parsing had to be switched OFF.** `parse: true` runs `JSON.parse`, and `parseAttributeValue` begins with `if (!value) return`, so a bare boolean attribute (`primary=""`) parses to `undefined`, i.e. false. Its reflection writes `"true"` for `true`. Both are replaced by `ElementDefinition.convert()` / `reflect()`. Reflection writes `""` or removes the attribute, writes arrays comma-joined, and writes values in their LOCALIZED form. A flag skips reflection when the change came from `attributeChangedCallback`, so `primary="yes"` isn't rewritten to `primary=""`.
- **Arrays and objects are plain property values.** Array reflection round-tripped through the attribute and came back as a STRING (`["html"]` → `"html"`) until a `reflecting` guard skipped `attributeChangedCallback` during our own `setAttribute`.
- **Classes.** `classes()` is `ClassBuilder.build()` in a memo over an object of getters, so it tracks exactly the attributes it reads. Components override `classValue(name)` for controlled state. Solid 2's dev diagnostics flag this memo as `WIDE_SCOPE_DEPS` ("memo subscribed to 31 sources"); the production build drops the diagnostic.
- **Names.** No attribute, event, slot or part name is a string literal in a template: `this.part("button")`, `this.slot("icon")`, `this.emit("ui-toggle", …)`, `this.text("noResults")`, TypeScript-checked against `PartName<V>` / `SlotName<V>` / `EventName<V>` / `TextKey<V>`. Class WORDS of the markup contract (`item`, `selected`, `active`, `text`, `default`, `filtered`, `icon`) are module constants.

**How templating felt.** JSX compiles to real DOM with fine-grained bindings, no virtual DOM and no re-render of the whole template. The dropdown's markup reads top-to-bottom as the contract does. Structure uses `<Show>` / `<For>`; contract classes use Solid 2's `class={[ITEM, { [ACTIVE]: chosen, [SELECTED]: highlighted }]}`. Keyed `<For>` over stable option objects means filtering never recreates a row that stays visible. Event handlers are camelCase, delegated by Solid into the shadow root. `aria-*` must be passed as the strings `"true"` / `"false"`.

**What fought the conventions.**
- **Classes over functions.** The library's unit is a render FUNCTION, `(props, { element }) => JSX`. The spike wraps it in a per-connection controller CLASS (`UIElement`), created inside that function, so `@proto static vocabulary / styles / Host`, methods over loose helpers, and one class per file all hold. The cost is one indirection plus the two traps below.
- **Solid 2 memos compute EAGERLY (trap 1).** A memo created in the base-class constructor that calls an overridable method runs before subclass fields exist (`this.hasIcon is not a function`). A memo field initializer that reads a signal assigned in the constructor BODY sees `undefined`. Fixes: `{ lazy: true }` on base-class memos; effects that call overridables are created in `mount()`; every signal is declared as a class field via a small `Cell` wrapper, placed above the memos that read it.
- **Solid 2 forbids signal WRITES inside an owned scope (trap 2).** The write throws in dev. Initial state must be computed into the signal's initial value; writes are allowed only from event handlers, promise callbacks, `onSettled`, `MutationObserver` callbacks and host callbacks. Every read that follows a write in the same tick sees the OLD value, because writes land on a microtask, so handlers use locals and `untrack(...)` reads.
- **Standard decorators and `@proto`:** no friction. **oxfmt** formats `.tsx` the way Solid needs. **oxlint's type-aware rules** found 7 real issues, all fixed.

**What fought the library.**
- **No base class in `customElement()`.** `customElement(tag, props, fn)` takes NO base class, so there's no `static formAssociated` and no constructor of our own. The spike calls what `customElement()` does internally: `register(tag, props, { BaseElement: Host, customElements: capturingRegistry })(withSolid(fn))`. A capturing registry takes the class instead of defining it; the spike subclasses it once more (upgrade backstop, attribute-origin flag) and calls `customElements.define()` itself. About 40 LOC in `ElementDefinition.register()`.
- **Shadow options.** `delegatesFocus` works by calling `attachShadow({ mode: "open", delegatesFocus: true })` in the host base-class constructor, because the library's `renderRoot` getter returns an existing `shadowRoot`.
- **ElementInternals.** No helper; `attachInternals()` goes in the same constructor. States come from one effect over the controller's `hostStates()`.
- **Upgrade-property backstop.** `component-register`'s constructor assigns `undefined` to every prop key, which silently DROPS a property set before upgrade. The host base constructor stashes such own properties before that assignment runs; the final subclass re-sets them after the first `connectedCallback`. Tested.
- **Reconnect.** `component-register` tears the whole component down on disconnect (after a microtask) and re-renders on reconnect. State not held on the host resets on reconnect.
- **Error isolation.** One uncaught error in any component logs `[REACTIVITY_HALTED]` and freezes EVERY Solid element on the page. In the test run, a single bug made 25 unrelated tests hang until timeout; a 45-test file took 240 s. There is no per-element boundary by default.

## (c) Performance

**Method.** A search dropdown with 1000 options set through the `options` property. `PerfRun` is shared by the test and the demo page. Each keystroke: set `input.value`, dispatch `input`, then `flush()` (Solid 2 batches writes to a microtask; `flush()` applies memos, the keyed `<For>` diff and DOM writes synchronously). "+ layout" adds a forced reflow. Query `"united sta"`, narrowing 1000 → 500 → 400 → 200 → 100 → 100 → 100 → 30 → 30 → 30 rows. Chromium headless on Apple silicon; a warm-up run comes first.

| Where | Solid build | Open (render 1000 rows) | Per keystroke, script min / avg / max | + layout min / avg / max |
|---|---|---:|---:|---:|
| `dropdown.perf.test.tsx` (vitest) | dev | 16.7 ms | 0.2 / **1.6** / 4.3 ms | 0.7 / 3.4 / 9.0 ms |
| `demo/perf.html` via `yarn smoke` | production runtime | 16.1 ms | 0.2 / **1.3** / 3.9 ms | 0.7 / 2.9 / 8.3 ms |
| `demo/perf.html` under plain `vite dev` | dev + Chrome performance tracks | 121 ms | 0.9 / 7.1 / 22.6 ms | 1.3 / 8.9 / 28.1 ms |

- **Assertion:** avg < 16 ms passes with about 10× headroom. No windowing was needed.
- **Worst keystroke:** the first (`u`): all 1000 rows still match and each gets `<mark>` highlighting.
- **Slow dev row:** the plugin's dev-server defaults (dev build with diagnostics PLUS the injected `performanceTracks` adapter). Not what users get.
- **Initial render of 1000 options** happens on OPEN: 16–17 ms. **Memory:** not measured.

## (d) Framework consumption

`yarn smoke` loads each `demo/frameworks/*.html` and checks: the element shows the host's `value`; a user pick round-trips (`ui-change` → host state → `value` → element text); the host sets a new value; the host opens the menu; `options` stayed a property.

| Host | Binding | Result |
|---|---|---|
| vanilla | `el.options = [...]`, `el.value`, `addEventListener("ui-change")`, all set BEFORE the element is defined | All checks pass (upgrade backstop exercised) |
| React 19.2.0 | `createElement("ui-dropdown", { options, value, open, "onui-change": fn, … })` | All checks pass. React found the accessors (`"options" in el`) and set properties. |
| Vue 3.5.22 (global build) | `isCustomElement`, `.options`, `:value`, `:open`, `@ui-change` | All checks pass |
| **Solid 1.9.9 host** (`solid-js/h` + `solid-js/web` from esm.sh) | `prop:options`, `prop:value`, `prop:open`, `on:ui-change`, … | All checks pass |
| Svelte 5 | — | Skipped: needs its compiler |

**Duplicate runtime (Solid 1.9 app + our bundle's Solid 2 RC):** nothing broke. Events reach the 1.9 host; the 1.9 app's own context works; our elements don't consume host context and none crossed (`withSolid` found no `_$owner` from 1.9's `h`; rc.11 guards the foreign-owner path per solidjs/solid#3053). Unmounting from the 1.9 app ran `component-register`'s release, and the `UI.overlays` stack was empty afterwards. No console errors and no "multiple instances" warnings; only the dev diagnostic `WIDE_SCOPE_DEPS` for the `classes()` memo.

## (e) Forms and accessibility friction

**Form association** was possible only by bypassing `customElement()` (see (b)). Once the host class is ours, the rest is plain platform code in `FormElement` / `FormHost`, all tested: `formValue()` feeds `internals.setFormValue()` (a `string[]` becomes a `FormData` with one entry per value); `required` runs `Validator` into `setValidity(flags, message, trigger)` with `:state(invalid)` and `aria-invalid`; `formResetCallback` restores the connect-time value; `formDisabledCallback` from a disabled `<fieldset>` disables the control; `FormHost` exposes `form`, `validity`, `validationMessage`, `willValidate`, `labels`, `checkValidity()`, `reportValidity()`.

**`ui-button type=submit|reset`:** a custom element can't be `requestSubmit(submitter)`'s submitter, so the button sets its OWN form value to `name=value` for the duration of the synchronous submit algorithm, then clears it (tested). `type=reset` calls `form.reset()`. Both need `ui-button` to be form-associated too.

**`delegatesFocus`:** `host.focus()` focuses the inner `<button>`; presses on the non-focusable menu keep focus in the combobox; blur outside the host closes the menu.

**Controlled state (`Controlled`):** a user transition dispatches the event FIRST; a cancelled `ui-open` / `ui-close` changes nothing; a host that sets the property DURING the event wins (it never painted the new value, because writes land on the microtask); otherwise the element writes its own host property, which reflects. Tested for `value`, `open` and `active`.

**axe** passes on every element-markup example (4 dropdown + 5 button files) with `color-contrast` disabled (the original fragments fail it too). Required: the "No results" message is a disabled `role=option`; `<hr>` dividers get `role="presentation"`; the listbox needs its own `aria-label`; an icon-only `<ui-button aria-label>` forwards the host's `aria-label` to the inner `<button>` (watched with a `MutationObserver`); the combobox gets its name from `placeholder` (else `text`, else `name`), with the current value text linked by `aria-describedby`.

**Keyboard (APG combobox)**, all tested with real key events: ArrowDown/Up open or move; Home/End; PageUp/PageDown (10 rows); Enter selects (or adds the addition); Space selects on the button trigger; Tab closes; Escape is routed by `UI.overlays` and closes only the TOP overlay; type-ahead via `MenuOptions.selectionForKey` with a 500 ms buffer; Backspace in an empty multiple-search input removes the last label; `aria-activedescendant` points at the highlighted row.

**Other behaviour covered by tests:** outside click closes; anchor positioning (the root's `--ui-dropdown-anchor` equals its computed `anchor-name` and the menu's computed `position-anchor`); `allow-additions` + `ui-add`, `max-selections`, `clearable`, `no-results-text`, `ui-search` details, `<mark>` highlighting.

**Rich `<ui-item>` content:** plain items become `MenuOption`s rendered in the dropdown's shadow root. Items with element children are PROJECTED: the dropdown assigns a generated `slot="ui-item-N"` and renders `<slot name>` inside the row. Downside: that writes a `slot` attribute onto the author's element.

## (f) SSR / Declarative Shadow DOM

- `@solidjs/element` and `component-register` have NO server story: they need a live `HTMLElement` class and `customElements`.
- **DIY path, tested in `src/ssr/ssr.ssr.test.tsx` (node project):** the element core imports cleanly in node (the host base extends `globalThis.HTMLElement ?? class {}`); `@solidjs/web`'s server `renderToString` renders the REAL `UIButton` controller against a stub host; the result is wrapped in `<template shadowrootmode="open" shadowrootdelegatesfocus>` with the foundation CSS + `button.css` inlined in a `<style>`. Rendered: `<button type="button" class="ui primary button" part="button"><slot></slot></button>`.
- **Browser half (`src/ssr/dsd.test.ts`):** the string, parsed with `setHTMLUnsafe`, paints a styled button with no script. Defining the element afterwards upgrades it: `attachShadow` on a declarative root empties it and the controller re-renders. NO hydration.
- **Costs:** inlined CSS is about 147 kB per instance uncompressed (DSD has no shared constructable sheets); the vitest node project needs its OWN Solid plugin instance and `test.css` enabled; anything that reads the DOM in a constructor needs a server guard.

## (g) Testing friction

- The shared harness (browser-mode vitest + axe via `$test/fixture` / `$test/a11y`) works unchanged once `resolve.dedupe: ["vitest", "axe-core", …]` stops the repo-level `test/*.ts` files loading a second vitest.
- Vite setup: `server.fs.allow` must include the repo root; `optimizeDeps.include` avoids a mid-run reload.
- Timing: first render waits for `UI.load()`, and Solid 2 applies writes on a microtask. `UIHost.ready` plus `flush()` make tests deterministic via `SpikeFixture.render()` / `settle()` / `tick()`; no sleeps except the type-ahead buffer timeout.
- Halts: the whole-page halt turns one bug into many hanging tests; a 10 s `testTimeout` keeps the run short.
- Escape: tests set `UI.overlays.useCloseWatcher = false` so `userEvent.keyboard("{Escape}")` is deterministic.
- Logging: `console.log` from browser tests doesn't reach the terminal; the perf test writes numbers with `commands.writeFile(".cache/perf-dropdown.json")`.
- Solid 2's dev diagnostics were useful (`UNSTABLE_MEMO_OUTPUT` fixed with `equals`; a repair guide ships in `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`).

## (h) Translation hook

- `UIButton.define("ie-boton", es)` and `UIDropdown.define("ie-desplegable", es)`, with a 20-line dictionary (`src/translate/es.ts`).
- Mechanism: each creates a second `ElementDefinition` for the same controller class, built from `Vocabulary.resolve(vocabulary, "ie", es)`, then calls `register()`. One call per alias; no subclassing.
- Localized attribute names AND property keys (`primario`, `tamano`, `marcador`, `seleccion`, `alternable`; `"primario" in el` is true); value maps applied before conversion (`rojo` → `red`, `pequeno` → `small`, multi-word via `Vocabulary.canonicalize`); reflection writes values back localized; localized events `ie-cambio`, `ie-alternar`; classes stay canonical (`ui small red primary button`).
- Verified by 3 tests and `demo/translate.html`.

## (i) Risks

- **RC churn:** `solid-js` 2.0 went from rc.0 (2026-08-12) to rc.11 (2026-09-28): 12 RCs in 7 weeks. `@solidjs/vite-plugin` published 20 `3.0.0-next` builds in the same window, and its `latest` tag points at a `next` build. `@solidjs/element`'s `latest` tag is still `2.0.0-rc.0`. Exact pins are mandatory.
- **Docs:** `@solidjs/element`'s README is the 1.x `solid-element` README. The real 2.0 documentation is the `CHEATSHEET.md` and `skills/` shipped inside `solid-js`, plus the MIGRATION/RFC docs on GitHub.
- **`component-register` (Ryan Carniato):** 0.8.8, last published 2025-09-08; the 0.8.x line spans 2020–2025 with sparse releases. It is the actual custom-element layer. The spike works AROUND three of its behaviours (JSON attribute parsing, `"true"` reflection, dropped pre-upgrade properties) and bypasses its `customElements.define()` call.
- **Duplicate runtimes:** a Solid 1.9 host worked. With a Solid 2 HOST, `solid-js` is shared only if both resolve to one copy; otherwise rc.11's `withSolid` renders ownerless with a warning. Not exercised beyond the 1.9 host.
- **Whole-page failure mode:** one uncaught error in any Solid element halts reactivity for every Solid element on the page, and for a host app on the same runtime copy.
- **Dev-server perf defaults:** dev pages about 5× slower than production.

## (j) Foundation bugs / findings in `src/`

1. `src/components/button/examples/types.html:57-60`: the `left labeled` example's inner `<button class="ui icon button">` has no accessible name (axe `button-name`).
2. **Colour contrast:** the ORIGINAL class-grammar fragments fail axe `color-contrast` (button examples: content ×2, groups ×4, states ×2, types ×3, variations ×9; e.g. white on `--ui-positive` 2.87:1, white on primary blue 4.28:1, white on red 4.38:1, an inverted basic button 2.17:1). Palette tokens are in `src/styles/`.
3. `src/icons/Icons.ts:1-3` statically imports three alias maps, so every component that can draw an icon pays 14.7 kB gzip eagerly.
4. `src/icons/Icons.ts:243`: the template `import()` also matches `search.json` (35.4 kB gzip), emitted though nothing loads it.
5. The root `tsconfig.json` `include`d `spike`, so root `yarn tsc` type-checked `spike/solid/**/*.tsx` without its settings: 411 errors. (Fixed by the orchestrator: root tsc now covers `src` and `test` only.)
6. **Contract note:** `dropdown.css` draws the caret with `.dropdown.icon:empty::before`, so the element must render the `icon` `<slot>` inside `.dropdown.icon` only while that slot is occupied; a bare `<slot>` child makes the span non-empty and hides the caret.
7. **Resolved during the spike:** the button vocabulary lacked `content`, and the dropdown vocabulary lacked a label-delete text. Both landed upstream mid-run.

Also: 8 entries were appended to the root `PAPERCUTS.md`.

## Batch 1

Icon, label, the 13 generic content parts, divider, segment and container on the same element core, plus the
fixes carried over from both spike reports and a per-element error boundary.  Visual check:  `demo/index.html`
shows all 30 example files (class grammar left, elements right);  `yarn screenshots` writes one PNG per pair.  Every
pair compared by eye; the differences are listed under "Visual differences".

### Final state

`yarn tsc --noEmit` clean · `yarn test` **274 passed** (1 SSR + 273 browser in 12 files) · `yarn build` clean ·
`yarn oxlint` 0 findings · `yarn oxfmt --check .` clean.  New commands:  `yarn oxlint`, `yarn oxfmt`, `yarn measure`,
`yarn screenshots`.

| Test file | Tests | Covers |
|---|---:|---|
| `icon/icon.test.tsx` | 27 | classes per attribute (yes/no, `medium`), svg load / swap, `iconStyle`, states, internals ARIA, `:state(in-icons)` (direct child only, moved in and out), axe ×4 |
| `label/label.test.tsx` | 37 | texts registered at define, classes, `icon` extra class, child order, `<a>`, aria-label forwarding, bare `image`, `ui-remove` (composed, cancelable, cancel reported, disabled), group, axe ×5 |
| `parts/parts.test.tsx` | 64 | all 13 parts standalone (root, `part`, `--ui-part`, no class leak), tag variants, header classes / levels / roles, owner resolution (through parts, nearest of nested owners, header³, barrier, slot → shadow and shadow → host, slotchange, reparent), statistic label, detail, icon-header content, date in summary, `--ui-inverted` from the nearest segment, axe ×13 |
| `divider/divider.test.tsx` | 14 | classes, separator / orientation, icon box, the `hidden` collision, axe ×2 |
| `segment/segment.test.tsx` | 34 | classes, `:state(piled)` stacking, owner token default + dark scheme, busy / disabled + announcement, group, axe ×4 |
| `container/container.test.tsx` | 13 | classes, centring, axe ×2 |
| `errors/isolation.test.tsx` | 5 | boundary:  render / constructor / effect throws stay local, sibling keeps updating;  cost;  the halt without it |
| `dropdown.test.tsx` | +1 | `.dropdown.icon` holds the `icon` slot only while occupied |

axe runs on every element-markup example with `color-contrast` off.  `heading-order` is also off for
`parts/header.html` and `segment/variations.html` only:  the ORIGINAL fragments fail it identically (a page of
h1 … h6 demos).

### Bundle (gzip level 9, `yarn measure`)

Cost of each library entry = its static import closure, excluding Solid, the `UI` runtime chunk and icon data
(all lazy or listed apart).  Solid (`solid-runtime`) is **28.32 kB** for every entry (was 24.17:  +1.42 error
boundary, the rest `Dynamic` and effects the new elements pull in).

| Entry | Own chunk | Closure without Solid | + Solid | Component CSS text (≈ gzip) |
|---|---:|---:|---:|---:|
| `icon` (`ui-icon`, `ui-icons`) | 5.57 | **19.90** | 48.22 | 1.87 |
| `label` (`ui-label`, `ui-labels`) | 8.30 | **28.18** | 56.50 | 3.15 + `parts.css` 5.03 |
| `parts` (13 elements) | 8.79 | **25.79** | 54.11 | 5.03 |
| `divider` | 3.53 | **17.86** | 46.18 | 0.93 |
| `segment` (`ui-segment`, `ui-segments`) | 7.16 | **19.48** | 47.80 | 3.13 |
| `container` | 3.09 | **15.06** | 43.38 | 0.79 |
| `button` (for reference) | 6.69 | 25.43 | 53.75 | 3.98 |
| `dropdown` (for reference) | 22.43 | 41.52 | 69.84 | 4.64 |
| **Batch 1, all six entries** | | **56.67** | 84.99 | |
| **Everything (8 entries)** | | **90.12** | 118.44 | |

- Shared chunks:  element core + `ClassBuilder` + `$/vocabulary` + `$/util` + `PartContext` (`UIElement-*.js`)
  11.71;  `parts.css` (shared by parts and label) 5.03;  `Icons` 1.92;  `SlotContent` 0.52;  `IconGlyph` 0.44.
- Floor:  the smallest element (`ui-container`) costs 15.06 kB + Solid 28.32 = 43.38 kB.  A 14th generic part
  costs ≈ 0.3 kB (one tiny class + define call).
- Upstream changes since the first report:  `Icons` now lazy-loads the alias maps (`icon-aliases` 14.67 kB is no
  longer eager) and `search.json` is no longer emitted -- report items (j)3 and (j)4 are fixed.
- Excluded:  `UIRuntime` 28.10 (dynamic), FA `solid` index 7.61 + glyph chunks, `regular` 30.59, `brands` 224.33,
  aliases 14.67 (all lazy).

### LOC (`wc -l` after `oxfmt`, docstrings included)

- **Element core, new/changed:**  `PartContext.ts` 166 (new), `ContentPart.tsx` 85 (new), `IconGlyph.ts` 49 (new),
  `HostAttribute.ts` 25 (new), `StubOwner.tsx` 87 (new, test/demo scaffold), `UIElement.tsx` 274 → 355,
  `ElementDefinition.ts` 306 → 335, `index.ts` 30.  Core total now 1751 lines (scaffolding included).
- **Components, 867 lines:**  `UIIcon` 67, `UIIcons` 41;  `UILabel` 171, `UILabels` 26;  `UIHeader` 52,
  `UIAvatar` 29, `UIAuthor` 25, `UITitle` 24, `UIDate` 24, `UIContent` 19, `UIDetail` 17, 6 one-liners
  (`UIActions` `UIDescription` `UIExtra` `UIMeta` `UISummary` `UIValue`) 14 each, `parts/index.ts` 48;
  `UIDivider` 58;  `UISegment` 70, `UISegments` 30;  `UIContainer` 26;  5 other barrels 10–12 each.
- **Tests, 1036 lines:**  parts 323, label 195, isolation 152, icon 124, segment 119, divider 73, container 50.
- **Demo:**  30 element-markup example files (1737 lines), `demo/index.ts` 60, `measure.ts` 72, `screenshots.ts` 40.

### ContentPart / owner-context design

- **`PartContext`** (one per element that acts as a part) holds the owner as a signal (`Cell<OwnerMatch>`) and a
  page-wide registry filled by `UIElement.define()`:  `ownsParts` noun → (tag → owner noun), the set of defined
  tags, and the set of PART tags.  Resolution is `$/elements`' `OwnerContext.find()` over the flat tree with
  `barrier = registered tag && !part tag`, so parts are transparent (card > content > header resolves to the card,
  `depth` 1) and any other component stops the climb (card > segment > header is standalone).
- **States:**  an effect keeps `:state(in-<owner>)` in step with the signal (cleanup removes the old one);  the
  static `in-<owner>` class is never set (tested).
- **Re-resolution:**  on connect (a new controller -- `component-register` re-renders on reconnect, so reparenting
  is free);  on `slotchange` in ANY spike element's shadow root, for the elements that entered AND left the slot
  (leavers aren't in `assignedElements()` any more, so the last assignment is remembered per slot), cascading to
  part descendants in the light DOM;  once after first settle.
- **`ContentPart`** (base of the 13 parts):  `PartContext` + `parts.css` + `<Dynamic component={tag()}
  class part href target datetime tabindex><slot>`;  subclasses override `tag()` / `href()` / `datetime()` /
  `content()` only, so six parts are 14-line files.  `--ui-part` is declared by `parts.css` on the ROOT from the noun
  class -- never on the host:  a host declaring it would be what its own root's `@container style(--ui-part:
  summary)` queries, so a date could never see the summary it's in (tested).
- **`ui-header`** is part AND owner:  standalone = class grammar on `<div>` / `<hN>` (`level`) / `<a>` (a linked
  page header gets `role=heading aria-level`);  owned = bare `.header`.  Header³ resolves each to its parent.
- **Other "parts":**  `ui-label` uses `PartContext("label")`, so inside a statistic it renders `div.label`, sets
  `:state(in-statistic)` and re-adopts `label` + `parts` sheets (new overridable, tracked `sheetNames()`);
  `ui-icon` uses `direct` mode (only the flat-tree parent component counts, skipping its own shadow internals).
- **Owner tokens:**  `ui-segment` declares `--ui-inverted` inline on its root, `0` by default, so the NEAREST
  segment wins (tested both ways).  See foundation bug 3 for the colour-scheme half.
- **Owners that don't exist yet** (card, item, feed, comment, modal, message, list, step, accordion, popup, toast,
  search, statistic) are `stub-*` elements (`StubOwner.defineFomanticOwners()`), generated from the parts'
  `in-<owner>` states.
- **Platform limit:**  no event tells an element its assigned slot changed.  A FOREIGN (non-spike) component
  re-slotting a part isn't seen until the part reconnects;  an owner defined AFTER its parts connected isn't seen
  either (no registry re-scan).

### Error boundary

- `UIElement.define()` wraps each element's construction + render in `createErrorBoundary()` (Solid 2's primitive
  under `<Errored>`).  A throw in the constructor, in render, in a memo during an update, or in an effect empties
  THAT element's shadow root, sets `:state(errored)`, logs once and resolves `ready`;  a sibling `ui-label` keeps
  updating and new elements still render (tested for all three throw sites).  Without the boundary the same throw
  logs `[REACTIVITY_HALTED]` and the sibling stops updating (tested, last in its file).
- It works through `@solidjs/element`:  the boundary accessor is what `withSolid`'s render function returns.
- **Cost:**  +1.42 kB gzip in `solid-runtime` (26.90 → 28.32), ≈ 0.1 kB in the core.  Render time of 300 labels:
  25.7 ms with vs 27.6 ms without (median of 5, noise-level).
- It even caught a real bug during development:  `ui-label` read a subclass field from the base constructor
  (trap 1 again, via `sheetNames()`);  that label rendered nothing and every other test in the file passed.
- Limits:  errors thrown in plain DOM event handlers never reached Solid anyway;  a halt that does happen is
  permanent (`resetErrorHalt()` re-arms the scheduler but the poisoned node throws again).

### Fixes carried over

- (a) Vocabulary + texts register with `UI.vocabulary` / `UI.i18n` in `define()` (synchronously when the runtime
  is loaded, else after `UI.load()`), not on first connect -- tested before any instance exists.
- (b) `ui-dropdown` renders the `icon` `<slot>` inside `.dropdown.icon` only while occupied (it already did;
  now tested:  `:empty` caret, slot appears, `:empty` again).
- (c) Icon-only `ui-button` `aria-label` forwarding kept (tests unchanged);  the same pattern, now a reusable
  `HostAttribute`, names icon-only / corner labels (`role=img` on a non-link label root).
- New core fixes:  **`component-register` ignores `removeAttribute()` of a bare boolean attribute** (its
  `attributeChangedCallback` returns early when the prop is falsy, and a bare attribute's raw value is `""`) --
  worked around in `ElementDefinition.register()`, covered by the segment tests;  `adoptStyles()` moved from the
  base constructor to `mount()`;  a vocabulary attribute whose property would shadow a NATIVE `HTMLElement`
  member is renamed (`style` → `iconStyle`, `hidden` → `dividerHidden`) with a dev warning;  scrolling segment /
  container / content roots get `tabindex=0` (axe `scrollable-region-focusable`).

### Ergonomics per component

- **Container, divider, segment, icons, labels:**  trivial -- a render of 5–10 JSX lines on the base class.  Class
  output needed zero per-component code.
- **Icon:**  easy;  internals ARIA from one effect.  Fought the conventions only through the `style` attribute.
- **Label:**  the most work (171 lines):  five optional children, the `image` keyOnly-or-URL duality (the raw prop
  has to be read beside the converted boolean), forwarded `aria-label`, context-dependent markup and sheets.
  `<Dynamic>` for `span`/`a` roots is clean.
- **Parts:**  the base class made 13 elements cheap;  the header's two personalities are one `rootClass()`.
- **What fought Solid:**  trap 1 again (`sheetNames()` called from the base constructor);  JSX has no types for
  custom tags;  the error boundary is a two-line wrapper once found (docs:  the shipped `CHEATSHEET.md` only).
- **What fought the conventions:**  `display: contents` hosts drop author box styles (`style="width: 175px"` on
  a circular segment or an avatar does nothing) -- the rewrites use `::part()` rules instead;  no literal names
  for ARIA words / roles pushes a handful of module constants per file.

### Visual differences (class grammar vs elements)

Icons, dividers, containers, segments, headers and the parts in stub owners render pixel-alike.  Differences:
- label `ribbon`:  the element shows the offset and the fold triangle the CSS describes;  the static fragment
  shows neither.
- label `image="url"` makes an `image` label (vocabulary semantics), while `label/content.html`'s static
  "Image" fragment is a plain label holding an `img.image`.
- `<ui-detail><a>` (label "Link" example):  the link keeps the browser's link colour -- `ui-detail` has no `href`
  (bug 8), and `label.css` styles only DIRECTLY slotted links.
- a `hidden` divider disappears entirely (bug 1).
- the scrolling modal content shows one paragraph (element) vs two (static) at the same 4em cap;  headers inside
  shadow roots sit a few px lower after sub-headers (`:host(:not(:last-child))` spacing).

### Foundation bugs / findings in `src/`

1. `src/components/divider/divider.vocabulary.en.ts:27`:  attribute `hidden` IS the global `hidden` attribute --
   the UA and `divider.css`'s own `:host([hidden])` hide the host, so a "hidden divider" renders nothing, and the
   property shadows `HTMLElement.hidden`.  Rename it (e.g. `spacer`) or set `property`.
2. `src/components/icon/icon.vocabulary.en.ts:40`:  attribute `style` collides with the inline `style`
   attribute (`style="regular"` is invalid CSS;  real inline CSS is read as an icon style) and its property shadows
   `HTMLElement.style`.  Rename (`icon-style`, `set`).  The rewrites use Fomantic's `outline` word instead.
3. `src/components/segment/segment.css:121` (`.ui.segment`) declares no `--ui-inverted: 0` default, which
   `src/components/parts/parts.css:43` and `components.types.ts:108` require;  and `segment.css:35` deliberately
   keeps a plain segment nested in an inverted one in the DARK scheme.  The element declares the token default,
   so such a segment is now `--ui-inverted: 0` in `color-scheme: dark` -- one of the two rules has to give.  Same
   missing default on `.ui.header` (`parts.css:218`), which is also an owner.
4. `src/components/parts/parts.css:578`:  an in-feed `.date` outside a summary is a `<time>` with no `display`,
   so it stays inline (Fomantic's is a block).
5. `src/components/segment/examples/variations.html:25,27`:  `ui top seamless attached segment` breaks the
   grammar order, so `[class*="top attached"]` never matches the static fragment;  the element emits
   `seamless top attached`.
6. `src/components/label/examples/content.html:30` (`aria-label` on a role-less span:  axe `aria-prohibited-attr`)
   and `:74`, `label/examples/types.html:66-75` (inputs with no accessible name:  axe `label`).  The rewrites
   name the inputs;  the element form passes `aria-prohibited-attr` by forwarding the name onto a `role=img` root.
7. `heading-order`:  `parts/examples/header.html` and `segment/examples/variations.html` fail it (originals too).
8. `src/components/parts/parts.vocabulary.en.ts:336`:  `ui-detail` has no `href`, so Fomantic's `a.detail` has no
   element form (a nested `<a>` isn't styled by `label.css`'s `::slotted(a)`).
9. Tag clash:  the parts' `in-item` owner (`parts.vocabulary.en.ts:50,126`, Fomantic's `.items > .item`) vs the
   dropdown's `<ui-item>` (`dropdown.vocabulary.en.ts:214`).  The stub is `stub-item`;  the real item owner needs
   another tag or a context-sensitive `ui-item`.
10. Text keys are one flat namespace:  `loading` in `button.vocabulary.en.ts:119` AND `segment.vocabulary.en.ts:94`
    (same English, but a translation can only give them one text).
11. Static scrolling fragments (`segment`/`container` variations, `parts/content.html`) aren't keyboard-reachable;
    the elements add `tabindex=0`.

Also:  6 entries appended to the root `PAPERCUTS.md`.
