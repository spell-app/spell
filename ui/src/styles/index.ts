/**
 * Barrel for `spell/ui/styles` -- the CSS foundation as TEXT, plus the style vocabulary it's generated from.
 * - Its own lib entry (`spell/ui/styles`), PURE DATA:  no code, so `styles.js` needs none of Rolldown's helpers.
 *   Code here once split them into a `rolldown-runtime-<hash>.js` every page fetched, as `styles.js` never loads
 *   `core.js` (epic `wwod-spell-ui`, I13);  `yarn measure` builds this entry too, so its checks catch a relapse.
 * - Imports nothing of `ui`'s outside its own folder;  the runtime (`UIRuntime`) imports the sheets from here.
 * - Each sheet is a string (Vite `?inline`:  Lightning CSS-processed, `@import` / `@custom-media` resolved,
 *   minified in builds), for `new CSSStyleSheet().replaceSync()` -- the runtime's `Styles` registry adopts
 *   them into the document and into shadow roots.
 * - `foundationCSS` is the PAGE's adoption order:
 *   layers first (fixes the layer order), then reset, tokens, colours, sizes, animations, utilities.
 *   `pageCSS` adds the page-only sheets (`typography`, `native`), which style light-DOM markup.
 * - `shadowFoundationCSS` is what each SHADOW ROOT adopts of it (epic `solid-2-final` P3):
 *   the same, less the token sheets' page parts (`tokens.css`, `colors.css`, `sizes.css`:  `@property` and `:root`
 *   rules, which do nothing inside a shadow root).  The tokens reach it from the page, by inheritance.
 *   - `fallbackCSS`:  the tokens' `:host` copies, for a shadow root on a page that never loaded them.
 *   - The parts:  `StyleGenerator`'s class docs.
 * - NOTE: `?inline` relies on `css.lightningcss.targets` being modern browsers.  With Vite's default
 *   (`baseline-widely-available`) Lightning CSS lowers `light-dark()` to `--lightningcss-light` variables
 *   substituted where a token is DECLARED, which freezes `:root`'s scheme into `.ui-dark` subtrees.
 *   `styles.test.ts` checks for it.
 * - NOTE: `StyleGenerator` is left out -- build-time only (`yarn gen:styles`).  Import its leaf file.
 * - NOTE: `ComponentTokens` is left out too -- test / build time only (`tests/test-helpers/componentTokens.test.ts`,
 *   `yarn tokens:alias`, the docs site's token tables).  Import its leaf file.
 * - NOTE: no namespace:  sheet names carry a `CSS` suffix and the vocabulary exports are data.
 * - NOTE: the THEMES (`themes/*.css`) are not here:  the runtime loads them lazily, one chunk per sheet, and applies
 *   one (`UI.themes.apply("merlot")`, `src/runtime/Themes.ts`).
 */

import layersCSS from "./layers.css?inline"
import resetCSS from "./reset.css?inline"
import tokensCSS from "./tokens.css?inline"
import tokensFallbackCSS from "./tokens.fallback.css?inline"
import colorsCSS from "./colors.css?inline"
import colorsSharedCSS from "./colors.shared.css?inline"
import colorsFallbackCSS from "./colors.fallback.css?inline"
import sizesCSS from "./sizes.css?inline"
import sizesSharedCSS from "./sizes.shared.css?inline"
import sizesFallbackCSS from "./sizes.fallback.css?inline"
import typographyCSS from "./typography.css?inline"
import animationsCSS from "./animations.css?inline"
import utilitiesCSS from "./utilities.css?inline"
import nativeCSS from "./native.css?inline"

export * from "./styles.types"
export * from "./styles.en"

export {
  layersCSS,
  resetCSS,
  tokensCSS,
  tokensFallbackCSS,
  colorsCSS,
  colorsSharedCSS,
  colorsFallbackCSS,
  sizesCSS,
  sizesSharedCSS,
  sizesFallbackCSS,
  typographyCSS,
  animationsCSS,
  utilitiesCSS,
  nativeCSS
}

/** Sheets the page adopts of the foundation, in order:  every part but the fallbacks. */
export const foundationCSS: readonly string[] = [
  layersCSS,
  resetCSS,
  tokensCSS,
  colorsCSS,
  colorsSharedCSS,
  sizesCSS,
  sizesSharedCSS,
  animationsCSS,
  utilitiesCSS
]

/** Sheets each shadow root adopts of the foundation, in order:  `foundationCSS` less the token sheets' page parts. */
export const shadowFoundationCSS: readonly string[] = [
  layersCSS,
  resetCSS,
  colorsSharedCSS,
  sizesSharedCSS,
  animationsCSS,
  utilitiesCSS
]

/** The tokens' `:host` copies, in order:  for a shadow root on a page that never loaded the tokens. */
export const fallbackCSS: readonly string[] = [tokensFallbackCSS, colorsFallbackCSS, sizesFallbackCSS]

/** Sheets the PAGE adopts, in order:  the foundation plus page typography and native-markup rules. */
export const pageCSS: readonly string[] = [...foundationCSS, typographyCSS, nativeCSS]
