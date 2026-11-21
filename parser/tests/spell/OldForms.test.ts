import { afterEach, describe, test, expect } from "vite-plus/test"

import { SP, spellParser } from "spell/parser/spell"
import { spanish } from "spell/parser/spell/languages/es"

/** `text` parsed as a file, in a scope of its own. */
function parsed(text: string, parser = spellParser) {
  const match = parser.getScope(`old-forms-${Math.random()}`).parse(text, "block")!
  return { match, parseText: text }
}

/** Each warning parsing `text` notes, as `<words>:  <message>`. */
function warningsIn(text: string): string[] {
  return SP.SpellWarnings.in(parsed(text).match).map(({ at, message }) => `${at.inputText?.trim()}:  ${message}`)
}

const OLD =
  'a card is a view where\n\tit has parts "front" and "back"\n\tto slow it\n\t\tpause for 1 sec\n' +
  "\tto deal it\n\t\twait for: slow it  // so it shows\n"

describe("OldForms:  Spell's old forms, each a deprecation with its versions (epic `language` P68)", () => {
  afterEach(() => {
    SP.OldForms.spellVersion = SP.SPELL_VERSION
  })

  test("each form says the Spell that deprecated it and the one that drops it:  the next major by default", () => {
    const parts = SP.OldForms.form("parts")
    expect([parts.deprecatedIn, SP.OldForms.droppedIn(parts)]).toEqual(["0.8.0", "1.0.0"])
    const note = SP.OldForms.form("line-end-comment")
    expect([note.deprecatedIn, SP.OldForms.droppedIn(note)]).toEqual(["0.9.0", "1.0.0"])
    expect(SP.SPELL_VERSION).toBe("0.9.0")
    expect(SP.OLD_FORMS.map((form) => form.id)).toEqual(["parts", "animation", "wait-for", "line-end-comment"])
  })

  test("a warning for each, never an error, naming both versions;  the line still compiles", () => {
    expect(warningsIn(OLD)).toEqual([
      'parts:  This line uses the old word "parts".  Spell now says "slots".  ' +
        "Spell 0.8 changed this on 2026-10-27.  Your program still runs, but this line will give an error from Spell 1.0 on, so it's best to fix it now.",
      "wait for:  This line uses \"wait for\", which Spell doesn't need now:  it waits by itself.  " +
        "Spell 0.8 changed this on 2026-10-31.  Your program still runs, but this line will give an error from Spell 1.0 on, so it's best to fix it now.",
      '// so it shows:  This note uses the old style:  it starts with "//" and sits after the code.  ' +
        'Notes now go on the line under the code, and start with "--".  ' +
        "Spell 0.9 changed this on 2026-11-19.  Your program still runs, but this line will give an error from Spell 1.0 on, so it's best to fix it now."
    ])
    expect(SP.Block.getParseErrors(parsed(OLD).match) ?? []).toEqual([])
  })

  test("the fix rewrites each old form the new way;  a second look finds nothing", () => {
    const file = parsed(OLD)
    const uses = SP.OldForms.uses(file)
    expect(uses.map(({ form, written, replacement }) => [form.id, written, replacement])).toEqual([
      ["parts", "parts", "slots"],
      ["wait-for", "wait for", ""],
      ["line-end-comment", "// so it shows", "-- so it shows"]
    ])
    const upgraded = SP.OldForms.upgraded(OLD, uses)
    expect(upgraded).toBe(
      'a card is a view where\n\tit has slots "front" and "back"\n\tto slow it\n\t\tpause for 1 sec\n' +
        "\tto deal it\n\t\tslow it\n\t\t\t-- so it shows\n"
    )
    expect(SP.OldForms.uses(parsed(upgraded))).toEqual([])
  })

  test("past a form's drop version (a test's own Spell), the same line is an error, and its fix still rewrites it", () => {
    SP.OldForms.spellVersion = "1.0.0"
    const file = parsed(OLD)
    const errors = (SP.Block.getParseErrors(file.match) ?? []).map((error) => error.message)
    expect(errors, errors.join("\n")).toHaveLength(3)
    expect(errors[0]).toBe(
      'This line uses the old word "parts".  Spell now says "slots".  ' +
        "Spell 0.8 changed this on 2026-10-27, and from Spell 1.0 on it's an error.  Fix it to run your program."
    )
    expect(SP.SpellWarnings.in(file.match)).toEqual([])
    const uses = SP.OldForms.uses(file)
    expect(uses.every((use) => use.isDropped)).toBe(true)
    expect(SP.OldForms.upgraded(OLD, uses)).toContain('it has slots "front"')
  })

  test("a project written for an older Spell:  one with no version, or an older one", () => {
    expect(SP.OldForms.isOlderSpell(undefined)).toBe(true)
    expect(SP.OldForms.isOlderSpell("0.8.0")).toBe(true)
    expect(SP.OldForms.isOlderSpell(SP.SPELL_VERSION)).toBe(false)
  })

  test("Spanish:  its own words, the same forms", () => {
    const text = 'una carta es una vista donde\n\ttiene partes "frente" y "dorso"\n'
    const file = parsed(text, spanish.parser)
    const [warning] = SP.SpellWarnings.in(file.match)
    expect(warning?.message).toBe(
      'Esta línea usa la palabra vieja "partes".  Ahora Encanto dice "ranuras".  ' +
        "Encanto 0.8 cambió esto el 2026-10-27.  Tu programa aún funciona, pero esta línea dará un error desde Encanto 1.0, así que conviene arreglarla ya."
    )
    expect(SP.OldForms.upgraded(text, SP.OldForms.uses(file))).toBe(
      'una carta es una vista donde\n\ttiene ranuras "frente" y "dorso"\n'
    )
  })
})
