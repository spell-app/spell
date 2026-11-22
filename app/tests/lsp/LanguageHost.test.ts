import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"
import { readFileSync } from "fs"

import { LSP } from "spell/app/lsp"
import { installDiskFetch } from "spell/app/spaces/server/node/projects/disk-fetch"
import { fixtureFolder, fixtureProjectId } from "spell/app/spaces/test"

/**
 * `LanguageHost`, what the app's language worker runs (epic `solid-2-final` P18):
 * a file opened with its text, its edits sent as changes, the ONE table's requests answered about the text as edited.
 * - In node, the host's project is the process's own (`SP.SpellProject.registry`):  each test puts its text back.
 */
describe("LanguageHost", () => {
  const solitaire = fixtureProjectId("@spell/examples/Solitaire")
  const path = `${solitaire}/Card.spell`
  const uri = LSP.AppAddresses.uriOf(path)
  const textDocument = { uri }
  const host = new LSP.LanguageHost()
  let text = ""

  beforeAll(async () => {
    installDiskFetch()
    // its text as the editor has it:  on disk
    text = readFileSync(fixtureFolder("@spell/examples/Solitaire", "Card.spell"), "utf8")
    host.open({ uri, projectId: solitaire, text })
  })

  afterAll(async () => {
    host.open({ uri, projectId: solitaire, text })
    await host.request("textDocument/documentSymbol", { textDocument })
  })

  test("answers the table's requests as the service does, about the file it opened", async () => {
    const symbols = await host.request("textDocument/documentSymbol", { textDocument })
    expect(symbols.length).toBeGreaterThan(0)
    const file = host.service.addresses.fileFor(uri)!
    expect(symbols).toEqual(host.service.documentSymbols(file))
    const line = text.split("\n").findIndex((it) => it.includes('its "suit" is one of'))
    const position = { line, character: text.split("\n")[line]!.indexOf("suit") + 1 }
    expect(await host.request("textDocument/hover", { textDocument, position })).toEqual(
      host.service.hover(file, position)
    )
  })

  test("an edit sent as changes is in the next answer:  the text it makes, parsed", async () => {
    const [first] = await host.request("textDocument/documentSymbol", { textDocument })
    host.change({ uri, changes: [[0, 0, "-- a line on top\n"]] })
    const [moved] = await host.request("textDocument/documentSymbol", { textDocument })
    expect(moved!.range.start.line).toBe(first!.range.start.line + 1)
    expect(host.service.addresses.fileFor(uri)!.contents).toBe(`-- a line on top\n${text}`)
    // several changes at once, each in the text before them
    host.change({
      uri,
      changes: [
        [0, 3, ""],
        [5, 9, "LINE"]
      ]
    })
    await host.request("textDocument/documentSymbol", { textDocument })
    expect(host.service.addresses.fileFor(uri)!.contents).toBe(`a LINE on top\n${text}`)
    host.change({ uri, changes: [[0, 14, ""]] })
    const [back] = await host.request("textDocument/documentSymbol", { textDocument })
    expect(back!.range).toEqual(first!.range)
  })

  test("a file it doesn't know answers the table's fallback", async () => {
    const elsewhere = { uri: LSP.AppAddresses.uriOf(`${solitaire}/Nowhere.spell`) }
    expect(await host.request("textDocument/documentSymbol", { textDocument: elsewhere })).toEqual([])
    expect(
      await host.request("textDocument/hover", { textDocument: elsewhere, position: { line: 0, character: 0 } })
    ).toBe(null)
  })
})
