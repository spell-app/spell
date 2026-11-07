import { describe, test, expect } from "vite-plus/test"
import { core } from "spell/parser/core"

describe("core.unicode()", () => {
  test('the character with a code point;  "" for what\'s no code point', () => {
    expect(core.unicode(0x1f0a0)).toBe("🂠")
    expect(core.unicode(65)).toBe("A")
    expect(core.unicode(1.5)).toBe("")
    expect(core.unicode(0x110000)).toBe("")
    expect(core.unicode(undefined)).toBe("")
    expect(core.unicode("x")).toBe("")
  })
})

describe("core.titleCase()", () => {
  test('each word\'s first letter a capital, the rest as it was;  "" for nothing', () => {
    expect(core.titleCase("ace of spades")).toBe("Ace Of Spades")
    expect(core.titleCase("NASA rocket")).toBe("NASA Rocket")
    expect(core.titleCase("jean-luc's  1st año")).toBe("Jean-Luc's  1st Año")
    expect(core.titleCase(undefined)).toBe("")
    expect(core.titleCase(3)).toBe("3")
  })
})
