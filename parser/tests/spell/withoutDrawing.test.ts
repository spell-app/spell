import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { LibraryWriter } from "spell/parser/parser/writers/LibraryWriter"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/** A library's file:  a board, which draws nothing. */
const BOARD = ["a board is a thing", '\tits "size" is a number']

/** The app that shows it, in a file of its own:  it draws. */
const WINDOW = ["board window is an app", "\tto draw it", "\t\t<div>Boards</div>"]

/** A tile that draws itself, in a file of its own. */
const TILE = ["a tile is a view", "\tto draw it", "\t\t<div>tile</div>"]

/** A file that draws nothing, but makes a tile:  it needs the tile's file. */
const TILE_BOX = ["a tile box is a thing", "\tto fill it", "\t\tset the tile to a new tile"]

/** `files`, by name, parsed as one project:  its parts and its files, in order. */
function partsOf(files: Record<string, string[]>) {
  const parsed = parseSpellProject(
    Object.entries(files).map(([name, lines]) => ({ path: `/${name}`, contents: lines.join("\n") }))
  )
  expect(parsed.files.flatMap((file) => file.errors)).toEqual([])
  const parts = parsed.files.map(({ match }) => match!.AST as P.ASTStatementGroup)
  return { ...parsed, parts, paths: Object.keys(files).map((name) => ({ path: `/${name}` })) }
}

/**
 * A target that can't draw (`ts/lib`) writes only a project's files that don't draw:  `SP.SpellProject.withoutDrawing()`.
 * - So a library can hold the app that shows it, which the targets that draw write as ever.
 */
describe("a target that can't draw", () => {
  test("leaves out the files that draw, keeping the rest in order", () => {
    const { parts, paths, scope } = partsOf({ "Board.spell": BOARD, "BoardWindow.spell": WINDOW })
    expect(SP.SpellProject.draws(parts)).toBe(true)
    const kept = SP.SpellProject.withoutDrawing(parts, paths, "boards", "ts/lib")
    expect(kept).toEqual({ parts: [parts[0]], files: [{ path: "/Board.spell" }] })
    expect(SP.SpellProject.draws(kept.parts)).toBe(false)
    // the library has the board, and nothing of the app
    const library = SP.SpellProject.combineCompiled(kept.parts, LibraryWriter.instance, "", scope)
    expect(library).toContain("class Board")
    expect(library).not.toContain("BoardWindow")
    expect(library).not.toMatch(/<div|jsx|template/i)
  })

  test("a project with no file that draws is written whole", () => {
    const { parts, paths } = partsOf({ "Board.spell": BOARD, "TileBox.spell": ["a tile box is a thing"] })
    expect(SP.SpellProject.withoutDrawing(parts, paths, "boards", "ts/lib").parts).toBe(parts)
  })

  test("leaves out its stylesheets too, whether or not a file draws:  there's no page to style", () => {
    const { parts, paths } = partsOf({ "Board.spell": BOARD, "BoardWindow.spell": WINDOW })
    const styles = "core.installStyles(undefined, `.board {}`)"
    expect(
      SP.SpellProject.withoutDrawing([...parts, styles], [...paths, { path: "/Board.css" }], "boards", "ts/lib")
    ).toEqual({ parts: [parts[0]], files: [{ path: "/Board.spell" }] })
    expect(
      SP.SpellProject.withoutDrawing([parts[0], styles], [paths[0]!, { path: "/Board.css" }], "boards", "ts/lib")
    ).toEqual({ parts: [parts[0]], files: [{ path: "/Board.spell" }] })
  })

  test("a project whose every file draws is refused, by name", () => {
    const { parts, paths } = partsOf({ "BoardWindow.spell": [...BOARD, ...WINDOW], "Tile.spell": TILE })
    expect(() => SP.SpellProject.withoutDrawing(parts, paths, "boards", "ts/lib")).toThrow(
      "'boards' draws a UI in every file, which target 'ts/lib' can't:  it writes only the files that don't draw."
    )
  })

  test("a file kept that uses a type from a file left out is refused, naming both files and the type", () => {
    const { parts, paths } = partsOf({ "Board.spell": BOARD, "Tile.spell": TILE, "TileBox.spell": TILE_BOX })
    expect(() => SP.SpellProject.withoutDrawing(parts, paths, "boards", "ts/lib")).toThrow(
      "'boards', for target 'ts/lib':  TileBox.spell uses 'tile', from Tile.spell, which draws a UI, so 'ts/lib' leaves it out."
    )
  })

  test("so is a file kept that subclasses one", () => {
    const { parts, paths } = partsOf({ "Tile.spell": TILE, "BigTile.spell": ["a big tile is a tile"] })
    expect(() => SP.SpellProject.withoutDrawing(parts, paths, "boards", "ts/lib")).toThrow(
      /BigTile\.spell uses '.*', from Tile\.spell, which draws a UI/
    )
  })

  test("a type a kept file declares too stays:  the file that draws only adds to it", () => {
    const { parts, paths } = partsOf({
      "Board.spell": BOARD,
      "BoardDrawing.spell": ["a board", "\tto draw it", "\t\t<div>{its size}</div>"],
      "BoardUse.spell": ["a board stack is a thing", '\tits "top" is a board']
    })
    expect(SP.SpellProject.withoutDrawing(parts, paths, "boards", "ts/lib").parts).toEqual([parts[0], parts[2]])
  })
})
