import { afterEach, describe, expect, test } from "vite-plus/test"
import { cursorCharRight } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A body's rail in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I131, I136):
 * 3px of room between the rail and what starts each line it hangs on, a plain line's first letter, a tag's
 * pointed end (Owen, I136:  "Gap wins"), so nothing on the line touches it.
 * - Spell's bodies and a drawing's tags' alike, at every level.
 * - The words stay where they were, a body's under its head's (Owen, I136:  "Fix the gutters so all text and tags are
 *   inset as they were before"):  the rail drops from under its band, a little in from its round end.
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
    const columns = [...element.style.getPropertyValue("--cmb-rails").matchAll(/transparent (calc\(.*?rail-left\)\))/g)]
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

  test("at a body line's start, Spell's or a drawing's tags', at every level:  3px clear of its rail", async () => {
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
    const railWidth = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-rail"))
    const atRails: Array<{ line: number; start: number; rail: number }> = []
    for (const line of bodyLines.slice(0, 6)) {
      // where the line starts:  a tag's pointed end, else its first letter, where the caret is
      const tag = lineElement(view, line).querySelector<HTMLElement>(".cmb-tag-pill, .cmb-tag-band")
      const start = tag ? tag.getBoundingClientRect().left : await caretMiddle(view, line)
      atRails.push({ line, start, rail: railMiddle(view, line)! })
    }
    for (const { line, start, rail } of atRails)
      expect(Math.abs(start - (rail + railWidth / 2) - 3), view.state.doc.line(line).text).toBeLessThan(0.1)
    // four levels of rail, each a tab stop further in
    const rails = [...new Set(atRails.map(({ rail }) => rail.toFixed(1)))]
    expect(rails.length).toBe(4)
  })

  test("each rail dropping from under its band, a little in from its round end;  a body's words under its head's", async () => {
    const view = await bubblyEditorOf(NESTED)
    const rail = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-rail"))
    for (const [head, body] of [
      ["to turn it over", "if it is face up"],
      ["to turn it over", 'say "done"'],
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
      const { left, right } = band.getBoundingClientRect()
      const middle = railMiddle(view, bodyLine!)!
      // under the band, in from its round (or pointed) end:  5.25px
      expect(middle - rail / 2 - left, head).toBeGreaterThan(5)
      expect(middle + rail / 2, head).toBeLessThan(right)
      // a Spell body's words start where its head's do, as before I131 (a head in it:  a tab further in, on its band)
      if (!head.startsWith("<") && !lineElement(view, bodyLine!).querySelector(".cmb-band")) {
        const words = left + Number.parseFloat(getComputedStyle(band).paddingLeft)
        expect(Math.abs((await caretMiddle(view, bodyLine!)) - words), head).toBeLessThan(0.1)
      }
    }
  })

  test("a run of end tags alone on their lines:  ONE row of feet, each end tag reached by a click and the caret (I132)", async () => {
    const view = await bubblyEditorOf(NESTED)
    const [end, outerEnd] = linesStarting(view, ["</>", "</container>"])
    const rows = view.dom.querySelectorAll<HTMLElement>(".cmb-feet-row")
    expect(rows.length).toBe(1)
    const row = rows[0]!
    const [inner, outer] = [...row.querySelectorAll<HTMLElement>(".cmb-tag-foot")]
    expect([inner?.textContent, outer?.textContent]).toEqual(["</>", "</container>"])
    // side by side on one level:  the inner one first, the outer one further along, its bar behind the inner one
    const innerBox = inner!.getBoundingClientRect()
    const outerBox = outer!.getBoundingClientRect()
    expect(outerBox.top).toBe(innerBox.top)
    expect(outerBox.left).toBeGreaterThan(innerBox.right)
    const outerBar = getComputedStyle(outer!, "::before")
    expect(Number.parseFloat(outerBar.right)).toBeGreaterThan(0)
    // the row one foot tall, on whole pixels, so the lines under it start on one, as the lines above it do
    const contentTop = view.contentDOM.getBoundingClientRect().top
    const rowBox = row.getBoundingClientRect()
    expect(rowBox.height).toBe(16)
    const firstLine = view.contentDOM.querySelector(".cm-line")!.getBoundingClientRect().top
    expect((rowBox.top - firstLine) % 1).toBe(0)
    expect((rowBox.bottom - contentTop) % 1).toBeCloseTo((firstLine - contentTop) % 1, 5)
    // a click on each end tag puts the caret in it
    const endTag = view.state.doc.line(end!)
    const outerTag = view.state.doc.line(outerEnd!)
    for (const [box, tag] of [
      [innerBox, endTag],
      [outerBox, outerTag]
    ] as const) {
      const at = view.posAtCoords({ x: box.left + box.width / 2, y: box.top + box.height / 2 })!
      expect(at, tag.text).toBeGreaterThan(tag.from + tag.text.indexOf("<"))
      expect(at, tag.text).toBeLessThan(tag.to)
    }
    // from the end of one end tag, one step right is the start of the next:  the line break between them one step
    view.dispatch({ selection: { anchor: endTag.to } })
    cursorCharRight(view)
    expect(view.state.selection.main.head).toBe(outerTag.from + outerTag.text.indexOf("<"))
    // ... the caret drawn there, at the outer end tag's words
    await frames()
    const caret = view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    expect(caret.top).toBeGreaterThanOrEqual(outerBox.top - 1)
    expect(caret.left).toBeGreaterThan(outerBox.left)
    expect(caret.left).toBeLessThan(outerBox.left + outerBox.width / 2)
  })

  /**
   * A drawing's start tag laid out as Enter lays a long one out (epic `language` I133):
   * each attribute on its own line, its `>` at the end of the last (I135).
   */
  const LAID_OUT = `a "game" is a view
\tto draw it
\t\t<segment inverted>
\t\t\t<toolbar
\t\t\t\tclass="GameBar"
\t\t\t\tappearance="pills"
\t\t\t\tinverted>
\t\t\t\t<action "cheat" />
\t\t\t</>
\t\t</segment>
`

  /** The `.cm-line` drawing line `number`. */
  function lineElement(view: EditorView, number: number): HTMLElement {
    const node = view.domAtPos(view.state.doc.line(number).to).node
    return (node instanceof HTMLElement ? node : node.parentElement)!.closest<HTMLElement>(".cm-line")!
  }

  test("a start tag over several lines:  ONE block, every row from its band's left edge to the widest row's right (I135)", async () => {
    const view = await bubblyEditorOf(LAID_OUT)
    await frames()
    const [head, wide, last, child] = linesStarting(view, ["<toolbar", "appearance=", "inverted", "<action"])
    const rows = [head!, head! + 1, wide!, last!].map((number) => {
      const row = lineElement(view, number).querySelector<HTMLElement>(".cmb-tag-block")!
      expect(row, String(number)).toBeTruthy()
      return row.getBoundingClientRect()
    })
    const band = rows[0]!
    for (const [at, row] of rows.entries()) {
      expect(Math.abs(row.left - band.left), `left of row ${at}`).toBeLessThan(0.1)
      expect(Math.abs(row.right - band.right), `right of row ${at}`).toBeLessThan(0.1)
    }
    // whole:  each row down to the next one's top
    for (const [at, row] of rows.slice(1).entries()) expect(Math.abs(row.top - rows[at]!.bottom)).toBeLessThan(0.1)
    // past the widest value's closing quote
    const quotes = lineElement(view, wide!).querySelectorAll(".cmb-quote-close")
    expect(quotes[quotes.length - 1]!.getBoundingClientRect().right).toBeLessThan(band.right)
    // its `>` at the block's right edge, in its last row:  as far in from it as its `⟨` is from the left edge,
    // a value's room clear of the widest row's closing quote (Owen, I135)
    const point = lineElement(view, last!).querySelector(".cmb-tag-point")!.getBoundingClientRect()
    const angle = lineElement(view, head!).querySelector(".bubbly-angle-open")!.getBoundingClientRect()
    expect(Math.abs(band.right - point.right - (angle.left - band.left))).toBeLessThan(0.1)
    expect(point.left - quotes[quotes.length - 1]!.getBoundingClientRect().right).toBeGreaterThan(2)
    // the tag's rail, its children's, dropping from under the block, a little in from its left edge, 3px clear of
    // its child's pointed end (I136)
    const rail = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-rail"))
    expect(railMiddle(view, child!)! - rail / 2 - band.left).toBeGreaterThan(5)
    const childTag = lineElement(view, child!).querySelector(".cmb-tag-pill, .cmb-tag-band")!.getBoundingClientRect()
    expect(Math.abs(childTag.left - (railMiddle(view, child!)! + rail / 2) - 3)).toBeLessThan(0.1)
  })

  test("...the caret before its `>` at the last attribute's end, after it past the point;  wider as it's typed", async () => {
    const view = await bubblyEditorOf(LAID_OUT)
    const [last, wide] = linesStarting(view, ["inverted", "appearance="])
    const line = view.state.doc.line(last!)
    const word = lineElement(view, last!).querySelector(".bubbly-attribute-name")!.getBoundingClientRect()
    const caretAt = async (at: number) => {
      view.dispatch({ selection: { anchor: at } })
      await frames()
      return view.dom.querySelector(".cm-cursor")!.getBoundingClientRect().left
    }
    expect(Math.abs((await caretAt(line.to - 1)) - word.right)).toBeLessThan(1)
    const point = lineElement(view, last!).querySelector(".cmb-tag-point")!.getBoundingClientRect()
    expect(Math.abs((await caretAt(line.to)) - point.right)).toBeLessThan(1)
    // an attribute typed wider:  the block's right edge moves with it
    const before = lineElement(view, wide!).querySelector(".cmb-tag-block")!.getBoundingClientRect().right
    const value = view.state.doc.line(wide!)
    view.dispatch({ changes: { from: value.to - 1, insert: " and some more" } })
    await frames()
    await frames()
    const rows = [last!, wide!].map((number) => lineElement(view, number).querySelector(".cmb-tag-block")!)
    const after = rows[1]!.getBoundingClientRect().right
    expect(after).toBeGreaterThan(before + 50)
    expect(Math.abs(rows[0]!.getBoundingClientRect().right - after)).toBeLessThan(0.1)
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
