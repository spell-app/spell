/**
 * Tests of the migration `handed-on-fixes` (epic `epic-engine` I317):  a fix sent back, whose note was handed on to
 * another item, is fixed again once that one is.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("handed-on-fixes")!

/** The context every run gets. */
const NOW = { now: new Date(2026, 10, 16, 21, 30) }

/** A status card in state `state`, at `at`, saying `words`. */
function card(state: string, at: string, words = `${state} words`): string {
  const doneAt = state === "done" ? ` done-at="${at}"` : ""
  return `<epic-status slot="status" state="${state}" at="${at}"${doneAt}><p>${words}</p></epic-status>`
}

/** An item `id` of `attributes`, its title labelled `became`, holding `cards`. */
function item(id: string, attributes: string, cards: string, became = "reopened"): string {
  return (
    `<epic-item id="${id}" ${attributes}><span slot="title">${id} words <epic-update became="${became}">` +
    `</epic-update></span>${cards}</epic-item>`
  )
}

/** A page holding `items`' markup in a section. */
function page(items: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="issues" kind="issues">${items}</epic-section>` +
      `</epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Language's I147, as its page held it:  fixed, sent back, its note handed on to I148. */
const I147 = item(
  "i147",
  'status="open" requested urgent',
  card("done", "2026-11-16 19:48") +
    card(
      "noted",
      "2026-11-16 19:56",
      "Your C2 (feet drawn the old way for 1-2s) is being fixed as I148, by language-feetflash"
    )
)

describe("handed-on-fixes", () => {
  test("language's I147, once I148 is fixed:  fixed, FIXED, a Done card at I148's time naming it", () => {
    const document = page(I147 + item("i148", 'status="open" fixed', card("done", "2026-11-16 20:33"), "fixed"))
    const notes: string[] = []
    expect(STEP.run(document, { ...NOW, notes })).toBe(true)
    const i147 = document.getElementById("i147")!
    expect(i147.hasAttribute("fixed")).toBe(true)
    expect(i147.querySelector("epic-update")!.getAttribute("became")).toBe("fixed")
    const done = Array.from(i147.querySelectorAll("epic-status")).at(-1)!
    expect(done.getAttribute("state")).toBe("done")
    expect(done.getAttribute("done-at")).toBe("2026-11-16 20:33")
    expect(done.querySelector('a[href="#i148"]')!.textContent).toBe("I148")
    expect(notes).toEqual(["handed-on-fixes:  fixed again:  I147"])
    // IDEMPOTENT, and `reopened-fixes` leaves it fixed:  its latest card is Done
    expect(STEP.run(document, { ...NOW, notes: [] })).toBe(false)
    expect(Migrations.named("reopened-fixes")!.run(document, NOW)).toBe(false)
  })

  test("I148 accepted (done) fixes it too;  canceled, or still open, leaves it reopened", () => {
    const done = page(I147 + item("i148", 'status="done"', card("done", "2026-11-16 20:33"), "done"))
    expect(STEP.run(done, NOW)).toBe(true)
    for (const other of ['status="open"', 'status="canceled"']) {
      const document = page(I147 + item("i148", other, card("underway", "2026-11-16 20:00")))
      expect(STEP.run(document, NOW)).toBe(false)
      expect(document.getElementById("i147")!.hasAttribute("fixed")).toBe(false)
    }
  })

  test("left as they are:  a Noted card naming no item, or one the page lacks;  no Done card before;  a todo;  a call never sent back", () => {
    const fixed = item("i9", 'status="open" fixed', card("done", "2026-11-16 20:33"), "fixed")
    const document = page(
      fixed +
        item("i1", 'status="open"', card("done", "2026-11-16 9:00") + card("noted", "2026-11-16 10:00", "Queued")) +
        item("i2", 'status="open"', card("done", "2026-11-16 9:00") + card("noted", "2026-11-16 10:00", "as I77")) +
        item("i3", 'status="open"', card("noted", "2026-11-16 10:00", "being fixed as I9")) +
        item("t4", 'status="open"', card("done", "2026-11-16 9:00") + card("noted", "2026-11-16 10:00", "as I9")) +
        // data's J182:  calm, its tidy note naming the todo that obviated it
        item(
          "j5",
          'status="open" calm',
          card("done", "2026-11-8 11:32") + card("noted", "2026-11-8 13:07", "went with I9"),
          ""
        )
    )
    expect(STEP.run(document, NOW)).toBe(false)
  })
})
