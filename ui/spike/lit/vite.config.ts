import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

import { standardDecorators } from "../../vite.decorators.ts"
import { CSS_TARGETS } from "../../vite.config.ts"

/** Repository root:  the spike builds on its shared foundation (`src/`, `test/`). */
export const REPO = fileURLToPath(new URL("../../", import.meta.url))
/** `$` ~== the shared foundation, as in the root configs. */
const SRC = `${REPO}src`
/** `$test` ~== shared test helpers. */
const TEST = `${REPO}test`
/** `$shared` ~== the tooling both spikes share (`spike/shared/`:  `PerfRun` ...). */
const SHARED = `${REPO}spike/shared`
/**
 * This spike's own `src/`.
 * - NOTE: NO `$spike` alias:  the root `tsconfig.json` includes `spike/` without one (and two spikes couldn't
 *   share one name), so spike-internal imports are relative -- a deliberate exception to `AGENTS.md`.
 */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))

/** Component families, one lib entry each (`src/components/<name>/index.ts`), so each can be sized alone. */
export const COMPONENTS = ["button", "dropdown", "icon", "label", "parts", "divider", "segment", "container"] as const

/**
 * Shared entries, in load order:  every family imports `core`;  only families with a form VALUE import `forms`.
 * - `name` => source file;  `yarn measure` attributes each module to one of them (`spike.config.ts`).
 */
export const SHARED_ENTRIES = { core: `${SPIKE}/core.ts`, forms: `${SPIKE}/forms.ts` } as const

/**
 * Lit's packages, subpaths included (`lit/decorators.js`, `@lit/reactive-element/...`):  a PEER dependency,
 * never bundled.  The app (or an import map, see `yarn vendor`) supplies one copy for every bundle.
 */
export const LIT_EXTERNAL = /^lit(\/|$)|^lit-(html|element)(\/|$)|^@lit\//

/**
 * Library entries, by output name:
 * - `core`, `forms` -- the shared entries (`SHARED_ENTRIES`);  no family inlines them
 * - one per family
 * - `index` -- every family, for pages that want them all
 */
export const ENTRIES: Record<string, string> = {
  ...SHARED_ENTRIES,
  ...Object.fromEntries(COMPONENTS.map((name) => [name, `${SPIKE}/components/${name}/index.ts`])),
  index: `${SPIKE}/index.ts`
}

/**
 * Lit spike:  dev server for `demo/`, library build of every component family on shared `core` / `forms` chunks.
 * - `lit` is external (`LIT_EXTERNAL`);  the `UIRuntime` and icon data stay lazy chunks.
 * - Same decorator pre-pass and Lightning CSS targets as the root, imported rather than copied.
 * - `server.fs.allow` includes the repo root:  the spike has its own lockfile, so Vite would otherwise treat
 *   `spike/lit` as the workspace root and refuse to serve `../../src`.
 * - `dedupe`:  `test/fixture.ts` / `test/a11y.ts` live under the root and would resolve the ROOT copies of
 *   `vitest` / `axe-core`, a second test runner instance.
 */
export default defineConfig({
  plugins: [standardDecorators()],
  resolve: {
    alias: { $test: TEST, $shared: SHARED, $: SRC },
    dedupe: ["vitest", "axe-core", "lit", "lit-html", "lit-element", "@lit/reactive-element"]
  },
  css: {
    transformer: "lightningcss",
    lightningcss: { targets: CSS_TARGETS, drafts: { customMedia: true } }
  },
  server: { fs: { allow: [REPO] } },
  // pre-bundled up front:  discovered mid-run, Vite reloads the test page
  optimizeDeps: {
    include: [
      "lit",
      "lit/decorators.js",
      "lit/static-html.js",
      "lit/directives/if-defined.js",
      "lit/directives/live.js",
      "lit/directives/repeat.js"
    ]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: { entry: ENTRIES, formats: ["es"] },
    rolldownOptions: {
      external: (id) => LIT_EXTERNAL.test(id),
      // lets `core.js` / `button.js` ... hold their own code and export what siblings need, instead of Vite's
      // lib-mode default (`strict`), which turns every entry into a facade over a hashed chunk
      preserveEntrySignatures: "allow-extension",
      output: { keepNames: true }
    }
  }
})
