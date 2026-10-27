import { describe, expect, test } from "vite-plus/test"

import { ThemeMenu } from "spell-ui/components/ui-theme-menu/ThemeMenu"

describe("ThemeMenu.entries", () => {
  test("lists the themes it's given, in order, each titled, with its description:  nothing else", () => {
    const menu = new ThemeMenu({
      themes: ["spell", "glass", "fruity", "merlot", "paper", "midnight", "crisp", "pop", "matrix"],
      text: keyText
    })
    expect(menu.entries).toEqual([
      { value: "spell", text: "Spell", description: "spellDescription" },
      { value: "glass", text: "Glass", description: "glassDescription" },
      { value: "fruity", text: "Fruity", description: "fruityDescription" },
      { value: "merlot", text: "Merlot", description: "merlotDescription" },
      { value: "paper", text: "Paper", description: "paperDescription" },
      { value: "midnight", text: "Midnight", description: "midnightDescription" },
      { value: "crisp", text: "Crisp", description: "crispDescription" },
      { value: "pop", text: "Pop", description: "popDescription" },
      { value: "matrix", text: "Matrix", description: "matrixDescription" }
    ])
  })

  test("a theme with no description shows its title alone", () => {
    const menu = new ThemeMenu({ themes: ["my-theme"], text: keyText })
    expect(menu.entries).toEqual([{ value: "my-theme", text: "My Theme" }])
  })
})

describe("ThemeMenu.labelFor()", () => {
  test("the dropdown's text:  the chosen theme's title", () => {
    const menu = new ThemeMenu({ themes: ["merlot"], text: englishText as never })
    expect(menu.labelFor("merlot")).toBe("Merlot theme")
  })
})

/** A `text()` that answers with the key itself. */
function keyText(key: string) {
  return key
}

/** A `text()` with the one English string `labelFor()` needs;  the key for any other. */
function englishText(key: string, values?: Record<string, unknown>) {
  return key === "themeLabel" ? `${values?.title} theme` : key
}
