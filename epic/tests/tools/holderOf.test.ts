import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { quoteIn } from "spell/epic/tools/BlockAnchors.js"
import { holderOf } from "spell/epic/tools/_assets/spell-doc-comments.js"

/** The block marked `data-block` in a page holding `html`:  the comment's anchor. */
function pageOf(html: string) {
  const { document } = parseHTML(`<!doctype html><html><body><main>${html}</main></body></html>`)
  return document.querySelector("[data-block]")!
}

/** Where the thread of a comment on `quote` in `block` goes. */
function holderFor(block: Element, quote: string) {
  return holderOf(block, quoteIn(block, quote, 0)!)
}

// epic `epic-engine` T107 (Owen, 2026-11-19):  "When I do a comment in the middle of an HTML block, e.g. claude's todo
// notes in a phase or in a table, it sometimes shows at the very bottom of the item.  I'd prefer it if it appeared
// closer to the selected text, but e.g. not in the middle of a table."
describe("holderOf():  a quote's thread goes near its text", () => {
  test("a plain paragraph:  after the paragraph", () => {
    const block = pageOf(
      `<epic-field data-block name="plan"><p>One.</p><p>Two words here.</p><p>Three.</p></epic-field>`
    )
    expect(holderFor(block, "words here")).toBe(block.querySelectorAll("p")[1])
  })

  test("a list item:  in that item, at its end (the list stays a list)", () => {
    const block = pageOf(
      `<epic-field data-block name="plan"><ul><li>First item</li><li>Second item</li></ul></epic-field>`
    )
    expect(holderFor(block, "Second item")).toBe(block.querySelectorAll("li")[1])
  })

  test("a quote running out of a <code> in a nested list (a phase's notes):  that list item, not the field's end", () => {
    const block = pageOf(
      `<epic-field data-block name="plan"><ol><li>Clashes:<ul><li><b><code>&lt;ui-input&gt;</code>'s <code>action</code></b>: a slot</li></ul></li></ol></epic-field>`
    )
    expect(holderFor(block, "<ui-input>'s action")).toBe(block.querySelector("ul > li"))
  })

  test("a table cell:  after the WHOLE table (its <ui-table>), never in a cell", () => {
    const block = pageOf(
      `<epic-field data-block name="plan"><p>Before.</p><ui-table><table><tbody><tr><td>a Browse button joined to it</td><td>b</td></tr></tbody></table></ui-table><p>After.</p></epic-field>`
    )
    expect(holderFor(block, "Browse button")).toBe(block.querySelector("ui-table"))
  })

  test("a table that is the block itself:  the block (its threads go after it)", () => {
    const block = pageOf(`<table data-block><tbody><tr><td><p>in a cell</p></td></tr></tbody></table>`)
    expect(holderFor(block, "in a cell")).toBe(block)
  })

  test("text straight in a <div> of notes:  after that div", () => {
    const block = pageOf(
      `<epic-field data-block name="plan"><div>Notes, <i>nested</i> in a div</div><p>More.</p></epic-field>`
    )
    expect(holderFor(block, "nested in a div")).toBe(block.querySelector("div"))
  })

  test("text straight in the block:  the block, as before", () => {
    const block = pageOf(`<epic-field data-block name="plan">Bare words in the field</epic-field>`)
    expect(holderFor(block, "Bare words")).toBe(block)
  })
})
