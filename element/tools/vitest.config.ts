import { resolve } from "node:path"

import { defineConfig } from "vite-plus"

/**
 * Vitest config for the element tools (`spell-kit/element/tools/...`):  every test in node, as the tools are.
 * - Aliases come from the kit's `tsconfig.base.json`, through `resolve.tsconfigPaths`.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // the tests live in the kit's tests/ folder, at the same paths as the code
    dir: resolve(import.meta.dirname, "../../tests/element/tools"),
    environment: "node",
    include: ["**/*.test.ts"]
  }
})
