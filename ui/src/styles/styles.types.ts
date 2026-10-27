/**
 * Shared types for `spell/ui/styles`:  the shapes of the global scales in `styles.en.ts`, and of the sheet
 * declarations `StyleGenerator` writes and `ComponentTokens` reads.
 * - The BOTTOM of the folder's import graph:  `import type` only (the vocabulary, `Prettify`), so it erases
 *   completely;  node reads it with the vocabulary (`yarn gen:styles`).
 * - The vocabulary is DATA, read by `StyleGenerator` (`yarn gen:styles`) to write `tokens.css`,
 *   `colors.css` and `sizes.css`, and by the runtime / `ClassBuilder` for allowed attribute values.
 * - Name unions (`HueName`, `SizeName` ...) derive from the vocabulary objects, so adding a hue or size
 *   is one vocabulary entry plus `yarn gen:styles` -- no type to update by hand.
 */

import type { Prettify } from "spell/ui/util"
import type {
  borderAlphas,
  breakpoints,
  durations,
  easings,
  hueAliases,
  hues,
  radii,
  semanticAliases,
  semanticColors,
  shadows,
  sizes,
  spacing,
  textAlphas,
  themeTree,
  zIndices
} from "./styles.en"

////////////////
// ## Colour primitives
////////////////

/**
 * OKLCH colour as `[lightness, chroma, hue]`.
 * - `lightness` is `0..1` (not a percentage), `chroma` is `0..~0.37`, `hue` is degrees.
 * - Written out as `oklch(L C H)`.
 */
export type Oklch = readonly [lightness: number, chroma: number, hue: number]

/**
 * A colour for each colour scheme.
 * - `onLight` ~== Fomantic's `@red`:  used on light surfaces (light scheme).
 * - `onDark` ~== Fomantic's `@lightRed`:  used on dark surfaces (dark scheme, and `inverted` variations).
 */
export type SchemeColor = {
  /** colour on light surfaces */
  onLight: Oklch
  /** colour on dark surfaces */
  onDark: Oklch
}

/**
 * Relative shift of a colour:  Fomantic's `darken(x, n)` + `saturate(x, m)` in OKLCH terms.
 * - Written as `oklch(from <base> calc(l + lightness) calc(c * chroma) h)`.
 * - Negative `lightness` darkens, positive lightens.
 */
export type ColorShift = {
  /** added to lightness (`0..1` scale) */
  lightness: number
  /** chroma multiplier, `1` ~== unchanged */
  chroma: number
}

/**
 * Absolute-ish recipe for a colour role (text, border ...) derived from a base colour.
 * - `mode: "exact"` replaces lightness:  `oklch(from <base> 0.46 calc(c * chroma) h)`.
 * - `mode: "atMost"` caps it:  `min(l, lightness)` -- keeps dark hues, darkens light ones (yellow text).
 * - `mode: "atLeast"` floors it:  `max(l, lightness)` -- the dark-scheme mirror of `atMost`.
 */
export type ColorRecipe = {
  /** target lightness `0..1` */
  lightness: number
  /** how `lightness` applies to the base colour's lightness */
  mode: "exact" | "atMost" | "atLeast"
  /** chroma multiplier, `1` ~== unchanged */
  chroma: number
}

/**
 * A foreground candidate for text on a solid colour (`onColors`).
 * - `color` is what the contrast check measures (`spell/util/color`'s `contrast()`), `css` what `--ui-<name>-on` emits -- the same colour, but `css`
 *   may be a token (`var(--ui-ink-on-light)`) so a theme's re-ink reaches it.
 */
export type OnColor = {
  /** value measured at generation time */
  color: Oklch
  /** CSS emitted for it */
  css: string
}

/** A `ColorRecipe` per colour scheme. */
export type SchemeRecipe = {
  /** recipe used in the light scheme */
  light: ColorRecipe
  /** recipe used in the dark scheme */
  dark: ColorRecipe
}

////////////////
// ## Hues
////////////////

/** Interaction states every hue derives, in Fomantic's order. */
export type HueStateName = "hover" | "focus" | "down" | "active"

/** One `ColorShift` per interaction state. */
export type HueStates = Record<HueStateName, ColorShift>

/**
 * One palette hue.
 * - `states` overrides the default darken / saturate recipe, e.g. `black` LIGHTENS on hover (as in Fomantic).
 * - `inverted` overrides `--ui-<hue>-inverted` (default `onDark`), for a hue whose dark-scheme fill is too dark
 *   to read as TEXT on a dark surface -- `black`, as Fomantic's inverted black is near-white.
 */
export type HueDefinition = Prettify<
  SchemeColor & {
    /** per-hue override of `hueStates` */
    states?: HueStates
    /** per-hue override of the `inverted` colour */
    inverted?: Oklch
  }
>

/** Role colours every hue and semantic colour derives:  `--ui-red-text`, `--ui-positive-background` ... */
export type ColorRoleName = "text" | "header" | "border" | "background"

/** Canonical hue name with its own OKLCH values, e.g. `"red"`. */
export type HueName = keyof typeof hues

/** Alias hue name that points at another hue, e.g. `"primary"` => `"blue"`. */
export type HueAliasName = keyof typeof hueAliases

/** Any colour name a component accepts as `color="..."`. */
export type ColorName = HueName | HueAliasName

////////////////
// ## Semantic colours
////////////////

/**
 * One semantic (emotive) colour.
 * - Either borrows a palette hue (`{ hue: "green" }`) or brings its own `onLight` / `onDark` values.
 */
export type SemanticDefinition = { hue: HueName } | SchemeColor

/** Canonical semantic colour name, e.g. `"positive"`. */
export type SemanticName = keyof typeof semanticColors

/** Alias semantic name, e.g. `"success"` => `"positive"`. */
export type SemanticAliasName = keyof typeof semanticAliases

/** Any semantic (emotive) colour name. */
export type SemanticColorName = SemanticName | SemanticAliasName

////////////////
// ## Scales
////////////////

/** Size name, `mini .. massive`;  `medium` ~== default. */
export type SizeName = keyof typeof sizes

/** Spacing step name, `3xs .. 3xl`. */
export type SpaceName = keyof typeof spacing

/** Border-radius role name. */
export type RadiusName = keyof typeof radii

/** Page breakpoint name. */
export type BreakpointName = keyof typeof breakpoints

/** Stacking layer name. */
export type ZIndexName = keyof typeof zIndices

/** Duration step name. */
export type DurationName = keyof typeof durations

/** Easing curve name. */
export type EasingName = keyof typeof easings

/** Box-shadow role name. */
export type ShadowName = keyof typeof shadows

/** Text alpha role name. */
export type TextAlphaName = keyof typeof textAlphas

/** Border alpha role name. */
export type BorderAlphaName = keyof typeof borderAlphas

/**
 * Alpha for each colour scheme.
 * - `onLight` applies to dark ink on light surfaces, `onDark` to light ink on dark surfaces
 *   (Fomantic's `inverted` counterpart).
 */
export type SchemeAlpha = {
  /** alpha of dark ink on light surfaces */
  onLight: number
  /** alpha of light ink on dark surfaces */
  onDark: number
}

/**
 * One layer of a box shadow, `[x, y, blur, spread, alpha]`.
 * - Lengths are px, alpha multiplies `--ui-shadow-ink`.
 */
export type ShadowLayer = readonly [x: number, y: number, blur: number, spread: number, alpha: number]

////////////////
// ## Generator
////////////////

/** File names `StyleGenerator.sheets()` writes, inside `src/styles/`. */
export type GeneratedSheetName = "tokens.css" | "colors.css" | "sizes.css"

/** One `property: value` pair `StyleGenerator` writes, e.g. `["--ui-radius", "var(--ui-radius-m)"]`. */
export type GeneratedDeclaration = [property: string, value: string]

////////////////
// ## Theme files
////////////////

/**
 * A leaf of `themeTree`:  the token a theme value sets, or one token per scheme.
 * - A pair (`{ light, dark }`) takes a theme value pair as two declarations, not one `light-dark()`:
 *   `text > ink` is `--ui-ink-on-light` and `--ui-ink-on-dark`.
 */
export type ThemeLeaf = string | ThemeTokenPair

/** One token per scheme:  a `themeTree` leaf the scheme picks between by name, not by `light-dark()`. */
export type ThemeTokenPair = {
  /** token for the light scheme, e.g. `--ui-red-on-light` */
  readonly light: string
  /** token for the dark scheme */
  readonly dark: string
}

/** A group of `themeTree`:  leaves and groups, by name. */
export type ThemeTree = { readonly [name: string]: ThemeLeaf | ThemeTree }

/** A colour's leaves in `themeTree` (a hue, a brand alias, a semantic colour):  `colorTokensFor()`. */
export type ThemeColorTokens = Record<
  | "color"
  | "on"
  | "text"
  | "header"
  | "border"
  | "background"
  | "inverted"
  | "inverted-on"
  | "hover"
  | "focus"
  | "down"
  | "active",
  string
> & { base: ThemeTokenPair }

/**
 * One value of a theme file:  CSS text, the same in both schemes, or one per scheme.
 * - A number is CSS text too (`1.45`, `0.625`).
 * - `"{surfaces.panel}"`, anywhere in the text, points at another leaf:  written as `var(--ui-surface)`.
 * - A pair on a plain leaf is written as `light-dark(<light>, <dark>)`;  on a pair leaf, as its two tokens.
 */
export type ThemeValue = string | number | ThemeValuePair

/** A value per scheme:  `{ "light": "#e8dade", "dark": "#1a0c13" }`. */
export type ThemeValuePair = {
  /** in the light scheme */
  light: string | number
  /** in the dark scheme */
  dark: string | number
}

/** The values a theme file may set under a group of `themeTree`:  the same names, every one optional. */
export type ThemeValuesOf<Tree> = {
  -readonly [Name in keyof Tree]?: Tree[Name] extends ThemeLeaf ? ThemeValue : ThemeValuesOf<Tree[Name]>
}

/**
 * A theme file, `<name>.theme.json5` (or a palette, `palettes/<name>.palette.json5`), as data:
 * its values in `themeTree`'s nested groups, and what it builds on.
 * - Worked out from `themeTree`, so a leaf added there is a name here (and in `theme.schema.json`).
 * - `ThemeFile` writes its sheet, and checks every name.
 */
export type ThemeData = Prettify<
  ThemeValuesOf<typeof themeTree> & {
    /** `"./theme.schema.json"`, so VS Code completes and checks the file */
    $schema?: string
    /** its name, for a theme a person names (a saved theme);  Spell's own take their file's */
    title?: string
    /** the theme it builds on, whose sheet its own imports first (Fruity:  `"glass"`) */
    extends?: string
    /** the palette whose hues it borrows (`"apple"`:  `palettes/apple.palette.json5`) */
    palette?: string
    /**
     * what values can't say:  its rules sheets, by name, in `themes/rules/` (`["modern", "glass"]`)
     * - selectors, the blur behind glass, motion, a page setting that isn't a token
     */
    rules?: string[]
    /**
     * a family's own tokens, under its name:
     * `menu > segmented-active-background` is `--ui-menu-segmented-active-background`
     */
    components?: Record<string, Record<string, ThemeValue>>
    /** the theme's private values, by their full name less `--`:  `glass-blur` is `--glass-blur` */
    own?: Record<string, ThemeValue>
  }
>

////////////////
// ## Component tokens
////////////////

/** One custom-property declaration (`--ui-*`, `--_ui-*`) found in a sheet's text by `ComponentTokens.declarations()`. */
export type TokenDeclaration = {
  /** property name, e.g. `--ui-button-radius` */
  name: string
  /** index of the name in the sheet text */
  at: number
  /** 1-based line of the name */
  line: number
  /** value text, trimmed, comments blanked */
  value: string
  /** index where the value starts */
  valueStart: number
  /** index right after the value's last non-space character */
  valueEnd: number
  /** prelude of the enclosing rule, whitespace collapsed, e.g. `.ui.button, .ui.buttons, .or` */
  selector: string
  /** inside `@media` / `@container` / `@supports`:  a first declaration there usually lacks a base value */
  nested: boolean
  /** the comment right above, if any */
  comment?: string
}
