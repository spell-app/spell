/**
 * Tests of the migration `log-commits` (epic `epic-engine` P52, J151):  the Log gets an entry per commit of the epic's
 * history, handed in as `commits --backfill` reads it.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"
import type { CommitHistory } from "spell/epic/tool/planDoc.types"

/** The step under test. */
const STEP = Migrations.named("log-commits")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 29, 15, 0)

/** The page's repo. */
const BASE = "https://github.com/spell-app/spell"

/** A page with phase "One" (`p-one`), item `i1`, and a log with one review line. */
function page(): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">` +
      `<epic-phase id="p-one" status="done"><span slot="title">One</span></epic-phase></epic-section>` +
      `<epic-section id="issues" kind="issues"><epic-item id="i1" status="open" title="bug"></epic-item></epic-section>` +
      `<epic-section id="log" kind="log"><epic-event at="2026-10-20T12:30-04:00">P1 active</epic-event>` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** The history `PlanDocFiles.epicHistory()` would hand in, newest first. */
const HISTORY: CommitHistory = {
  epic: "x",
  base: BASE,
  log: [
    { sha: "c".repeat(40), subject: "x I1:  the fix", time: "2026-10-20T14:00:00-04:00" },
    { sha: "b".repeat(40), subject: "other P1:  One -- another epic's", time: "2026-10-20T13:00:00-04:00" },
    { sha: "a".repeat(40), subject: "x P1:  One -- built", time: "2026-10-20T12:00:00-04:00" }
  ]
}

describe("log-commits", () => {
  test("an entry per commit of the epic, by time among the review lines;  a note;  a second run changes nothing", () => {
    const document = page()
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes, history: () => HISTORY })).toBe(true)
    const log = document.querySelector('epic-section[kind="log"]')!
    expect(Array.from(log.children, (line) => `${line.localName} ${line.getAttribute("at")}`)).toEqual([
      "epic-commit 2026-10-20T12:00-04:00",
      "epic-event 2026-10-20T12:30-04:00",
      "epic-commit 2026-10-20T14:00-04:00"
    ])
    expect(log.querySelector("epic-commit")!.getAttribute("refs")).toBe("p-one")
    expect(log.lastElementChild!.getAttribute("refs")).toBe("i1")
    // the Log only:  nothing under the phase or the item, and the page's own repo left as it was
    expect(document.querySelectorAll(":not(epic-section) > epic-commit")).toHaveLength(0)
    expect(document.querySelector("epic-page")!.hasAttribute("repo")).toBe(false)
    expect(log.querySelector("epic-commit")!.getAttribute("repo")).toBe(BASE)
    expect(notes).toEqual(["log-commits:  2 commits into the Log"])
    const again: string[] = []
    expect(STEP.run(document, { now: NOW, notes: again, history: () => HISTORY })).toBe(false)
    expect(again).toEqual([])
  })

  test("no history to be had:  nothing", () => {
    const document = page()
    expect(STEP.run(document, { now: NOW })).toBe(false)
    expect(STEP.run(document, { now: NOW, history: () => undefined })).toBe(false)
    expect(document.querySelector('epic-section[kind="log"] > epic-commit')).toBeNull()
  })

  test("on command only:  it runs git", () => {
    expect(STEP.everyEdit).toBe(false)
  })
})
