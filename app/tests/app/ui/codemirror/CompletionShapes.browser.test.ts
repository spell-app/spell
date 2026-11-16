import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import {
  acceptCompletion,
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  completionStatus,
  startCompletion
} from "@codemirror/autocomplete"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import type { CompletionItem } from "vscode-languageserver"

import { LSP } from "spell/app/lsp"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"
import { LspToCodeMirror } from "spell/app/app/ui/codemirror/LspToCodeMirror"

/**
 * A tag or an attribute chosen from the suggestion list, on a real CodeMirror editor (epic `editor` I70;
 * epic `codemirror` P5):  the twin of Monaco's `CompletionShapes.browser.test.ts`.
 * - Written whole by its snippet, the caret where you type next, and the list asked for again where it should be.
 * - The language service's own shapes (`LSP.CompletionShapes`), handed to CodeMirror as the editor hands them
 *   (`LspToCodeMirror.completion()`);  a plain state, no project.
 */
describe("choosing a tag or an attribute in a real CodeMirror editor (I70)", () => {
  let view: EditorView | undefined
  /** Every caret the list was asked for at, as an offset. */
  const asked: number[] = []
  /** What the list offers at a caret after `typed`, and before `after`. */
  let offer: (typed: string, after: string) => CompletionItem[] = () => []

  afterEach(() => {
    view?.destroy()
    view = undefined
    asked.length = 0
  })

  /** The list's answer at the caret, as `CodeMirrorLanguage.completions` answers it. */
  function completions(context: CompletionContext): CompletionResult | null {
    asked.push(context.pos)
    const { doc } = context.state
    const line = doc.lineAt(context.pos)
    const word = context.matchBefore(/[\p{L}\p{M}\d_-]*/u)
    const items = offer(doc.sliceString(line.from, context.pos), doc.sliceString(context.pos, line.to))
    if (!items.length) return null
    return { from: word?.from ?? context.pos, options: items.map((item) => LspToCodeMirror.completion(doc, item)) }
  }

  /** An editor of Spell holding `lines`, its caret at `caret`, else the end. */
  function editorOf(lines: string[], caret?: number) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 300px"
    document.body.append(host)
    const doc = lines.join("\n")
    const state = EditorState.create({
      doc,
      selection: { anchor: caret ?? doc.length },
      extensions: [autocompletion({ override: [completions], activateOnTyping: false }), CodeMirrorSetup.extensions()]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    return view
  }

  /**
   * Show the list and, once it shows, choose its first suggestion, as Enter does.
   * - Again till it takes:  CodeMirror takes no choice in the list's first moments (`interactionDelay`).
   */
  async function chooseFirst(code: EditorView) {
    startCompletion(code)
    await vi.waitUntil(() => completionStatus(code.state) === "active", { timeout: 5_000 })
    await vi.waitUntil(() => acceptCompletion(code), { timeout: 5_000 })
  }

  /** The text, a `|` at the caret. */
  function withCaret(code: EditorView) {
    const text = code.state.doc.toString()
    const at = code.state.selection.main.head
    return text.slice(0, at) + "|" + text.slice(at)
  }

  test('`<act` + Enter => `<action "|" />`, and the list is asked for again, in its quotes', async () => {
    offer = (typed, after) =>
      /<act$/.test(typed) ? [{ label: "action", ...LSP.CompletionShapes.spellTag("action", "action", after) }] : []
    const code = editorOf([`\t<act`])
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`\t<action "|" />`)
    // the program's actions, listed at once
    await vi.waitUntil(() => asked.includes(10), { timeout: 5_000 })
  })

  test("`<con` + Enter => `<context-menu>`, the caret a line a level in, `</>` under it", async () => {
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
    const code = editorOf([`<act "cheat"/>`], 4)
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`<action| "cheat"/>`)
  })

  test('`<segment col` + Enter => `color="|"`, and its words are asked for at once', async () => {
    const color = { name: "color", values: ["red", "blue"] }
    offer = (typed, after) =>
      /col$/.test(typed) ? [{ label: "color", ...LSP.CompletionShapes.attribute(color, after) }] : []
    const code = editorOf([`<segment col`])
    await chooseFirst(code)
    expect(withCaret(code)).toBe(`<segment color="|"`)
    await vi.waitUntil(() => asked.includes(16), { timeout: 5_000 })
  })
})
