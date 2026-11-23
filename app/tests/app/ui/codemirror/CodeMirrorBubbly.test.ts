import { describe, expect, test } from "vite-plus/test"
import { codeFolding, foldEffect } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { SP } from "spell/parser/spell"
import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorLanguage } from "spell/app/app/ui/codemirror/CodeMirrorLanguage"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"
import type { LanguageClient } from "spell/app/app/ui/codemirror/LanguageClient"
import type { LSP } from "spell/app/lsp"

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

  test("bodies ending on one line:  their feet side by side, each at its rail's column, innermost first (P7)", () => {
    const text = `to deal
\tfor row from 1 to 7
\t\tif row is 1
\t\t\tsay row
\tsay "done"
`
    // the `if`'s and the `for`'s along the bottom of their last line, words under it;  the action's in the blank line
    expect(feetOf(text)).toEqual([
      {
        under: "\t\t\tsay row",
        placement: "above",
        feet: [
          { column: 2, partOfSpeech: "control", isGroup: false },
          { column: 1, partOfSpeech: "control", isGroup: false }
        ]
      },
      { under: '\tsay "done"', placement: "blank", feet: [{ column: 0, partOfSpeech: "action", isGroup: false }] }
    ])
  })

  test("a group ending its type's body:  ONE foot for both, the group's, in its type's hue (I125)", () => {
    const text = `a "card" is a view
\tgroup "Drawing"
\tto draw it
\t\tsay "hi"
`
    // the action's foot, then the group's at the card's column, in the card's rail's hue:  the card's own is the group's
    expect(feetOf(text)).toEqual([
      {
        under: '\t\tsay "hi"',
        placement: "blank",
        feet: [
          { column: 1, partOfSpeech: "action", isGroup: false },
          { column: 0, partOfSpeech: "thing", isGroup: true }
        ]
      }
    ])
  })

  test("a block's rail stops short on its last line, for its foot's corner;  every rail ending there (P7)", () => {
    const text = `to deal
\tfor row from 1 to 7
\t\tif row is 1
\t\t\tsay row
\tsay "done"
`
    // the action's, the `for`'s and the `if`'s rails:  the two ending on `say row` stop short there, not the action's
    expect(stoppedRailsOf(text).get("\t\t\tsay row")).toBe("100% 100%, STOPPED, STOPPED")
  })
})

describe("CodeMirrorBubbly's feet take no room (P7)", () => {
  test("in the blank line under their block;  over the line under it when it has words;  in the file's last line", () => {
    const text = `a "card" is a view
\tits "color" is
\t\tblue if it is face down
\tits "picture" is
\t\tsay "hi"

\tto turn it over
\t\tif it is face up
\t\t\tsay "down"
\t\tsay "flipped"`
    expect(feetOf(text).map(({ under, placement }) => ({ under, placement }))).toEqual([
      // `its "picture" is` right under it
      { under: "\t\tblue if it is face down", placement: "above" },
      // a blank line under it
      { under: '\t\tsay "hi"', placement: "blank" },
      // a plain line under it
      { under: '\t\t\tsay "down"', placement: "above" },
      // the end of the file:  the action's and the card's, from the last line itself
      { under: '\t\tsay "flipped"', placement: "end" }
    ])
  })

  test("typing steadily:  the worker's drawing of an earlier key marks the screen at once, moved along the keys since (J70)", () => {
    const client = { answersOnPage: () => false } as unknown as LanguageClient
    const file = { language: SP.Language.for("en") } as unknown as SP.SpellFile
    const language = new CodeMirrorLanguage({
      service: {} as LSP.SpellLanguageService,
      client,
      file,
      parseNow: () => {}
    })
    const parsed = (version: number, text: string) => {
      const { text: _text, ...drawing } = SP.BubblyLayout.of(text)
      return { uri: "spell:/x", version, diagnostics: [], fixItStarts: [], folds: [], types: [], views: [], drawing }
    }
    /** What a layout marks of `state`'s text on screen, all of it:  each mark's text, through the edits since. */
    const marked = (state: EditorState) => {
      const laidOut = CodeMirrorBubbly.laidOutElsewhere(state, language.elsewhere)!
      const back = laidOut.editsSince?.invertedDesc
      const to = back ? back.mapPos(state.doc.length, 1) : state.doc.length
      const marks = laidOut.marksIn!({ from: 0, to })
      const moved = laidOut.editsSince ? marks.map(laidOut.editsSince) : marks
      const texts: string[] = []
      moved.between(
        0,
        state.doc.length,
        (from, end) => void (end > from && texts.push(state.doc.sliceString(from, end)))
      )
      return { laidOut, texts }
    }
    const start = "a card is a thing\n\tits suit is a text\n"
    const opened = EditorState.create({ doc: start })
    language.tookParse(parsed(0, start) as LSP.LanguageParsed, opened.doc)
    // a member typed and sent to the worker;  its parse comes after the next edit, a line above
    const typed = opened.update({ changes: { from: start.length, insert: "\tits rank is a number\n" } }).state
    const next = typed.update({ changes: { from: 0, insert: "-- note\n" } })
    language.tookParse(parsed(1, typed.doc.toString()) as LSP.LanguageParsed, typed.doc, {
      doc: next.state.doc,
      changes: next.changes
    })
    const { laidOut, texts } = marked(next.state)
    // only the marks are new:  the whole file's part waits for a drawing of this very text
    expect(laidOut.keepsDecorations).toBe(true)
    // the member's words marked, where they are now;  the note typed since, not yet
    expect(texts).toContain("rank")
    expect(texts.some((it) => it.includes("note"))).toBe(false)
  })

  test("no block widget, nothing with a height of its own:  every line one line tall", () => {
    const text = `to deal
\tif it is face up
\t\tsay "down"
\tsay "done"
`
    let blocks = 0
    CodeMirrorBubbly.decorationsOf(EditorState.create({ doc: text })).between(0, text.length, (_from, _to, value) => {
      if ((value.spec as { block?: boolean }).block) blocks++
    })
    expect(blocks).toBe(0)
  })
})

/**
 * Each line's feet `text` draws, in order:  the last line of the blocks they end (`under`), where they're drawn, and
 * each foot, innermost first.
 */
function feetOf(text: string) {
  const state = EditorState.create({ doc: text })
  const feet: Array<{ under: string; placement: string; feet: readonly Foot[] }> = []
  CodeMirrorBubbly.decorationsOf(state).between(0, text.length, (from, _to, decoration) => {
    const widget = (decoration.spec as { widget?: FeetWidget }).widget
    if (!widget || !("placement" in widget)) return
    const line = state.doc.lineAt(from)
    const under = widget.placement === "end" ? line : state.doc.line(line.number - 1)
    feet.push({ under: under.text, placement: widget.placement, feet: widget.feet })
  })
  return feet
}

/** What a feet widget says of itself. */
type FeetWidget = { feet: readonly Foot[]; placement: string }

/** A foot, as a feet widget lists it. */
type Foot = { column: number; partOfSpeech: string; isGroup: boolean }

/** Each line's rail sizes, outermost first, by its text:  `STOPPED` for one stopping short. */
function stoppedRailsOf(text: string): Map<string, string> {
  const state = EditorState.create({ doc: text })
  const sizes = new Map<string, string>()
  CodeMirrorBubbly.decorationsOf(state).between(0, text.length, (from, to, decoration) => {
    const style = (decoration.spec as { attributes?: Record<string, string> }).attributes?.style ?? ""
    const rails = /--cmb-rail-sizes: (.*)$/.exec(style)?.[1]
    if (from !== to || !rails) return
    // in the stripes' order, innermost first
    const outermostFirst = [...rails.matchAll(/100% 100%|100% max|0 0/g)].map(([size]) => size).reverse()
    sizes.set(
      state.doc.lineAt(from).text,
      outermostFirst.map((size) => (size === "100% max" ? "STOPPED" : size)).join(", ")
    )
  })
  return sizes
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
    const spec = decoration.spec as { class?: string; widget?: FeetWidget; attributes?: Record<string, string> }
    const classes = spec.class?.split(" ") ?? []
    if (spec.widget && "placement" in spec.widget) feet += spec.widget.feet.length
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
      const spec = decoration.spec as { class?: string; widget?: FeetWidget; attributes?: Record<string, string> }
      const style = spec.attributes?.style ?? ""
      if (spec.widget && "placement" in spec.widget) feet.push(...spec.widget.feet.map((foot) => foot.column))
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
