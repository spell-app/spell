import { beforeAll, describe, expect, test } from "vite-plus/test"
import { mkdirSync, mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import {
  CompletionItemKind,
  DiagnosticSeverity,
  type Location,
  type Position,
  type SemanticTokens,
  type TextEdit,
  type WorkspaceEdit
} from "vscode-languageserver"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"

/** The game's line declaring its stock. */
const GAME_STOCK = "- it has a stock as a new pile"
/** The shop's line declaring a stock of its own. */
const SHOP_STOCK = "- it has a stock as a number"
/** The shop's own read. */
const SHOP_READ = "set n to the stock"
/** The base's line declaring the label the game inherits. */
const LABEL = "- it has a label as text"

/**
 * Two types with a `stock` each, an inherited property, and a local that hides one:
 * every editor feature treats `the stock` as the property it is (epic `language`, P5).
 */
const SOURCE = `a pile is a thing:
	- it has a size as a number
a base is a thing:
	- it has a label as text
a game is a base:
	- it has a stock as a new pile
	- its "score" is a number
	- its "color" is one of red or blue
	- to play it:
		set v to the stock
		set w to its stock
		set x to the label
		set y to the stock of the game
		set the score to 1
	- to tidy it:
		set stock to 3
		print the stock
		print its stock
a shop is a thing:
	- it has a stock as a number
	- to count it:
		set n to the stock
`

describe("SpellLanguageService, the X reading a property (epic `language`, P5)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-the-"))
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

  test("hover shows the type it's read from", () => {
    expect(hoverOn(at("set v to the stock", "stock"))).toContain("property **stock** of Game")
    expect(hoverOn(at("set x to the label", "label"))).toContain("property **label** of Base")
  })

  test("go to definition reaches this type's property, an inherited one too", () => {
    expect(lines(service.definition(file, at("set v to the stock", "stock")))).toEqual([lineNumber(GAME_STOCK)])
    expect(lines(service.definition(file, at("set x to the label", "label")))).toEqual([lineNumber(LABEL)])
  })

  test("references:  this type's only, across its X, the X and the X of Y, and no local of that name", () => {
    const own = [
      GAME_STOCK,
      "set v to the stock",
      "set w to its stock",
      "set y to the stock of the game",
      "print its stock"
    ]
    expect(lines(service.references(file, at("set v to the stock", "stock")))).toEqual(
      own.map(lineNumber).sort(byNumber)
    )
    expect(lines(service.references(file, at(SHOP_STOCK, "stock")))).toEqual(
      [SHOP_STOCK, SHOP_READ].map(lineNumber).sort(byNumber)
    )
    expect(lines(service.references(file, at("print the stock", "stock")))).toEqual(
      ["set stock to 3", "print the stock"].map(lineNumber).sort(byNumber)
    )
  })

  test("rename changes this type's property only, a declaration's quotes kept", () => {
    const edits = editsOf(service.rename(file, at("set v to the stock", "stock"), "reserve"))
    expect(edits.map((it) => it.range.start.line + 1).sort(byNumber)).toEqual(
      [GAME_STOCK, "set v to the stock", "set w to its stock", "set y to the stock of the game", "print its stock"]
        .map(lineNumber)
        .sort(byNumber)
    )
    const quoted = editsOf(service.rename(file, at("set the score to 1", "score"), "points"))
    expect(appliedTo(lineNumber('- its "score"'), quoted)).toBe('\t- its "points" is a number')
    expect(service.prepareRename(file, at('- its "score"', "score"))?.placeholder).toBe("score")
  })

  test("rename leaves a local of that name to itself", () => {
    const edits = editsOf(service.rename(file, at("set stock to 3", "stock"), "count"))
    expect(edits.map((it) => it.range.start.line + 1).sort(byNumber)).toEqual(
      ["set stock to 3", "print the stock"].map(lineNumber).sort(byNumber)
    )
  })

  test("no rename of a property that lists its values:  a phrase may name it", () => {
    expect(service.rename(file, at('- its "color"', "color"), "shade")).toBeNull()
  })

  test("a spellml tag's name is renamed in its quotes, with the reads", async () => {
    const tiles = resolve(dir, "Tiles")
    mkdirSync(tiles)
    const source = `<spell-view "tile" template="view">
	<property "score">a number</>
	<action "bump it">
		set v to the score
		set w to its score
	</action>
</spell-view>
`
    writeFileSync(resolve(tiles, "Tile.spellml"), source)
    writeFileSync(resolve(tiles, SP.PROJECT_FILE), `{ imports: [{ path: "/Tile.spellml", active: true }] }\n`)
    const tileUri = pathToFileURL(resolve(tiles, "Tile.spellml")).href
    await workspace.update(tileUri, source)
    const tile = workspace.fileFor(tileUri)!
    const edits = editsOf(service.rename(tile, { line: 3, character: 16 }, "points"))
    const text = source.split("\n")
    for (const { range, newText } of [...edits].sort((one, other) => other.range.start.line - one.range.start.line)) {
      const row = text[range.start.line]!
      text[range.start.line] = row.slice(0, range.start.character) + newText + row.slice(range.end.character)
    }
    expect(text.slice(1, 5).join("\n")).toBe(
      '\t<property "points">a number</>\n\t<action "bump it">\n\t\tset v to the points\n\t\tset w to its points'
    )
  })

  test("no rename when a use's type is unknown:  it may be another type's", async () => {
    const text = SOURCE.replace("a shop is a thing:", "to peek (x):\n\tprint the stock of x\na shop is a thing:")
    await workspace.update(uri, text)
    const updated = workspace.fileFor(uri)!
    const lines = text.split("\n")
    const index = lines.findIndex((it) => it.includes("set v to the stock"))
    const position = { line: index, character: lines[index]!.indexOf("stock") + 1 }
    expect(service.rename(updated, position, "reserve")).toBeNull()
    await workspace.update(uri, SOURCE)
    file = workspace.fileFor(uri)!
  })

  test("completion after the:  this type's properties first, inherited ones too", async () => {
    const text = SOURCE.replace("\t\tset the score to 1\n", "\t\tset the score to 1\n\t\tprint the \n")
    await workspace.update(uri, text)
    const typed = text.split("\n")
    const line = typed.findIndex((it) => it.endsWith("print the "))
    const items = service
      .completion(workspace.fileFor(uri)!, { line, character: typed[line]!.length })
      .items.filter((it) => it.kind === CompletionItemKind.Property)
      .sort((one, other) => one.sortText!.localeCompare(other.sortText!))
      .map((it) => it.label)
    await workspace.update(uri, SOURCE)
    file = workspace.fileFor(uri)!
    for (const own of ["stock", "score", "label"]) expect(items.indexOf(own)).toBeLessThan(items.indexOf("size"))
  })

  test("colours:  a property as a property, a local as a variable", () => {
    const tokens = describeTokens()
    expect(tokens).toContain(`${lineNumber("set v to the stock")} stock property`)
    expect(tokens).toContain(`${lineNumber("print the stock")} stock variable`)
    expect(tokens).toContain(`${lineNumber("print its stock")} stock property`)
  })

  test("in Spanish too", async () => {
    const espanol = resolve(dir, "Juego")
    mkdirSync(espanol)
    const source = `un juego es una cosa:
	- tiene una reserva como un número
	- para jugarlo:
		poner v a la reserva
		poner w a su reserva
una tienda es una cosa:
	- tiene una reserva como un número
	- para contarla:
		imprimir la reserva
`
    writeFileSync(resolve(espanol, "Juego.es.spell"), source)
    writeFileSync(resolve(espanol, SP.PROJECT_FILE), `{ imports: [{ path: "/Juego.es.spell", active: true }] }\n`)
    const juegoUri = pathToFileURL(resolve(espanol, "Juego.es.spell")).href
    await workspace.update(juegoUri, source)
    const juego = workspace.fileFor(juegoUri)!
    const lines = source.split("\n")
    const row = lines.findIndex((it) => it.includes("poner v a la reserva"))
    const position = { line: row, character: lines[row]!.indexOf("reserva") + 1 }
    expect(service.references(juego, position).map((it) => it.range.start.line + 1)).toEqual([2, 4, 5])
    expect(editsOf(service.rename(juego, position, "almacen"))).toHaveLength(3)
    expect((service.hover(juego, position)!.contents as { value: string }).value).toContain("Juego")
  })

  function hoverOn(position: Position): string | undefined {
    return (service.hover(file, position)?.contents as { value: string } | undefined)?.value
  }

  function lineNumber(start: string): number {
    return SOURCE.split("\n").findIndex((it) => it.trim().startsWith(start)) + 1
  }

  function lines(locations: Location[]): number[] {
    return locations.map((it) => it.range.start.line + 1).sort(byNumber)
  }

  function byNumber(a: number, b: number): number {
    return a - b
  }

  /** 1-based `line` of the source, with `edits` on it made. */
  function appliedTo(line: number, edits: TextEdit[]): string {
    const text = SOURCE.split("\n")[line - 1]!
    const edit = edits.find((it) => it.range.start.line === line - 1)!
    return text.slice(0, edit.range.start.character) + edit.newText + text.slice(edit.range.end.character)
  }

  /** Every edit of a rename, in the one file these projects have. */
  function editsOf(edit: WorkspaceEdit | null): TextEdit[] {
    return Object.values(edit?.changes ?? {}).flat()
  }

  /** `file`'s semantic tokens, as `line word type`. */
  function describeTokens(): string[] {
    const { tokenTypes } = LSP.SpellLanguageService.TOKEN_LEGEND
    const { data } = service.semanticTokens(file) as SemanticTokens
    const text = SOURCE.split("\n")
    const tokens: string[] = []
    let line = 0
    let character = 0
    for (let index = 0; index < data.length; index += 5) {
      const [deltaLine, deltaChar, length, type] = data.slice(index, index + 4) as number[]
      line += deltaLine!
      character = deltaLine ? deltaChar! : character + deltaChar!
      tokens.push(`${line + 1} ${text[line]!.slice(character, character + length!)} ${tokenTypes[type!]}`)
    }
    return tokens
  }

  function at(line: string, word: string): Position {
    const lines = SOURCE.split("\n")
    const index = lines.findIndex((it) => it.trim().startsWith(line))
    return { line: index, character: lines[index]!.indexOf(word, lines[index]!.indexOf(line)) + 1 }
  }
})
