import { defineConfig } from "vite"

import { appConfig, sharedSolid } from "./vite.shared.ts"

/**
 * Build the `<spell-editor>` web component into `dist-element/`, beside `<spell-viewer>` --
 * `yarn build:element` builds `vite.solid.config.ts` first (it empties the folder), then `<spell-viewer>`, then this.
 * - `spell-editor.js`:  the element and the parser, for pages to load -- see `src/app/components/spell-editor/index.ts`.
 *   CodeMirror is a chunk of its own, `spell-editor-codemirror.js`, loaded once there's a project to show.
 * - Its own build, NOT an entry of `vite.element.config.ts`, so the editor's CSS (the bubbly look's) stays out of
 *   `spell-app.css`:  every `<spell-viewer>` adopts that.  So they share no chunk.
 * - But NOT its own Solid:  Solid, `ui`'s element core and `spell-ui` come from `spell-solid.js` /
 *   `spell-ui.js` beside it (`sharedSolid()`), as `<spell-viewer>`'s do -- one Solid per page.
 * - One `spell-editor.css` -- ours, the bubbly look's and `codemirror.css` -- which the element puts in its shadow
 *   root (`shadowStyles.ts`).  CodeMirror's own rules it puts there itself, as the editor's made.
 * - No worker:  the language service runs in the page, as the app's does.
 * - Fixed names, no hashes, as `<spell-viewer>`'s:  the element finds its styles beside itself.
 * - Plugins, dedupe and CSS:  `appConfig()`, as `vite.config.ts`.  `keepNames` MUST stay on:  a rule's
 *   class name is its name -- see `parser/build.test.ts`.
 */
const shared = appConfig()
export default defineConfig({
  ...shared,
  plugins: [...shared.plugins, sharedSolid()],
  // `vite.element.config.ts` copied `static/` in already
  publicDir: false,
  // relative:  the lazy chunks are found beside the bundle, wherever that's served from -- NOT `/` of the page
  base: "./",
  build: {
    // the parser's chunk, `spell-editor-spell.js`, is the biggest:  1.8 MB
    chunkSizeWarningLimit: 2000,
    outDir: "dist-element",
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: false,
    rolldownOptions: {
      input: {
        "spell-editor": "../src/app/components/spell-editor/index.ts"
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "spell-editor-[name].js",
        assetFileNames: (asset) =>
          asset.names?.some((name) => name.endsWith(".css")) ? "spell-editor.css" : "[name][extname]",
        keepNames: true
      }
    }
  },
  define: {
    global: {},
    "process.env": {}
  }
})
