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
- 2026-09-29 · Same inherited-`exclude` `TS18003` in `spike/solid` (`yarn tsc --noEmit`). · Override `exclude` in
  `spike/solid/tsconfig.json`. · spell/ui spike/solid
- 2026-09-29 · No lint / format commands in `spike/solid` once the root configs ignore `spike/`;  also oxlint 1.86
  prints NOTHING on a clean run, which looks like "linted nothing". · `spike/solid/.oxlintrc.json` (a copy of the
  root's without the spike ignore) + `yarn oxlint` / `yarn oxfmt --check .` scripts;  checked with a planted
  `debugger`. · spell/ui spike/solid
- 2026-09-29 · `UIElement.define()` with no tag registered a test vocabulary `tag: "stub-card"` as `ui-card`:
  `Vocabulary.define()` derives the tag from prefix + noun, ignoring `vocabulary.tag`. · Pass the tag:
  `define(vocabulary.tag)` (`StubOwner`). · spell/ui spike/solid
- 2026-09-29 · Solid's JSX types have no custom-element tags (`<ui-segment>` in a test's JSX is TS2339). ·
  `<Dynamic component="ui-segment">`. · spell/ui spike/solid
- 2026-09-29 · A test that deliberately lets an error escape Solid (to show the halt) got "Vitest caught 1 unhandled
  error":  the throw resurfaces from Solid's queued microtask flush, outside the test's `try`. · Call `flush()`
  synchronously inside the `try` right after the write (`src/errors/isolation.test.tsx`);  run it LAST in the file,
  since a halt poisons the scheduler for later tests even after `resetErrorHalt()`. · spell/ui spike/solid
- 2026-09-29 · Two spike agents share one scratchpad directory:  screenshot names collided (`label-types.png`). ·
  Solid writes to `spike/solid/.cache/screenshots/` (`yarn screenshots`). · spell/ui spike/solid
- 2026-09-29 · Solid 2 rc.11 `useContext(ctx)` THROWS ("Context must either be created with a default value or a
  value must be provided") when the context was created with `undefined` as its default and no provider is
  above. · Create optional contexts with `null` as the default (`createContext<T | null>(null)`). ·
  spike/solid-element
- 2026-09-29 · A Solid scheduler halt (`[REACTIVITY_HALTED]`) is reported ASYNCHRONOUSLY, so a test reproducing
  it fails the Vitest browser run with an "unhandled error" even inside `try` / `catch` around `flush()`. ·
  Vitest's `error-catcher` only logs when a USER `error` listener exists:  add a `window` `error` listener
  (`preventDefault()`) and keep it up for one task (`setTimeout(0)`);  `resetErrorHalt()` in `afterEach`.  See
  `spike/solid-element/src/errors.test.tsx`. · spike/solid-element
- 2026-09-29 · Solid 2 rc.11 `<For each={strings}>{(item) => …}</For>`:  `item` is the VALUE, not an accessor
  (`item()` throws `item is not a function`). · Use it directly. · spike/solid-element
- 2026-09-29 · Solid 2's `createContext` provider evaluates `children` in a LAZY memo:  a component called from
  a provider's `children` getter runs tracked (re-running whenever a prop read in its body changes) and not at
  all until read. · `untrack()` inside the getter, and read the returned accessor once to run it now.  See
  `spike/solid-element/src/withSolid.ts`. · spike/solid-element
- 2026-09-29 · `vite.build({ configFile, build: { lib: { entry: { button } } } })` does NOT build `button` alone:
  Vite `mergeConfig()`s inline options into the file config and UNIONS `build.lib.entry` objects, so every
  "alone" build in the old `spike/lit/measure.ts` really had all eight entries (inflating batch 1's "alone"
  numbers by up to 4 kB). · Load the file once with `vite.loadConfigFromFile()`, replace `lib.entry` (and
  `external`) yourself, pass `configFile: false` -- `spike/shared/SpikeMeasure.ts`. · spike/shared
- 2026-09-29 · Vite lib mode with entries that import each other (`button.js` => `core.js`) emits every entry as a
  0.1 kB facade re-exporting a hashed chunk (`core.js` => `core-<hash>.js`):  lib mode defaults
  `preserveEntrySignatures` to `strict`. · `rolldownOptions.preserveEntrySignatures: "allow-extension"`. ·
  spike/lit
- 2026-09-29 · A virtual lib entry (`lib.entry: { lit: "virtual:lit" }`) fails `[UNRESOLVED_ENTRY]`:  lib mode
  resolves entries against `root` first, so the plugin's `resolveId` sees `/abs/root/virtual:lit`. · Match the
  marker anywhere in the id (`id.indexOf(VIRTUAL)`) -- `spike/shared/PeerVendor.ts`. · spike/shared
- 2026-09-29 · Tooling in `spike/shared` typed `vite: typeof import("vite")` won't accept a spike's `vite`
  module:  two installs, and vitest augments the spike's `ResolvedConfig` (`Property 'test' is missing`). ·
  Structural `ViteLike` with `build: (config: any) => …`;  call sites write the config `satisfies InlineConfig`. ·
  spike/shared
- 2026-09-29 · Adding a custom tag to Solid 2's JSX:  `declare module "@solidjs/web" { namespace JSX … }` fails
  (`Invalid module name in augmentation`), because `@solidjs/web` only RE-EXPORTS `JSX`. · Augment the defining
  module, `declare module "@solidjs/web/types/jsx.js"` (the package exports `./types/*`) --
  `spike/shared/frameworks/solid/app.tsx`. · spike/shared
- 2026-09-29 · Foundation commit `33b89e5` (icon `style` => `variant`, label `image` string, divider `hidden`
  spacing) broke 4 Lit spike tests + `yarn ts`, unnoticed:  the root `yarn review` doesn't run the spikes. ·
  Adapted the spike;  run a spike's `yarn ts && yarn test` after vocabulary changes while spikes exist. · spike/lit
- 2026-09-29 · `yarn review` stops in `lint:fix` although `src/` is clean:  root `oxlint` walks into
  `spike/*/` and fails on their own configs (`options.typeAware is only supported in the root config, but it
  was found in spike/icons/.oxlintrc.json`;  earlier `no-base-to-string` in `spike/solid-element/src/props.ts`),
  because a nested `.oxlintrc.json` is still parsed despite root `ignorePatterns: ["spike/**"]`. · Lint just
  the package with `yarn oxlint src test`, then run `yarn tsc`, `yarn oxfmt --check src`, `yarn vitest run` by
  hand;  spikes should drop `typeAware` from their own oxlint configs. · spell/ui
- 2026-09-29 · Cache-warm measurements over HTTP/2 with a throwaway certificate:  `fetch()` re-downloaded every
  file on the second visit while `<script type=module>` / CSS `mask` did not (looked like `fetch` "not caching"). ·
  Chromium never writes responses with certificate errors to its HTTP cache (`--ignore-certificate-errors` /
  `ignoreHTTPSErrors` keep the error);  the Blink memory cache still served the other resource types. Launch with
  `--ignore-certificate-errors-spki-list=<sha256 of the public key>` instead -- `spike/icons/TestServer.ts`. ·
  spike/icons
- 2026-09-29 · Playwright `ariaSnapshot()` showed an empty tree for `<x-icon label="...">` whose role / name come from
  `ElementInternals` (and for `display: contents` hosts):  it reads DOM attributes, not Chromium's accessibility
  tree. · Read the real tree over CDP (`Accessibility.getFullAXTree`) -- `spike/icons/test.ts`. · spike/icons
- 2026-09-29 · `page.evaluate(fn)` from a `tsx` script threw `__name is not defined`:  tsx compiles with esbuild
  `keepNames`, which wraps named inner functions in a `__name()` helper the page doesn't have. · `addInitScript("window.__name = (t) => t")`
  -- `spike/icons/test.ts`. · spike/icons
- 2026-09-29 · A LINKED peer (`"@spell/solid-element": "link:../solid-element"`) silently brought a second Solid:
  Vite resolves the symlink to its real path, so the fork's `import "solid-js"` resolved from
  `spike/solid-element/node_modules` -- the vendored `@spell/solid-element.js` carried its own signals runtime
  (65 kB instead of 11), which breaks owner / context sharing with the app. · `resolve.dedupe` on every peer package
  in every build that bundles peers:  the spike's `vite.shared.ts`, `PeerVendor` and `SpikeMeasure`'s `library`
  build (both now dedupe `packageOf()` of each specifier). · spike/solid
- 2026-09-29 · Splitting a lib build into two shared entries (`core`, `forms`):  `dist/core.js` became a facade and
  a hashed `UIElement-<hash>.js` held the element core, because `forms` imported core LEAF files, so Rolldown saw
  modules reached by two independent entries. · Import the shared code through the `core` ENTRY (`./core`) from
  `forms`;  `SpikeMeasure`'s `coreOutsideCore` check now flags it. · spike/solid
- 2026-09-29 · Standalone ("library bundled") sizes doubled (button 41 => 81 kB) after adding the Solid identity
  hook to `core.ts`:  `import * as SolidJs from "solid-js"` stored in a global keeps every export alive, so nothing
  tree-shakes. · Moved the hook to `src/identity.ts`, loaded by the `index` entry only (what the host page
  imports). · spike/solid
- 2026-09-29 · Measuring the peer library "as used" needs the names each chunk imports from `lit` / `solid-js`,
  but Rolldown 1.2.11's `OutputChunk` has no `importedBindings` (Rollup's does), only `imports` (specifiers). ·
  `SpikeMeasure.importedBindings()` parses the emitted `import { a as b } from "x"` statements (Rolldown prints
  them plainly);  `PeerVendor` reuses it on `dist/`. · spell/ui spikes
- 2026-09-29 · `yarn dev` in `spike/solid` dies loading `vite.config.ts`:  `ERR_UNKNOWN_FILE_EXTENSION ".ts" for
  .../spike/solid-element/src/vite.ts`.  Vite 8 bundles a config with EVERY bare import external -- linked
  packages too -- so Node 22.17 imports `@spell/solid-element/vite` itself, and can't load `.ts` (tsx-run scripts
  like `yarn test:hmr` hide it). · The fork builds the plugin to `dist/vite.js` (`vite.node.config.ts`, second
  step of its `yarn build`);  `exports["./vite"].default` points there.  Build the fork once before `yarn dev`. ·
  spike/solid-element
- 2026-09-29 · A `?inline` CSS module's own `import.meta.hot.accept()` never takes:  Vite's `vite:css-analysis`
  resets `isSelfAccepting = false` for `?inline` on every transform, and import analysis skips CSS requests, so
  the module graph never records the accept;  the update climbs to the importers and re-renders them. · The HMR
  plugin sets `mod.isSelfAccepting = true` for its style modules in its `hotUpdate` hook. · spike/solid-element
- 2026-09-29 · Playwright `page.evaluate(fn)` from a tsx-run script throws `ReferenceError: __name is not
  defined`:  tsx compiles with esbuild `keepNames`, which wraps named inner functions (and `const f = () => ...`)
  in `__name(...)`, and that call is serialized into the page. · `page.addInitScript("globalThis.__name = (fn) =>
  fn")` (`test/hmr.e2e.ts`). · spike/solid
- 2026-09-29 · HMR of a component whose vocabulary module re-ran:  `Vocabulary.register(): <ui-button> is already
  registered` -- it accepts the SAME vocabulary object twice ("HMR, double imports" in its docs) but a re-run
  module makes a NEW object. · `HotDefinitions` drops the old entry from `UI.vocabulary.vocabularies` before
  re-defining;  a `Vocabulary.replace()` in `src/` would be cleaner. · spike/solid
- 2026-09-29 · Icons: a bundler-visible pattern (`import(`./data/${x}.json`)`, `new URL(`./glyphs/${x}.js`, import.meta.url)`)
  globs and emits EVERY matching file (search.json, or all 2,163 glyphs) . · `Icons.#loadGlyph()` builds the URL from
  `Icons.glyphBase || import.meta.url` in a getter plus `/* @vite-ignore */`, so no pattern is visible;  verified by a
  scratch `vite build` of `src/icons/index.ts` (no per-icon output).  Supersedes the two earlier icon entries above
  (oxfmt reformatting and `INEFFECTIVE_DYNAMIC_IMPORT`):  `data/` is oxfmt-ignored, glyph loading is not a glob. · spell/ui
- 2026-09-29 · Promoting the Solid spike:  `import { defineConfig } from "vite"` in `vite.config.ts` failed under
  `tsx` (`does not provide an export named 'defineConfig'`) after adding a `tsconfig` `paths` pin
  `"vite": ["./node_modules/vite/dist/node/index.d.ts"]` -- `tsx` honours `paths` at RUNTIME, so `vite` resolved to
  a `.d.ts`.  The pin was there because the fork's HMR plugin, imported from source, types against the fork's OWN
  `vite` install, whose `Plugin` TypeScript won't unify with the root's. · No `paths` pin;  `hotElements()` casts
  the fork's plugin through `unknown` (HACK comment in `vite.config.ts`). · spell/ui
- 2026-09-29 · `src/index.ts` re-exporting `$/styles` (a pure re-export, no entry of its own) made Rolldown put the
  foundation sheets INTO `index.js`, and the lazy `UIRuntime` chunk then imported `./index.js` -- i.e. loading the
  runtime on a button-only page would load every family.  Only visible in the real `dist/` (the measured build has
  no `index` entry). · `styles` is its own lib entry (`dist/styles.js`, `@spell/ui/styles`);  check
  `grep '^import' dist/UIRuntime-*.js` after touching `index.ts`. · spell/ui
- 2026-09-29 · `export * as E from "$/elements"` in `src/index.ts` moves Rolldown's runtime helpers (`__name`,
  `__exportAll`) out of `core.js` into a shared `rolldown-runtime-<hash>.js` that EVERY chunk imports (0.29 kB, one
  more request per page). · Fixed:  the namespaces moved to an `api` entry (`src/api.ts`);  namespacing a barrel
  `core` also reaches (`$/vocabulary`) still split the runtime, so `V` namespaces an api-only re-export
  (`vocabulary.api.ts`), and `api.ts` imports `$/forms` or the `forms` leaves split out of `forms.js` too.
  `yarn measure`'s `runtimeChunks` check guards it. · spell/ui
- 2026-09-29 · Import-map smoke pages failed with `The requested module 'solid-js' does not provide an export
  named 'flush'` once `yarn vendor` tree-shook Solid:  page modules (`perf-adapter.js`, inline `<script>`s) import
  bindings `dist/` never does. · `PeerVendor`'s `usedBy` reads `.html` pages and `.js` modules too;  `cli.ts` lists
  `tools/frameworks`, `tools/smoke`, `tools/demo/fallback.html`. · spell/ui
- 2026-09-29 · Axe `heading-order` exemptions silently stopped matching when the element examples moved from
  `demo/examples/<name>/x.html` to `src/components/<name>/examples/elements/x.html` (`path.endsWith("parts/header.html")`).
  · Match the full tail (`parts/examples/elements/header.html`). · spell/ui
- 2026-09-29 · The docs site's production build drew no icons:  `Icons` fetches `glyphs/<style>/<name>.js` relative
  to its own chunk (`import.meta.url`), and Astro's client chunks live in `_astro/`, where nothing copied the
  glyphs. · `emitGlyphs("_astro/glyphs")` (exported from `vite.config.ts`) in `site/astro.config.mjs`;  client
  builds only. · spell/ui
- 2026-09-29 · Yarn 4 runs no `pre<script>` hooks, so "build the fork before dev / test" can't be a `predev`. ·
  Nothing in dev / test / site / build needs the fork's `dist/` any more (source via the `development` condition,
  an alias in the site, the HMR plugin imported relatively);  `yarn vendor` / `yarn measure` call
  `ForkBuild.ensure()` (install + build when stale). · spell/ui
- 2026-09-29 · A preview server from an earlier session held the Astro preview port:  `yarn site:preview --port
  4399` printed `Preview server already running at http://localhost:4391` and exited. · `astro preview status` /
  use the running one (it serves `site/dist/` from disk, so a rebuild is picked up). · spell/ui
- 2026-09-29 · `yarn site:build` / `yarn site:check` inside `site/` say `Couldn't find a script named
  "site:build"` -- those scripts only exist in the ROOT `package.json` (`site/` has plain `build` / `check`). ·
  Run `yarn site:*` from the repo root, or `yarn build` / `yarn check` from `site/`. · spell/ui
- 2026-09-29 · Astro `<script>` in a `.astro` component: `demo.querySelector<UIDropdown>(...)` fails
  `astro check` (`Type 'UIDropdown' does not satisfy the constraint 'Element'`) and `.options` is typed `{}` --
  the element classes aren't `HTMLElement`s to the site's tsconfig. · Type the query as
  `HTMLElement & { options: unknown[] }` (see `site/src/components/DropdownDemo.astro`). · spell/ui
- 2026-09-29 · MDX attribute `<ui-label image>` (bare boolean) reaches the element as `image="true"` and the browser
  requests `/components/parts/true` (404):  MDX makes bare attributes `="true"`, which is wrong for STRING
  attributes. · Give string attributes a real value in site examples. · spell/ui
- 2026-09-29 · A form layout test failed with every field full width:  Vitest's browser iframe is 414px wide
  by default, so `<ui-form>`'s container query (`@container ui-form (width < 768px)`) stacked the rows, even
  with `style="width: 800px"` on the slotted `<form>` (the CONTAINER is the form's shadow root box, sized by
  the `<ui-form>`'s parent). · Put the width on a WRAPPER around `<ui-form>` in tests. · spell/ui
- 2026-09-29 · `yarn smoke` failed every page with `The requested module '@spell/solid-element' does not provide
  an export named 'onFormAssociated'` after a component started using a fork export no family had used before:
  `vendor/` is tree-shaken to the bindings `dist/` imported LAST time. · `yarn vendor` again before
  `yarn smoke`. · spell/ui
- 2026-09-29 · A test spying `console.warn` never saw the `EFFECT_RELAY_TEAR` that `yarn screenshots` printed:
  Solid 2's relay / tear detectors live in the ATTRIBUTION engine (`@solidjs/signals/attribution`), which only
  runs after `attribution.enable()`, and "info"-severity findings never reach the console. · In the test:
  `attribution.enable()` (from `solid-js/attribution`), `OBSERVE!.diagnostics.capture()` (from `solid-js`), assert
  on `events.stop()` codes, `attribution.disable()` after (`checkbox.test.tsx`). · spell/ui
- 2026-09-29 · A `<ui-menu>`'s items silently stopped updating after `interactive` was toggled -- only when an
  EARLIER test had loaded the runtime.  Chased as a stale memo for an hour. · The fork parents a slotted child's
  reactive root under the owner stamped on its `<slot>`;  a slot re-created by `<Switch>` disposes them.  Create the
  slot once per render and move it (`SUSPECTED-BUGS.md`).  Reproduce ordering bugs with a trivial first test that
  just renders something. · spell/ui
- 2026-09-29 · `UIElement.define()` without a tag registered a test owner (`x-item-owner`) as `ui-item-owner`;
  `customElements.get("x-item-owner")` was `undefined` and every test just saw un-owned items. · Pass the tag:
  `.define(vocabulary.tag)`. · spell/ui
- 2026-09-29 · Rules placed DIRECTLY in `@layer ui.components` (the old `native.css` table block) beat every rule
  in its sublayers (`ui.components.table.*`), silently overriding `table.css`. · Never put rules directly in a
  parent layer that has sublayers;  a rule dump (`Sheets.rules`) found it. · spell/ui
- 2026-09-29 · The Vitest browser viewport is narrower than 768px by default, so static tables / menus render in
  their MOBILE (stacked) layout in CSS tests. · `page.viewport(1000, 800)` in the test (restore on finish), see
  `menu.css.test.ts` `resize()`. · spell/ui
- 2026-09-29 · `getComputedStyle(el, "::before").content` returns the `counters(...)` expression, not the rendered
  number, so list numbering can only be checked by screenshot. · spell/ui
- 2026-09-29 · axe's `aria-required-children` fails a `role=menubar` whose children are focusable custom-element
  hosts:  it can't see `ElementInternals` roles (`role=none`), so a `tabindex` on the host reads as an unknown
  focusable child. · Rove focus over the items' inner boxes (`UIItem.focusTarget`), never the hosts. · spell/ui
