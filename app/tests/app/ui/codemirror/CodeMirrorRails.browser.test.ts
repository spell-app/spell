import { afterEach, describe, expect, test } from "vite-plus/test"
import { cursorCharLeft, cursorCharRight, cursorLineDown } from "@codemirror/commands"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A body's rail in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I131, I136, I137):
 * each rail at its band's left edge, the band's bottom-left square into it (Owen, I137:  "put the rails back where
 * they were");  the lines it hangs on a tab and a band's room in from it.
 * - Spell's bodies and a drawing's tags' alike, at every level.
 * - A body's words a band's room right of the rail (Owen, I136:  "Fix the gutters so all text and tags are inset as
 *   they were before");  a plain line's where a band's on its level are (I142).
 * - The caret before a line's first word drawn at the word, however it got there (I141).
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
   * The middle of the innermost rail line `number` draws, on the page, its first stripe;  `undefined`:  none.
   * - Its column is a `calc()` in the line's `--cmb-rails`:  measured as a probe's width, in the line's own settings.
   */
  function railMiddle(view: EditorView, number: number): number | undefined {
    const line = view.domAtPos(view.state.doc.line(number).from).node
    const element = (line instanceof HTMLElement ? line : line.parentElement)!.closest<HTMLElement>(".cm-line")!
    const columns = [...element.style.getPropertyValue("--cmb-rails").matchAll(/transparent (calc\(.*?rail-left\)\))/g)]
    if (!columns.length) return undefined
    const probe = element.appendChild(document.createElement("span"))
    probe.style.cssText = `position: absolute; display: inline-block; height: 0; width: ${columns[0]![1]}`
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

  test("at a body line's start, Spell's or a drawing's tags', at every level:  a tab and a band's room in from its rail", async () => {
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
    const settings = getComputedStyle(view.dom)
    const [railWidth, tab] = ["--cmb-rail", "--cmb-indent"].map((name) =>
      Number.parseFloat(settings.getPropertyValue(name))
    ) as [number, number]
    // a band's room before its words, less a tab:  what a Spell band pads its words by
    const spellBand = view.dom.querySelector<HTMLElement>(".cmb-band-open:not(.cmb-tag-band, .cmb-band-hung)")!
    const bandRoom = Number.parseFloat(getComputedStyle(spellBand).paddingLeft) - tab
    const atRails: Array<{ line: number; start: number; rail: number }> = []
    for (const line of bodyLines.slice(0, 6)) {
      // where the line starts:  a tag's pointed end, else its first letter, where the caret is
      const tag = lineElement(view, line).querySelector<HTMLElement>(".cmb-tag-pill, .cmb-tag-band")
      const start = tag ? tag.getBoundingClientRect().left : await caretMiddle(view, line)
      atRails.push({ line, start, rail: railMiddle(view, line)! })
    }
    // a tag's pointed end:  a tab and a band's room right of the rail's left edge;  Spell's words a tab further, where
    // a band's words on their level are (I142)
    for (const { line, start, rail } of atRails) {
      const text = view.state.doc.line(line).text
      const spellTab = text.trimStart().startsWith("<") ? 0 : tab
      expect(Math.abs(start - (rail - railWidth / 2) - tab - bandRoom - spellTab), text).toBeLessThan(0.1)
    }
    // four levels of rail, each a tab stop further in
    const rails = [...new Set(atRails.map(({ rail }) => rail.toFixed(1)))]
    expect(rails.length).toBe(4)
  })

  test("each rail at its band's left edge, the band square there;  a body's plain words a tab in from its head's", async () => {
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
      const { left } = band.getBoundingClientRect()
      // the band's left edge is its rail's, its bottom-left square into it
      expect(Math.abs(left + rail / 2 - railMiddle(view, bodyLine!)!), head).toBeLessThan(0.1)
      expect(getComputedStyle(band).borderBottomLeftRadius, head).toMatch(/^0px/)
      // a Spell body's plain words a tab in from its head's, where a band in it puts its words (I142)
      if (!head.startsWith("<") && !lineElement(view, bodyLine!).querySelector(".cmb-band")) {
        const words = left + Number.parseFloat(getComputedStyle(band).paddingLeft)
        const tab = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-indent"))
        expect(Math.abs((await caretMiddle(view, bodyLine!)) - words - tab), head).toBeLessThan(0.1)
      }
    }
  })

  test("end tags on ONE line, `</></>`:  the same row of feet as on lines of their own, every foot alike (I146)", async () => {
    // Owen:  "Wonky feet" -- one a tiny foot, the other an inline end tag on a rail stub
    const feetOf = async (ends: string) => {
      const view = await bubblyEditorOf(
        `a "game" is a view\n\tto draw it\n\t\t<segment inverted>\n\t\t\t<toolbar class="x">\n\t\t\t\t<text "" />\n${ends}\t\t<container>\n\t\t\t<column "C1"/>\n\t\t</container>\n`
      )
      await frames()
      const first = view.contentDOM.querySelector(".cmb-feet-row")!
      const feet = [...first.querySelectorAll<HTMLElement>(".cmb-tag-foot")].map((foot) => {
        const box = foot.getBoundingClientRect()
        return { left: box.left, top: box.top, width: box.width, height: box.height }
      })
      const row = first.getBoundingClientRect().height
      view.dom.parentElement?.remove()
      view.destroy()
      return { feet, row }
    }
    const apart = await feetOf("\t\t\t</>\n\t\t</>\n")
    expect(apart.feet).toHaveLength(2)
    for (const ends of ["\t\t\t</></>\n", " \t\t\t</></>\n"]) {
      const together = await feetOf(ends)
      expect(together.row).toBe(apart.row)
      expect(together.feet).toHaveLength(2)
      for (const [at, foot] of together.feet.entries()) {
        const other = apart.feet[at]!
        expect(Math.abs(foot.left - other.left), `foot ${at} left`).toBeLessThan(0.1)
        expect(Math.abs(foot.top - other.top), `foot ${at} top`).toBeLessThan(0.1)
        expect(Math.abs(foot.width - other.width), `foot ${at} width`).toBeLessThan(0.1)
        expect(Math.abs(foot.height - other.height), `foot ${at} height`).toBeLessThan(0.1)
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
    expect(rowBox.height).toBe(21)
    // each end tag half as tall again as a block's tiny foot, 10px at the editor's size (Owen, I138), its bar
    // meeting it in its middle
    expect(innerBox.height).toBeCloseTo(1.5 * 10 * 0.9375, 2)
    const innerBar = getComputedStyle(inner!, "::before")
    const rail = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-rail"))
    const barMiddle = rowBox.top - 1 + Number.parseFloat(innerBar.height) - rail / 2
    expect(Math.abs(barMiddle - (innerBox.top + innerBox.height / 2))).toBeLessThan(0.1)
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

  test("the caret at a body line's first column in the middle of its rail:  every band and rail slid 2px right (I140)", async () => {
    const view = await bubblyEditorOf(NESTED)
    // Owen:  "slide *all* of the bubble band backgrounds + gutters to the right 2 pixels"
    expect(getComputedStyle(view.dom).getPropertyValue("--cmb-slide").trim()).toBe("2px")
    const [member] = linesStarting(view, ['its "rank"'])
    view.dispatch({ selection: { anchor: view.state.doc.line(member!).from } })
    await frames()
    const caret = view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    expect(Math.abs(caret.left + caret.width / 2 - railMiddle(view, member!)!)).toBeLessThan(1)
    // a band's words where they were:  a tab in from its line's indent, its room before them taking the slide
    const band = getComputedStyle(view.dom.querySelector(".cmb-band-open:not(.cmb-tag-band, .cmb-band-hung)")!)
    const tab = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-indent"))
    expect(Math.abs(Number.parseFloat(band.marginLeft) + Number.parseFloat(band.paddingLeft) - tab)).toBeLessThan(0.01)
    // ... and the words after it:  its end slid out, its room after them
    expect(Number.parseFloat(band.marginRight)).toBe(-2)
  })

  /** StarWars' character (Owen's I141 and I142 screenshots):  a plain line among one-line bands, on one level. */
  const CHARACTER = `a "character" is a thing
\tit lives in star wars
\tits "name" is text
\tits "height" is a length in cm or "unknown"
`

  /** Where the caret is drawn, its middle, once drawn. */
  async function caretX(view: EditorView): Promise<number> {
    await frames()
    const caret = view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    return caret.left + caret.width / 2
  }

  test("Left, Left, Right from `its`'s `i`:  before `its`, column 0 on the rail, before `its` again, drawn in ONE place (I141)", async () => {
    const view = await bubblyEditorOf(CHARACTER)
    const [name] = linesStarting(view, ['its "name"'])
    const line = view.state.doc.line(name!)
    const words = lineElement(view, name!).querySelector<HTMLElement>(".cmb-band")!
    const wordsLeft =
      words.getBoundingClientRect().left +
      Number.parseFloat(getComputedStyle(words).paddingLeft) +
      Number.parseFloat(getComputedStyle(words).borderLeftWidth)
    view.dispatch({ selection: { anchor: line.from + 2 } })
    cursorCharLeft(view)
    const left = await caretX(view)
    expect(view.state.selection.main.head).toBe(line.from + 1)
    cursorCharLeft(view)
    const columnZero = await caretX(view)
    expect(view.state.selection.main.head).toBe(line.from)
    expect(Math.abs(columnZero - railMiddle(view, name!)!)).toBeLessThan(1)
    cursorCharRight(view)
    const right = await caretX(view)
    expect(view.state.selection.main.head).toBe(line.from + 1)
    // the same place drawn the same way, at `its`, whichever way the caret came (it stood a tab left, at the band's edge)
    expect(Math.abs(right - left)).toBeLessThan(0.01)
    expect(Math.abs(left - wordsLeft)).toBeLessThan(1)
    // ... and coming down from the line above
    view.dispatch({ selection: { anchor: line.from - 1 } })
    cursorCharRight(view)
    cursorCharRight(view)
    expect(Math.abs((await caretX(view)) - left)).toBeLessThan(0.01)
    view.dispatch({ selection: { anchor: view.state.doc.line(name! - 1).from + 1 } })
    cursorLineDown(view)
    expect(view.state.selection.main.head).toBe(line.from + 1)
    expect(Math.abs((await caretX(view)) - left)).toBeLessThan(0.01)
  })

  test("Left, Left, Right at a pill's first letter, after a space or an `=`:  drawn in ONE place, at the word (I141)", async () => {
    // Owen:  "Seeing the same thing in pills before unqoured white pill"
    const view = await bubblyEditorOf(
      "solitaire is an app\n\twhen creating solitaire\n\t\tpause for 10 msec\n\tto draw it\n\t\t<card-image direction=down />\n"
    )
    for (const word of ["creating", "down"]) {
      const start = view.state.doc.toString().indexOf(word)
      view.dispatch({ selection: { anchor: start + 1 } })
      cursorCharLeft(view)
      const left = await caretX(view)
      expect(view.state.selection.main.head).toBe(start)
      cursorCharLeft(view)
      cursorCharRight(view)
      expect(view.state.selection.main.head).toBe(start)
      const right = await caretX(view)
      expect(Math.abs(right - left), word).toBeLessThan(0.01)
      // at the word's first letter, inside its pill
      const letter = document.createRange()
      const node = view.domAtPos(start + 1).node
      letter.setStart(node, 0)
      letter.setEnd(node, 1)
      expect(Math.abs(left - letter.getBoundingClientRect().left), word).toBeLessThan(1)
    }
  })

  test("a plain body line's first word where a band's words on its level are, at every level;  its column 0 on its rail (I142)", async () => {
    for (const [text, plain, banded] of [
      [CHARACTER, "it lives", 'its "name"'],
      [NESTED, "// face down", 'its "rank"'],
      [NESTED, "turn it face down", "if it is face up"]
    ] as const) {
      view?.dom.parentElement?.remove()
      view?.destroy()
      const editor = await bubblyEditorOf(text)
      const [plainLine, bandLine] = linesStarting(editor, [plain, banded])
      const indentEnd = (number: number) => {
        const line = editor.state.doc.line(number)
        return line.from + /^\t*/.exec(line.text)![0].length
      }
      const firstLetter = (number: number) => editor.coordsAtPos(indentEnd(number), 1)!.left
      const indentOf = (number: number) => indentEnd(number) - editor.state.doc.line(number).from
      // on one level, the same x;  `turn it face down`, a level in from `if it is face up`:  a tab further
      const tab = Number.parseFloat(getComputedStyle(editor.dom).getPropertyValue("--cmb-indent"))
      const levels = indentOf(plainLine!) - indentOf(bandLine!)
      expect(Math.abs(firstLetter(plainLine!) - firstLetter(bandLine!) - levels * tab), plain).toBeLessThan(0.01)
      // its column 0 where a band line's is, on the outermost rail (I140);  the caret before its word at the word, stuck
      // to the indent or not
      const columnZero = async (number: number) => {
        editor.dispatch({ selection: { anchor: editor.state.doc.line(number).from } })
        return caretX(editor)
      }
      expect(Math.abs((await columnZero(plainLine!)) - (await columnZero(bandLine!))), plain).toBeLessThan(0.01)
      editor.dispatch({
        selection: EditorSelection.single(indentEnd(plainLine!)).replaceRange(
          EditorSelection.cursor(indentEnd(plainLine!), -1)
        )
      })
      expect(Math.abs((await caretX(editor)) - firstLetter(plainLine!)), plain).toBeLessThan(1)
    }
  })

  describe("the caret on a blank line, its tabs alone:  where its words will go once typed (I157)", () => {
    /**
     * Blank lines in bodies, as Enter and the caret's snap leave them:  in an `if`'s body, an action's, a group's,
     * and between a drawing's tags.
     */
    const BLANKS = `a "card" is a view
\tgroup "Moves"
\tto turn it over
\t\tif it is face up
\t\t\tturn it face down
\t\t\t
\t\t\tpause for 10 msec
\t\t
\t\tsay "done"
\t
\tto draw it
\t\t<container columns="7">
\t\t\t<stock-pile "stock" />
\t\t\t
\t\t\t<action "cheat" />
\t\t</container>
`

    /** The first letter of line `number`'s words, on the page. */
    const firstLetter = (view: EditorView, number: number) => {
      const line = view.state.doc.line(number)
      return view.coordsAtPos(line.from + /^\s*/.exec(line.text)![0].length, 1)!.left
    }

    /** The caret put at the end of line `number`, stuck to what's before it or after (`assoc`), where it's drawn. */
    const caretAtEnd = (view: EditorView, number: number, assoc: -1 | 1) => {
      view.dispatch({
        selection: EditorSelection.single(0).replaceRange(EditorSelection.cursor(view.state.doc.line(number).to, assoc))
      })
      return caretX(view)
    }

    /** `text` typed at the caret, as a key types it:  where its first letter is drawn, at once and once laid out again. */
    async function typed(view: EditorView, text: string): Promise<{ atOnce: number; laidOut: number }> {
      const at = view.state.selection.main.head
      view.dispatch({
        changes: { from: at, insert: text },
        selection: { anchor: at + text.length },
        userEvent: "input.type"
      })
      await frames()
      const atOnce = view.coordsAtPos(at, 1)!.left
      await new Promise((done) => setTimeout(done, CodeMirrorBubbly.RELAYOUT_MSEC + 50))
      await frames()
      return { atOnce, laidOut: view.coordsAtPos(at, 1)!.left }
    }

    test("in a body, at every level:  where the words of a plain line on its level are, however the caret got there;  a letter typed lands on it", async () => {
      for (const [blank, words] of [
        ["\t\t\t", "turn it face down"],
        ["\t\t", 'say "done"']
      ] as const) {
        view?.dom.parentElement?.remove()
        view?.destroy()
        const editor = await bubblyEditorOf(BLANKS)
        const [wordsLine] = linesStarting(editor, [words])
        const number = editor.state.doc.toString().split("\n").indexOf(blank) + 1
        const level = firstLetter(editor, wordsLine!)
        // it stood a tab left:  at the end of its tabs, before the room after them
        for (const assoc of [-1, 1] as const) {
          expect(Math.abs((await caretAtEnd(editor, number, assoc)) - level), `${words}, ${assoc}`).toBeLessThan(0.5)
        }
        const { atOnce, laidOut } = await typed(editor, "s")
        expect(Math.abs(atOnce - level), words).toBeLessThan(0.5)
        expect(Math.abs(laidOut - level), words).toBeLessThan(0.5)
      }
    })

    test("a tab taken off (Backspace):  where the words a level out are", async () => {
      const view = await bubblyEditorOf(BLANKS)
      const number = view.state.doc.toString().split("\n").indexOf("\t\t\t") + 1
      const [levelOut] = linesStarting(view, ['say "done"'])
      const end = view.state.doc.line(number).to
      view.dispatch({
        changes: { from: end - 1, to: end },
        selection: { anchor: end - 1 },
        userEvent: "delete.backward"
      })
      expect(Math.abs((await caretX(view)) - firstLetter(view, levelOut!))).toBeLessThan(0.5)
    })

    test("a group's own blank line (I134):  where its members' words are, as it was", async () => {
      const view = await bubblyEditorOf(BLANKS)
      const number = view.state.doc.toString().split("\n").indexOf("\t") + 1
      const member = firstLetter(view, number + 1)
      expect(Math.abs((await caretAtEnd(view, number, 1)) - member)).toBeLessThan(0.5)
      expect(lineElement(view, number).querySelector(".cmb-words-place")).toBeNull()
    })

    test("between a drawing's tags:  at the end of its tabs, where a `<` typed there is drawn", async () => {
      const view = await bubblyEditorOf(BLANKS)
      const number = view.state.doc.toString().split("\n").lastIndexOf("\t\t\t") + 1
      const caret = await caretAtEnd(view, number, 1)
      expect(lineElement(view, number).querySelector(".cmb-words-place, .cmb-plain-indent")).toBeNull()
      const { atOnce, laidOut } = await typed(view, "<")
      expect(Math.abs(atOnce - caret)).toBeLessThan(0.5)
      expect(Math.abs(laidOut - caret)).toBeLessThan(0.5)
    })

    test("right above a drawing's first tag:  at the end of its tabs too, where a `<` typed there is drawn", async () => {
      const view = await bubblyEditorOf(
        `a "card" is a view\n\tto draw it\n\t\t\n\t\t<container columns="7">\n\t\t\t<stock-pile "stock" />\n\t\t</container>\n`
      )
      const caret = await caretAtEnd(view, 3, 1)
      expect(lineElement(view, 3).querySelector(".cmb-words-place, .cmb-plain-indent")).toBeNull()
      const { atOnce, laidOut } = await typed(view, "<")
      expect(Math.abs(atOnce - caret)).toBeLessThan(0.5)
      expect(Math.abs(laidOut - caret)).toBeLessThan(0.5)
    })

    test("a selection ending on it reaches the caret, not the end of its tabs", async () => {
      const view = await bubblyEditorOf(BLANKS)
      const number = view.state.doc.toString().split("\n").indexOf("\t\t\t") + 1
      view.dispatch({
        selection: { anchor: view.state.doc.line(number - 1).from + 5, head: view.state.doc.line(number).to }
      })
      const caret = await caretX(view)
      const pieces = [...view.dom.querySelectorAll(".cmb-selection-layer .cm-selectionBackground")].map((piece) =>
        piece.getBoundingClientRect()
      )
      const last = pieces.reduce((lowest, piece) => (piece.top > lowest.top ? piece : lowest))
      expect(Math.abs(last.right - caret)).toBeLessThan(0.5)
    })
  })

  describe("a blank line an edit writes:  drawn at once, as the next layout draws it (I158)", () => {
    /** Bodies with an empty line in each:  an `if`'s, an action's, a group's, a drawing's. */
    const EMPTIES = `a "card" is a view
\tgroup "Moves"
\tto turn it over
\t\tif it is face up
\t\t\tturn it face down

\t\t\tpause for 10 msec
\t\tsay "done"

\tto draw it
\t\t<container columns="7">
\t\t\t<stock-pile "stock" />

\t\t\t<action "cheat" />
\t\t</container>
`

    /** Where the caret is drawn right after `spec`'s edit, before the pause lays the text out again, and after. */
    async function caretAtOnceAndLaidOut(view: EditorView, spec: { at: number; insert: string }) {
      view.dispatch({
        changes: { from: spec.at, insert: spec.insert },
        selection: { anchor: spec.at + spec.insert.length }
      })
      const atOnce = await caretX(view)
      await new Promise((done) => setTimeout(done, CodeMirrorBubbly.RELAYOUT_MSEC + 50))
      return { atOnce, laidOut: await caretX(view) }
    }

    test("the caret's snap onto an empty body line:  where the line's words will go, at once", async () => {
      for (const [above, indent] of [
        ["turn it face down", "\t\t\t"],
        ['say "done"', "\t"]
      ] as const) {
        view?.dom.parentElement?.remove()
        view?.destroy()
        const editor = await bubblyEditorOf(EMPTIES)
        const [number] = linesStarting(editor, [above])
        const { atOnce, laidOut } = await caretAtOnceAndLaidOut(editor, {
          at: editor.state.doc.line(number! + 1).from,
          insert: indent
        })
        expect(Math.abs(atOnce - laidOut), above).toBeLessThan(0.5)
        const words = editor.coordsAtPos(editor.state.doc.line(number! + 2).from + indent.length, 1)!.left
        expect(Math.abs(laidOut - words), above).toBeLessThan(0.5)
      }
    })

    test("Enter at a body line's end, and a letter typed on the line it makes:  never moved by the layout", async () => {
      const view = await bubblyEditorOf(EMPTIES)
      const [number] = linesStarting(view, ["turn it face down"])
      const { atOnce, laidOut } = await caretAtOnceAndLaidOut(view, {
        at: view.state.doc.line(number!).to,
        insert: "\n\t\t\t"
      })
      expect(Math.abs(atOnce - laidOut)).toBeLessThan(0.5)
      // a letter typed with its indent on an empty line, as `indentToAdd()` writes it
      const empty = view.state.doc.line(number! + 2)
      view.dispatch({ changes: { from: empty.from, insert: "\t\t\ts" }, selection: { anchor: empty.from + 4 } })
      await frames()
      const letter = () => view.coordsForChar(view.state.selection.main.head - 1)!.left
      const typed = letter()
      await new Promise((done) => setTimeout(done, CodeMirrorBubbly.RELAYOUT_MSEC + 50))
      await frames()
      expect(Math.abs(typed - letter())).toBeLessThan(0.5)
    })

    test("every blank line Enter could make, after every line:  at once where the layout puts it", async () => {
      const view = await bubblyEditorOf(EMPTIES.replaceAll("\n\n", "\n"))
      const lines = view.state.doc.lines
      for (let number = 1; number < lines; number++) {
        // the next line's indent, as the caret's snap writes it;  a level in from the line's, as Enter after a head
        const own = /^\t*/.exec(view.state.doc.line(number).text)![0]
        const next = /^\t*/.exec(view.state.doc.line(number + 1).text)![0]
        for (const indent of new Set([next, own + "\t"])) {
          const text = view.state.doc.toString()
          const { atOnce, laidOut } = await caretAtOnceAndLaidOut(view, {
            at: view.state.doc.line(number).to,
            insert: "\n" + indent
          })
          const where = `after line ${number}, ${JSON.stringify(indent)}`
          expect(Math.abs(atOnce - laidOut), where).toBeLessThan(0.5)
          view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
          await new Promise((done) => setTimeout(done, CodeMirrorBubbly.RELAYOUT_MSEC + 50))
        }
      }
    })
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

  /** Where the ink of `element`'s last letter ends:  its box less the letter's bearing, as a canvas measures it. */
  function inkRightOf(element: Element): number {
    const text = element.firstChild as Text
    const range = document.createRange()
    range.setStart(text, text.length - 1)
    range.setEnd(text, text.length)
    const style = getComputedStyle(element)
    const canvas = document.createElement("canvas").getContext("2d")!
    canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    return range.getBoundingClientRect().left + canvas.measureText(text.data.at(-1)!).actualBoundingBoxRight
  }

  test("a start tag over several lines:  ONE block, every row from its band's left edge to past the widest row (I135)", async () => {
    const view = await bubblyEditorOf(LAID_OUT)
    await frames()
    const [head, wide, last, child] = linesStarting(view, ["<toolbar", "appearance=", "inverted", "<action"])
    const rows = [head!, wide!, last!].map((number) => {
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
    // past the widest value's closing quote, as far as its `⟨` is in from its left edge
    const quotes = view.dom.querySelectorAll(".cmb-tag-block .cmb-quote-close")
    const widest = Math.max(...[...quotes].map((quote) => quote.getBoundingClientRect().right))
    expect(widest).toBeLessThan(band.right)
    // the tag's rail, its children's, at the block's left edge, the block's bottom-left square into it (I137)
    const rail = Number.parseFloat(getComputedStyle(view.dom).getPropertyValue("--cmb-rail"))
    expect(Math.abs(band.left + rail / 2 - railMiddle(view, child!)!)).toBeLessThan(0.1)
    const lastRow = lineElement(view, last!).querySelector(".cmb-tag-block")!
    expect(getComputedStyle(lastRow).borderBottomLeftRadius).toMatch(/^0px/)
  })

  test("...its first attribute on its name's line, the others under it, its `>` 4px past the last (I139)", async () => {
    const view = await bubblyEditorOf(LAID_OUT)
    await frames()
    const [head, first, wide, last] = linesStarting(view, ["<toolbar", "class=", "appearance=", "inverted"])
    // `class` drawn on `toolbar`'s line (Owen:  "`class` should be on the same line as `toolbar`"), the file unchanged
    expect(view.state.doc.line(head!).text.trim()).toBe("<toolbar")
    expect(lineElement(view, first!)).toBe(lineElement(view, head!))
    const nameOf = (number: number) =>
      [...lineElement(view, number).querySelectorAll(".bubbly-attribute-name")].find((name) =>
        view.state.doc.line(number).text.trim().startsWith(name.textContent!)
      )!
    const tagName = lineElement(view, head!).querySelector(".bubbly-tag-name")!.getBoundingClientRect()
    const classLeft = nameOf(first!).getBoundingClientRect().left
    expect(classLeft).toBeGreaterThan(tagName.right)
    // every other attribute's left at `class`'s (Owen:  "indented as much as `class`")
    for (const number of [wide!, last!])
      expect(Math.abs(nameOf(number).getBoundingClientRect().left - classLeft), `line ${number}`).toBeLessThan(0.01)
    // its `>` on the last attribute's line, its `⟩`'s ink 4px past the attribute's (Owen:  "4px to the right")
    const point = lineElement(view, last!).querySelector<HTMLElement>(".cmb-tag-point")!
    const angle = point.querySelector(".bubbly-angle-close")!
    const angleInk =
      angle.getBoundingClientRect().right - 0.348 * Number.parseFloat(getComputedStyle(angle, "::before").fontSize)
    expect(Math.abs(angleInk - inkRightOf(nameOf(last!)) - 4)).toBeLessThan(0.1)
    // the caret at `class`'s start, and a click on each attribute, where they are
    view.dispatch({ selection: { anchor: view.state.doc.line(first!).to - 'class="GameBar"'.length } })
    await frames()
    const caret = view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    expect(Math.abs(caret.left - classLeft)).toBeLessThan(1)
    for (const number of [first!, wide!, last!]) {
      const name = nameOf(number).getBoundingClientRect()
      const at = view.posAtCoords({ x: name.left + name.width / 2, y: name.top + name.height / 2 })!
      expect(view.state.doc.lineAt(at).number, `click on line ${number}`).toBe(number)
    }
  })

  test('...one attribute, closing itself:  `⟨ divider title="x" |⟩` on one line, its `|⟩` 4px past the quote (I139)', async () => {
    const view = await bubblyEditorOf(`a "game" is a view\n\tto draw it\n\t\t<divider\n\t\t\ttitle="x" />\n`)
    await frames()
    await frames()
    const line = lineElement(view, 3)
    expect(lineElement(view, 4)).toBe(line)
    const row = line.querySelector<HTMLElement>(".cmb-tag-block")!
    expect(row.classList.contains("cmb-tag-block-last")).toBe(true)
    const slash = line.querySelector(".cmb-tag-point .bubbly-slash")!.getBoundingClientRect()
    // its bar drawn at its slash's left edge
    const quote = line.querySelector(".cmb-quote-close .cmb-quote-glyph")!
    expect(Math.abs(slash.left - inkRightOf(quote) - 4)).toBeLessThan(0.1)
    expect(row.getBoundingClientRect().right).toBeGreaterThan(
      line.querySelector(".cmb-tag-point")!.getBoundingClientRect().right
    )
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

  /** `LAID_OUT`, its `>` alone on the line under its last attribute, as Solitaire's toolbar is written (I144). */
  const CLOSE_ALONE = `a "game" is a view
\tto draw it
\t\t<segment inverted>
\t\t\t<toolbar
\t\t\t\tclass="GameBar"
\t\t\t\tappearance="pills"
\t\t\t\tinverted
\t\t\t\tsize="small"
\t\t\t\tshrinkable
\t\t\t>
\t\t\t\t<action "cheat" />
\t\t\t</>
\t\t</segment>
`

  test("...its `>` alone on the line under:  still drawn on the last attribute's line, 4px past it (I144)", async () => {
    const view = await bubblyEditorOf(CLOSE_ALONE)
    await frames()
    const [last, close] = linesStarting(view, ["shrinkable", ">"])
    // Owen:  "End `>` is supposed to be on same line as `shrinkable`";  the file unchanged
    expect(view.state.doc.line(close!).text.trim()).toBe(">")
    const row = lineElement(view, last!)
    expect(lineElement(view, close!)).toBe(row)
    expect(row.querySelector(".cmb-tag-block")!.classList.contains("cmb-tag-block-last")).toBe(true)
    // its `⟩`'s ink past `shrinkable`'s, as drawn now
    const room = () => {
      const line = lineElement(view, last!)
      const angle = line.querySelector(".cmb-tag-point .bubbly-angle-close")!
      const angleInk =
        angle.getBoundingClientRect().right - 0.348 * Number.parseFloat(getComputedStyle(angle, "::before").fontSize)
      return angleInk - inkRightOf(line.querySelector(".bubbly-attribute-name")!)
    }
    expect(Math.abs(room() - 4)).toBeLessThan(0.1)
    const word = row.querySelector(".bubbly-attribute-name")!
    // the caret:  at the word's end, at the end of its line or before the `>`;  after the `>`, past its point
    const caretAt = async (at: number) => {
      view.dispatch({ selection: { anchor: at } })
      await frames()
      return view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    }
    const wordBox = word.getBoundingClientRect()
    const closeLine = view.state.doc.line(close!)
    for (const at of [view.state.doc.line(last!).to, closeLine.to - 1]) {
      const caret = await caretAt(at)
      expect(Math.abs(caret.left - wordBox.right), `caret at ${at}`).toBeLessThan(1)
      expect(Math.abs(caret.top - wordBox.top), `caret at ${at}`).toBeLessThan(wordBox.height)
    }
    const point = row.querySelector(".cmb-tag-point")!.getBoundingClientRect()
    expect(Math.abs((await caretAt(closeLine.to)).left - point.right)).toBeLessThan(1)
    // typed on:  still on its line, and 4px past once it's laid out again
    view.dispatch({ changes: { from: view.state.doc.line(last!).to, insert: "s" } })
    await new Promise((done) => setTimeout(done, CodeMirrorBubbly.RELAYOUT_MSEC + 50))
    await frames()
    await frames()
    expect(lineElement(view, close!)).toBe(lineElement(view, last!))
    expect(Math.abs(room() - 4)).toBeLessThan(0.1)
  })

  test('...one attribute, its `/>` alone on the line under:  one row, `⟨ divider title="x" |⟩` (I144)', async () => {
    const view = await bubblyEditorOf(`a "game" is a view\n\tto draw it\n\t\t<divider\n\t\t\ttitle="x"\n\t\t/>\n`)
    await frames()
    await frames()
    const line = lineElement(view, 3)
    expect(lineElement(view, 4)).toBe(line)
    expect(lineElement(view, 5)).toBe(line)
    expect(line.querySelector(".cmb-tag-block")!.classList.contains("cmb-tag-block-last")).toBe(true)
    const slash = line.querySelector(".cmb-tag-point .bubbly-slash")!.getBoundingClientRect()
    const quote = line.querySelector(".cmb-quote-close .cmb-quote-glyph")!
    expect(Math.abs(slash.left - inkRightOf(quote) - 4)).toBeLessThan(0.1)
  })

  test("a quote left open breaks its own line only:  every tag, band and `⟩` after it drawn as before (I145)", async () => {
    // Owen:  "Quotes don't span lines, so a quoted expression should only break its line"
    const drawn = async (text: string) => {
      const view = await bubblyEditorOf(text)
      await frames()
      const content = view.contentDOM
      const shape = {
        tags: content.querySelectorAll(".bubbly-tag-name").length,
        bands: content.querySelectorAll(".cmb-band, .cmb-band-open").length,
        rows: content.querySelectorAll(".cmb-tag-block").length,
        points: content.querySelectorAll(".cmb-tag-point").length
      }
      view.dom.parentElement?.remove()
      view.destroy()
      return shape
    }
    const closed = await drawn(CLOSE_ALONE)
    expect(closed.points).toBe(1)
    expect(await drawn(CLOSE_ALONE.replace('size="small"', 'size="small'))).toEqual(closed)
    // a plain Spell line's:  the lines after it keep their bands
    const view = await bubblyEditorOf(
      'a "card" is a view\n\tits "name is text\n\tits "rank" is a number\n\tits "suit" is text\n'
    )
    await frames()
    for (const number of [1, 3, 4])
      expect(lineElement(view, number).querySelector(".cmb-band"), `line ${number}`).toBeTruthy()
  })

  test("a group's rail and foot in its band's colour, not the block round it's, light and dark (I147)", async () => {
    // Owen:  "This bar and curly should be colored by group, not app"
    const GROUPS = `a "card" is a view
\t-- a playing card
\tgroup "Card Rank & Suit" -- Ace is low
\tits "rank" is a number
\tits "color" is one of red, black
\t\tred if its rank is 1
\t\tblack otherwise

\tgroup "Names"
\tits "name" is "x"
\tto turn it over
\t\tsay "done"
`
    /** The colour of the stripe drawn on top in `element`'s rails:  the innermost's. */
    const topRail = (element: Element) =>
      getComputedStyle(element)
        .backgroundImage.match(/(?:color|rgba?)\([^)]*\)/g)!
        .find((colour) => colour !== "rgba(0, 0, 0, 0)")
    const backgroundOf = (element: Element) => getComputedStyle(element).backgroundColor
    for (const scheme of ["light", "dark"]) {
      document.documentElement.style.colorScheme = scheme
      const view = await bubblyEditorOf(GROUPS)
      const [card, rankSuit, names] = [...view.dom.querySelectorAll(".cmb-band-open")].filter(
        (band) => !band.closest(".cm-line")!.textContent!.match(/color|turn/)
      )
      const groupBand = backgroundOf(rankSuit!)
      expect(backgroundOf(names!), scheme).toBe(groupBand)
      expect(groupBand, scheme).not.toBe(backgroundOf(card!))
      // a group's members' lines:  its rail, on its parent's, the group's band's colour
      for (const start of ['its "rank"', 'its "color"', 'its "name"', "to turn"]) {
        const [line] = linesStarting(view, [start])
        expect(topRail(lineElement(view, line!)), `${scheme}:  ${start}`).toBe(groupBand)
      }
      // ... but the card's own lines, outside its groups, and the line its first group hangs on:  the card's band's colour
      for (const start of ["-- a playing", "group"]) {
        const [line] = linesStarting(view, [start])
        expect(topRail(lineElement(view, line!)), `${scheme}:  ${start}`).toBe(backgroundOf(card!))
      }
      // the groups' feet the group's band's colour, the one it shares with the card's at the end too;  the others theirs
      const feet = [...view.dom.querySelectorAll(".cmb-foot")].map(backgroundOf)
      expect(feet, scheme).toEqual([
        backgroundOf(view.dom.querySelector(".bubbly-property.cmb-band-open")!),
        groupBand,
        backgroundOf(view.dom.querySelector(".bubbly-action.cmb-band-open")!),
        groupBand
      ])
      view.dom.parentElement?.remove()
      view.destroy()
    }
    document.documentElement.style.colorScheme = ""
  })

  test("a quoted value's marks beside its words, a tag's as a Spell line's:  the opening at their caps, the closing low (I149)", async () => {
    // Owen:  "quotes are too high, lower both" -- a tag's `columns="7"`:  its opening mark above the letters, 6.5px over
    // their caps, its closing one over their middle;  now each where a Spell line's is
    const view = await bubblyEditorOf('a "card" is a view\n\tto draw it\n\t\t<container columns="seven" />\n')
    /** The baseline of `element`'s text, on the page:  a box of no height sits on it. */
    const baselineOf = (element: Element) => {
      const probe = element.appendChild(document.createElement("span"))
      probe.style.cssText = "display: inline-block; width: 0; height: 0"
      const baseline = probe.getBoundingClientRect().bottom
      probe.remove()
      return baseline
    }
    const context = document.createElement("canvas").getContext("2d")!
    /** How far `text`'s ink reaches above and below its baseline, in `element`'s font. */
    const inkOf = (element: Element, text: string) => {
      const style = getComputedStyle(element)
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText(text)
      return { above: metrics.actualBoundingBoxAscent, below: metrics.actualBoundingBoxDescent }
    }
    /** Each mark's ink, from its words' caps' top and from their baseline (down is more);  its lean left out. */
    const marksOf = (input: Element, glyphs: Element[]) => {
      const baseline = baselineOf(input)
      const capTop = baseline - inkOf(input, "H").above
      return glyphs.map((glyph) => {
        const glyphBaseline = baselineOf(glyph)
        const ink = inkOf(glyph, glyph.textContent!)
        return { top: glyphBaseline - ink.above - capTop, bottom: glyphBaseline + ink.below - baseline }
      })
    }
    const spellInput = view.dom.querySelector(".cmb-band .bubbly-input")!
    const spell = marksOf(spellInput, [...spellInput.querySelectorAll(".cmb-quote-glyph")])
    const tagGlyphs = [...view.dom.querySelectorAll(".cmb-tag-quote .cmb-quote-glyph")]
    const tag = marksOf(lineElement(view, 3).querySelector(".bubbly-input")!, tagGlyphs)
    expect(tag).toHaveLength(2)
    // the opening mark's top at the caps' (Spell's 1px under them), its bottom well above the baseline
    expect(spell[0]!.top).toBeGreaterThan(-1)
    expect(spell[0]!.top).toBeLessThan(2.5)
    // the closing one low, a little past the baseline
    expect(spell[1]!.bottom).toBeGreaterThan(0)
    for (const [at, mark] of tag.entries()) {
      expect(Math.abs(mark.top - spell[at]!.top), `tag mark ${at}'s top`).toBeLessThan(1)
      expect(Math.abs(mark.bottom - spell[at]!.bottom), `tag mark ${at}'s bottom`).toBeLessThan(1)
    }
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
