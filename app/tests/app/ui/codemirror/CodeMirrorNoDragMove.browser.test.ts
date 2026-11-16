import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * Selected text doesn't drag, on a real CodeMirror editor in the browser (epic `codemirror` I9):
 * a press inside the selection, then a drag, selects from the press, as VS Code's `editor.dragAndDrop: false`.
 * - The mouse's events are dispatched where the characters are drawn.
 * - The press is let through to the browser only when it may drag text:
 *   so the press being handled (`defaultPrevented`) is what keeps the browser from dragging the words.
 */
describe("a press inside the selection", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor with every editor's setup, holding `text`. */
  function editorOf(text: string): EditorView {
    const state = EditorState.create({ doc: text, extensions: CodeMirrorSetup.extensions() })
    const host = document.body.appendChild(document.createElement("div"))
    view = new EditorView({ parent: host, state })
    return view
  }

  /** Where the mouse is just inside the character at `pos`. */
  function pointAt(view: EditorView, pos: number): { clientX: number; clientY: number } {
    const coords = view.coordsAtPos(pos, 1)!
    return { clientX: coords.left + 1, clientY: (coords.top + coords.bottom) / 2 }
  }

  /** The mouse's main button pressed at `pos`, moved to `to`, let go there;  the press, to see if it was handled. */
  function dragFrom(view: EditorView, pos: number, to: number): MouseEvent {
    const init = { bubbles: true, cancelable: true, button: 0, detail: 1 }
    const from = pointAt(view, pos)
    const down = new MouseEvent("mousedown", { ...init, ...from, buttons: 1 })
    document.elementFromPoint(from.clientX, from.clientY)!.dispatchEvent(down)
    const end = pointAt(view, to)
    document.dispatchEvent(new MouseEvent("mousemove", { ...init, ...end, buttons: 1 }))
    document.dispatchEvent(new MouseEvent("mouseup", { ...init, ...end, buttons: 0 }))
    return down
  }

  test("starts a new selection from the press, and the text stays put", () => {
    const text = 'group "Dealing & the Stock Pile"'
    const view = editorOf(text)
    // "Dealing"
    view.dispatch({ selection: { anchor: 7, head: 14 } })
    // pressed on its "a", dragged three characters on
    const press = dragFrom(view, 9, 12)
    expect(press.defaultPrevented).toBe(true)
    expect(view.state.doc.toString()).toBe(text)
    const { anchor, head } = view.state.selection.main
    expect({ anchor, head }).toEqual({ anchor: 9, head: 12 })
  })

  test("a click inside it leaves the caret there", () => {
    const view = editorOf('group "Dealing & the Stock Pile"')
    view.dispatch({ selection: { anchor: 7, head: 14 } })
    dragFrom(view, 10, 10)
    const { anchor, head } = view.state.selection.main
    expect({ anchor, head }).toEqual({ anchor: 10, head: 10 })
  })
})
