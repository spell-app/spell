import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vite-plus/test"

import { DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"
import { Markup } from "spell/epic/markup"

import { NightSummary } from "spell/epic/tool/NightSummary"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanItem } from "spell/epic/tool/PlanItem"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { SelfFix } from "spell/epic/tool/SelfFix"
import type { PlanMark } from "spell/epic/tool/planDoc.types"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** When the tests' edits happen:  local 2026-10-01 09:05. */
const NOW = new Date(2026, 9, 1, 9, 5)

/** A fresh epic page with issue I1, found by Claude unless `requested`;  `inbox`:  what the person left there. */
function planWithIssue({ requested = false, inbox = {} }: { requested?: boolean; inbox?: object } = {}) {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW, { person: "Owen" })
  plan.addItem("issue", "It jumps", { requested, calm: true })
  plan.readActedOn = () => SelfFix.actedOn(new ReviewInbox(inbox as Record<string, unknown>))
  return { plan, issue: plan.item("i1") }
}

/** A comment of Owen's on `anchor`, as the inbox holds one. */
function commentOn(anchor: string) {
  return { anchor, text: "why?", by: "Owen", at: NOW.toISOString(), status: "answered", kind: "item", label: "I1" }
}

describe("an issue fixed before the person got to it (epic `epic-engine` T143)", () => {
  test.each(["fixedForReview", "finishWork"] as const)(
    "%s on one Claude found:  closed, grey, FIXED -, no press needed, its stored title as it was",
    (fix) => {
      const { plan, issue } = planWithIssue()
      plan.addStatus("i1", "Fixing it")
      plan[fix]("i1", "It stays put")
      plan.updateStates()
      expect([issue.getAttribute("status"), issue.getAttribute("state")]).toEqual(["done", "handled"])
      expect([issue.hasAttribute("self-fixed"), issue.hasAttribute("fixed")]).toEqual([true, false])
      expect(PlanItem.titleOf(issue)).toBe("It jumps")
      expect(PlanItem.updateLabelOf(issue)?.getAttribute("became") ?? "fixed").toBe("fixed")
      expect(PlanItem.listedTitle(issue)).toBe("FIXED - It jumps")
      expect(plan.describeItem("i1")!.title).toBe("FIXED - It jumps")
      expect(plan.reviewItem(issue)).toMatchObject({
        title: "FIXED - It jumps",
        docState: "handled",
        state: "reviewed"
      })
      expect(plan.summary("open").open.issue).toEqual([])
      expect(NightSummary.of(plan, new Date(2026, 8, 30)).needs.map((need) => need.id)).not.toContain("i1")
      expect(Markup.validate(plan.document)).toEqual([])
    }
  )

  test("not calm:  grey too", () => {
    const { plan, issue } = planWithIssue()
    issue.removeAttribute("calm")
    plan.fixedForReview("i1")
    expect(plan.itemState(issue)).toBe("handled")
  })

  test("from his words:  light orange, open, his check still accepts the fix", () => {
    const { plan, issue } = planWithIssue({ requested: true })
    plan.fixedForReview("i1", "It stays put")
    expect([issue.getAttribute("status"), plan.itemState(issue)]).toEqual(["open", "requested"])
    expect(issue.hasAttribute("self-fixed")).toBe(false)
    // every fix's line starts with it, his to check too
    expect(PlanItem.listedTitle(issue)).toBe("FIXED - It jumps")
    expect(plan.summary("open").open.issue).toMatchObject([{ id: "i1", title: "FIXED - It jumps" }])
    const accepted = plan.applyMark({ id: "i1", action: "approve" } as PlanMark) as { did: string }
    expect(accepted.did).toBe("approved:  closed (fix accepted)")
  })

  const gotTo: Record<string, (plan: PlanDoc) => void> = {
    "his Do this": (plan) => void plan.applyMark({ id: "i1", action: "todo" } as PlanMark),
    "his Revisit": (plan) => plan.reviewedAs(plan.item("i1"), "revisit"),
    "his note": (plan) => plan.keepNote("i1", { note: "on phones too", action: "revisit" }),
    "his review": (plan) => void plan.review("i1"),
    "made urgent from its chip": (plan) => {
      plan.setCalm("i1", false)
      plan.log("I1 urgent (Owen, from its id chip)")
    }
  }
  test.each(Object.keys(gotTo))("%s before the fix:  orange, for his check", (how) => {
    const { plan, issue } = planWithIssue()
    gotTo[how]!(plan)
    plan.fixedForReview("i1")
    expect([issue.getAttribute("status"), plan.itemState(issue)]).toEqual(["open", "replied"])
  })

  const at = NOW.toISOString()
  test.each([
    ["a mark not taken", { marks: { i1: { action: "revisit", at } } }],
    ["a mark taken", { taken: { i1: { action: "revisit", at } } }],
    ["urgency from its chip", { urgency: { i1: { calm: false, at } } }],
    ["a request for now", { now: [{ id: "i1", action: "details", at }] }],
    ["a comment", { comments: { c1: commentOn("i1#block-2") } }]
  ])("%s in the inbox:  orange, whether fixed or done", (_, inbox) => {
    for (const fix of ["fixedForReview", "finishWork"] as const) {
      const { plan, issue } = planWithIssue({ inbox })
      plan.addStatus("i1", "Fixing it")
      plan[fix]("i1")
      expect([issue.getAttribute("status"), plan.itemState(issue)]).toEqual(["open", "replied"])
    }
  })

  test("he OK'd it and the work started (queued, then off the list):  orange, and fixed again it stays so (I375)", () => {
    const { plan, issue } = planWithIssue()
    plan.queue("i1", "fix it when an agent is free")
    plan.unqueue("i1")
    plan.addStatus("i1", "Fixing it")
    plan.fixedForReview("i1", "It stays put")
    // the fix took `reviewed` off:  nothing on the item says he got to it now
    expect(issue.hasAttribute("reviewed")).toBe(false)
    expect(plan.itemState(issue)).toBe("replied")
    plan.fixedForReview("i1", "And on phones")
    expect([issue.getAttribute("status"), plan.itemState(issue)]).toEqual(["open", "replied"])
  })

  test.each(["reviewed:  talked through", "deferred:  It jumps", "to do:  fix it when an agent is free"])(
    "only the Log says he got to it (%s):  orange",
    (line) => {
      const { plan, issue } = planWithIssue()
      plan.log(`I1 ${line}`)
      plan.fixedForReview("i1")
      expect(plan.itemState(issue)).toBe("replied")
    }
  )

  test("acting on another item is no getting to this one", () => {
    const { plan, issue } = planWithIssue({ inbox: { comments: { c1: commentOn("i12#block-2") } } })
    plan.log("I12 urgent (Owen, from its id chip)")
    plan.log("I1 urgent:  It jumps")
    plan.fixedForReview("i1")
    expect(plan.itemState(issue)).toBe("handled")
  })

  test("a judgement call and a todo are as before", () => {
    const { plan } = planWithIssue()
    plan.addItem("judgement", "A or B")
    plan.addItem("todo", "Build it")
    plan.fixedForReview("j1")
    plan.addStatus("t1", "Building")
    plan.finishWork("t1")
    expect(["j1", "t1"].map((id) => plan.itemState(plan.item(id)))).toEqual(["replied", "recent"])
    expect(["j1", "t1"].some((id) => plan.item(id).hasAttribute("self-fixed"))).toBe(false)
  })
})

describe("a grey fix can still come back (T143)", () => {
  /** I1, fixed and grey. */
  function greyed(inbox: object = {}) {
    const made = planWithIssue({ inbox })
    made.plan.fixedForReview("i1", "It stays put")
    return made
  }

  test("his turn on a comment in it draws orange", () => {
    const { plan, issue } = greyed()
    const fields = { ...DrawnState.fieldsOf(issue), state: plan.itemState(issue) }
    expect(DrawnState.of(fields, NO_LIVE_REVIEW)).toBe("handled")
    expect(DrawnState.of(fields, { ...NO_LIVE_REVIEW, commentsReplied: true })).toBe("replied")
  })

  test("reopened:  wanted, so its next fix waits for his check", () => {
    const { plan, issue } = greyed()
    plan.setItem("i1", "open")
    expect([issue.hasAttribute("self-fixed"), plan.itemState(issue)]).toEqual([false, "handed"])
    plan.fixedForReview("i1")
    expect(plan.itemState(issue)).toBe("replied")
  })

  test("his Revisit, taken up:  REOPENED, blue;  Claude's own card alone leaves it grey", () => {
    const { plan, issue } = greyed()
    plan.noteStatus("i1", "On main")
    expect(plan.itemState(issue)).toBe("handled")
    plan.reviewedAs(issue, "revisit")
    plan.noteStatus("i1", "Queued again")
    expect([issue.getAttribute("status"), plan.itemState(issue)]).toEqual(["open", "handed"])
    expect(PlanItem.updateLabelOf(issue)!.getAttribute("became")).toBe("reopened")
    expect(Markup.validate(plan.document)).toEqual([])
  })

  test("his check, then Claude's card:  stays closed", () => {
    const { plan, issue } = greyed()
    plan.applyMark({ id: "i1", action: "approve" } as PlanMark)
    plan.noteStatus("i1", "Noted")
    expect(issue.getAttribute("status")).toBe("done")
  })

  test("a Do this from before the fix:  back for his check;  one from after:  sent back", () => {
    const before = new Date(NOW.getTime() - 60_000).toISOString()
    const after = new Date(NOW.getTime() + 60_000).toISOString()
    const early = greyed()
    early.plan.applyMark({ id: "i1", action: "todo", at: before } as PlanMark)
    expect([early.issue.getAttribute("status"), early.plan.itemState(early.issue)]).toEqual(["open", "replied"])
    const late = greyed()
    late.plan.applyMark({ id: "i1", action: "todo", at: after } as PlanMark)
    expect(late.plan.itemState(late.issue)).toBe("handed")
  })

  test("fixed again:  only the card;  marked his words:  light orange, no FIXED lead", () => {
    const { plan, issue } = greyed()
    plan.fixedForReview("i1", "And on phones")
    expect([plan.itemState(issue), issue.getAttribute("status")]).toEqual(["handled", "done"])
    plan.setRequested("i1")
    expect([plan.itemState(issue), issue.hasAttribute("self-fixed")]).toEqual(["requested", false])
  })
})
