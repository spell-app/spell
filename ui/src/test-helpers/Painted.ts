import { luminance, type Rgb } from "spell/util/color"

/**
 * A CSS colour as the browser paints it:  any colour a style computes to (`oklch()`, `rgb()`, `color-mix()` ...),
 * painted on a clear 1px canvas and read back as sRGB.
 * - Its alpha is ignored:  a translucent colour reads as the colour itself, not as it looks over the page
 *   (`A11y.contrast()` composites, for a contrast over layers).
 * - For tests that check a rendered colour is light or dark:  `Painted.luminance(style.color)`.
 * - The maths is the kit's (`spell/util/color`);  only the painting is here.
 * - Needs no Spell UI:  it belongs beside the kit's `A11y` (whose own canvas composite is private, and over white),
 *   and moves there once that's public.
 */
export class Painted {
  /** `color` as sRGB `0..1`, its alpha ignored. */
  static rgb(color: string): Rgb {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
    return { r: red! / 255, g: green! / 255, b: blue! / 255 }
  }

  /** WCAG relative luminance of `color` as painted, `0..1`:  `0` black, `1` white. */
  static luminance(color: string): number {
    return luminance(Painted.rgb(color))
  }
}
