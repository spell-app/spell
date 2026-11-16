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
      const match = TAG.exec(html.slice(open))
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

/** A start or end tag's opening:  `/` for an end tag, then its name. */
const TAG = /^<(\/?)([a-zA-Z][\w-]*)/

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
