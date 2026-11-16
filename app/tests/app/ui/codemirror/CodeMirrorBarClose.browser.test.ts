import { afterEach, describe, expect, test } from "vite-plus/test"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { undo } from "@codemirror/commands"
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"

import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"
import { CodeMirrorTyping } from "spell/app/app/ui/codemirror/CodeMirrorTyping"

/**
 * `|>` typed in a tag writes `/>` (epic `codemirror` T16), on a real CodeMirror editor:
 * the bubbly look draws a `/>` as a bar and a point, `|⟩`, so a person copying what they see types `|>`.
 * - A Spell file's editor, with every typing help, and an HTML file's, with this one alone.
 */
describe("`|>` in a tag writes `/>`", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.destroy()
    view = undefined
  })

  /** An editor holding `line`, the caret at its end, with `extensions`. */
  function editorOf(line: string, extensions: Extension): EditorView {
    const state = EditorState.create({ doc: line, extensions: [extensions, CodeMirrorSetup.extensions()] })
    view = new EditorView({ parent: hostOf(), state })
    view.dispatch({ selection: { anchor: state.doc.length } })
    view.focus()
    return view
  }

  /** The text, a `‸` at the caret. */
  const withCaret = () => {
    const { state } = view!
    const caret = state.selection.main.head
    return state.sliceDoc(0, caret) + "‸" + state.sliceDoc(caret)
  }

  const SPELL = [closeBrackets(), keymap.of(closeBracketsKeymap), CodeMirrorTyping.extension(() => undefined, "en")]
  const HTML = CodeMirrorTyping.markupExtension()

  for (const [kind, extensions] of [
    ["a Spell file's drawing", SPELL],
    ["an HTML file", HTML]
  ] as const) {
    describe(kind, () => {
      test("`|` then `>` after a tag's attributes:  `/>`, the caret after it", () => {
        editorOf(`\t<card-image card={it} `, extensions)
        typeIn(view!, "|>")
        expect(withCaret()).toBe(`\t<card-image card={it} />‸`)
      })

      test("right after its name, and after a quoted value", () => {
        editorOf(`<divider`, extensions)
        typeIn(view!, "|>")
        expect(withCaret()).toBe(`<divider/>‸`)
        view!.destroy()
        editorOf(`<icon name="star"`, extensions)
        typeIn(view!, "|>")
        expect(withCaret()).toBe(`<icon name="star"/>‸`)
      })

      test("one undo leaves the `|>` typed", () => {
        const code = editorOf(`<divider `, extensions)
        typeIn(code, "|>")
        undo(code)
        expect(withCaret()).toBe(`<divider |>‸`)
      })

      test("left alone:  in a quoted value, in a tag's text, in a `{…}`", () => {
        for (const line of [`<text value="a `, `<text>a `, `<x a={b `]) {
          const code = editorOf(line, extensions)
          typeIn(code, "|>")
          expect(code.state.doc.toString()).toBe(`${line}|>`)
          code.destroy()
        }
      })
    })
  }

  test("left alone in Spell code", () => {
    editorOf(`\tits "x" is 1 `, SPELL)
    typeIn(view!, "|>")
    expect(view!.state.doc.toString()).toBe(`\tits "x" is 1 |>`)
  })
})

/** A place in the page for an editor. */
function hostOf(): HTMLElement {
  const host = document.createElement("div")
  host.style.cssText = "width: 600px; height: 200px"
  document.body.append(host)
  return host
}

/** Type `typed` into `view` a character at a time, as the keyboard does:  through its input handlers. */
function typeIn(view: EditorView, typed: string) {
  for (const character of typed) {
    const { from, to } = view.state.selection.main
    const insert = () =>
      view.state.update({
        changes: { from, to, insert: character },
        selection: { anchor: from + character.length },
        userEvent: "input.type"
      })
    const handlers = view.state.facet(EditorView.inputHandler)
    if (!handlers.some((handler) => handler(view, from, to, character, insert))) view.dispatch(insert())
  }
}
