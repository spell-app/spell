/**
 * Tests of "0. While you were out" (epic `epic-engine` P62):  `NightSummary`, what Claude did since Owen last read it and
 * what needs him, and `PlanDoc.refreshAway()` / `readAway()`, which draw and take off its section.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"

import { NightSummary } from "spell/epic/tool/NightSummary"
import { PlanDoc } from "spell/epic/tool/PlanDoc"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** When Owen last read it:  local 2026-11-02 22:00. */
const READ = new Date(2026, 10, 2, 22, 0)

/** The night's work:  an hour later. */
const NIGHT = new Date(2026, 10, 2, 23, 0)

/** A page read at `READ` (its section starts counting then), with two phases. */
function readPage(): PlanDoc {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), READ, { person: "Owen" })
  plan.addPhase("Build it")
  plan.addPhase("Polish it")
  plan.refreshAway()
  return plan
}

/** The night:  P1 done with its Done list and a commit, P2 started, a red question, an issue, a manual test. */
function night(plan: PlanDoc) {
  plan.now = NIGHT
  plan.log("P1 active")
  plan.setPhase(1, "done", { done: "<ul><li>the thing, built</li><li>more</li></ul>" })
  Markup.place(plan.phase(1), Markup.element(plan.document, "epic-commit", { sha: "a10023c2a0475c4b" }))
  plan.log("P2 active")
  plan.setPhase(2, "active")
  plan.addItem("question", "Which colour?")
  plan.addItem("issue", "It flickers")
  plan.addItem("test", "Try it live")
  plan.updateStates()
  plan.log("Bedtime done:  1 done, 1 part done;  1 question")
}

describe("NightSummary", () => {
  test("what was done since Owen read it, and what needs him, in order", () => {
    const plan = readPage()
    night(plan)
    const summary = NightSummary.of(plan, READ, { isMerged: () => false })
    // the log's line, its spaces as the log reads them back (one each)
    expect(summary.lead).toEqual(["1 done, 1 part done; 1 question"])
    expect(summary.done.map(({ label, status, built, sha, merged }) => [label, status, built, sha, merged])).toEqual([
      ["P1 · Build it", "done", "the thing, built", "a10023c2a", false],
      ["P2 · Polish it", "under way", "", undefined, undefined]
    ])
    expect(summary.needs.map(({ label, why }) => `${label} ${why}`)).toEqual([
      "Q1 needs your call",
      "I1 open issue",
      "M1 to test",
      "P2 part done"
    ])
    expect(summary.waiting).toBe(4)
  })

  test("nothing since Owen read it:  empty", () => {
    const plan = readPage()
    expect(NightSummary.of(plan, NIGHT).isEmpty).toBe(true)
  })
})

describe("PlanDoc.refreshAway() and readAway()", () => {
  test("a page starts counting the first time:  no section, its read time stamped", () => {
    const plan = readPage()
    expect(plan.page.getAttribute("away-read")).toMatch(/^2026-11-02T22:00/)
    expect(plan.page.querySelector('epic-section[kind="away"]')).toBeNull()
  })

  test("something new:  the section FIRST, titled 0, its lines linking phases and items;  the markup still valid", () => {
    const plan = readPage()
    night(plan)
    plan.refreshAway({ isMerged: () => true })
    const section = plan.page.firstElementChild!
    expect([section.localName, section.id, section.getAttribute("kind"), section.getAttribute("title")]).toEqual([
      "epic-section",
      "away",
      "away",
      "0. While you were out"
    ])
    expect(section.getAttribute("waiting")).toBe("4")
    expect(section.textContent).toContain("P1 · Build it done:  the thing, built  (a10023c2a, merged)")
    expect(Array.from(section.querySelectorAll("a"), (link) => link.getAttribute("href"))).toContain("#q1")
    expect(Markup.validate(plan.document).map((problem) => problem.message)).toEqual([])
  })

  test("Done reading takes it off, and the next news starts after it", () => {
    const plan = readPage()
    night(plan)
    plan.refreshAway()
    plan.now = new Date(2026, 10, 3, 8, 0)
    expect(plan.applyMark({ id: "away", action: "seen" } as Parameters<PlanDoc["applyMark"]>[0]).applied).toBe(true)
    plan.refreshAway()
    expect(plan.page.querySelector('epic-section[kind="away"]')).toBeNull()
    expect(plan.page.getAttribute("away-read")).toMatch(/^2026-11-03T08:00/)
  })
})
