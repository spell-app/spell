import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { BubblyMarks, type BubblyShape } from "spell/app/app/ui/monaco/BubblyMarks"
import type { MarkupShape } from "spell/app/app/ui/monaco/MarkupMarks"

/** A card, as Solitaire's starts. */
const CARD = `a "card" is a draggable two sided view
\tgroup "Rank"
\tits "rank" is one of ace, jack, queen, king
\tto draw its front
\t\tif it is face up
\t\t\t<text color="blue">{its rank}</text>
`

/** `text` laid out and marked. */
const marked = (text = CARD) => BubblyMarks.of(SP.BubblyLayout.of(text))

/** The words each mark with `classes` covers, in order. */
function wordsMarked(marks: BubblyMarks, classes: string, text = CARD): string[] {
  const lines = text.split("\n")
  return marks.marks
    .filter((mark) => mark.options.inlineClassName?.split(" ").includes(classes))
    .map(({ range }) => lines[range.startLineNumber - 1]!.slice(range.startColumn - 1, range.endColumn - 1))
}

/** Every shape, those inside others too, as `kind:what` lines. */
function shapesOf(marks: BubblyMarks, text = CARD): string[] {
  const lines = text.split("\n")
  const out: string[] = []
  const walk = (shapes: Array<BubblyShape | MarkupShape>, depth: number) => {
    for (const shape of shapes) {
      const { range } = marks.marks[shape.place]!
      const first = lines[range.startLineNumber - 1]!.slice(range.startColumn - 1)
      const what = shape.kind === "block" ? `${shape.partOfSpeech}${shape.hasBody ? "" : " pill"}` : shape.kind
      out.push(`${"  ".repeat(depth)}${what}:  ${first.trim()}`)
      if (shape.kind === "block") walk(shape.inside, depth + 1)
    }
  }
  walk(marks.shapes, 0)
  return out
}

describe("BubblyMarks.of()", () => {
  test("marks each piece in the page's classes, every one a bubbly-piece", () => {
    const marks = marked()
    expect(wordsMarked(marks, "bubbly-reference")).toEqual(["two sided view", "rank"])
    expect(wordsMarked(marks, "bubbly-choice")).toEqual(["ace", "jack", "queen", "king"])
    expect(wordsMarked(marks, "bubbly-name")).toEqual(["card", "Rank", "rank"])
    // a drawing's tags marked as HTML's are (`MarkupMarks`)
    expect(wordsMarked(marks, "bubbly-tag-name")).toEqual(["text", "text"])
    for (const mark of marks.marks)
      if (mark.options.inlineClassName) expect(mark.options.inlineClassName).toMatch(/^bubbly-piece\b/)
  })

  test("a quoted input:  its own marks see-through, room outside them, room either side of its words", () => {
    const marks = marked()
    expect(wordsMarked(marks, "bubbly-quote-open").slice(0, 2)).toEqual(['"', '"'])
    const card = marks.marks.find((mark) => mark.options.inlineClassName?.includes("bubbly-name"))!
    expect(card.options.before).toMatchObject({
      inlineClassName: "bubbly-spacer bubbly-input-spacer bubbly-spacer-before",
      cursorStops: 1
    })
    expect(card.options.after).toMatchObject({
      inlineClassName: "bubbly-spacer bubbly-input-spacer bubbly-spacer-after",
      cursorStops: 2
    })
    const open = marks.marks.find((mark) => mark.options.inlineClassName?.includes("bubbly-quote-open"))!
    expect(open.options.before).toMatchObject({
      inlineClassName: "bubbly-spacer bubbly-quote-spacer bubbly-spacer-before"
    })
  })

  test("room before each head line's words:  before its indent's last tab, or its first word at the top level", () => {
    const lines = CARD.split("\n")
    const heads = marked()
      .marks.filter((mark) => mark.options.before?.inlineClassName === "bubbly-spacer bubbly-head-spacer")
      .map(({ range, options }) => {
        expect(options.before!.content).toBe("    ")
        return `${lines[range.startLineNumber - 1]!.trim()} @${range.startColumn}-${range.endColumn}`
      })
    expect(heads).toEqual([
      'a "card" is a draggable two sided view @1-1',
      'group "Rank" @1-2',
      'its "rank" is one of ace, jack, queen, king @1-2',
      "to draw its front @1-2",
      "if it is face up @2-3"
    ])
  })

  test("its shapes:  a band per declaration and per control line with steps, pills on what was typed", () => {
    expect(shapesOf(marked())).toEqual([
      'thing:  a "card" is a draggable two sided view',
      '  input:  card" is a draggable two sided view',
      '  plain:  group "Rank"',
      '    input:  Rank"',
      '    property pill:  its "rank" is one of ace, jack, queen, king',
      '      input:  rank" is one of ace, jack, queen, king',
      "      input:  ace, jack, queen, king",
      "      input:  jack, queen, king",
      "      input:  queen, king",
      "      input:  king",
      "    action:  to draw its front",
      "      input:  draw its front",
      "      control:  if it is face up",
      '        tag-link:  <text color="blue">{its rank}</text>',
      '        tag:  <text color="blue">{its rank}</text>',
      '        input:  blue">{its rank}</text>',
      "        tag:  </text>"
    ])
  })
})

describe("BubblyMarks and SP.BubblyPresentation", () => {
  const { rules } = SP.BubblyPresentation as unknown as { rules: Record<string, SP.BubblyRulePresentation> }
  const saved = rules.define_property_has

  afterEach(() => {
    rules.define_property_has = saved!
  })

  test("changing one rule's row changes what Monaco draws for it", () => {
    const text = `a "card" is a view\n\tits "rank" is one of ace, king\n`
    expect(shapesOf(marked(text), text)[2]).toBe('  property pill:  its "rank" is one of ace, king')
    expect(wordsMarked(marked(text), "bubbly-choice", text)).toEqual(["ace", "king"])

    // a property's head drawn as a thing's, and its values no longer pills of their own
    rules.define_property_has = { head: "thing", inputs: ["quoted_member"] }
    const after = marked(text)
    expect(shapesOf(after, text)[2]).toBe('  thing pill:  its "rank" is one of ace, king')
    expect(wordsMarked(after, "bubbly-choice", text)).toEqual([])
  })
})

describe("bubbly.css", () => {
  const sheet = readFileSync(
    createRequire(import.meta.url).resolve("spell/app/app/components/spell-code/bubbly.css"),
    "utf8"
  )

  test("styles every class Monaco's marks and shapes use:  the look lives in the one sheet", () => {
    const classes = new Set<string>()
    for (const mark of marked().marks)
      for (const each of mark.options.inlineClassName?.split(" ") ?? []) classes.add(each)
    for (const each of [
      "bubbly-input-spacer",
      "bubbly-quote-spacer",
      "bubbly-layer",
      "bubbly-shapes",
      "bubbly-head-pill"
    ])
      classes.add(each)
    for (const each of ["bubbly-pill", "bubbly-gutter", "bubbly-body", "bubbly-foot", "bubbly-control"])
      classes.add(each)
    for (const each of classes) expect(sheet, each).toContain(`.${each}`)
  })

  test("the editor's rules sit beside the page's, never doubled;  what only the editor has, one section at its end", () => {
    // each difference right after its page rule, inside `.bubbly`
    expect(sheet).not.toContain(".bubbly.bubbly-monaco")
    expect(sheet).not.toContain(".view-line .bubbly-quote-mark")
    const quoteMark = sheet.indexOf(".bubbly-quote-close::after {")
    expect(sheet.indexOf("&.bubbly-monaco {", quoteMark)).toBeLessThan(
      sheet.indexOf(":is(.bubbly-head-pill, .bubbly-pill).bubbly-ends-input")
    )
    // what has no page twin:  one marked section, the last in `.bubbly`
    const marker = "what only the editor has (epic `language` P50)"
    expect(sheet.split(marker)).toHaveLength(2)
    expect(sheet.indexOf(marker)).toBeGreaterThan(sheet.indexOf(".bubbly-taghead {"))
    expect(sheet.indexOf(marker)).toBeLessThan(sheet.indexOf(".bubbly-caption"))
  })
})
