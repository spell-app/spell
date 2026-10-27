import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { UI } from "spell-ui/runtime"
import { ThemeHarness } from "spell-ui/test-helpers/ThemeHarness"

/*
 * Every custom property a theme sheet sets, as the page computes it, light and dark (epic `debut` P18).
 * - The snapshot is the list taken BEFORE the themes became data (`<name>.theme.json5`):  a theme written from its
 *   file sets every value exactly as its hand-written sheet did.
 * - From then on, a change to a theme's values shows here as a snapshot diff, to review like any other.
 * - Names:  every `--name:` in the sheet as `UI.themes` loads it (its imports inlined), rules sheets' too.
 */

/** The themes written from their files:  the first four converted (P18), the four new ones made so (P20). */
const THEMES = ["spell", "glass", "fruity", "merlot", "paper", "midnight", "crisp", "pop"] as const

describe("theme values", () => {
  for (const name of THEMES) {
    it(`${name}:  every custom property, light and dark`, async () => {
      await ThemeHarness.use(name)
      const text = await UI.themes.load(name)
      const names = [...new Set(text.match(/--[\w-]+(?=\s*:)/g))].sort()
      const values: Record<string, Record<string, string>> = {}
      for (const scheme of ["light", "dark"] as const) {
        document.documentElement.classList.toggle("ui-dark", scheme === "dark")
        onTestFinished(() => document.documentElement.classList.remove("ui-dark"))
        const style = getComputedStyle(document.documentElement)
        values[scheme] = Object.fromEntries(names.map((token) => [token, squash(style.getPropertyValue(token))]))
      }
      expect(values).toMatchSnapshot()
    })
  }
})

/** A value with its whitespace evened out:  how a sheet breaks a long value never matters. */
function squash(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim()
}
