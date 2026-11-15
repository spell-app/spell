/**
 * Tests of the migration `update-labels` (epic `epic-engine` I285):  an UPDATE label Owen has checked since goes;
 * one written before T75 gets its item's status word.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("update-labels")!

/** The context every run gets. */
const NOW = { now: new Date(2026, 10, 15, 9, 0) }

/** An item `id` of `attributes`, titled with a bare UPDATE label. */
function item(id: string, attributes: string): string {
  return (
    `<epic-item id="${id}" ${attributes}><span slot="title">${id} words <epic-update phase="52"></epic-update>` +
    `</span></epic-item>`
  )
}

/** A page holding `items`' markup in a section, and `log`'s events. */
function page(items: string, log = ""): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="issues" kind="issues">${items}</epic-section>` +
      `<epic-section id="log" kind="log">${log}</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Item `id`'s label in `document`:  its `became`, `"plain"` for none, `"gone"`. */
function labelOf(document: Document, id: string): string {
  const label = document.getElementById(id)!.querySelector("epic-update")
  return label ? (label.getAttribute("became") ?? "plain") : "gone"
}

describe("update-labels", () => {
  test("a label Owen checked since its change goes (language's I84);  one changed after his check stays", () => {
    const document = page(
      item("i84", 'status="done" review-as="approve" changed="2026-11-14T18:34:54-05:00"') +
        item("i85", 'status="done" review-as="approve" changed="2026-11-14T19:10:00-05:00"'),
      `<epic-event at="2026-11-14T18:34-05:00">I84 approved:  closed (fix accepted)</epic-event>` +
        `<epic-event at="2026-11-14T18:40-05:00">I85 approved:  closed (fix accepted)</epic-event>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { ...NOW, notes })).toBe(true)
    expect([labelOf(document, "i84"), labelOf(document, "i85")]).toEqual(["gone", "done"])
    expect(document.getElementById("i84")!.querySelector('[slot="title"]')!.innerHTML).toBe("i84 words")
    expect(notes).toEqual([
      "update-labels:  checked, label off:  I84",
      "update-labels:  1 label(s) given their status word"
    ])
  })

  test("a label with no status word gets its item's:  fixed, done, canceled, decided;  an open item's stays plain", () => {
    const document = page(
      item("i91", 'status="open" fixed') +
        item("t1", 'status="done"') +
        item("t2", 'status="canceled"') +
        item("q1", 'status="decided"') +
        item("t3", 'status="open"') +
        item("i2", 'status="open" fixed').replace("<epic-update ", '<epic-update became="reopened" ')
    )
    expect(STEP.run(document, NOW)).toBe(true)
    expect(["i91", "t1", "t2", "q1", "t3", "i2"].map((id) => labelOf(document, id))).toEqual([
      "fixed",
      "done",
      "canceled",
      "decided",
      "plain",
      "reopened"
    ])
    // IDEMPOTENT
    expect(STEP.run(document, NOW)).toBe(false)
  })
})
