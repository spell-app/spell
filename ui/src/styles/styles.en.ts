/**
 * Global style vocabulary:  every name and value of the global scales, as typed DATA.
 * - Single source of truth for `tokens.css`, `colors.css` and `sizes.css` -- `StyleGenerator` reads this file
 *   (`yarn gen:styles`), so NEVER edit those sheets by hand.  Change a value here and regenerate.
 * - Keys are the CANONICAL names that reach CSS (`.ui.red`, `--ui-space-m`).  A translation
 *   (`styles.vocabulary.es.ts`) maps translated names onto these keys and never repeats the values.
 * - Key `default` means "the unsuffixed token", e.g. `fonts.default` => `--ui-font-family`.
 * - Lengths are `em` of the local font size or px -- NEVER rem (the page can redefine it).
 * - PURE DATA, near the bottom of the folder's import graph:  it imports `styles.types` as types only, so node reads
 *   it (`yarn gen:styles`, the docs site's token tables) and `spell/ui/styles` re-exports it as plain values.
 */

import type {
  HueDefinition,
  HueName,
  HueStates,
  OnColor,
  SchemeAlpha,
  SchemeColor,
  SchemeRecipe,
  SemanticDefinition,
  CodeLightness,
  ShadowLayer,
  ThemeColorTokens,
  ThemeTree
} from "./styles.types"

////////////////
// ## Hues
////////////////

/**
 * The palette:  Fomantic's 13 hue names, re-drawn in OKLCH.
 * - Same hue angles as Fomantic's hex values (so `red` still reads as Fomantic red), with lightness evened
 *   out and chroma nudged so no hue is much louder than its neighbours.
 * - `onDark` is lighter and a touch less saturated -- Fomantic's `light<Hue>` role, used by the dark scheme
 *   and `inverted` variations.
 * - `black` lightens instead of darkening for its states, as Fomantic's `@blackHover` does.  Its `inverted`
 *   (text / outline on dark surfaces) is near-white, as Fomantic's inverted black button is:  `onDark` (L 0.42)
 *   read 2.2:1 as text on the inverted surface.
 * - `onLight` of red / green / blue / pink is darker than the "even" lightness, so WHITE text passes WCAG AA
 *   (4.5:1) on the solid colour and its states -- was L 0.6 / 0.66 / 0.58 / 0.63, white 4.4 / 2.9 / 4.3 / 3.9:1.
 *   Yellow / olive / orange / teal stay light and take dark text instead (`onColors`, `--ui-<hue>-on`).
 * - `onDark` values are light enough that every hue but `black` takes DARK text in the dark scheme.
 * - `colors.contrast.test.ts` checks every pair, in both schemes.
 * - Order is display order (docs, colour pickers).
 */
export const hues = {
  red: { onLight: [0.57, 0.21, 27], onDark: [0.7, 0.19, 25] },
  orange: { onLight: [0.7, 0.18, 48], onDark: [0.77, 0.16, 52] },
  yellow: { onLight: [0.84, 0.17, 86], onDark: [0.88, 0.16, 92] },
  olive: { onLight: [0.79, 0.18, 122], onDark: [0.86, 0.16, 118] },
  green: { onLight: [0.53, 0.17, 148], onDark: [0.75, 0.18, 148] },
  teal: { onLight: [0.68, 0.12, 188], onDark: [0.8, 0.12, 190] },
  blue: { onLight: [0.55, 0.16, 250], onDark: [0.72, 0.14, 240] },
  violet: { onLight: [0.52, 0.22, 290], onDark: [0.7, 0.16, 290] },
  purple: { onLight: [0.56, 0.23, 316], onDark: [0.72, 0.19, 316] },
  pink: { onLight: [0.58, 0.22, 355], onDark: [0.76, 0.16, 350] },
  brown: { onLight: [0.56, 0.1, 55], onDark: [0.7, 0.12, 60] },
  grey: { onLight: [0.55, 0.01, 260], onDark: [0.72, 0.01, 260] },
  black: {
    onLight: [0.24, 0.01, 260],
    onDark: [0.42, 0.01, 260],
    inverted: [0.87, 0.005, 260],
    states: {
      hover: { lightness: 0.05, chroma: 1 },
      focus: { lightness: 0.08, chroma: 1 },
      down: { lightness: 0.1, chroma: 1 },
      active: { lightness: -0.05, chroma: 1 }
    }
  }
} as const satisfies Record<string, HueDefinition>

/**
 * Brand aliases:  a name that points at a palette hue.
 * - Emitted as `--ui-primary: var(--ui-blue)`, so a theme re-points `primary` with ONE token.
 * - An alias derives its states with its target's recipe (`secondary` lightens, like `black`).
 */
export const hueAliases = {
  primary: "blue",
  secondary: "black"
} as const satisfies Record<string, HueName>

/**
 * Default interaction-state recipe, Fomantic's `site.variables` in OKLCH terms.
 * - hover:  darken 5 + saturate 10;  focus:  darken 8 + saturate 20;  down:  darken 10;
 *   active:  darken 5 + saturate 15.
 */
export const hueStates = {
  hover: { lightness: -0.05, chroma: 1.1 },
  focus: { lightness: -0.08, chroma: 1.2 },
  down: { lightness: -0.1, chroma: 1 },
  active: { lightness: -0.05, chroma: 1.15 }
} as const satisfies HueStates

/**
 * Role colours derived from each hue, per scheme.
 * - `text` caps lightness so light hues stay legible (Fomantic hand-picked `@yellowTextColor: #b58105`);
 *   the dark scheme floors it instead.  The cap (0.5, was 0.56) is what gets green / teal /
 *   olive to 4.5:1 on white AND on the pale `background` tint.
 * - `header` ~== text darkened 5 (Fomantic's `@redHeaderColor`).
 * - `border` ~== text (Fomantic's `@redBorderColor`).
 * - `background` ~== a pale tint (Fomantic's `@redBackground: #ffe8e6`), a deep one in the dark scheme.
 */
export const hueRoles = {
  text: {
    light: { lightness: 0.5, mode: "atMost", chroma: 1 },
    dark: { lightness: 0.78, mode: "atLeast", chroma: 1 }
  },
  header: {
    light: { lightness: 0.45, mode: "atMost", chroma: 1 },
    dark: { lightness: 0.85, mode: "atLeast", chroma: 1 }
  },
  border: {
    light: { lightness: 0.6, mode: "atMost", chroma: 1 },
    dark: { lightness: 0.7, mode: "atLeast", chroma: 1 }
  },
  background: {
    light: { lightness: 0.96, mode: "exact", chroma: 0.25 },
    dark: { lightness: 0.28, mode: "exact", chroma: 0.35 }
  }
} as const satisfies Record<string, SchemeRecipe>

////////////////
// ## Semantic colours
////////////////

/**
 * Emotive colours for messages, labels, form states.
 * - `positive` / `negative` borrow palette hues, as Fomantic's `@positiveColor: @green` does.
 * - `info` / `warning` keep Fomantic's own cyan and amber.
 */
export const semanticColors = {
  positive: { hue: "green" },
  negative: { hue: "red" },
  info: { onLight: [0.74, 0.13, 218], onDark: [0.8, 0.12, 215] },
  warning: { onLight: [0.8, 0.16, 80], onDark: [0.86, 0.15, 85] }
} as const satisfies Record<string, SemanticDefinition>

/** Fomantic's "Positive / Negative Dupes":  `success` ~== `positive`, `error` ~== `negative`. */
export const semanticAliases = {
  success: "positive",
  error: "negative"
} as const satisfies Record<string, keyof typeof semanticColors>

/**
 * Role colours derived from each semantic colour, per scheme.
 * - Muted on purpose:  Fomantic's `@positiveTextColor: #2c662d` is a dark, desaturated green,
 *   `@positiveBackgroundColor: #fcfff5` barely tinted.
 */
export const semanticRoles = {
  text: {
    light: { lightness: 0.46, mode: "exact", chroma: 0.6 },
    dark: { lightness: 0.85, mode: "exact", chroma: 0.6 }
  },
  header: {
    light: { lightness: 0.4, mode: "exact", chroma: 0.6 },
    dark: { lightness: 0.9, mode: "exact", chroma: 0.5 }
  },
  border: {
    light: { lightness: 0.8, mode: "exact", chroma: 0.3 },
    dark: { lightness: 0.45, mode: "exact", chroma: 0.4 }
  },
  background: {
    light: { lightness: 0.985, mode: "exact", chroma: 0.08 },
    dark: { lightness: 0.25, mode: "exact", chroma: 0.25 }
  }
} as const satisfies Record<string, SchemeRecipe>

////////////////
// ## Neutrals
////////////////

/**
 * Surfaces and ink, per scheme.
 * - `ink` is the base of every text, border and shadow alpha -- a theme re-inks the page with one token.
 * - `surface-muted` ~== Fomantic's `@offWhite`, `surface-strong` ~== `@darkWhite`.
 * - `highlight` ~== `::selection` background.
 */
export const neutrals = {
  ink: { onLight: [0.15, 0.01, 260], onDark: [0.99, 0.005, 260] },
  background: { onLight: [1, 0, 0], onDark: [0.19, 0.006, 260] },
  surface: { onLight: [1, 0, 0], onDark: [0.23, 0.006, 260] },
  "surface-muted": { onLight: [0.985, 0.002, 248], onDark: [0.26, 0.006, 260] },
  "surface-strong": { onLight: [0.967, 0.002, 248], onDark: [0.3, 0.006, 260] },
  highlight: { onLight: [0.906, 0.046, 255], onDark: [0.42, 0.09, 255] }
} as const satisfies Record<string, SchemeColor>

/**
 * Foreground candidates for text ON a solid colour, in preference order:  `--ui-<name>-on`.
 * - `StyleGenerator` picks, per colour and per scheme, the FIRST candidate that reaches WCAG AA's text contrast
 *   (4.5:1) on the colour AND every interaction state of it;  failing that, the best one.
 * - White first:  Fomantic put white on every hue, so keep it wherever it passes.
 * - `dark` is the light scheme's ink, emitted as `var(--ui-ink-on-light)` so a re-inked theme follows.
 */
export const onColors = {
  light: { color: [1, 0, 0], css: "oklch(1 0 0)" },
  dark: { color: neutrals.ink.onLight, css: "var(--ui-ink-on-light)" }
} as const satisfies Record<string, OnColor>

/**
 * Text alpha roles:  Fomantic's "Neutral Text" (`@mutedTextColor: rgb(0 0 0 / 0.6)`) and their
 * `inverted` counterparts (`@invertedMutedTextColor: rgb(255 255 255 / 0.8)`), as alphas of `ink`.
 * - `default` ~== `--ui-text-color` (Fomantic's `@textColor`).
 * - `light` / `unselected` are 0.58 on light surfaces, not Fomantic's 0.4 (2.7:1 on white):  the lowest alpha of
 *   `ink` that still reaches WCAG AA 4.5:1 on white.  `disabled` stays faint (inactive controls are exempt).
 */
export const textAlphas = {
  default: { onLight: 0.87, onDark: 0.9 },
  dark: { onLight: 0.85, onDark: 0.95 },
  muted: { onLight: 0.6, onDark: 0.8 },
  light: { onLight: 0.58, onDark: 0.7 },
  unselected: { onLight: 0.58, onDark: 0.5 },
  hovered: { onLight: 0.8, onDark: 1 },
  pressed: { onLight: 0.9, onDark: 1 },
  selected: { onLight: 0.95, onDark: 1 },
  disabled: { onLight: 0.3, onDark: 0.3 }
} as const satisfies Record<string, SchemeAlpha>

/**
 * Border alpha roles:  Fomantic's `@borderColor: rgb(34 36 38 / 0.15)` family, as alphas of `ink`.
 * - `default` ~== `--ui-border-color`.
 */
export const borderAlphas = {
  default: { onLight: 0.15, onDark: 0.15 },
  strong: { onLight: 0.22, onDark: 0.25 },
  internal: { onLight: 0.1, onDark: 0.1 },
  selected: { onLight: 0.35, onDark: 0.45 },
  "selected-strong": { onLight: 0.5, onDark: 0.6 },
  disabled: { onLight: 0.5, onDark: 0.5 }
} as const satisfies Record<string, SchemeAlpha>

////////////////
// ## Typography
////////////////

/**
 * Base font size in px:  `--ui-font-size`, the ONE length everything scales from.
 * - px on purpose -- NEVER rem, which the host page can redefine.
 */
export const fontSize = 16

/**
 * Font stacks.
 * - Modernized look:  system UI stack (Fomantic's `@fallbackFonts`) instead of Lato;
 *   `themes/classic.css` puts Lato back.
 */
export const fonts = {
  default: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Noto Sans",
    "Liberation Sans",
    "Arial",
    "sans-serif",
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Segoe UI Symbol",
    "Noto Color Emoji"
  ],
  heading: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Noto Sans", "Arial", "sans-serif"],
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "Courier New",
    "monospace"
  ],
  /**
   * a serif for reading:  Palatino first, then the serifs most computers have
   * - Paper reads it (Iowan Old Style before it), and the theme editor's "Palatino" (epic `debut` P20, J77)
   */
  serif: ["Palatino", "Palatino Linotype", "Book Antiqua", "P052", "URW Palladio L", "Georgia", "serif"],
  /**
   * a plain sans, the platform's own:  `<ui-text sans-serif>` (epic `elemental-spell` P26)
   * - Its own token, not the body's:  a theme whose body is a serif (Paper) still has a sans to offer
   */
  sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Noto Sans", "Arial", "sans-serif"],
  /**
   * a subhead's, under a heading:  `<ui-text subhead>` (epic `elemental-spell` P26)
   * - The heading's, unless a theme sets its own (Spell's:  its sans, under its serif headings)
   */
  subhead: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Noto Sans", "Arial", "sans-serif"],
  /** a typewriter's letters, every one the same width:  `<ui-text typewriter>` (epic `elemental-spell` P26) */
  typewriter: ["American Typewriter", "Courier Prime", "Courier New", "Courier", "monospace"],
  /** a rounded sans, the platform's own where it has one:  Pop, and the theme editor's "Rounded" (J77) */
  rounded: [
    "ui-rounded",
    "SF Pro Rounded",
    "Arial Rounded MT",
    "Varela Round",
    "Quicksand",
    "Nunito",
    "system-ui",
    "sans-serif"
  ],
  /** colour emoji fonts, Firefox's own last:  what `<ui-emoji>` and every flag (`<ui-flag>`, menu rows) draw with */
  emoji: ["Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "Segoe UI Symbol"]
} as const satisfies Record<string, readonly string[]>

/** Font weights by role. */
export const fontWeights = {
  light: 300,
  normal: 400,
  semibold: 600,
  bold: 700
} as const satisfies Record<string, number>

/** Unitless line heights by role. */
export const lineHeights = {
  default: 1.5,
  heading: 1.25,
  tight: 1.2
} as const satisfies Record<string, number>

/** Heading size relative to body text, for `ui-heading` (`* --ui-scale`). */
export const headingRatio = 1.5

/** Caption size relative to body text, for `ui-caption` (`* --ui-scale`). */
export const captionRatio = 0.875

////////////////
// ## Sizes and spacing
////////////////

/**
 * Component sizes as ratios of `--ui-font-size` (16px).
 * - `medium` is a REAL size meaning "default":  `.medium` emits `--ui-scale: 1`, a no-op, so it's
 *   accepted everywhere a size is.
 */
export const sizes = {
  mini: 0.625,
  tiny: 0.75,
  small: 0.875,
  medium: 1,
  large: 1.125,
  big: 1.25,
  huge: 1.5,
  massive: 2
} as const satisfies Record<string, number>

/**
 * Spacing ladder in `em` of the LOCAL font size, named like Web Awesome's `--wa-space-*`.
 * - `em`, so a `large` component's padding grows with it.
 */
export const spacing = {
  "3xs": 0.125,
  "2xs": 0.25,
  xs: 0.5,
  s: 0.75,
  m: 1,
  l: 1.5,
  xl: 2,
  "2xl": 3,
  "3xl": 4
} as const satisfies Record<string, number>

/**
 * Border radii by role.
 * - Softer than Fomantic's flat 4px (`themes/classic.css` puts that back).
 * - `pill` is a large px value rather than `50%`, which would make an oval of a wide box.
 */
export const radii = {
  s: "0.25em",
  m: "0.375em",
  l: "0.75em",
  pill: "9999px",
  circle: "50%",
  square: "0"
} as const satisfies Record<string, string>

/** Border width in px (Fomantic's `@borderWidth`). */
export const borderWidth = 1

/** Focus ring geometry in px:  `outline: <width> solid var(--ui-focus-color)`, `outline-offset: <offset>`. */
export const focusRing = {
  width: 2,
  offset: 2
} as const satisfies Record<string, number>

/** Opacity of disabled controls (Fomantic's `@disabledOpacity`). */
export const disabledOpacity = 0.45

/**
 * How long, in ms, the pointer rests on a target before its hover popup shows (`--ui-hover-delay`):  the page's
 * preference for every `<ui-popup open-on="hover">` that names no `show-delay` of its own.
 * - Owen, 2026-10-25:  "have a theme preference somewhere for tooltip delay, they're all too quick" (Fomantic's 50ms)
 * - a theme or page sets the token:  `:root { --ui-hover-delay: 2s }`
 * - NOT the browser's own `title` tooltips:  their delay is the operating system's
 */
export const hoverDelay = 800

/**
 * The cursor over a control:  a button, a menu item, a tab (`--ui-control-cursor`).
 * - `pointer`, as the web does;  a theme that wants a Mac's arrow sets `default` (Glass, and Fruity from it).
 * - One value, inherited into every shadow root, so a page or theme changes it once.
 * - NOT real links, which keep the hand, as a Mac app's do.
 */
export const controlCursor = "pointer"

/**
 * A control's height:  a button, an input, a dropdown, a select (`--ui-control-height`), at the `medium` size.
 * - `0px`:  no fixed height, so its padding says how tall it is, as the web does.
 * - A theme that wants a Mac's one height per size sets it (Glass, on a page that's an app), and sets those controls'
 *   padding to `0px` so the height alone decides.
 * - Each size follows:  the height times `--ui-scale`.
 */
export const controlHeight = "0px"

////////////////
// ## Layout
////////////////

/**
 * Page breakpoints in px, Fomantic's names and values.
 * - Also emitted as `@custom-media --ui-mobile` ... in `media.css` for page-level media queries;
 *   components use container queries instead.
 */
export const breakpoints = {
  mobile: 320,
  tablet: 768,
  computer: 992,
  largeMonitor: 1200,
  widescreen: 1920
} as const satisfies Record<string, number>

/**
 * Stacking order, lowest first.
 * - Only matters outside the top layer:  `<dialog>` and `popover` content ignores z-index.
 * - Gaps leave room for app layers in between.
 */
export const zIndices = {
  dropdown: 100,
  sticky: 800,
  dimmer: 1000,
  modal: 1010,
  popup: 1900,
  toast: 2000
} as const satisfies Record<string, number>

////////////////
// ## Motion
////////////////

/**
 * Durations in ms.
 * - `fast` ~== Fomantic's `@defaultDuration` (hover / focus), `slow` ~== `@transitionDefaultDuration`.
 * - Longer animations (`fly`, `swing`) are multiples of these in `animations.css`.
 */
export const durations = {
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
  slowest: 750
} as const satisfies Record<string, number>

/**
 * Easing curves.
 * - `spring` is Fomantic's `drop` overshoot, `decelerate` its `fly`, `expo` its `glow`.
 */
export const easings = {
  default: "ease",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.61, 0.7, 1)",
  decelerate: "cubic-bezier(0.215, 0.61, 0.355, 1)",
  expo: "cubic-bezier(0.19, 1, 0.22, 1)"
} as const satisfies Record<string, string>

////////////////
// ## Shadows
////////////////

/**
 * Box-shadow roles as layers of `--ui-shadow-ink`.
 * - `subtle` / `bottom` / `floating` / `floating-hover` are Fomantic's accents;  `raised` (segments, cards)
 *   and `overlay` (modals, popups) are softer modern additions.
 */
export const shadows = {
  subtle: [[0, 1, 2, 0, 0.15]],
  bottom: [[0, 2, 1, -1, 0.15]],
  raised: [
    [0, 1, 2, 0, 0.08],
    [0, 1, 3, 0, 0.1]
  ],
  floating: [
    [0, 2, 4, 0, 0.12],
    [0, 2, 10, 0, 0.15]
  ],
  "floating-hover": [
    [0, 2, 4, 0, 0.15],
    [0, 2, 10, 0, 0.25]
  ],
  overlay: [
    [0, 4, 8, -2, 0.12],
    [0, 12, 28, -4, 0.22]
  ]
} as const satisfies Record<string, readonly ShadowLayer[]>

////////////////
// ## Code
////////////////

/**
 * The code's colours, by what they colour (epic `debut` P22):  every theme's, light and dark, as `--ui-code-<role>`
 * (`text` is `--ui-code-color`).
 * - The editor's code (Monaco, `CodeThemes`), every `<ui-code>` block and the Spell VS Code themes read the same ones.
 * - Each role's RECIPE:  where a theme with no code colours of its own takes it from, `[source, lightness]`:
 *   - `source`:  a colour the theme already has, its hue and chroma kept (`oklch(from <source> ...)`)
 *   - lightness:  `strong` reads on the code's background in both schemes (OKLCH 0.48 light, 0.80 dark);
 *     `soft`, comments and punctuation, a step quieter and greyer (0.50, 0.74)
 *   - `StyleGenerator` writes them into `colors.css` (`ui.tokens`);  a theme file's `code` group sets any of them
 *     by hand, and wins (`ui.theme`).
 * - `colors.contrast.test.ts` holds every one to 4.5:1 on the theme's panel, comments too:  a Spell file's comments are
 *   its prose.
 * - The roles are the editor's (`ShadesOfPurple.rules()`'s), plus `attr`, `meta`, `addition` and `deletion`, which
 *   `<ui-code>`'s highlight.js colours read;  its `number` and `title` take `constant` and `action`.
 */
export const codeRoles = {
  /** a `#` heading comment:  the primary */
  heading: ["var(--ui-primary)", "strong"],
  /** a comment:  muted text, a step toward the primary */
  comment: ["color-mix(in oklab, var(--ui-text-muted) 65%, var(--ui-primary))", "soft"],
  /** spell's own words (`a`, `is a`, `if its`), a language's keywords:  the accent, else orange */
  keyword: ["var(--ui-accent, var(--ui-orange))", "strong"],
  /** a type's name:  the warning colour (a yellow) */
  type: ["var(--ui-warning)", "strong"],
  /** a type spell itself defines (`text`, `number`):  teal */
  library: ["var(--ui-teal)", "strong"],
  /** a variable's name:  the text's own hue */
  name: ["var(--ui-text-color)", "plain"],
  /** a property's name:  the info colour, toward the primary */
  member: ["color-mix(in oklab, var(--ui-info) 70%, var(--ui-primary))", "strong"],
  /** a parameter's name:  between the warning colour and the keyword's */
  parameter: ["color-mix(in oklab, var(--ui-warning) 55%, var(--ui-accent, var(--ui-orange)))", "strong"],
  /** an action's (a method's) name:  the info colour */
  action: ["var(--ui-info)", "strong"],
  /** a constant:  a number, `yes`, one of a list's choices:  pink */
  constant: ["var(--ui-pink)", "strong"],
  /** text in quotes:  the positive colour (a green) */
  string: ["var(--ui-positive)", "strong"],
  /** a drawing's tag (`<ui-form>`):  purple, toward the primary */
  tag: ["color-mix(in oklab, var(--ui-purple) 60%, var(--ui-primary))", "strong"],
  /** symbols and punctuation:  muted text */
  punctuation: ["color-mix(in oklab, var(--ui-text-muted) 80%, var(--ui-primary))", "soft"],
  /** an attribute's or a property's name in other languages:  as `member` */
  attr: ["color-mix(in oklab, var(--ui-info) 70%, var(--ui-primary))", "strong"],
  /** a preprocessor line, a tag's angle brackets:  the info colour */
  meta: ["var(--ui-info)", "strong"],
  /** a diff's added line:  the positive colour */
  addition: ["var(--ui-positive)", "strong"],
  /** a diff's removed line:  the negative colour */
  deletion: ["var(--ui-negative)", "strong"]
} as const satisfies Record<string, readonly [source: string, lightness: CodeLightness]>

/**
 * Each lightness of `codeRoles`, OKLCH, light and dark, and the most chroma it keeps;
 * `plain` keeps its source as it is (the code's own text).
 */
export const codeLightness = {
  strong: { light: 0.48, dark: 0.8, chroma: 0.17 },
  soft: { light: 0.5, dark: 0.74, chroma: 0.08 },
  plain: undefined
} as const satisfies Record<CodeLightness, { light: number; dark: number; chroma: number } | undefined>

/**
 * The editor's own colours, each from the theme's colours:  what `StyleGenerator` writes for `code > editor`.
 * - A theme file's `code > editor` sets any of them by hand.
 */
export const codeEditorColors = {
  "--ui-code-color": "var(--ui-text-color)",
  "--ui-code-cursor": "var(--ui-primary-text)",
  "--ui-code-selection": "color-mix(in oklab, var(--ui-primary) 30%, transparent)",
  "--ui-code-current-line": "color-mix(in oklab, var(--ui-text-color) 6%, transparent)",
  "--ui-code-gutter-color": "var(--ui-text-muted)",
  "--ui-code-gutter-active": "var(--ui-primary-text)",
  "--ui-code-bracket": "color-mix(in oklab, var(--ui-primary) 25%, transparent)",
  "--ui-code-find": "color-mix(in oklab, var(--ui-warning) 40%, transparent)"
} as const

////////////////
// ## The theme tree
////////////////

/**
 * Every value a THEME sets, in nested groups:  the tree a theme file's values follow (`<name>.theme.json5`).
 * - Each LEAF names the token it sets:  `surfaces > page` is `--ui-background`.
 *   - A leaf `{ light, dark }` is a pair of tokens, one per scheme (`text > ink`, a hue's `base`):
 *     a theme's pair of values is written to the two, not as one `light-dark()`.
 * - Written ONCE, and read by everything that knows a theme's names (epic `debut` P18):
 *   - `ThemeFile`, which turns a theme file into its sheet, and checks every name against this tree
 *   - `theme.schema.json` (`yarn gen:styles`), so VS Code completes and checks a theme file
 *   - `ThemeData`, the type of a theme file, worked out from it
 *   - the Full Theme Builder's folds (epic `debut` P22)
 * - Its top groups are the theming page's token tables' groups, by the same names (`FoundationTokens`):
 *   - a theme sets only some of them, so `scheme`, `stacking` and `breakpoints` are left out
 *   - except the table's `palette`, here `hues`:  a theme file's `palette` names the palette it borrows (`"apple"`)
 * - The scales' own names come from the scales above, so a step added there is a leaf here too.
 * - NOT here:  a family's own tokens (`--ui-menu-*`) and a theme's private ones (`--glass-blur`).
 *   A theme file holds those in its two open groups, `components` and `own` (`ThemeFile`).
 */
export const themeTree = {
  typography: {
    size: "--ui-font-size",
    family: {
      body: "--ui-font-family",
      heading: "--ui-font-family-heading",
      mono: "--ui-font-family-mono",
      serif: "--ui-font-family-serif",
      sans: "--ui-font-family-sans",
      typewriter: "--ui-font-family-typewriter",
      subhead: "--ui-font-family-subhead",
      rounded: "--ui-font-family-rounded"
    },
    weight: tokensFor(fontWeights, "--ui-font-weight-"),
    "line-height": { body: "--ui-line-height", heading: "--ui-line-height-heading", tight: "--ui-line-height-tight" },
    ratio: { heading: "--ui-heading-ratio", caption: "--ui-caption-ratio" }
  },
  sizes: tokensFor(sizes, "--ui-size-"),
  spacing: tokensFor(spacing, "--ui-space-"),
  radii: { default: "--ui-radius", ...tokensFor(radii, "--ui-radius-") },
  text: {
    ink: { light: "--ui-ink-on-light", dark: "--ui-ink-on-dark" },
    body: "--ui-text-color",
    strong: "--ui-text-dark",
    muted: "--ui-text-muted",
    light: "--ui-text-light",
    unselected: "--ui-text-unselected",
    hovered: "--ui-text-hovered",
    pressed: "--ui-text-pressed",
    selected: "--ui-text-selected",
    disabled: "--ui-text-disabled"
  },
  surfaces: {
    page: "--ui-background",
    panel: "--ui-surface",
    inset: "--ui-surface-muted",
    strong: "--ui-surface-strong",
    bar: "--ui-bar-background",
    code: "--ui-code-background",
    highlight: "--ui-highlight",
    wallpaper: "--ui-wallpaper"
  },
  borders: {
    width: "--ui-border-width",
    color: "--ui-border-color",
    strong: "--ui-border-color-strong",
    internal: "--ui-border-color-internal",
    selected: "--ui-border-color-selected",
    "selected-strong": "--ui-border-color-selected-strong",
    disabled: "--ui-border-color-disabled"
  },
  brand: {
    primary: colorTokensFor("primary"),
    secondary: colorTokensFor("secondary"),
    accent: colorTokensFor("accent"),
    link: { color: "--ui-link", hover: "--ui-link-hover" },
    focus: {
      width: "--ui-focus-width",
      offset: "--ui-focus-offset",
      color: "--ui-focus-color",
      border: "--ui-focus-border"
    }
  },
  semantic: {
    positive: colorTokensFor("positive"),
    negative: colorTokensFor("negative"),
    info: colorTokensFor("info"),
    warning: colorTokensFor("warning"),
    success: colorTokensFor("success"),
    error: colorTokensFor("error")
  },
  hues: {
    red: colorTokensFor("red"),
    orange: colorTokensFor("orange"),
    yellow: colorTokensFor("yellow"),
    olive: colorTokensFor("olive"),
    green: colorTokensFor("green"),
    teal: colorTokensFor("teal"),
    blue: colorTokensFor("blue"),
    violet: colorTokensFor("violet"),
    purple: colorTokensFor("purple"),
    pink: colorTokensFor("pink"),
    brown: colorTokensFor("brown"),
    grey: colorTokensFor("grey"),
    black: colorTokensFor("black")
  } satisfies Record<keyof typeof hues, ThemeColorTokens>,
  shadows: { ink: "--ui-shadow-ink", ...tokensFor(shadows, "--ui-shadow-") },
  code: {
    text: "--ui-code-color",
    ...tokensFor(codeRoles, "--ui-code-"),
    editor: {
      cursor: "--ui-code-cursor",
      selection: "--ui-code-selection",
      line: "--ui-code-current-line",
      "line-number": "--ui-code-gutter-color",
      "line-number-active": "--ui-code-gutter-active",
      bracket: "--ui-code-bracket",
      find: "--ui-code-find"
    }
  },
  motion: {
    duration: tokensFor(durations, "--ui-duration-"),
    ease: { ...tokensFor(easings, "--ui-ease-"), default: "--ui-ease" },
    "hover-delay": "--ui-hover-delay"
  },
  cursors: { control: "--ui-control-cursor" },
  controls: { height: "--ui-control-height" }
} as const satisfies ThemeTree

/** Scale `scale`'s steps, each the token `<prefix><step>`:  `tokensFor(sizes, "--ui-size-")`. */
function tokensFor<Scale extends object>(scale: Scale, prefix: string): Record<keyof Scale, string> {
  return Object.fromEntries(Object.keys(scale).map((step) => [step, `${prefix}${step}`])) as Record<keyof Scale, string>
}

/**
 * A colour's leaves (a hue, a brand alias, a semantic colour):  the colour itself, its base per scheme, and every
 * role `colors.css` works out from it, which a theme may set by hand instead.
 */
function colorTokensFor(name: string): ThemeColorTokens {
  const token = (suffix: string) => `--ui-${name}${suffix}`
  return {
    color: token(""),
    base: { light: token("-on-light"), dark: token("-on-dark") },
    on: token("-on"),
    text: token("-text"),
    header: token("-header"),
    border: token("-border"),
    background: token("-background"),
    inverted: token("-inverted"),
    "inverted-on": token("-inverted-on"),
    hover: token("-hover"),
    focus: token("-focus"),
    down: token("-down"),
    active: token("-active")
  }
}
