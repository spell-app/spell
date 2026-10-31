import solid from "@solidjs/vite-plugin"
import { resolve } from "node:path"
import { defineConfig, type TestProjectInlineConfiguration } from "vite-plus"
import { playwright } from "vite-plus/test/browser-playwright"

import { browserMode } from "spell/toolchain/browserMode"
import { standardDecorators } from "spell/toolchain/decorators"
import { packageVersion } from "spell/toolchain/packageVersion"

/**
 * The kit's tests:  ONE Vitest config, a project per folder of `src/` (epic `repo-split` P14), its tests in
 * `tests/<folder>/`, at the same paths as the code.
 * - `yarn kit:test` runs them all;  one folder's:  `yarn vp test run --project server`.
 * - No aliases:  the tests import the kit by its package name (`spell/server`), which Vite finds through the
 *   kit's own `exports`.
 * - The browser projects (`util`, `element`):  a REAL browser, Vitest browser mode + Playwright, chromium,
 *   animations off (`browserMode()`, every repo's).
 *   - `util`'s:  `dom.test.ts` needs shadow roots and a custom element registry, and `decorators.test.ts` proves
 *     `@proto` after esbuild lowers standard decorators.
 *   - `element`'s:  its elements drawn with NO Spell UI on the page, on the stand-in settings of `TestSettings.ts`.
 * - Every other project runs in node:  `util:node` (util's `spell/`, `reactive/` and `node/`, and `time.ts`), `server`,
 *   `element-tools`, `cli`, `toolchain`, and the glue `tools/`.
 * - `readme`:  every README example, run (`tools/readme-test.ts`);  its tests skip themselves unless
 *   `yarn readme:test` asks for them, since they need every repo cloned.
 * - `standardDecorators()` lowers decorators (Vite 8's own transform doesn't), BEFORE Solid's plugin:  both are
 *   `enforce: "pre"`, and the Solid compiler must see decorator-free code.
 */

/** The kit's root. */
const KIT = import.meta.dirname

/** Packages that MUST resolve to one copy:  two Solids can't share owners. */
const SOLID_DEDUPE = ["solid-js", "@solidjs/web"]

/**
 * util's node-only tests:  `src/util/spell/`, `reactive/` and `node/`;
 * `time.ts`'s, which set the time zone (`process.env.TZ`):  only node lets a test do that;
 * and the web places', against a real local server.
 */
const UTIL_NODE = [
  "spell/**/*.test.ts",
  "reactive/**/*.test.ts",
  "node/**/*.test.ts",
  "time.test.ts",
  "places/RestPlace.test.ts",
  "places/GraphPlace.test.ts"
]

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [standardDecorators()],
        test: {
          name: "util",
          dir: testsOf("util"),
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**", ...UTIL_NODE],
          browser: browserMode(playwright)
        }
      },
      {
        plugins: [standardDecorators(), packageVersion(KIT)],
        test: { name: "util:node", environment: "node", dir: testsOf("util"), include: UTIL_NODE }
      },
      {
        plugins: [standardDecorators(), solid()],
        resolve: { dedupe: SOLID_DEDUPE },
        // pre-bundled up front:  found mid-run on a fresh cache, they'd reload the page, and a test file get a second Solid
        optimizeDeps: { include: SOLID_DEDUPE },
        test: {
          name: "element",
          dir: testsOf("element"),
          include: ["**/*.test.{ts,tsx}"],
          // the stand-in settings, installed before every test file
          setupFiles: [resolve(KIT, "src/test-helpers/TestSettings.ts")],
          // a guard:  an element bug that halts rendering must fail its test, not hang the run
          testTimeout: 10_000,
          browser: browserMode(playwright)
        }
      },
      nodeProject("server"),
      nodeProject("element-tools"),
      nodeProject("cli"),
      nodeProject("toolchain"),
      nodeProject("tools"),
      // every README example, run:  skipped unless `yarn readme:test` sets SPELL_README_TEST (tools/readme-test.ts)
      nodeProject("readme")
    ]
  }
})

/** The tests of folder `name`:  `tests/<name>/`. */
function testsOf(name: string): string {
  return resolve(KIT, "tests", name)
}

/** A project of node tests:  every `*.test.ts` in `tests/<name>/`. */
function nodeProject(name: string): TestProjectInlineConfiguration {
  return { test: { name, environment: "node", dir: testsOf(name), include: ["**/*.test.ts"] } }
}
