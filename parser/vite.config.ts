import { defineConfig } from "vite-plus"

import { fmtConfig, packageLint } from "spell/toolchain/lint"

/** Not linted or formatted by oxlint / oxfmt:  Python (ruff's). */
const NOT_OURS = ["src/py/core/**", "tests/py/core/**"]

/**
 * spell-parser's Vite+ config:  the `lint` / `fmt` blocks (what `vp lint`, `vp fmt` and the Oxc editor extension read),
 * from the toolchain's settings (`spell/toolchain/lint`).
 * - One block for the whole repo, `src/`, `tests/` and `scripts/`.
 * - Tests:  `vitest.config.ts` beside this.
 */
export default defineConfig({
  fmt: { ...fmtConfig, ignorePatterns: [...fmtConfig.ignorePatterns, ...NOT_OURS] },
  lint: packageLint({ react: true, ignorePatterns: ["build", "dist", ".cache", "docs", ...NOT_OURS] })
})
