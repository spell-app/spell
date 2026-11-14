import { beforeEach, describe, expect, test } from "vite-plus/test"

import { App, core } from "spell/parser/core"
import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * A top-level action (`to x` outside any type) is ONE undo step by itself, as a type's is (epic `language` J149):
 * its body run through the core, `core.asAction()`, or Python's `@core.as_action(...)` above its `def`.
 * - The same exceptions as a type's (Q60):  a question, a function with no steps, `can't be undone`.
 */

/** A card, and actions outside it that turn it, as a program's outline says them. */
const CARD = ["a card is a thing", "a card has a side as text", "the c is a new card"]

/** `lines`, one file, compiled by `writer`, its declarations comments left out. */
function compiled(lines: string[], writer: P.ProgramWriter = P.JSWriter.instance): string {
  const { scope, files } = parseSpellProject([{ path: "/Actions.spell", contents: lines.join("\n") }])
  expect(files[0]!.errors).toEqual([])
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const code = SP.SpellProject.combineCompiled(parts, writer, SP.SpellProject.importHeaderFor(scope, writer), scope)
  return code.replace(/\/\*! SPELL: DECLARES[\s\S]*?\*\/\n/g, "")
}

beforeEach(() => {
  core.resetRuntime()
})

describe("a top-level action", () => {
  test("is ONE undo step, named by its title:  its body runs through the core", () => {
    const lines = [...CARD, "to turn the card over:", '\tset the side of c to "up"']
    expect(compiled(lines)).toContain(
      [
        "export function turnTheCardOver() {",
        '  return core.asAction({ undoneAs: "Turn The Card Over" }, () => {',
        '    c.side = "up"',
        "  })",
        "}"
      ].join("\n")
    )
    const { c, turn_the_card_over: turnTheCardOver } = runSpell(lines)("c, turn_the_card_over") as {
      c: { side: string }
      turn_the_card_over: () => void
    }
    // a run of its own, its history empty
    core.resetRuntime()
    const app = new App()
    turnTheCardOver()
    expect([c.side, app.undoTitle]).toEqual(["up", "Undo Turn The Card Over"])
    app.undo()
    expect(c.side).toBe("")
  })

  test("giving back a value, it's one too, and joins the step of one that calls it", () => {
    const lines = [
      ...CARD,
      "to count the cards:",
      '\tset the side of c to "up"',
      "\treturn 1",
      "to turn and count:",
      '\tset the side of c to "down"',
      "\treturn count the cards"
    ]
    const { turn_and_count: turnAndCount } = runSpell(lines)("turn_and_count") as { turn_and_count: () => number }
    core.resetRuntime()
    expect(turnAndCount()).toBe(1)
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Turn And Count"])
  })

  test("`can't be undone`:  none", () => {
    const lines = [...CARD, "to peek at the card, can't be undone:", '\tset the side of c to "up"']
    expect(compiled(lines)).toContain('return core.asAction({ cantBeUndone: "keeps history" }, () => {')
  })

  test("not a question, nor one with no steps:  a plain function", () => {
    const lines = [...CARD, 'to "is the card up?": return the side of c is "up"', "to start the game"]
    const code = compiled(lines)
    expect(code).not.toContain("asAction")
    expect(code).toContain("export function startTheGame() {}")
  })

  test("in Python:  `@core.as_action(...)` above its `def`", () => {
    const lines = [...CARD, "to turn the card over:", '\tset the side of c to "up"']
    expect(compiled(lines, PY.PyWriter.instance)).toContain(
      ['@core.as_action({"undone_as": "Turn The Card Over"})', "def turn_the_card_over() -> None:"].join("\n")
    )
  })
})
