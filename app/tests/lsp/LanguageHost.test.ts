import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"
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

  test("sends with them what the editor draws the file with:  its folds, its types, its look in the look asked for", async () => {
    const sent: LSP.LanguageParsed[] = []
    const lookOf = (_file: unknown, at: string, look: LSP.CodeLook): LSP.LanguageLook =>
      look === "bubbly" ? { drawing: { nodes: [], declaringTags: [at.length] } } : { colours: [] }
    const watched = new LSP.LanguageHost({ onParsed: (parsed) => sent.push(parsed), lookOf })
    watched.open({ uri, projectId: solitaire, text })
    await watched.request("textDocument/documentSymbol", { textDocument })
    const parsed = sent.at(-1)!
    const file = watched.service.addresses.fileFor(uri)!
    const firstFold = watched.service.foldingRanges(file)[0]!
    expect(parsed.folds).toContainEqual([firstFold.startLine, firstFold.endLine])
    expect(parsed.types).toContain("Card")
    expect(parsed.views).toContain("Card")
    // its look, of the editor's text
    expect(parsed.drawing).toEqual({ nodes: [], declaringTags: [text.length] })
    expect(parsed.colours).toBeUndefined()
    // the look switched:  sent again in it, the parse unchanged
    watched.look({ look: "tokens" })
    await watched.request("textDocument/documentSymbol", { textDocument })
    await vi.waitFor(() => expect(sent.at(-1)!.colours).toEqual([]))
    expect(sent.at(-1)!.drawing).toBeUndefined()
  })

  test("a compile sends what its parse found:  a page opened and compiled is drawn before it's typed in", async () => {
    const sent: LSP.LanguageParsed[] = []
    const watched = new LSP.LanguageHost({ onParsed: (parsed) => sent.push(parsed) })
    const wait = LSP.LanguageHost.PARSE_WAIT
    // the compile comes before the host's own parse, as it does when a big project opens
    LSP.LanguageHost.PARSE_WAIT = 60_000
    try {
      watched.open({ uri, projectId: solitaire, text })
      await watched.compile({ projectId: solitaire })
      await vi.waitFor(() => expect(sent.at(-1)).toMatchObject({ uri, version: 0 }))
      // compiled again with nothing edited:  the editor isn't sent the same drawing again
      await watched.compile({ projectId: solitaire })
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(sent).toHaveLength(1)
    } finally {
      LSP.LanguageHost.PARSE_WAIT = wait
    }
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

  test("says where the thing a word names was declared, as plain data:  Follow Along's question", async () => {
    const lines = text.split("\n")
    const line = lines.findIndex((it) => it.includes('its "suit" is one of'))
    const position = { line, character: lines[line]!.indexOf("suit") + 1 }
    expect(await host.request("spell/declaredThing", { textDocument, position })).toEqual({ path, line })
    expect(await host.request("spell/declaredThing", { textDocument, position: { line, character: 0 } })).toBe(null)
  })

  test("a file it doesn't know answers the table's fallback", async () => {
    const elsewhere = { uri: LSP.AppAddresses.uriOf(`${solitaire}/Nowhere.spell`) }
    expect(await host.request("textDocument/documentSymbol", { textDocument: elsewhere })).toEqual([])
    expect(
      await host.request("textDocument/hover", { textDocument: elsewhere, position: { line: 0, character: 0 } })
    ).toBe(null)
  })
})
