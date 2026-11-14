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
          ? `block ${shape.partOfSpeech}${shape.foot === undefined ? "" : " +foot"}`
          : shape.kind === "tag"
            ? `${shape.isAlone ? "band" : "pill"} ${shape.side} ${shape.room?.join("+") ?? ""}`.trim()
            : shape.kind === "tag-link"
              ? `link ${shape.start.side} to ${shape.end.side}`
              : shape.isExpression
                ? `expression ${shape.inTag}`
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
      "    link start to end:  <title>A demo</title>",
      "    pill start:  <title>A demo</title>",
      "    pill end tag:  </title>",
      "  block structure +foot:  <body>",
      "    link start to end:  <h2>Two <code>x</code></",
      "    pill start:  <h2>Two <code>x</code></",
      "    link start to end:  <code>x</code></h2>",
      "    pill start tag:  <code>x</code></h2>",
      "    pill end tag:  </code></h2>",
      "    pill end tag+tag:  </h2>",
      '    pill start:  <spell-viewer id="a"></s',
      '    input:  a"></spell-viewer>'
    ])
  })

  test("a one-line element's link runs between its two pills:  from its start tag's to its end tag's (Owen)", () => {
    const text = "<text>{its picture}</text>"
    const marks = MarkupMarks.of(text)
    const link = marks.shapes[0]!
    if (link.kind !== "tag-link") throw new TypeError("expected a link first, under the pills")
    const textOf = (place: number) => {
      const { range } = marks.marks[place]!
      return text.slice(range.startColumn - 1, range.endColumn - 1)
    }
    expect([textOf(link.start.place), textOf(link.end.place)]).toEqual(["<text>", "</text>"])
  })

  test("a `{…}` value:  an inverted pill in its tag's colour, its braces darker;  its words Spell's to mark (Owen)", () => {
    const spell = `to draw it\n\t<text color={its color}>{its picture}</text>`
    const marks = MarkupMarks.within(spell, spell.indexOf("<text"), spell.length, [])
    expect(shapesOf(marks, spell)).toEqual([
      "link start to end:  <text color={its color}>",
      "pill start:  <text color={its color}>",
      "expression property:  its color}>{its picture}",
      "pill end tag:  </text>"
    ])
    const braces = marks.marks.filter((mark) => /bubbly-brace/.test(mark.options.inlineClassName ?? ""))
    expect(braces.map(({ range }) => spell.split("\n")[1]!.slice(range.startColumn - 1, range.endColumn - 1))).toEqual([
      "{",
      "}"
    ])
    // the tag's marks stop at the value:  Spell marks what's in it
    expect(marks.tags.map(({ start, end }) => spell.slice(start, end))).toEqual(["<text color=", ">", "</text>"])
  })

  test("a tag that declares the member it draws:  its shape and its brackets and `/` marked to be drawn round;  any other tag's not (epic `editor` I84)", () => {
    const spell = `to draw it\n\t<number "score"/>\n\t<action "redo"/>\n\t<column "C1"></column>`
    const declaringTags = [spell.indexOf("<number"), spell.indexOf("<column")]
    const marks = MarkupMarks.within(spell, spell.indexOf("<number"), spell.length, [], { declaringTags })
    const lines = spell.split("\n")
    const tagsDeclaring = marks.shapes
      .filter((shape) => shape.kind === "tag" && shape.declares)
      .map(({ place }) => lines[marks.marks[place]!.range.startLineNumber - 1]!.trim())
    expect(tagsDeclaring).toEqual(['<number "score"/>', '<column "C1"></column>'])
    const marked = marks.marks
      .filter((mark) => /bubbly-tag-declares/.test(mark.options.inlineClassName ?? ""))
      .map(
        ({ range }) =>
          `${range.startLineNumber}:${lines[range.startLineNumber - 1]!.slice(range.startColumn - 1, range.endColumn - 1)}`
      )
    // `<column "C1"></column>`, drawn as if self-closed (Q62):  its start tag's `>` hidden, its end tag's `/>` drawn
    expect(marked).toEqual(["2:<", "2:/", "2:>", "4:<", "4:/", "4:>"])
  })

  test('no space after a tag\'s quoted word:  `<deck "deck"hidden />` marked as `<deck "deck" hidden/>` is (epic `language` T125)', () => {
    const markedIn = (tag: string) => {
      const spell = `to draw it\n\t${tag}`
      const marks = MarkupMarks.within(spell, spell.indexOf("<"), spell.length, [], {
        declaringTags: [spell.indexOf("<")]
      })
      const line = spell.split("\n")[1]!
      // each piece's mark, not the whole tag's
      return marks.marks
        .filter(({ options }) => options.inlineClassName)
        .map(({ range, options }) => [
          options.inlineClassName,
          line.slice(range.startColumn - 1, range.endColumn - 1).trim()
        ])
    }
    const joined = markedIn('<deck "deck"hidden />')
    expect(joined).toEqual(markedIn('<deck "deck" hidden/>'))
    expect(joined).toContainEqual([expect.stringContaining("bubbly-attribute-name"), "hidden"])
    expect(BubblyMarkup.write('<deck "deck"hidden />')).toBe(BubblyMarkup.write('<deck "deck" hidden/>'))
  })

  test("a tag's brackets, names and values marked as the page draws them", () => {
    const marks = MarkupMarks.of(PAGE)
    expect(textMarked(marks, "bubbly-angle-open").slice(0, 3)).toEqual(["<", "<", "<"])
    expect(textMarked(marks, "bubbly-tag-name").slice(0, 4)).toEqual(["html", "head", "meta", "title"])
    expect(textMarked(marks, "bubbly-attribute-name")).toEqual(["lang", "charset", "id"])
    expect(textMarked(marks, "bubbly-input")).toEqual(["en", "UTF-8", "a"])
    expect(textMarked(marks, "bubbly-slash")).toContain("/")
  })

  test("every end tag's `/` drawn as a bar after its `⟨`, `⟨|title⟩`, in the editor and on the page (Owen)", () => {
    const marks = MarkupMarks.of(PAGE)
    // `</spell-viewer>` drawn self-closed, `/⟩`:  not one
    expect(textMarked(marks, "bubbly-end-slash")).toHaveLength(6)
    expect(BubblyMarkup.write(PAGE).match(/bubbly-end-slash/g)).toHaveLength(6)
    // a self-closed tag's `/` isn't an end tag's
    expect(BubblyMarkup.write("<br />")).not.toContain("bubbly-end-slash")
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

  test("a block's start and end tags a spacer in from its band's end, in an HTML file and a Spell drawing alike;  a `</>` its own, its glyph at its pill's right end", () => {
    const html = `<div>\n  <p>words</p>\n</div>\n`
    const spell = `to draw it\n\t<grid>\n\t\t<text>hi</text>\n\t</>\n`
    const spacers = (marks: MarkupMarks, kind: string) =>
      marks.marks
        .filter((mark) => mark.options.before?.inlineClassName?.includes(`bubbly-${kind}-spacer`))
        .map(({ range }) => range.startLineNumber)
    const inHtml = MarkupMarks.of(html)
    const inSpell = MarkupMarks.within(spell, spell.indexOf("<grid>"), spell.length, [])
    expect([spacers(inHtml, "tag-head"), spacers(inHtml, "tag-foot")]).toEqual([[1], [3]])
    expect([spacers(inSpell, "tag-head"), spacers(inSpell, "tag-foot")]).toEqual([[2], []])
    expect(spacers(inSpell, "tag-foot-bare")).toEqual([4])
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
    // its start tag lines 1-4, on over its end tag, drawn self-closed (Q62);  `<meta` lines 5-6, a band alone
    expect(lineSpan).toEqual(["1-4", "5-6"])
    expect(tags.map((shape) => shape.kind === "tag" && !!shape.isShortTail)).toEqual([true, false])
    // an attribute that starts its line has no room before it:  its indent is its room, as on the page
    const spaced = marks.marks.filter((mark) =>
      mark.options.before?.inlineClassName?.includes("bubbly-attribute-spacer")
    )
    expect(spaced).toEqual([])
  })

  test("an element with nothing between its tags is ONE pill, drawn as if self-closed:  its end tag's `<` and name hidden (Q62)", () => {
    const text = `<div class="x"></div> <b> </b>`
    const marks = MarkupMarks.of(text)
    expect(shapesOf(marks, text)).toEqual([
      'pill start:  <div class="x"></div> <b',
      'input:  x"></div> <b> </b>',
      "pill start tag:  <b> </b>",
      "pill end touch:  </b>"
    ])
    // the one pill runs from its `<` to its end tag's `>`
    const { range } = marks.marks[marks.shapes[0]!.place]!
    expect(text.slice(range.startColumn - 1, range.endColumn - 1)).toBe(`<div class="x"></div>`)
    // its start tag's `>` and its end tag's `<` and name hidden;  its end tag's `/` and `>` drawn as `/⟩`, room before
    const piecesOf = (classes: string) =>
      marks.marks
        .filter((mark) => mark.options.inlineClassName?.split(" ").includes(classes))
        .map(({ range }) => text.slice(range.startColumn - 1, range.endColumn - 1))
    expect(piecesOf("bubbly-tag-hidden")).toEqual([">", "<", "div"])
    expect(piecesOf("bubbly-slash")).toEqual(["/", "/"])
    const slash = marks.marks.find((mark) => mark.options.inlineClassName?.includes("bubbly-slash"))!
    expect(slash.options.before?.inlineClassName).toContain("bubbly-attribute-spacer")
    // something between them, a space even:  two pills, as before
    expect(BubblyMarkup.write(text)).toContain("bubbly-tag-self-closed")
    expect(BubblyMarkup.write(text).match(/bubbly-tag-self-closed/g)).toHaveLength(1)
  })

  test("on the page, an empty element's start tag ends in `/⟩` and its end tag is left out (Q62)", () => {
    const html = BubblyMarkup.write(`<spell-viewer id="a"></spell-viewer>\n<x-tall\n  a="1"\n></x-tall>`)
    expect(html).not.toContain(">spell-viewer</span><span")
    expect(html.match(/bubbly-self-close"/g)).toHaveLength(2)
    expect(html).toContain("bubbly-tag-tall-inline bubbly-tag-self-closed")
    // neither end tag drawn
    expect(html).not.toMatch(/bubbly-tag-end/)
  })

  test("a block's end tag on its own line, named or `</>`, is its foot:  every piece tiny (Q61)", () => {
    const text = `<context-menu>
  <action "cheat"/>
</>
<grid>
  <spacer/>
</grid>
`
    expect(shapesOf(MarkupMarks.of(text), text).filter((line) => line.startsWith("block"))).toEqual([
      "block structure +foot:  <context-menu>",
      "block structure +foot:  <grid>"
    ])
    const marks = MarkupMarks.of(text)
    const lines = text.split("\n")
    const tiny = marks.marks
      .filter((mark) => mark.options.inlineClassName?.split(" ").includes("bubbly-foot-tiny"))
      .map(({ range }) => lines[range.startLineNumber - 1]!.slice(range.startColumn - 1, range.endColumn - 1))
    expect(tiny.join("")).toBe("</></grid>")
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
