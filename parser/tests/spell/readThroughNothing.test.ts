import { execFileSync } from "child_process"
import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

/**
 * `the X of nothing` is nothing (epic `data`, I45):  a thing's field that holds another kind of thing may not be set
 * yet, so what's read off it is nothing, never a throw -- `ProgramWriter.isThingField()`.
 * - e.g. a Pokémon from a list has only its name:  `the other of its sprites` is nothing until its own page is read.
 * - javascript and TypeScript read through it with `?.`;  Python with `getattr(..., None)`.
 */
const EN = [
  'an "owner" is a thing:',
  '\t- its "name" is text',
  'a "pet" is a thing:',
  '\t- its "name" is text',
  '\t- its "owner" is an owner',
  '\t- its "owner name" is the name of its owner',
  "set rex to a new pet",
  "set who to the name of the owner of rex",
  "set whose to the owner name of rex",
  "print who"
]

/** `EN` in Spanish, but its last read is its getter's:  `el nombre del dueño de rex` reads `nombre del dueño`. */
const ES = [
  'un "dueño" es una cosa:',
  '\t- su "nombre" es texto',
  'una "mascota" es una cosa:',
  '\t- su "nombre" es texto',
  '\t- su "dueño" es un dueño',
  '\t- su "nombre del dueño" es el nombre de su dueño',
  "poner rex a una nueva mascota",
  "poner quien a el nombre del dueño de rex",
  "imprimir quien"
]

/**
 * A read a check just before it found there, read off with `.` (epic `data`, T121, J182):  `noteChecked()`.
 * - `both`:  an `and`'s right side;  `greet`:  an `if`'s statements, then the read after it, unchecked;
 *   `wave`:  an `otherwise` after `is nothing`;  `forget`:  set in between, so still `?.`.
 */
const CHECKED = [
  'an "owner" is a thing:',
  '\t- its "name" is text',
  'a "pet" is a thing:',
  '\t- its "owner" is an owner',
  '\t- its "both" is its owner and the name of its owner',
  "to greet (a pet):",
  "\tif its owner",
  "\t\treturn the name of its owner",
  "\treturn the name of its owner",
  "to wave (a pet):",
  "\tif its owner is nothing",
  '\t\treturn ""',
  "\totherwise",
  "\t\treturn the name of its owner",
  "to forget (a pet):",
  "\tif its owner",
  "\t\tset its owner to nothing",
  "\t\treturn the name of its owner"
]

/** spell_core's uv project. */
const SPELL_CORE = resolve(import.meta.dirname, "../../src/py/core")

/** `lines`, one file `path` of its own project, compiled by `writer`;  fails the test on a parse error. */
function compiled(path: string, lines: string[], writer: P.ProgramWriter): string {
  const { scope, files } = parseSpellProject([{ path, contents: lines.join("\n") }])
  for (const file of files) expect(file.errors).toEqual([])
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  return SP.SpellProject.combineCompiled(parts, writer, SP.SpellProject.importHeaderFor(scope, writer), scope)
}

describe("the X of nothing is nothing", () => {
  test("javascript reads through a thing's field with ?.", () => {
    const code = compiled("/Pets.spell", EN, P.JSWriter.instance)
    expect(code).toContain("return this.owner?.name")
    expect(code).toContain("export const who = rex.owner?.name")
  })

  test("a field of text, a number or yes / no is read with a plain .", () => {
    const code = compiled(
      "/Pets.spell",
      ['a "pet" is a thing:', '\t- its "name" is text', "set rex to a new pet", "set who to the name of rex"],
      P.JSWriter.instance
    )
    expect(code).toContain("export const who = rex.name")
  })

  test("TypeScript reads through it with ?. too", () => {
    const code = compiled("/Pets.spell", EN, P.TSWriter.instance)
    expect(code).toContain("this.owner?.name")
    expect(code).toContain("rex.owner?.name")
  })

  test("run, a pet with no owner:  its owner's name is nothing, never a throw", () => {
    const run = runSpellFiles([{ path: "/Pets.spell", contents: EN.slice(0, -1).join("\n") }])
    expect(run("who, whose")).toEqual({ who: undefined, whose: undefined })
  })

  test("in Spanish:  el nombre de nada es nada", () => {
    const code = compiled("/Mascotas.es.spell", ES, P.JSWriter.instance)
    expect(code).toMatch(/return this\.dueño\?\.nombre/)
    // `el nombre del dueño de rex` is its getter's name:  read through nothing, inside it
    expect(code).toContain("export const quien = rex.nombreDelDueño")
    const run = runSpellFiles([{ path: "/Mascotas.es.spell", contents: ES.slice(0, -1).join("\n") }])
    expect(run("quien")).toEqual({ quien: undefined })
  })

  test("a property set to one saved thing, by its id, is read through with ?. -- the place may hold none (P30)", () => {
    const lines = [
      'typicode is a web server at "https://web.test":',
      '\t- users live at "/users"',
      'a "user" is a thing:',
      "\t- it lives in typicode",
      '\t- its "name" is text',
      'a "profile" is a thing:',
      '\t- its "person" is the user whose id is 1',
      '\t- its "who" is the name of its person'
    ]
    for (const writer of [P.JSWriter.instance, P.TSWriter.instance]) {
      expect(compiled("/Page.spell", lines, writer)).toMatch(/this\.person\?\.name/)
    }
  })

  describe("a read a check just before it found there is read with a plain . (T121)", () => {
    for (const writer of [P.JSWriter.instance, P.TSWriter.instance]) {
      test(writer.constructor.name, () => {
        const code = compiled("/Pets.spell", CHECKED, writer)
        expect(code).toContain("return this.owner && this.owner.name")
        expect(code).toContain("if (this.owner) return this.owner.name\n    return this.owner?.name")
        expect(code).toContain('if (this.owner === undefined) return ""\n    else return this.owner.name')
        // set in between:  it may be nothing again
        expect(code).toMatch(/this\.owner = undefined\n\s*return this\.owner\?\.name/)
        expect(code).not.toContain("this.owner!")
      })
    }

    test("Python:  a plain attribute, not getattr(..., None)", () => {
      const code = compiled("/Pets.spell", CHECKED, PY.PyWriter.instance)
      expect(code).toContain("return self.owner and self.owner.name")
      expect(code).toMatch(
        /if self\.owner:\n\s*return self\.owner\.name\n\s*return getattr\(self\.owner, "name", None\)/
      )
      expect(code).toMatch(/else:\n\s*return self\.owner\.name/)
      expect(code).toMatch(/self\.owner = None\n\s*return getattr\(self\.owner, "name", None\)/)
    })

    test("run, a pet with no owner:  nothing, never a throw", () => {
      const run = runSpellFiles([
        { path: "/Pets.spell", contents: [...CHECKED, "set rex to a new pet", "set hi to greet rex"].join("\n") }
      ])
      expect(run("hi")).toEqual({ hi: undefined })
    })
  })

  test("Python reads through it with getattr(..., None), and runs", () => {
    const code = compiled("/Pets.spell", EN, PY.PyWriter.instance)
    expect(code).toContain('return getattr(self.owner, "name", None)')
    expect(code).toContain('who = getattr(rex.owner, "name", None)')
    const folder = mkdtempSync(join(tmpdir(), "spell-nothing-"))
    try {
      writeFileSync(join(folder, "pets.py"), SP.SpellDeclarations.stripComments(code))
      const printed = execFileSync(
        "uv",
        ["run", "--quiet", "--project", SPELL_CORE, "python", join(folder, "pets.py")],
        {
          encoding: "utf8"
        }
      )
      expect(printed.trim()).toBe("None")
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
