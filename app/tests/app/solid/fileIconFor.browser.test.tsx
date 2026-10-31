import { describe, expect, test } from "vite-plus/test"

import { FILE_ICON, fileIconFor } from "spell/app/app/solid/chrome"

describe("fileIconFor()", () => {
  test("a small icon per kind of file", () => {
    expect(fileIconFor("Card.spellml")).toBe("hat wizard")
    expect(fileIconFor("Deck.spell")).toBe("hat wizard")
    expect(fileIconFor("styles.css")).toBe("css3 alternate")
    expect(fileIconFor("main.ts")).toBe("js")
    expect(fileIconFor("game.py")).toBe("python")
    expect(fileIconFor("README.md")).toBe("markdown")
    expect(fileIconFor("page.html")).toBe("html5")
    expect(fileIconFor("card.PNG")).toBe("file image")
  })

  test("anything else, or no extension, is the plain file icon", () => {
    expect(fileIconFor("data.json5")).toBe(FILE_ICON)
    expect(fileIconFor("LICENSE")).toBe(FILE_ICON)
  })
})
