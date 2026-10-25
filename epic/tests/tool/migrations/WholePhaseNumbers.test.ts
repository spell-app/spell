/**
 * Tests of the migration `whole-phase-numbers`:  every decimal phase (P17.1) a whole one, the phases after it renumbered.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PhaseIds } from "spell-epic/phases"
import { Migrations } from "spell-epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("whole-phase-numbers")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 12, 0)

/**
 * A page of phases `body`, item `t1` naming phase `2.1` (its `phase`, a link's words), item `t2` naming P3 the same
 * way and in its `work`, and a log line saying `P2.1` (history:  kept).
 */
function page(body: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">${body}</epic-section>` +
      `<epic-section id="todos" kind="todos"><epic-item id="t1" title="A todo" status="open" phase="2.1">` +
      `<p>see <a href="#p-late">P2.1 · Late</a></p></epic-item>` +
      `<epic-item id="t2" title="Another" status="open" phase="3" work="Queued for P3 · Three">` +
      `<p>see <a href="#p-three">P3 · Three</a>, and P3 · Three</p></epic-item></epic-section>` +
      `<epic-section id="log" kind="log"><epic-event>P2.1 Late added</epic-event></epic-section>` +
      `</epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("whole-phase-numbers", () => {
  test("a decimal becomes whole by its place;  the phases after it move down one, what names them follows;  once", () => {
    const document = page(
      `<epic-phase id="p-one" title="One" status="done"></epic-phase>` +
        `<epic-phase id="p-two" title="Two" status="done"></epic-phase>` +
        `<epic-phase id="p-late" number="2.1" title="Late" status="todo"></epic-phase>` +
        `<epic-phase id="p-three" title="Three" status="todo"></epic-phase>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    const phases = PhaseIds.phasesIn(document)
    expect(phases.map(PhaseIds.labelOf)).toEqual(["P1", "P2", "P3", "P4"])
    expect(phases.some((phase) => phase.hasAttribute("number"))).toBe(false)
    const [late, three] = ["t1", "t2"].map((id) => document.getElementById(id)!)
    expect([late!.getAttribute("phase"), late!.querySelector("a")!.textContent]).toEqual(["3", "P3 · Late"])
    expect([three!.getAttribute("phase"), three!.getAttribute("work"), three!.textContent]).toEqual([
      "4",
      "Queued for P4 · Three",
      "see P4 · Three, and P4 · Three"
    ])
    expect(document.querySelector("epic-event")!.textContent).toBe("P2.1 Late added")
    expect(notes).toEqual(["whole-phase-numbers:  P2.1 -> P3", "whole-phase-numbers:  P3 -> P4"])
    expect(STEP.run(document, { now: NOW, notes: [] })).toBe(false)
  })

  test("a page with no decimal (every page from before P39) is left as it was", () => {
    const document = page(
      `<epic-phase id="p-one" title="One" status="done"></epic-phase>` +
        `<epic-phase id="p-three" title="Three" status="todo"></epic-phase>`
    )
    const before = document.documentElement.outerHTML
    expect(STEP.run(document, { now: NOW, notes: [] })).toBe(false)
    expect(document.documentElement.outerHTML).toBe(before)
  })

  test("a started phase renumbered is noted:  commit subjects with its old number name it", () => {
    const document = page(
      `<epic-phase id="p-late" number="0.1" title="Late" status="done"></epic-phase>` +
        `<epic-phase id="p-one" title="One" status="done"></epic-phase>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(notes).toContain("whole-phase-numbers:  p-one has started:  commits saying P1 name it")
  })
})
