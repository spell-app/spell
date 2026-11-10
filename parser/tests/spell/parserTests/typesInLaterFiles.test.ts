import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack, runSpellFiles } from "spell/parser/spell/test"

/**
 * An app's field made from a type in a later file (epic `data` I59, I71):  the order of a project's files doesn't matter.
 * - The app is made where its file sits, and making it makes its fields:
 *   a type that's further down the project has to be declared before that.
 */

const SHELF = `<spell-app "shelf">
	<spell>
		- its "page" is a new book page
	</spell>
</spell-app>`

const BOOK_PAGE = `<spell-thing "book page">
	<spell>
		- its "title" is text
		- to create it:
			set its title to "Dune"
	</spell>
</spell-thing>`

const FILES = [
  { path: "/Shelf.spell", contents: SHELF },
  { path: "/BookPage.spell", contents: BOOK_PAGE }
]

/** `FILES`, in the order given, written by `writer`. */
function written(writer: P.ProgramWriter, files = FILES) {
  const { files: parsed, scope } = parseSpellProject(files)
  for (const { errors } of parsed) expect(errors).toEqual([])
  const parts = parsed.map(({ match }) => match!.AST as P.ASTStatementGroup)
  return SP.SpellProject.combineCompiled(parts, writer, "", scope)
}

describe("a type in a later file", () => {
  beforeAll(registerTestComponentPack)

  test("an app listed first makes its field, a page from a file listed after it", () => {
    const { shelf } = runSpellFiles(FILES)("shelf") as { shelf: { page: { title: string } } }
    expect(shelf.page.title).toBe("Dune")
  })

  test("listed the other way, the same", () => {
    const { shelf } = runSpellFiles([...FILES].reverse())("shelf") as { shelf: { page: { title: string } } }
    expect(shelf.page.title).toBe("Dune")
  })

  test.each([
    ["javascript", P.JSWriter.instance, "class BookPage", "shelf = new Shelf()"],
    ["TypeScript", P.TSWriter.instance, "class BookPage", "shelf = new Shelf()"],
    ["Python", PY.PyWriter.instance, "class BookPage", "shelf = Shelf()"]
  ])("%s:  the class comes before what's made from it", (_name, writer, declared, made) => {
    const code = written(writer)
    expect(code).toContain(declared)
    expect(code.indexOf(declared)).toBeLessThan(code.indexOf(made))
    expect(code.indexOf(made)).toBeGreaterThan(-1)
  })

  test("a project whose types already come first compiles as it did", () => {
    const first = [...FILES].reverse()
    const before = SP.hoistClassMembers(parseSpellProject(first).files.map(statementsOf))
    expect(SP.hoistClassesMadeAsItLoads(before)).toBe(before)
  })
})

/** A parsed file's top-level statements. */
function statementsOf({ match }: { match: P.Match | undefined }) {
  return (match!.AST as P.ASTStatementGroup).statements ?? []
}
