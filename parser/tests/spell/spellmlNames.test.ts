import { readFileSync } from "fs"
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

import "./projectGroups.double"

/**
 * Spell's markup files end in `.spellml`;  the old `.spellx` still reads the same, everywhere
 * (epic `repo-split` P21;  Owen, 2026-10-27:  "support both for now").
 * - The old ending is written as `SP.OLD_SPELLML_SUFFIX` here, never as a literal:
 *   so `spell rename spellml`, rerun, leaves this file alone.
 */
describe("markup file names:  .spellml, and the old ending", () => {
  const OLD = SP.OLD_SPELLML_SUFFIX

  test("both are markup, in any language;  .spell is code spell;  a built file is neither", () => {
    for (const name of ["Card.spellml", "/x/Carta.es.spellml", `Card${OLD}`, `/x/Carta.es${OLD}`]) {
      expect(SP.isSpellmlName(name), name).toBe(true)
      expect(SP.formOfName(name), name).toBe("spellx")
      expect(SP.isSpellSourceName(name), name).toBe(true)
    }
    for (const name of ["Card.spell", "Carta.es.spell", "Solitaire.spell.js", "Card.spellmlx", undefined]) {
      expect(SP.isSpellmlName(name), name).toBe(false)
    }
    expect(SP.formOfName("Card.spell")).toBe("spell")
    expect(SP.isSpellSourceName("Solitaire.spell.js")).toBe(false)
  })

  test("new files are .spellml:  the ending listed first", () => {
    expect(SP.SPELLML_SUFFIX).toBe(".spellml")
    expect(SP.SPELLML_SUFFIXES[0]).toBe(SP.SPELLML_SUFFIX)
  })

  test("a file's language reads the same from either ending, a range after it too", () => {
    expect(SP.Language.langOfFile("/Carta.es.spellml")).toBe("es")
    expect(SP.Language.langOfFile(`/Carta.es${OLD}`)).toBe("es")
    expect(SP.Language.langOfFile("/Carta.es.spellml:71-92")).toBe("es")
    expect(SP.Language.langOfFile("/Card.spellml")).toBeUndefined()
  })

  test("a location of either is a spell file", () => {
    expect(new SP.SpellLocation("owen@spell/project/Card.spellml").isSpellFile).toBe(true)
    expect(new SP.SpellLocation(`owen@spell/project/Card${OLD}`).isSpellFile).toBe(true)
  })

  describe("the same text, either ending, compiles the same", () => {
    beforeAll(registerTestComponentPack)

    test.each(["Card", "Carta.es"])("%s", (name) => {
      const contents = readFileSync(new URL(`./spellx/${name}.spellml`, import.meta.url), "utf8")
      const now = [{ path: `/${name}.spellml`, contents }]
      const old = [{ path: `/${name}${OLD}`, contents }]
      const [file] = parseSpellProject(old).files
      expect(file!.errors).toEqual([])
      expect(compiledSpellProject(old).code.replaceAll(OLD, SP.SPELLML_SUFFIX)).toBe(compiledSpellProject(now).code)
    })
  })
})
