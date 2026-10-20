import { defineConfig } from "vite-plus"

import { fmtConfig, rootLint } from "@spell-app/toolchain/lint"

/**
 * spell-lang's root Vite+ config:  only the `lint` / `fmt` blocks (what `vp check`, `vp lint`, `vp fmt` and the Oxc
 * editor extension read here).
 * - The settings live in the toolchain package (`@spell-app/toolchain/lint`), which every package's `vite.config.ts`
 *   spreads too.
 * - NOTE: `vp check` and the editor (`oxc.disableNestedConfig`) read THIS block only, even in a package.
 * - Tests:  each package's own `vitest.config.ts` (`yarn test` here runs every package's).
 */
export default defineConfig({
  fmt: fmtConfig,
  lint: rootLint()
})
