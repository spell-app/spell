import { describe, expect, it } from "vite-plus/test"

import { BenchTokens } from "spell-ui/docs-components/ui-docs-theme-bench/BenchTokens"

describe("BenchTokens.load()", () => {
  it("reads Spell's theme files, and their groups, chrome first", async () => {
    const tokens = await BenchTokens.load()
    expect(tokens.names).toEqual(expect.arrayContaining(["fruity", "glass", "merlot", "spell"]))
    const groups = tokens.groupsFor("fruity", ["--spell-pane-radius", "--ui-surface"])
    expect(groups.map((group) => group.place).slice(0, 5)).toEqual([
      "surfaces",
      "components.bar",
      "components.menu",
      "components.section",
      "own"
    ])
    expect(groups.find((group) => group.place === "surfaces")!.tokens).toContain("--ui-surface")
    // Fruity's own tokens are Glass's too:  it extends Glass
    expect(groups.find((group) => group.place === "own")!.tokens).toContain("--glass-blur")
    // the editor's group holds only its own tokens
    expect(groups.at(-1)).toEqual({ place: "editor", tokens: ["--spell-pane-radius"] })
  })

  it("a theme's value, as its sheet sets it", async () => {
    const tokens = await BenchTokens.load()
    expect(tokens.valueIn("fruity", "--ui-surface")).toBe("var(--glass-surface-strong)")
  })
})

describe("BenchTokens", () => {
  const tokens = new BenchTokens({ themes: {}, palettes: {} })

  it("placeOf():  a token's place in a theme file", () => {
    expect(tokens.placeOf("--ui-surface")).toBe("surfaces.panel")
    expect(tokens.placeOf("--ui-menu-segmented-background")).toBe("components.menu.segmented-background")
    expect(tokens.placeOf("--glass-blur")).toBe("own.glass-blur")
    expect(tokens.placeOf("--spell-pane-radius")).toBe("editor")
  })

  it("asWritten():  a var() of a theme file's token as its pointer", () => {
    expect(tokens.asWritten("var(--ui-surface)")).toBe("{surfaces.panel}")
    expect(tokens.asWritten("0 0 0 1px var(--glass-edge)")).toBe("0 0 0 1px {own.glass-edge}")
  })

  it("forScheme():  a light-dark() pair's half, nested ones too", () => {
    expect(BenchTokens.forScheme("light-dark(#fff, #000)", "dark")).toBe("#000")
    expect(BenchTokens.forScheme("0 1px light-dark(rgb(0 0 0 / 0.1), rgb(0 0 0 / 0.5))", "light")).toBe(
      "0 1px rgb(0 0 0 / 0.1)"
    )
  })
})
