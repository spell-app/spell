import { afterEach, describe, expect, test } from "vite-plus/test"
import { cursorDocEnd, cursorPageDown } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import solitaire from "../../../../spaces/@spell/examples/Solitaire/Solitaire.spell?raw"
import tableExamples from "../../../../spaces/@spell/guides/SpellUI/Table/Examples.spell?raw"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * The bubbly look's marks made only for the lines CodeMirror draws, on a real editor in the browser
 * (epic `codemirror` P7, "Visible-Only Bubbly Marks"):
 * - every line on screen arrives marked as it scrolls in, by a scroll, Page Down or a jump to the end
 * - and after typing, before the typing's layout comes and after it
 * - "marked":  each drawn line the whole file's layout marks (`CodeMirrorBubbly.decorationsOf()`, every mark at once)
 *   has a mark drawn in it
 */
describe("CodeMirrorBubbly's marks, made for the lines on screen", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor 800 by 400 holding `text` drawn bubbly, drawn. */
  async function bubblyEditorOf(text: string): Promise<EditorView> {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 400px"
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    await frames()
    return view
  }

  /** A few frames:  CodeMirror measures and draws in one. */
  async function frames(count = 4): Promise<void> {
    for (let frame = 0; frame < count; frame++) await new Promise((done) => requestAnimationFrame(done))
  }

  /** The numbers of the lines of `state` the whole file's layout puts a mark in. */
  function markedLines(state: EditorState): Set<number> {
    const lines = new Set<number>()
    CodeMirrorBubbly.decorationsOf(state).between(0, state.doc.length, (from, to, decoration) => {
      if (to > from && !decoration.point) lines.add(state.doc.lineAt(from).number)
    })
    return lines
  }

  /**
   * The lines on screen that the whole file's layout marks, but are drawn with no mark:  their text.
   * - On screen:  CodeMirror also draws the caret's line wherever it is, e.g. the first, scrolled far away
   */
  function unmarked(view: EditorView, marked: Set<number>): string[] {
    const plain: string[] = []
    const screen = view.scrollDOM.getBoundingClientRect()
    for (const child of view.contentDOM.querySelectorAll<HTMLElement>(".cm-line")) {
      const box = child.getBoundingClientRect()
      if (box.bottom <= screen.top || box.top >= screen.bottom) continue
      const line = view.state.doc.lineAt(view.posAtDOM(child, 0))
      if (marked.has(line.number) && !child.querySelector("span[class]"))
        plain.push(`${line.number}:  ${line.text.trim()}`)
    }
    return plain
  }

  for (const [name, text] of [
    ["Solitaire.spell", solitaire],
    ["Table's Examples.spell", tableExamples]
  ] as const) {
    test(
      `${name}, scrolled end to end and back:  every line on screen marked as it comes`,
      { timeout: 120_000 },
      async () => {
        const view = await bubblyEditorOf(text)
        const marked = markedLines(view.state)
        const plain = new Set<string>()
        const scroller = view.scrollDOM
        const stops: number[] = []
        for (let top = 0; top < scroller.scrollHeight; top += 300) stops.push(top)
        for (const top of [...stops, ...stops.toReversed()]) {
          scroller.scrollTop = top
          // one frame:  a line scrolled in is drawn marked in the frame it's drawn in, never a frame later
          await frames(1)
          for (const line of unmarked(view, marked)) plain.add(line)
        }
        expect([...plain]).toEqual([])
      }
    )
  }

  test("Page Down, and a jump to the end:  every line on screen marked", { timeout: 60_000 }, async () => {
    const view = await bubblyEditorOf(tableExamples)
    const marked = markedLines(view.state)
    for (let page = 0; page < 5; page++) {
      cursorPageDown(view)
      await frames(1)
      expect(unmarked(view, marked)).toEqual([])
    }
    cursorDocEnd(view)
    await frames(1)
    expect(unmarked(view, marked)).toEqual([])
  })

  test("typing, then scrolling:  the lines scrolled to marked before the typing's layout, and after", async () => {
    const view = await bubblyEditorOf(tableExamples)
    // typed near the top:  every line under it moved
    const line = view.state.doc.line(30)
    view.dispatch({ changes: { from: line.to, insert: "\n" }, userEvent: "input.type" })
    view.dispatch({ changes: { from: line.to + 1, insert: "\n\n" }, userEvent: "input.type" })
    const marked = markedLines(view.state)
    // before the layout's pause:  marked from the last layout, through the edits since
    view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight / 2
    await frames(1)
    expect(unmarked(view, marked)).toEqual([])
    // after it:  from the new one
    await new Promise((done) => setTimeout(done, CodeMirrorBubbly.RELAYOUT_MSEC + 100))
    view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight / 4
    await frames(1)
    expect(unmarked(view, marked)).toEqual([])
  })
})
