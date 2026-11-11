import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { BubblyMarks, type BubblyShape } from "spell/app/app/ui/monaco/BubblyMarks"

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
  const walk = (shapes: BubblyShape[], depth: number) => {
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
    expect(wordsMarked(marks, "bubbly-tag")).toEqual(["text", "text"])
    for (const mark of marks.marks)
      if (mark.options.inlineClassName) expect(mark.options.inlineClassName).toMatch(/^bubbly-piece\b/)
  })

  test("a quoted input:  its own marks see-through, room outside them, room either side of its words", () => {
    const marks = marked()
    expect(wordsMarked(marks, "bubbly-quote-open").slice(0, 2)).toEqual(['"', '"'])
    const card = marks.marks.find((mark) => mark.options.inlineClassName?.includes("bubbly-name"))!
    expect(card.options.before).toMatchObject({ inlineClassName: "bubbly-room bubbly-room-input", cursorStops: 1 })
    expect(card.options.after).toMatchObject({ inlineClassName: "bubbly-room bubbly-room-input", cursorStops: 2 })
    const open = marks.marks.find((mark) => mark.options.inlineClassName?.includes("bubbly-quote-open"))!
    expect(open.options.before).toMatchObject({ inlineClassName: "bubbly-room bubbly-room-quote" })
  })

  test("a group's members written at its indent:  room before each of their lines, their bodies' too", () => {
    const text = [
      `a "card" is a view`,
      `\tgroup "Suit"`,
      `\tits "suit" is one of clubs, hearts`,
      `\t\tit "is a (suit)"`,
      ``,
      `\tgroup "Names"`,
      `\t\t// what a person reads`,
      `\tits "name" is its suit`,
      `\tgroup "Inner"`,
      `\tit "is red" if it is a heart`,
      ``
    ].join("\n")
    const marks = BubblyMarks.of(SP.BubblyLayout.of(text), 3)
    const pushed = marks.pushes.map((index) => {
      const { range, options } = marks.marks[index]!
      expect(range.startColumn).toBe(range.endColumn)
      expect(options).toMatchObject({
        showIfCollapsed: true,
        before: { inlineClassName: "bubbly-room bubbly-room-push" }
      })
      return `${range.startLineNumber}:${range.startColumn} ${options.before!.content.length}`
    })
    // one indent step each, a tab of 3:  a choice under a member too;
    // not the blank line, nor a comment written deeper, nor the next group, a member's peer
    expect(pushed.toSorted()).toEqual(["10:2 3", "3:2 3", "4:3 3", "8:2 3"])
  })

  test("its shapes:  a band per declaration, pills on what was typed, a bracket down a control line's steps", () => {
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
      "      bracket:  if it is face up",
      '      input:  blue">{its rank}</text>'
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
    for (const each of ["bubbly-room-input", "bubbly-room-quote", "bubbly-layer", "bubbly-shapes", "bubbly-head"])
      classes.add(each)
    for (const each of ["bubbly-pill", "bubbly-gutter", "bubbly-body", "bubbly-foot", "bubbly-bracket"])
      classes.add(each)
    for (const each of classes) expect(sheet, each).toContain(`.${each}`)
  })

  test("Monaco's own rules are one marked section, at its end", () => {
    const marker = "Monaco's own rules (epic `language` P50)"
    expect(sheet.split(marker)).toHaveLength(2)
    expect(sheet.indexOf(marker)).toBeGreaterThan(sheet.indexOf(".bubbly-caption"))
  })
})
