import { describe, expect, test } from "vite-plus/test"
import { codeFolding, foldEffect } from "@codemirror/language"
import { EditorState } from "@codemirror/state"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"

/**
 * `CodeMirrorBubbly`, Spell drawn bubbly in CodeMirror (epic `codemirror` P3):  what P3 adds -- a drawing's tags from the page's reading of markup, a head's description at its band's
 * right end, and a slice drawing only what's wholly in its lines.
 * - Runs in node:  the decorations are worked out from an editor state, no view needed.
 */
describe("CodeMirrorBubbly", () => {
  const CARD = `a "card" is a view -- A playing card
\t// draws \`<card-image />\` on the page
\tits "rank" is a number
\tto draw it
\t\t<card-image rank={its rank} direction="down" />
`

  test("a drawing's tags are HTML's, pointed pills of the page's reading;  a tag in a comment is no tag", () => {
    const marked = marksOf(CARD)
    expect(textWith(marked, "cmb-tag-pill")).toEqual([])
    expect(textWith(marked, "cmb-tag-band")).toEqual(['<card-image rank={its rank} direction="down" />'])
    expect(textWith(marked, "bubbly-tag-name")).toEqual(["card-image"])
    expect(textWith(marked, "bubbly-attribute-name")).toEqual(["rank", "direction"])
    // its `{…}` an inverted pill;  its quoted value a white one
    expect(textWith(marked, "bubbly-expression")).toContain("its rank")
    expect(textWith(marked, "bubbly-input")).toContain("down")
    // the comment's `<card-image />` is the comment's
    expect(textWith(marked, "bubbly-comment")).toContain("// draws `<card-image />` on the page")
  })

  test("a head's description:  its band reaches the box's edge, the description at its right end (Owen)", () => {
    const marked = marksOf(CARD)
    expect(textWith(marked, "cmb-band-described")).toEqual(['a "card" is a view -- A playing card'])
    expect(textWith(marked, "cmb-description")).toEqual(["-- A playing card"])
    // a head with none:  its band only as long as its words
    expect(textWith(marked, "cmb-band").filter((band) => !band.includes("--"))).toEqual([
      'its "rank" is a number',
      "to draw it"
    ])
  })

  test("a slice:  only what's wholly in its lines is drawn, so a block it cuts draws no band, rail or foot", () => {
    const state = EditorState.create({ doc: CARD })
    const from = state.doc.line(3).from
    const to = state.doc.line(5).to
    const marked = marksOf(CARD, { from, to })
    // the card's block is cut:  no band;  the two inside it are whole
    expect(textWith(marked, "cmb-band")).toEqual(['its "rank" is a number', "to draw it"])
    // the lines inside the card draw only the rail of the block that's whole
    const rails = railsOf(CARD, { from, to })
    expect(rails.get('\t\t<card-image rank={its rank} direction="down" />')).toBe(1)
  })

  /** A Spell block, a drawing in it, and a tag block in the drawing:  each head folds (`CodeMirrorLanguage.folding()`). */
  const DRAWN = `a "card" is a view
\tits "rank" is a number
\tto draw it
\t\t<segment inverted>
\t\t\t<text>Hi</>
\t\t</>
`

  test("a folded block:  its head alone, a pill;  its hidden body draws no rail, no foot, nothing (I116)", () => {
    const state = folded(DRAWN, 1)
    const shapes = shapesOf(state)
    expect(shapes.bands).toEqual([{ text: 'a "card" is a view', classes: expect.arrayContaining(["cmb-band-folded"]) }])
    expect(shapes.bands[0]!.classes).toContain("cmb-band-pill")
    expect(shapes.bands[0]!.classes).not.toContain("cmb-band-open")
    expect(shapes.feet).toBe(0)
    expect(shapes.railedLines).toEqual([])
  })

  test("a folded tag block:  its start tag a band pointed at both ends;  its parent's rail and foot as for a one-line child (I116)", () => {
    const shapes = shapesOf(folded(DRAWN, 4))
    const segment = shapes.tagBands.find((band) => band.text.startsWith("<segment"))!
    expect(segment.classes).toContain("cmb-band-folded")
    expect(segment.classes).not.toContain("cmb-band-open")
    // nothing of its body:  no `<text>` pill, no tiny foot;  the blocks round it keep their feet, the card's and the action's
    expect(shapes.tagBands.map((band) => band.text)).toEqual(["<segment inverted>"])
    expect(shapes.tagFeet).toBe(0)
    expect(shapes.feet).toBe(2)
    // the line under the action's head is in its rail and the card's, as before
    expect(shapes.railedLines).toContain("\t\t<segment inverted>")
  })
})

/** `text`'s state, the block whose head is on line `line` folded, as a click on its arrow folds it. */
function folded(text: string, line: number): EditorState {
  const state = EditorState.create({ doc: text, extensions: codeFolding() })
  const head = state.doc.line(line)
  const lines = text.split("\n")
  // its last line:  the last one further in than its head
  const indent = (each: string) => each.length - each.trimStart().length
  let last = line
  while (last < lines.length && lines[last]!.trim() && indent(lines[last]!) > indent(lines[line - 1]!)) last++
  // a tag block's end tag too, as the language service folds it
  if (lines[last]?.trimStart().startsWith("</")) last++
  return state.update({ effects: foldEffect.of({ from: head.to, to: state.doc.line(last).to }) }).state
}

/** What `state` draws:  its bands, its tags' bands, its feet, and the lines a rail runs down. */
function shapesOf(state: EditorState) {
  const text = state.doc.toString()
  const bands: Array<{ text: string; classes: string[] }> = []
  const tagBands: Array<{ text: string; classes: string[] }> = []
  const railedLines: string[] = []
  let feet = 0
  let tagFeet = 0
  CodeMirrorBubbly.decorationsOf(state).between(0, text.length, (from, to, decoration) => {
    const spec = decoration.spec as { class?: string; block?: boolean; attributes?: Record<string, string> }
    const classes = spec.class?.split(" ") ?? []
    if (spec.block) feet++
    else if (from === to && spec.attributes?.style?.startsWith("--cmb-rails"))
      railedLines.push(state.doc.lineAt(from).text)
    else if (classes.includes("cmb-band")) bands.push({ text: text.slice(from, to), classes })
    else if (classes.includes("cmb-tag-band")) tagBands.push({ text: text.slice(from, to), classes })
    else if (classes.includes("cmb-tag-foot")) tagFeet++
  })
  return { bands, tagBands, feet, tagFeet, railedLines }
}

/** Each mark's classes, by its stretch, and the text it's on;  `slice`:  the lines shown. */
function marksOf(text: string, slice?: { from: number; to: number }): Array<{ text: string; classes: string[] }> {
  const marked: Array<{ text: string; classes: string[]; from: number }> = []
  const decorations = CodeMirrorBubbly.decorationsOf(EditorState.create({ doc: text }), undefined, slice)
  decorations.between(0, text.length, (from, to, decoration) => {
    const { class: classes } = decoration.spec as { class?: string }
    if (classes && to > from) marked.push({ text: text.slice(from, to), classes: classes.split(" "), from })
  })
  return marked.sort((a, b) => a.from - b.from)
}

/** The text of each mark with class `name`, in order. */
function textWith(marked: Array<{ text: string; classes: string[] }>, name: string): string[] {
  return marked.filter((mark) => mark.classes.includes(name)).map((mark) => mark.text)
}

/** How many rails each railed line draws, by its text;  `slice`:  the lines shown. */
function railsOf(text: string, slice?: { from: number; to: number }): Map<string, number> {
  const state = EditorState.create({ doc: text })
  const rails = new Map<string, number>()
  CodeMirrorBubbly.decorationsOf(state, undefined, slice).between(0, text.length, (from, to, decoration) => {
    const style = (decoration.spec as { attributes?: Record<string, string> }).attributes?.style
    if (from === to && style?.startsWith("--cmb-rails")) {
      rails.set(state.doc.lineAt(from).text, style.split("linear-gradient").length - 1)
    }
  })
  return rails
}
