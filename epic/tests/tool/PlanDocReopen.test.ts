import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"

import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanItem } from "spell/epic/tool/PlanItem"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** When the tests' edits happen:  local 2026-10-01 09:05. */
const NOW = new Date(2026, 9, 1, 9, 5)

/** A fresh epic page, its person Owen:  issue I1, which he got to (his Revisit, T143), fixed for his review. */
function planWithFix() {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW, { person: "Owen" })
  plan.addItem("issue", "Restore does nothing")
  plan.reviewedAs(plan.item("i1"), "revisit")
  plan.addStatus("i1", "fixing it")
  plan.fixedForReview("i1", "fixed")
  return plan
}

/** Item `id`'s label word in `plan`:  its `became`, `"plain"` for none, `"gone"`. */
function labelOf(plan: PlanDoc, id: string): string {
  const label = PlanItem.updateLabelOf(plan.document.getElementById(id)!)
  return label ? (label.getAttribute("became") ?? "plain") : "gone"
}

describe("a fix sent back and taken up again is REOPENED (epic `epic-engine` I303)", () => {
  test("a Noted card on a fixed issue (editor's I139):  not fixed, wanted, REOPENED, blue;  logged", () => {
    const plan = planWithFix()
    const issue = plan.document.getElementById("i1")!
    expect(plan.itemState(issue)).toBe("replied")
    expect(labelOf(plan, "i1")).toBe("fixed")
    plan.noteStatus("i1", "Queued:  agent editor-restore is finding why Restore does nothing")
    expect(issue.hasAttribute("fixed")).toBe(false)
    expect(issue.hasAttribute("urgent")).toBe(true)
    expect(labelOf(plan, "i1")).toBe("reopened")
    expect(plan.itemState(issue)).toBe("handed")
    expect(plan.document.querySelector('epic-section[kind="log"]')!.textContent).toContain("I1 reopened")
    expect(Markup.validate(plan.document)).toEqual([])
  })

  test("an Underway card on it:  blue, and the label stays REOPENED;  fixed again, orange and FIXED", () => {
    const plan = planWithFix()
    const issue = plan.document.getElementById("i1")!
    plan.addStatus("i1", "finding why Restore does nothing")
    expect(labelOf(plan, "i1")).toBe("reopened")
    expect(plan.itemState(issue)).toBe("progress")
    plan.finishWork("i1", "Restore puts the name back")
    expect(issue.hasAttribute("fixed")).toBe(true)
    expect(labelOf(plan, "i1")).toBe("fixed")
    expect(plan.itemState(issue)).toBe("replied")
  })

  test("a Done card leaves a fix alone;  a closed item keeps its status under a new card (I148)", () => {
    const plan = planWithFix()
    plan.addStatus("i1", "one more line", { state: "done" })
    expect(plan.document.getElementById("i1")!.hasAttribute("fixed")).toBe(true)
    expect(labelOf(plan, "i1")).toBe("fixed")
    plan.addItem("todo", "tidy the tags")
    plan.setItem("t1", "done")
    plan.addStatus("t1", "tidying again")
    expect(plan.document.getElementById("t1")!.getAttribute("status")).toBe("done")
  })
})

describe("a fix sent back, its note handed on to another item, is fixed again once that one is (epic `epic-engine` I317)", () => {
  /** `planWithFix()`'s I1 sent back, its note handed on to item `to` (`I2`), which Claude is on. */
  function handedOn(kind: "issue" | "todo") {
    const plan = planWithFix()
    plan.noteStatus("i1", "Sent back")
    plan.addItem(kind, "Feet drawn the old way for a second")
    const to = kind === "issue" ? "i2" : "t1"
    plan.noteStatus("i1", `Your C2 (feet drawn the old way) is being fixed as ${to.toUpperCase()}`)
    plan.addStatus(to, "finding why")
    return { plan, issue: plan.document.getElementById("i1")!, to }
  }

  test("language's I147:  I2 fixed, I1 is orange and FIXED again, a Done card naming I2;  logged", () => {
    const { plan, issue } = handedOn("issue")
    expect(labelOf(plan, "i1")).toBe("reopened")
    plan.fixedForReview("i2", "drawn once")
    expect(issue.hasAttribute("fixed")).toBe(true)
    expect(labelOf(plan, "i1")).toBe("fixed")
    expect(plan.itemState(issue)).toBe("replied")
    const card = Array.from(issue.querySelectorAll(":scope > epic-status")).at(-1)!
    expect(card.getAttribute("state")).toBe("done")
    expect(card.querySelector('a[href="#i2"]')!.textContent).toBe("I2")
    expect(card.textContent).toContain("Feet drawn the old way for a second")
    expect(plan.document.querySelector('epic-section[kind="log"]')!.textContent).toContain(
      "I1 fixed, for review:  what was sent back was fixed as I2"
    )
    expect(Markup.validate(plan.document)).toEqual([])
    // a second write changes nothing:  it's fixed
    expect(plan.migrate()).toEqual([])
  })

  test("a todo it was handed on to, closed by `update ... done`, fixes it too", () => {
    const { plan, issue, to } = handedOn("todo")
    plan.finishWork(to, "drawn once")
    expect(issue.hasAttribute("fixed")).toBe(true)
    expect(labelOf(plan, "i1")).toBe("fixed")
  })

  test("still reopened while the item it was handed on to is open", () => {
    const { plan, issue } = handedOn("issue")
    expect(plan.migrate()).toEqual([])
    expect(issue.hasAttribute("fixed")).toBe(false)
    expect(labelOf(plan, "i1")).toBe("reopened")
  })
})
