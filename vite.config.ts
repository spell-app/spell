import { defineConfig } from "vite-plus"

import { fmtConfig, rootLint } from "spell-kit/toolchain/lint"

/**
 * The kit's root Vite+ config:  only the `lint` / `fmt` blocks (what `vp check`, `vp lint`, `vp fmt` and the Oxc
 * editor extension read here, and in `tests/`, which has none of its own).
 * - The settings live in the toolchain (`spell-kit/toolchain/lint`), which every folder's `vite.config.ts` spreads too.
 * - NOTE: `vp check` and the editor (`oxc.disableNestedConfig`) read THIS block only, even in a folder.
 * - The child repos inside the kit (`spell-ui/` ...) are left out:  each lints by its own root config.
 * - Tests:  each folder's own `vitest.config.ts` (`yarn kit:test` runs every folder's).
 */
const lint = rootLint()

export default defineConfig({
  fmt: { ...fmtConfig, ignorePatterns: [...fmtConfig.ignorePatterns, "spell-*/**", "spell.*/**"] },
  lint: { ...lint, ignorePatterns: [...lint.ignorePatterns, "spell-*", "spell.*"] }
})
