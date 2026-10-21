import { resolve } from "node:path"

import { defineConfig } from "vite-plus"

/**
 * vitest config for `spell-lang/cli`:  node only, the language's `spell` commands.
 * - Aliases come from the repo root's `tsconfig.base.json`, through `resolve.tsconfigPaths`.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  // the tests live in the repo's tests/ folder, at the same paths as the code
  test: { dir: resolve(import.meta.dirname, "../tests/cli"), environment: "node" }
})
