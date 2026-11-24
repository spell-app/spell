import { describe, expect, it } from "vite-plus/test"

import { SpellOnServer } from "spell/app/app/components/spell-code/SpellOnServer.server"

describe("SpellOnServer", () => {
  const drawer = new SpellOnServer()

  it("takes spell in any of its names, and finds each <spell-code> with text of its own", () => {
    expect(drawer.takes({ kind: "code", settings: { language: "spell/es" }, text: "" })).toBe(true)
    expect(drawer.takes({ kind: "code", settings: { language: "sp" }, text: "" })).toBe(true)
    expect(drawer.takes({ kind: "code", settings: { language: "js" }, text: "" })).toBe(false)
    const page = `<spell-code>\n  a "card" is a view\n</spell-code\n><spell-code wrap>x</spell-code><spell-code source="a.spell"></spell-code>`
    expect(drawer.find(page)).toEqual([
      { kind: "code", settings: { language: "spell", drawing: true }, text: 'a "card" is a view' },
      { kind: "code", settings: { language: "spell", drawing: false }, text: "x" }
    ])
    expect(drawer.replaces).toEqual(["/element/spell-language.js"])
  })

  it("draws spell in the bubbly look, with its sheet;  coloured lines it leaves to the page", async () => {
    const drawing = await drawer.draw({
      kind: "code",
      settings: { language: "spell", drawing: true },
      text: 'a "card" is a view'
    })
    expect(drawing?.markup).toMatch(/^<div class="bubbly">/)
    expect(drawing?.sheet).toContain(".bubbly")
    expect(drawing?.data).toEqual({ isDrawn: true, language: "spell", detected: false })
    expect(
      await drawer.draw({ kind: "code", settings: { language: "spell", drawing: false }, text: "x" })
    ).toBeUndefined()
  })
})
