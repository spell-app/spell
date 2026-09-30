# `@spell/ui` status report

Eight component families -- `ui-button` (+ `ui-buttons`, `ui-or`), `ui-dropdown` (+ `ui-item`), `ui-icon` /
`ui-icons`, `ui-label` / `ui-labels`, the 13 generic content parts, `ui-divider`, `ui-segment` / `ui-segments`,
`ui-container` -- on **Solid 2.0.0-rc.11** through **`@spell/solid-element`** (`packages/solid-element/`, our fork of
`@solidjs/element` + `component-register`), over the foundation in `src/` (vocabularies, CSS, runtime, icons,
native fallbacks).  Packaged as a SHARED RUNTIME:  `solid-js`, `@solidjs/web` and the fork are peer dependencies
(external);  the element core is split into two shared entries (`core.js` for every family, `forms.js` only for
families with a form value);  each family ships only its own classes, sheet, vocabulary and native fallback.

This report holds facts and measurements.  Every table between `generated` markers is rewritten by `yarn report`
(`tools/ReportTables.ts`) from `tools/results/*.json`;  run the commands under "Commands" first.  How we got here
(the Lit vs Solid spikes) is in the appendix.

## Setup & versions

<!-- generated:versions -->
| Package | Version | Kind |
| --- | --- | --- |
| `solid-js` | 2.0.0-rc.11 | installed |
| `@solidjs/web` | 2.0.0-rc.11 | installed |
| `@spell/solid-element` | 0.0.0 | installed |
| `vite` | 8.3.1 | installed |
| `@solidjs/web` | 2.0.0-rc.11 | peer |
| `solid-js` | 2.0.0-rc.11 | peer |
| `@spell/solid-element` | link:./packages/solid-element | dependency |
| `@solidjs/vite-plugin` | 3.0.0-next.46 | dev |
| `@solidjs/web` | 2.0.0-rc.11 | dev |
| `solid-js` | 2.0.0-rc.11 | dev |
<!-- /generated:versions -->

- **Solid 2.0 RC:**  `solid-js` / `@solidjs/web` `2.0.0-rc.11`, pinned exactly (12 RCs in 7 weeks);
  `@solidjs/vite-plugin` `3.0.0-next.46` (native OXC compiler).  `@solidjs/web` owns the JSX types:
  `jsxImportSource: "@solidjs/web"`, `jsx: "preserve"`.
- **The fork:**  `@spell/solid-element`, `"link:./packages/solid-element"` in `dependencies`;  its own yarn project
  (own `yarn.lock`, `yarn fork <script>`), with its own tests (`yarn test:fork`).  Its `exports` point the
  `development` condition at `src/index.ts`, so the dev server, Vitest and the docs site compile the fork's
  TypeScript with our Solid plugin;  the library build leaves it external.  Only `yarn vendor` / `yarn measure`
  bundle its BUILT `dist/`, and they build it first when stale (`tools/ForkBuild.ts`).  The HMR plugin is imported
  from source (`./packages/solid-element/src/vite.ts`) by `vite.config.ts` and the Astro config, so a fresh
  checkout never needs the fork's `dist/` to start.
- **Decorators:**  standard (TC39 2023-11) through `vite.decorators.ts` (esbuild pre-pass, `jsx: "preserve"`),
  listed BEFORE `solid()`;  both are `enforce: "pre"`.
- **One Solid:**  `resolve.dedupe: ["solid-js", "@solidjs/web"]` in every Vite config (library, tests, site) and in
  the vendor / measure builds:  the linked fork otherwise resolves its OWN Solid, and two copies can't share owners.
- **Config:**  `vite.config.ts` exports `baseConfig()` (plugins, aliases, dedupe, Lightning CSS with `CSS_TARGETS`),
  used by the library build, `vitest.config.ts` (two projects:  `browser` in chromium, `ssr` in node, each with its
  own Solid plugin instance) and, in part, `site/astro.config.mjs`.

### Commands

From the repo root:
- `yarn review` -- tsc (root, node configs, the fork), oxlint `--fix` (incl. the fork), oxfmt, then every test:
  `ssr`, `browser`, and the fork's suite
- `yarn build` -- `dist/`:  `core.js`, `forms.js`, one entry per family, `styles.js`, `index.js`, lazy runtime and
  icon-map chunks, `glyphs/` (one module per icon), `.d.ts`
- `yarn vendor` -- `vendor/`:  one ES module per peer specifier + `vendor/importmap.json` (`PeerVendor`)
- `yarn measure` -- `tools/results/measure-results.json` (`BundleMeasure`)
- `yarn smoke` -- builds, then runs the import-map pages in headless chromium:  `smoke-results.json`
  (`SmokeRunner`).  Needs network for esm.sh (React, Solid 1.9) and unpkg (Vue) only.
- `yarn serve` -- the same pages for a person (prints URLs)
- `yarn report` -- `loc-results.json` (`LocCount`), then this file's tables (`ReportTables`)
- `yarn test:hmr` -- hot module replacement end to end:  dev server + headless chromium + real file edits
- `yarn dev` -- `tools/demo/`:  every example as class grammar beside element markup, plus perf, translate, HMR
  pages;  `yarn screenshots` writes one PNG per example pair
- `yarn site:dev` / `yarn site:build` -- the docs site, on the live components

### Final state

At the promotion (2026-09-29):  `yarn review` clean -- `browser` 1102 tests (1101 passed, 1 todo) in 63 files,
`ssr` 1, the fork 121 in 13 files · `yarn build` clean (`dist/glyphs/` 2,163 files) · `yarn vendor` 3 specifiers,
all tree-shaken · `yarn measure` all checks pass · `yarn smoke` 8 / 8 pages · `yarn test:hmr` 8 / 8 ·
`yarn report` twice, no diff · `yarn site:build` 9 pages, live `ui-button` / `ui-dropdown`.

## Bundle

### Method

- **Packaging:**
  - `solid-js`, `@solidjs/*` and `@spell/solid-element` are external, as a FUNCTION so subpaths match
    (`SOLID_EXTERNAL` in `vite.config.ts`).  `dist/` contains no Solid or fork code and imports the three by
    specifier.
  - **Two shared entries** (`SHARED_ENTRIES`):
    - `src/core.ts` -- the element core (`UIHost`, `UIElement`, `ElementDefinition`, `ContentPart` + `PartContext`,
      `Controlled`, `Cell`, `SlotContent`, `HostAttribute`, `IconGlyph`) AND the foundation it uses:  `$/util`,
      `$/vocabulary`, from `$/elements` `ClassBuilder` / `Shorthand` / `OwnerContext` / `NativeFallback`,
      `$/runtime` (the eager loader only), `$/icons` (`Icons`), `$/components/components.types`
    - `src/forms.ts` -- `FormElement`, `FormHost`, `Validator`, `MenuOptions`;  imported by `dropdown` only.
      `ui-button` is form-associated through the fork's `formAssociated` option alone, so it stays on `core`.
  - Every component file (classes AND native fallback) imports shared code through ONE path, `$/core` (and
    `$/forms` where needed);  the vocabulary and the sheet are the family's own.  Two chunking rules:
    - `core.ts` / `forms.ts` re-export `$/elements` LEAVES, never the barrel:  the barrel holds the `forms` files
    - `FormHost` / `FormElement` import the element core through the `$/core` ENTRY:  importing its leaves made
      Rolldown hoist everything `core` and `forms` share into a third chunk, and `core.js` became a facade
  - `styles` is its own entry (`dist/styles.js`):  the `index` entry re-exports the foundation sheets, and without
    an entry of their own they landed in `index.js`, which the lazy `UIRuntime` chunk then imported -- loading the
    runtime on a button-only page would have pulled every family.
  - `rolldownOptions.preserveEntrySignatures: "allow-extension"`;  `button.css` + the button vocabulary land in a
    shared `button-<hash>.js` (the dropdown adopts `button.css`).
  - The `E` / `V` namespaces are their own entry, `api` (`src/api.ts`, `@spell/ui/api`);  `index.js` is flat.
    Namespacing a module that `core` also reaches (as `index.ts` once did with `export * as V from "$/vocabulary"`)
    made Rolldown move its runtime module (`__name`, `__exportAll`) out of `core.js` into a shared
    `rolldown-runtime-<hash>.js` that `core.js` and every family imported:  one more request per page (0.19 kB
    min+gz).  So `V` namespaces an api-only re-export of the barrel (`vocabulary.api.ts`), and `api.ts` imports the
    `forms` entry so the `forms` leaves stay in `forms.js`.  `core.js` keeps the helpers and exports `__exportAll`
    to `api.js` (+0.06 kB min+gz).  A button-only page:  3 of our files instead of 4.  The check
    `no Rolldown runtime chunk` guards it.
  - Icon glyphs are separate files (`dist/glyphs/<style>/<name>.js`, copied by `emitGlyphs()`), fetched by URL
    relative to the chunk holding `Icons` (`core.js`);  see `docs/icons.md`.
- **Measuring** (`BundleMeasure`):  the repo's Vite config, built in memory with entries `core` + `forms` + one per
  family + `api` (it changes how `core.js` comes out;  `vite:dts` and the glyph copy dropped;  no `index` or
  `styles`);  every module is attributed to a bucket by id (`tools/package.config.ts`):  `library`, `core`,
  `shared:forms`, `own:<family>:classes|css|vocabulary|fallback`, `extra:api`, lazy `runtime` / `icons`.  Each tier
  is minified (esbuild) and gzipped (level 9) ON ITS OWN;  a scenario sums, per family, only the shared entries its
  chunk imports.  `library (as used)` bundles exactly the bindings `dist/` imports from each peer specifier;
  `library (full)` every export, for comparison.
- **Standalone** (for comparison):  each family built ALONE with Solid and the fork bundled and tree-shaken, eager
  chunks summed -- what an app bundling everything itself would ship.

### Tiers

<!-- generated:bundle-tiers -->
| Tier | min kB | min+gz kB | Loaded |
| --- | --: | --: | --- |
| library (as used:  the bindings `dist/` imports) | 77.19 | 27.70 | eager |
| library (full:  every export of the peer set) | 173.62 | 60.53 | comparison |
| core (element core + foundation JS) | 47.28 | 14.94 | eager |
| forms (form base, validation, menu options;  imported by `dropdown`, `input`, `checkbox`, `form`) | 20.27 | 7.32 | eager |
| own, all 23 families | 686.47 | 177.41 | eager |
| api (`E` / `V` namespaces, `@spell/ui/api`) | 0.70 | 0.31 | app only |
| runtime (`UIRuntime` + foundation CSS) | 168.28 | 27.65 | lazy |
| icons (name index + alias maps;  glyphs are separate files) | 70.64 | 20.50 | lazy |
<!-- /generated:bundle-tiers -->

### Own cost per family

<!-- generated:bundle-families -->
| Family | own min+gz kB | classes | css | vocabulary | fallback | imports | page with only it | standalone (library bundled) |
| --- | --: | --: | --: | --: | --: | --- | --: | --: |
| `button` | **11.77** | 3.92 | 3.98 | 2.14 | 1.93 | core | 54.41 | 42.19 |
| `dropdown` | **16.27** | 7.00 | 4.69 | 2.40 | 2.49 | core + forms | 66.23 | 65.48 |
| `icon` | **5.72** | 2.20 | 1.83 | 1.25 | 1.58 | core | 48.35 | 36.92 |
| `label` | **8.06** | 2.87 | 3.14 | 1.57 | 1.56 | core | 50.69 | 49.99 |
| `parts` | **14.41** | 5.46 | 5.03 | 2.18 | 1.64 | core | 57.05 | 50.19 |
| `divider` | **3.77** | 1.67 | 0.91 | 0.72 | 1.48 | core | 46.40 | 34.99 |
| `segment` | **7.19** | 2.27 | 3.15 | 1.41 | 1.45 | core | 49.82 | 37.15 |
| `container` | **3.20** | 1.45 | 0.77 | 0.56 | 1.40 | core | 45.84 | 32.89 |
| `grid` | **7.78** | 2.44 | 3.26 | 1.51 | 1.44 | core | 50.42 | 38.52 |
| `image` | **5.48** | 2.32 | 1.51 | 1.15 | 1.60 | core | 48.12 | 35.07 |
| `text` | **2.70** | 1.47 | 0.38 | 0.43 | 1.40 | core | 45.34 | 32.39 |
| `flag` | **6.05** | 1.87 | 0.54 | 2.92 | 1.64 | core | 48.69 | 36.92 |
| `loader` | **4.21** | 1.65 | 1.23 | 0.75 | 1.54 | core | 46.85 | 34.05 |
| `placeholder` | **5.82** | 3.31 | 1.27 | 0.83 | 1.57 | core | 48.46 | 35.56 |
| `message` | **5.60** | 2.02 | 1.76 | 1.02 | 1.81 | core | 48.24 | 37.07 |
| `breadcrumb` | **4.99** | 2.78 | 0.93 | 0.72 | 1.80 | core | 47.63 | 36.33 |
| `input` | **10.11** | 4.61 | 2.63 | 1.88 | 2.22 | core + forms | 60.06 | 52.07 |
| `checkbox` | **9.11** | 4.58 | 2.52 | 1.08 | 2.11 | core + forms | 59.06 | 44.83 |
| `form` | **10.52** | 6.22 | 2.07 | 1.83 | 1.59 | core + forms | 60.47 | 47.74 |
| `item` | **4.75** | 2.64 | 0.37 | 0.95 | 1.86 | core | 47.39 | 40.73 |
| `list` | **6.75** | 2.03 | 3.05 | 0.92 | 1.65 | core | 49.38 | 45.97 |
| `menu` | **9.78** | 2.83 | 4.10 | 1.39 | 1.62 | core | 52.42 | 48.60 |
| `table` | **13.36** | 4.58 | 5.18 | 1.85 | 1.92 | core | 56.00 | 47.06 |
<!-- /generated:bundle-families -->

### Scenarios

<!-- generated:bundle-scenarios -->
| Scenario | Adds up | shared runtime min+gz kB | standalone build |
| --- | --- | --: | --: |
| page with one button | library + core + own:button | **54.41** | 42.19 |
| all families | library + core + forms + own (23 families) | **227.36** | 224.97 |
| app already ships the library | core + forms + own (23 families) | **199.67** | -- |
<!-- /generated:bundle-scenarios -->

### Checks

<!-- generated:bundle-checks -->
| Check | Result |
| --- | --- |
| every family entry imports `core.js` | pass |
| no Rolldown runtime chunk (`rolldown-runtime-<hash>.js`):  its helpers stay in `core.js` | pass |
| no shared-entry module outside its own chunk (`core.js`, `forms.js` ...) | pass |
| no Solid / fork module in `dist/` | pass |
| runtime + icon data only in lazy chunks | pass |
| every module attributed to a bucket | pass |
| every external specifier is in the peer set | pass |
<!-- /generated:bundle-checks -->

### Notes

- **Unchanged by the promotion:**  within 0.05 kB of the spike's last numbers (core 14.59 vs 14.63, page with one
  button 53.03 vs 53.08, all families 118.71 vs 118.76);  `core` lost a little with the per-icon glyph loader.
- **Vendored Solid now shrinks too.**  The Solid 2 host page's identity probe moved out of shipped code into the
  page (`tools/frameworks/solid/identity.js`), and binds `createSignal` / `render` instead of `import * as` both
  packages.  `yarn vendor` now tree-shakes all three specifiers to the bindings `dist/` and the smoke pages import:
  30.4 kB min+gz over five files (was 59.9 kB, everything).  `library (as used)` (26.7 kB, one bundle) is what an
  app bundler ships;  the vendored set is a little larger because the pages themselves use `render`, `flush` ...
- **The fork costs 1.5 kB more than what it replaces:**  3.67 kB min+gz vs 2.13 for `@solidjs/element` +
  `component-register` (`yarn fork measure`), for options, prototype accessors, converters, synchronous
  reflection, form hooks, lifecycle hooks and the error boundary.
- **`forms` keeps a button page lean:**  a page with only buttons loads `core` but not `forms`;  the dropdown loads
  both.
- **Fallback bytes are mostly decorator helpers:**  each `<name>.fallback.ts` is minified and gzipped on its own
  here, and about 1.2 kB of that is esbuild's lowered-decorator helpers, repeated in every file with a decorator.
  Net of them the fallbacks are 0.15-1.25 kB each (`docs/fallback.md`).
- **Lazy:**  `UIRuntime` (27.0 kB) and the icon name / alias maps (20.5 kB);  glyphs are fetched one small module
  per icon.  `label` imports `parts.css` itself (a statistic's label adopts it), counted once, under `parts`.

## LOC

<!-- generated:loc -->
| Group | Files | Lines | Code lines |
| --- | --: | --: | --: |
| element core | 24 | 3696 | 2123 |
| components | 78 | 5233 | 3239 |
| vocabularies & fallbacks | 46 | 4674 | 3762 |
| foundation | 42 | 6659 | 3562 |
| tests | 114 | 16745 | 13971 |
| tooling | 38 | 3806 | 2730 |
<!-- /generated:loc -->

### Per file

<!-- generated:loc-files -->
| File | Lines | Code lines |
| --- | --: | --: |
| `core.ts` | 43 | 20 |
| `elements/Cell.ts` | 23 | 10 |
| `elements/ClassBuilder.ts` | 184 | 121 |
| `elements/ContentPart.tsx` | 85 | 48 |
| `elements/ControlLabels.ts` | 223 | 144 |
| `elements/Controlled.ts` | 86 | 41 |
| `elements/ElementDefinition.ts` | 208 | 128 |
| `elements/FormElement.ts` | 137 | 68 |
| `elements/FormHost.ts` | 46 | 24 |
| `elements/HostAttribute.ts` | 25 | 15 |
| `elements/HotDefinitions.ts` | 124 | 74 |
| `elements/IconGlyph.ts` | 49 | 28 |
| `elements/MenuOptions.ts` | 303 | 191 |
| `elements/NativeFallback.ts` | 205 | 114 |
| `elements/OwnerContext.ts` | 84 | 46 |
| `elements/PartContext.ts` | 175 | 96 |
| `elements/Shorthand.ts` | 96 | 54 |
| `elements/SlotContent.ts` | 46 | 29 |
| `elements/UIElement.tsx` | 463 | 262 |
| `elements/UIHost.ts` | 74 | 30 |
| `elements/Validator.ts` | 458 | 342 |
| `elements/elements.types.ts` | 504 | 212 |
| `elements/index.ts` | 37 | 21 |
| `forms.ts` | 18 | 5 |
| `components/breadcrumb/UIBreadcrumb.tsx` | 69 | 40 |
| `components/breadcrumb/UIBreadcrumbSection.tsx` | 66 | 40 |
| `components/breadcrumb/index.ts` | 13 | 5 |
| `components/button/UIButton.tsx` | 244 | 169 |
| `components/button/UIButtons.tsx` | 35 | 23 |
| `components/button/UIOr.tsx` | 24 | 14 |
| `components/button/index.ts` | 14 | 7 |
| `components/checkbox/UICheckbox.tsx` | 53 | 28 |
| `components/checkbox/UIRadio.tsx` | 148 | 93 |
| `components/checkbox/index.ts` | 13 | 5 |
| `components/container/UIContainer.tsx` | 27 | 17 |
| `components/container/index.ts` | 10 | 3 |
| `components/divider/UIDivider.tsx` | 58 | 33 |
| `components/divider/index.ts` | 10 | 3 |
| `components/dropdown/SlottedItems.ts` | 127 | 87 |
| `components/dropdown/UIDropdown.tsx` | 825 | 606 |
| `components/dropdown/index.ts` | 14 | 4 |
| `components/flag/UIFlag.tsx` | 61 | 36 |
| `components/flag/index.ts` | 12 | 4 |
| `components/form/UIField.tsx` | 88 | 57 |
| `components/form/UIFields.tsx` | 41 | 28 |
| `components/form/UIForm.tsx` | 417 | 277 |
| `components/form/UIFormHost.ts` | 53 | 32 |
| `components/form/index.ts` | 16 | 7 |
| `components/grid/UIColumn.ts` | 15 | 6 |
| `components/grid/UIGrid.ts` | 15 | 6 |
| `components/grid/UIRow.ts` | 13 | 6 |
| `components/grid/index.ts` | 15 | 7 |
| `components/icon/UIIcon.tsx` | 82 | 46 |
| `components/icon/UIIcons.tsx` | 40 | 28 |
| `components/icon/index.ts` | 12 | 5 |
| `components/image/UIImage.tsx` | 68 | 45 |
| `components/image/UIImages.tsx` | 29 | 18 |
| `components/image/index.ts` | 13 | 5 |
| `components/input/UIInput.tsx` | 225 | 147 |
| `components/input/UITextarea.tsx` | 48 | 36 |
| `components/input/index.ts` | 12 | 5 |
| `components/item/UIItem.tsx` | 259 | 148 |
| `components/item/index.ts` | 13 | 4 |
| `components/label/UILabel.tsx` | 165 | 95 |
| `components/label/UILabels.tsx` | 25 | 15 |
| `components/label/index.ts` | 12 | 5 |
| `components/list/UIList.tsx` | 169 | 89 |
| `components/list/index.ts` | 13 | 4 |
| `components/loader/UILoader.tsx` | 70 | 41 |
| `components/loader/index.ts` | 10 | 3 |
| `components/menu/UIMenu.tsx` | 294 | 179 |
| `components/menu/index.ts` | 13 | 4 |
| `components/message/UIMessage.tsx` | 109 | 60 |
| `components/message/index.ts` | 10 | 3 |
| `components/parts/PartElement.ts` | 13 | 5 |
| `components/parts/UIActions.ts` | 14 | 6 |
| `components/parts/UIAuthor.ts` | 25 | 15 |
| `components/parts/UIAvatar.tsx` | 29 | 18 |
| `components/parts/UIContent.ts` | 19 | 9 |
| `components/parts/UIDate.ts` | 24 | 13 |
| `components/parts/UIDescription.ts` | 14 | 6 |
| `components/parts/UIDetail.ts` | 22 | 12 |
| `components/parts/UIExtra.ts` | 14 | 6 |
| `components/parts/UIHeader.tsx` | 51 | 30 |
| `components/parts/UIMeta.ts` | 14 | 6 |
| `components/parts/UISummary.ts` | 14 | 6 |
| `components/parts/UITitle.ts` | 24 | 13 |
| `components/parts/UIValue.ts` | 14 | 6 |
| `components/parts/index.ts` | 48 | 41 |
| `components/placeholder/UIPlaceholder.tsx` | 43 | 26 |
| `components/placeholder/UIPlaceholderHeader.ts` | 13 | 6 |
| `components/placeholder/UIPlaceholderImage.ts` | 17 | 9 |
| `components/placeholder/UIPlaceholderLine.ts` | 18 | 9 |
| `components/placeholder/UIPlaceholderParagraph.ts` | 12 | 6 |
| `components/placeholder/index.ts` | 21 | 11 |
| `components/segment/UISegment.tsx` | 70 | 46 |
| `components/segment/UISegments.tsx` | 29 | 18 |
| `components/segment/index.ts` | 13 | 5 |
| `components/table/UITable.tsx` | 417 | 256 |
| `components/table/index.ts` | 11 | 3 |
| `components/text/UIText.tsx` | 33 | 21 |
| `components/text/index.ts` | 10 | 3 |
<!-- /generated:loc-files -->

Counted by `LocCount` (non-blank, non-comment lines as "code").  The fork is not counted here:  693 code lines in
15 modules (vs 349 for the two originals), each fix one module + one test file
(`packages/solid-element/UPSTREAM.md`).

## Element core

### Declaring attributes and properties

- **Nothing is declared per attribute.**  `ElementDefinition` walks the vocabulary and hands the fork one prop per
  attribute:  `{ value, attribute, property?, reflect, converter: { fromAttribute, fromProperty, toAttribute } }`,
  keyed by camelCase canonical name.  The fork's props ARE `this.attrs`:  one signal each, already converted,
  typed from the `as const` vocabulary (`AttributeValues<V>`).
- **Booleans:**  `Converters.boolean` (`yes` / `no` work) on BOTH paths:  `el.primary = "yes"` stores `true`.
  Reflection writes `""` or removes the attribute, never `"true"`.  Attribute writes never reflect back.
- **Values:**  localized values are canonicalized on the way in, from attributes AND property writes
  (`button.color = "verde"` on `<ie-boton>` stores `green`, reflects `verde`);  arrays reflect comma-joined;
  `json` kinds (`options`) observe their attribute but never reflect.
- **Reserved names:**  the fork THROWS at definition when a prop's property would shadow an element member
  (`hidden`, `title`, `style`, its own `dispose` ...) unless renamed with the vocabulary's `property`
  (`dividerHidden`).
- **Pre-upgrade properties:**  the fork's upgrade step (captured in the constructor, re-applied through the
  setters).
- **Platform options instead of plumbing:**  `UIElement.define()` passes `BaseElement` (`UIHost` / `FormHost`),
  `shadowRootInit: { mode: "open", delegatesFocus }`, `internals: true`, `formAssociated`, `keepAlive: true`,
  `errorBoundary`, `onError`, `fallback`.
- **Names:**  no attribute, event, slot or part literal in a template:  `this.part("button")`, `this.slot("icon")`,
  `this.emit("ui-toggle", ...)`, type-checked against the vocabulary.

### Templating, owner context, content parts

- JSX compiles to real DOM with fine-grained bindings.  `<Show>` / `<For>` (keyed:  filtering never recreates a
  row that stays visible);  contract classes use Solid 2's `class={[ITEM, { [ACTIVE]: chosen }]}`;  `<Dynamic>`
  for a part's varying root tag;  `Icons.svg()` nodes inserted as is (`IconGlyph`).
- **`PartContext`** holds the owner as a signal and a page-wide registry filled by `UIElement.define()`;
  resolution is `OwnerContext.find()` over the flat tree, with a barrier at every registered non-part component.
  It re-resolves on every re-connect (the fork's `onConnect`;  `keepAlive` keeps the controller across moves), on
  `slotchange` in any element's shadow root, and once after first settle.
- **`ContentPart`** (in `core`) + a family base `PartElement` (in `parts`) make the 13 parts cheap:  six are
  14-line files.
- **App context reaches components:**  `UIElement.AppContext` is read by every controller;  on the Solid 2 host
  page the app provides it around the dropdown and the component sees the app's value.
- **Platform limit:**  no event tells an element its assigned slot changed;  a foreign component re-slotting a
  part isn't seen until the part reconnects.

### What Solid 2 asks of component authors

The rules are in `AGENTS.md`, "Solid authoring".
- **Eager memos:**  Solid 2 memos compute at creation;  base-class memos that call overridables are
  `{ lazy: true }`, and effects that call overridables are created in `mount()`, after subclass fields exist.
- **No signal writes in owned scopes:**  the fork's hooks can run inside a Solid render, so `connected` and the
  fieldset `formDisabled` replay are deferred a microtask.
- **Writes land on a microtask:**  tests `flush()` (`ElementFixture.settle()` / `tick()`).
- **`keepAlive` has a cost:**  a removed element keeps its reactive root until `dispose()` or garbage collection;
  anything page-wide (overlay entries) must follow `connected`, not disposal.
- **Dev diagnostics** flag the `classes()` memo as `WIDE_SCOPE_DEPS` (it reads every attribute);  the production
  build drops them.

## Hot module replacement

Edit a component in `yarn dev` (or `yarn site:dev`) and every live instance updates in place:  same host objects,
host attributes and properties kept (the dropdown's `options` and controlled `value` included), no page reload.
Open `tools/demo/hmr.html` and edit `UIButton.tsx`, `button.css` or `button.vocabulary.en.ts`.

- **How:**
  - The fork's `solidElementHot()` (`vite.config.ts`, `apply: "serve"`) appends
    `import.meta.hot.accept(() => hotUpdate(import.meta.hot))` to each component barrel
    (`src/components/<name>/index.ts`, the modules that call `define()`).  An edit to a component class, its
    vocabulary or fallback climbs to its barrel, which Vite re-runs with the fresh modules.
  - `define()` is idempotent per tag, so the barrel's `UIButton.define()` would return the OLD class.
    `HotDefinitions` (`src/elements/`, dev only, the plugin's `setup` import) wraps it:  a DIFFERENT class of the
    SAME name defining a known tag is a new version, and takes over every tag the old one had (`<ie-boton>`
    included) through `UIElement.defineTag()`.
  - The fork swaps each class's component, props and options in place, migrates each instance's values, then
    `hotUpdate()` disposes and re-renders every live instance.
  - A changed vocabulary goes through `UI.vocabulary.replace()` (the registry refuses a SECOND object for a tag
    otherwise), which also re-resolves the runtime's translated names from it;  changed English texts reach
    `UI.i18n` where no translation replaced them.
  - CSS:  `?inline` component sheets self-accept;  `HotDefinitions.updateStyle()` re-registers the sheet by name
    and `Styles.register()` replaces its rules in every adopted shadow root.  Nothing re-renders.
- **Limits:**
  - Component-internal state resets:  a search query, the highlighted row, an open menu, an uncontrolled toggle.
  - Anything the platform reads once can't change:  observed attributes, `formAssociated`, the host base class,
    shadow root options.  The page reloads with `<ui-button>: observed attributes changed (+size), full reload`.
  - Shared code (`core`, `forms`, `UIElement`, the runtime, `HotDefinitions`) reaches several barrels:  full
    reload.  A module reaching ONE barrel (a vocabulary, a fallback, `SlottedItems`) stays hot.
  - A class renamed in the edit, or a vocabulary whose tag changed, defines as NEW;  old instances keep the old.
- **Test:**  `yarn test:hmr` (`tools/hmr.e2e.ts`) starts the dev server, opens `tools/demo/hmr.html` in headless
  chromium and edits the real files (restored after each scenario, then checked against their original text and
  `git diff --quiet`).  8 / 8 pass, ~4 s:  component code (button;  dropdown keeping its properties), CSS without
  re-render, a vocabulary text, a throwing render (fallback, then recovery), a syntax error, a new vocabulary
  attribute (full reload), shared code (full reload).
- **Cost:**  dev only.  The plugin appends ~200 bytes to each barrel and style module;  the fork's HMR paths sit
  behind `import.meta.hot`, which a build replaces with `undefined`.

## Performance

### Method

`test/PerfRun.ts`:  a `search selection` dropdown, 1000 options set through the `options` property, open by a
click on the search input, then `"united sta"` typed one character per keystroke (rows narrow 1000 => 30).  Per
step, from just before the event:  `update` until `flush()` returns, `+ layout` after a forced reflow, `+ frame`
after the next animation frame.  A warm-up pass runs first and is dropped.  Two runs:  the dropdown perf test (dev
Solid, Vite dev server) and the smoke perf page (`dist/` + vendored production Solid,
`tools/smoke/perf-adapter.js`).

### Results

<!-- generated:perf -->
| Where | Build | Open: update / + layout / + frame ms | Keystroke update min / avg / max ms | + layout | + frame |
| --- | --- | --: | --: | --: | --: |
| vitest browser mode | dev (Vite dev server) | 17.6 / 17.6 / 18.8 | 0.4 / **1.8** / 4.7 | 1.1 / **3.7** / 9.3 | 13.8 / **15.7** / 16.4 |
| smoke perf page | production (`dist/` + vendored peers) | 16.6 / 16.6 / 18.2 | 0.3 / **1.4** / 4.0 | 0.8 / **3.1** / 10.1 | 14.6 / **15.8** / 16.4 |
<!-- /generated:perf -->

- The test asserts an average update under 16 ms;  it passes with large headroom.  No windowing needed.
- The worst keystroke is the first (`u`):  all 1000 rows still match and each gets `<mark>` highlighting.  First
  open renders all 1000 rows;  it dominates.
- Headless chromium runs at 60 Hz, so `+ frame` snaps to vsync (about 16.7 ms);  compare `update` and `+ layout`.
- `tools/demo/perf.html` runs the same benchmark under `yarn dev`;  set `UI_SOLID_PROD=1` for production Solid
  there (the plugin's dev defaults, with performance tracks, are about 5x slower).

## Framework hosts

### Method

`SmokeRunner`:  `yarn build`, then ONE static server (no Vite dev server) serves `dist/`, `vendor/`, `tools/` and
`test/`, and injects one `<script type="importmap">` into every page:  `solid-js`, `@solidjs/web`,
`@spell/solid-element` => `/vendor/...`, `@spell/ui` => `/dist/index.js`, `@spell/ui/core`, `@spell/ui/forms`,
`@spell/ui/<family>` => `/dist/<name>.js`.  `PeerVendor` builds the three specifiers in one build with the peer
packages deduped (ONE Solid), tree-shaken to the bindings `dist/` and the pages import.  Requests to any host
other than esm.sh / unpkg are blocked.  Each host mounts ONE `<ui-dropdown>` with `options` as a property,
`value="b"` and `open`, and runs the round trip in `tools/frameworks/check.js` (DOM and ARIA only).

### Results

<!-- generated:smoke -->
| Page | Kind | Host | Result | Checks |
| --- | --- | --- | --- | --- |
| `vanilla.html` | host | vanilla | PASS | ok: initialValue, initiallyOpen, optionsIsProperty, pickUpdatesHost, closesAfterPick, hostSetsValue, hostOpens |
| `react.html` | host | react 19.3.0 | PASS | ok: initialValue, initiallyOpen, optionsIsProperty, pickUpdatesHost, closesAfterPick, hostSetsValue, hostOpens |
| `vue.html` | host | vue 3.5.43 | PASS | ok: initialValue, initiallyOpen, optionsIsProperty, pickUpdatesHost, closesAfterPick, hostSetsValue, hostOpens |
| `solid.html` | host | solid 2.0.0-rc.11 (app) + identity hook | PASS | ok: initialValue, initiallyOpen, optionsIsProperty, pickUpdatesHost, closesAfterPick, hostSetsValue, hostOpens, appContext, solidIdentity, webIdentity, contextReachesComponent, unmount, overlaysAfterUnmount |
| `perf.html` | perf | perf (production) | PASS | 1000 options, query `united sta` |
| `compat-solid-1.9.html` | COMPATIBILITY | solid 1.9.9 (esm.sh) + vendored Solid 2 | PASS | ok: initialValue, initiallyOpen, optionsIsProperty, pickUpdatesHost, closesAfterPick, hostSetsValue, hostOpens, appContext, unmount; contextReachesComponent: null (as expected) |
| `translate.html` | check | es (ie-boton, ie-desplegable) | PASS | ok: largePrimary, redBasic, smallBlueDisabled, localizedEvent, localizedPropertyValue |
| `fallback.html` | check | every family, working + failed | PASS | ok: button, dropdown, icon, label, segment, container, divider, parts, oneErrorEach, fallbackSubmits, iconGlyph; 8 console error(s) |
<!-- /generated:smoke -->

### Solid 2 host

- `tools/frameworks/solid/app.tsx`, a compiled Solid 2 app (`HostApp`) with `solid-js` / `@solidjs/web` external.
  Bindings:  `prop:options`, `prop:value`, `prop:open`;  `ui-*` listeners through a `ref` callback (Solid 2
  dropped `on:`).
- The page's identity probe (`identity.js`, loaded before the app;  never in `dist/`) proves:
  - **one module instance** -- `solidIdentity` / `webIdentity`:  the app's `createSignal` / `render` ARE the
    functions the components' copy exports
  - **context flows** -- `contextReachesComponent`:  the app wraps the dropdown in
    `<UIElement.AppContext value="from-the-app">` and the controller inside reads it (owner adoption across the
    custom-element boundary, through the fork's shadow-crossing owner lookup)
  - **signal => prop** (`hostSetsValue`) and **`ui-change` => signal** (`pickUpdatesHost`) with no glue
  - plus the app's own context, unmount, and `overlaysAfterUnmount` (the overlay entry follows `connected`)

### Other pages

- **`compat-solid-1.9.html`** -- a COMPATIBILITY check:  a Solid 1.9.9 app from esm.sh next to the page's
  vendored Solid 2.  The round trip passes;  a 1.9 context can't reach the Solid 2 components (`null`, as
  expected).
- **`translate.html`** -- `UIButton.define("ie-boton", es)` and `UIDropdown.define("ie-desplegable", es)` on the
  built classes;  classes canonical, `ie-cambio` fires, a localized PROPERTY value is stored canonical and
  reflected localized.
- **`fallback.html`** (`tools/demo/`) -- every family working beside its failed copy;  its console errors are the
  8 intentional failures.  Also checks that the working `ui-icon` draws its glyph from `dist/glyphs/`.

### Notes

- `options` always arrived as a property;  the vanilla page sets `options`, `value` and the listener BEFORE the
  element is defined:  the fork's upgrade step is the backstop.
- **Controlled values:**  re-setting `el.value` in a `ui-change` handler reverts the UI (tested).
- **React caveat:**  a React handler that rejects a change leaves the element showing the new value while React
  state keeps the old one;  React won't re-set a prop that hasn't changed.

## Forms & accessibility

- **Form association** is the fork's `formAssociated` option;  form callbacks arrive as hooks:  `onFormReset` =>
  `FormElement.formReset()`, `onFormDisabled` => `UIElement.formDisabled`.  `FormHost` is the form-control API
  (`form`, `validity`, `checkValidity()` ...).
- `FormElement`:  `formValue()` feeds `internals.setFormValue()` (a `string[]` becomes a `FormData`);  `required`
  runs `Validator` into `setValidity(flags, message, anchor)` with `:state(invalid)`;  reset restores the
  connect-time value;  a disabled `<fieldset>` disables the control.
- **Submit buttons:**  `<ui-button type="submit">` calls `internals.form.requestSubmit()`, sending `name=value` by
  setting the button's form value for the duration (a custom element can't be the form's `submitter`).
  **Known gap:**  Enter in a text field doesn't find a custom element as the form's default button.
- **Keyboard:**  `delegatesFocus`;  the APG combobox pattern with real key events (arrows, Home / End, PageUp /
  PageDown, Enter, Space, Tab, Escape routed by `UI.overlays`, type-ahead, Backspace removing the last label).
- **ARIA:**  `aria-activedescendant` needs the listbox in the combobox's own shadow root, so rich `<ui-item>`
  content is PROJECTED into its row;  the combobox is named from `placeholder` (else `text`, else `name`);  a host
  `aria-label` is forwarded to the inner control.
- **axe** passes on every element-markup example (`src/components/<name>/examples/elements/`, 39 files),
  `color-contrast` included (text inside a `.ui.disabled` element exempt, as WCAG exempts inactive components --
  `test/a11y.ts`), with `heading-order` off for two pages of heading demos;  and on every family's native fallback.

## SSR / Declarative Shadow DOM

**DIY, no hydration.**  The fork has no server render yet.  `test/ssr.ssr.test.tsx` (node project) renders the
REAL `UIButton` controller under `@solidjs/web`'s server `renderToString` against a stub host, and wraps it in
`<template shadowrootmode="open" shadowrootdelegatesfocus>` with the foundation CSS + `button.css` inlined.  The
browser half (`test/dsd.test.ts`) parses it with `setHTMLUnsafe`, paints a styled button before any script, then
defines the element:  the fork ADOPTS the declarative root and empties it before its first render.

- The client render replaces the server markup.
- Inlined CSS is about 147 kB per instance uncompressed (DSD has no shared constructable sheets).
- The `ssr` project needs its own Solid plugin instance and `test.css` enabled;  anything that reads the DOM in a
  constructor needs an `isServer` guard.  `yarn test` runs `ssr` first:  `dsd.test.ts` imports its output.

## Error handling & native fallback

- **Boundary:**  the fork's error boundary (on by default) around each element's render.  A throw in the
  constructor, in render, in a memo during an update or in an effect stays local:  the element stops rendering, a
  sibling keeps updating, new elements still render.  Without it (`errorBoundary: false`) the same throw logs
  `[REACTIVITY_HALTED]` and the sibling freezes (tested, `test/isolation.test.tsx`).
- **Hook:**  `UIElement.define()` passes the fork's `onError` (ONE `console.error` naming the tag, a cancelable,
  bubbling, composed `ui-error` with `detail: { error }`;  the fork sets `:state(errored)`) and `fallback`:
  unless `ui-error` was cancelled, the family's `@proto static Fallback` builds its native DOM into the shadow
  root a microtask later.  An element without one (groups, `ui-item`, `ui-or`) gets a bare `<slot>`.
- **What degrades** is listed per family in `docs/fallback.md`;  in short:  button loses `ui-toggle`, the glyph
  and the spinner;  the dropdown becomes a native `<select>` (form value, validity, `host.value` and `ui-change`
  keep working);  parts lose `:state(in-<owner>)` styling.
- **Tests:**  `test/fallback.cases.ts`, run by `test/fallback.test.tsx` through a `FallbackAdapter`
  (`ElementFixture.breakRender()` makes a RENDERED element's next update throw).  All 7 pass, axe included.

## Translation

- `UIButton.define("ie-boton", es)` and `UIDropdown.define("ie-desplegable", es)`, with a 20-line dictionary
  (`test/dictionary.es.ts`):  `test/translate.test.tsx`, `tools/demo/translate.html` (dev) and
  `tools/smoke/translate.html` (from `dist/`).
- A second `ElementDefinition` for the same controller class, from the localized vocabulary:  localized attribute
  AND property names (`primario`, `"primario" in el`) under the SAME canonical keys.  Classes stay canonical;
  events are localized (`ie-cambio`).  A canonical attribute the dictionary doesn't translate still works.

## Testing

- **Suite:**  Vitest, two projects:  `browser` (chromium;  `UI_TEST_ALL=1` adds firefox and webkit) and `ssr`
  (node).  Component tests live beside their component (`<name>.test.tsx`);  cross-family ones in `test/`
  (fallback, isolation, translate, SSR, DSD).  The class-grammar CSS tests (`<name>.css.test.ts`) stay:  they test
  the sheets on static markup, which the element tests don't cover.
- **Synchronization:**  `UIHost.ready` + `flush()` (`ElementFixture.render()` / `settle()` / `tick()`);  no sleeps
  except the type-ahead buffer.
- **Halts:**  the fork's boundary keeps one bug from hanging unrelated tests;  a 10 s `testTimeout` stays as a
  guard.
- **Recording numbers:**  `commands.writeFile` (browser-test console output doesn't reach the terminal):  the
  perf test writes `tools/results/perf-results.json`.

## Risks

- **RC churn:**  `solid-js` 2.0 went from rc.0 (2026-08-12) to rc.11 (2026-09-28);  `@solidjs/vite-plugin`
  published 20 `3.0.0-next` builds in the same window.  Exact pins are mandatory;  the fork pins its peers.
- **Owning a fork:**  `@spell/solid-element` (15 modules, 121 tests) is ours until upstream takes it.
  `UPSTREAM.md` maps each fix to a PR against `solidjs/solid` `next` `packages/element`;  nothing is filed without
  Owen's go-ahead.
- **One Solid per page, or context stops:**  sharing works only when app and components resolve to ONE copy.
  Linked peers need `dedupe` everywhere (Vite configs, vendor build, library measurement), or a second Solid
  sneaks in silently.
- **`keepAlive` retention** (Element core);  **React rejected-change drift** (Framework hosts);  **no hydration**
  (SSR).
- **Runtime budget:**  the lazy runtime chunk alone is about 27 kB min+gz against a 20 kB plan budget.

## Foundation bugs

Open (from the spikes;  none changed by the promotion):
1. ~~**Palette contrast.**~~  Fixed:  per-colour `--ui-<colour>-on` foregrounds picked by WCAG contrast at
   generation time, darker red / green / blue / pink, `-text` capped at L 0.5 (`docs/theming.md`, "Contrast";
   `src/styles/colors.contrast.test.ts`).
2. `src/components/parts/parts.css`:  an in-feed `.date` outside a summary is a `<time>` with no `display`, so it
   stays inline (Fomantic's is a block).
3. `src/components/segment/examples/variations.html`:  `ui top seamless attached segment` breaks the grammar
   order, so `[class*="top attached"]` never matches the static fragment;  the element emits
   `seamless top attached`.
4. `src/components/label/examples/content.html` (`aria-label` on a role-less span) and inputs with no accessible
   name in `label/examples/{content,types}.html`.
5. `heading-order`:  `parts/examples/header.html` and `segment/examples/variations.html` fail it (originals too).
6. **Tag clash:**  the parts' `in-item` owner (Fomantic's `.items > .item`) vs the dropdown's `<ui-item>`;  the
   test stub is `stub-item`.
7. **Text keys are one flat namespace:**  `loading` in both `button` and `segment` vocabularies.
8. **Segment owns no parts:**  an owner of TOKENS only, and a barrier for part lookup.
9. `src/components/button/examples/types.html`:  the `left labeled` example's inner icon button has no accessible
   name (axe `button-name`).

## Appendix: history

The base library was chosen by building the same eight families twice, on Lit 3.3 and on Solid 2.0 RC, with
shared measuring tools:  the comparison and the decision (Owen, 2026-09-30:  Solid 2) are in
`docs/spike-lit-vs-solid.md`.  The spikes lived in `spike/` until this promotion:
- `git checkout archive/lit-spike -- spike/lit` restores the Lit spike and its report
- tag `archive/spikes` is the last commit with `spike/` (the Solid spike, the fork before its move to
  `packages/`, the shared tooling, the icon-loading experiment);  the Solid spike's full report was
  `spike/solid/REPORT.md` there

Spike-era numbers worth keeping:
- **Milestone 0** (button + dropdown, on `@solidjs/element` + `component-register`, Solid bundled into each
  build):  `ui-button` alone 47.71 kB;  a page with one `<ui-button>` first loaded 90.48 kB (eager icon aliases
  14.68, `UIRuntime` 28.09).  Workarounds then:  a capturing registry for base class / form association / shadow
  options, our own `convert()` / `reflect()` (bare booleans parsed false, `true` reflected `"true"`), a
  pre-upgrade property stash;  reconnect re-rendered from scratch;  one uncaught error halted every Solid element.
- **Batch 1** (icon, label, parts, divider, segment, container):  a per-element error boundary (+1.42 kB), the
  removal HACK for bare booleans, `safeKey()` renaming `style` / `hidden`;  274 tests.
- **Shared runtime + fork** (the round before promotion):  peers externalized, `core` + `forms` entries, the fork
  replacing ~120 code lines of workarounds, native fallbacks, HMR;  283 tests + 108 in the fork (121 by the
  promotion).  Element core before / after the fork:  1599 / 868 => 1592 / 845 lines / code lines.
- **Promotion** (this report):  `spike/solid` => `src/`, `spike/shared` => `tools/`, the fork =>
  `packages/solid-element`;  the identity probe moved into the host page (vendored Solid 59.9 => 30.4 kB);
  `Vocabulary.replace()` replaced the HMR vocabulary HACK.
