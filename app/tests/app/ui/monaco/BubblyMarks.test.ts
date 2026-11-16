import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { BubblyMarks, type BubblyShape } from "spell/app/app/ui/monaco/BubblyMarks"
import type { MarkupShape } from "spell/app/app/ui/MarkupMarks"

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
    expect(wordsMarked(marks, "bubbly-reference")).toEqual(["draggable two sided view", "draw", "front", "rank"])
    expect(wordsMarked(marks, "bubbly-choice")).toEqual(["ace", "jack", "queen", "king"])
    expect(wordsMarked(marks, "bubbly-name")).toEqual(["card", "Rank", "rank"])
    // a drawing's tags marked as HTML's are (`MarkupMarks`)
    expect(wordsMarked(marks, "bubbly-tag-name")).toEqual(["text", "text"])
    for (const mark of marks.marks)
      if (mark.options.inlineClassName) expect(mark.options.inlineClassName).toMatch(/^bubbly-piece\b/)
  })

  test("an action's head:  ONE pill, its blanks' kind words bold over it (epic `language` I109)", () => {
    const text = 'a "card" is a thing\nsolitaire is an app\n\tto play a card\n\t\tprint 1\n'
    const marks = marked(text)
    expect(wordsMarked(marks, "bubbly-input", text)).toEqual(["card", "solitaire", "play a card"])
    expect(wordsMarked(marks, "bubbly-reference", text)).toEqual(["thing", "app", "card"])
    expect(shapesOf(marks, text).filter((line) => line.trim().startsWith("input:"))).toHaveLength(3)
  })

  test("a head's description:  a spacer of its own before it, its `--` an em dash;  a `{…}`'s braces darker (Owen)", () => {
    const text = `a "card" is a view\t\t-- A playing card\n\t-- Its rank and suit\n\tto draw it\n\t\t<text>{its rank}</text>\n`
    const marks = marked(text)
    const card = marks.shapes[0]!
    if (card.kind !== "block") throw new TypeError("expected the card's block first")
    const { range } = marks.marks[card.description!.place]!
    expect(text.split("\n")[0]!.slice(range.startColumn - 1, range.endColumn - 1)).toBe("-- A playing card")
    expect(card.description!.spacer).toBe("bubbly-description-0")
    const spacers = marks.marks.filter((mark) => mark.options.before?.inlineClassName?.includes("bubbly-description-0"))
    expect(spacers).toHaveLength(1)
    // every description's `--`, its own line's too, an em dash over it
    expect(wordsMarked(marks, "bubbly-dash", text)).toEqual(["--", "--"])
    expect(wordsMarked(marks, "bubbly-brace", text)).toEqual(["{", "}"])
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

  test("a line of its own in a body of declarations:  a head's room before it too, so it sits in the body, not on its rail (epic `language` I95)", () => {
    const text = [
      'group "The piles"',
      "// Each kind of pile",
      'a "pile" is a list of cards',
      "\t// The cards not played yet",
      "\tit can never take a card",
      "\tto deal",
      "\t\t// a step's note:  an action's body is steps, no room"
    ].join("\n")
    const lines = text.split("\n")
    const roomBefore = marked(text)
      .marks.filter((mark) => mark.options.before?.inlineClassName === "bubbly-spacer bubbly-head-spacer")
      .map(({ range }) => lines[range.startLineNumber - 1]!.trim())
    expect(roomBefore).toEqual(expect.arrayContaining(["// Each kind of pile", "// The cards not played yet"]))
    expect(roomBefore).not.toContain("// a step's note:  an action's body is steps, no room")
  })

  test("a top-level head's bare name:  its pill starts past the head's room, as even either side as any pill (epic `language` I84)", () => {
    const text = `solitaire is an app\n\t"deck" is a new deck\na deck is a list of cards\n`
    const marks = marked(text)
    const pills: string[] = []
    const walk = (shapes: Array<BubblyShape | MarkupShape>) => {
      for (const shape of shapes) {
        if (shape.kind === "block") walk(shape.inside)
        else if (shape.kind === "input") {
          const { range } = marks.marks[shape.place]!
          const words = text.split("\n")[range.startLineNumber - 1]!.slice(range.startColumn - 1, range.endColumn - 1)
          pills.push(`${words}${shape.afterHeadSpacer ? " (after the head's room)" : ""}`)
        }
      }
    }
    walk(marks.shapes)
    // only a name at the head's very start shares its column with the head's room;  a quoted one starts past its `"`
    expect(pills).toEqual(["solitaire (after the head's room)", "deck", "deck"])
  })

  test("its shapes:  a band per declaration and per control line with steps, pills on what was typed, a line under each question", () => {
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
      // a drawing's head:  its verb and its part bold, no pill (epic `language` I99)
      "    action:  to draw its front",
      "      control:  if it is face up",
      // ONE shape under the whole question, not a mark per piece:  its dots run on (epic `language` T136)
      "        underline:  it is face up",
      '        tag-link:  <text color="blue">{its rank}</text>',
      '        tag:  <text color="blue">{its rank}</text>',
      '        input:  blue">{its rank}</text>',
      "        input:  {its rank}</text>",
      "        tag:  </text>"
    ])
  })
})

describe("BubblyMarks, a rule's roles and SP.BubblyPresentation", () => {
  const { rules } = SP.BubblyPresentation as unknown as { rules: Record<string, SP.BubblyRulePresentation> }
  const saved = rules.define_property_has
  // its roles are its class's, every language's:  on its prototype
  const [rule] = (SP.spellParser.rules.define_property_has as unknown as { rules: object[] }).rules
  const roles = Object.getPrototypeOf(rule) as { roles?: SP.BubblyRuleRoles }
  const savedRoles = roles.roles

  afterEach(() => {
    rules.define_property_has = saved!
    roles.roles = savedRoles
  })

  test("changing one rule's roles and row changes what Monaco draws for it", () => {
    const text = `a "card" is a view\n\tits "rank" is one of ace, king\n`
    expect(shapesOf(marked(text), text)[2]).toBe('  property pill:  its "rank" is one of ace, king')
    expect(wordsMarked(marked(text), "bubbly-choice", text)).toEqual(["ace", "king"])

    // a property's head drawn as a thing's, and its values no longer pills of their own
    roles.roles = { band: "thing", property: "declaration" }
    rules.define_property_has = {}
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
