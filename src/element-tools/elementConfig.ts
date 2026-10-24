/// <reference types="node" />

import solid, { type Options as SolidOptions } from "@solidjs/vite-plugin"

import { standardDecorators } from "spell/toolchain/decorators"

/****************
 * ### Element build settings
 * The Vite settings every set's elements are compiled with:  Spell UI's library, its docs site and tests, and every
 * component pack's script (`ComponentPack`, the epics', the brand's).
 * - One place, so a pack's script is compiled exactly as Spell UI's own elements are (epic `repo-split` P10:  the
 *   pack build was Spell UI's, on its `baseConfig()`;  that `baseConfig()` now starts from `elementBaseConfig()`).
 * - Node only:  a Vite config, or a tool, imports it.
 ****************/

/**
 * Browsers the CSS is compiled FOR:  the platform floor every set commits to (anchor positioning everywhere).
 * - MUST stay modern:  with Vite's default (`baseline-widely-available`) Lightning CSS lowers `light-dark()`
 *   into `--lightningcss-light` variables resolved where a token is DECLARED, which freezes `:root`'s colour
 *   scheme into `.ui-dark` subtrees, and adds hex fallbacks for every `oklch()`.  Spell UI's `styles.test.ts` checks.
 * - Lightning CSS encodes versions as `major << 16 | minor << 8`.
 */
export const CSS_TARGETS = { chrome: 125 << 16, safari: 26 << 16, firefox: 147 << 16 }

/** Packages that MUST resolve to one copy:  two Solids can't share owners (`agents/PAPERCUTS.md`). */
export const SOLID_DEDUPE = ["solid-js", "@solidjs/web"]

/**
 * The plugins, aliases, dedupe and CSS an element build needs.
 * - `standardDecorators()` MUST come first:  both it and the Solid plugin are `enforce: "pre"`, and the Solid
 *   compiler must see decorator-free code.
 * - Aliases come from the nearest `tsconfig.json` of each file (`resolve.tsconfigPaths`):  each repo's own table.
 * - `solid`:  the Solid plugin's options, e.g. `{ dev: false }` for Solid's production runtime.
 * - A FUNCTION, so every caller gets its own plugin instances.
 */
export function elementBaseConfig({ solid: solidOptions = {} }: { solid?: SolidOptions } = {}) {
  return {
    plugins: [standardDecorators(), solid(solidOptions)],
    resolve: {
      tsconfigPaths: true,
      dedupe: SOLID_DEDUPE
    },
    css: {
      transformer: "lightningcss" as const,
      lightningcss: {
        targets: CSS_TARGETS,
        drafts: { customMedia: true }
      }
    }
  }
}
