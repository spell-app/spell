import { beforeAll, describe, expect, test } from "vite-plus/test"
import { mkdirSync, mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import { DiagnosticSeverity, type Location, type Position } from "vscode-languageserver"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"

/** The pile's line declaring its size. */
const PILE_SIZE = "- it has a size as a number"
/** The boss's line declaring its name. */
const BOSS_NAME = "- it has a name as text"
/** A pile's weight, declared as a possessive (T24). */
const PILE_WEIGHT = "a pile's weight is its size * 2"

/**
 * Possessives read and declare properties the way `the X of Y` does, for every editor feature (epic `language`,
 * P16, T23, T24):  `the stock's size`, `the boss' name`, `a pile's weight is ...`.
 */
const SOURCE = `a pile is a thing:
	${PILE_SIZE}
a boss is a thing:
	${BOSS_NAME}
${PILE_WEIGHT}
a game is a thing:
	- it has a stock as a new pile
	- it has a boss as a new boss
	- to play it:
		set v to the stock's size
		set w to the boss' name
		set x to the stock's weight
		set y to the weight of the stock
`

describe("SpellLanguageService, possessives (epic `language`, P16, T23, T24)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-possessive-"))
  const folder = resolve(dir, "Game")
  mkdirSync(folder)
  writeFileSync(resolve(folder, "Game.spell"), SOURCE)
  writeFileSync(resolve(folder, SP.PROJECT_FILE), `{ imports: [{ path: "/Game.spell", active: true }] }\n`)
  const uri = pathToFileURL(resolve(folder, "Game.spell")).href
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)
  let file: SP.SpellFile

  beforeAll(async () => {
    await workspace.update(uri, SOURCE)
    file = workspace.fileFor(uri)!
  })

  test("it parses with no errors", () => {
    const errors = service.diagnostics(file).filter((it) => it.severity === DiagnosticSeverity.Error)
    expect(errors.map((it) => it.message)).toEqual([])
  })

  test("hover shows the type it's read from:  'the X's Y', 'the X' Y', a possessive declaration's", () => {
    expect(hoverOn(at("set v to the stock's size", "size"))).toContain("property **size** of Pile")
    expect(hoverOn(at("set w to the boss' name", "name"))).toContain("property **name** of Boss")
    expect(hoverOn(at("set x to the stock's weight", "weight"))).toContain("property **weight** of Pile")
    expect(hoverOn(at("set y to the weight of the stock", "weight"))).toContain("property **weight** of Pile")
  })

  test("go to definition reaches the declaration, a possessive one too", () => {
    expect(lines(service.definition(file, at("set v to the stock's size", "size")))).toEqual([lineNumber(PILE_SIZE)])
    expect(lines(service.definition(file, at("set w to the boss' name", "name")))).toEqual([lineNumber(BOSS_NAME)])
    expect(lines(service.definition(file, at("set y to the weight of the stock", "weight")))).toEqual([
      lineNumber(PILE_WEIGHT)
    ])
  })

  function hoverOn(position: Position): string | undefined {
    return (service.hover(file, position)?.contents as { value: string } | undefined)?.value
  }
  function lineNumber(start: string): number {
    return SOURCE.split("\n").findIndex((it) => it.trim().startsWith(start))
  }
  function lines(locations: Location[]): number[] {
    return locations.map((location) => location.range.start.line)
  }
  function at(line: string, word: string): Position {
    const lines = SOURCE.split("\n")
    const index = lines.findIndex((it) => it.trim().startsWith(line))
    return { line: index, character: lines[index]!.indexOf(word, lines[index]!.indexOf(line)) + 1 }
  }
})
