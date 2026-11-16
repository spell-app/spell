import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A body's rail in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I131):
 * the caret at the start of a body line stands in the middle of the rail the line hangs on
 * (Owen:  "slide the expanded pills over so the cursor is right in the center of the gutter line").
 * - Spell's bodies and a drawing's tags' alike, at every level.
 * - The rail stays under its band's round end:  the band's left edge is the rail's.
 */
describe("a body's rail under the caret", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** Spell bodies three deep, and a drawing's tags two deep inside one. */
  const NESTED = `a "card" is a view
\tits "rank" is a number
\t// face down at first
\tto turn it over
\t\tif it is face up
\t\t\tturn it face down
\t\t\tpause for 10 msec
\t\tsay "done"
\tto draw it
\t\t<container columns="7">
\t\t\t<stock-pile "stock" />
\t\t\t<segment inverted>
\t\t\t\t<action "cheat" />
\t\t\t</>
\t\t</container>
`

  /** An editor of `text` in the bubbly look, drawn and focused. */
  async function bubblyEditorOf(text: string): Promise<EditorView> {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 600px"
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    await frames()
    return view
  }

  /** Two frames:  CodeMirror measures, then draws. */
  function frames(): Promise<void> {
    return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
  }

  /**
   * The middle of the innermost rail line `number` draws, on the page;  `undefined`:  none.
   * - Its column is a `calc()` in the line's `--cmb-rails`:  measured as a probe's width, in the line's own settings.
   */
  function railMiddle(view: EditorView, number: number): number | undefined {
    const line = view.domAtPos(view.state.doc.line(number).from).node
    const element = (line instanceof HTMLElement ? line : line.parentElement)!.closest<HTMLElement>(".cm-line")!
    const columns = [...element.style.getPropertyValue("--cmb-rails").matchAll(/transparent (calc\(.*?band-left\)\))/g)]
    if (!columns.length) return undefined
    const probe = element.appendChild(document.createElement("span"))
    probe.style.cssText = `position: absolute; display: inline-block; height: 0; width: ${columns.at(-1)![1]}`
    const left = element.getBoundingClientRect().left + probe.getBoundingClientRect().width
    probe.remove()
    return left + Number.parseFloat(getComputedStyle(element).getPropertyValue("--cmb-rail")) / 2
  }

  /** The caret's middle, as drawn, put at line `number`'s start, after its indent. */
  async function caretMiddle(view: EditorView, number: number): Promise<number> {
    const line = view.state.doc.line(number)
    view.dispatch({ selection: { anchor: line.from + /^\t*/.exec(line.text)![0].length } })
    await frames()
    const caret = view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    return caret.left + caret.width / 2
  }

  /** The numbers of the lines starting with `starts`. */
  function linesStarting(view: EditorView, starts: string[]): number[] {
    const lines = view.state.doc.toString().split("\n")
    return starts.map((start) => lines.findIndex((line) => line.trimStart().startsWith(start)) + 1)
  }

  test("at a body line's start, Spell's or a drawing's tags', at every level:  the caret in the middle of its rail", async () => {
    const view = await bubblyEditorOf(NESTED)
    const bodyLines = linesStarting(view, [
      "// face down",
      "turn it face down",
      "pause for",
      'say "done"',
      "<stock-pile",
      "<action",
      "</>",
      "</container>"
    ])
    // `</>` and `</container>` are their own blocks' feet:  on the rail of the block round them
    const atRails: Array<{ line: number; caret: number; rail: number }> = []
    for (const line of bodyLines.slice(0, 6)) {
      atRails.push({ line, caret: await caretMiddle(view, line), rail: railMiddle(view, line)! })
    }
    for (const { line, caret, rail } of atRails)
      expect(Math.abs(caret - rail), view.state.doc.line(line).text).toBeLessThan(0.1)
    // four levels of rail, each a tab stop further in
    const rails = [...new Set(atRails.map(({ rail }) => rail.toFixed(1)))]
    expect(rails.length).toBe(4)
  })

  test("each rail under its band's round end:  the band's left edge is its rail's", async () => {
    const view = await bubblyEditorOf(NESTED)
    const rail = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-rail"))
    for (const [head, body] of [
      ["to turn it over", "if it is face up"],
      ["if it is face up", "turn it face down"],
      ["<container", "<stock-pile"],
      ["<segment", "<action"]
    ] as const) {
      const [headLine, bodyLine] = linesStarting(view, [head, body])
      const band = view
        .domAtPos(view.state.doc.line(headLine!).to)
        .node.parentElement!.closest(".cm-line")!
        .querySelector<HTMLElement>(".cmb-band-open")!
      expect(band, head).toBeTruthy()
      expect(Math.abs(band.getBoundingClientRect().left + rail / 2 - railMiddle(view, bodyLine!)!), head).toBeLessThan(
        0.1
      )
    }
  })

  /** A drawing's start tag laid out as Enter lays a long one out, Prettier's way (epic `language` I133). */
  const LAID_OUT = `a "game" is a view
\tto draw it
\t\t<segment inverted>
\t\t\t<toolbar
\t\t\t\tclass="GameBar"
\t\t\t\tinverted
\t\t\t>
\t\t\t\t<action "cheat" />
\t\t\t</>
\t\t</segment>
`

  test("a start tag over several lines:  each attribute line's pill round its words alone, hanging on the tag's rail;  its `>` at its band's edge", async () => {
    const view = await bubblyEditorOf(LAID_OUT)
    const [head, attribute, bare, close, child] = linesStarting(view, [
      "<toolbar",
      "class=",
      "inverted",
      ">",
      "<action"
    ])
    const elementOf = (number: number) => {
      const node = view.domAtPos(view.state.doc.line(number).to).node
      return (node instanceof HTMLElement ? node : node.parentElement)!.closest<HTMLElement>(".cm-line")!
    }
    const band = elementOf(head!).querySelector(".cmb-band-open")!.getBoundingClientRect()
    // no band reaching left over the line's indent and the rails round it
    for (const number of [attribute!, bare!, close!]) {
      const row = elementOf(number).querySelector(".cmb-tag-row")!
      expect(row.textContent!.replace(/[“”]/g, '"'), String(number)).toBe(view.state.doc.line(number).text.trim())
      expect(row.getBoundingClientRect().left).toBeGreaterThanOrEqual(band.left - 0.1)
    }
    // the attribute lines on the tag's rail, as its children are
    const rail = railMiddle(view, child!)!
    expect(Math.abs(railMiddle(view, attribute!)! - rail)).toBeLessThan(0.1)
    expect(
      Math.abs(elementOf(attribute!).querySelector(".cmb-tag-row")!.getBoundingClientRect().left - rail)
    ).toBeLessThan(0.1)
    // its `>` the end of the tag's band, from the band's left edge
    expect(
      Math.abs(elementOf(close!).querySelector(".cmb-tag-row")!.getBoundingClientRect().left - band.left)
    ).toBeLessThan(0.1)
  })

  test("an attribute's opening quote mark a space's room after its `=`, as after a space", async () => {
    const view = await bubblyEditorOf(LAID_OUT)
    const equalsMark = view.dom.querySelector(".bubbly-equals")!
    const equals = equalsMark.getBoundingClientRect()
    const glyph = equalsMark.parentElement!.querySelector(".cmb-quote-open .cmb-quote-glyph")!.getBoundingClientRect()
    // the `=`'s character box is wider than its ink:  its mark now starts past the box's middle
    expect(glyph.left).toBeGreaterThan(equals.left + equals.width / 2)
  })
})
