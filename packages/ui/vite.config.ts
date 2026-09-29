import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { fileURLToPath } from "node:url"

import { standardDecorators } from "./vite.decorators.ts"

/** Absolute path of `src/`, target of the `$` import alias. */
const SRC = fileURLToPath(new URL("./src", import.meta.url))

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
      $: SRC
    }
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
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
