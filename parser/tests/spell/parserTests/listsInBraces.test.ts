import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A list written in braces in a drawing (epic `data` I57):  it goes through `core.listShown()`, as Solid can't draw a `List`.
 * - What it shows is the core's:  `listShown.browser.test.tsx`, in the app folder's tests.
 */

const SHELF = `<spell-view "shelf">
	<spell>
		- its "names" is a list of text
		- its "title" is text
	</spell>
	<draw>
		<text title={its names}>{its names} · {its title}</text>
	</draw>
</spell-view>`

/** The shelf, written by `writer`. */
function written(writer: P.ProgramWriter) {
  const { files, scope } = parseSpellProject([{ path: "/Shelf.spellml", contents: SHELF }])
  expect(files[0]!.errors).toEqual([])
  return SP.SpellProject.combineCompiled([files[0]!.match!.AST as P.ASTStatementGroup], writer, "", scope)
}

describe("a list in braces", () => {
  beforeAll(registerTestComponentPack)

  test("javascript:  an element's list shows through the core, its text doesn't, nor does an attribute", () => {
    expect(written(P.JSWriter.instance)).toContain("() => core.listShown(this.names)")
  })

  test("TypeScript:  the same", () => {
    const code = written(P.TSWriter.instance)
    expect(code).toContain("{core.listShown(this.names)}")
    expect(code).not.toContain("core.listShown(this.title)")
  })

  test("Python's page file, which draws in javascript:  the same", () => {
    expect(written(PY.ElementsWriter.instance)).toContain("core.listShown(")
  })
})
