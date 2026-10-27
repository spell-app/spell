import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { clipped, CONTRAST_LARGE, CONTRAST_TEXT, CONTRAST_TEXT_AAA, oklchToRgb } from "spell/util/color"
import { UI } from "spell-ui/runtime"
import { hueAliases, hueStates, hues, semanticAliases, semanticColors } from "spell-ui/styles"

import { A11y } from "spell/test-helpers/A11y"
import { Fixture } from "spell/test-helpers/Fixture"
import { ThemeHarness } from "spell-ui/test-helpers/ThemeHarness"

import layersRaw from "spell-ui/styles/layers.css?raw"
import tokensRaw from "spell-ui/styles/tokens.css?raw"
import colorsRaw from "spell-ui/styles/colors.css?raw"
import sizesRaw from "spell-ui/styles/sizes.css?raw"
import utilitiesRaw from "spell-ui/styles/utilities.css?raw"

/**
 * WCAG contrast of the palette and the text, per colour and per scheme, with no theme and in each theme of Spell's
 * own set (`UI.themes.own`;  epic `debut` P17, J76).
 * - Colours are read back from the browser (`getComputedStyle`), so what's measured is what the sheets resolve to --
 *   `light-dark()`, relative-colour roles, remaps and a theme's own values included -- not the vocabulary's numbers.
 * - Read AS PAINTED (`A11y.contrast()`:  the canvas resolves any CSS colour, hex and `rgb()` as well as `oklch()`),
 *   each over the page's own background, so a see-through colour (a glass panel, a tinted wash) is measured as it shows.
 * - Ratios via the kit's `contrast()` (clipped to sRGB, as axe does), so a pass here is a pass in the axe tests.
 * - Raw foundation sheets, so `light-dark()` survives whatever the Lightning CSS targets (see `styles.test.ts`);
 *   a theme is applied as a page applies it (`ThemeHarness.use()`).
 * - Crisp, the high-contrast theme, holds its text to AAA's 7:1 (`CONTRAST_TEXT_AAA`, `TEXT_AT_AAA`):
 *   body and muted text on the page and its panels, and the primary's text on it (epic `debut` P20).
 */

/** Every colour name a component accepts:  hues, aliases, semantic colours and their aliases. */
const NAMES = [
  ...Object.keys(hues),
  ...Object.keys(hueAliases),
  ...Object.keys(semanticColors),
  ...Object.keys(semanticAliases)
]

/** Palette hues and their aliases:  the colours with a `-border` role worth a 3:1 check. */
const HUE_NAMES = new Set([...Object.keys(hues), ...Object.keys(hueAliases)])

/** The themes whose text is held to AAA's 7:1, not AA's 4.5:1:  Crisp, the high-contrast one. */
const TEXT_AT_AAA: ReadonlySet<string | undefined> = new Set(["crisp"])

/** Scheme classes from `utilities.css`. */
const SCHEMES = ["ui-light", "ui-dark"] as const

/** Solid-colour tokens `--ui-color-on` must read on:  the colour and each interaction state. */
const SOLIDS = ["--ui-color", ...Object.keys(hueStates).map((state) => `--ui-color-${state}`)]

describe("the kit's colour maths", () => {
  it("measures OKLCH like the browser paints it", () => {
    // cross-check `oklchToRgb()` against a canvas pixel, for every light-scheme base
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
    for (const [name, hue] of Object.entries(hues)) {
      const [l, c, h] = hue.onLight
      context.fillStyle = `oklch(${l} ${c} ${h})`
      context.fillRect(0, 0, 1, 1)
      const pixel = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      const { r, g, b } = clipped(oklchToRgb({ l, c, h }))
      const expected = [r, g, b].map((channel) => Math.round(channel * 255))
      for (const [index, value] of pixel.entries()) expect(Math.abs(value - expected[index]!), name).toBeLessThan(2)
    }
  })
})

/** The themes it's measured in:  none (Spell UI's own look), then each theme of the set. */
const THEMES: readonly (string | undefined)[] = [undefined, ...(await UI.load()).themes.own]

for (const theme of THEMES) {
  describe(`contrast (WCAG AA), ${theme ?? "no theme"}`, () => {
    it.each(SCHEMES)("puts readable text on every solid colour and state (%s)", async (scheme) => {
      await adoptFoundation(theme)
      const failures: string[] = []
      for (const name of NAMES) {
        const probe = renderProbe(scheme, name)
        for (const solid of SOLIDS) failures.push(...check(probe, name, "--ui-color-on", [solid], CONTRAST_TEXT))
        failures.push(...check(probe, name, "--ui-color-inverted-on", ["--ui-color-inverted"], CONTRAST_TEXT))
      }
      expect(failures).toEqual([])
    })

    it.each(SCHEMES)("keeps the text roles readable on the page and the tinted background (%s)", async (scheme) => {
      await adoptFoundation(theme)
      const failures: string[] = []
      for (const name of NAMES) {
        const probe = renderProbe(scheme, name)
        for (const role of ["--ui-color-text", "--ui-color-header"]) {
          failures.push(...check(probe, name, role, [], CONTRAST_TEXT))
          failures.push(...check(probe, name, role, ["--ui-color-background"], CONTRAST_TEXT))
        }
        // the `-inverted` colour is TEXT on a dark surface too (inverted labels, icons, basic buttons)
        if (scheme === "ui-dark") failures.push(...check(probe, name, "--ui-color-inverted", [], CONTRAST_TEXT))
        // NOTE: semantic borders are decorative (a message's edge), so only hue borders -- button / label
        // outlines -- need the 3:1 of a UI component boundary
        if (HUE_NAMES.has(name)) failures.push(...check(probe, name, "--ui-color-border", [], CONTRAST_LARGE))
      }
      expect(failures).toEqual([])
    })

    it.each(SCHEMES)("keeps text and muted text readable on the page and on its panels (%s)", async (scheme) => {
      await adoptFoundation(theme)
      const probe = renderProbe(scheme, "")
      const minimum = TEXT_AT_AAA.has(theme) ? CONTRAST_TEXT_AAA : CONTRAST_TEXT
      const failures: string[] = []
      for (const text of ["--ui-text-color", "--ui-text-muted"]) {
        for (const surface of TEXT_GROUNDS) failures.push(...check(probe, "text", text, surface, minimum))
      }
      if (TEXT_AT_AAA.has(theme)) {
        const primary = renderProbe(scheme, "primary")
        failures.push(...check(primary, "primary", "--ui-color-on", ["--ui-color"], minimum))
      }
      expect(failures).toEqual([])
    })
  })
}

/**
 * What text is read on, over the page's own background (`--ui-background`):  the page itself, then each panel.
 * - A see-through panel (a glass theme's) is measured over the plain page:  the most a wallpaper changes is a tint.
 */
const TEXT_GROUNDS: readonly (readonly string[])[] = [
  [],
  ["--ui-surface"],
  ["--ui-surface-muted"],
  ["--ui-surface-strong"]
]

/**
 * Adopt the raw foundation into the document for the current test, and theme `theme` (none:  our own look).
 * - SIDE EFFECT:  appended to `document.adoptedStyleSheets`, removed when the test finishes.
 */
async function adoptFoundation(theme: string | undefined) {
  const sheets = [layersRaw, tokensRaw, colorsRaw, sizesRaw, utilitiesRaw].map((css) => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    return sheet
  })
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, ...sheets]
  onTestFinished(() => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => !sheets.includes(sheet))
  })
  if (theme) await ThemeHarness.use(theme)
}

/** A `.ui.<name>` span inside a `scheme` wrapper:  the element whose remapped tokens get measured. */
function renderProbe(scheme: string, name: string): HTMLElement {
  return Fixture.render(`<div class="${scheme}"><span class="ui ${name}"></span></div>`)
    .firstElementChild as HTMLElement
}

/**
 * `[]` if `foreground` on `grounds` (tokens resolved on `probe`, painted over the page's background, bottom first)
 * reaches `minimum`, else the failure.
 */
function check(
  probe: HTMLElement,
  name: string,
  foreground: string,
  grounds: readonly string[],
  minimum: number
): string[] {
  const layers = ["--ui-background", ...grounds].map((token) => resolve(probe, token))
  const ratio = A11y.contrast(resolve(probe, foreground), layers)
  const on = grounds.at(-1) ?? "--ui-background"
  return ratio >= minimum ? [] : [`${name}: ${foreground} on ${on} is ${ratio.toFixed(2)}:1 < ${minimum}`]
}

/**
 * Token `name` resolved on `probe`:  the colour the browser computes, any notation.
 * - SIDE EFFECT:  sets `probe`'s inline `color`.
 */
function resolve(probe: HTMLElement, name: string): string {
  probe.style.color = `var(${name})`
  return getComputedStyle(probe).color
}
