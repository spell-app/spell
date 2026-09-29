import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { fileURLToPath } from "node:url"

import { standardDecorators } from "./vite.decorators.ts"

/** Absolute path of `src/`, target of the `$` import alias. */
const SRC = fileURLToPath(new URL("./src", import.meta.url))
/** Absolute path of `test/`, target of the `$test` import alias (test helpers only). */
const TEST = fileURLToPath(new URL("./test", import.meta.url))

/**
 * Browsers the CSS is compiled FOR:  the platform floor the plan commits to (anchor positioning everywhere).
 * - MUST stay modern:  with Vite's default (`baseline-widely-available`) Lightning CSS lowers `light-dark()`
 *   into `--lightningcss-light` variables resolved where a token is DECLARED, which freezes `:root`'s colour
 *   scheme into `.ui-dark` subtrees, and adds hex fallbacks for every `oklch()`.  `styles.test.ts` checks.
 * - Lightning CSS encodes versions as `major << 16 | minor << 8`.
 */
export const CSS_TARGETS = { chrome: 125 << 16, safari: 26 << 16, firefox: 147 << 16 }

/**
 * Library build of `@spell/ui`.
 * - ESM only:  every consumer we target (bundlers, `<script type="module">`, frameworks) speaks it.
 * - `css.transformer: "lightningcss"` so component CSS gets nesting / `@custom-media` lowering with the
 *   same engine that minifies it.  NOTE: postcss is never used.
 * - `vite-plugin-dts` emits `.d.ts` next to each entry for consumers.
 */
export default defineConfig({
  plugins: [standardDecorators(), dts({ include: ["src"], exclude: ["src/**/*.test.ts"] })],
  resolve: {
    alias: {
      $test: TEST,
      $: SRC
    }
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: CSS_TARGETS,
      drafts: { customMedia: true }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    lib: {
      // NOTE: one entry per component is added here as components land, e.g. `button: "src/components/button/button.ts"`,
      // so consumers can import a single component without the rest.
      entry: {
        index: `${SRC}/index.ts`
      },
      formats: ["es"]
    },
    rolldownOptions: {
      // NOTE: `lodash-es` is bundled (tree-shaken) for now;  revisit once the package is published.
      external: [],
      output: {
        // MUST stay on:  custom element class names are read by the manifest and dev-time warnings --
        // see `vite.decorators.ts`.
        keepNames: true
      }
    }
  }
})
