import { defineConfig } from "vite-plus"

import { fmtConfig, packageLint, patternLintIn } from "spell-kit/toolchain/lint"

/**
 * spell-epic's Vite+ config:  only the `lint` / `fmt` blocks (what `vp check`, `vp lint`, `vp fmt` and the Oxc editor
 * extension read), from the shared toolchain package, `spell-kit/toolchain/lint` (spell-util's, a workspace of the top
 * `spell` install, epic `epic-engine` P10):  the copy of its `vite.lint.ts` that was here is gone.
 * - ONE block for the whole repo:  spell-epic is one package (epic `epic-eject` J14), so the root is the package.
 * - The pack's BUILD is the kit's, the same for every pack:
 *   `spell-pack build` (`spell-kit/element/tools/ComponentPack`), on the kit's `elementBaseConfig()`.
 * - Tests:  `vitest.config.ts` beside this.
 * - Not ours to lint or format:
 *   - `src/components/__pack/`:  generated
 *   - in the docs tools' `_assets/`:  the bundles `spell dev docs update` writes (`spell-ui.js`, `spell-comments.js`,
 *     `lazy/`, `emoji/`),
 *     and the vendored highlight.js
 *   - the extension's build (`vscode/out`)
 */
/**
 * The generated files in the docs tools' `_assets/`.
 * - the shared patterns for them (`**\/epics/tools/_assets/...`, spell-app's layout) don't match `src/tools/_assets/`
 */
const GENERATED_ASSETS = [
  "src/tools/_assets/spell-ui.js",
  "src/tools/_assets/spell-comments.js",
  "src/tools/_assets/lazy/**",
  "src/tools/_assets/emoji/**",
  "src/tools/_assets/highlight.min.js"
]

export default defineConfig({
  fmt: {
    ...fmtConfig,
    // and, as the epics package's own `yarn format` never covered them:  Epic UI's hand-laid-out pages and the
    // plan-doc checks' sample pages
    ignorePatterns: [
      ...fmtConfig.ignorePatterns,
      ...GENERATED_ASSETS,
      "src/components/__pack/**",
      "src/docs/**/*.html",
      "src/demo/**"
    ]
  },
  lint: {
    ...packageLint({
      ignorePatterns: [
        "dist",
        ".vitest",
        "node_modules",
        "vscode/out",
        "src/components/__pack",
        "src/tools/_assets/spell-ui.js",
        "src/tools/_assets/spell-comments.js",
        "src/tools/_assets/lazy",
        "src/tools/_assets/emoji",
        "src/tools/_assets/highlight.min.js"
      ]
    }),
    overrides: [
      // the `spell-ui/*` rules on the elements, `src/components/`, as spell-app has them on its packages' `components/`
      ...patternLintIn(["src/components"]),
      // `node --test` files (the window script's):  `test()` returns a promise the runner itself awaits
      { files: ["tests/**/*.test.mjs"], rules: { "typescript/no-floating-promises": "off" } },
      // the plan-doc checks (`src/demo/`, Playwright):  a page's own code, measured by text inside `page.evaluate()`
      { files: ["src/demo/**"], rules: { "no-eval": "off" } }
    ]
  }
})
