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
