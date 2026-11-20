/** Tests of `HtmlBlocks`:  a page's block found in its file by tag and place, for editing in place (epic-engine T66). */
import { describe, expect, it } from "vite-plus/test"

import { HtmlBlocks } from "spell/epic/tools/HtmlBlocks.js"

const PAGE = `<ui-section id="s1" label="One">
  <p>First <code>one</code></p>
  <!-- <p>not counted</p> -->
  <ui-markdown><script type="text/markdown">
    <p>nor this</p>
  </script></ui-markdown>
  <p
    >Second &amp; <a href="/x">last</a
  ></p>
  <ul>
    <li>outer <ul><li>inner</li></ul> tail</li>
    <li>next</li>
  </ul>
  <pre><code class="language-ts">const a = 1 &lt; 2</code></pre>
</ui-section>`

describe("HtmlBlocks.find()", () => {
  it("finds the nth element by tag, past comments and scripts, its inside exactly as the file has it", () => {
    expect(HtmlBlocks.find(PAGE, "p", 0)?.inner).toBe("First <code>one</code>")
    const second = HtmlBlocks.find(PAGE, "p", 1)!
    expect(second.inner).toBe('Second &amp; <a href="/x">last</a\n  >')
    expect(HtmlBlocks.wordsOf(second.inner)).toBe("Second & last")
    expect(HtmlBlocks.find(PAGE, "p", 2)).toBeUndefined()
  })

  it("counts nested elements of the same tag in order, the outer ending after the inner", () => {
    expect(HtmlBlocks.find(PAGE, "li", 0)?.inner).toBe("outer <ul><li>inner</li></ul> tail")
    expect(HtmlBlocks.find(PAGE, "li", 1)?.inner).toBe("inner")
    expect(HtmlBlocks.find(PAGE, "li", 2)?.inner).toBe("next")
  })

  it("swaps only the block's inside;  every other byte stays", () => {
    const block = HtmlBlocks.find(PAGE, "code", 1)!
    expect(HtmlBlocks.wordsOf(block.inner)).toBe("const a = 1 < 2")
    const next = HtmlBlocks.swapped(PAGE, block, HtmlBlocks.escaped("const b = 2 > 1"))
    expect(next).toBe(PAGE.replace("const a = 1 &lt; 2", "const b = 2 &gt; 1"))
  })

  it("reads entities and collapses spacing the same on both sides", () => {
    expect(HtmlBlocks.wordsOf("a&nbsp;&mdash;\n   b&#33; &#x41;")).toBe("a — b! A")
    expect(HtmlBlocks.collapsed("  a \n\t b  ")).toBe("a b")
  })
})

/** A guide's opening, with no element with an id around it, and a table in a section. */
const GUIDE = `<main class="spell-doc-main">
  <p class="lede">
    Opening words, <code>once</code>.
  </p>
  <p>Twice</p>
  <p>Twice</p>
  <ui-section id="s1" label="One">
    <ui-table celled>
      <table>
        <thead>
          <tr>
            <th id="h">Name</th>
            <th>Says</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>a</td>
            <td class="num">1</td>
          </tr>
          <tr>
            <td>b</td>
            <td class="num">2</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  </ui-section>
</main>`

describe("HtmlBlocks.all()", () => {
  it("lists every element of the tags in the order they start, nested ones in turn", () => {
    const items = HtmlBlocks.all(PAGE, "li")
    expect(items.map((item) => item.inner)).toEqual(["outer <ul><li>inner</li></ul> tail", "inner", "next"])
    const cells = HtmlBlocks.all(GUIDE, "td", "th")
    expect(cells.map((cell) => `${cell.name}:${cell.inner}`)).toEqual([
      "th:Name",
      "th:Says",
      "td:a",
      "td:1",
      "td:b",
      "td:2"
    ])
    expect(GUIDE.slice(cells[0].open, cells[0].close)).toBe('<th id="h">Name</th>')
  })
})

describe("HtmlBlocks.locate()", () => {
  it("finds a block by its place when the page has as many as the file, else by its words alone", () => {
    expect(HtmlBlocks.locate(GUIDE, { tag: "p", place: 0, count: 3, words: "Opening words, once." }).start).toBe(
      GUIDE.indexOf("\n    Opening")
    )
    // the page has one more <p> (the runtime's):  its place says nothing, its words do
    const lede = HtmlBlocks.locate(GUIDE, { tag: "p", place: 1, count: 4, words: "Opening words, once." })
    expect(HtmlBlocks.wordsOf(lede.inner)).toBe("Opening words, once.")
  })

  it("never guesses:  the same words twice and no place to tell, or words the file hasn't got, refuse", () => {
    expect(HtmlBlocks.locate(GUIDE, { tag: "p", place: 2, count: 3, words: "Twice" }).start).toBe(
      GUIDE.lastIndexOf("<p>Twice") + 3
    )
    expect(() => HtmlBlocks.locate(GUIDE, { tag: "p", place: 2, count: 4, words: "Twice" })).toThrow(
      expect.objectContaining({ name: "HtmlBlockError", cause: { kind: "ambiguous" } })
    )
    expect(() => HtmlBlocks.locate(GUIDE, { tag: "p", place: 0, count: 3, words: "Gone" })).toThrow(
      expect.objectContaining({ cause: { kind: "changed" } })
    )
  })
})

describe("HtmlBlocks' table changes", () => {
  const table = HtmlBlocks.find(GUIDE, "table", 0)!

  it("adds an empty row below a row, a copy of it on its own line;  a header row gives plain cells", () => {
    const below = HtmlBlocks.withRow(table.inner, 1, "add")
    expect(below).toBe(
      table.inner.replace(
        '<td class="num">1</td>\n          </tr>',
        '<td class="num">1</td>\n          </tr>\n          <tr>\n            <td></td>\n            <td class="num"></td>\n          </tr>'
      )
    )
    const underHeader = HtmlBlocks.withRow(table.inner, 0, "add")
    expect(underHeader).toContain(
      "</tr>\n          <tr>\n            <td></td>\n            <td></td>\n          </tr>\n        </thead>"
    )
    expect(underHeader).not.toMatch(/id="h"[\s\S]*id="h"/)
  })

  it("removes a row and the spacing before it;  never the last one", () => {
    const removed = HtmlBlocks.withRow(table.inner, 2, "remove")
    expect(removed).toBe(table.inner.replace(/\n {10}<tr>\n {12}<td>b<\/td>[\s\S]*?<\/tr>/, ""))
    expect(() => HtmlBlocks.withRow("<tr><td>x</td></tr>", 0, "remove")).toThrow(
      expect.objectContaining({ cause: { kind: "shape" } })
    )
  })

  it("adds an empty column right of a column, in every row, each cell like its neighbour", () => {
    const added = HtmlBlocks.withColumn(table.inner, 0, "add")
    expect(
      HtmlBlocks.all(added, "tr").map((row) => HtmlBlocks.all(row.inner, "td", "th").map((cell) => cell.inner))
    ).toEqual([
      ["Name", "", "Says"],
      ["a", "", "1"],
      ["b", "", "2"]
    ])
    expect(added).toContain('<th id="h">Name</th>\n            <th></th>\n            <th>Says</th>')
  })

  it("removes a column in every row;  never the last one", () => {
    const removed = HtmlBlocks.withColumn(table.inner, 1, "remove")
    expect(removed).toBe(table.inner.replace(/\n\s*<th>Says<\/th>/, "").replace(/\n\s*<td class="num">\d<\/td>/g, ""))
    expect(() => HtmlBlocks.withColumn(removed, 0, "remove")).toThrow(
      expect.objectContaining({ cause: { kind: "shape" } })
    )
  })

  it("refuses a table with a cell spanning columns, or a table inside it", () => {
    expect(() => HtmlBlocks.withRow('<tr><td colspan="2">x</td></tr><tr><td>a</td><td>b</td></tr>', 0, "add")).toThrow(
      expect.objectContaining({ cause: { kind: "shape" } })
    )
    expect(() => HtmlBlocks.withColumn("<tr><td><table><tr><td>x</td></tr></table></td></tr>", 0, "add")).toThrow(
      expect.objectContaining({ cause: { kind: "shape" } })
    )
  })
})
