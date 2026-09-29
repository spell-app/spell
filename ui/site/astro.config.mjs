// @ts-check
import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import { satteri } from "@astrojs/markdown-satteri"
import { fileURLToPath } from "node:url"

import { standardDecorators } from "../vite.decorators.ts"
import { CSS_TARGETS } from "../vite.config.ts"
import { unwrapHtmlParagraphs } from "./src/lib/unwrapHtmlParagraphs.ts"
import { SHIKI_THEMES } from "./src/lib/shiki.ts"

/** Repo root:  the library is consumed from SOURCE (`../src`), never from `dist/`. */
const ROOT = fileURLToPath(new URL("..", import.meta.url))
/** `../src`, target of the `$` alias -- same alias the library itself uses. */
const SRC = fileURLToPath(new URL("../src", import.meta.url))
/** `../test`, target of `$test` (shared test helpers;  here only so shared source type-checks alike). */
const TEST = fileURLToPath(new URL("../test", import.meta.url))

/**
 * Docs site for `@spell/ui`, modelled on fomantic-ui.com.
 * - Static output;  pages are `.astro` + `.mdx`, NO framework integration -- live examples are plain HTML
 *   and `ui-*` custom elements, which is the whole point.
 * - Vite mirrors the library's own config (`../vite.config.ts`):  same aliases, same decorator lowering,
 *   same Lightning CSS targets.  NEVER let Vite's default CSS targets in:  they lower `light-dark()`
 *   and break `ui-dark` subtrees (see `docs/theming.md` "Build notes").
 */
export default defineConfig({
  output: "static",
  // `unwrapHtmlParagraphs`:  text on its own line inside `<p>` / `<ui-*>` stays inline, not a nested `<p>`
  integrations: [mdx({ processor: satteri({ mdastPlugins: [unwrapHtmlParagraphs] }) })],
  markdown: {
    shikiConfig: { themes: SHIKI_THEMES, defaultColor: false }
  },
  vite: {
    plugins: [standardDecorators()],
    resolve: {
      // Array form so `$test` is matched before `$`;  string keys match `$` exactly or `$/...` only.
      alias: [
        { find: /^\$test(?=\/|$)/, replacement: TEST },
        { find: /^\$(?=\/|$)/, replacement: SRC },
        { find: /^@spell\/ui$/, replacement: `${SRC}/index.ts` }
      ]
    },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: CSS_TARGETS,
        drafts: { customMedia: true }
      }
    },
    server: {
      // `../src` is outside the site package;  Vite's dev server only serves the workspace root by default.
      fs: { allow: [ROOT] }
    },
    build: {
      // `brands.json` (~500 KB) is one lazily-loaded icon DATA chunk, loaded only by the icon browser's Brands tab
      chunkSizeWarningLimit: 600
    },
    ssr: {
      // Library source is TS + `?inline` CSS + JSON:  let Vite transform it, never hand it to Node as-is.
      noExternal: ["@spell/ui"]
    }
  }
})
