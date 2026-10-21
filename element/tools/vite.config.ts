import { defineConfig } from "vite-plus"

import { fmtConfig, packageLint } from "spell-kit/toolchain/lint"

/**
 * The element tools' Vite+ config:  only the `lint` / `fmt` blocks (`vp lint`, `vp fmt`), the toolchain's settings.
 * - Its own folder of the kit's checks (`tools/kit.ts`):  node code, apart from the browser-safe `element/src/`.
 * - Tests:  `vitest.config.ts` beside this.
 */
export default defineConfig({
  fmt: fmtConfig,
  lint: packageLint({ name: "spell-element", ignorePatterns: [".vitest"] })
})
