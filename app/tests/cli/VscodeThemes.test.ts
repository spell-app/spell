import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vite-plus/test"

import { VscodeThemes } from "spell/app/cli/VscodeThemes"

/** The extension's `package.json`, as committed. */
const manifest = JSON.parse(readFileSync(join(VscodeThemes.EXTENSION, "package.json"), "utf8")) as {
  contributes: { themes: Array<{ label: string; uiTheme: string; path: string }> }
}

/** A VS Code colour:  `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. */
const COLOR = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

describe("VscodeThemes", () => {
  it("lists a VS Code theme for each Spell theme, light and dark:  18", () => {
    const themes = manifest.contributes.themes
    expect(themes).toHaveLength(VscodeThemes.themeNames().length * 2)
    expect(themes.map((theme) => theme.label)).toContain("Spell Matrix Dark")
    expect(themes.map((theme) => theme.label)).toContain("Spell Dark")
  })

  it("writes each in VS Code's colour theme shape:  every colour a hex, every scope a role's", () => {
    for (const { label, uiTheme, path } of manifest.contributes.themes) {
      const theme = JSON.parse(readFileSync(join(VscodeThemes.EXTENSION, path), "utf8")) as {
        name: string
        type: string
        semanticHighlighting: boolean
        colors: Record<string, string>
        tokenColors: Array<{ scope: string[]; settings: { foreground: string } }>
        semanticTokenColors: Record<string, string | { foreground: string }>
      }
      expect(theme.name).toBe(label)
      expect(theme.type).toBe(uiTheme === "vs-dark" ? "dark" : "light")
      expect(theme.semanticHighlighting).toBe(true)
      for (const [key, color] of Object.entries(theme.colors)) expect(color, `${label} ${key}`).toMatch(COLOR)
      for (const { scope, settings } of theme.tokenColors) {
        expect(scope.length, label).toBeGreaterThan(0)
        expect(settings.foreground, `${label} ${scope[0]}`).toMatch(COLOR)
      }
      for (const [token, value] of Object.entries(theme.semanticTokenColors)) {
        expect(typeof value === "string" ? value : value.foreground, `${label} ${token}`).toMatch(COLOR)
      }
    }
  })

  it("is current with the theme sheets (else `yarn tsx scripts/vscode-themes.ts`)", { timeout: 120_000 }, async () => {
    for (const [file, text] of await VscodeThemes.outputs())
      expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })
})
