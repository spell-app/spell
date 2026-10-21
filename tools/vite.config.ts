import { defineConfig } from "vite-plus"

import { fmtConfig, packageLint } from "spell-kit/toolchain/lint"

/**
 * The kit's tools' Vite+ config:  only the `lint` / `fmt` blocks (`vp lint`, `vp fmt`), the toolchain's settings.
 * - Its own folder of the kit's checks (`"spellFolders"`, run by `spell-folders`):  node code, run as is.
 * - Tests:  `vitest.config.ts` beside this.
 */
export default defineConfig({
  fmt: fmtConfig,
  lint: packageLint()
})
