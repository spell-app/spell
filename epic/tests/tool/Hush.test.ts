/**
 * Tests of `Hush` (`epic hush`, epic `epic-engine` T122):  which items it may grey (colours, the 3-day line, the
 * exclusions), and applying a judge's calls, with a fake judge:  never `claude -p`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"
import { Hush, type HushJudge, type HushRequest } from "spell/epic/tool/Hush"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))
const DAY = 86_400_000

let plan: PlanDoc

/** `plan` with `make` run as of `daysAgo` days ago, then back to now. */
function back<T>(daysAgo: number, make: () => T): T {
  const now = plan.now
  plan.now = new Date(now.getTime() - daysAgo * DAY)
  try {
    return make()
  } finally {
    plan.now = now
  }
}

/** The ids `Hush.candidates()` gives, upper case. */
const candidateIds = (skip = {}) => Hush.candidates(plan, skip).map((each) => each.id.toUpperCase())

/** A judge hushing every item but those in `keep`, keeping what it was asked. */
function judge(keep: string[] = []) {
  const asked: HushRequest[] = []
  const fake: HushJudge = (request) => {
    asked.push(request)
    return [...request.text.matchAll(/^## (\w+)/gm)].map(([, id]) => ({
      id: id!,
      hush: !keep.includes(id!),
      why: keep.includes(id!) ? "changed what he sees" : "routine"
    }))
  }
  return { fake, asked }
}

/** `id`'s colour as the page draws it now. */
const drawn = (id: string) =>
  DrawnState.of(
    { ...DrawnState.fieldsOf(plan.item(id)), state: plan.itemState(plan.item(id)) },
    NO_LIVE_REVIEW,
    plan.now.getTime()
  )

beforeEach(() => {
  plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  // J1:  a calm call, 5 days old (yellow);  J2:  the same, a day old;  J3:  calm, its work not on main (blue)
  back(5, () => plan.addItem("judgement", "Old calm call", { calm: true }))
  back(1, () => plan.addItem("judgement", "New calm call", { calm: true }))
  back(5, () => plan.addItem("judgement", "Unmerged call", { calm: true }))
  plan.item("j3").setAttribute("unmerged", "x")
  // J4:  not calm (red);  J5:  promised, not delivered
  back(5, () => plan.addItem("judgement", "Loud call"))
  back(5, () => {
    plan.addItem("judgement", "Promised call", { calm: true })
    plan.noteStatus("j5", "Promised, not delivered:  the page")
  })
  // I1:  fixed for his review, 4 days ago (orange);  I2:  open, calm, not fixed (open work);  I3:  requested, done
  back(4, () => {
    plan.addItem("issue", "Fixed issue")
    plan.item("i1").setAttribute("urgent", "")
    plan.fixedForReview("i1", "the fix")
  })
  back(6, () => plan.addItem("issue", "Open calm issue", { calm: true }))
  back(6, () => {
    plan.addItem("issue", "Requested issue", { requested: true })
    plan.setItem("i3", "done")
  })
  // T1:  an open todo (open work);  M1:  a manual test
  back(6, () => plan.addItem("todo", "Open todo"))
  back(6, () => plan.addItem("test", "Try it"))
})

describe("candidates", () => {
  test("green, yellow and orange items, settled 3 days ago or more", () => {
    expect(candidateIds()).toEqual(["J1", "I1", "I3"])
    expect(Hush.candidates(plan).map(({ colour, ageDays }) => [colour, ageDays])).toEqual([
      ["yellow", 5],
      ["orange", 4],
      ["orange", 6]
    ])
  })

  test("the 3-day line:  a card since makes it newer", () => {
    back(1, () => plan.addStatus("j1", "a note", { state: "noted" }))
    expect(candidateIds()).not.toContain("J1")
  })

  test("never red, blue, open work, promised, a manual test", () => {
    for (const id of ["J2", "J3", "J4", "J5", "I2", "T1", "M1"]) expect(candidateIds()).not.toContain(id)
  })

  test("never one with his mark waiting, Claude at work on it, or a thread open on it", () => {
    expect(candidateIds({ marked: new Set(["j1"]), working: new Set(["i1"]), commented: new Set(["i3"]) })).toEqual([])
  })

  test("pure:  the page is untouched", () => {
    const before = plan.toString()
    Hush.candidates(plan)
    expect(plan.toString()).toBe(before)
  })
})

describe("decide and apply", () => {
  test("the judge reads each candidate, and the rule;  an item it doesn't answer is kept", () => {
    const { asked } = judge()
    const calls = new Hush({ judge: () => [{ id: "J1", hush: true, why: "routine" }] }).decide(
      "x",
      Hush.candidates(plan)
    )
    expect(asked).toEqual([])
    expect(calls.map(({ id, hush }) => [id, hush])).toEqual([
      ["j1", true],
      ["i1", false],
      ["i3", false]
    ])
    expect(calls[1]!.why).toMatch(/no answer/)
    const { fake, asked: seen } = judge()
    new Hush({ judge: fake }).decide("x", Hush.candidates(plan))
    expect(seen[0]!.system).toMatch(/80% sure/)
    expect(seen[0]!.text).toMatch(/## I1 · issue · orange \(fixed, waiting for his review\) · settled 4 days ago/)
    expect(seen[0]!.model).toBe("sonnet")
  })

  test("hushed items greyed as his check would, each logged, then the run's line;  kept ones untouched", () => {
    const { fake } = judge(["I3"])
    const calls = new Hush({ judge: fake }).decide("x", Hush.candidates(plan))
    const { greyed, lines } = Hush.apply(plan, calls)
    expect(greyed).toBe(2)
    expect(lines).toEqual([
      "J1 hushed:  routine (approved:  closed (accepted))",
      "I1 hushed:  routine (approved:  closed (fix accepted))",
      "Hush:  2 greyed, 1 kept"
    ])
    expect(drawn("j1")).toBe("old")
    expect(drawn("i1")).toBe("old")
    expect(plan.item("j1").getAttribute("reviewed")).toBe(plan.today)
    expect(plan.item("i1").getAttribute("review-as")).toBe("approve")
    expect(drawn("i3")).toBe("requested")
    expect(plan.reviewLines().map((line) => line.text)).toEqual(
      expect.arrayContaining(lines.map((line) => line.replace(/\s+/g, " ")))
    )
    // greyed, they're no candidates any more
    expect(candidateIds()).toEqual(["I3"])
  })

  test("a call no longer a candidate (the page changed since) is left alone", () => {
    const { fake } = judge()
    const calls = new Hush({ judge: fake }).decide("x", Hush.candidates(plan))
    plan.addStatus("j1", "picked up again", { state: "noted" })
    expect(Hush.apply(plan, calls).greyed).toBe(2)
    expect(drawn("j1")).toBe("open")
  })

  test("the table:  id, colour, age, hush or keep, why", () => {
    const { fake } = judge(["I3"])
    const calls = new Hush({ judge: fake }).decide("x", Hush.candidates(plan))
    expect(Hush.table(calls)).toEqual([
      "  J1    yellow  5d   hush  routine",
      "  I1    orange  4d   hush  routine",
      "  I3    orange  6d   keep  changed what he sees"
    ])
  })
})

describe("epic hush", () => {
  const root = mkdtempSync(join(tmpdir(), "hush-"))
  const file = join(root, "epics", "x", "x.plan.html")
  const files = new PlanDocFiles({ root })
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  /** `epic hush` with `args` on `plan` saved, the fake judge keeping I3;  what it printed, and the page before. */
  async function hush(...args: string[]) {
    rmSync(join(root, "epics"), { recursive: true, force: true })
    mkdirSync(join(root, "epics", "x"), { recursive: true })
    await files.writeDoc(file, plan, true)
    const before = readFileSync(file, "utf8")
    const printed: string[] = []
    const owner = new PlanDocCommands({ files, hushJudge: judge(["I3"]).fake })
    vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
    expect(await owner.run(["hush", ...args])).toBe(0)
    return { out: printed.join("\n"), before }
  }

  test("--dryrun:  the counts and the table;  nothing written", async () => {
    const { out, before } = await hush("x", "--dryrun")
    expect(out).toMatch(/^x:  3 settled 3\+ days:  2 to hush, 1 to keep \(dry run:  nothing changed\)/)
    expect(out).toContain("  I3    orange  6d   keep  changed what he sees")
    expect(readFileSync(file, "utf8")).toBe(before)
  })

  test("for real:  the counts and the kept ones;  the page greyed and logged", async () => {
    const { out } = await hush("x")
    expect(out).toBe("x:  Hush:  2 greyed, 1 kept\n  I3    orange  6d   keep  changed what he sees")
    const saved = files.read(file)
    expect(saved.item("j1").getAttribute("status")).toBe("done")
    expect(saved.reviewLines().map((line) => line.text)).toContain("Hush: 2 greyed, 1 kept")
  })
})
