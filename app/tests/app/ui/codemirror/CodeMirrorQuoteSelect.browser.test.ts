import { afterEach, describe, expect, test } from "vite-plus/test"
import { selectCharRight } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * Selecting across a quoted value's curly marks in the bubbly look, on a real CodeMirror editor (epic `codemirror` I10):
 * a drag, or ⇧→, goes straight across them, as over plain text.
 * - Each curly mark is a box CodeMirror finds the place under the pointer from.
 *   With no height, it took the box for one above or below the pointer, and skipped past it:
 *   a press anywhere left of a tag's first quote landed after its value, `<container columns="7"| padding=...`.
 */
describe("selecting across a quoted value's curly marks", () => {
  const CARD = [
    "card is a view",
    '\tgroup "Dealing & the Stock Pile"',
    "\tto draw it",
    '\t\t<container columns="7" padding="small" spacing="xs">',
    '\t\t\t<column "C6" />',
    "\t\t</container>",
    ""
  ].join("\n")

  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor of `CARD` in the bubbly look, drawn and focused. */
  async function bubblyEditor(): Promise<EditorView> {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 900px; height: 300px"
    const state = EditorState.create({
      doc: CARD,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    return view
  }

  /** Where `text` starts in `CARD`, plus `offset`. */
  function at(text: string, offset = 0): number {
    return CARD.indexOf(text) + offset
  }

  /** The middle of the character at `pos`, as drawn. */
  function middleOf(view: EditorView, pos: number): { clientX: number; clientY: number } {
    const coords = view.coordsAtPos(pos, 1)!
    const after = view.coordsAtPos(pos + 1, -1)!
    return { clientX: (coords.left + after.left) / 2, clientY: (coords.top + coords.bottom) / 2 }
  }

  /** A press of the main button at `from`, moved to `to`, and released there. */
  async function drag(view: EditorView, from: number, to: number): Promise<void> {
    const start = middleOf(view, from)
    const end = middleOf(view, to)
    // past the test page's width, the editor's own element:  CodeMirror goes by the press's place
    const target = document.elementFromPoint(start.clientX, start.clientY) ?? view.contentDOM
    const init = { bubbles: true, cancelable: true, button: 0, detail: 1 }
    target.dispatchEvent(new MouseEvent("mousedown", { ...init, ...start, buttons: 1 }))
    document.dispatchEvent(new MouseEvent("mousemove", { ...init, ...end, buttons: 1 }))
    await new Promise((done) => requestAnimationFrame(done))
    document.dispatchEvent(new MouseEvent("mouseup", { ...init, ...end, buttons: 0 }))
  }

  /** The selected text. */
  function selected(view: EditorView): string {
    const { from, to } = view.state.selection.main
    return view.state.sliceDoc(from, to)
  }

  test("every letter of a tag's line is found under the pointer, left to right", async () => {
    const view = await bubblyEditor()
    for (const line of [4, 5].map((number) => view.state.doc.line(number))) {
      const found = []
      for (let pos = line.from + 2; pos < line.to; pos++) {
        // a curly mark's middle is the `"` it stands for
        const { clientX, clientY } = middleOf(view, pos)
        found.push(view.posAtCoords({ x: clientX, y: clientY }))
      }
      expect(found).toEqual([...found].sort((a, b) => a! - b!))
      // each letter of the words, and every quote, at its own place
      for (const word of ["container", "columns", "padding", "small", "spacing", "column", "C6"]) {
        const pos = CARD.indexOf(word)
        if (pos < line.from || pos > line.to) continue
        const { clientX, clientY } = middleOf(view, pos + 1)
        expect(view.posAtCoords({ x: clientX, y: clientY }), word).toBe(pos + 1)
      }
    }
  })

  test("a drag from a tag's name across its quoted values selects all of it", async () => {
    const view = await bubblyEditor()
    await drag(view, at("container", 4), at('small"', 4))
    expect(selected(view)).toBe('ainer columns="7" padding="smal')
  })

  test("a drag back across the quotes, from a value into the attribute before it", async () => {
    const view = await bubblyEditor()
    await drag(view, at('xs"', 1), at("columns", 2))
    expect(selected(view)).toBe('lumns="7" padding="small" spacing="x')
    expect(view.state.selection.main.head).toBe(at("columns", 2))
  })

  test("a drag across a Spell value's curly marks", async () => {
    const view = await bubblyEditor()
    await drag(view, at("group", 1), at("Stock Pile", 3))
    expect(selected(view)).toBe('roup "Dealing & the Sto')
  })

  test("⇧→ steps across an attribute's quotes, one character each", async () => {
    const view = await bubblyEditor()
    view.dispatch({ selection: { anchor: at("padding") } })
    for (let step = 0; step < 'padding="small"'.length; step++) selectCharRight(view)
    expect(selected(view)).toBe('padding="small"')
  })
})
