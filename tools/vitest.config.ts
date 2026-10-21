import { resolve } from "node:path"

import { defineConfig } from "vite-plus"

/** Vitest config for the kit's tools (`tools/`):  every test in node, as the tools run. */
export default defineConfig({
  test: {
    // the tests live in the kit's tests/ folder, at the same paths as the code
    dir: resolve(import.meta.dirname, "../tests/tools"),
    environment: "node",
    include: ["**/*.test.ts"]
  }
})
