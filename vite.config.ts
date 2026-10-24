import { defineConfig } from "vite-plus"

import { fmtConfig, rootLint } from "spell/toolchain/lint"

/**
 * The kit's root Vite+ config:  only the `lint` / `fmt` blocks (what `vp check`, `vp lint`, `vp fmt` and the Oxc
 * editor extension read here, and in `tests/`, which has none of its own).
 * - The settings live in the toolchain (`spell/toolchain/lint`), which every repo's config spreads too.
 * - The kit's ONE lint config (epic `repo-split` P14):  `yarn kit:lint` runs it over `src/`, `tests/`, `bin/`,
 *   `scripts/`, `tools/` and the configs.
 * - The child repos inside the kit (`spell-ui/` ...) are left out:  each lints by its own root config.
 * - Tests:  `vitest.config.ts` beside this, a project per folder.
 */
const lint = rootLint()

export default defineConfig({
  fmt: { ...fmtConfig, ignorePatterns: [...fmtConfig.ignorePatterns, "spell-*/**", "spell.*/**"] },
  lint: { ...lint, ignorePatterns: [...lint.ignorePatterns, "spell-*", "spell.*"] }
})
