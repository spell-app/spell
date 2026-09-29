# Papercuts

Log of things that slowed down development. Date · symptom · fix · project.

- 2026-09-28 · `yarn install` with the global yarn (volta, 4.9.2) dies in the fetch step:
  `ENOENT ... lstat '/node_modules/typescript/lib/_tsc.js'` -- yarn's builtin `compat/typescript` patch
  predates TypeScript 7, whose package has no `_tsc.js`. · Pinned the repo to yarn 4.18.0 (as `spell/parser`)
  with `yarn set version 4.18.0` -- `.yarn/releases/` + `yarnPath` in `.yarnrc.yml`. · spell/ui
- 2026-09-28 · yarn 4.18 then refuses `oxfmt@^0.71.0`: `All versions satisfying "^0.71.0" are quarantined`
  (new default minimum release age). · `npmMinimalAgeGate: 0` in `.yarnrc.yml`, as `spell/parser`. · spell/ui
- 2026-09-28 · `yarn build` fails loading `vite.config.ts`: `[unplugin-dts] The installed "typescript" package
  does not provide the JavaScript Compiler API (this happens with TypeScript 7+)`.  `vite-plugin-dts` 5 needs
  the TS 6 JS API. · `yarn add -D @typescript/typescript6`, which it falls back to automatically. · spell/ui
- 2026-09-28 · SIDE EFFECT of the above:  `@typescript/typescript6` depends on `typescript@^6`, which the
  node-modules linker hoists as `node_modules/@typescript/old` AND links as `node_modules/.bin/tsc` -- so
  `npx tsc` / `node_modules/.bin/tsc` run TypeScript 6.0.3, not 7. · Always `yarn tsc` (yarn resolves the
  workspace's own `typescript@7`);  package scripts are fine.  Check with `yarn tsc --version`. · spell/ui
- 2026-09-28 · Vite 8 deprecates `build.rollupOptions` (still accepted) in favour of `build.rolldownOptions`;
  `output.keepNames` lives there now. · Use `rolldownOptions` in `vite.config.ts`. · spell/ui
- 2026-09-28 · Vitest 5 browser mode prints `Plugin "vitest:mocks:interceptor" defines Vite-specific hooks
  (configureServer) in a plugin returned from applyToEnvironment. These hooks will be ignored.` on every run.
  Harmless:  it's Vitest's own plugin, tests run fine. · Ignore until Vitest fixes it. · spell/ui
- 2026-09-28 · Vitest 5 browser config shape (changed in v4):  provider is a FACTORY imported from its own
  package -- `import { playwright } from "@vitest/browser-playwright"`, `provider: playwright()` -- not the
  string `"playwright"`, and browsers are `instances: [{ browser: "chromium" }]`, not `name:`.  Test helpers
  import from `vitest/browser`, not `@vitest/browser/context`. · See `vitest.config.ts`. · spell/ui
- 2026-09-28 · Tests under `src/` can't import `test/fixture.ts` without `../../test/fixture`:  the `$` alias
  only covers `src/`, and `AGENTS.md` says NEVER start an import with `../`. · `src/runtime/*.test.ts` use the
  relative path for now;  a `$test/*` alias (tsconfig `paths` + both vite configs) would fix it. · spell/ui
- 2026-09-28 · TypeScript 7's DOM lib has no `CloseWatcher`, and after a failed `instanceof HTMLStyleElement`
  it narrows `HTMLLinkElement | HTMLStyleElement` to `never` (the two are structurally close). · Minimal
  `CloseWatcherLike` type in `runtime.types.ts`;  test `instanceof HTMLLinkElement` first. · spell/ui
- 2026-09-28 · Checking that `load()` code-splits needs a build:  browser-mode tests can't read `dist/`, and a
  scratch `vite.config.ts` outside the repo can't resolve `vite` (`MODULE_NOT_FOUND`). · Drive the Vite JS
  API from a scratch `.mts` with `node --experimental-strip-types` (node 22.17), importing
  `node_modules/vite/dist/node/index.js` and `vite.decorators.ts` by absolute path.  Left as `it.todo` in
  `UIRuntime.test.ts`. · spell/ui
- 2026-09-28 · `oxfmt --check` on a JSON file doesn't just report -- it (like plain `oxfmt`) rewrites the
  file to pretty-printed (2-space) JSON in place;  `.oxfmtrc.json`'s `ignorePatterns` doesn't exclude
  generated data (`src/icons/data/*.json`), so every `yarn review` inflates it by ~4-15% (a long
  `[width, height, path]` tuple explodes across 5 lines past the 120-col print width). · Tuned
  `gen-icons.ts`'s `MAX_CHUNK_BYTES` / `SEARCH_TERMS_CAP` against the POST-format size instead of the
  compact size it first writes -- see `docs/icons.md`'s "A papercut: oxfmt reformats generated JSON". ·
  spell/ui
- 2026-09-28 · `tsc` (whole-project `yarn ts`) fails on an unrelated in-progress file
  (`src/styles/styles.types.ts` -> missing `./styles.vocabulary.en`) from parallel work elsewhere in the
  repo, blocking `yarn review` for everyone until that lands. · Verified `src/icons/` and
  `scripts/gen-icons.ts` independently with a scoped `tsc -p <temp config>` (`types: []`/explicit
  `typeRoots`, `include` limited to this pipeline's files) instead of waiting. · spell/ui
- 2026-09-28 · Tests under `src/` can't reach the shared test utils (`test/fixture.ts`, `test/a11y.ts`) by the
  `$/...` rule:  `$` maps to `src/`, and `AGENTS.md` bans `../` imports. · `OwnerContext.test.ts` renders into
  its own container instead.  Fix:  add a `$test` (or `$/../test`) alias in `tsconfig.json` + `vitest.config.ts`. · spell/ui
- 2026-09-28 · oxlint's type-aware `no-base-to-string` fires on `${value}` / `String(value)` when `value: unknown`
  (e.g. `ClassBuilder` reading a `Record<string, unknown>` bag), even though `restrict-template-expressions`
  is off. · Narrow first (`typeof value === "string" | "number"`), see `ClassBuilder.text()`. · spell/ui
- 2026-09-28 · Vite's default Lightning CSS targets (`baseline-widely-available`) LOWER `light-dark()` in every
  `?inline` / imported sheet into `var(--lightningcss-light, a) var(--lightningcss-dark, b)` plus a
  `@media (prefers-color-scheme)` switch, and add hex + `@supports (color: lab())` fallbacks for OKLCH literals.
  In a custom property the `var()`s substitute where the token is DECLARED (`:root`), so every `.ui-dark` /
  inverted subtree silently keeps the page's scheme. · Needs `css.lightningcss.targets` set to modern browsers
  in `vite.config.ts` AND `vitest.config.ts`, e.g. `{ chrome: 125 << 16, safari: 26 << 16, firefox: 147 << 16 }`
  (verified:  `styles.test.ts` passes 20/20 with it, and its barrel `light-dark()` test is skipped until then). ·
  spell/ui
- 2026-09-28 · `@property` rules inside a shadow root's (adopted) stylesheet are IGNORED in Chromium -- only the
  document registers custom properties. · Register in page-level sheets only;  never rely on a registration
  (or its `initial-value`) inside a component's own CSS. · spell/ui
- 2026-09-28 · A registered `<color>` custom property resolves `light-dark()` where it is DECLARED, so
  `@property --ui-red { syntax: "<color>" }` + `:root { --ui-red: light-dark(a, b) }` freezes `:root`'s scheme
  into `.ui-dark` subtrees (unregistered, the token stream resolves where it is USED). · Register only the
  concrete per-scheme bases (`--ui-red-on-light` / `-on-dark`);  keep `light-dark()` tokens unregistered. · spell/ui
- 2026-09-28 · oxfmt formats `.css` too (prettier style), including generated sheets. · `yarn gen:styles` runs
  oxfmt over its output, and `styles.test.ts` compares generated vs committed CSS with whitespace stripped. · spell/ui
- 2026-09-28 · `scripts/*.ts` sit in no tsconfig, so `yarn ts` never type-checks them. · Added
  `scripts/tsconfig.json` (extends `tsconfig.node.json`, `$` paths, DOM lib);  `yarn gen:styles` runs
  `tsc -p scripts` first.  Consider adding it to `yarn ts`. · spell/ui
- 2026-09-28 · `console.log` inside a Vitest browser-mode test doesn't reach the terminal in this setup, which
  makes quick browser probes awkward. · Throw an `Error` with the values instead, or assert. · spell/ui
- 2026-09-28 · `yarn -s tsx ...` fails with `Unknown Syntax Error: Unsupported option name ("-s")` -- yarn 1's
  silent flag doesn't exist in yarn 4. · Drop `-s`;  redirect output instead. · spell/ui
- 2026-09-29 · Astro 7's MDX ignores `mdx({ remarkPlugins })` (and `markdown.remarkPlugins`):  the default
  Markdown processor is now Sätteri (Rust), which only runs its own `mdastPlugins` / `hastPlugins`;  the
  "ignored" warning is easy to miss in build output. · Wrote the plugin for Sätteri (`defineMdastPlugin` from
  `satteri`) and passed `mdx({ processor: satteri({ mdastPlugins }) })` (`site/astro.config.mjs`). · spell/ui site
- 2026-09-29 · MDX renders text on its own line inside an HTML element (`<p>⏎text⏎</p>`, which oxfmt produces
  on its own for long JSX) as a nested `<p>`:  invalid HTML, and wrong source in `Example`'s "Show code". ·
  `site/src/lib/unwrapHtmlParagraphs.ts` unwraps paragraphs inside lower-case JSX elements. · spell/ui site
- 2026-09-29 · Root `oxfmt .` formats `site/**/*.mdx` as markdown and rewrites a MULTI-line `{/* ... */}` JSX
  comment to `{/_ ... _/}`, which breaks the MDX build (`Unterminated regular expression`).  It also collapses
  double spaces after periods in prose. · Only single-line `{/* */}` or `//` comments attached to the import
  block in MDX (documented in `site/README.md`);  or add `site/**/*.mdx` to `.oxfmtrc.json` `ignorePatterns`. ·
  spell/ui site
- 2026-09-29 · MDX has no bundled `<script>`:  it's JSX, emitted as-is, so `import`s in it fail at build
  (`ReferenceError`).  Component pages can't import `$/components/...` themselves. · `site/src/scripts/
  components.ts` (run by the layout) `import.meta.glob`s `$/components/*/*.ts` and loads the module for each
  undefined `ui-*` tag on the page;  anything more goes in an `.astro` component with a `<script>`. · spell/ui site
- 2026-09-29 · `astro check` (Astro 7.3) refuses TypeScript 7 ("does not currently support TypeScript 7.0"),
  and `@astrojs/check` 0.9 then fails to import with `Cannot find package '@emnapi/runtime'` (a missing peer of
  `@napi-rs/wasm-runtime`), which Astro reports as "not installed" and offers to `yarn add` it again. · `site/`
  pins `typescript@^6` and adds `@emnapi/runtime` + `@emnapi/core` as dev deps. · spell/ui site
- 2026-09-29 · Astro emits the page's own `<link id="ui-app-stylesheet">` BEFORE the bundled foundation
  (`import "$/styles/ui.css"`), so the site sheet's `@layer ui.app` was the first layer named -- the LOWEST. ·
  `site.css` `@import`s `$/styles/layers.css` first (resolved through the `$` alias by Lightning CSS). · spell/ui site
- 2026-09-29 · Astro + rolldown warn `MODULE_LEVEL_DIRECTIVE ... "use astro:head-inject" ... may not be
  preserved` for every content-collection `.mdx`.  Harmless (pages render, styles propagate). · Ignore. · spell/ui site
- 2026-09-29 · Site build warns `INEFFECTIVE_DYNAMIC_IMPORT` for `src/icons/data/aliases.json` /
  `fomantic-aliases.json`:  `Icons.ts`'s template `import(\`./data/${chunk}.json\`)` also matches the two maps
  it imports statically. · Harmless;  a narrower glob in `Icons.#loadChunk` would silence it. · spell/ui
- 2026-09-29 · `yarn dev` in Astro 7 starts the dev server DETACHED and returns;  stop it with
  `yarn astro dev stop` (or `status` / `logs`). · Noted in `site/README.md`. · spell/ui site
- 2026-09-29 · `page.screenshot({ path })` (from `vitest/browser`) to a path outside the repo fails with
  `Access denied to "..." See Vite config documentation for "server.fs"` -- the path goes through Vite's
  dev server, which only serves the project. · Write under the repo (e.g. `.cache/shots/`, which `yarn clean`
  removes) and move the files afterwards. · spell/ui
- 2026-09-29 · Porting a `.less` into the `types, content, variations, states` sublayers:  Fomantic's
  "Content" rules (`.ui.dropdown > .dropdown.icon`, `> .text`, `> .menu`) are BASE rules that its types
  override (`.ui.selection.dropdown > .dropdown.icon { position: absolute }`).  Put in the `content` layer
  they beat every type rule regardless of specificity -- the selection caret stopped being absolute and
  `.label ~ .text { display: none }` stopped working, with no error. · Keep a component's base element
  rules in `types`, ahead of the type rules;  `content` is for parts no type touches. · spell/ui
- 2026-09-29 · A relative selector inside `:is()` (`.ui.dropdown :is(> .text, .menu > .item) > .icon`) is
  invalid -- only `:has()` takes relative selectors -- and the browser silently drops the whole rule
  (lightningcss passes it through). · Spell the alternatives out as separate selectors in the list. · spell/ui
- 2026-09-29 · Root `tsconfig.json` includes `spike/` but has no alias for a spike's own `src/`, so a `$spike/*`
  alias (tsconfig `paths` + Vite) made root `yarn tsc` fail on every spike file -- and two spikes can't share
  one alias name anyway. · `spike/lit` imports its own files relatively (`../../elements`), a deliberate
  exception to the `$`-only import rule;  scripts that need node types start with `/// <reference types="node" />`. · spell/ui spike/lit
- 2026-09-29 · A spike package (own lockfile, own `vitest`) importing `$test/fixture` gets the ROOT copy of
  `vitest` (resolved from `test/`), i.e. a second runner:  `onTestFinished` / `afterEach` register nowhere. ·
  `resolve.dedupe: ["vitest", "axe-core"]` in the spike's Vite config;  also `server.fs.allow: [repo root]`, since
  the spike's lockfile makes Vite treat `spike/lit` as the workspace root. · spell/ui spike/lit
- 2026-09-29 · Lit base-class helper names collide with `HTMLElement` members:  a `part()` method breaks
  `HTMLElement.part` (and then EVERY standard `@property` / `@state` decorator on subclasses fails to type with
  "Unable to resolve signature of property decorator" -- the real error is far away);  `remove()` and a
  `get inert()` shadow DOM API. · Named them `partName()`, `removeValue()`, `locked`.  Check `name in
  HTMLElement.prototype` before naming an element method. · spell/ui spike/lit
- 2026-09-29 · Lit 3.3 `useDefault: true` on a property whose initial value is `undefined` records the FIRST
  real change as the default and swallows it (no update, no reflection). · Only use `useDefault` when the
  constructor sets a non-`undefined` start value (`VocabularyProperties.initialValue()`). · spell/ui spike/lit
- 2026-09-29 · Standard decorators make classes side-effectful, so a barrel re-exporting a decorated class
  (`FormElement`) drags it (and `Validator`) into every chunk that imports the barrel -- even unused. ·
  `"sideEffects"` in the package's `package.json` (as the root has);  button-only cost fell 4.1 KB gzip. · spell/ui spike/lit
- 2026-09-29 · Chromium's `CloseWatcher` GROUPS watchers created without an intervening user activation, so
  a test that opens a second overlay programmatically and presses Escape closes BOTH. · Press a real key
  (`userEvent.keyboard("{ArrowDown}")`) before opening the second overlay. · spell/ui spike/lit
- 2026-09-29 · Contract says "icon svg as FALLBACK content of `<slot name=icon>`", but `button.css` /
  `dropdown.css` size `.icon > svg` and `.icon > ::slotted(svg)`:  fallback content matches neither, so a
  labeled-icon glyph fills its whole block (same for `.text > img` inside the dropdown's `trigger` slot). ·
  Render the svg as a SIBLING of the slot.  Caught only by comparing screenshots with the class-grammar
  fragments. · spell/ui spike/lit
- 2026-09-29 · Solid 2 RC:  ONE uncaught error in any `@solidjs/element` component (a memo reading an
  undefined field) logs `[REACTIVITY_HALTED]` and freezes EVERY Solid element on the page -- later tests
  hung on `ready` until timeout (a 45-test file took 240 s). · Find the FIRST error above the halt;  give the
  browser project a `testTimeout` so a halt fails fast. · spell/ui spike/solid
- 2026-09-29 · Solid 2 memos compute EAGERLY:  a `createMemo` in a base-class constructor that calls an
  overridable method reads subclass fields that don't exist yet (`this.hasIcon is not a function`);  likewise a
  memo field initializer reading a signal assigned in the constructor BODY. · `{ lazy: true }` on base-class
  memos;  declare every signal as a field (`Cell`) above the memos that read it. · spell/ui spike/solid
- 2026-09-29 · `@solidjs/vite-plugin` picks its client / server posture from the `test.environment` of the config
  it was CREATED in, so a vitest project with `environment: "node"` under `extends: true` still gets the browser
  build (`renderToString is not supported in the browser`). · Give that project its own `solid()` instance
  (`spike/solid/vitest.config.ts`). · spell/ui spike/solid
- 2026-09-29 · Vitest stubs CSS imports in node tests, so `?inline` sheets are `""` there (a DSD string came out
  with an empty `<style>`). · `test.css: { include: [/.+/] }` on that project. · spell/ui spike/solid
- 2026-09-29 · A package in a sub-folder (`spike/solid/`) with its own `node_modules`:  `test/fixture.ts` and
  `test/a11y.ts` resolve `vitest` / `axe-core` from the REPO's `node_modules`, a second vitest instance
  (`onTestFinished` has no test).  Also Vite's `server.fs` refuses `../../src` and the first run reloads mid-test
  (`optimized dependencies changed`). · `resolve.dedupe: ["vitest", "axe-core", ...]`, `server.fs.allow: [repo]`,
  `optimizeDeps.include` (`spike/solid/vite.shared.ts`). · spell/ui spike/solid
- 2026-09-29 · `commands.writeFile()` (vitest browser) resolves paths from the PROJECT root, not the test file;
  `../../../x` escaped the repo and hit `server.fs` ("Access denied"). · Write to `.cache/...`. · spell/ui spike/solid
- 2026-09-29 · Root `tsconfig.json` `include`s `spike`, so root `yarn tsc` type-checks `spike/solid/**/*.tsx` without
  its `jsx` / `jsxImportSource` / `$spike` settings:  411 errors. · Spike-local `yarn tsc` is clean;  the root
  should exclude `spike/*` (each spike has its own tsconfig) -- NOT changed, outside the spike's remit. ·
  spell/ui spike/solid
- 2026-09-29 · rolldown (Vite 8.3) warns `advancedChunks option is deprecated, please use codeSplitting instead`;
  same `groups` shape. · `output.codeSplitting: { groups }`. · spell/ui spike/solid
- 2026-09-29 · After the root `tsconfig.json` started excluding `spike`, `spike/lit`'s `yarn ts` failed with
  `TS18003: No inputs were found`:  `exclude` is INHERITED through `extends` and its `../../spike` matches the
  spike's own files. · Override `"exclude": ["node_modules", "dist"]` in `spike/lit/tsconfig.json`. · spell/ui spike/lit
- 2026-09-29 · The root `.oxlintrc.json` ignores `spike/**`, and oxlint resolves `ignorePatterns` against the config
  that declares them, so running the root binary from a spike lints nothing. · `spike/lit/.oxlintrc.json`
  `extends` the root config with its own `ignorePatterns`;  `yarn lint` / `yarn format:check` in `spike/lit`. ·
  spell/ui spike/lit
- 2026-09-29 · Vitest's `cdp()` is typed as an empty `CDPSession` interface (`.send` is a TS error) unless the
  provider's types are loaded. · `/// <reference types="@vitest/browser-playwright" />` in the file that calls it
  (`spike/lit/src/testing/AXTree.ts`). · spell/ui spike/lit
- 2026-09-29 · `lit/static-html.js` discovered mid-run made Vite re-optimize and reload the test page
  ("Vite unexpectedly reloaded a test"). · List every `lit/*` subpath in `optimizeDeps.include`
  (`spike/lit/vite.config.ts`). · spell/ui spike/lit
