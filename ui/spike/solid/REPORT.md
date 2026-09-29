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
