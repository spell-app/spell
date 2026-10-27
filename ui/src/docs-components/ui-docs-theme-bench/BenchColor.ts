import { rgbToHex } from "spell/util/color"

/****************
 * ### `BenchColor`
 * A token's colour, for the theme bench's colour controls:  split into what the browser's picker takes (`#rrggbb`)
 * and its opacity, then put back together as the theme files write a colour (`#rrggbb`, `#rrggbbaa` when see-through).
 * - Resolves where it's drawn:  a hidden probe inside `context` takes the colour, and the colour it computes
 *   (an `oklch()`, a `light-dark()` in `context`'s scheme ...) is painted on a 1px canvas and read back as sRGB,
 *   its alpha kept (unlike `<ui-docs-tokens>`' `ColorProbe`, which flattens it for its own picker).
 * - Static:  one 1px canvas for the page, made on first use.
 ****************/
export class BenchColor {
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
    const canvas = BenchColor.canvas()
    if (!canvas || !color) return undefined
    canvas.clearRect(0, 0, 1, 1)
    canvas.fillStyle = color
    canvas.fillRect(0, 0, 1, 1)
    const [red, green, blue, alpha] = canvas.getImageData(0, 0, 1, 1).data
    return {
      hex: rgbToHex({ r: red! / 255, g: green! / 255, b: blue! / 255 }),
      opacity: Math.round((alpha! / 255) * 100)
    }
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
    if (!BenchColor.hasTriedCanvas) {
      BenchColor.hasTriedCanvas = true
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      // `getContext()` says "none" with `null`
      BenchColor.context = canvas.getContext("2d", { willReadFrequently: true }) ?? undefined
    }
    return BenchColor.context
  }
}
