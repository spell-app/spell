import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import { solidElementHot } from "@spell/solid-element/vite"

import { shared } from "./vite.shared.ts"

/** Absolute path of this spike's `src/`. */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))

/** Component families, one lib entry each (`src/components/<name>/index.ts`), so each can be sized alone. */
export const COMPONENTS = ["button", "dropdown", "icon", "label", "parts", "divider", "segment", "container"] as const

/**
 * Shared entries, in load order:  every family imports `core`;  only families with a form VALUE import `forms`.
 * - `name` => source file;  `yarn measure` attributes each module to one of them (`spike.config.ts`).
 */
export const SHARED_ENTRIES = { core: `${SPIKE}/core.ts`, forms: `${SPIKE}/forms.ts` } as const

/**
 * Solid's packages, subpaths included (`solid-js/web`, `@solidjs/web`, `@solidjs/signals`), and our element
 * layer fork:  PEER dependencies, never bundled.  The app (or an import map, see `yarn vendor`) supplies ONE copy,
 * so the app's owners, context and signals reach the components.
 */
export const SOLID_EXTERNAL = /^solid-js(\/|$)|^@solidjs\/|^@spell\/solid-element(\/|$)/

/**
 * Library entries, by output name:
 * - `core`, `forms` -- the shared entries (`SHARED_ENTRIES`);  no family inlines them
 * - one per family
 * - `index` -- every family, for pages that want them all
 */
export const ENTRIES: Record<string, string> = {
  ...SHARED_ENTRIES,
  ...Object.fromEntries(COMPONENTS.map((name) => [name, `${SPIKE}/components/${name}/index.ts`])),
  index: `${SPIKE}/index.ts`
}

/**
 * Dev server (`yarn dev`, pages under `demo/`) and the library build measured in `REPORT.md`.
 * - `solid-js`, `@solidjs/web` and `@spell/solid-element` are external (`SOLID_EXTERNAL`);  the `UIRuntime` and
 *   icon data stay lazy chunks.
 * - `preserveEntrySignatures: "allow-extension"`:  lets `core.js` / `button.js` ... hold their own code and export
 *   what siblings need, instead of Vite's lib-mode default (`strict`), which turns every entry into a facade over
 *   a hashed chunk.
 */
export default defineConfig({
  ...shared,
  plugins: [...shared.plugins, hotElements()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    lib: { entry: ENTRIES, formats: ["es"] },
    rolldownOptions: {
      external: (id) => SOLID_EXTERNAL.test(id),
      preserveEntrySignatures: "allow-extension",
      // MUST stay on:  see the repo's `vite.config.ts`.
      output: { keepNames: true }
    }
  }
})

/**
 * Hot module replacement for the components in `yarn dev` (`@spell/solid-element/vite`;  `apply: "serve"`, so
 * builds are untouched, and NOT in `vitest.config.ts`).
 * - Boundaries:  the component barrels (`src/components/<name>/index.ts`), the modules that call `define()`.
 *   An edit to a component class, vocabulary or fallback re-runs its barrel;  `HotDefinitions` turns the barrel's
 *   `define()` of a new version of a class into a re-definition of every tag it had.
 * - `?inline` component CSS (`src/components/<name>/<name>.css`) re-registers its sheet:  no re-render.
 * - Shared code (`core`, `forms`, the runtime) reaches several barrels:  full reload.
 */
function hotElements() {
  return solidElementHot({
    include: /\/spike\/solid\/src\/components\/[\w-]+\/index\.ts$/,
    detect: /\.define\(/,
    setup: "$spike/HotDefinitions",
    styles: {
      include: /\/src\/components\/[\w-]+\/[\w-]+\.css\?inline$/,
      handler: "$spike/HotDefinitions",
      call: "HotDefinitions.updateStyle"
    }
  })
}
