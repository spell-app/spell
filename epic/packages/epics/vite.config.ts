import { defineConfig } from "vite-plus"

import { fmtConfig, packageLint } from "../../vite.lint.ts"

/**
 * `epics`'s Vite+ config:  only the `lint` / `fmt` blocks (`vp lint`, `vp fmt`), from the repo root's `vite.lint.ts`.
 * - The pack's BUILD is the CLI's, the same for every pack:
 *   `spell dev pack build epics` (`packages/cli/src/dev/packBuild.ts`), on Spell UI's `baseConfig()`.
 * - Tests:  `vitest.config.ts` beside this.
 * - Not ours to lint:
 *   - `components/__pack/`:  generated (`packageLint()` leaves it out)
 *   - in the docs tools' `_assets/`:  the bundle `spell dev docs update` writes (`spell-ui.js`, `lazy/`, `emoji/`),
 *     and the vendored highlight.js
 *   - `tools/vendor/`:  Claude Design's runtime
 */
/**
 * The generated files in the docs tools' `_assets/`, from THIS folder.
 * - the root's patterns for them (`epics/tools/_assets/...`, under any folder) don't match here,
 *   where `yarn format` runs `vp fmt tools`
 * - so it rewrote the bundle and the emoji chunks (P7 of epic `epic-eject`)
 */
const GENERATED_ASSETS = [
  "tools/_assets/spell-ui.js",
  "tools/_assets/lazy/**",
  "tools/_assets/emoji/**",
  "tools/_assets/highlight.min.js"
]

export default defineConfig({
  fmt: { ...fmtConfig, ignorePatterns: [...fmtConfig.ignorePatterns, ...GENERATED_ASSETS] },
  lint: packageLint({
    name: "epics",
    ignorePatterns: [
      "dist",
      ".vitest",
      "tools/_assets/spell-ui.js",
      "tools/_assets/lazy",
      "tools/_assets/emoji",
      "tools/_assets/highlight.min.js",
      "tools/vendor"
    ]
  })
})
