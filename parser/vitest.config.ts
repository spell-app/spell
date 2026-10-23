import { defineConfig } from "vite-plus"

import { standardDecorators } from "spell/toolchain/decorators"
import { packageVersion } from "spell/toolchain/packageVersion"

/** Solid's packages:  core draws with them. */
const SOLID = [/^solid-js/, /^@solidjs\//]

/**
 * spell-parser's Vitest config:  one project per folder of `src/`, each over its tests in `tests/<folder>/`, at the same
 * paths as the code.
 * - `yarn vp test run --project core` runs one.
 * - `standardDecorators()` lowers standard decorators:  vite 8's own transform (oxc) doesn't.
 * - core:  Solid's CLIENT build (`browser`, `development`), as programs draw in a page.
 *   - node would pick its server build, which can't draw;  so Solid is compiled in (`noExternal`), with those
 *     conditions.
 *   - `drawing.test.ts` draws into a fake page (linkedom).
 * - Python's tests (`tests/py/core/`) are pytest's:  `yarn test` runs them after.
 */
export default defineConfig({
  plugins: [standardDecorators(), packageVersion(import.meta.dirname)],
  test: {
    projects: [
      { extends: true, test: { name: "parser", dir: "tests/parser" } },
      { extends: true, test: { name: "markdown", dir: "tests/markdown" } },
      {
        extends: true,
        test: { name: "core", dir: "tests/core" },
        ssr: { noExternal: SOLID, resolve: { conditions: ["browser", "development"] } }
      },
      { extends: true, test: { name: "py", dir: "tests/py" } },
      { extends: true, test: { name: "spell", dir: "tests/spell" } },
      { extends: true, test: { name: "cli", dir: "tests/cli", environment: "node" } }
    ]
  }
})
