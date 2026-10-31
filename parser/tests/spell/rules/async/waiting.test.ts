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
    expect(js).toMatch(/^core\.holdWhile\(\(\) => deal\(\)\)$/m)
    // Python's page draws from what it ended up as, so it runs to its end
    expect(compiled(`to deal:\n	pause for 1 sec\ndeal`, "py")).toContain("asyncio.run(deal())")
  })

  test("a step that doesn't wait stays as it is", () => {
    expect(compiled(`to deal:\n	print 1\ndeal`)).toMatch(/^deal\(\)$/m)
  })

  test("the top level still waits for `core`'s own, as it says", () => {
    expect(compiled(`pause for 1 sec`)).toContain("await core.pauseFor(1")
  })

  test("a handler is its own function:  it waits, and what holds it doesn't", () => {
    const js = compiled(PROJECT(`	- to go it:\n		on hit:\n			bump it`))
    expect(js).toContain("  go() {")
    expect(js).toMatch(/async \(?\w*\)? => (\{\s*)?await this\.bump\(\)/)
  })

  test("`create()` answers at once", () => {
    const js = compiled(PROJECT(`	- to create it:\n		bump it`))
    expect(js).not.toMatch(/async create/)
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

describe("what a person presses", () => {
  const DRAWN = `a card is a view:
	- to deal it:
		pause for 1 sec
	- to draw it:
		<button onClick={deal it} onInput={deal it}>"Deal"</button>
`

  test("a click in a drawing waits its turn, written `core.pressed()`;  what keeps up with the person doesn't", () => {
    const js = compiled(DRAWN)
    expect(js).toContain("onClick: core.pressed(this, async () => await this.deal())")
    expect(js).toContain("onInput: async () => await this.deal()")
    expect(compiled(DRAWN, "ts/solid")).toContain("onClick={core.pressed(this, async () => await this.deal())}")
  })

  test("an action that waits holds no guard of its own:  that's the queue's job", () => {
    const js = compiled("a card is a thing:\n\t- to deal it:\n\t\tpause for 1 sec\n")
    expect(js).toContain("async deal()")
    expect(js).not.toContain("processIsRunning")
  })

  test("`- a new one replaces the last one`, in both languages", () => {
    const action = "a card is a thing:\n\t- to search it:\n\t\t- a new one replaces the last one\n\t\tpause for 1 sec\n"
    expect(compiled(action)).toContain("replacesLast: true")
    expect(compiled(action, "py")).toContain('"replaces_last": True')
  })
})

describe("saying not to wait", () => {
  const SAME_TIME = `	- to go it:
		at the same time:
			slow it
			rest it
`

  test("`at the same time:` runs each line, and waits if any does", () => {
    const js = compiled(PROJECT(SAME_TIME))
    expect(js).toContain("async go()")
    expect(js).toMatch(/await core\.together\(\s*async \(\) => await this\.slow\(\),\s*\(\) => this\.rest\(\)/)
    const py = compiled(PROJECT(SAME_TIME), "py")
    expect(py).toContain("async def go(self)")
    expect(py).toMatch(/await core\.together\(/)
  })

  test("`at the same time:` with nothing that waits doesn't wait", () => {
    const js = compiled(PROJECT(`	- to go it:\n		at the same time:\n			rest it\n			rest it`))
    expect(js).not.toContain("async go()")
    expect(js).not.toContain("await core.together")
  })

  test("a loop in `at the same time:` runs its items together", () => {
    const spell = PROJECT(`	- to go it:\n		at the same time:\n			for each n in [1, 2]\n				pause for 1 sec`)
    expect(compiled(spell)).toMatch(/core\.eachTogether\(\s*\[1, 2\]/)
    expect(compiled(spell, "py")).toMatch(/core\.each_together\(/)
  })

  test("`meanwhile` starts it, and its caller doesn't wait", () => {
    const spell = PROJECT(`	- to go it:\n		meanwhile bump it\n		rest it`)
    const js = compiled(spell)
    expect(js).not.toContain("async go()")
    expect(js).toContain("core.meanwhile(async () => await this.bump())")
    const py = compiled(spell, "py")
    expect(py).not.toContain("async def go(self)")
    expect(py).toMatch(/core\.meanwhile\(_\w+\)/)
  })

  test("in Spanish", () => {
    const spell = `una carta es una cosa:
	- para irla:
		al mismo tiempo:
			pausar 1 seg
			pausar 2 seg
		mientras tanto pausar 1 seg
`
    const { files } = parseSpellProject([{ path: "/Test.es.spell", contents: spell }])
    expect(files.flatMap((file) => file.errors)).toEqual([])
    const js = SP.SpellProject.combineCompiled(
      files.map(({ match }) => match?.AST as P.ASTStatementGroup),
      SP.TARGETS["js/solid"]!.writer
    )
    expect(js).toContain("await core.together(")
    expect(js).toContain("core.meanwhile(")
  })

  test("`its` and `it` in a block read as they do outside it", () => {
    const js = compiled(
      PROJECT(
        `	- to go it:\n		at the same time:\n			set the score to its score\n			meanwhile set the score to 2`
      )
    )
    expect(js).toContain("this.score = this.score")
    expect(js).toContain("this.score = 2")
  })

  test("a toast waits only when it says how long, and never one that stays", () => {
    const js = compiled(`to show it:
	notify "Aside"
	notify "Stays" until clicked
	notify "Stays" with "Got it"
	notify "A while" for 1 second
to carry on:
	meanwhile notify "A while" for 1 second
`)
    expect(js).toContain('core.notify("Aside")')
    expect(js).toContain('await core.notify("A while"')
    expect(js).toContain("export async function showIt()")
    expect(js).toContain("export function carryOn()")
  })
})

describe("a getter that waits", () => {
  const GAME = (lines: string) => `a game is a thing:
	- it has a score as a number
	- its "total" is:
		pause for 1 sec
		return the score + 1
	- its "doubled" is the total * 2
${lines}
`

  test("it's a value that waits, following what it reads, in javascript and TypeScript", () => {
    for (const target of ["js/solid", "ts/solid"]) {
      const code = compiled(GAME(""), target)
      expect(code).toContain('get total() { return core.waitedValue(this, "total", async () => {')
      expect(code).toContain("() => [this.score]")
      expect(code).not.toContain("async get")
    }
  })

  test('a getter over one stays plain on Solid:  "not yet" passes through it', () => {
    expect(compiled(GAME(""))).toMatch(/get doubled\(\) \{\s+return this\.total \* 2/)
  })

  test("it's never remembered in TypeScript, nor is a getter over one", () => {
    const spell = GAME(`	- its "tally" is:
		set sum to 0
		for each n in [1, 2]
			set sum to sum + the total
		return sum`)
    expect(compiled(spell, "ts/solid")).not.toContain("@derived")
  })

  test("an action waits for its answer, a getter over one's too", () => {
    const js = compiled(GAME(`	- to go it:\n		set x to the doubled\n		print the total\n		return x`))
    expect(js).toContain("async go()")
    expect(js).toContain('const x = await core.answerOf(this, "doubled")')
    expect(js).toContain('core.console.log(await core.answerOf(this, "total"))')
  })

  test("what isn't a value that waits is read as it is", () => {
    const js = compiled(GAME(`	- to go it:\n		return the score`))
    expect(js).toContain("  go() {")
    expect(js).toContain("return this.score")
  })

  test("in Python it's an async property;  a getter over one is too, and an action waits for the answer", () => {
    const py = compiled(GAME(`	- to go it:\n		return the total`), "py")
    expect(py).toMatch(/@property\s+async def total\(self\)/)
    expect(py).toMatch(/@property\s+async def doubled\(self\)/)
    expect(py).toContain('await core.answer_of(self, "total")')
  })

  test("Python's drawing has its values before the page is sent", () => {
    const py = compiled(GAME(`	- to draw it:\n		<div>{the total}</div>`), "py")
    expect(py).toMatch(/\n    def draw\(self\)/)
    expect(py).toContain('core.answer_now(self, "total")')
  })

  test("a library's is a plain async getter, on no core of its own", () => {
    const lib = compiled(GAME(`	- to go it:\n		return the doubled`), "ts/lib")
    expect(lib).toMatch(/get total\(\)[^{]*\{ return \(async \(\) => \{/)
    expect(lib).toMatch(/get doubled\(\)[^{]*\{ return \(async \(\) => \{/)
    expect(lib).toContain("await this.doubled")
    expect(lib).not.toContain("waitedValue")
    expect(lib).not.toContain("answerOf")
  })
})

describe("a drawing that reads what waits", () => {
  const GAME = (drawing: string) => `a game is a thing:
	- its "total" is:
		pause for 1 sec
		return 1
	- it has a score as a number
	- to draw it:
${drawing}
`

  test("a value alone has its own stand-in", () => {
    const js = compiled(GAME(`		<div>{the score}{the total}</div>`))
    expect(js).toContain("() => core.whileWaiting(() => this.total)")
    expect(js).toContain("() => this.score,")
    expect(js).not.toContain("drawsWaiting")
    expect(compiled(GAME(`		<div>{the total}</div>`), "ts/solid")).toContain("{core.whileWaiting(() => this.total)}")
  })

  test("an `if` or an attribute has no spot for one, so the whole thing is held", () => {
    for (const drawing of [`		if the total is 1\n			<div>x</div>`, `		<div class={the total}>x</div>`]) {
      expect(compiled(GAME(drawing))).toContain("static drawsWaiting = true")
    }
    expect(compiled(GAME(`		<div class={the total}>x</div>`), "ts/solid")).toContain("static drawsWaiting = true")
  })

  test("a drawing that reads nothing that waits is as it was", () => {
    const js = compiled(GAME(`		<div class={the score}>{the score}</div>`))
    expect(js).not.toContain("whileWaiting")
    expect(js).not.toContain("drawsWaiting")
  })

  test("a handler in a drawing is its own function:  it may wait", () => {
    const spell = `a game is a thing:
	- to draw it:
		<div onClick={pause for 1 sec}>x</div>`
    const { files } = parseSpellProject([{ path: "/Test.spell", contents: spell }])
    expect(files[0]!.errors).toEqual([])
  })

  test.for([
    ["a pause", "pause for 1 sec"],
    ["a wait", "wait for: 1"]
  ])("%s in a drawing is a clear error", ([, line]) => {
    const { files } = parseSpellProject([
      { path: "/Test.spell", contents: `a game is a thing:\n	- to draw it:\n		${line}\n		<div>x</div>` }
    ])
    expect(JSON.stringify(files[0]!.errors)).toContain("A drawing can't wait")
  })

  test("in Spanish too", () => {
    const { files } = parseSpellProject([
      {
        path: "/Test.es.spell",
        contents: `un juego es una cosa:\n	- para dibujarlo:\n		pausar 1 segundo\n		<div>x</div>`
      }
    ])
    expect(JSON.stringify(files[0]!.errors)).toContain("Un dibujo no puede esperar")
  })
})

describe("reads after a wait", () => {
  const warningsOf = (body: string) => {
    const contents = `a room is a thing:\n	- it has a size as a number\na game is a thing:\n	- it has a room as a room\n	- it has a score as a number\n	- its "total" is:\n${body}`
    return JSON.stringify(parseSpellProject([{ path: "/Test.spell", contents }]).files[0]!.warnings)
  }

  test("a member of something else, after a wait, warns", () => {
    expect(warningsOf(`		pause for 1 sec\n		return the size of the room`)).toContain("follow what it reads")
  })

  test("above the wait, or its own member, it doesn't", () => {
    expect(warningsOf(`		set size to the size of the room\n		pause for 1 sec\n		return size`)).not.toContain(
      "follow"
    )
    expect(warningsOf(`		pause for 1 sec\n		return the score`)).not.toContain("follow")
  })
})

// epic `language` P13, Q9
describe("the old words for waiting, retired", () => {
  /** `lines`, a file of its own project:  each error's words and what replaces them, and its code. */
  function parsed(path: string, lines: string[]) {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    const errors = (SP.Block.getParseErrors(file!.match!) ?? []).map((error) => [
      error.inputText.trim(),
      error.data.replacement
    ])
    return { errors, messages: file!.errors.map((error) => `${error}`), code: file!.compiled }
  }

  test.each([
    ["- animation deal it:", "animation", "to"],
    ["- create animation deal it:", "create animation", "to"],
    ["wait for: slow it", "wait for", ""],
    ["await slow it", "await", ""],
    ["start animation dealing", "animation", "process"],
    ["stop animation dealing", "animation", "process"],
    ["if animation dealing is running then print 1", "animation", "process"],
    ['notify "Bye" for 1 second and wait', "and wait", ""]
  ])("English:  %s", (line, words, replacement) => {
    const body = line.startsWith("-") ? [`\t${line}`, "\t\tpause for 1 sec"] : ["\t- to go it:", `\t\t${line}`]
    const { errors, messages } = parsed("/Test.spell", [
      "a card is a thing:",
      "\t- to slow it:",
      "\t\tpause for 1 sec",
      ...body
    ])
    expect(errors).toEqual([[words, replacement]])
    expect(messages[0]).toContain("spell lint --fix")
  })

  test.each([
    ["- animación repartirla:", "animación", "para"],
    ["- crear animacion repartirla:", "crear animacion", "para"],
    ["esperar a: frenar", "esperar a", ""],
    ["esperar frenar", "esperar", ""],
    ["iniciar animación repartir", "animación", "proceso"],
    ["detener animación repartir", "animación", "proceso"],
    ['notificar "Adiós" durante 1 segundo y esperar', "y esperar", ""]
  ])("Spanish:  %s", (line, words, replacement) => {
    const body = line.startsWith("-") ? [`\t${line}`, "\t\tpausar 1 segundo"] : ["\t- para ir:", `\t\t${line}`]
    const lines = ["una carta es una cosa donde:", "\t- para frenar:", "\t\tpausar 1 segundo", ...body]
    const { errors, messages } = parsed("/Prueba.es.spell", lines)
    expect(errors).toEqual([[words, replacement]])
    expect(messages[0]).toContain("spell lint --fix")
  })

  test("what stays:  `start process`, `process x is running`", () => {
    const { errors } = parsed("/Test.spell", ["start process dealing", "if process dealing is running then print 1"])
    expect(errors).toEqual([])
  })

  test("a word in a comment or a text is left alone", () => {
    const { errors } = parsed("/Test.spell", ["// wait for: an animation", 'print "wait for: an animation"'])
    expect(errors).toEqual([])
  })
})
