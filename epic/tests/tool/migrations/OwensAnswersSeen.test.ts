/**
 * Tests of the migration `owens-answers-seen` (epic `epic-engine` I179):  a new Update block carrying out Owen's own
 * answer is stamped seen, and leaves its host's `to-see`.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("owens-answers-seen")!

/** Now, for the context:  under 3 days after the blocks. */
const NOW = new Date(2026, 9, 29, 15, 0)

/** An Update block `id`, stamped `at`, saying `html`. */
function update(id: string, html: string, at = "2026-10-26 21:54"): string {
  return `<epic-update id="${id}" at="${at}" summary="The one default theme is Glass">${html}</epic-update>`
}

/** A page of one phase holding `inner`, listing `toSee`;  questions Q39 (answered) and Q40 (open);  its log. */
function page(inner: string, toSee: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X">` +
      `<epic-section id="phases" kind="phases"><epic-phase id="p-one" title="One" status="todo" to-see="${toSee}">` +
      `${inner}</epic-phase></epic-section>` +
      `<epic-section id="questions" kind="questions">` +
      `<epic-item id="q39" title="Glass" status="decided" answered></epic-item>` +
      `<epic-item id="q40" title="Later?" status="open"></epic-item></epic-section>` +
      `<epic-section id="log" kind="log"></epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("owens-answers-seen", () => {
  test("stamps a block naming an answered item seen, out of `to-see`;  logged;  a second run changes nothing", () => {
    const document = page(
      update("up16", '<p>Owen picked Glass (<a href="#q39">Q39</a>).</p>') +
        update("up17", "<p>Split in two</p>", "2026-10-27 09:00"),
      "up16@2026-10-26T21:54 up17@2026-10-27T09:00"
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(document.getElementById("up16")!.getAttribute("seen")).toBe("2026-10-26 21:54")
    expect(document.getElementById("up17")!.hasAttribute("seen")).toBe(false)
    expect(document.querySelector("epic-phase")!.getAttribute("to-see")).toBe("up17@2026-10-27T09:00")
    expect(notes).toEqual([
      `owens-answers-seen:  P1's "Update:  The one default theme is Glass" (2026-10-26 21:54) is Owen's own answer (Q39):  seen`
    ])
    expect(document.querySelector("epic-event")!.textContent).toBe(
      "Update blocks carrying out Owen's own answers marked seen:  P1"
    )
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("the last one listed:  `to-see` goes", () => {
    const document = page(update("up16", "<p>Q39 carried out</p>"), "up16@2026-10-26T21:54")
    expect(STEP.run(document, { now: NOW })).toBe(true)
    expect(document.querySelector("epic-phase")!.hasAttribute("to-see")).toBe(false)
  })

  test("kept:  an open item named too, a file, an estimate, no item, a commit, quiet already, seen already, the record", () => {
    for (const inner of [
      update("up1", "<p>Q39, and a new question, Q40</p>"),
      update("up1", "<p>Q39:  moved to <code>src/tool/X.ts</code></p>"),
      update("up1", "<p>Q39:  the estimate goes to 6-8h</p>"),
      update("up1", "<p>Split in two</p>"),
      update("up1", "<p>paused at C04420396</p>"),
      update("up1", "<p>Q39 carried out</p>", "2026-10-20 09:00"),
      '<epic-update id="up1" at="2026-10-26 21:54" seen="2026-10-27 08:00"><p>Q39</p></epic-update>',
      `<epic-original>${update("up1", "<p>Q39 carried out</p>")}</epic-original>`
    ]) {
      const document = page(inner, "up1@2026-10-26T21:54")
      expect(STEP.run(document, { now: NOW }), inner).toBe(false)
      expect(document.querySelector("epic-phase")!.getAttribute("to-see")).toBe("up1@2026-10-26T21:54")
    }
  })
})
