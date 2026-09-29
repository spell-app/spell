# `spike/shared` -- tooling every spike uses

Library-agnostic measurement, perf, smoke and report tooling, so the spike reports compare line by line:  same
builds, same buckets, same units, same pages, same table headers.  A self-contained yarn package (own
`node_modules`, pinned toolchain);  spikes import its `.ts` files directly.

| File | What |
|---|---|
| `shared.types.ts` | `SpikeConfig`, result shapes (`MeasureResults`, `PerfRecord`, `SmokeResults`, `LocResults`), `PerfAdapter`, `SolidIdentityHook` |
| `SpikeMeasure.ts` | in-memory `vite build` with the spike's own config, modules bucketed into library / shared entries (`core`, `forms` ...) / own per family / lazy;  the library AS USED (the bindings `dist/` imports) and in full;  per-family "what it imports";  standalone per-family builds for comparison;  structural checks;  `measure-results.json` |
| `PeerVendor.ts` | one ES module per peer specifier + `importmap.json`, for offline import-map pages (peer packages deduped:  ONE copy of each;  tree-shaken to the bindings `dist/` imports) |
| `PerfRun.ts` | the dropdown benchmark (browser):  1000 options, `"united sta"`, update / + layout / + frame |
| `LocCount.ts` | lines / code lines per file, four fixed groups |
| `ReportTables.ts` | rewrites the `generated:<name>` tables of a spike's `REPORT.md` |
| `SmokeRunner.ts` + `StaticServer.ts` | serves `frameworks/` + the spike's `dist/` + vendored peers from ONE static server, injects the import map, drives each page in headless chromium, `smoke-results.json` |
| `SharedBuild.ts` (`yarn build`) | compiles the Solid 2 host app ONCE and vendors `solid-js` / `@solidjs/web` for spikes without Solid |
| `frameworks/` | host pages `vanilla` / `react` (esm.sh) / `vue` (unpkg) / `solid` (Solid 2 app, `solid/app.tsx`) + `check.js` round trip, `perf.html` |
| `REPORT.template.md` | the ONE section list for every `REPORT.md` |
| `tests/fallback.cases.ts` | the native-fallback test cases every spike runs (library- and runner-agnostic, `FallbackAdapter`) |

Setup:  `cd spike/shared && yarn install && yarn build`.  Checks:  `yarn ts`, `yarn lint`, `yarn format:check`.

## Plugging a spike in

Reference:  `spike/solid/` (`spike.config.ts`, `spike.ts`, `peers.ts`, `demo/smoke/`).  Node-side scripts import the
barrel, `spike/shared/index.ts`;  browser code imports `$shared/PerfRun.ts`.

1. **Build.**  In the spike's `vite.config.ts`:
   - the base library is external, as a FUNCTION so subpaths match (Lit:  `/^lit(\/|$)|^lit-(html|element)(\/|$)|^@lit\//`;
     Solid:  `/^solid-js(\/|$)|^@solidjs\//` plus the element fork)
   - lib entries:  the SHARED entries, one per family, `index`.  Two shared entries:
     - `core` (`src/core.ts`) -- the element core AND the foundation it uses:  `$/util`, `$/vocabulary`, from
       `$/elements` `ClassBuilder` / `Shorthand` / `OwnerContext` / `NativeFallback` (+ its types), `$/runtime`
       (loader only), `$/icons`, `$/components/components.types`;  every family imports it
     - `forms` (`src/forms.ts`) -- what only form controls with a VALUE need:  the form-element base(s)
       (`FormElement`, `FormHost`), `Validator`, `MenuOptions`;  only the families that need it import it
       (today:  `dropdown`)
     - import `$/elements` LEAVES in both (`export * from "$/elements/ClassBuilder"`), never the barrel:  an
       `export *` of the barrel would make `Validator` / `MenuOptions` exports of `core`, i.e. `core` bytes
     - `forms` files import the element core through the `core` ENTRY (`./core`), never its leaves:  otherwise
       Rolldown hoists what the two share into a third, hashed chunk (the `coreOutsideCore` check catches it)
     - per-family native fallbacks (`$/components/<name>/<name>.fallback.ts`) stay in the family's own chunk
   - `rolldownOptions.preserveEntrySignatures: "allow-extension"` -- otherwise lib mode turns every entry into a
     facade over a hashed chunk
   - component files import the core through ONE path (`../../core`), and `forms` only if they need it, never
     `$/util` / `$/elements` directly
   - `$shared` alias to `spike/shared` in `vite.config.ts` and `tsconfig.json` `paths`
2. **`peers.ts`** at the spike root:  one `export * as <name> from "<specifier>"` line per peer specifier
   `dist/` imports.  `SpikeMeasure`'s `peersMissing` check lists any it lacks.

   The library is measured TWICE (`SpikeMeasure.library()`):
   - `library (as used)` -- the named bindings every emitted chunk imports from each specifier
     (`SpikeMeasure.importedBindings()` parses the chunks' `import { a, b } from "x"` statements;  a namespace
     import counts as the whole specifier), re-exported by one virtual entry, bundled once, tree-shaken, minified
     + gzipped like every tier.  What an app bundler ships;  the scenarios add THIS one.  It's the union over all
     families, not per family.
   - `library (full vendored)` -- `peers.ts` bundled as is:  every export of every specifier, what a plain
     import-map page downloaded while `vendor/` held whole packages.  For comparison only.

   `PeerVendor` vendors the as-used set too:  each `vendor/<specifier>.js` re-exports only the bindings the
   spike's built `dist/` imports (`usedBy`, default `dist`;  `false` for everything), so import-map pages download
   about the as-used size.  A namespace import (`import * as`), a specifier `dist/` never imports, or a missing
   `dist/` vendors the whole specifier -- so on the Solid spike, whose `index` entry loads the identity hook
   (`import * as` both Solid packages), only `@spell/solid-element` shrinks.  Run `yarn vendor` AFTER `yarn
   build`, and again whenever `dist/` starts importing a new binding (a page then fails with "does not provide an
   export named ...").
3. **`spike.config.ts`** exports a `SpikeConfig`:

   ```ts
   export const SPIKE: SpikeConfig = {
     name: "Solid",
     root: fileURLToPath(new URL("./", import.meta.url)),
     vite,                                      // `import * as vite from "vite"`:  the SPIKE's vite
     entries: { button: "src/components/button/index.ts", ... },   // family => entry
     shared: [                                  // in load order;  the FIRST is the one every family imports
       { name: "core", entry: "src/core.ts" },
       { name: "forms", entry: "src/forms.ts", description: "form base, validation, menu options" }
     ],
     external: (id) => SOLID_EXTERNAL.test(id),
     peerEntry: "peers.ts",
     groups(id) {                               // module id => bucket
       if (/\/node_modules\/(solid-js|@solidjs|@spell\/solid-element)\//.test(id)) return "library"
       if (/\/src\/(forms|FormElement|FormHost)\.ts$|\/src\/elements\/(Validator|MenuOptions)\.ts$/.test(id)) {
         return "shared:forms"                  // `shared:<name>` for every shared entry but the first
       }
       if (/\/spike\/solid\/src\/[\w.]+\.tsx?$/.test(id)) return "core"   // `core` ~== `shared:core`
       const family = /\/spike\/solid\/src\/components\/(\w+)\//.exec(id)?.[1]
       if (family) return `own:${family}:classes`
       return SpikeMeasure.foundationBucket(id) ?? "other"
     }
   }
   ```

   `SpikeMeasure.foundationBucket()` handles the shared `src/`:  `<name>.css` / `<name>.vocabulary.*` /
   `<name>.fallback.ts` => `own:<name>:css|vocabulary|fallback`, icon JSON => `icons`, runtime services +
   `styles/` => `runtime`, the rest => `core`.  Any `other` module fails the `unattributed` check;  a
   `shared:<name>` module outside `<name>.js` fails `coreOutsideCore`.

   Scenarios add, PER FAMILY, only the shared entries its chunk statically imports (`families` in
   `measure-results.json`):  "page with one button" = library (as used) + core + button (+ `forms` only if button
   imported it).  `coreEntry: "src/core.ts"` is still accepted as shorthand for `shared: [{ name: "core", entry }]`;
   results written that way have no `shared` / `families` / fallback sizes, and the tables fall back to `core` alone.
4. **Scripts** (Lit's `spike.ts` is a ready CLI;  copy it and change the imports / pages / LOC globs):

   | Script | Runs |
   |---|---|
   | `vendor` | `new PeerVendor({ vite, root, peerEntry }).build()` => `vendor/` + `vendor/importmap.json` (reads `dist/`) |
   | `measure` | `new SpikeMeasure(SPIKE).write()` => `measure-results.json` |
   | `smoke` | `yarn build`, then `new SmokeRunner({ spike, root, importMap, perfAdapter, pages }).run()` => `smoke-results.json` |
   | `serve` | the same server for a person:  prints each page URL |
   | `report` | `new LocCount(name, root, groups).count()` => `loc-results.json`, then `new ReportTables(root).write()` |

   `importMap` = `vendor/importmap.json`'s imports + `@spell/ui` => `/dist/index.js`, `@spell/ui/core`,
   `@spell/ui/forms`, `@spell/ui/<family>` => `/dist/<family>.js`.  Order:  `build`, `vendor`, `measure`, `test` (writes
   `perf-results.json`), `smoke`, `report`.
5. **LOC groups** -- exactly these four keys (`LocGroup`):  `element core`, `components`, `tests`,
   `demo & tooling`.
6. **Perf.**  Two places, one adapter (`PerfAdapter`:  "resolve once the DOM reflects the last change"):
   - the dropdown test:  `const result = await PerfRun.run(element, adapter)`, then
     `await PerfRun.save({ spike, where: "vitest browser mode", build: "dev (Vite dev server)", result }, commands.writeFile)`
     (writes `perf-results.json` in the spike root)
   - the smoke perf page:  a JS module exporting `adapter`, passed as `perfAdapter` (Lit:
     `demo/smoke/perf-adapter.js`).  For Solid:
     `import { flush } from "solid-js";  export const adapter = { settle: () => flush() }` -- `solid-js` resolves
     through the import map, i.e. the SAME copy the components use.
7. **Extra pages** (compat checks, translation) go in `pages: [{ path, kind }]`, served under `/spike/`.  A page
   imports `@spell/ui...` and the peers by specifier, and publishes
   `window.smokeResult = { ok, label, checks }`.  `kind: "compat"` is reported as COMPATIBILITY;  its `<title>`
   should say so too.  `.ts` files under `/spike/` are transpiled on the fly (type-only imports only).
8. **Native fallback tests.**  `tests/fallback.cases.ts` exports `FALLBACK_CASES`;  a spike runs them in its own
   vitest browser project with a `FallbackAdapter` (`mount`, `breakRender`, `settle`, `axe`):

   ```ts
   import { FALLBACK_CASES, type FallbackAdapter } from "$shared/tests/fallback.cases.ts"
   const adapter: FallbackAdapter = { mount, breakRender, settle, axe }   // the spike's own fixture helpers
   describe("native fallback (shared cases)", () => {
     for (const test of FALLBACK_CASES) it(test.name, () => test.run(adapter))
   })
   ```

   `breakRender(el)` makes a RENDERED element's next update throw (Solid:  patch the controller, flip a `keyOnly`
   attribute;  Lit:  patch `render()`, `requestUpdate()`) and waits for the fallback.  The cases need, from the
   element base:  one `console.error` naming the tag with the cause, a cancelable composed `ui-error`
   (`{ error }`), `:state(errored)`, and -- unless cancelled -- `<Name>Fallback.render(host, root, error, internals)`.
9. **Report.**  Rewrite `REPORT.md` to `REPORT.template.md`'s headings, keep the `generated` markers empty, run
   `yarn report`.  `diff <(grep '^## ' spike/shared/REPORT.template.md) <(grep '^## ' spike/<x>/REPORT.md)` must be empty.

## The Solid 2 host app and the identity hook (for a Solid-based spike)

`frameworks/solid.html` runs `frameworks/solid/dist/app.js`, compiled once by `SharedBuild` with `solid-js` and
`@solidjs/web` EXTERNAL.  The import map decides the copy:  shared `vendor/` by default, overridden by the spike's
own `solid-js` / `@solidjs/web` entries -- so on a Solid spike the app and the components load the SAME files.

To let the app PROVE it, the spike sets, at module evaluation (before the app mounts) -- from a module its `index`
entry loads (`@spell/ui`, what `solid.html` imports), NOT from `core`:  the `import * as` namespaces keep every
export alive, so in `core` they would pin all of Solid into the standalone (library bundled) measurements:

```ts
import * as SolidJs from "solid-js"
import * as Web from "@solidjs/web"

globalThis.__uiSolidIdentity = {
  solidJs: SolidJs,                  // REQUIRED:  the namespace the components run on
  web: Web,                          // optional:  same for @solidjs/web
  context: SomeContext,              // optional:  a `createContext()` the components read
  read: (element) => valueSeenInside // optional:  what `context` resolved to inside `element`
} satisfies SolidIdentityHook
```

The app then reports (`n/a` when the hook or a field is missing):
- `solidIdentity` / `webIdentity` -- `hook.solidJs === import * as SolidJs from "solid-js"` in the app
- `contextReachesComponent` -- the app wraps the dropdown in `<hook.context value="from-the-app">`, and
  `hook.read(dropdown) === "from-the-app"` (owner adoption across the element boundary)
- always:  `hostSetsValue` (app signal => `prop:value`), `pickUpdatesHost` (`ui-change` => app signal),
  `hostOpens`, `optionsIsProperty` (`prop:options`), `appContext` (the app's own context), `unmount`,
  `overlaysAfterUnmount` (the `UI` runtime released the menu's overlay entry)

Solid 2 notes baked into the app:  no `on:` namespace (listeners via a `ref` callback), `prop:` for properties,
the context object IS the provider, writes only in event handlers.
