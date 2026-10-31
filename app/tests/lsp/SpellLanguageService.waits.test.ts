import { describe, expect, test } from "vite-plus/test"
import { mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"

/** With no word in the source saying it, hovering a call says it waits (epic `language` P13). */
describe("hovering a call says it waits", () => {
  async function hoverOn(name: string, source: string, row: string, word: string) {
    const folder = mkdtempSync(resolve(tmpdir(), "spell-waits-"))
    writeFileSync(resolve(folder, SP.PROJECT_FILE), `{ imports: [{ path: "/${name}", active: true }] }\n`)
    writeFileSync(resolve(folder, name), source)
    const workspace = new SpellDiskWorkspace()
    const service = new LSP.SpellLanguageService(workspace)
    const uri = pathToFileURL(resolve(folder, name)).href
    await workspace.update(uri, source)
    const lines = source.split("\n")
    const line = lines.findIndex((it) => it.includes(row))
    const position = { line, character: lines[line]!.indexOf(word) + 1 }
    return (service.hover(workspace.fileFor(uri)!, position)!.contents as { value: string }).value
  }

  const SOURCE = `a card is a thing:
	- to slow it:
		pause for 1 sec
	- to bump it:
		slow it
	- to rest it:
		print 1
	- to go it:
		bump it
		rest it
`

  test("through what it calls", async () => {
    expect(await hoverOn("Game.spell", SOURCE, "\t\tbump it", "bump")).toContain("whatever calls it waits")
  })

  test("not what doesn't", async () => {
    expect(await hoverOn("Game.spell", SOURCE, "\t\trest it", "rest")).not.toContain("whatever calls it waits")
  })

  test("in the program's language", async () => {
    const spanish = `una carta es una cosa donde:
	- para frenar:
		pausar 1 segundo
	- para ir:
		frenar
`
    expect(await hoverOn("Juego.es.spell", spanish, "\t\tfrenar", "frenar")).toContain("espera a que termine")
  })
})
