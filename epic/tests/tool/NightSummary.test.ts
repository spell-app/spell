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
      "M1 to test"
    ])
    // a phase under way is listed once, under Under way (I223)
    expect(summary.waiting).toBe(3)
  })

  // epic `epic-engine` r57, I224 (🚧 language:  issues made into todos stayed "open issue" under Still to do)
  // epic `epic-engine` I228:  a phase dropped since Owen read it is news, with the done, saying why
  test("a phase dropped since Owen read it:  listed with the done, its why its line", () => {
    const plan = readPage()
    plan.now = NIGHT
    plan.setPhase(1, "dropped", { why: "<p>Moved to P2</p>" })
    const summary = NightSummary.of(plan, READ)
    expect(summary.done.map(({ label, status, built }) => [label, status, built])).toEqual([
      ["P1 · Build it", "dropped", "Moved to P2 · Polish it"]
    ])
    plan.refreshAway()
    const line = plan.document.querySelector('epic-away-line[line="p-build-it"]')!
    expect(line.textContent).toBe("P1 · Build it dropped:  Moved to P2 · Polish it")
  })

  test("an issue Owen said Do this on leaves Still to do until it's fixed:  it waits on Claude, then on him", () => {
    const plan = readPage()
    night(plan)
    expect(plan.applyMark({ id: "i1", action: "todo" } as Parameters<PlanDoc["applyMark"]>[0]).applied).toBe(true)
    expect(NightSummary.of(plan, READ).needs.map(({ label }) => label)).toEqual(["Q1", "M1"])
    plan.fixedForReview("i1", "Fixed")
    expect(NightSummary.of(plan, READ).needs.map(({ label }) => label)).toContain("I1")
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
    expect(section.getAttribute("waiting")).toBe("3")
    expect(section.textContent).toContain("P1 · Build it done:  the thing, built  (a10023c2a, merged)")
    // a phase under way in a part of its own, after What was done (I223):  its mark spinning, no "under way" words
    const headings = Array.from(section.querySelectorAll("epic-away-line[heading]"), (line) =>
      line.getAttribute("line")
    )
    expect(headings).toEqual(["done", "underway", "todo"])
    const running = section.querySelector("epic-away-line[working]")!
    expect(running.previousElementSibling!.getAttribute("line")).toBe("underway")
    expect(running.textContent).toBe("P2 · Polish it")
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

describe("a line's Read (I206)", () => {
  /** Owen ticks `line` Read at `at`:  the Seen mark on `away:<line>` applied, the section drawn again. */
  function readLine(plan: PlanDoc, line: string, at: Date) {
    plan.now = at
    const done = plan.applyMark({ id: `away:${line}`, action: "seen" } as Parameters<PlanDoc["applyMark"]>[0])
    expect(done.applied).toBe(true)
    plan.refreshAway()
  }

  /** The section's lines, by key. */
  function lines(plan: PlanDoc): string[] {
    const section = plan.page.querySelector('epic-section[kind="away"]')
    return Array.from(section?.querySelectorAll("epic-away-line") ?? [], (line) => line.getAttribute("line")!)
  }

  test("each line and each part's heading is an <epic-away-line>, listed on the section for the inbox", () => {
    const plan = readPage()
    night(plan)
    plan.refreshAway()
    const keys = lines(plan)
    expect(keys[0]).toBe("done")
    expect(keys).toContain("todo")
    expect(keys).toContain("q1")
    expect(plan.page.querySelector('epic-section[kind="away"]')!.getAttribute("lines")).toBe(keys.join(" "))
    expect(Markup.validate(plan.document).map((problem) => problem.message)).toEqual([])
  })

  test("a line read leaves;  the rest stays;  the item itself stays open", () => {
    const plan = readPage()
    night(plan)
    plan.refreshAway()
    readLine(plan, "q1", new Date(2026, 10, 3, 8, 0))
    expect(lines(plan)).not.toContain("q1")
    expect(lines(plan)).toContain("i1")
    expect(plan.findItem("q1")!.getAttribute("status")).not.toBe("done")
    expect(plan.page.getAttribute("away-seen")).toMatch(/^q1=2026-11-03T08:00/)
  })

  test("a part's heading read takes its whole part;  the other part stays", () => {
    const plan = readPage()
    night(plan)
    plan.refreshAway()
    readLine(plan, "done", new Date(2026, 10, 3, 8, 0))
    expect(lines(plan)).not.toContain("done")
    // Under way is a part of its own (I223):  it stays too
    expect(lines(plan).slice(0, 4)).toEqual(["underway", "p-polish-it", "todo", "q1"])
  })

  test("a line read, then changed again, comes back;  Done reading forgets every line's read", () => {
    const plan = readPage()
    night(plan)
    plan.refreshAway()
    readLine(plan, "i1", new Date(2026, 10, 3, 8, 0))
    expect(lines(plan)).not.toContain("i1")
    plan.now = new Date(2026, 10, 3, 9, 0)
    plan.findItem("i1")!.setAttribute("changed", "2026-11-03T09:00")
    plan.refreshAway()
    expect(lines(plan)).toContain("i1")
    plan.applyMark({ id: "away", action: "seen" } as Parameters<PlanDoc["applyMark"]>[0])
    expect(plan.page.hasAttribute("away-seen")).toBe(false)
  })
})

// epic `epic-engine` I235:  what Owen has addressed leaves the list, and finished phases age out
describe("NightSummary:  addressed items and aged phases", () => {
  /** The labels waiting on Owen, read at `READ`. */
  const needsOf = (plan: PlanDoc, options: Parameters<typeof NightSummary.of>[2] = {}) =>
    NightSummary.of(plan, READ, options).needs.map(({ label }) => label)

  const mark = (plan: PlanDoc, id: string, action: string, extra: object = {}) =>
    plan.applyMark({ id, action, ...extra } as Parameters<PlanDoc["applyMark"]>[0])

  test.each([
    ["Do this", "i1", "todo", {}],
    ["Approve", "i1", "approve", {}],
    ["Skip", "i1", "skip", {}],
    ["Next phase", "i1", "next", {}],
    ["Drop it", "i1", "drop", {}],
    ["Make Todo on a question", "q1", "todo", {}],
    ["a test passed", "m1", "test", { result: "passed" }],
    ["a test put off", "m1", "test", { result: "notnow" }]
  ])("%s:  it leaves Still to do, though marking it changed it", (_name, id, action, extra) => {
    const plan = readPage()
    night(plan)
    expect(needsOf(plan)).toContain(id.toUpperCase())
    expect(mark(plan, id, action, extra).applied).toBe(true)
    expect(needsOf(plan)).not.toContain(id.toUpperCase())
  })

  test("a sent mark not applied yet (Do this now is a revisit now):  addressed", () => {
    const plan = readPage()
    night(plan)
    expect(needsOf(plan, { answered: new Set(["i1"]) })).toEqual(["Q1", "M1"])
  })

  test("closed:  it leaves", () => {
    const plan = readPage()
    night(plan)
    plan.setItem("i1", "done")
    expect(needsOf(plan)).toEqual(["Q1", "M1"])
  })

  test("not addressed:  every kind stays", () => {
    const plan = readPage()
    night(plan)
    expect(needsOf(plan)).toEqual(["Q1", "I1", "M1"])
  })

  test("a fix Claude made since is back, saying so;  his review takes it off again", () => {
    const plan = readPage()
    night(plan)
    mark(plan, "i1", "todo")
    plan.fixedForReview("i1", "Fixed")
    expect(NightSummary.of(plan, READ).needs.map(({ label, why }) => `${label} ${why}`)).toEqual([
      "I1 fixed, to review",
      "Q1 needs your call",
      "M1 to test"
    ])
    mark(plan, "i1", "approve")
    expect(needsOf(plan)).toEqual(["Q1", "M1"])
  })

  /** A page with P1 finished `daysAgo` days before the moment it's read. */
  function finished(status: "done" | "dropped", daysAgo: number): PlanDoc {
    const plan = readPage()
    plan.now = NIGHT
    plan.setPhase(1, status, status === "done" ? {} : { why: "<p>Not needed</p>" })
    plan.now = new Date(NIGHT.getTime() + daysAgo * 86_400_000)
    return plan
  }

  /** The labels of the finished phases listed. */
  const doneOf = (plan: PlanDoc, days = 3) =>
    NightSummary.of(plan, READ, { finishedPhaseDays: days }).done.map(({ label }) => label)

  test.each(["done", "dropped"] as const)("%s 2 days ago stays, 4 days ago goes", (status) => {
    expect(doneOf(finished(status, 2))).toEqual(["P1 · Build it"])
    expect(doneOf(finished(status, 4))).toEqual([])
  })

  test("the number of days is the setting's", () => {
    expect(doneOf(finished("done", 4), 7)).toEqual(["P1 · Build it"])
  })

  test("a phase with no time recorded stays, however old, and is read like any other", () => {
    const plan = finished("done", 30)
    plan.phase(1).removeAttribute("done-at")
    expect(doneOf(plan)).toEqual(["P1 · Build it"])
    plan.readAwayLine("p-build-it")
    expect(NightSummary.of(plan, READ, { finishedPhaseDays: 3, seen: plan.awaySeen }).done).toEqual([])
  })

  test("a bedtime lead line ages out with what it describes", () => {
    const plan = readPage()
    night(plan)
    expect(NightSummary.of(plan, READ, { finishedPhaseDays: 3 }).lead).toHaveLength(1)
    plan.now = new Date(NIGHT.getTime() + 4 * 86_400_000)
    expect(NightSummary.of(plan, READ, { finishedPhaseDays: 3 }).lead).toEqual([])
  })
})
