import { afterEach, describe, expect, test } from "vite-plus/test"
import { cursorCharLeft, cursorCharRight } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSelection } from "spell/app/app/ui/codemirror/CodeMirrorSelection"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * The selection in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I115):
 * drawn over the text, so it must be see-through, focused or not.
 * - CodeMirror's own rule for a focused editor's selection is more specific than a plain
 *   `.cm-focused .cm-selectionBackground`:  it painted the selection solid lavender over the words, which vanished.
 * - A quoted value's `"` is shown as its curly mark, never kept see-through under one:
 *   the browser's selection drew the straight `"` again beside it, as it did a tag's `<`, `>` and `/`.
 */
describe("the selection in the bubbly look", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor in the bubbly look's box, holding `text`. */
  function editorOf(text: string): EditorView {
    const state = EditorState.create({
      doc: text,
      extensions: [
        CodeMirrorSetup.extensions(),
        CodeMirrorSelection.extension,
        EditorView.editorAttributes.of({ class: "bubbly cmb-editor" })
      ]
    })
    const host = document.body.appendChild(document.createElement("div"))
    view = new EditorView({ parent: host, state })
    return view
  }

  /** The alpha of each drawn piece of the selection's background. */
  function selectionAlphas(view: EditorView): number[] {
    return [...view.dom.querySelectorAll(".cmb-selection-layer .cm-selectionBackground")].map((piece) => {
      const colour = getComputedStyle(piece).backgroundColor
      const alpha = /rgba?\([^)]*,\s*([\d.]+)\)/.exec(colour)?.[1]
      return alpha === undefined ? 1 : Number(alpha)
    })
  }

  /** A Spell file with quoted values, Spell's and a drawing's tag's. */
  const QUOTED = `solitaire is an app
\tgroup "Dealing & the Stock Pile"
\tto draw it
\t\t<action "auto play" />
`

  /** An editor of `text` in the bubbly look, drawn, the caret at its end (or `selected`, and focused). */
  async function bubblyEditorOf(text: string, { selected, focused }: { selected?: boolean; focused?: boolean } = {}) {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 300px"
    const state = EditorState.create({
      doc: text,
      selection: selected ? { anchor: 0, head: text.length } : { anchor: text.length },
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    if (focused) view.focus()
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    return view
  }

  test('a quoted value\'s marks are curly marks in place of its `"`:  no straight `"` left on the page', async () => {
    const view = await bubblyEditorOf(QUOTED)
    // the file keeps its `"`, a copy copies it
    expect(view.state.doc.toString()).toBe(QUOTED)
    const shown = view.contentDOM.textContent ?? ""
    expect(shown).not.toContain('"')
    expect(shown).toContain("“Dealing & the Stock Pile”")
    expect(shown).toContain("“auto play”")
    // a Spell value's marks inside its white, so they're placed from it
    const pill = [...view.contentDOM.querySelectorAll(".bubbly-quoted")].find((each) =>
      each.textContent?.includes("Dealing")
    )
    expect([...pill!.querySelectorAll(":scope > .cmb-quote")].map((quote) => quote.textContent)).toEqual(["“", "”"])
  })

  /** The caret as drawn:  its left edge and height. */
  async function caretAt(view: EditorView, move?: (view: EditorView) => boolean) {
    move?.(view)
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const caret = view.dom.querySelector(".cm-cursor")!.getBoundingClientRect()
    return { left: caret.left, height: caret.height }
  }

  /** The line's height, as a caret on plain text there draws it. */
  const LINE_CARET = 18

  // epic `language` I122:  past a closing quote, or before an opening one, the caret was drawn no height at all
  for (const [where, quoted] of [
    ["a Spell value", '"Dealing & the Stock Pile"'],
    ["a tag's value", '"auto play"']
  ] as const) {
    test(`the caret beside ${where}'s quote marks:  as tall as the line, a step further each arrow`, async () => {
      const view = await bubblyEditorOf(QUOTED, { focused: true })
      const before = QUOTED.indexOf(quoted)
      view.dispatch({ selection: { anchor: before } })
      // before the opening mark, after it, before the closing one, after it
      const stops = [await caretAt(view), await caretAt(view, cursorCharRight)]
      view.dispatch({ selection: { anchor: before + quoted.length - 1 } })
      stops.push(await caretAt(view), await caretAt(view, cursorCharRight))
      for (const stop of stops) expect(stop.height).toBeCloseTo(LINE_CARET, 0)
      const lefts = stops.map((stop) => stop.left)
      expect(lefts).toEqual([...lefts].sort((a, b) => a - b))
      expect(new Set(lefts).size).toBe(4)
      // arrowing back over the closing mark, the caret's where it was
      expect(await caretAt(view, cursorCharLeft)).toEqual(stops[2])
    })
  }

  // epic `language` I123:  a bare value's curly marks aren't in the file, so the caret stays inside them
  test("a bare value, `direction=down`:  drawn with curly marks, the caret beside its words", async () => {
    const text = "card is a view\n\tto draw it\n\t\t<card-image direction=down />\n"
    const view = await bubblyEditorOf(text, { focused: true })
    expect(view.state.doc.toString()).toBe(text)
    expect(view.contentDOM.textContent).toContain("“down”")
    const start = text.indexOf("down")
    view.dispatch({ selection: { anchor: start } })
    const first = await caretAt(view)
    view.dispatch({ selection: { anchor: start + "down".length } })
    const last = await caretAt(view)
    // inside the marks' boxes:  the curly marks drawn outside them
    const [open, close] = [...view.contentDOM.querySelectorAll(".cmb-quote")].map((quote) =>
      quote.getBoundingClientRect()
    )
    for (const caret of [first, last]) expect(caret.height).toBeCloseTo(LINE_CARET, 0)
    expect(first.left).toBeGreaterThanOrEqual(open!.right - 1)
    expect(last.left).toBeLessThanOrEqual(close!.left)
  })

  for (const focused of [true, false]) {
    test(`selected, ${focused ? "focused" : "not focused"}:  a character drawn over stays see-through`, async () => {
      const view = await bubblyEditorOf(QUOTED, { selected: true, focused })
      expect(view.hasFocus).toBe(focused)
      const drawnOver = view.contentDOM.querySelectorAll(".bubbly-angle, .bubbly-closing-slash, .bubbly-end-slash")
      expect(drawnOver.length).toBeGreaterThan(0)
      for (const each of drawnOver) {
        expect(getComputedStyle(each).color).toBe("rgba(0, 0, 0, 0)")
        expect(getComputedStyle(each, "::selection").color).toBe("rgba(0, 0, 0, 0)")
      }
      // the curly marks are what's shown, selected or not
      expect(view.contentDOM.textContent).not.toContain('"')
    })
  }

  // epic `language` I124:  CodeMirror drew it from the letters, which sit at a band's top:  it stood high on the bands
  test("in the middle of the bands:  each line's piece as tall as its band, a piece over several lines meeting them", async () => {
    const view = await bubblyEditorOf(QUOTED, { focused: true })
    const [first, , , last] = view.contentDOM.querySelectorAll(".cm-line")
    const bandOf = (line: Element) => line.querySelector(".cmb-band, .cmb-tag-band")!.getBoundingClientRect()
    const pieces = () =>
      [...view.dom.querySelectorAll(".cmb-selection-layer .cm-selectionBackground")].map((piece) =>
        piece.getBoundingClientRect()
      )
    // one line:  its band's top and bottom
    view.dispatch({ selection: { anchor: 3, head: 12 } })
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const [piece] = pieces()
    expect(piece!.top).toBeCloseTo(bandOf(first!).top, 1)
    expect(piece!.bottom).toBeCloseTo(bandOf(first!).bottom, 1)
    // the first line to the last:  each end on its band, the piece between meeting both
    view.dispatch({ selection: { anchor: 3, head: QUOTED.indexOf("auto") } })
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const [top, between, bottom] = pieces()
    expect(top!.top).toBeCloseTo(bandOf(first!).top, 1)
    expect(top!.bottom).toBeCloseTo(bandOf(first!).bottom, 1)
    expect(between!.top).toBeCloseTo(top!.bottom, 1)
    expect(between!.bottom).toBeCloseTo(bottom!.top, 1)
    expect(bottom!.top).toBeCloseTo(bandOf(last!).top, 1)
    expect(bottom!.bottom).toBeCloseTo(bandOf(last!).bottom, 1)
    // CodeMirror's own layer hidden
    expect(getComputedStyle(view.dom.querySelector(".cm-selectionLayer")!).display).toBe("none")
  })

  // epic `language` I124:  Owen, "make the selection black so it doesn't clash with the pills"
  for (const focused of [true, false]) {
    test(`a see-through black, no hue, ${focused ? "focused" : "not focused"};  every letter its own colour under it`, async () => {
      const view = await bubblyEditorOf(QUOTED, { selected: true, focused })
      const [piece] = view.dom.querySelectorAll(".cmb-selection-layer .cm-selectionBackground")
      const [red, green, blue, alpha] = /rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?/
        .exec(getComputedStyle(piece!).backgroundColor)!
        .slice(1)
        .map(Number)
      expect([red, green, blue]).toEqual([0, 0, 0])
      expect(alpha).toBeCloseTo(focused ? 0.18 : 0.1, 2)
      for (const letters of view.contentDOM.querySelectorAll(".bubbly-input, .bubbly-band-word, .cm-line > span")) {
        expect(getComputedStyle(letters, "::selection").color).toBe(getComputedStyle(letters).color)
      }
    })
  }

  for (const focused of [true, false]) {
    test(`see-through over the words, ${focused ? "focused" : "not focused"}`, async () => {
      const view = editorOf('group "Dealing & the Stock Pile"')
      if (focused) view.focus()
      view.dispatch({ selection: { anchor: 9, head: 25 } })
      // the selection layer draws on the editor's next measure
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      expect(view.hasFocus).toBe(focused)
      const alphas = selectionAlphas(view)
      expect(alphas.length).toBeGreaterThan(0)
      for (const alpha of alphas) expect(alpha).toBeLessThan(0.5)
    })
  }
})

/** Code in a drawing's tags, on a real CodeMirror editor in the bubbly look:  its words on its inverted pill. */
describe("code in a drawing's tags, in the bubbly look", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  // epic `language` I126:  code alone between its tags lost its pill, its light words on the paper
  test("`<text>{its picture}</text>`:  the code between the tags on its inverted pill, its words showing", async () => {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 300px"
    const doc = "card is a view\n\tto draw it\n\t\t<text color={its color}>{its picture}</text>\n"
    const state = EditorState.create({
      doc,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const [inTag, between] = [...view.contentDOM.querySelectorAll(".bubbly-input.bubbly-expression")]
    expect(between!.textContent).toBe("{its picture}")
    // the same pill as the code in the tag:  its words' colour on its fill
    expect(getComputedStyle(between!).backgroundColor).toBe(getComputedStyle(inTag!).backgroundColor)
    expect(getComputedStyle(between!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
    const wordsOf = (pill: Element) => [...pill.children].find((each) => !each.matches(".bubbly-code-brace"))!
    const words = wordsOf(between!)
    expect(words.textContent).toBe("its picture")
    expect(words.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(getComputedStyle(words).color).toBe(getComputedStyle(wordsOf(inTag!)).color)
    expect(getComputedStyle(words).color).not.toBe(getComputedStyle(between!).backgroundColor)
  })

  // epic `language` I127:  a code pill's braces were the paper's dark brace ink, lost on the dark pill
  test("a code pill's braces read on it:  light, as its words are", async () => {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 300px"
    const doc = "card is a view\n\tto draw it\n\t\t<text color={its color}>{its picture}</text>\n"
    const state = EditorState.create({
      doc,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const pills = [...view.contentDOM.querySelectorAll(".bubbly-input.bubbly-expression")]
    expect(pills).toHaveLength(2)
    for (const pill of pills) {
      const braces = [...pill.querySelectorAll(".bubbly-code-brace")]
      expect(braces.map((brace) => brace.textContent)).toEqual(["{", "}"])
      const fill = lightnessOf(getComputedStyle(pill).backgroundColor)
      for (const brace of braces) expect(lightnessOf(getComputedStyle(brace).color) - fill).toBeGreaterThan(0.3)
    }
  })
})

/** A colour's lightness, 0 to 1:  the mean of its red, green and blue, as `rgb()` or `color(srgb ...)`. */
function lightnessOf(colour: string): number {
  const channels = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(colour)?.slice(1).map(Number)
  const rgb =
    channels ??
    /rgba?\((\d+), (\d+), (\d+)/
      .exec(colour)!
      .slice(1)
      .map((each) => Number(each) / 255)
  return (rgb[0]! + rgb[1]! + rgb[2]!) / 3
}
