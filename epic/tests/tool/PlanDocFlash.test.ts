import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"

import type { PlanMark } from "spell/epic/tool/planDoc.types"

import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanItem } from "spell/epic/tool/PlanItem"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** When the tests' edits happen:  local 2026-10-01 09:05. */
const NOW = new Date(2026, 9, 1, 9, 5)

/** A fresh epic page, its person Owen, a phase under way, with open issue I1. */
function planWithOpenIssue() {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW, { person: "Owen" })
  plan.addPhase("One")
  plan.setPhase(1, "active")
  plan.addItem("issue", "a thing that broke")
  return plan
}

describe("Owen's own x on an issue (`drop`;  epic `epic-engine` I308)", () => {
  test("canceled and reviewed, with no CANCELED label:  his own act, nothing new for him to see", () => {
    const plan = planWithOpenIssue()
    const issue = plan.document.getElementById("i1")!
    expect(plan.applyMark({ id: "i1", action: "drop" } as PlanMark)).toMatchObject({ applied: true })
    expect(issue.getAttribute("status")).toBe("canceled")
    expect(issue.hasAttribute("reviewed")).toBe(true)
    expect(PlanItem.updateLabelOf(issue)).toBeNull()
    expect(Markup.validate(plan.document)).toEqual([])
  })

  test("a label Claude's fix left goes too:  his x says he's seen it", () => {
    const plan = planWithOpenIssue()
    const issue = plan.document.getElementById("i1")!
    plan.markUpdate(issue, "fixed")
    expect(PlanItem.updateLabelOf(issue)).not.toBeNull()
    plan.applyMark({ id: "i1", action: "drop" } as PlanMark)
    expect(PlanItem.updateLabelOf(issue)).toBeNull()
  })
})
