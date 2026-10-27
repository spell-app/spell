import { describe, expect, it } from "vite-plus/test"

import { ThemeTokens } from "spell/ui/components/ui-theme-editor/ThemeTokens"
import { themeTree } from "spell/ui/styles/styles.en"

describe("ThemeTokens.load()", () => {
  it("reads Spell's theme files;  every group of the theme tree, the theme's own first", async () => {
    const tokens = await ThemeTokens.load()
    expect(tokens.names).toEqual(expect.arrayContaining(["fruity", "glass", "merlot", "spell"]))
    const groups = tokens.groupsFor("fruity", { editor: ["--spell-pane-radius"] })
    expect(groups.map((group) => group.place)).toEqual(["own", ...Object.keys(themeTree), "components", "page.editor"])
    expect(groups.find((group) => group.place === "surfaces")!.tokens).toContain("--ui-surface")
    // a pair leaf's two tokens, light first
    expect(groups.find((group) => group.place === "text")!.tokens.slice(0, 2)).toEqual([
      "--ui-ink-on-light",
      "--ui-ink-on-dark"
    ])
    // Fruity's own tokens are Glass's too:  it extends Glass
    expect(groups.find((group) => group.place === "own")!.tokens).toContain("--glass-blur")
    // every family any theme sets
    expect(groups.find((group) => group.place === "components")!.tokens).toContain("--ui-menu-radius")
    expect(groups.at(-1)).toEqual({ place: "page.editor", tokens: ["--spell-pane-radius"] })
  })

  it("a theme's value, as its sheet sets it", async () => {
    const tokens = await ThemeTokens.load()
    expect(tokens.valueIn("fruity", "--ui-surface")).toBe("var(--glass-surface-strong)")
  })

  it("placeOf():  a token's place in a theme file;  a pair's half at its half", async () => {
    const tokens = await ThemeTokens.load()
    expect(tokens.placeOf("--ui-surface")).toBe("surfaces.panel")
    expect(tokens.placeOf("--ui-ink-on-dark")).toBe("text.ink.dark")
    expect(ThemeTokens.halfOf("text.ink.dark")).toBe("dark")
    expect(ThemeTokens.halfOf("surfaces.panel")).toBeUndefined()
    expect(tokens.placeOf("--ui-menu-segmented-background")).toBe("components.menu.segmented-background")
    expect(tokens.placeOf("--glass-blur")).toBe("own.glass-blur")
    expect(tokens.pathOf("--ui-ink-on-light", "text")).toEqual(["ink", "light"])
    expect(tokens.pathOf("--spell-accent-x", "page.editor")).toEqual(["accent", "x"])
  })

  it("asWritten():  a var() of a theme file's token as its pointer", async () => {
    const tokens = await ThemeTokens.load()
    expect(tokens.asWritten("var(--ui-surface)")).toBe("{surfaces.panel}")
    expect(tokens.asWritten("var(--ui-menu-radius)")).toBe("{components.menu.radius}")
    // a pair's half has no pointer of its own
    expect(tokens.asWritten("var(--ui-ink-on-light)")).toBe("var(--ui-ink-on-light)")
  })
})

describe("ThemeTokens.forScheme()", () => {
  it("a light-dark() pair's half, nested ones too", () => {
    expect(ThemeTokens.forScheme("light-dark(#fff, #000)", "dark")).toBe("#000")
    expect(ThemeTokens.forScheme("0 1px light-dark(rgb(0 0 0 / 0.1), rgb(0 0 0 / 0.5))", "light")).toBe(
      "0 1px rgb(0 0 0 / 0.1)"
    )
  })
})
