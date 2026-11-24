/**
 * A program's reads of a place's field that the place's Spell file marks gone (epic `language` P68, Q82):
 * a warning on each read, with the date, and the field's likely new name when the same look found one.
 */
import { describe, expect, it } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/** NetBox's Spell file, as a later look left it:  `user` gone, `owner` new, the same day. */
const NETBOX = [
  'netbox is a web server at "https://demo.netbox.dev"',
  "\tcheck it every 30 seconds",
  '\tjobs live at "/api/jobs"',
  "",
  'a "job" is a thing',
  "\tit lives in netbox",
  '\tits "name" is text',
  '\tits "user" is text',
  "\t\t-- who started it",
  "\t\t-- APPARENTLY DELETED as of 2026-11-19",
  '\tits "owner" is text',
  "\t\t-- NEW as of 2026-11-19",
  ""
].join("\n")

/** `program`'s lines after NetBox's file:  each file's warnings. */
function warningsOf(program: string[], netbox = NETBOX) {
  const project = parseSpellProject([
    { path: "/main.spell", contents: `${program.join("\n")}\n` },
    { path: "/NetBox.api.spell", contents: netbox }
  ])
  const [main, place] = project.files
  return { main: main!, place: place! }
}

describe("a read of a place's field marked gone", () => {
  it("warns on each read, with the place, the date and the likely new name", () => {
    const { main, place } = warningsOf([
      "to check (a job)",
      "\tset who to the user of the job",
      "\tset again to the job's user",
      "\tset other to the name of the job"
    ])
    expect(main.errors).toEqual([])
    expect(place.errors).toEqual([])
    expect(main.warnings).toHaveLength(2)
    expect(main.warnings[0]).toContain("2:")
    expect(main.warnings[0]).toContain(
      'When netbox was looked at on 2026-11-19, it no longer had a "user" for a job, but it had a new "owner".'
    )
    expect(main.warnings[0]).toContain('Try changing "user" to "owner".')
    expect(main.warnings[1]).toContain("3:")
  })

  it("names no new field when the look found none of the same type", () => {
    const netbox = NETBOX.replace('\tits "owner" is text', '\tits "owner" is a number')
    const { main } = warningsOf(["to check (a job)", "\tset who to the user of the job"], netbox)
    expect(main.warnings).toHaveLength(1)
    expect(main.warnings[0]).toContain('it no longer had a "user" for a job.')
    expect(main.warnings[0]).toContain('Check netbox for its new name, then use that instead of "user".')
  })

  it("says nothing of a field that isn't marked", () => {
    const { main } = warningsOf(
      ["to check (a job)", "\tset who to the user of the job"],
      NETBOX.replace(/\t\t-- APP.*\n/, "")
    )
    expect(main.warnings).toEqual([])
  })

  it("Spanish:  the same warning, in Spanish", () => {
    const netbox = [
      'netbox es un servidor web en "https://demo.netbox.dev"',
      "\tse revisa cada 30 segundos",
      '\tlos trabajos están en "/api/jobs"',
      "",
      'un "trabajo" es una cosa',
      "\tvive en netbox",
      '\tsu "usuario" es texto',
      "\t\t-- AL PARECER BORRADO desde el 2026-11-19",
      ""
    ].join("\n")
    const project = parseSpellProject([
      { path: "/NetBox.api.es.spell", contents: netbox },
      { path: "/main.es.spell", contents: "para revisar (un trabajo)\n\timprimir el usuario del trabajo\n" }
    ])
    const main = project.files[1]!
    expect(main.errors).toEqual([])
    expect(main.warnings).toHaveLength(1)
    expect(main.warnings[0]).toContain('Cuando se revisó netbox el 2026-11-19, ya no tenía "usuario" para un trabajo.')
  })

  it("hands the language server the new name, at the warning", () => {
    const { main } = warningsOf(["to check (a job)", "\tset who to the user of the job"])
    const [warning] = SP.SpellWarnings.in(main.match!)
    expect(SP.PlaceFieldMarks.renameAt(warning!.at)).toBe("owner")
  })
})
