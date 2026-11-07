import { describe, test, expect } from "vite-plus/test"

import { spellParser } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * Inline statements change scope ONLY when the line's statement wins -- see `commitStatement()`.
 * - Parsing a statement on its own is what every candidate for a line does, so it must NOT change scope,
 *   or a losing candidate's types / rules / variables leak into the project.
 */
describe("inline statements change scope only when committed", () => {
  const SOURCE = "if yes then a widget is a thing"

  test("parsing the statement alone leaves scope alone", () => {
    const scope = spellParser.getScope("inline-uncommitted")
    const statement = scope.parse(SOURCE, "statement")
    expect(statement?.rule instanceof SpellStatement && statement.rule.getBody(statement)).toBeTruthy()
    expect(scope.types?.get("Widget")).toBeUndefined()
  })

  test("parsing it as a line commits the inline statement's scope changes", () => {
    const scope = spellParser.getScope("inline-committed")
    scope.parse(SOURCE, "block")
    expect(scope.types?.get("Widget")).toBeDefined()
  })
})

/**
 * Every block's last expression is its value (epic `language` I47, Owen's C;  closes T91):
 * a property's, an action's or a `to ...` method's last line gives back its value, when it's a value.
 */
describe("a body's last line is its value (I47)", () => {
  const BILL = `a bill is a thing:
	- it has a n as number
	- to quadruple it:
		return its n * 4
	- its "called" is:
		quadruple it
	- to shout:
		"hey"  // a shout
	- to double it:
		set x to 2

		its n * x
		// done
	- to deal:
		print "x"
	- to calc:
		quadruple it
	- to check it:
		if its n > 2
			print "big"
`
  const compiled = () => parseSpellProject([{ path: "/Test.spell", contents: BILL }]).files[0]!

  test("a property's one line, a call, returns it (T91)", () => {
    expect(compiled().compiled).toContain("get called() {\n    return this.quadruple()")
  })

  test("an action's last line, a value, returns it;  a call too", () => {
    const { compiled: code, errors } = compiled()
    expect(errors).toEqual([])
    expect(code).toContain('// a shout\n    return "hey"')
    expect(code).toContain("const x = 2\n\n    return this.n * x\n    // done")
    expect(code).toContain("calc() {\n    return this.quadruple()")
  })

  test("a last line that's a statement stays one", () => {
    const { compiled: code } = compiled()
    expect(code).toContain('deal() {\n    core.console.log("x")')
    expect(code).toContain('if (this.n > 2) core.console.log("big")')
  })

  test("what it returns is recorded:  a call of it is a value of that type", () => {
    const { scope } = parseSpellProject([{ path: "/Test.spell", contents: BILL }])
    expect(scope.types?.get("Bill")?.methods?.get("calc")?.returns).toBe("number")
  })

  test("it runs:  the call gives the value", () => {
    const run = runSpell([...BILL.trimEnd().split("\n"), "set b to a new bill with n = 3", "set v to calc b"])
    expect(run("v")).toEqual({ v: 12 })
  })

  test("in Spanish too", () => {
    const { compiled: code, errors } = parseSpellProject([
      {
        path: "/Test.es.spell",
        contents: `una "cuenta" es una cosa donde:
	- tiene un n como número
	- para doblar:
		poner x en 2
		su n * x
`
      }
    ]).files[0]!
    expect(errors).toEqual([])
    expect(code).toContain("const x = 2\n    return this.n * x")
  })
})
