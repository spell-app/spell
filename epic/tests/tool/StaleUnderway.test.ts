/**
 * Tests of `StaleUnderway` (`epic stale <epic> --underway`, the end-of-turn tidy, epic `epic-engine` T78) on a sample
 * page against a scratch git repo:  which Underway items are stale, what's found on main, and what `apply()` does.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { StaleUnderway } from "spell/epic/tool/StaleUnderway"

const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "stale-underway-"))
const HOUR = 3_600_000

const git = (...args: string[]) =>
  execFileSync("git", ["-c", "user.name=T", "-c", "user.email=t@t", ...args], { cwd: root, encoding: "utf8" })

let landed = ""

/** A page with five issues:  each its Underway card written `hoursAgo`, by `plan.now`. */
function samplePlan(): PlanDoc {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  const underway = (title: string, hoursAgo: number) => {
    plan.now = new Date(Date.now() - hoursAgo * HOUR)
    const id = plan.addItem("issue", title)
    plan.addStatus(id, "Reading it")
    return id
  }
  underway("Landed by name", 48) // i1:  a commit names it
  const listed = underway("Landed by its card", 48) // i2:  its own <epic-commit> card's sha
  underway("Never landed", 48) // i3
  underway("Fresh", 1) // i4:  too new
  underway("Worked on", 48) // i5:  a live working flag
  plan.now = new Date()
  plan.item(listed).insertAdjacentHTML("beforeend", `<epic-commit sha="${landed.slice(0, 9)}">the fix</epic-commit>`)
  return plan
}

beforeAll(() => {
  writeFileSync(join(root, "a.txt"), "a\n")
  git("init", "-q", "-b", "main")
  git("add", ".")
  git("commit", "-qm", "x I1:  the fix for I1")
  writeFileSync(join(root, "a.txt"), "b\n")
  git("commit", "-qam", "unrelated:  names no item")
  landed = git("rev-parse", "HEAD").trim()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("StaleUnderway", () => {
  const working = { i5: { since: new Date().toISOString() } }

  test("stale:  open, its last card Underway, older than the hours, nobody working on it", () => {
    const items = new StaleUnderway({ plan: samplePlan(), epic: "x", main: root, working }).report()
    expect(items.map((each) => each.id)).toEqual(["i1", "i2", "i3"])
  })

  test("a Do this's Go ahead card, nobody on it for 30 minutes, counts too;  a newer one doesn't (I292)", () => {
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
    plan.now = new Date(Date.now() - 2 * HOUR)
    const old = plan.addItem("issue", "Wanted long ago")
    plan.applyMark({ id: old, action: "todo" })
    plan.now = new Date(Date.now() - 5 * 60_000)
    const fresh = plan.addItem("issue", "Wanted just now")
    plan.applyMark({ id: fresh, action: "todo" })
    plan.now = new Date()
    const items = new StaleUnderway({ plan, epic: "x", main: root }).report()
    expect(items.map((each) => each.id)).toEqual([old])
  })

  test("on main:  a commit naming it, this epic's only, or a sha its cards list", () => {
    const items = new StaleUnderway({ plan: samplePlan(), epic: "x", main: root, working }).report()
    const onMain = Object.fromEntries(items.map((each) => [each.id, each.onMain.map((commit) => commit.subject)]))
    expect(onMain).toEqual({
      i1: ["x I1:  the fix for I1"],
      i2: ["unrelated:  names no item"],
      i3: []
    })
    // another epic's I1 is not this one's
    const other = new StaleUnderway({ plan: samplePlan(), epic: "y", main: root, working }).report()
    expect(other.find((each) => each.id === "i1")!.onMain).toEqual([])
  })

  test("apply:  on main => fixed for review;  not => a Stale card, once;  nothing closed", () => {
    const plan = samplePlan()
    const tidy = () => new StaleUnderway({ plan, epic: "x", main: root, working }).apply()
    const lines = tidy()
    expect(lines).toEqual([
      expect.stringMatching(/^I1 fixed, for review:  on main as /),
      expect.stringMatching(/^I2 fixed, for review:  on main as /),
      "I3 stale:  underway 2d, nothing on main"
    ])
    expect(plan.item("i1").hasAttribute("fixed")).toBe(true)
    expect(plan.item("i1").textContent).toContain("Found on main by the end-of-turn tidy")
    expect(["i1", "i2", "i3"].map((id) => plan.item(id).getAttribute("status") ?? "open")).toEqual([
      "open",
      "open",
      "open"
    ])
    expect(plan.item("i3").textContent).toContain("Stale:  Underway since")
    // the next tidy finds nothing new to do:  the fixed ones are no longer Underway, the stale one has its card
    expect(tidy()).toEqual([])
  })

  test("found on main:  `UPDATE : FIXED` with no phase active, a short card, the commit under Commits (I290)", () => {
    const plan = samplePlan()
    new StaleUnderway({ plan, epic: "x", main: root, working }).apply()
    const item = plan.item("i1")
    // the sample page has no phase under way:  the label still comes, with no phase on it
    const label = item.querySelector(':scope > [slot="title"] > epic-update')!
    expect(label.getAttribute("became")).toBe("fixed")
    expect(label.hasAttribute("phase")).toBe(false)
    // the card (its Underway reading, then the tidy's word) says where it is in short paragraphs, never the subject
    const card = Array.from(item.querySelectorAll(":scope > epic-status")).at(-1)!
    const paragraphs = Array.from(card.querySelectorAll("p")).map((p) => p.textContent ?? "")
    expect(paragraphs.slice(-2)).toEqual([
      expect.stringMatching(/^Found on main by the end-of-turn tidy, in commit \w{9}\.$/),
      "The commit is under this item's Commits (its git icon)."
    ])
    expect(card.textContent).not.toContain("the fix for I1")
    // the commit itself under its Commits, its subject without the `x I1:  ` head
    expect(item.querySelector(":scope > epic-commit")?.textContent?.trim()).toBe("the fix for I1")
  })
})
