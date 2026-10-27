/**
 * Tests of the migration `more-requests-first`:  Owen's note asking for More Details moved above Claude's card.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("more-requests-first")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 24, 16, 0)

/** A page holding item `j41`, its details `body`. */
function page(body: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="judgements" kind="judgements">` +
      `<epic-item id="j41" title="A call" status="open">${body}</epic-item>` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** The item's children, as tag (and `re`) words, in order. */
function order(document: Document): string[] {
  return Array.from(document.querySelector("epic-item")!.children, (child) =>
    [child.localName, child.getAttribute("re")].filter(Boolean).join(":")
  )
}

describe("more-requests-first", () => {
  test("Owen's note asking for More Details (revisit now, Add Details) moves ABOVE Claude's card;  once", () => {
    const document = page(
      `<p>The call.</p><epic-more><p>More.</p></epic-more>` +
        `<epic-reply from="Owen" at="2026-10-11 11:13" re="revisit now"><p>Need more detail</p></epic-reply>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(order(document)).toEqual(["p", "epic-reply:revisit now", "epic-more"])
    expect(notes).toEqual(["more-requests-first:  J41:  Owen's note moved above More Details"])
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("a later reply to the card stays after it:  revisit soon, and Claude's", () => {
    const document = page(
      `<epic-more><p>More.</p></epic-more>` +
        `<epic-reply from="Owen" at="2026-10-17 10:36" re="revisit soon"><p>Why?</p></epic-reply>` +
        `<epic-reply from="Claude" at="2026-10-17 11:00"><p>Because.</p></epic-reply>`
    )
    expect(STEP.run(document, { now: NOW })).toBe(false)
    expect(order(document)).toEqual(["epic-more", "epic-reply:revisit soon", "epic-reply"])
  })
})
