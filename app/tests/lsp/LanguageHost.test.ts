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

  test("compiles the project as it has it, handing back what the compile wrote, for the editor to take", async () => {
    host.change({ uri, changes: [[0, 0, "-- compiled with this line\n"]] })
    const entry = await host.compile({ projectId: solitaire })
    expect(entry.compiled).toContain("class Card")
    expect(entry.targets["js/solid"]!.map).toContain("Card.spell")
    const project = host.service.addresses.fileFor(uri)!.project
    await project.takeCompiled(entry, { save: false })
    expect(project.compiledFrom).toBe("elsewhere")
    expect(project.compiled).toBe(entry.compiled)
    host.change({ uri, changes: [[0, 27, ""]] })
    expect((await host.compile({ projectId: solitaire })).compiled).not.toBe(entry.compiled)
  })

  test("sends an open file's problems after each parse that changes them, numbered by the edits they're of", async () => {
    const sent: LSP.LanguageParsed[] = []
    const watched = new LSP.LanguageHost({ onParsed: (parsed) => sent.push(parsed) })
    watched.open({ uri, projectId: solitaire, text })
    await watched.request("textDocument/documentSymbol", { textDocument })
    expect(sent.at(-1)).toMatchObject({ uri, version: 0, diagnostics: [] })
    watched.change({ uri, changes: [[text.length, text.length, "\n\tits zzz is ++\n"]] })
    await watched.request("textDocument/documentSymbol", { textDocument })
    expect(sent.at(-1)!.version).toBe(1)
    expect(sent.at(-1)!.diagnostics.length).toBeGreaterThan(0)
    watched.open({ uri, projectId: solitaire, text })
    await watched.request("textDocument/documentSymbol", { textDocument })
    expect(sent.at(-1)).toMatchObject({ version: 0, diagnostics: [] })
  })

  test("a project it can't load is said, and holds nothing else up", async () => {
    const unavailable: string[] = []
    const lonely = new LSP.LanguageHost({ onUnavailable: (projectId) => unavailable.push(projectId) })
    const missing = "@spell/examples/NoSuchProject"
    lonely.open({ uri: LSP.AppAddresses.uriOf(`${missing}/Nothing.spell`), projectId: missing, text: "" })
    lonely.open({ uri, projectId: solitaire, text })
    expect((await lonely.request("textDocument/documentSymbol", { textDocument })).length).toBeGreaterThan(0)
    expect(unavailable).toEqual([missing])
  })

  test("a file it doesn't know answers the table's fallback", async () => {
    const elsewhere = { uri: LSP.AppAddresses.uriOf(`${solitaire}/Nowhere.spell`) }
    expect(await host.request("textDocument/documentSymbol", { textDocument: elsewhere })).toEqual([])
    expect(
      await host.request("textDocument/hover", { textDocument: elsewhere, position: { line: 0, character: 0 } })
    ).toBe(null)
  })
})
