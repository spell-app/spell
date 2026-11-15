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

/** A fresh epic page, its person Owen, a phase under way:  todo T1, done. */
function planWithDoneTodo() {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW, { person: "Owen" })
  plan.addPhase("One")
  plan.setPhase(1, "active")
  plan.addItem("todo", "tidy the tags")
  plan.addStatus("t1", "tidying")
  plan.finishStatus("t1", "tidied")
  plan.setItem("t1", "done")
  return plan
}

describe("a finished todo's Saw it (`approve`;  epic `epic-engine` I296)", () => {
  test("reviewed, its UPDATE label off, still done -- never dropped", () => {
    const plan = planWithDoneTodo()
    const todo = plan.document.getElementById("t1")!
    expect(PlanItem.updateLabelOf(todo)).not.toBeNull()
    expect(plan.applyMark({ id: "t1", action: "approve" } as PlanMark)).toMatchObject({ applied: true })
    expect(todo.getAttribute("status")).toBe("done")
    expect(todo.hasAttribute("reviewed")).toBe(true)
    expect(PlanItem.updateLabelOf(todo)).toBeNull()
    expect(Markup.validate(plan.document)).toEqual([])
  })
})
