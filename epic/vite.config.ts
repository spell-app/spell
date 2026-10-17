import { defineConfig } from "vite-plus"

import { fmtConfig, rootLint } from "./vite.lint.ts"

/**
 * spell-epic's root Vite+ config:  only the `lint` / `fmt` blocks (what `vp check`, `vp lint`, `vp fmt` and the Oxc
 * editor extension read here), as spell-app's root has.
 * - The settings live in `vite.lint.ts`, a copy of spell-app's, which the epics package's `vite.config.ts` spreads too.
 * - NOTE: `vp check` and the editor read THIS block only, even in a package;  `tests/epics/` is linted by it.
 * - Tests:  the epics package's `vitest.config.ts`.
 */
export default defineConfig({
  fmt: fmtConfig,
  lint: rootLint()
})
