import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * `clear` of a value that isn't a list sets it back to its empty value, its type declared in a LATER file too
 * (epic `language` T85, from Tic-Tac-Toe's `clear the mark of the square`).
 * - A property a later file declares is known ahead by name only, so the line parses as a list's clear;
 *   the writer, which knows the whole project, writes the text's `""`.
 * - So is a loop's item whose list type is declared further down:  `for square in its board` above the board.
 * - It compiled to `core.clear(square.mark)`, which throws on text at run time.
 */
const FILES = [
  {
    path: "/Game.spellml",
    contents: [
      '<spell-thing "board" template="list of squares"/>',
      '<spell-app "game">',
      '\t<property "board">a new board</>',
      '\t<action "start it">',
      "\t\tfor square in its board",
      "\t\t\tclear the mark of the square",
      "\t\t\tclear the square's count",
      "\t\t\tclear the square's lit",
      "\t</action>",
      "</spell-app>"
    ].join("\n")
  },
  {
    path: "/Square.spellml",
    contents: [
      '<spell-thing "square">',
      '\t<property "mark">text</>',
      '\t<property "count">number</>',
      '\t<property "lit">yes or no</>',
      "</spell-thing>"
    ].join("\n")
  }
]

/** `sources`, compiled by `writer`, as a project is. */
function compiled(writer: P.ProgramWriter, sources = FILES): string {
  const { scope, files } = parseSpellProject(sources)
  expect(files.flatMap((file) => file.errors)).toEqual([])
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  return SP.SpellProject.combineCompiled(parts, writer, SP.SpellProject.importHeaderFor(scope, writer), scope)
}

/** Tic-Tac-Toe's shape:  the square first, then the app looping over its board, the board's type declared below it. */
const BOARD_BELOW = [
  { path: "/Square.spellml", contents: FILES[1]!.contents },
  {
    path: "/Game.spellml",
    contents: [
      '<spell-app "game">',
      '\t<property "board">a new board</>',
      '\t<action "start it">',
      "\t\tfor square in its board",
      "\t\t\tclear the square's mark",
      "\t</action>",
      "</spell-app>",
      '<spell-thing "board" template="list of squares"/>'
    ].join("\n")
  }
]

describe("clearing a value declared in a later file", () => {
  test("javascript sets it back:  text to empty, a number to 0, a yes / no to false", () => {
    const code = compiled(P.JSWriter.instance)
    expect(code).toContain('square.mark = ""')
    expect(code).toContain("square.count = 0")
    expect(code).toContain("square.lit = false")
    expect(code).not.toContain("core.clear(")
  })

  test("so does Python", () => {
    const code = compiled(PY.PyWriter.instance)
    expect(code).toContain('square.mark = ""')
    expect(code).toContain("square.count = 0")
    expect(code).toContain("square.lit = False")
    expect(code).not.toContain("core.clear(")
  })

  test("a loop's item, its list's type declared below:  javascript and Python", () => {
    expect(compiled(P.JSWriter.instance, BOARD_BELOW)).toContain('this.board.forEach((square) => (square.mark = ""))')
    expect(compiled(PY.PyWriter.instance, BOARD_BELOW)).toContain(
      'for square in self.board:\n            square.mark = ""'
    )
  })
})
