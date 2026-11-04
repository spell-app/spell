/**
 * Tests of `MarkdownSource`:  where each piece `<ui-markdown editable>` edits sits in its markdown, and new text put
 * back in its place, every other byte as it was (epic `epic-engine` P60).
 */
import { Marked } from "marked"
import { describe, expect, it } from "vite-plus/test"

import { MarkdownSource } from "spell/ui/components/ui-markdown/MarkdownSource"
import type { MarkdownPlace } from "spell/ui/components/ui-markdown/UIMarkdown.types"

/** The places of `text`, lexed as the engine lexes it. */
function placesOf(text: string): MarkdownPlace[] {
  return MarkdownSource.placesOf(new Marked({ gfm: true }).lexer(text), text)
}

/** Each place's text. */
function textsOf(text: string): string[] {
  return placesOf(text).map((place) => text.slice(place.start, place.end))
}

/** The LOE table of the atmosphere guide "Spaces and Spell", shortened. */
const LOE = [
  "| # | Piece | Spell, on files |",
  "| --- | --- | --- |",
  "| 1 | Drafts and versions | 5 |",
  "| 4 | Sign-in \\| or not | 2½ |",
  "| 5 | <nobr>**Server**</nobr> | 10 |"
].join("\n")

describe("MarkdownSource.placesOf()", () => {
  it("finds a table's header cells, body cells and last cells;  never the delimiter row", () => {
    expect(textsOf(LOE)).toEqual([
      "#",
      "Piece",
      "Spell, on files",
      "1",
      "Drafts and versions",
      "5",
      "4",
      "Sign-in \\| or not",
      "2½",
      "5",
      "<nobr>**Server**</nobr>",
      "10"
    ])
    expect(placesOf(LOE).every((place) => place.kind === "cell")).toBe(true)
  })

  it("finds a paragraph over two lines, a heading's words and a list item's own line", () => {
    const text = "# The title #\n\nFirst line,\nsecond line.\n\n- one\n- [x] two\n  - nested\n\nSetext\n===\n"
    expect(textsOf(text)).toEqual(["The title", "First line,\nsecond line.", "one", "two", "nested", "Setext"])
    expect(placesOf(text).map((place) => place.kind)).toEqual([
      "heading",
      "paragraph",
      "item",
      "item",
      "item",
      "heading"
    ])
  })

  it("leaves out what it can't put back:  a quote, code, a list item holding more than its line", () => {
    const text = "> quoted\n\n```\ncode\n```\n\n- item\n\n  more of it\n\nafter"
    expect(textsOf(text)).toEqual(["after"])
  })

  it("marks each placed token with its place's number", () => {
    const marked = new Marked({ gfm: true })
    const tokens = marked.lexer("one\n\ntwo")
    MarkdownSource.placesOf(tokens, "one\n\ntwo")
    expect(tokens.filter((token) => token.type === "paragraph").map(MarkdownSource.placeOf)).toEqual([0, 1])
  })
})

describe("MarkdownSource.replace()", () => {
  it("swaps one cell, every other byte as it was", () => {
    const place = placesOf(LOE)[4]!
    const next = MarkdownSource.replace(LOE, place, "Drafts, versions and history")
    expect(next).toBe(LOE.replace("Drafts and versions", "Drafts, versions and history"))
  })

  it("escapes a new `|` in a cell, keeps an escaped one, and makes a line end a space", () => {
    const place = placesOf(LOE)[7]!
    expect(MarkdownSource.replace(LOE, place, "Sign-in \\| or | not\nat all")).toContain(
      "| 4 | Sign-in \\| or \\| not at all | 2½ |"
    )
  })

  it("keeps `<nobr>` and bold as typed, and `½`", () => {
    const place = placesOf(LOE)[10]!
    expect(MarkdownSource.replace(LOE, place, "<nobr>**Servers**</nobr>")).toContain(
      "| 5 | <nobr>**Servers**</nobr> | 10 |"
    )
  })

  it("gives an empty cell its text inside the pipes", () => {
    const text = "| a | b |\n| - | - |\n| 1 | |"
    const place = placesOf(text).at(-1)!
    expect(MarkdownSource.replace(text, place, "2")).toBe("| a | b |\n| - | - |\n| 1 | 2|")
  })

  it("swaps a paragraph's lines, a heading's words and a list item's line", () => {
    const text = "## Old title\n\nold\nlines\n\n- old item\n"
    const [heading, paragraph, item] = placesOf(text)
    expect(MarkdownSource.replace(text, heading!, "New title")).toBe("## New title\n\nold\nlines\n\n- old item\n")
    expect(MarkdownSource.replace(text, paragraph!, "new\nlines\n")).toBe("## Old title\n\nnew\nlines\n\n- old item\n")
    expect(MarkdownSource.replace(text, item!, "new item")).toBe("## Old title\n\nold\nlines\n\n- new item\n")
  })

  it("finds the places after a leading title the element leaves out (`skip-title`), counted from the shown text", () => {
    const shown = "First paragraph."
    expect(placesOf(shown)).toEqual([{ kind: "paragraph", start: 0, end: shown.length }])
  })
})
