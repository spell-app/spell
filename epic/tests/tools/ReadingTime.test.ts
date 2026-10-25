/**
 * Tests of `ReadingTime.js`:  how long a docs page takes to read, prose and code.  On linkedom, as the runtime runs it
 * on the live page.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { WORDS_PER_MINUTE, countWords, readingTime } from "spell-epic/tools/ReadingTime.js"

/** `words` words of filler text. */
function wordsOf(words: number) {
  return Array.from({ length: words }, () => "word").join(" ")
}

/** `html` as a page's main column, parsed. */
function mainOf(html: string) {
  return parseHTML(`<!doctype html><html><body><main>${html}</main></body></html>`).document.querySelector("main")!
}

describe("countWords()", () => {
  test("counts runs of non-space, ignoring extra whitespace", () => {
    expect(countWords("  one two\n\tthree  ")).toBe(3)
    expect(countWords("")).toBe(0)
  })
})

describe("readingTime()", () => {
  test("prose reads at 230 words a minute", () => {
    const main = mainOf(`<p>${wordsOf(WORDS_PER_MINUTE * 6)}</p>`)
    expect(readingTime(main)).toEqual({ words: 1380, code: 0, minutes: 6 })
  })

  test("code blocks count twice, in a docs accordion or an epic-code", () => {
    const main = mainOf(`
      <p>${wordsOf(230)}</p>
      <ui-accordion class="spell-code"><ui-content><pre><code>${wordsOf(115)}</code></pre></ui-content></ui-accordion>
      <epic-code title="x.ts"><pre>${wordsOf(115)}</pre></epic-code>`)
    expect(readingTime(main)).toEqual({ words: 460, code: 230, minutes: 3 })
  })

  test("inline code is prose", () => {
    expect(readingTime(mainOf(`<p>call <code>readingTime()</code> here</p>`)).code).toBe(0)
  })

  test("folded sections count;  scripts and the runtime's own additions don't", () => {
    const main = mainOf(`
      <ui-section open="false"><p>${wordsOf(460)}</p></ui-section>
      <span data-spell-added>DOCS / GUIDES</span>
      <script>${wordsOf(1000)}</script>`)
    expect(readingTime(main)).toEqual({ words: 460, code: 0, minutes: 2 })
  })

  test("an empty page still takes a minute", () => {
    expect(readingTime(mainOf("")).minutes).toBe(1)
  })

  test("leaves the page itself alone", () => {
    const main = mainOf(`<pre>${wordsOf(5)}</pre>`)
    readingTime(main)
    expect(main.querySelector("pre")).not.toBeNull()
  })
})
