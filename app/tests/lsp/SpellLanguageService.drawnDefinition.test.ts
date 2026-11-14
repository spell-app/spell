import { beforeAll, describe, expect, test, vi } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { Location, Position } from "vscode-languageserver"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * Go to Definition in a drawing (epic `editor` I148), in a temp copy of Solitaire:
 * a view's tag goes to its type, an attribute that's one of its properties to that property;
 * Spell UI's tags and attributes go nowhere, and say what they are instead.
 * - Lines are found by what they say, never by number:  the examples are Owen's, and change.
 */
describe("SpellLanguageService.definition() in a drawing (epic `editor` I148)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-drawn-definition-"))
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)
  let text = ""
  let file: SP.SpellFile

  beforeAll(async () => {
    cpSync(fixtureFolder("@spell/examples/Solitaire"), resolve(dir, "Solitaire"), { recursive: true })
    const path = resolve(dir, "Solitaire", "Solitaire.spell")
    const uri = pathToFileURL(path).href
    text = readFileSync(path, "utf8")
    await workspace.update(uri, text)
    file = workspace.fileFor(uri)!
    await vi.waitUntil(() => SP.ComponentPacks.help("en"), { timeout: 10_000 })
  })

  /** The text of the line `location` starts on, in its file. */
  function lineOf(location: Location | undefined): string {
    expect(location).toBeDefined()
    const source = location!.uri === workspace.uriFor(file) ? text : readFileSync(new URL(location!.uri), "utf8")
    return source.split("\n")[location!.range.start.line]!
  }

  test('a view\'s tag:  `<stock-pile>` goes to `a "stock pile" is a pile`, in the same file', () => {
    const [found, ...more] = service.definition(file, positionOf(text, '<stock-pile "stock"', "stock-pile"))
    expect(more).toEqual([])
    expect(lineOf(found)).toMatch(/^a "stock pile" is a pile/)
  })

  test('...and in another file:  a `<card />` drawn here goes to `a "card" is ...`, in Card.spell', async () => {
    const uri = workspace.uriFor(file)
    const drawn = text.replace('<stock-pile "stock"/>', '<stock-pile "stock"/>\n\t\t\t<card />')
    await workspace.update(uri, drawn)
    try {
      const [found] = service.definition(workspace.fileFor(uri)!, positionOf(drawn, "<card />", "card"))
      expect(found?.uri).toMatch(/Card\.spell$/)
      expect(lineOf(found)).toMatch(/^a "card" is a/)
    } finally {
      await workspace.update(uri, text)
      file = workspace.fileFor(uri)!
    }
  })

  test("an attribute that's its view's property:  `suit` goes to the foundation's suit", () => {
    const [found, ...more] = service.definition(file, positionOf(text, '<foundation "clubs" suit=clubs', "suit"))
    expect(more).toEqual([])
    expect(lineOf(found)).toMatch(/^\tits "suit" is a card suit/)
  })

  test("Spell UI's tag or attribute:  no definition, but its help (`componentHover()`)", () => {
    const spacing = positionOf(text, 'spacing="xs"', "spacing")
    expect(service.definition(file, spacing)).toEqual([])
    expect(service.componentHover(file, spacing)?.contents).toMatchObject({ value: expect.stringMatching(/spacing/) })
    const container = positionOf(text, "<container columns", "container")
    expect(service.definition(file, container)).toEqual([])
    expect(service.componentHover(file, container)).not.toBeNull()
  })

  test("a view's tag has no Spell UI help:  it's the program's own", () => {
    expect(service.componentHover(file, positionOf(text, '<stock-pile "stock"', "stock-pile"))).toBeNull()
  })
})

/** The position of `word` on the first line saying `line`, inside the word. */
function positionOf(text: string, line: string, word: string): Position {
  const lines = text.split("\n")
  const at = lines.findIndex((it) => it.includes(line))
  if (at < 0) throw new TypeError(`positionOf():  no line says \`${line}\``)
  return { line: at, character: lines[at]!.indexOf(word, lines[at]!.indexOf(line)) + 1 }
}
