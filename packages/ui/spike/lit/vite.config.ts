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
/**
 * This spike's own `src/`.
 * - NOTE: NO `$spike` alias:  the root `tsconfig.json` includes `spike/` without one (and two spikes couldn't
 *   share one name), so spike-internal imports are relative -- a deliberate exception to `AGENTS.md`.
 */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))

/** Component families, one lib entry each (`src/components/<name>/index.ts`), so each can be sized alone. */
export const COMPONENTS = ["button", "dropdown", "icon", "label", "parts", "divider", "segment", "container"] as const

/**
 * Lit spike:  dev server for `demo/`, library build of every component family.
 * - Same decorator pre-pass and Lightning CSS targets as the root, imported rather than copied.
 * - `server.fs.allow` includes the repo root:  the spike has its own lockfile, so Vite would otherwise treat
 *   `spike/lit` as the workspace root and refuse to serve `../../src`.
 * - `dedupe`:  `test/fixture.ts` / `test/a11y.ts` live under the root and would resolve the ROOT copies of
 *   `vitest` / `axe-core`, a second test runner instance.
 */
export default defineConfig({
  plugins: [standardDecorators()],
  resolve: {
    alias: { $test: TEST, $: SRC },
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
    lib: {
      entry: Object.fromEntries(COMPONENTS.map((name) => [name, `${SPIKE}/components/${name}/index.ts`])),
      formats: ["es"]
    },
    rolldownOptions: { output: { keepNames: true } }
  }
})
