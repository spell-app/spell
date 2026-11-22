/**
 * Tests of the migration `items-in-order` (epic `epic-engine` T151):  each section's items back in number order.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { ItemsInOrder } from "spell/epic/tool/migrations"

/** A page's two sections as they were stored, open questions on top. */
const PAGE = `<html><body><epic-page>
<epic-section id="decisions"><epic-item id="q80" status="open"></epic-item><epic-item id="q1" status="decided"></epic-item><p>A note</p><epic-item id="q10" status="decided"></epic-item><epic-item id="q2" status="decided"></epic-item></epic-section>
<epic-section id="issues"><epic-item id="i1"><p>Its words</p></epic-item><epic-item id="i2"></epic-item></epic-section>
</epic-page></body></html>`

/** `document`'s children, section by section:  an item's id, else its tag. */
function orders(document: Document) {
  return Array.from(document.querySelectorAll("epic-section"), (section) =>
    Array.from(section.children, (child) => child.id || child.localName)
  )
}

describe("ItemsInOrder (`items-in-order`, epic `epic-engine` T151)", () => {
  test("number order, not text order;  what's between stays put;  a section in order is untouched;  idempotent", () => {
    const { document } = parseHTML(PAGE) as unknown as { document: Document }
    const step = new ItemsInOrder()
    const notes: string[] = []
    const context = { now: new Date(2026, 10, 22), notes }
    expect(step.run(document, context)).toBe(true)
    expect(orders(document)).toEqual([
      ["q1", "q2", "p", "q10", "q80"],
      ["i1", "i2"]
    ])
    expect(notes).toEqual(["items-in-order:  back in number order:  Q80, Q10"])
    expect(document.querySelector("#i1 p")!.textContent).toBe("Its words")
    expect(step.run(document, context)).toBe(false)
  })
})
