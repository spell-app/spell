import { resolve } from "node:path"

import { defineConfig } from "vite-plus"

/**
 * vitest config for `spell-kit/cli`:  every test in node, since the `spell` command IS node.
 * - Aliases (`$/cli` ...) come from the kit's `tsconfig.base.json`, through `resolve.tsconfigPaths`.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // the tests live in the kit's tests/ folder, at the same paths as the code
    dir: resolve(import.meta.dirname, "../tests/cli"),
    environment: "node",
    include: ["**/*.test.ts"]
  }
})
