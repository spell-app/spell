import { beforeEach, describe, expect, test } from "vite-plus/test"

import { core } from "spell/parser/core"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

/**
 * A program's steps run once every file has set itself up (`SP.runningCodeLast()`, epic `mockup`):
 * the order a project file lists its files in doesn't change what the program does.
 * - FizzBuzz's counting file came first in its project file, and its events were sent before
 *   `Console.spell` listened:  nothing printed.
 */

const COUNT = `## Counting
to count to three
	for number from 1 to 3
		trigger tick with number = the number

count to three`

const LISTEN = `the total is 0

on tick with number as a number
	set the total to the total + number`

const FILES = [
  { path: "/Count.spell", contents: COUNT },
  { path: "/Listen.spell", contents: LISTEN }
]

/** `files`, in the order given, compiled as one program. */
function compiled(files = FILES) {
  const { files: parsed, scope } = parseSpellProject(files)
  for (const { errors } of parsed) expect(errors).toEqual([])
  const parts = parsed.map(({ match }) => match!.AST as P.ASTStatementGroup)
  return SP.SpellProject.combineCompiled(parts, P.JSWriter.instance, "", scope)
}

describe("running code last", () => {
  beforeEach(() => core.resetRuntime())

  test("the counting file listed first, its events reach the listener in the file after it", () => {
    expect(runSpellFiles(FILES)("total")).toEqual({ total: 6 })
  })

  test("listed the other way, the same", () => {
    expect(runSpellFiles([...FILES].reverse())("total")).toEqual({ total: 6 })
  })

  test("every file's listeners come before any file's steps;  each file keeps its own order", () => {
    const code = compiled()
    const at = (text: string) => code.indexOf(text)
    expect(at("export function countToThree")).toBeLessThan(at("export let total"))
    expect(at('on("tick"')).toBeLessThan(code.lastIndexOf("countToThree()"))
    // its steps start with their heading again, so the Thing Explorer still knows where they're written
    expect(code.slice(at('on("tick"')).indexOf('core.heading("Counting")')).toBeGreaterThan(-1)
  })

  test("a program whose steps are in its last file compiles as it did", () => {
    const listed = [...FILES].reverse()
    const files = parseSpellProject(listed).files.map(
      ({ match }) => (match!.AST as P.ASTStatementGroup).statements ?? []
    )
    const { setUp, runs } = SP.runningCodeLast(files)
    expect(setUp).toBe(files)
    expect(runs).toEqual([[], []])
    expect(compiled(listed).match(/core\.heading\("Counting"\)/g)).toHaveLength(1)
  })
})
