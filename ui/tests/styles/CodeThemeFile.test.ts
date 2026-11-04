import { describe, expect, it } from "vite-plus/test"

import { CodeThemeFile } from "spell/ui/styles/CodeThemeFile"

/** Every token a theme needs, each its own colour:  `#000001`, `#000002` ... */
const COLORS = Object.fromEntries(
  CodeThemeFile.TOKENS.map((token, index) => [token, `#${(index + 1).toString(16).padStart(6, "0")}`])
)

describe("CodeThemeFile", () => {
  it("names a theme as VS Code's picker shows it:  Spell Matrix Dark;  the Spell theme's Spell Dark", () => {
    const matrix = new CodeThemeFile({ name: "matrix", scheme: "dark", colors: COLORS })
    expect(matrix.label).toBe("Spell Matrix Dark")
    expect(matrix.fileName).toBe("spell-matrix-dark.json")
    expect(matrix.contribution).toEqual({
      label: "Spell Matrix Dark",
      uiTheme: "vs-dark",
      path: "./themes/spell-matrix-dark.json"
    })
    const spell = new CodeThemeFile({ name: "spell", scheme: "light", colors: COLORS })
    expect([spell.label, spell.fileName, spell.contribution.uiTheme]).toEqual(["Spell Light", "spell-light.json", "vs"])
  })

  it("colours each scope by its role, and the language server's tokens too", () => {
    const theme = new CodeThemeFile({ name: "glass", scheme: "light", colors: COLORS }).json() as {
      tokenColors: Array<{ name: string; scope: string[]; settings: { foreground: string; fontStyle?: string } }>
      semanticTokenColors: Record<string, unknown>
      colors: Record<string, string>
    }
    const keyword = theme.tokenColors.find((entry) => entry.name === "keyword")!
    expect(keyword.scope).toContain("keyword.control.spell")
    expect(keyword.settings.foreground).toBe(COLORS["--ui-code-keyword"])
    const heading = theme.tokenColors.find((entry) => entry.name === "heading")!
    expect(heading.scope).toContain("comment.line.number-sign.heading.spell")
    expect(heading.settings.fontStyle).toBe("bold italic")
    expect(theme.semanticTokenColors["comment.heading1"]).toEqual({
      foreground: COLORS["--ui-code-heading"],
      bold: true,
      italic: true
    })
    expect(theme.semanticTokenColors.parameter).toBe(COLORS["--ui-code-parameter"])
    expect(theme.colors["editor.background"]).toBe(COLORS["--ui-surface"])
    expect(theme.colors["sideBar.background"]).toBe(COLORS["--ui-background"])
    expect(theme.colors["button.background"]).toBe(COLORS["--ui-primary"])
  })

  it("throws, naming the token, when a colour wasn't worked out", () => {
    const { ["--ui-code-keyword"]: _left, ...missing } = COLORS
    const file = new CodeThemeFile({ name: "pop", scheme: "dark", colors: missing })
    expect(() => file.json()).toThrow(/pop dark has no colour for `--ui-code-keyword`/)
  })
})
