import { readFileSync } from "fs"
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

import "./projectGroups.double"

/**
 * Every Spell file ends `.spell`, its shape from what it says (epic `language` P40, `SP.formOfText()`);
 * the old endings, `.spellml` and `.spellx`, still read, always as tags.
 * - The old ending is written as `SP.OLD_SPELLML_SUFFIX` here, never as a literal:
 *   so `spell rename spellml`, rerun, leaves this file alone.
 */
describe("a file's shape, from its text;  the old endings", () => {
  const OLD = SP.OLD_SPELLML_SUFFIX

  test("the old endings are tags, whatever they say, in any language;  a built file is neither", () => {
    for (const name of ["Card.spellml", "/x/Carta.es.spellml", `Card${OLD}`, `/x/Carta.es${OLD}`]) {
      expect(SP.isSpellmlName(name), name).toBe(true)
      expect(SP.formOfText("only prose", name), name).toBe("spellx")
      expect(SP.formOfText(undefined, name), name).toBe("spellx")
      expect(SP.isSpellSourceName(name), name).toBe(true)
    }
    for (const name of ["Card.spell", "Carta.es.spell", "Solitaire.spell.js", "Card.spellmlx", undefined]) {
      expect(SP.isSpellmlName(name), name).toBe(false)
    }
    expect(SP.isSpellSourceName("Solitaire.spell.js")).toBe(false)
  })

  describe("a .spell file's shape", () => {
    test.each([
      ["a tag in the first column", 'a card is a thing\n<spell-view "x">\n</>', "spellx"],
      ["a heading and prose, then a tag", '# Title\nSome prose.\n\n<spell-view "x">\n</>', "spellx"],
      ["a closer alone", "</spell-view>", "spellx"],
      ["a Spanish tag", '<encanto-vista "x">\n</>', "spellx"],
      ["plain Spell", 'a card is a thing:\n\t- its "rank" is a number', "spell"],
      ["a drawing, indented", "a card is a view:\n\t- to draw it:\n\t\t<ui-button/>", "spell"],
      ["only the defaults block", "<ui-defaults>\n\t<ui-button fluid/>\n</ui-defaults>\nx is 1", "spell"],
      ["a tag inside a block comment", "/* one\n<spell-view>\n*/\nx is 1", "spell"],
      ["a tag inside an html comment", "<!-- one\n<spell-view>\n-->\nx is 1", "spell"],
      ["a one-line comment, then a tag", '<!-- a note -->\n<spell-view "x">\n</>', "spellx"],
      ["a comparison", "if x <y:\n\treturn 1", "spell"],
      ["nothing", "", "spell"],
      ["not loaded", undefined, "spell"]
    ])("%s", (_name, text, form) => {
      expect(SP.formOfText(text, "/Card.spell")).toBe(form)
    })
  })

  test("the old endings are named first to last, and never written", () => {
    expect(SP.SPELLML_SUFFIXES).toEqual([".spellml", OLD])
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

/** A type's property editor in a file of its own (epic `editor` P25):  read by the Inspector, never compiled. */
describe("property editors files", () => {
  test("`.editor.spell` and `.editors.spell`, in any language, are property editors files, not spell source", () => {
    for (const name of ["Card.editor.spell", "Card.editor.spellml", "/x/Solitaire.editors.spell", "Carta.editor.es.spell"]) {
      expect(SP.isPropertyEditorsName(name), name).toBe(true)
      expect(SP.isSpellSourceName(name), name).toBe(false)
    }
    for (const name of ["Card.spell", "Card.spellml", "Card.editor.html", "Editor.spell"]) {
      expect(SP.isPropertyEditorsName(name), name).toBe(false)
    }
  })
})
