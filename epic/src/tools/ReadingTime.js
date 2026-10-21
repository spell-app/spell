/**
 * READING TIME:  how long a docs page takes to read, for the "6 min read" chip in its head
 * (epic `epic-engine` P14;  the runtime's `drawReadingTime()`).
 * - Prose reads at 230 words a minute, a typical adult's speed on a screen (`WORDS_PER_MINUTE`, Q3).
 * - Code reads at half that:  each word in a code block counts twice (Q4).
 *   A code block is any `<pre>`:  a docs page's code accordion, an epic page's `<epic-code>`.
 *   Inline `<code>` is prose.
 * - Folded sections count too:  they're on the page, just closed (C9).
 * - Never below 1 minute, so an empty page still says "1 min read".
 * - Plain DOM, no globals:  the docs runtime runs it on the live page (`_assets/spell-doc-runtime.js`),
 *   the tests on linkedom.
 * - From epic `even-martin-demo`'s P1 (`d9626a4eb`, in spell-app before the split).
 */

/** Prose words a minute;  code reads at half this. */
export const WORDS_PER_MINUTE = 230

/** What never counts:  scripts, styles, and what the runtime itself added to the page (the head's crumbs). */
const SKIP = "script, style, template, [data-spell-added]"

/**
 * How long `main` takes to read.
 * - `words`:  every word on it, code included
 * - `code`:  the words inside code blocks
 * - `minutes`:  rounded, at least 1
 *
 * ```js
 * readingTime(main) // { words: 1412, code: 300, minutes: 7 }
 * ```
 */
export function readingTime(main) {
  const page = main.cloneNode(true)
  for (const skipped of page.querySelectorAll(SKIP)) skipped.remove()
  let code = 0
  for (const block of page.querySelectorAll("pre")) {
    code += countWords(block.textContent)
    block.remove()
  }
  const prose = countWords(page.textContent)
  const minutes = Math.max(1, Math.round((prose + code * 2) / WORDS_PER_MINUTE))
  return { words: prose + code, code, minutes }
}

/**
 * How long what's SHOWN of `root` takes to read, as `readingTime()` counts:  an epic page's chip (`<epic-page>`, epic
 * `epic-engine` J91;  Owen, 2026-10-21:  "Count what's shown").
 * - only rendered text (`innerText`):  a folded section's body, or a part not loaded yet, doesn't count until it opens
 * - plus the titles its `<epic-*>` elements draw from their `title` (an item's line, a phase's name), while rendered:
 *   they're in shadow roots, which `innerText` doesn't read
 * - code:  every rendered `<pre>`, counted twice;  never what the runtime added (`[data-spell-added]`)
 * - the browser's DOM only (`innerText`, `checkVisibility()`):  linkedom draws nothing
 */
export function shownReadingTime(root) {
  const shown = (element) => element.checkVisibility?.() ?? true
  let code = 0
  for (const block of root.querySelectorAll("pre")) if (shown(block)) code += countWords(block.innerText)
  let added = 0
  for (const extra of root.querySelectorAll("[data-spell-added]"))
    if (shown(extra)) added += countWords(extra.innerText)
  let titles = 0
  for (const element of root.querySelectorAll("[title]"))
    if (element.localName.startsWith("epic-") && shown(element)) titles += countWords(element.getAttribute("title"))
  const prose = Math.max(0, countWords(root.innerText) - code - added) + titles
  const minutes = Math.max(1, Math.round((prose + code * 2) / WORDS_PER_MINUTE))
  return { words: prose + code, code, minutes }
}

/** The words in `text`:  runs of anything but whitespace. */
export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
}
