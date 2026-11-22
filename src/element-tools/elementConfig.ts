/// <reference types="node" />

import solid, { type Options as SolidOptions } from "@solidjs/vite-plugin"
import type { Plugin } from "vite"

import { standardDecorators } from "spell/toolchain/decorators"
import { ruleTestsOutOfBuilds } from "spell/toolchain/stripRuleTests"

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

/**
 * The same browsers as `CSS_TARGETS`, as a build's `build.cssTarget`:  what its CSS MINIFY reads.
 * - Left at Vite's default (older Safari), the minify lowers `light-dark()` whatever `css.lightningcss.targets` says:
 *   `.ui-dark` and a shadow root's colours change nothing in a build (dev and tests are fine).
 */
export const CSS_BUILD_TARGET = Object.entries(CSS_TARGETS).map(([browser, version]) => `${browser}${version >> 16}`)

/**
 * A plugin giving every build `CSS_BUILD_TARGET`, so its CSS minify keeps `light-dark()` as the browsers have it.
 * - A plugin, not a key of the base config:  each config writes a `build` block of its own, which would drop it.
 * - In `elementBaseConfig()` (Spell UI's library, its site, every component pack) and the app's `appConfig()`.
 */
export function cssBuildTarget(): Plugin {
  return { name: "spell-css-build-target", config: () => ({ build: { cssTarget: CSS_BUILD_TARGET } }) }
}

/** Packages that MUST resolve to one copy:  two Solids can't share owners (`agents/PAPERCUTS.md`). */
export const SOLID_DEDUPE = ["solid-js", "@solidjs/web"]

/**
 * The Solid compiler's setting that lets an element HYDRATE the shadow root the server drew:
 * claim its nodes and wire them up, rather than draw them again (epic `solid-2-final` P16).
 * - On both sides:  the server writes hydration keys (`_hk`), the page's code claims the nodes that carry them.
 * - Set explicitly:  the Solid plugin turns it off in Vitest and in a plain build;  its `ssr` option would turn it on
 *   only with a server entry of Solid Start's.
 * - Costs about 4% of a component's compiled code (139 component files, minified:  768 KB => 799 KB, measured
 *   2026-11-22);  a page with nothing server-drawn never hydrates, and its templates clone as before.
 */
export const HYDRATABLE = { hydratable: true }

/**
 * What every dev server of ours sets.
 * - `forwardConsole` off:  Vite turns it on by itself when an agent starts the server,
 *   sending each `console.*` call's arguments to the terminal.
 *   - It turns them into text with `JSON.stringify()`, which runs every getter it reaches.
 *   - Solid's dev warnings hand the console a live element, and from there it reaches a `<Show>`'s `children`:
 *     they're drawn though the `<Show>` is false, and one that throws stops Solid on the whole page for good
 *     (epic `mockup` I8:  a right-click menu that never opened, about 1 run in 5).
 */
export const DEV_SERVER_SETTINGS = { forwardConsole: false }

/**
 * The plugins, aliases, dedupe, CSS and dev server settings an element build needs.
 * - `ruleTestsOutOfBuilds()` first:  a BUILD that reaches the grammar ships each rule with its first example only,
 *   not its tests.
 * - `standardDecorators()` MUST come before the Solid plugin:  both are `enforce: "pre"`, and the Solid
 *   compiler must see decorator-free code.
 * - Aliases come from the nearest `tsconfig.json` of each file (`resolve.tsconfigPaths`):  each repo's own table.
 * - `solid`:  the Solid plugin's options, e.g. `{ dev: false }` for Solid's production runtime.
 * - Compiled HYDRATABLE, in the page and on the server (`HYDRATABLE`):
 *   an element keeps a shadow root the server drew, and only wires it up (epic `solid-2-final` P16).
 * - A FUNCTION, so every caller gets its own plugin instances.
 */
export function elementBaseConfig({ solid: solidOptions = {} }: { solid?: SolidOptions } = {}) {
  const options = { ...solidOptions, solid: { ...HYDRATABLE, ...solidOptions.solid } }
  return {
    plugins: [ruleTestsOutOfBuilds(), standardDecorators(), solid(options), cssBuildTarget()],
    resolve: {
      tsconfigPaths: true,
      dedupe: SOLID_DEDUPE
    },
    server: DEV_SERVER_SETTINGS,
    css: {
      transformer: "lightningcss" as const,
      lightningcss: {
        targets: CSS_TARGETS,
        drafts: { customMedia: true }
      }
    }
  }
}
