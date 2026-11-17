import { describe, test, expect, beforeAll } from "vite-plus/test"
import { readFileSync } from "fs"
import { resolve } from "path"
import { pathToFileURL } from "url"
import { EditorState, Text } from "@codemirror/state"
import { DiagnosticSeverity, InsertTextFormat } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { LspToCodeMirror } from "spell/app/app/ui/codemirror/LspToCodeMirror"
import environment from "spell/app/spaces/server/node/environment"

/**
 * LSP => CodeMirror conversions, alone and on real `SpellLanguageService` answers:  the conversions' tests, for
 * CodeMirror's shapes.
 * - Runs in node:  `LspToCodeMirror` reads CodeMirror's texts, never a view.
 */
describe("LspToCodeMirror", () => {
  const DOC = Text.of(["to deal", "\tdeal the deck", ""])
  const range = { start: { line: 0, character: 3 }, end: { line: 1, character: 5 } }

  test("positions and ranges:  0-based lines + characters => offsets into the text, and back", () => {
    expect(LspToCodeMirror.offset(DOC, { line: 0, character: 0 })).toBe(0)
    expect(LspToCodeMirror.offset(DOC, { line: 1, character: 1 })).toBe(9)
    expect(LspToCodeMirror.range(DOC, range)).toEqual({ from: 3, to: 13 })
    expect(LspToCodeMirror.lspRange(DOC, LspToCodeMirror.range(DOC, range))).toEqual(range)
    expect(LspToCodeMirror.lspPosition(DOC, 9)).toEqual({ line: 1, character: 1 })
  })

  test("a position past a line's end, or past the last line, lands at that end:  NEVER outside the text", () => {
    expect(LspToCodeMirror.offset(DOC, { line: 0, character: 99 })).toBe(7)
    expect(LspToCodeMirror.offset(DOC, { line: 9, character: 0 })).toBe(DOC.length)
    expect(LspToCodeMirror.offset(DOC, { line: -1, character: 2 })).toBe(2)
  })

  test("diagnostics:  severity by name, its message and range", () => {
    const severity = (level: DiagnosticSeverity) =>
      LspToCodeMirror.diagnostic(DOC, { range, message: "x", severity: level }).severity
    expect([
      severity(DiagnosticSeverity.Error),
      severity(DiagnosticSeverity.Warning),
      severity(DiagnosticSeverity.Information),
      severity(DiagnosticSeverity.Hint)
    ]).toEqual(["error", "warning", "info", "hint"])
    expect(
      LspToCodeMirror.diagnostic(DOC, { range, message: { kind: "markdown", value: "Don't understand" } })
    ).toEqual({ from: 3, to: 13, severity: "error", message: "Don't understand" })
  })

  test("edits:  each a change against the SAME text, as CodeMirror takes a list of them", () => {
    const edits = [
      { range: { start: { line: 0, character: 3 }, end: { line: 0, character: 7 } }, newText: "shuffle" },
      { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 5 } }, newText: "shuffle" }
    ]
    const state = EditorState.create({ doc: DOC })
    const changed = state.update({ changes: LspToCodeMirror.changes(DOC, edits) }).state
    expect(changed.doc.toString()).toBe("to shuffle\n\tshuffle the deck\n")
  })

  test("a workspace edit's edits for one file:  by its address;  none elsewhere", () => {
    const edit = { range, newText: "x" }
    const workspaceEdit = { changes: { [LSP.AppAddresses.uriOf("@spell/examples/Solitaire/Deck.spell")]: [edit] } }
    expect(LspToCodeMirror.editsFor(workspaceEdit, "@spell/examples/Solitaire/Deck.spell")).toEqual([edit])
    expect(LspToCodeMirror.editsFor(workspaceEdit, "@spell/examples/Solitaire/Card.spell")).toEqual([])
    expect(LspToCodeMirror.editsFor(undefined, "@spell/examples/Solitaire/Card.spell")).toEqual([])
  })

  test("locations:  a project file's path and the service's range;  `undefined` outside the project's files", () => {
    const uri = LSP.AppAddresses.uriOf("@spell/examples/Solitaire/Card.spell")
    expect(LspToCodeMirror.location({ uri, range })).toEqual({ path: "@spell/examples/Solitaire/Card.spell", range })
    expect(LspToCodeMirror.location({ uri: "file:///tmp/x.spell", range })).toBeUndefined()
  })

  test("completion:  its label and words;  a snippet stays a snippet, in CodeMirror's spelling", () => {
    const completion = LspToCodeMirror.completion(DOC, {
      label: "move",
      detail: "an action",
      documentation: { kind: "markdown", value: "Move a card" },
      insertText: "move ${1:card} to $2$0",
      insertTextFormat: InsertTextFormat.Snippet
    })
    expect(completion).toMatchObject({ label: "move", detail: "an action", info: "Move a card" })
    expect(typeof completion.apply).toBe("function")
    // its description, when it has one, is what its row says;  its detail then heads its info
    const described = LspToCodeMirror.completion(DOC, {
      label: "turn",
      detail: "property of TicTacToe",
      labelDetails: { description: "Whose turn it is" },
      documentation: { kind: "markdown", value: "X or O" }
    })
    expect(described).toMatchObject({ detail: "Whose turn it is", info: "property of TicTacToe\n\nX or O" })
    expect(LspToCodeMirror.snippet("move ${1:card} to $2$0")).toBe("move ${1:card} to ${2}${99}")
    expect(LspToCodeMirror.snippet('<action "$1" />')).toBe('<action "${1}" />')
  })

  test("markdown:  a code block keeps its language", () => {
    expect(LspToCodeMirror.markdown({ language: "spell", value: "a card" })).toBe("```spell\na card\n```")
    expect(LspToCodeMirror.markdown(["one", { kind: "markdown", value: "two" }] as never)).toBe("one\n\ntwo")
  })

  describe("on real answers, for the Solitaire example's deck", () => {
    const deckPath = resolve(environment.systemFilesRoot, "examples", "Solitaire", "Deck.spell")
    const deckUri = pathToFileURL(deckPath).href
    const deckText = readFileSync(deckPath, "utf8")
    const deck = Text.of(deckText.split("\n"))
    const workspace = new SpellDiskWorkspace()
    const service = new LSP.SpellLanguageService(workspace)
    /** Offset of `needle` in Deck.spell, plus `delta` characters. */
    const at = (needle: string, delta = 0) => deckText.indexOf(needle) + delta

    beforeAll(async () => {
      await workspace.update(deckUri, deckText)
    })

    test("hover => its range and markdown words", () => {
      const pos = at("a new card with rank", 6)
      const answer = service.hover(workspace.fileFor(deckUri)!, LspToCodeMirror.lspPosition(deck, pos))!
      const hover = LspToCodeMirror.hover(deck, answer, pos)
      expect(hover.text).toContain("Card")
      expect(hover.from).toBeLessThanOrEqual(pos)
      expect(hover.to).toBeGreaterThanOrEqual(pos)
    })

    test("rename => the deck's edits, made in one go, write the new name at every use", () => {
      const file = workspace.fileFor(deckUri)!
      const edit = service.rename(file, LspToCodeMirror.lspPosition(deck, at("of the card to", 7)), "level")!
      const edits = edit.changes?.[deckUri] ?? []
      expect(edits.length).toBeGreaterThan(1)
      const renamed = EditorState.create({ doc: deck })
        .update({ changes: LspToCodeMirror.changes(deck, edits) })
        .state.doc.toString()
      expect(renamed.split("level").length - 1).toBe(deckText.split("level").length - 1 + edits.length)
    })
  })
})
