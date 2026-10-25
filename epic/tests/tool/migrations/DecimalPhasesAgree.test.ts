/**
 * Tests of the migration `decimal-phases-agree`:  a decimal phase (P11.1) out of place takes the number that fits it.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PhaseIds } from "spell-epic/phases"
import { Migrations } from "spell-epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("decimal-phases-agree")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 12, 0)

/** A page of phases `body`, and item `t1` naming phase `2.1` (by its `phase`, and a link's words). */
function page(body: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">${body}</epic-section>` +
      `<epic-section id="todos" kind="todos"><epic-item id="t1" title="A todo" status="open" phase="2.1">` +
      `<p>see <a href="#p-late">P2.1 · Late</a></p></epic-item></epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("decimal-phases-agree", () => {
  test("a decimal moved by hand takes the number that fits;  the item and link naming it follow;  once", () => {
    const document = page(
      `<epic-phase id="p-one" title="One" status="done"></epic-phase>` +
        `<epic-phase id="p-late" number="2.1" title="Late" status="todo"></epic-phase>` +
        `<epic-phase id="p-two" title="Two" status="todo"></epic-phase>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(PhaseIds.phasesIn(document).map(PhaseIds.labelOf)).toEqual(["P1", "P1.1", "P2"])
    const item = document.getElementById("t1")!
    expect([item.getAttribute("phase"), item.querySelector("a")!.textContent]).toEqual(["1.1", "P1.1 · Late"])
    expect(notes).toEqual(["decimal-phases-agree:  P2.1 -> P1.1"])
    expect(STEP.run(document, { now: NOW, notes: [] })).toBe(false)
  })

  test("a page whose decimals fit, or with none (every page from before P39), is left as it was", () => {
    const document = page(
      `<epic-phase id="p-one" title="One" status="done"></epic-phase>` +
        `<epic-phase id="p-two" title="Two" status="todo"></epic-phase>` +
        `<epic-phase id="p-late" number="2.1" title="Late" status="todo"></epic-phase>`
    )
    const before = document.documentElement.outerHTML
    expect(STEP.run(document, { now: NOW, notes: [] })).toBe(false)
    expect(document.documentElement.outerHTML).toBe(before)
  })
})
