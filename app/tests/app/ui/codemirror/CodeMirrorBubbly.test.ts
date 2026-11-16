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

  test("a slice shown dedented:  its rails, bands and feet a column in from where it's drawn, not the file's (I128)", () => {
    const text = `a "card" is a view
\tto play it
\t\tif it is face up
\t\t\tplay the card
`
    const state = EditorState.create({ doc: text })
    const from = state.doc.line(3).from
    const to = state.doc.line(4).to
    // its two tabs hidden on each line:  the \`if\`'s band, rail and foot at the first column, under where it's drawn
    const shown = { from, to, hiddenIndent: 2 }
    expect(columnsOf(text, shown)).toEqual({ bands: [0], rails: ["0"], feet: [0] })
    // shown as in the file:  two columns in, as before
    expect(columnsOf(text, { from, to })).toEqual({ bands: [2], rails: ["2"], feet: [2] })
  })

  test("a body opening with a group:  no inside corner under its band, the group's band hung right there (I119)", () => {
    const text = `calculator is an app
\tgroup "What It Keeps"
\tits "input" is text
\tits "left" is text
`
    const marked = marksOf(text)
    expect(textWith(marked, "cmb-band-opens-group")).toEqual(["calculator is an app"])
    // a band whose body opens with a line keeps its corner
    expect(textWith(marked, "cmb-band-opens-group")).not.toContain('group "What It Keeps"')
  })

  test("a group's notes, at the top level or in a type, drawn where its members' words are;  no other line (I134)", () => {
    const text = `group "The piles"
// Each kind of pile
-- and how it lies

a "pile" is a list
\t// what a pile is
\tgroup "Rank & Suit" -- low to high
\t// ace is low
\tits "rank" is a number
\tto turn it
\t\t// a step's comment
`
    expect(groupLinesOf(text)).toEqual(["// Each kind of pile", "-- and how it lies", "\t// ace is low"])
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

  test("bodies ending on one line:  each foot under the one inside it, as far down as their rails are apart across (I125)", () => {
    const text = `to deal
\tfor row from 1 to 7
\t\tif row is 1
\t\t\tsay row
\tsay "done"
`
    // the `if`'s, then the `for`'s a tab lower;  the action's under its own last line
    expect(feetOf(text)).toEqual([
      { line: "\t\t\tsay row", column: 2, partOfSpeech: "control", drop: 1, dropsAbove: 0, ended: [] },
      { line: "\t\t\tsay row", column: 1, partOfSpeech: "control", drop: 0, dropsAbove: 1, ended: [] },
      { line: '\tsay "done"', column: 0, partOfSpeech: "action", drop: 0, dropsAbove: 0, ended: [] }
    ])
  })

  test("a group ending its type's body:  ONE foot, the group's, its type's rail ending beside it (I125)", () => {
    const text = `a "card" is a view
\tgroup "Drawing"
\tto draw it
\t\tsay "hi"
`
    // the action's foot, then the group's a tab lower, where the card's would be, in the card's rail's hue:
    // the card's rail (0) ends there
    expect(feetOf(text)).toEqual([
      { line: '\t\tsay "hi"', column: 1, partOfSpeech: "action", drop: 1, dropsAbove: 0, ended: [] },
      { line: '\t\tsay "hi"', column: 0, partOfSpeech: "thing", drop: 0, dropsAbove: 1, ended: [0] }
    ])
  })
})

describe("CodeMirrorBubbly's room between blocks (T141)", () => {
  test("a foot right above a band has room under it;  not above a plain line, a blank line, or under a band's own body", () => {
    const text = `a "card" is a view
\tits "color" is
\t\tblue if it is face down
\tits "picture" is
\t\tsay "hi"
\tto turn it over
\t\tif it is face up
\t\t\tsay "down"
\t\tsay "flipped"

\tits "rank" is a number
`
    expect(feetOf(text).map(({ line, isAboveBand = false }) => ({ line, isAboveBand }))).toEqual([
      // `its "picture" is` right under it
      { line: "\t\tblue if it is face down", isAboveBand: true },
      // `to turn it over` right under it
      { line: '\t\tsay "hi"', isAboveBand: true },
      // a plain line under it, then a blank line
      { line: '\t\t\tsay "down"', isAboveBand: false },
      { line: '\t\tsay "flipped"', isAboveBand: false },
      // the end of the file
      { line: '\tits "rank" is a number', isAboveBand: false }
    ])
  })
})

/**
 * Each foot `text` draws, in order:  the line it's under, its rail's column, and how its stack is laid out;
 * `isAboveBand` only when it is.
 */
function feetOf(text: string) {
  const state = EditorState.create({ doc: text })
  const feet: Array<Record<string, unknown>> = []
  CodeMirrorBubbly.decorationsOf(state).between(0, text.length, (from, _to, decoration) => {
    const spec = decoration.spec as { block?: boolean; widget?: Foot }
    if (!spec.block || !spec.widget) return
    const { column, partOfSpeech, drop, dropsAbove, ended, isAboveBand } = spec.widget
    const foot = { line: state.doc.lineAt(from).text, column, partOfSpeech, drop, dropsAbove, ended: [...ended] }
    feet.push(isAboveBand ? { ...foot, isAboveBand } : foot)
  })
  return feet
}

/** What a foot's widget says of itself. */
type Foot = {
  column: number
  partOfSpeech: string
  drop: number
  dropsAbove: number
  ended: Set<number>
  isAboveBand: boolean
}

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

/** The column of each band, of each railed line's rails, and of each foot, as `slice` shows `text`. */
function columnsOf(text: string, slice: { from: number; to: number; hiddenIndent?: number }) {
  const bands: number[] = []
  const rails: string[] = []
  const feet: number[] = []
  CodeMirrorBubbly.decorationsOf(EditorState.create({ doc: text }), undefined, slice).between(
    0,
    text.length,
    (from, to, decoration) => {
      const spec = decoration.spec as { class?: string; widget?: Foot; attributes?: Record<string, string> }
      const style = spec.attributes?.style ?? ""
      if (spec.widget && "column" in spec.widget) feet.push(spec.widget.column)
      else if (from === to && style.startsWith("--cmb-rails"))
        rails.push(
          [...new Set([...style.matchAll(/--cmb-line-pad\) \+ (\d+) \* var\(--cmb-indent\)/g)].map((m) => m[1]))].join()
        )
      else if (spec.class?.split(" ").includes("cmb-band")) bands.push(Number(/--cmb-column: (\d+)/.exec(style)?.[1]))
    }
  )
  return { bands, rails: [...new Set(rails)], feet }
}

/** The lines drawn as a group's own, its notes (`cmb-group-line`), in order. */
function groupLinesOf(text: string): string[] {
  const state = EditorState.create({ doc: text })
  const lines: string[] = []
  CodeMirrorBubbly.decorationsOf(state).between(0, text.length, (from, to, decoration) => {
    const classes = (decoration.spec as { class?: string }).class?.split(" ") ?? []
    if (from === to && classes.includes("cmb-group-line")) lines.push(state.doc.lineAt(from).text)
  })
  return lines
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
