import solid from "@solidjs/vite-plugin"
import { fileURLToPath } from "node:url"
import type { UserConfig } from "vite"

import { standardDecorators } from "../../vite.decorators.ts"
import { CSS_TARGETS } from "../../vite.config.ts"

/** Absolute path of the repo's `src/`, target of the `$` import alias. */
const SRC = fileURLToPath(new URL("../../src", import.meta.url))
/** Absolute path of the repo's `test/`, target of the `$test` import alias. */
const TEST = fileURLToPath(new URL("../../test", import.meta.url))
/** Absolute path of this spike's `src/`, target of the `$spike` import alias. */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))
/** Repo root:  the dev server must serve `src/` and `test/` from above this package. */
const ROOT = fileURLToPath(new URL("../..", import.meta.url))

/**
 * Config shared by `vite.config.ts` and `vitest.config.ts`.
 * - `standardDecorators()` MUST come first:  both it and the Solid plugin are `enforce: "pre"`, and the
 *   Solid compiler must see decorator-free code.
 * - `resolve.dedupe`:  `test/fixture.ts` and `test/a11y.ts` live OUTSIDE this package and would otherwise
 *   resolve `vitest` / `axe-core` from the repo's `node_modules` -- a second vitest instance loses its
 *   test context (`onTestFinished` throws).
 */
export const shared = {
  // `SPIKE_SOLID_PROD=1`:  Solid's PRODUCTION runtime under `vite dev` (no dev diagnostics, no performance
  // tracks), for the perf page -- see `demo/smoke.ts`
  plugins: [standardDecorators(), solid(process.env.SPIKE_SOLID_PROD ? { dev: false, performanceTracks: false } : {})],
  resolve: {
    alias: {
      $test: TEST,
      $spike: SPIKE,
      $: SRC
    },
    dedupe: ["vitest", "axe-core", "solid-js", "@solidjs/web"]
  },
  // pre-bundled up front, so the first test run doesn't reload mid-run ("optimized dependencies changed")
  optimizeDeps: {
    include: ["component-register", "axe-core", "@solidjs/element"]
  },
  server: {
    fs: { allow: [ROOT] }
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: CSS_TARGETS,
      drafts: { customMedia: true }
    }
  }
} satisfies UserConfig
