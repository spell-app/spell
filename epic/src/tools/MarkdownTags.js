/**
 * Keep a `<ui-markdown>`'s start and end tags on ONE line each, in a page's source:  the blocks people edit by hand.
 * - Owen, 2026-11-01 (epic `epic-engine` r52):  "always write these on one line, as well as the end tags"
 * - left to itself the formatter splits them (no space between the two tags, so it can't add a line break there):
 *   `<ui-markdown` / `><script type="text/markdown">`, and `</script></ui-markdown` / `>`
 * - no setting changes that, so each block gets the formatter's ignore comment, one line above it
 *   - so it also leaves the block's text as it was typed;  saving a file in VS Code keeps it too
 * - pure:  text in, text out;  run by `doc-links.js`, the first step of finishing a page
 */
export function markdownTagsOnOneLine(html) {
  return html
    .replace(
      START_TAGS,
      (_match, indent, attributes) => `${indent}${IGNORE}\n${indent}<ui-markdown${attributes}>${SCRIPT}`
    )
    .replace(END_TAGS, "</script></ui-markdown>")
}

/** The formatter's comment:  leave the next element as it's written. */
const IGNORE = "<!-- prettier-ignore -->"

/** The start of a block's text. */
const SCRIPT = '<script type="text/markdown">'

/** A block's start tags, formatted or not, its ignore comment if it has one:  its indent, then its attributes. */
const START_TAGS =
  /^([ \t]*)(?:<!-- prettier-ignore -->\s*)?<ui-markdown([^>]*?)\s*>\s*<script type="text\/markdown"\s*>/gm

/** A block's end tags, formatted or not. */
const END_TAGS = /<\/script>\s*<\/ui-markdown\s*>/g
