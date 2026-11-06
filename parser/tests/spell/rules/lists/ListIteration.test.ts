import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/** A getter that returns from inside a `for each`, and what it says when nobody matches. */
const PROJECT = `a person is a thing:
	- it has a name as text
	- it has a score as a number
a room is a thing:
	- its "winner" is:
		for each person in every person
			if the score of the person is 5
				return the name of the person
		return "nobody"
`

/** `spell` compiled whole for `target`. */
function compiled(spell: string, target: string): string {
  const { files } = parseSpellProject([{ path: "/Test.spell", contents: spell }])
  const errors = files.flatMap((file) => file.errors)
  if (errors.length) throw new Error(errors.join("\n"))
  const parts = files.map(({ match }) => match?.AST as P.ASTStatementGroup)
  return SP.SpellProject.combineCompiled(parts, SP.TARGETS[target]!.writer)
}

describe("a return inside `for each` (epic `atmosphere` I6)", () => {
  test("leaves the getter, not a callback:  a plain loop, in every target", () => {
    for (const target of ["js/solid", "ts/solid"]) {
      const code = compiled(PROJECT, target)
      expect(code, target).toMatch(
        /for \(const person of core\.everyThing\(Person\)\) \{\n\s+if \(person\.score === 5\) return person\.name\n\s+\}\n\s+return "nobody"/
      )
      expect(code, target).not.toContain("core.map(")
    }
    expect(compiled(PROJECT, "py")).toMatch(
      /for person in core\.every_thing\(Person\):\n\s+if person\.score == 5:\n\s+return person\.name/
    )
  })

  test("a bare return still ends only that turn:  the loop stays as it was", () => {
    const js = compiled(PROJECT.replace("return the name of the person", "return"), "js/solid")
    expect(js).not.toMatch(/for \(const person of/)
  })
})
