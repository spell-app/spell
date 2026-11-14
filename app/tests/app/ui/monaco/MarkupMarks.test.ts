import { describe, expect, test } from "vite-plus/test"

import { BubblyMarkup } from "spell/app/app/components/spell-code/BubblyMarkup"
import { MarkupMarks, type MarkupShape } from "spell/app/app/ui/monaco/MarkupMarks"

/** A page, as the drawn-bubbly page's examples are. */
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>A demo</title>
  </head>
  <body>
    <h2>Two <code>x</code></h2>
    <spell-viewer id="a"></spell-viewer>
  </body>
</html>
`

/** The text each mark whose classes include `classes` covers, in order. */
function textMarked(marks: MarkupMarks, classes: string): string[] {
  const lines = PAGE.split("\n")
  return marks.marks
    .filter((mark) => mark.options.inlineClassName?.split(" ").includes(classes))
    .map(({ range }) => lines[range.startLineNumber - 1]!.slice(range.startColumn - 1, range.endColumn - 1))
}

/** Every shape, those inside a block too, as `kind:  its first line's text` lines;  `text`:  what it marked. */
function shapesOf(marks: MarkupMarks, text = PAGE): string[] {
  const lines = text.split("\n")
  const out: string[] = []
  const walk = (shapes: MarkupShape[], depth: number) => {
    for (const shape of shapes) {
      const { range } = marks.marks[shape.place]!
      const text = lines[range.startLineNumber - 1]!.slice(range.startColumn - 1).trim()
      const what =
        shape.kind === "markup-block"
          ? `block ${shape.partOfSpeech}${shape.foot === undefined ? "" : shape.isThinFoot ? " +thin foot" : " +foot"}`
          : shape.kind === "tag"
            ? `${shape.isAlone ? "band" : "pill"} ${shape.side} ${shape.room?.join("+") ?? ""}`.trim()
            : shape.kind === "tag-link"
              ? `link ${shape.room.join("+")}`.trim()
              : "input"
      out.push(`${"  ".repeat(depth)}${what}:  ${text.slice(0, 24)}`)
      if (shape.kind === "markup-block") walk(shape.inside, depth + 1)
    }
  }
  walk(marks.shapes, 0)
  return out
}

describe("MarkupMarks", () => {
  test("blocks for elements on lines of their own, bands for tags alone, pills for tags in a line", () => {
    expect(shapesOf(MarkupMarks.of(PAGE))).toEqual([
      "band start:  <!doctype html>",
      'block structure +foot:  <html lang="en">',
      '  input:  en">',
      "  block plain +foot:  <head>",
      '    band start:  <meta charset="UTF-8" />',
      '    input:  UTF-8" />',
      "    link:  <title>A demo</title>",
      "    pill start:  <title>A demo</title>",
      "    pill end tag:  </title>",
      "  block structure +foot:  <body>",
      "    link:  <h2>Two <code>x</code></",
      "    pill start:  <h2>Two <code>x</code></",
      "    link tag:  <code>x</code></h2>",
      "    pill start tag:  <code>x</code></h2>",
      "    pill end tag:  </code></h2>",
      "    pill end tag+tag:  </h2>",
      '    pill start:  <spell-viewer id="a"></s',
      '    input:  a"></spell-viewer>',
      "    pill end touch+touch:  </spell-viewer>"
    ])
  })

  test("a tag's brackets, names and values marked as the page draws them", () => {
    const marks = MarkupMarks.of(PAGE)
    expect(textMarked(marks, "bubbly-angle-open").slice(0, 3)).toEqual(["<", "<", "<"])
    expect(textMarked(marks, "bubbly-tag-name").slice(0, 4)).toEqual(["html", "head", "meta", "title"])
    expect(textMarked(marks, "bubbly-attribute-name")).toEqual(["lang", "charset", "id"])
    expect(textMarked(marks, "bubbly-input")).toEqual(["en", "UTF-8", "a"])
    expect(textMarked(marks, "bubbly-slash")).toContain("/")
  })

  test("a block's end tag's name faint, as its marks are;  a tag in a line's not", () => {
    const marks = MarkupMarks.of(PAGE)
    const faintNames = marks.marks
      .filter((mark) =>
        /bubbly-mark .*bubbly-tag-name|bubbly-tag-name .*bubbly-mark/.test(mark.options.inlineClassName ?? "")
      )
      .map(({ range }) => PAGE.split("\n")[range.startLineNumber - 1]!.trim())
    expect(faintNames).toEqual(["</head>", "</body>", "</html>"])
  })

  test("a spacer before each line of text, none before one that starts with a tag", () => {
    const text = `<div>\n  some words\n  <b>bold</b>\n</div>\n`
    const marks = MarkupMarks.of(text)
    const lineSpacers = marks.marks.filter((mark) =>
      mark.options.before?.inlineClassName?.includes("bubbly-line-spacer")
    )
    expect(lineSpacers.map(({ range }) => range.startLineNumber)).toEqual([2])
  })

  test("a block's start and end tags a spacer in from its band's end, in an HTML file and a Spell drawing alike", () => {
    const html = `<div>\n  <p>words</p>\n</div>\n`
    const spell = `to draw it\n\t<grid>\n\t\t<text>hi</text>\n\t</>\n`
    const spacers = (marks: MarkupMarks, kind: string) =>
      marks.marks
        .filter((mark) => mark.options.before?.inlineClassName?.includes(`bubbly-${kind}-spacer`))
        .map(({ range }) => range.startLineNumber)
    const inHtml = MarkupMarks.of(html)
    const inSpell = MarkupMarks.within(spell, spell.indexOf("<grid>"), spell.length, [])
    expect([spacers(inHtml, "tag-head"), spacers(inHtml, "tag-foot")]).toEqual([[1], [3]])
    expect([spacers(inSpell, "tag-head"), spacers(inSpell, "tag-foot")]).toEqual([[2], [4]])
  })

  test("a start tag on lines of its own is one tall shape, its `>` alone on the last line a short tail (T118)", () => {
    const text = `<spell-editor
  project="a"
  toolbar
></spell-editor>
<meta
  name="x" />
`
    const marks = MarkupMarks.of(text)
    const tags = marks.shapes.filter((shape) => shape.kind === "tag")
    const lineSpan = tags.map(({ place }) => {
      const { range } = marks.marks[place]!
      return `${range.startLineNumber}-${range.endLineNumber}`
    })
    // its start tag lines 1-4, its end tag a pill on line 4;  `<meta` lines 5-6, a band alone
    expect(lineSpan).toEqual(["1-4", "4-4", "5-6"])
    expect(tags.map((shape) => shape.kind === "tag" && !!shape.isShortTail)).toEqual([true, false, false])
    // an attribute that starts its line has no room before it:  its indent is its room, as on the page
    const spaced = marks.marks.filter((mark) =>
      mark.options.before?.inlineClassName?.includes("bubbly-attribute-spacer")
    )
    expect(spaced).toEqual([])
  })

  test("a nameless end tag on its own line ends its block in a thin foot;  a named one in a band (Q58)", () => {
    const text = `<context-menu>
  <action "cheat"/>
</>
<grid>
  <spacer/>
</grid>
`
    expect(shapesOf(MarkupMarks.of(text), text).filter((line) => line.startsWith("block"))).toEqual([
      "block structure +thin foot:  <context-menu>",
      "block structure +foot:  <grid>"
    ])
  })

  test("a tag's part of speech:  structure blue, actions and a menu's items green (Owen, 2026-11-14)", () => {
    const partsOf = (tags: string) => tags.split(" ").map((tag) => `${tag} ${BubblyMarkup.partOfSpeechOf(tag)}`)
    expect(partsOf("container segment toolbar menu context-menu div ui-grid")).toEqual([
      "container structure",
      "segment structure",
      "toolbar structure",
      "menu structure",
      "context-menu structure",
      "div structure",
      "ui-grid structure"
    ])
    expect(partsOf("button buttons action ui-action item")).toEqual([
      "button action",
      "buttons action",
      "action action",
      "ui-action action",
      "item action"
    ])
    // text stays a property;  a custom element a thing;  the head plain;  HTML's header a box, Spell UI's a heading
    expect(partsOf("text spell-editor head title header ui-header")).toEqual([
      "text property",
      "spell-editor thing",
      "head plain",
      "title plain",
      "header structure",
      "ui-header property"
    ])
  })
})
