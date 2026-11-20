/****************
 * ### `HtmlBlocks`
 * One element of a page's markup, found in the page's FILE by its tag and its place, so editing it in place
 * (epic `epic-engine` T66) swaps only its inside and leaves every other byte of the file as it was.
 * - The page as drawn and the file differ in spacing, line breaks and entities, never in which elements they hold:
 *   so the nth `<p>` of an element in the DOM is the nth `<p>` of that element in the file.
 * - What the DOM never counts is skipped here too:  comments, and the insides of `<script>`, `<style>`, `<template>`
 *   and `<textarea>` (a `<ui-markdown>`'s text is a script).
 * - Pure, plain JavaScript:  the docs runtime bundles it, and its tests run in node.
 ****************/
export class HtmlBlocks {
  /**
   * The `ordinal`th `<tag>` in `html` (`0` the first):  where its inside starts and ends, and its inside;
   * `undefined` when there's no such element, or its end tag is missing.
   * - `tag` nests:  an `<li>` inside an `<li>` is counted in turn, and the outer one ends after the inner one's end.
   */
  static find(html, tag, ordinal) {
    const name = tag.toLowerCase()
    let seen = -1
    for (const at of HtmlBlocks.tagsIn(html)) {
      if (at.name !== name || at.isEnd) continue
      seen++
      if (seen !== ordinal) continue
      const start = at.end
      let depth = 0
      for (const next of HtmlBlocks.tagsIn(html, start)) {
        if (next.name !== name) continue
        if (!next.isEnd) depth++
        else if (depth) depth--
        else return { start, end: next.start, inner: html.slice(start, next.start) }
      }
      return undefined
    }
    return undefined
  }

  /**
   * Every `<tag>` in `html` (several tags:  each of them), in the order they START:  where its start tag starts
   * (`open`), where its inside starts and ends (`start`, `end`), where its end tag ends (`close`), its `name`.
   * - one pass over the file;  an element of the same tag inside another is counted in turn, as `find()` counts it
   * - an element whose end tag is missing:  listed, with no `end` or `close`, so the places after it still count right
   */
  static all(html, ...tags) {
    const names = new Set(tags.map((tag) => tag.toLowerCase()))
    const found = []
    const open = new Map()
    for (const at of HtmlBlocks.tagsIn(html)) {
      if (!names.has(at.name)) continue
      const stack = open.get(at.name) ?? open.set(at.name, []).get(at.name)
      if (!at.isEnd) {
        // filled in at its end tag:  a block that never gets one keeps them `undefined`
        const block = {
          name: at.name,
          open: at.start,
          start: at.end,
          end: NOT_YET,
          close: NOT_YET,
          inner: STRING_NOT_YET
        }
        found.push(block)
        stack.push(block)
        continue
      }
      const block = stack.pop()
      if (!block) continue
      block.end = at.start
      block.close = at.end
      block.inner = html.slice(block.start, block.end)
    }
    return found
  }

  /**
   * The block an edit in the page means, in `html`:  the `place`th `<tag>` of `count` the page has, showing `words`.
   * - `count` the same in the file and the page, and that one shows `words`:  it
   * - else (the page has more or fewer of them than the file:  the runtime's, or a body from another file) the ONE
   *   `<tag>` in the file showing `words`
   * - throws an `HtmlBlockError`:  none shows them (`changed`:  the file changed since the page showed it), or
   *   several do and the places can't tell which (`ambiguous`):  never a guess, so never the wrong text rewritten
   */
  static locate(html, { tag, place, count, words }, decode = HtmlBlocks.decodeEntities) {
    const blocks = HtmlBlocks.all(html, tag)
    const shows = (block) => block?.end !== undefined && HtmlBlocks.wordsOf(block.inner, decode) === words
    if (blocks.length === count && shows(blocks[place])) return blocks[place]
    const matching = blocks.filter(shows)
    if (matching.length === 1) return matching[0]
    if (!matching.length) throw new HtmlBlockError(CHANGED, { cause: { kind: "changed" } })
    throw new HtmlBlockError(AMBIGUOUS, { cause: { kind: "ambiguous" } })
  }

  ////////////////
  // ## Tables
  ////////////////

  /**
   * `table`'s inside (`inner`, as the file has it) with a row added below row `row` (`0` the first `<tr>`), or row `row`
   * removed.
   * - the new row is a copy of row `row`, every cell empty, its ids dropped;  a row of header cells (`<th>` only)
   *   gives a row of plain cells (`<td>`);  written on its own line, indented as that row is
   * - removed:  the row and the spacing before it
   * - throws an `HtmlBlockError` (`shape`) for a table this can't change safely:  a table inside it, a cell that spans
   *   rows or columns;  and for removing its last row
   */
  static withRow(inner, row, how) {
    const rows = HtmlBlocks.rowsOf(inner)
    const at = rows[row]
    if (!at) throw new HtmlBlockError(CHANGED, { cause: { kind: "changed" } })
    if (how === "remove") {
      if (rows.length < 2) throw new HtmlBlockError(LAST_ROW, { cause: { kind: "shape" } })
      return inner.slice(0, at.open - spacingBefore(inner, at.open).length) + inner.slice(at.close)
    }
    const text = inner.slice(at.open, at.close)
    const cells = HtmlBlocks.all(text, "td", "th")
    const isHeader = cells.length > 0 && cells.every((cell) => cell.name === "th")
    let copy = text
    for (const cell of [...cells].reverse()) {
      const name = isHeader ? "td" : cell.name
      const startTag = withoutId(text.slice(cell.open, cell.start)).replace(/^<th\b/i, `<${name}`)
      copy = copy.slice(0, cell.open) + startTag + `</${name}>` + copy.slice(cell.close)
    }
    copy = withoutId(copy.slice(0, HtmlBlocks.tagEnd(copy, 0))) + copy.slice(HtmlBlocks.tagEnd(copy, 0))
    return inner.slice(0, at.close) + spacingBefore(inner, at.open) + copy + inner.slice(at.close)
  }

  /**
   * `table`'s inside with a column added to the right of column `column` (`0` the first cell of each row), or column
   * `column` removed.
   * - in each row:  a cell of the same tag as that row's cell there, empty, its ids dropped, spaced as that cell is;
   *   a row too short to have one is left as it is
   * - throws an `HtmlBlockError` (`shape`) as `withRow()`, and for removing its last column
   */
  static withColumn(inner, column, how) {
    const rows = HtmlBlocks.rowsOf(inner)
    const widest = Math.max(...rows.map((row) => HtmlBlocks.all(row.inner, "td", "th").length))
    if (how === "remove" && widest < 2) throw new HtmlBlockError(LAST_COLUMN, { cause: { kind: "shape" } })
    let next = inner
    for (const row of [...rows].reverse()) {
      const cell = HtmlBlocks.all(row.inner, "td", "th")[column]
      if (!cell) continue
      const open = row.start + cell.open
      const close = row.start + cell.close
      const spacing = spacingBefore(next, open)
      if (how === "remove") next = next.slice(0, open - spacing.length) + next.slice(close)
      else {
        const startTag = withoutId(row.inner.slice(cell.open, cell.start))
        next = next.slice(0, close) + spacing + startTag + `</${cell.name}>` + next.slice(close)
      }
    }
    return next
  }

  /**
   * The rows of a table's inside, `<tr>`s in order, whatever `<thead>` / `<tbody>` holds them.
   * - throws an `HtmlBlockError` (`shape`) for a table inside it, or a cell spanning rows or columns
   */
  static rowsOf(inner) {
    if (HtmlBlocks.all(inner, "table").length) throw new HtmlBlockError(NESTED, { cause: { kind: "shape" } })
    for (const cell of HtmlBlocks.all(inner, "td", "th"))
      if (SPANS.test(inner.slice(cell.open, cell.start)))
        throw new HtmlBlockError(SPANNING, { cause: { kind: "shape" } })
    return HtmlBlocks.all(inner, "tr").filter((row) => row.end !== undefined)
  }

  /** `html` with the inside of the block `find()` found swapped for `inner`. */
  static swapped(html, block, inner) {
    return html.slice(0, block.start) + inner + html.slice(block.end)
  }

  /**
   * The words `html` shows:  tags dropped, entities read, spacing collapsed.
   * - The ONE comparison of a file's block with the page's:  both sides go through it (`decode` reads entities;
   *   the browser's own in the page, a small table in node).
   */
  static wordsOf(html, decode = HtmlBlocks.decodeEntities) {
    return HtmlBlocks.collapsed(decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "")))
  }

  /** `text` with every run of spaces and line ends one space, trimmed. */
  static collapsed(text) {
    return text.replace(/\s+/g, " ").trim()
  }

  /** `text` safe as an element's text in HTML:  `&`, `<` and `>` escaped. */
  static escaped(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  /** The common entities and every numeric one, read:  enough for node;  the page reads them with the browser. */
  static decodeEntities(text) {
    return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
      if (name[0] === "#")
        return String.fromCodePoint(
          name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1))
        )
      return ENTITIES[name.toLowerCase()] ?? whole
    })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * Every tag in `html` from `from` on, in order:  its name (lower case), whether it's an end tag, where it starts and
   * ends;  comments, and what's inside a raw-text element, skipped.
   */
  static *tagsIn(html, from = 0) {
    let at = from
    while (at < html.length) {
      const open = html.indexOf("<", at)
      if (open < 0) return
      if (html.startsWith("<!--", open)) {
        const close = html.indexOf("-->", open + 4)
        at = close < 0 ? html.length : close + 3
        continue
      }
      TAG.lastIndex = open
      const match = TAG.exec(html)
      if (!match) {
        at = open + 1
        continue
      }
      const end = HtmlBlocks.tagEnd(html, open)
      if (end < 0) return
      const name = match[2].toLowerCase()
      const isEnd = match[1] === "/"
      yield { name, isEnd, start: open, end }
      at = end
      // a raw-text element:  straight to its end tag, nothing inside it counted
      if (!isEnd && RAW_TEXT.has(name)) {
        const close = new RegExp(`</${name}\\s*>`, "gi")
        close.lastIndex = end
        const found = close.exec(html)
        if (!found) return
        yield { name, isEnd: true, start: found.index, end: found.index + found[0].length }
        at = found.index + found[0].length
      }
    }
  }

  /** Where the tag starting at `open` ends:  after its `>`, quotes skipped;  `-1` when it never does. */
  static tagEnd(html, open) {
    let quote = ""
    for (let at = open + 1; at < html.length; at++) {
      const char = html[at]
      if (quote) {
        if (char === quote) quote = ""
      } else if (char === '"' || char === "'") quote = char
      else if (char === ">") return at + 1
    }
    return -1
  }
}

/**
 * Why an edit couldn't find its place in the page's file, or couldn't change it:  `cause.kind` says which.
 * - `changed`:  the file no longer shows what the page did
 * - `ambiguous`:  the file shows it more than once, and nothing tells which
 * - `shape`:  a table this can't change safely, or its last row or column
 * - its message is for people, after "Not saved:  "
 */
export class HtmlBlockError extends Error {}
HtmlBlockError.prototype.name = "HtmlBlockError"

/** The spacing (line break and indent) right before `at` in `html`. */
function spacingBefore(html, at) {
  return /\s*$/.exec(html.slice(Math.max(0, at - 200), at))[0]
}

/** A start tag with its `id` left out:  a copied row or cell never repeats one. */
function withoutId(startTag) {
  return startTag.replace(/\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, "")
}

/** The messages people see, after "Not saved:  " (the novice voice, `epic voice check`ed). */
const CHANGED =
  "this text was changed in the page's file after you opened the page.  Reload the page, then make your change again."
const AMBIGUOUS =
  "this text is in the page more than once, so it can't tell which copy you meant.  Edit it in the page's HTML file instead."
const NESTED =
  "this table has another table inside it, so its rows and columns can't be changed here.  Edit them in the page's HTML file instead."
const SPANNING =
  "this table has merged cells, so its rows and columns can't be changed here.  Edit them in the page's HTML file instead."
const LAST_ROW = "you can't remove the last row, because a table needs at least one."
const LAST_COLUMN = "you can't remove the last column, because a table needs at least one."

/** An end, close or inside not found yet, typed for the tests' TypeScript. */
const NOT_YET = /** @type {number | undefined} */ (undefined)
const STRING_NOT_YET = /** @type {string | undefined} */ (undefined)

/** A cell's start tag that spans rows or columns. */
const SPANS = /\b(colspan|rowspan)\s*=/i

/**
 * A start or end tag's opening:  `/` for an end tag, then its name.
 * - sticky (`y`):  matched where `lastIndex` says, never on a copy of the rest of the file
 */
const TAG = /<(\/?)([a-zA-Z][\w-]*)/y

/** The elements whose insides are text, never markup the DOM counts. */
const RAW_TEXT = new Set(["script", "style", "template", "textarea"])

/** The named entities a page's text holds most. */
const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  middot: "·",
  times: "×",
  rarr: "→",
  larr: "←"
}
