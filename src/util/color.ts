/**
 * Colour maths:  OKLCH <-> sRGB, fitting a colour into sRGB, and WCAG contrast.
 * - ONE shape each, a plain object:  `Rgb` (`{ r, g, b }`, each `0..1`) and `Oklch` (`{ l, c, h }`);
 *   hex in and out (`hexToRgb()`, `rgbToHex()` ...)
 * - Björn Ottosson's OKLab matrices, the ones CSS Color 4 uses
 * - Pure:  no DOM, no canvas, so node tools and tests use it as pages do.
 *   Reading a colour the browser drew (a canvas pixel) is the caller's.
 * - Standalone:  no imports, so plain `node` loads it too (`spell/util/color.ts`).
 * - Moved down from Spell UI's `ColorContrast` and `DesignColor`, the brand's `Palette` and the kit's `A11y`
 *   (epic `coherence` I13).
 */

////////////////
// ## Shapes
////////////////

/** An sRGB colour, each channel `0..1` (gamma-encoded, as CSS writes it);  `alpha` `0..1`, default opaque. */
export type Rgb = { r: number; g: number; b: number; alpha?: number }

/** An OKLCH colour:  lightness `0..1`, chroma `0..~0.4`, hue in degrees;  `alpha` `0..1`, default opaque. */
export type Oklch = { l: number; c: number; h: number; alpha?: number }

/** Any colour these helpers take:  either shape, or hex (`#rgb`, `#rrggbb`, with or without alpha). */
export type AnyColor = Rgb | Oklch | string

/** WCAG AA's least contrast for body text (1.4.3). */
export const CONTRAST_TEXT = 4.5

/** WCAG AA's least contrast for large text (1.4.3) and a control's edges (1.4.11). */
export const CONTRAST_LARGE = 3

////////////////
// ## Conversions
////////////////

/**
 * `color` in sRGB, NOT fitted:  a channel outside `0..1` means it's out of gamut (`inGamut()`).
 * - fit it with `clipped()` (per channel) or `toGamut()` (less chroma)
 */
export function oklchToRgb({ l, c, h, alpha }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return withAlpha(
    {
      r: encoded(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
      g: encoded(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
      b: encoded(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short)
    },
    alpha
  )
}

/** `rgb` in OKLCH;  a grey's hue is `0`. */
export function rgbToOklch({ r, g, b, alpha }: Rgb): Oklch {
  const [red, green, blue] = [r, g, b].map(linear) as [number, number, number]
  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)
  const lightness = 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short
  const a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short
  const bValue = 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short
  const chroma = Math.hypot(a, bValue)
  const hue = chroma < 1e-6 ? 0 : ((Math.atan2(bValue, a) * 180) / Math.PI + 360) % 360
  return withAlpha({ l: lightness, c: chroma, h: hue }, alpha)
}

/**
 * `hex` as sRGB:  `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`, the `#` optional, either case.
 * - throws a `TypeError` on anything else
 */
export function hexToRgb(hex: string): Rgb {
  let digits = hex.trim().replace(/^#/, "")
  if (!/^[0-9a-f]+$/i.test(digits) || ![3, 4, 6, 8].includes(digits.length))
    throw new TypeError(`hexToRgb():  "${hex}" isn't a hex colour;  write #rgb, #rrggbb or #rrggbbaa`)
  if (digits.length <= 4) digits = digits.replace(/./g, (digit) => digit + digit)
  const channel = (index: number) => parseInt(digits.slice(index * 2, index * 2 + 2), 16) / 255
  return withAlpha({ r: channel(0), g: channel(1), b: channel(2) }, digits.length === 8 ? channel(3) : undefined)
}

/** `rgb` as `#rrggbb`, lower case, or `#rrggbbaa` when it isn't opaque;  each channel clipped to `0..1`. */
export function rgbToHex({ r, g, b, alpha }: Rgb): string {
  const opacity = alpha === undefined || alpha >= 1 ? "" : byte(alpha)
  return `#${byte(r)}${byte(g)}${byte(b)}${opacity}`
}

/** `hex` in OKLCH. */
export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex))
}

/**
 * `color` as hex, fitted into sRGB the way `fit` says:
 * - `"clip"` (default):  each channel clipped, as axe-core and the browsers do
 * - `"chroma"`:  the most chroma that fits, same lightness and hue (`toGamut()`), as a palette wants
 */
export function oklchToHex(color: Oklch, { fit = "clip" }: { fit?: "clip" | "chroma" } = {}): string {
  return rgbToHex(oklchToRgb(fit === "chroma" ? toGamut(color) : color))
}

/** Any colour as sRGB, clipped into gamut. */
export function rgbOf(color: AnyColor): Rgb {
  if (typeof color === "string") return hexToRgb(color)
  return "l" in color ? clipped(oklchToRgb(color)) : color
}

////////////////
// ## Gamut
////////////////

/** Is `rgb` displayable in sRGB:  each channel `0..1`, with a hair of slack for rounding? */
export function inGamut({ r, g, b }: Rgb): boolean {
  return [r, g, b].every((value) => value >= -GAMUT_SLACK && value <= 1 + GAMUT_SLACK)
}

/**
 * `rgb` with each channel clipped to `0..1`, as axe-core does (`toGamut({ method: "clip" })`):
 * so a contrast worked out here is the one axe reports.
 */
export function clipped({ r, g, b, alpha }: Rgb): Rgb {
  return withAlpha({ r: unit(r), g: unit(g), b: unit(b) }, alpha)
}

/**
 * `color` with the most chroma that fits in sRGB, its lightness and hue kept (24 halvings):
 * the palette's way, which keeps a hue's look where clipping shifts it.
 */
export function toGamut(color: Oklch): Oklch {
  if (inGamut(oklchToRgb(color))) return color
  let low = 0
  let high = color.c
  for (let round = 0; round < 24; round++) {
    const middle = (low + high) / 2
    if (inGamut(oklchToRgb({ ...color, c: middle }))) low = middle
    else high = middle
  }
  return { ...color, c: low }
}

////////////////
// ## Contrast
////////////////

/** WCAG relative luminance of `color`, `0..1`;  out of gamut, clipped first;  its alpha ignored. */
export function luminance(color: AnyColor): number {
  const { r, g, b } = rgbOf(color)
  return 0.2126 * linear(unit(r)) + 0.7152 * linear(unit(g)) + 0.0722 * linear(unit(b))
}

/** WCAG contrast ratio of `a` and `b`, `1..21`, either order. */
export function contrast(a: AnyColor, b: AnyColor): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter! + 0.05) / (darker! + 0.05)
}

////////////////
// ## Helpers
////////////////

/** How far outside `0..1` a channel may stray and still count as in gamut:  rounding. */
const GAMUT_SLACK = 0.0005

/** sRGB channel => linear light. */
function linear(channel: number): number {
  const size = Math.abs(channel)
  return Math.sign(channel) * (size <= 0.04045 ? size / 12.92 : ((size + 0.055) / 1.055) ** 2.4)
}

/** Linear light => sRGB channel;  sign kept, so out-of-gamut values stay out. */
function encoded(channel: number): number {
  const size = Math.abs(channel)
  return Math.sign(channel) * (size <= 0.0031308 ? 12.92 * size : 1.055 * size ** (1 / 2.4) - 0.055)
}

/** `value` clipped to `0..1`. */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** A `0..1` value as two hex digits, clipped. */
function byte(value: number): string {
  return Math.round(unit(value) * 255)
    .toString(16)
    .padStart(2, "0")
}

/** `color` with `alpha` when there is one:  an opaque colour has no `alpha` key. */
function withAlpha<T extends object>(color: T, alpha: number | undefined): T & { alpha?: number } {
  return alpha === undefined ? color : { ...color, alpha }
}
