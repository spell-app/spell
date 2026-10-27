import { rgbToHex } from "spell/util/color"
import { TokenColor } from "spell-ui/components/ui-theme-editor/TokenColor"

import { FALLBACK_HEX } from "./UIDocsTokens.types"

/****************
 * ### `ColorProbe`
 * Colour tokens' CURRENT values as `#rrggbb`, for the playground's native colour inputs, which take nothing else.
 * - Resolves where the tokens are used:  a hidden probe element per value inside `context` gets `color: <value>`,
 *   and its computed colour (an `oklch()`, `color(srgb ...)` ...) is painted on a 1px canvas and read back as sRGB.
 * - Batched:  every probe goes in, THEN every colour is read, so a table of 200 colours costs one style recalc.
 * - Lossy on purpose:  alpha is flattened onto the page background and wide-gamut colours clip,
 *   both the native input's limits.  The token keeps its real value until the viewer picks a colour.
 * - Scheme:  `light-dark()` resolves in `context`'s scheme at the time of the probe.
 * - The painting is the browser's, on the theme editor's one canvas (`TokenColor.paint()`);  the hex, the kit's
 *   `rgbToHex()`.
 ****************/
export class ColorProbe {
  /**
   * Each of `values` (key => any CSS colour, `var()` included) as `#rrggbb`, resolved in `context`.
   * - A translucent colour is painted over `backdrop` (default the page background), so the input shows what the
   *   viewer sees, not the bare (often black) ink an alpha role is made of.
   */
  static hexesFor(
    context: Element | ShadowRoot,
    values: ReadonlyMap<string, string>,
    backdrop: string = BACKDROP
  ): Map<string, string> {
    const probes = new Map<string, HTMLElement>()
    for (const [key, value] of [...values, [BACKDROP_KEY, backdrop] as const]) {
      const probe = document.createElement("span")
      probe.hidden = true
      probe.style.color = value
      probes.set(key, probe)
    }
    context.append(...probes.values())
    const colors = new Map([...probes].map(([key, probe]) => [key, getComputedStyle(probe).color]))
    for (const probe of probes.values()) probe.remove()
    const under = colors.get(BACKDROP_KEY)
    colors.delete(BACKDROP_KEY)
    return new Map([...colors].map(([key, color]) => [key, ColorProbe.hexFor(color, under)]))
  }

  /**
   * A computed colour as `#rrggbb`:  painted on the canvas (over `backdrop`, if given) and read back;
   * `FALLBACK_HEX` if it can't be.
   */
  static hexFor(color: string, backdrop?: string): string {
    const painted = TokenColor.paint(color, backdrop)
    if (!painted?.alpha) return FALLBACK_HEX
    return rgbToHex({ r: painted.red / 255, g: painted.green / 255, b: painted.blue / 255 })
  }
}

/** What `ColorProbe` paints a translucent colour over:  the page background, where the token is used. */
const BACKDROP = "var(--ui-background, white)"

/** `ColorProbe`'s key for the backdrop's own probe;  never a token name. */
const BACKDROP_KEY = " backdrop"
