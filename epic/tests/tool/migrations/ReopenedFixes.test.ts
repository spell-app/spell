/**
 * Tests of the migration `reopened-fixes` (epic `epic-engine` I303):  a fix Owen sent back, taken up again, is
 * reopened, its label `REOPENED`.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("reopened-fixes")!

/** The context every run gets. */
const NOW = { now: new Date(2026, 10, 15, 16, 0) }

/** A status card in state `state`, at `at`. */
function card(state: string, at: string): string {
  return `<epic-status slot="status" state="${state}" at="${at}"><p>${state} words</p></epic-status>`
}

/** An item `id` of `attributes`, its title labelled `FIXED`, holding `cards`. */
function item(id: string, attributes: string, cards: string): string {
  return (
    `<epic-item id="${id}" ${attributes}><span slot="title">${id} words <epic-update became="fixed"></epic-update>` +
    `</span>${cards}</epic-item>`
  )
}

/** A page holding `items`' markup in a section. */
function page(items: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="issues" kind="issues">${items}</epic-section>` +
      `</epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("reopened-fixes", () => {
  test("a fix sent back and taken up (editor's I139:  Done, then Noted) is reopened:  REOPENED, wanted, not fixed", () => {
    const document = page(
      item(
        "i139",
        'status="open" fixed requested review-as="revisit" calm',
        card("done", "2026-11-14 17:58") + card("noted", "2026-11-15 15:37")
      ) + item("j7", 'status="open" fixed', card("done", "2026-11-14 10:00") + card("underway", "2026-11-15 9:00"))
    )
    const notes: string[] = []
    expect(STEP.run(document, { ...NOW, notes })).toBe(true)
    for (const id of ["i139", "j7"]) {
      const reopened = document.getElementById(id)!
      expect(reopened.hasAttribute("fixed")).toBe(false)
      expect(reopened.hasAttribute("urgent")).toBe(true)
      expect(reopened.hasAttribute("calm")).toBe(false)
      expect(reopened.querySelector("epic-update")!.getAttribute("became")).toBe("reopened")
    }
    expect(notes).toEqual(["reopened-fixes:  sent back and taken up again:  I139, J7"])
    // IDEMPOTENT
    expect(STEP.run(document, { ...NOW, notes: [] })).toBe(false)
  })

  test("left as they are:  a fix still waiting (Done last), a Do this's Go ahead with no fix before, a closed one, a todo", () => {
    const document = page(
      item("i1", 'status="open" fixed', card("noted", "2026-11-14 9:00") + card("done", "2026-11-14 10:00")) +
        item("i2", 'status="open" fixed', card("noted", "2026-11-14 9:00")) +
        item("i3", 'status="done"', card("done", "2026-11-14 10:00") + card("noted", "2026-11-15 9:00")) +
        item("t4", 'status="open" fixed', card("done", "2026-11-14 10:00") + card("underway", "2026-11-15 9:00"))
    )
    expect(STEP.run(document, NOW)).toBe(false)
    expect(["i1", "i2", "t4"].every((id) => document.getElementById(id)!.hasAttribute("fixed"))).toBe(true)
  })

  test("a reopened fix with no label gets one, REOPENED, its title attribute made a title slot", () => {
    const document = page(
      `<epic-item id="i5" status="open" fixed title="I5 words">${card("done", "2026-11-14 10:00")}` +
        `${card("underway", "2026-11-15 9:00")}</epic-item>`
    )
    expect(STEP.run(document, NOW)).toBe(true)
    const i5 = document.getElementById("i5")!
    expect(i5.hasAttribute("title")).toBe(false)
    expect(i5.querySelector('[slot="title"]')!.textContent).toBe("I5 words ")
    expect(i5.querySelector("epic-update")!.getAttribute("became")).toBe("reopened")
  })
})
