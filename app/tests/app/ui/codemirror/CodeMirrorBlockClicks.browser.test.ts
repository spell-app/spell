import { afterEach, describe, expect, test } from "vite-plus/test"
import { foldService } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * A quadruple click selects a block, on a real CodeMirror editor in the browser (epic `codemirror` T15):
 * one click a caret, two a word, three a line, four the block the line is in, five the block around that.
 * - The blocks are what folds:  here a stand-in for the language service's folds (`CodeMirrorLanguage.folding()`),
 *   a head and the lines further in under it, a tag's closing line too.
 * - Each click is its own press and release, its `detail` the click count, as the browser sends them.
 */
describe("clicks that select a block", () => {
  const SOLITAIRE = [
    'a "solitaire" is an app',
    "\tto draw solitaire",
    "\t\t<content>",
    '\t\t\t<stock-pile "stock" />',
    "\t\t</content>",
    "\tto deal",
    "\t\tshuffle the deck",
    'its "score" is a number',
    ""
  ].join("\n")

  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor with every editor's setup, holding `text`, folding as Spell's blocks fold. */
  function editorOf(text: string): EditorView {
    const state = EditorState.create({ doc: text, extensions: [CodeMirrorSetup.extensions(), INDENT_FOLDS] })
    const host = document.body.appendChild(document.createElement("div"))
    view = new EditorView({ parent: host, state })
    return view
  }

  /** Where the mouse is just inside the character at `pos`. */
  function pointAt(view: EditorView, pos: number): { clientX: number; clientY: number } {
    const coords = view.coordsAtPos(pos, 1)!
    return { clientX: coords.left + 1, clientY: (coords.top + coords.bottom) / 2 }
  }

  /** `count` clicks of the main button at `pos`, each a press and release. */
  function clickAt(view: EditorView, pos: number, count: number): void {
    const point = pointAt(view, pos)
    const target = document.elementFromPoint(point.clientX, point.clientY)!
    for (let detail = 1; detail <= count; detail++) {
      const init = { bubbles: true, cancelable: true, button: 0, detail, ...point }
      target.dispatchEvent(new MouseEvent("mousedown", { ...init, buttons: 1 }))
      document.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }))
    }
  }

  /** The selected text. */
  function selected(view: EditorView): string {
    const { from, to } = view.state.selection.main
    return view.state.sliceDoc(from, to)
  }

  /** Where `text` starts, plus `offset`. */
  function at(text: string, offset = 1): number {
    return SOLITAIRE.indexOf(text) + offset
  }

  test("four clicks on a head line select its block:  the head and every line of its body", () => {
    const view = editorOf(SOLITAIRE)
    clickAt(view, at("to draw solitaire", 3), 4)
    expect(selected(view)).toBe(
      ["\tto draw solitaire", "\t\t<content>", '\t\t\t<stock-pile "stock" />', "\t\t</content>", ""].join("\n")
    )
  })

  test("four clicks on a tag's opening line select it through its closing line", () => {
    const view = editorOf(SOLITAIRE)
    clickAt(view, at("<content>"), 4)
    expect(selected(view)).toBe(["\t\t<content>", '\t\t\t<stock-pile "stock" />', "\t\t</content>", ""].join("\n"))
  })

  test("four clicks on a body line select the innermost block it's in", () => {
    const view = editorOf(SOLITAIRE)
    clickAt(view, at("shuffle"), 4)
    expect(selected(view)).toBe("\tto deal\n\t\tshuffle the deck\n")
  })

  test("five clicks select the block around it;  past the outermost, the outermost", () => {
    const view = editorOf(SOLITAIRE)
    const solitaire = SOLITAIRE.slice(0, SOLITAIRE.indexOf("its "))
    clickAt(view, at("shuffle"), 5)
    expect(selected(view)).toBe(solitaire)
    clickAt(view, at("shuffle"), 7)
    expect(selected(view)).toBe(solitaire)
  })

  test("four clicks on a line in no block select the line, as three do", () => {
    const view = editorOf(SOLITAIRE)
    clickAt(view, at("its "), 4)
    expect(selected(view)).toBe('its "score" is a number\n')
  })

  test("three clicks still select the line;  a press inside it after them still starts a new selection", () => {
    const view = editorOf(SOLITAIRE)
    clickAt(view, at("shuffle"), 3)
    expect(selected(view)).toBe("\t\tshuffle the deck\n")
    clickAt(view, at("deck"), 1)
    const { anchor, head } = view.state.selection.main
    expect({ anchor, head }).toEqual({ anchor: at("deck"), head: at("deck") })
  })
})

/**
 * Folds as the language service makes them:  a line, and the lines after it further in, a tag's closing line too.
 * - From its head line's end to its last line's end, as `CodeMirrorLanguage.folding()` answers.
 */
const INDENT_FOLDS = foldService.of((state, lineStart) => {
  const { doc } = state
  const head = doc.lineAt(lineStart)
  const indent = (text: string) => text.length - text.trimStart().length
  let last = head.number
  while (last < doc.lines) {
    const next = doc.line(last + 1)
    if (!next.text.trim() || indent(next.text) <= indent(head.text)) break
    last++
  }
  if (
    last < doc.lines &&
    doc
      .line(last + 1)
      .text.trimStart()
      .startsWith("</")
  )
    last++
  return last > head.number ? { from: head.to, to: doc.line(last).to } : null
})
