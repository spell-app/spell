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

/** A fresh epic page, its person Owen:  issue I1, fixed for his review. */
function planWithFix() {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW, { person: "Owen" })
  plan.addItem("issue", "Restore does nothing")
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
