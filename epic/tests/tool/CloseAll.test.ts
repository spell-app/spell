/**
 * Tests of a section's Close all (epic `epic-engine` T158):  which items it closes (`CloseAllRule`, `CloseAll`), and
 * closing them as the person's ✓ would, with Undo putting them back.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"
import { CloseAllRule } from "spell/epic/components/epic-section/CloseAllRule"
import { CloseAll } from "spell/epic/tool/CloseAll"
import { InstantUndo } from "spell/epic/tool/InstantUndo"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

let plan: PlanDoc

/** `id`'s colour as the page draws it now. */
const drawn = (id: string) =>
  DrawnState.of(
    { ...DrawnState.fieldsOf(plan.item(id)), state: plan.itemState(plan.item(id)) },
    NO_LIVE_REVIEW,
    plan.now.getTime()
  )

/** The page with J1 decided, J2 open, I1 fixed for review, I2 open, T1 done, T2 done and reviewed. */
function makePlan(): PlanDoc {
  const made = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  made.addItem("judgement", "Decided call", { calm: true })
  made.setItem("j1", "done")
  made.addItem("judgement", "Open call", { calm: true })
  made.addItem("issue", "Fixed issue")
  // he wanted it:  so the fix waits for his look, never self-fixed grey
  made.item("i1").setAttribute("urgent", "")
  made.fixedForReview("i1", "the fix")
  made.addItem("issue", "Open issue")
  made.addItem("todo", "Done todo")
  made.setItem("t1", "done")
  made.addItem("todo", "Seen todo")
  made.setItem("t2", "done")
  made.review("t2")
  return made
}

beforeEach(() => {
  plan = makePlan()
})

describe("CloseAll.candidates()", () => {
  test("each section's finished items, still waiting for a tick", () => {
    expect(CloseAll.candidates(plan, "judgements")).toEqual(["j1"])
    expect(CloseAll.candidates(plan, "issues")).toEqual(["i1"])
    expect(CloseAll.candidates(plan, "todos")).toEqual(["t1"])
  })

  test("never one with his mark on it, Claude at work on it, or a thread not finished with", () => {
    expect(CloseAll.candidates(plan, "judgements", { marked: new Set(["j1"]) })).toEqual([])
    expect(CloseAll.candidates(plan, "issues", { working: new Set(["i1"]) })).toEqual([])
    expect(CloseAll.candidates(plan, "todos", { commented: new Set(["t1"]) })).toEqual([])
  })
})

describe("CloseAllRule", () => {
  test("on a page with badges, only the finished word counts", () => {
    const item = plan.item("j2")
    item.setAttribute("badge", "decided")
    const look = { state: "requested" as const, live: NO_LIVE_REVIEW, commented: false }
    expect(CloseAllRule.closes("judgements", item, look)).toBe(true)
    item.setAttribute("badge", "yourCall")
    expect(CloseAllRule.closes("judgements", item, look)).toBe(false)
    item.setAttribute("badge", "againstYourAsk")
    expect(CloseAllRule.closes("judgements", item, look)).toBe(false)
  })

  test("never a grey one, nor one with a mark of his", () => {
    const item = plan.item("j1")
    expect(CloseAllRule.closes("judgements", item, { state: "old", live: NO_LIVE_REVIEW, commented: false })).toBe(
      false
    )
    const live = { ...NO_LIVE_REVIEW, mark: { action: "revisit" } }
    expect(CloseAllRule.closes("judgements", item, { state: "recent", live, commented: false })).toBe(false)
  })

  test("only the three item sections have one", () => {
    expect(["judgements", "issues", "todos", "questions", "tests"].map(CloseAllRule.kindOf)).toEqual([
      "judgements",
      "issues",
      "todos",
      undefined,
      undefined
    ])
  })
})

describe("CloseAll.apply()", () => {
  test("closes the ids sent as his ✓ would, grey, and says the ones it left", () => {
    expect(drawn("i1")).not.toBe("old")
    const { closed, left } = CloseAll.apply(plan, "issues", ["I1", "i2"])
    expect(closed.map((each) => each.id)).toEqual(["i1"])
    expect(left).toEqual(["i2"])
    expect(drawn("i1")).toBe("old")
    expect(plan.item("i1").getAttribute("review-as")).toBe("approve")
  })

  test("an open call with the DECIDED badge is accepted:  closed", () => {
    plan.item("j2").setAttribute("badge", "decided")
    plan.item("j2").setAttribute("state", "requested")
    CloseAll.apply(plan, "judgements", ["j2"])
    expect(plan.item("j2").getAttribute("status")).toBe("done")
  })
})

describe("CloseAll.run() and its Undo", () => {
  const root = mkdtempSync(join(tmpdir(), "close-all-"))
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("one edit closes them;  Undo puts each back", async () => {
    const folder = join(root, "epics", "demo")
    mkdirSync(folder, { recursive: true })
    const file = join(folder, "demo.plan.html")
    const files = new PlanDocFiles({ root })
    await files.writeDoc(file, plan, true)
    const result = await CloseAll.run(file, root, "todos", ["t1", "t2"])
    expect(result.closed).toEqual(["t1"])
    expect(result.left).toEqual(["t2"])
    expect(result.batch).toMatch(/^close-all:todos:/)
    expect(files.read(file).item("t1").getAttribute("reviewed")).toBeTruthy()

    const undone = await InstantUndo.undoBatch(file, root, result.batch!)
    expect(undone).toEqual({ restored: ["t1"], left: [] })
    expect(files.read(file).item("t1").getAttribute("reviewed")).toBeNull()
    await expect(InstantUndo.undoBatch(file, root, result.batch!)).rejects.toThrow(/nothing to undo/)
  })
})
