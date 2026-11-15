import { afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"
import type { CompletionItem } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { monaco } from "spell/app/app/ui/monaco/monaco"
import { LspToMonaco } from "spell/app/app/ui/monaco/LspToMonaco"
import { SpellMonaco } from "spell/app/app/ui/monaco/SpellMonaco"

/**
 * A tag or an attribute chosen from the suggestion list, on a real Monaco editor (epic `editor` I70):
 * written whole by its snippet, the caret where you type next, and the list shown again where it should be.
 * - The language service's own shapes (`LSP.CompletionShapes`), handed to Monaco as the app hands them
 *   (`LspToMonaco.completion()`, replacing the word being typed);  a plain model, no project.
 */
describe("choosing a tag or an attribute in a real Monaco editor (I70)", () => {
  let editor: monaco.editor.IStandaloneCodeEditor | undefined
  /** Every caret the list was asked for at, as `line:column`. */
  const asked: string[] = []
  /** What the list offers at a caret after `typed`, and before `after`. */
  let offer: (typed: string, after: string) => CompletionItem[] = () => []

  beforeAll(() => {
    SpellMonaco.register()
    monaco.languages.registerCompletionItemProvider(SpellMonaco.LANGUAGE, {
      provideCompletionItems(model, position) {
        asked.push(`${position.lineNumber}:${position.column}`)
        const line = model.getLineContent(position.lineNumber)
        const word = model.getWordUntilPosition(position)
        const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
        const items = offer(line.slice(0, position.column - 1), line.slice(position.column - 1))
        return { suggestions: items.map((item) => LspToMonaco.completion(item, range)) }
      }
    })
  })

  afterEach(() => {
    const model = editor?.getModel()
    editor?.dispose()
    model?.dispose()
    editor = undefined
    asked.length = 0
  })

  /** An editor of Spell holding `lines`, its caret at the end of the last. */
  function editorOf(lines: string[]) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 300px"
    document.body.append(host)
    const model = monaco.editor.createModel(lines.join("\n"), SpellMonaco.LANGUAGE)
    model.updateOptions({ insertSpaces: false, tabSize: 4 })
    // no words of the text in the list:  only what the test offers
    editor = monaco.editor.create(host, { model, autoIndent: "full", wordBasedSuggestions: "off" })
    editor.setPosition({ lineNumber: lines.length, column: lines.at(-1)!.length + 1 })
    editor.focus()
    return editor
  }

  /**
   * Show the list and, once it shows, choose its first suggestion, as Tab does (`acceptSelectedSuggestion`).
   * - Not before:  choosing with no list showing cancels the one coming.
   */
  async function chooseFirst(code: monaco.editor.IStandaloneCodeEditor) {
    code.trigger("test", "editor.action.triggerSuggest", {})
    await vi.waitUntil(() => document.querySelector(".suggest-widget.visible"), { timeout: 5_000 })
    code.trigger("keyboard", "acceptSelectedSuggestion", {})
  }

  /** The text, a `|` at the caret. */
  function withCaret(code: monaco.editor.IStandaloneCodeEditor) {
    const model = code.getModel()!
    const offset = model.getOffsetAt(code.getPosition()!)
    const text = model.getValue()
    return text.slice(0, offset) + "|" + text.slice(offset)
  }

  test('`<act` + Tab => `<action "|" />`, and the list is asked for again, in its quotes', async () => {
    offer = (typed, after) =>
      /<act$/.test(typed) ? [{ label: "action", ...LSP.CompletionShapes.spellTag("action", "action", after) }] : []
    const code = editorOf([`\t<act`])
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`\t<action "|" />`)
    // the program's actions, listed at once
    await vi.waitUntil(() => asked.includes("1:11"), { timeout: 5_000 })
  })

  test("`<con` + Tab => `<context-menu>`, the caret a line a level in, `</>` under it", async () => {
    offer = (typed, after) =>
      /<con$/.test(typed)
        ? [{ label: "context-menu", ...LSP.CompletionShapes.spellTag("context-menu", "context_menu", after) }]
        : []
    const code = editorOf([`\t\t<con`])
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`\t\t<context-menu>\n\t\t\t|\n\t\t</>`)
  })

  test("nothing doubled:  `<act` before `/>` writes the name alone", async () => {
    offer = (typed, after) =>
      /<act$/.test(typed) ? [{ label: "action", ...LSP.CompletionShapes.spellTag("action", "action", after) }] : []
    const code = editorOf([`<act "cheat"/>`])
    code.setPosition({ lineNumber: 1, column: 5 })
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`<action| "cheat"/>`)
  })

  test('`<segment col` + Tab => `color="|"`, and its words are asked for at once', async () => {
    const color = { name: "color", values: ["red", "blue"] }
    offer = (typed, after) =>
      /col$/.test(typed) ? [{ label: "color", ...LSP.CompletionShapes.attribute(color, after) }] : []
    const code = editorOf([`<segment col`])
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`<segment color="|"`)
    await vi.waitUntil(() => asked.includes("1:17"), { timeout: 5_000 })
  })
})
