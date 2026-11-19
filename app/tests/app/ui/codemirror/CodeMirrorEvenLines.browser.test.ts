import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import solitaire from "../../../../spaces/@spell/examples/Solitaire/Solitaire.spell?raw"
import tableExamples from "../../../../spaces/@spell/guides/SpellUI/Table/Examples.spell?raw"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * Every line of the bubbly look one line tall, on a real CodeMirror editor in the browser (epic `codemirror` P7;
 * Owen, 2026-11-19:  "make line spacing completely regular"):
 * - a block's feet drawn over the lines, taking no room:  in the blank line under it, else along the bottom of its last
 *   line;  a row of HTML end tags one line tall;  a description too wide for its band cut short on it
 * - So CodeMirror's guess at the height of a line it hasn't drawn is right, and the file's height never changes as it
 *   scrolls:  it changed 8 times scrolling Solitaire end to end and back, 88 times Table's examples.
 */
describe("every line one line tall", () => {
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

  /** A few frames:  CodeMirror measures and draws in one, a description's room is set in the next. */
  async function frames(count = 4): Promise<void> {
    for (let frame = 0; frame < count; frame++) await new Promise((done) => requestAnimationFrame(done))
  }

  /** The heights of the lines drawn now that aren't one line tall, with their text. */
  function oddLines(view: EditorView): string[] {
    const odd: string[] = []
    for (const child of view.contentDOM.children) {
      const height = child.getBoundingClientRect().height
      if (child.classList.contains("cm-gap")) continue
      if (!child.classList.contains("cm-line")) odd.push(`a block of its own, ${height}px:  ${child.className}`)
      else if (height !== 25) odd.push(`${height}px:  ${view.state.doc.lineAt(view.posAtDOM(child, 0)).text.trim()}`)
    }
    return odd
  }

  for (const [name, text] of [
    ["Solitaire.spell", solitaire],
    ["Table's Examples.spell", tableExamples]
  ] as const) {
    test(
      `${name}, scrolled end to end and back:  every line drawn 25px, the file's height never changing`,
      { timeout: 120_000 },
      async () => {
        const view = await bubblyEditorOf(text)
        const height = view.contentHeight
        const odd = new Set<string>()
        const heights = new Set<number>()
        const scroller = view.scrollDOM
        const stops: number[] = []
        for (let top = 0; top < scroller.scrollHeight; top += 300) stops.push(top)
        for (const top of [...stops, ...stops.toReversed()]) {
          scroller.scrollTop = top
          await frames(2)
          for (const line of oddLines(view)) odd.add(line)
          heights.add(view.contentHeight)
        }
        expect([...odd]).toEqual([])
        expect([...heights]).toEqual([height])
        // ... as CodeMirror guessed it before drawing any of it:  a line's height for each visual line
        for (const block of view.viewportLineBlocks) expect(block.height).toBe(25)
      }
    )
  }

  test("a blank line's feet move up off a letter typed on it at once, and back down when it's blank again", async () => {
    const view = await bubblyEditorOf(`to deal
\tif it is face up
\t\tsay "down"

\tsay "done"
`)
    const blank = view.state.doc.line(4)
    const placementOn = (number: number) =>
      view.contentDOM.querySelectorAll(".cm-line")[number - 1]!.querySelector(".cmb-feet")?.className
    expect(placementOn(4)).toBe("cmb-feet cmb-feet-blank")
    // along the top of the blank line:  the bar's top a pixel under the line above
    const lineTop = view.contentDOM.querySelectorAll(".cm-line")[3]!.getBoundingClientRect().top
    const bar = view.contentDOM.querySelector(".cmb-foot")!.getBoundingClientRect()
    expect(bar.top - lineTop).toBeCloseTo(0.9375, 1)
    view.dispatch({ changes: { from: blank.from, insert: "\tx" }, userEvent: "input.type" })
    await frames(1)
    // before the layout's pause:  up, along the bottom of the line above
    expect(placementOn(4)).toBe("cmb-feet cmb-feet-above")
    const raised = view.contentDOM.querySelector(".cmb-foot")!.getBoundingClientRect()
    expect(raised.bottom).toBeLessThanOrEqual(lineTop)
    view.dispatch({ changes: { from: blank.from, to: blank.from + 2 }, userEvent: "delete.backward" })
    await frames(1)
    expect(placementOn(4)).toBe("cmb-feet cmb-feet-blank")
  })
})
