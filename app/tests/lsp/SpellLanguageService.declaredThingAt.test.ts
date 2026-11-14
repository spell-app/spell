import { describe, expect, test } from "vite-plus/test"
import { cpSync, mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { Position } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * The thing a word in the code names, where it was declared:  what the editor inspects when the code's cursor rests on
 * it (epic `editor` T64), in a temp copy of Solitaire and Solitario.
 * - Lines are found by what they say, never by number:  the examples are Owen's, and change.
 */
describe("SpellLanguageService.declaredThingAt() (epic `editor` T64)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-declared-thing-"))
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)

  /** Copy `project` in, and read its file `name`. */
  async function opened(project: string, name: string) {
    cpSync(fixtureFolder(`@spell/examples/${project}`), resolve(dir, project), { recursive: true })
    const path = resolve(dir, project, name)
    const uri = pathToFileURL(path).href
    const text = readFileSync(path, "utf8")
    await workspace.update(uri, text)
    return { text, file: workspace.fileFor(uri)! }
  }

  test('`the stock`:  the line that draws it, `<stock-pile "stock"/>`', async () => {
    const { text, file } = await opened("Solitaire", "Solitaire.spell")
    const declared = service.declaredThingAt(file, positionOf(text, "if the card is not in the stock", "stock"))
    expect(declared?.file).toBe(file)
    expect(text.split("\n")[declared!.line]).toContain('<stock-pile "stock"/>')
  })

  test("Spanish too:  `la reserva`, the line that draws it", async () => {
    const { text, file } = await opened("Solitario", "Solitario.es.spell")
    const declared = service.declaredThingAt(file, positionOf(text, "agregar la carta a la reserva", "reserva"))
    expect(text.split("\n")[declared!.line]).toContain('<pila-de-reserva "reserva"/>')
  })

  test("a word that names no thing:  a keyword, or an action's name, says nothing", async () => {
    const { text, file } = await opened("Solitaire", "Solitaire.spell")
    expect(service.declaredThingAt(file, positionOf(text, "if the card is not in the stock", "if"))).toBeUndefined()
    expect(service.declaredThingAt(file, positionOf(text, 'to "cheat"', "cheat"))).toBeUndefined()
  })
})

/** The position of `word` on the first line saying `line`, inside the word. */
function positionOf(text: string, line: string, word: string): Position {
  const lines = text.split("\n")
  const at = lines.findIndex((it) => it.includes(line))
  if (at < 0) throw new TypeError(`positionOf():  no line says \`${line}\``)
  return { line: at, character: lines[at]!.indexOf(word, lines[at]!.indexOf(line)) + 1 }
}
