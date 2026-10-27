import { rgbToHex } from "spell/util/color"

/****************
 * ### `TokenColor`
 * A token's colour, for the theme editor's colour controls:  split into what the browser's picker takes (`#rrggbb`)
 * and its opacity, then put back together as the theme files write a colour (`#rrggbb`, `#rrggbbaa` when see-through).
 * - Resolves where it's drawn:  a hidden probe inside `context` takes the colour, and the colour it computes
 *   (an `oklch()`, a `light-dark()` in `context`'s scheme ...) is painted on a 1px canvas and read back as sRGB,
 *   its alpha kept.
 * - The page's ONE such canvas (`paint()`):  the docs' token tables paint on it too (`<ui-docs-tokens>`' `ColorProbe`,
 *   which flattens a translucent colour over the page).  The maths is the kit's (`rgbToHex()`).
 * - Static:  one 1px canvas for the page, made on first use.
 ****************/
export class TokenColor {
  /** Whether `value` is a colour (a `var()`-free one:  every `var()` makes it pass). */
  static isColor(value: string): boolean {
    return !!value && !value.includes("var(") && CSS.supports("color", value)
  }

  /**
   * `value`, any CSS colour, as the picker's `#rrggbb` and its opacity, 0-100, resolved inside `context`;
   * `undefined` when it can't be painted.
   */
  static split(value: string, context: Element | ShadowRoot): { hex: string; opacity: number } | undefined {
    const probe = document.createElement("span")
    probe.hidden = true
    probe.style.color = value
    context.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    const painted = TokenColor.paint(color)
    if (!painted) return undefined
    const { red, green, blue, alpha } = painted
    return { hex: rgbToHex({ r: red / 255, g: green / 255, b: blue / 255 }), opacity: Math.round((alpha / 255) * 100) }
  }

  /**
   * Computed colour `color` as the browser paints it on the 1px canvas, over `backdrop` if given:
   * its sRGB channels and alpha, 0-255 each;  `undefined` where there's no canvas.
   * - A colour that won't parse paints black.
   */
  static paint(color: string, backdrop?: string): PaintedColor | undefined {
    const canvas = TokenColor.canvas()
    if (!canvas || !color) return undefined
    canvas.clearRect(0, 0, 1, 1)
    if (backdrop) {
      canvas.fillStyle = backdrop
      canvas.fillRect(0, 0, 1, 1)
    }
    canvas.fillStyle = BLACK
    canvas.fillStyle = color
    canvas.fillRect(0, 0, 1, 1)
    const [red, green, blue, alpha] = canvas.getImageData(0, 0, 1, 1).data
    return { red: red!, green: green!, blue: blue!, alpha: alpha! }
  }

  /** `#rrggbb` at `opacity` (0-100), as a theme file writes it:  `#rrggbb` when opaque, else `#rrggbbaa`. */
  static join(hex: string, opacity: number): string {
    if (opacity >= 100) return hex
    return (
      hex +
      Math.round((Math.max(0, opacity) / 100) * 255)
        .toString(16)
        .padStart(2, "0")
    )
  }

  ////////////////
  // ## Internal
  ////////////////

  /** The 1px canvas the colours are painted on;  `undefined` before the first, or where there's no 2D context. */
  private static context: CanvasRenderingContext2D | undefined

  /** The canvas was made (whether or not it gave a 2D context):  never tried twice. */
  private static hasTriedCanvas = false

  /** The shared 1px canvas, made on first use. */
  private static canvas(): CanvasRenderingContext2D | undefined {
    if (!TokenColor.hasTriedCanvas) {
      TokenColor.hasTriedCanvas = true
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      // `getContext()` says "none" with `null`
      TokenColor.context = canvas.getContext("2d", { willReadFrequently: true }) ?? undefined
    }
    return TokenColor.context
  }
}

/** A colour as painted:  sRGB channels and alpha, 0-255 each. */
export type PaintedColor = { red: number; green: number; blue: number; alpha: number }

/** What the canvas paints for a colour that won't parse. */
const BLACK = "#000000"
