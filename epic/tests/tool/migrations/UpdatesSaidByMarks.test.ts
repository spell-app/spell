/**
 * Tests of the migration `updates-said-by-marks` (epic `epic-engine` I159):  a phase's Update block written in the same
 * pass as its change marks goes;  the marks say it.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("updates-said-by-marks")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 29, 15, 0)

/** A change mark for `item`, stamped `at`. */
function mark(item: string, at = "2026-10-29 08:04"): string {
  return `<epic-change id="ch${item}" item="${item}" at="${at}">the new words</epic-change>`
}

/** An Update block stamped `at`, saying `html`. */
function update(html: string, at = "2026-10-29 08:06", summary = "No answer buttons"): string {
  return `<epic-update at="${at}" summary="${summary}">${html}</epic-update>`
}

/** A page of phases, `[id, inner]`, and its log. */
function page(phases: [string, string][]): Document {
  const inner = phases.map(
    ([id, html]) => `<epic-phase id="${id}" number="1" name="${id}" status="todo">${html}</epic-phase>`
  )
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">` +
      `${inner.join("")}</epic-section><epic-section id="log" kind="log"></epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("updates-said-by-marks", () => {
  test("drops a block stamped with the phase's marks and naming their item;  logged;  a second run changes nothing", () => {
    const document = page([
      [
        "p-tests-inline",
        `<epic-field name="goal"><p>${mark("q53")}</p></epic-field>` +
          update("<p>Owen answered Q53 (A, inline only) and asked for less;  new question Q58</p>")
      ]
    ])
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(document.querySelector("epic-update")).toBeNull()
    expect(document.querySelector("epic-change")).not.toBeNull()
    expect(notes).toEqual([
      `updates-said-by-marks:  P1's "Update:  No answer buttons" (2026-10-29 08:06), Q53's marks say it`
    ])
    expect(document.querySelector("epic-event")!.textContent).toBe(
      "Update blocks the change marks already say dropped:  P1"
    )
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("kept:  another time's marks, another item's, a file, an estimate, marks inside it, no item named", () => {
    const goal = (item: string, at?: string) => `<epic-field name="goal"><p>${mark(item, at)}</p></epic-field>`
    const document = page([
      ["p-a", goal("q1", "2026-10-25 04:30") + update("<p>Owen answered Q1</p>")],
      ["p-b", goal("q1") + update("<p>Owen answered Q2</p>")],
      ["p-c", goal("q1") + update("<p>Q1:  <code>src/tool/PlanDoc.ts</code> moves</p>")],
      ["p-d", goal("q1") + update("<p>Q1;  the estimate goes from 8-12h to 11-16h</p>")],
      ["p-e", update(`<p>Owen answered Q1:  ${mark("q1")}</p>`)],
      ["p-f", goal("q1") + update("<p>Plan adjusted:  split in two</p>")]
    ])
    expect(STEP.run(document, { now: NOW })).toBe(false)
    expect(document.querySelectorAll("epic-update")).toHaveLength(6)
  })
})
