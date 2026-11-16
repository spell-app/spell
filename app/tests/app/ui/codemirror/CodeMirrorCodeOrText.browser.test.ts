import { afterEach, describe, expect, test } from "vite-plus/test"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { undo } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"

import { CodeMirrorCodeOrText } from "spell/app/app/ui/codemirror/CodeMirrorCodeOrText"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * `CodeMirrorCodeOrText` on a real CodeMirror editor, in the browser (epic `codemirror` P4), the twin of Monaco's
 * `CodeOrTextTyping.browser.test.ts`, each case the same text before and after:
 * a `{` typed in a quoted value makes it code, a `"` typed right after a code value's `{` makes it text;
 * one undo leaves what was typed.
 */
describe("switching a value between text and code as it's typed", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.destroy()
    view = undefined
  })

  /** An editor of Spell holding `line`, the caret at its `|`, its pairs closed as a Spell file's are. */
  function editorOf(line: string) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 200px"
    document.body.append(host)
    const doc = `to draw it\n${line.replace("|", "")}`
    const state = EditorState.create({
      doc,
      selection: { anchor: "to draw it\n".length + line.indexOf("|") },
      extensions: [
        closeBrackets(),
        keymap.of(closeBracketsKeymap),
        CodeMirrorCodeOrText.extension(),
        CodeMirrorSetup.extensions()
      ]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    return view
  }

  /** Type `typed` as the keyboard does:  through the editor's input handlers. */
  function type(typed: string) {
    const code = view!
    const { from, to } = code.state.selection.main
    const insert = () =>
      code.state.update({
        changes: { from, to, insert: typed },
        selection: { anchor: from + 1 },
        userEvent: "input.type"
      })
    const handlers = code.state.facet(EditorView.inputHandler)
    if (!handlers.some((handler) => handler(code, from, to, typed, insert))) code.dispatch(insert())
  }

  /** The drawing's line. */
  const line = () => view!.state.doc.line(2).text

  /** The drawing's line, the caret at its `|`. */
  function lineWithCaret(): string {
    const { state } = view!
    const { from } = state.doc.line(2)
    const column = state.selection.main.head - from
    return `${line().slice(0, column)}|${line().slice(column)}`
  }

  test("`{` in a quoted value:  its quotes become braces, the caret in the same words", () => {
    editorOf('\t<text color="bl|ue">Hi</text>')
    type("{")
    expect(lineWithCaret()).toBe("\t<text color={bl|ue}>Hi</text>")
  })

  test("`\"` right after a code value's `{`:  its braces become quotes", () => {
    editorOf("\t<text color={|its color}>Hi</text>")
    type('"')
    expect(lineWithCaret()).toBe('\t<text color="|its color">Hi</text>')
  })

  test("one undo leaves the character typed;  another, the line as it was", () => {
    const code = editorOf('\t<text color="bl|ue">Hi</text>')
    type("{")
    undo(code)
    expect(line()).toMatch(/^\t<text color="bl\{\}?ue">Hi<\/text>$/)
    undo(code)
    expect(line()).toBe('\t<text color="blue">Hi</text>')
  })

  test('a `"` further into code starts a string, as typed', () => {
    editorOf("\t<button onClick={say |} />")
    type('"')
    expect(lineWithCaret()).toMatch(/^\t<button onClick=\{say "\|"?\} \/>$/)
  })

  test("a Spell line's quotes are its own:  a `{` there is typed as itself", () => {
    editorOf('\tits "si|ze" is "small"')
    type("{")
    expect(line()).toMatch(/^\tits "si\{\}?ze" is "small"$/)
  })
})
