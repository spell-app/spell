import type { Token, Tokens } from "marked"

import type { MarkdownPlace, MarkdownPlaceKind } from "./UIMarkdown.types"

/****************
 * ### `MarkdownSource`
 * Where each piece `<ui-markdown editable>` lets you edit sits in its markdown, and how new text goes back in.
 * - A PLACE is one piece's own text:  a paragraph, a heading's words after its `#`s, a list item's own line, a table
 *   cell's text between its pipes;  its `start` and `end` are offsets into the markdown.
 * - `placesOf()`:  the places of marked's tokens, each token marked with its place's number (`placeOf()`), so the
 *   engine draws it on the element it renders (`data-ui-place`).
 * - `replace()`:  the markdown with one place's text swapped, every other byte as it was.
 * - Left out (no place):  blockquotes, code, HTML blocks;  a list item holding more than its line and nested lists;
 *   a nested list item over several lines.  They stay as they are, and aren't editable in place.
 * - Pure:  no DOM, and only marked's TYPES, so the engine (built alone into a classic script) and the element both
 *   carry it.
 ****************/
export class MarkdownSource {
  /**
   * The places of `tokens` (marked's, lexed from `text`), in reading order;  each placed token is marked with its
   * number (`placeOf()`).
   * - A token whose `raw` isn't found in `text` stops the walk:  the places before it stand, none after
   *   (text marked lexed differently from what it was given, e.g. `\r\n`).
   */
  static placesOf(tokens: readonly Token[], text: string): MarkdownPlace[] {
    const places: MarkdownPlace[] = []
    const add: AddPlace = (token, kind, start, end) => {
      ;(token as Placed)[PLACE_KEY] = places.length
      places.push({ kind, start, end })
    }
    let at = 0
    for (const token of tokens) {
      const start = text.startsWith(token.raw, at) ? at : text.indexOf(token.raw, at)
      if (start < 0) break
      MarkdownSource.visit(token, text, start, add)
      at = start + token.raw.length
    }
    return places
  }

  /** The number of the place `token` was marked with by `placesOf()`;  `undefined` for none. */
  static placeOf(token: object): number | undefined {
    return (token as Placed)[PLACE_KEY]
  }

  /**
   * `text` with `place`'s text swapped for `raw`.
   * - A table cell or a heading is one line:  line ends in `raw` become spaces.
   *   A cell's unescaped `|` is escaped, so the row keeps its columns.
   * - A list item's own text is one line too.
   */
  static replace(text: string, place: MarkdownPlace, raw: string): string {
    const oneLine = place.kind === "paragraph" ? raw.replace(/\s+$/, "") : raw.replace(/\s*\n\s*/g, " ").trim()
    const fitted = place.kind === "cell" ? oneLine.replace(UNESCAPED_PIPE, "\\|") : oneLine
    return text.slice(0, place.start) + fitted + text.slice(place.end)
  }

  ////////////////
  // ## Each kind of block
  ////////////////

  /** Add the places of `token`, which starts at `start` in `text`. */
  private static visit(token: Token, text: string, start: number, add: AddPlace) {
    if (token.type === "paragraph") MarkdownSource.paragraph(token as Tokens.Paragraph, start, add)
    else if (token.type === "heading") MarkdownSource.heading(token as Tokens.Heading, start, add)
    else if (token.type === "table") MarkdownSource.table(token as Tokens.Table, start, add)
    else if (token.type === "list")
      MarkdownSource.list(token as Tokens.List, text, start, start + token.raw.length, add)
  }

  /** A paragraph:  its raw text, without the space around it. */
  private static paragraph(token: Tokens.Paragraph, start: number, add: AddPlace) {
    const { from, to } = MarkdownSource.trimmed(token.raw)
    if (to > from) add(token, "paragraph", start + from, start + to)
  }

  /** A heading:  an ATX one's words after its `#`s (without closing `#`s), a setext one's line(s) above its rule. */
  private static heading(token: Tokens.Heading, start: number, add: AddPlace) {
    const atx = ATX_HEADING.exec(token.raw.split("\n")[0]!)
    if (atx) {
      const words = atx[2]!
      if (words) add(token, "heading", start + atx[1]!.length, start + atx[1]!.length + words.length)
      return
    }
    const rule = SETEXT_RULE.exec(token.raw)
    if (!rule) return
    const { from, to } = MarkdownSource.trimmed(token.raw.slice(0, rule.index))
    if (to > from) add(token, "heading", start + from, start + to)
  }

  /** A table:  each cell's text, between its pipes;  the delimiter row has none. */
  private static table(token: Tokens.Table, start: number, add: AddPlace) {
    const lines = MarkdownSource.linesOf(token.raw)
    const rows = [token.header, null, ...token.rows]
    for (const [index, line] of lines.entries()) {
      const cells = rows[index]
      if (!cells) continue
      for (const [column, cell] of MarkdownSource.cellsOf(line.text).entries()) {
        const token = cells[column]
        if (token) add(token, "cell", start + line.start + cell.from, start + line.start + cell.to)
      }
    }
  }

  /**
   * A list's items between `from` and `to` in `text`:  each item's own line, after its marker (and task box);
   * its nested lists in turn.
   * - An item is found by its first line:  a nested list's tokens are its text without the indent.
   */
  private static list(token: Tokens.List, text: string, from: number, to: number, add: AddPlace) {
    let at = from
    for (const item of token.items) {
      const firstLine = item.raw.split("\n")[0]!.trim()
      const itemStart = text.indexOf(firstLine, at)
      if (itemStart < 0 || itemStart >= to) return
      at = itemStart + firstLine.length
      // a task item's box is a token of its own (`checkbox`), drawn before its text
      const blocks = item.tokens.filter((block) => block.type !== "space" && block.type !== "checkbox")
      const [own, ...rest] = blocks
      const marker = LIST_MARKER.exec(firstLine)
      const isOneLine = !!own && !own.raw.trim().includes("\n")
      const holdsOnlyLists = rest.every((block) => block.type === "list")
      if (marker && isOneLine && holdsOnlyLists && (own.type === "text" || own.type === "paragraph")) {
        const words = firstLine.slice(marker[0].length).replace(/\s+$/, "")
        if (words) add(item, "item", itemStart + marker[0].length, itemStart + marker[0].length + words.length)
      }
      for (const nested of rest) {
        if (nested.type !== "list") break
        MarkdownSource.list(nested as Tokens.List, text, at, to, add)
      }
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Where `raw`'s text starts and ends, without the space around it. */
  private static trimmed(raw: string): { from: number; to: number } {
    const from = raw.length - raw.trimStart().length
    return { from, to: raw.trimEnd().length }
  }

  /** `raw`'s non-blank lines, each with where it starts in `raw`. */
  private static linesOf(raw: string): { text: string; start: number }[] {
    const lines: { text: string; start: number }[] = []
    let start = 0
    for (const text of raw.split("\n")) {
      if (text.trim()) lines.push({ text, start })
      start += text.length + 1
    }
    return lines
  }

  /**
   * A table row's cells:  where each one's text starts and ends in `line`, without the space around it.
   * - Split at every `|` but an escaped one (`\|`), as GitHub does, inside code spans too.
   * - A leading or trailing `|` opens or closes the row:  no cell before or after it.
   */
  private static cellsOf(line: string): { from: number; to: number }[] {
    const pipes: number[] = []
    for (let index = 0; index < line.length; index++) {
      if (line[index] === "\\") index++
      else if (line[index] === "|") pipes.push(index)
    }
    const bounds = [-1, ...pipes, line.length]
    const cells: { from: number; to: number }[] = []
    for (let index = 0; index < bounds.length - 1; index++) {
      const from = bounds[index]! + 1
      const to = bounds[index + 1]!
      const cell = line.slice(from, to)
      const isEdge = (index === 0 || index === bounds.length - 2) && !cell.trim() && pipes.length
      if (isEdge) continue
      const lead = cell.length - cell.trimStart().length
      const words = cell.trim().length
      // an empty cell:  its text goes after one space, so `| |` becomes `| x |`
      cells.push(
        words
          ? { from: from + lead, to: from + lead + words }
          : { from: from + Math.min(1, cell.length), to: from + Math.min(1, cell.length) }
      )
    }
    return cells
  }
}

/** What `placesOf()` hands each kind of block, to add a place. */
type AddPlace = (token: object, kind: MarkdownPlaceKind, start: number, end: number) => void

/** A token marked with its place's number. */
type Placed = { [PLACE_KEY]?: number }

/** The key a token's place number is kept under. */
const PLACE_KEY = "uiPlace"

/** An ATX heading's line:  its `#`s and the space after them, then its words, before any closing `#`s. */
const ATX_HEADING = /^( {0,3}#{1,6}(?:[ \t]+|$))(.*?)(?:[ \t]+#+)?[ \t]*$/

/** A setext heading's rule, under its words. */
const SETEXT_RULE = /\n {0,3}(?:=+|-+)[ \t]*\n*$/

/** A list item's marker, and its task box:  `- `, `12. `, `- [x] `. */
const LIST_MARKER = /^(?:[*+-]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/

/** A `|` not escaped already. */
const UNESCAPED_PIPE = /(?<!\\)\|/g
