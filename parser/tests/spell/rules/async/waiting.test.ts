import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * What waits, with no word in the source (epic `language` P9):  `P.WriterProject.findWaiting()`, for every target.
 * - Each row:  a project's action, what javascript writes, and what Python writes.
 */

const PROJECT = (lines: string) => `a card is a thing:
	- it has a score as a number
	- to slow it:
		pause for 1 sec
	- to bump it:
		slow it
	- to rest it:
		set the score to 1
${lines}
`

/** `spell` compiled whole for `target`. */
function compiled(spell: string, target = "js/solid"): string {
  const { files } = parseSpellProject([{ path: "/Test.spell", contents: spell }])
  const errors = files.flatMap((file) => file.errors)
  if (errors.length) throw new Error(errors.join("\n"))
  const parts = files.map(({ match }) => match?.AST as P.ASTStatementGroup)
  return SP.SpellProject.combineCompiled(parts, SP.TARGETS[target]!.writer)
}

describe("what waits", () => {
  test("a function that calls what waits waits, however far off", () => {
    const js = compiled(PROJECT(`	- to go it:\n		bump it`))
    expect(js).toContain("async slow()")
    expect(js).toContain("await core.pauseFor(1")
    expect(js).toContain("async bump()")
    expect(js).toContain("await this.slow()")
    expect(js).toContain("async go()")
    expect(js).toContain("await this.bump()")
    expect(js).not.toMatch(/async rest/)
    const py = compiled(PROJECT(`	- to go it:\n		bump it`), "py")
    expect(py).toContain("async def go(self)")
    expect(py).toContain("await self.bump()")
  })

  test("what doesn't wait stays plain", () => {
    const js = compiled(PROJECT(`	- to go it:\n		rest it`))
    expect(js).toContain("  go() {")
    expect(js).toContain("this.rest()")
    expect(js).not.toContain("await this.rest()")
  })

  test("a call in a condition is waited for, with no double await", () => {
    const js = compiled(PROJECT(`	- to go it:\n		if bump it is 5\n			rest it`))
    expect(js).toMatch(/if \(await this\.bump\(\) === 5\)|if \(\(await this\.bump\(\)\) === 5\)/)
    expect(js).not.toMatch(/await await/)
  })

  test("`wait for` says once what the pass would say", () => {
    const js = compiled(PROJECT(`	- to go it:\n		wait for: bump it`))
    expect(js).toContain("await this.bump()")
    expect(js).not.toMatch(/await await/)
  })

  test("a loop calling what waits goes one by one, in every target", () => {
    const spell = PROJECT(`	- to go it:\n		set deck to a new list\n		for each card in deck\n			bump the card`)
    const js = compiled(spell)
    expect(js).toMatch(/for \(const card of [\w.]+\) \{\s+await card\.bump\(\)/)
    expect(compiled(spell, "py")).toMatch(/for card in \w+:\s+await card\.bump\(\)/)
  })

  test("a loop calling nothing that waits overlaps nothing, and stays a plain loop", () => {
    const spell = PROJECT(`	- to go it:\n		set deck to a new list\n		for each card in deck\n			rest the card`)
    expect(compiled(spell)).toContain("  go() {")
  })

  test("a `where` whose condition waits asks in turn", () => {
    const spell = PROJECT(
      `	- to answer it:\n		pause for 1 sec\n		return true\n	- to go it:\n		set deck to a new list\n		set kept to the cards in deck where answer it\n		return kept`
    )
    expect(compiled(spell)).toMatch(/await core\.filterInTurn\(/)
    expect(compiled(spell, "py")).toMatch(/await core\.filter_in_turn\(/)
  })
})

describe("places that can't simply wait", () => {
  test("the top level starts the program's and carries on, so it never holds the first draw", () => {
    const js = compiled(`to deal:\n	pause for 1 sec\ndeal`)
    expect(js).toMatch(/^deal\(\)$/m)
  })

  test("the top level still waits for `core`'s own, as it says", () => {
    expect(compiled(`pause for 1 sec`)).toContain("await core.pauseFor(1")
  })

  test("a handler is its own function:  it waits, and what holds it doesn't", () => {
    const js = compiled(PROJECT(`	- to go it:\n		on hit:\n			bump it`))
    expect(js).toContain("  go() {")
    expect(js).toMatch(/async \(?\w*\)? => (\{\s*)?await this\.bump\(\)/)
  })

  test("`create()` and a getter answer at once", () => {
    const js = compiled(PROJECT(`	- to create it:\n		bump it\n	- its "total" is bump it`))
    expect(js).not.toMatch(/async (get )?(create|total)/)
    expect(js).not.toContain("await this.bump()")
  })

  test("a `to test` runs to its end at once:  `core.test()` doesn't wait", () => {
    const js = compiled(PROJECT(`to test the card:\n	set c to a new card\n	bump c`))
    expect(js).not.toMatch(/async function testTheCard/)
  })
})

describe("sending", () => {
  test("a sender waits only if a handler of the event does", () => {
    const waits = compiled(PROJECT(`	- on hit:\n		bump it\n	- to go it:\n		send hit`))
    expect(waits).toMatch(/await send\(/)
    const doesnt = compiled(PROJECT(`	- on hit:\n		rest it\n	- to go it:\n		send hit`))
    expect(doesnt).not.toMatch(/await send\(/)
  })
})

describe("what a project imports", () => {
  test("its declarations carry the project's answer, not just the method's own body", () => {
    const spell = PROJECT(`	- to go it:\n		bump it`)
    const { files } = parseSpellProject([{ path: "/Test.spell", contents: spell }])
    SP.SpellProject.combineCompiled(files.map(({ match }) => match?.AST as P.ASTStatementGroup))
    const methods: P.ASTMethodDefinition[] = []
    P.forEachNode(files[0]!.match?.AST, (node) => {
      if (node instanceof P.ASTMethodDefinition && node.methodName === "go") methods.push(node)
      if (node instanceof P.ASTPropertyDefinition && node.property.value === "go" && node.method)
        methods.push(node.method)
    })
    expect(methods.length).toBeGreaterThan(0)
    expect(methods.every((method) => method.isAsync)).toBe(true)
  })
})
