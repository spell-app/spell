import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"

import type { PlanMark } from "spell/epic/tool/planDoc.types"

import { PlanDoc } from "spell/epic/tool/PlanDoc"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** When the tests' edits happen:  local 2026-10-01 09:05. */
const NOW = new Date(2026, 9, 1, 9, 5)

/** A fresh epic page, its person Owen:  issue I1, open. */
function planWithIssue() {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW, { person: "Owen" })
  plan.addItem("issue", "It flickers")
  return plan
}

describe("an issue's review buttons, one icon per meaning (epic `epic-engine` I299)", () => {
  test("an open issue's x (`drop`):  closed as not needed, canceled and reviewed", () => {
    const plan = planWithIssue()
    const issue = plan.document.getElementById("i1")!
    expect(plan.applyMark({ id: "i1", action: "drop" } as PlanMark)).toMatchObject({ applied: true })
    expect(issue.getAttribute("status")).toBe("canceled")
    expect(issue.hasAttribute("reviewed")).toBe(true)
    expect(Markup.validate(plan.document)).toEqual([])
  })

  test("a fixed issue's check (`approve`):  the fix accepted, closed", () => {
    const plan = planWithIssue()
    const issue = plan.document.getElementById("i1")!
    Markup.set<"epic-item">(issue, { fixed: true })
    expect(plan.applyMark({ id: "i1", action: "approve" } as PlanMark)).toMatchObject({
      applied: true,
      did: "approved:  closed (fix accepted)"
    })
    expect(issue.getAttribute("status")).toBe("done")
  })
})
