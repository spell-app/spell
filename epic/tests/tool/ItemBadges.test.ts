/**
 * Tests of a page's item badges in the tool (epic `epic-engine` P81):  `ItemBadges`, `ItemJudge`, `epic badges`,
 * with a fake judge:  never `claude -p`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"
import { planDocArgs } from "spell/epic/command/epicArgs"
import { Hush } from "spell/epic/tool/Hush"
import { ItemJudge, type JudgeRequest, type Judgement } from "spell/epic/tool/ItemJudge"
import { NightSummary } from "spell/epic/tool/NightSummary"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { PlanItem } from "spell/epic/tool/PlanItem"

const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))
const FIXTURE = readFileSync(join(FIXTURES, "epic-plan.html"), "utf8")
const NOW = new Date(2026, 9, 1, 9, 5)

/** A fresh page, its badges `mode`. */
function planWith(mode?: "trial" | "on") {
  const plan = PlanDoc.parse(FIXTURE, NOW, { person: "Owen" })
  if (mode) plan.page.setAttribute("badges", mode)
  return plan
}

/** Score `id`. */
function score(plan: PlanDoc, id: string, care: number, doubt = 5, more: Partial<Judgement> = {}) {
  ItemJudge.store(plan, [{ id, care, doubt, severe: false, needsYou: false, why: "why", ...more }])
}

/** `id`'s state and badge, as every edit writes them. */
function drawn(plan: PlanDoc, id: string) {
  plan.updateStates()
  const item = plan.item(id)
  return [item.getAttribute("state"), item.getAttribute("badge")]
}

describe("a page's badges", () => {
  test("none on the page:  scores change nothing, so every other page draws as it did", () => {
    const plan = planWith()
    plan.addItem("issue", "It jumps", { calm: true })
    score(plan, "i1", 90, 90)
    expect(drawn(plan, "i1")).toEqual(["open", null])
    expect(PlanItem.listedTitle(plan.item("i1"))).toBe("It jumps")
    expect(plan.phaseElements.some((phase) => phase.hasAttribute("badged"))).toBe(false)
  })

  test("the badge and its colour are written, said first in a listing;  care 0 is a score", () => {
    const plan = planWith("trial")
    plan.addItem("issue", "It jumps", { calm: true })
    plan.addItem("todo", "Nice to have")
    plan.addItem("issue", "A flake", { calm: true })
    score(plan, "i1", 90)
    score(plan, "t1", 40)
    score(plan, "i2", 0)
    expect(drawn(plan, "i1")).toEqual(["open", "willFix"])
    expect(drawn(plan, "t1")).toEqual(["someday", "someday"])
    expect(drawn(plan, "i2")).toEqual(["recheck", "willClose"])
    expect(PlanItem.listedTitle(plan.item("i1"))).toBe("WILL FIX - It jumps")
    expect(plan.phaseElements.every((phase) => phase.hasAttribute("badged"))).toBe(true)
    expect(Markup.validate(plan.document)).toEqual([])
  })

  test("WILL RECHECK waits on Claude:  not in what needs the person (Q82);  YOUR CALL is", () => {
    const plan = planWith("trial")
    plan.addItem("issue", "A flake")
    plan.addItem("issue", "A choice")
    score(plan, "i1", 90, 80)
    score(plan, "i2", 90, 5, { needsYou: true })
    plan.updateStates()
    const needs = NightSummary.of(plan, new Date(2026, 8, 30)).needs.map(({ id, part }) => [id, part])
    expect(needs).toEqual([["i2", "asks"]])
  })

  test("turned into a todo:  SEE T1 till it's done, then a question ANSWERED", () => {
    const plan = planWith("trial")
    plan.addItem("question", "Which?")
    plan.applyMark({ id: "q1", action: "todo" })
    expect(drawn(plan, "q1")).toEqual(["handed", "see"])
    expect(PlanItem.listedTitle(plan.item("q1"))).toMatch(/^SEE T1 - /)
    expect(drawn(plan, "t1")).toEqual(["open", "willDo"])
    plan.setItem("t1", "done")
    expect(drawn(plan, "q1")).toEqual(["recent", "answered"])
  })

  test("hush never greys a YOUR CALL for him", () => {
    const plan = planWith("trial")
    plan.now = new Date(NOW.getTime() - 5 * 86_400_000)
    plan.addItem("judgement", "A call he'd make differently", { calm: true })
    plan.addItem("judgement", "Another", { calm: true })
    plan.now = NOW
    score(plan, "j1", 90)
    expect(Hush.candidates(plan).map(({ id }) => id)).toEqual(["j2"])
  })

  test("what would close stays as it is, no badge", () => {
    const plan = planWith("trial")
    plan.addItem("judgement", "A routine call", { calm: true })
    score(plan, "j1", 10)
    expect(drawn(plan, "j1")).toEqual(["open", null])
    expect(plan.badges.badgeOf(plan.item("j1")).closes?.status).toBe("done")
  })

  test.each([
    "J1 approved:  reviewed",
    "J1 do this, in J1 itself (no todo):  build it",
    "J1 to todo T4",
    "J1 owenoak picked A:  Both",
    "J1 not urgent (Owen, from its id chip)"
  ])("got to, by the Log alone (%s):  never closed unseen, as a fix takes `reviewed` off", (line) => {
    const plan = planWith("on")
    plan.addItem("judgement", "A routine call", { calm: true })
    score(plan, "j1", 10)
    plan.log(line)
    plan.badges.refresh()
    expect(plan.badges.badgeOf(plan.item("j1")).closes).toBeUndefined()
    expect(plan.badges.closeRefusal(plan.item("j1"))).toMatch(/got to it/)
  })

  test("got to, by the inbox:  a mark or comment waiting", () => {
    const plan = planWith("on")
    plan.addItem("judgement", "A routine call", { calm: true })
    plan.readActedOn = () => new Set(["j1"])
    score(plan, "j1", 10)
    expect(plan.badges.badgeOf(plan.item("j1")).closes).toBeUndefined()
  })

  test("his urgency from the id chip beats the score;  not urgent takes the judge's red off", () => {
    const plan = planWith("trial")
    plan.addItem("issue", "It jumps", { calm: true })
    score(plan, "i1", 5, 90)
    expect(plan.setCalm("i1", false)).toBe("urgent")
    expect(drawn(plan, "i1")).toEqual(["attention", "urgent"])
    expect(plan.setCalm("i1", true)).toBe("not urgent")
    expect(drawn(plan, "i1")).toEqual(["recheck", "willRecheck"])
  })
})

describe("epic badges", () => {
  let root: string
  let file: string
  let said: string[]
  let asked: JudgeRequest[]

  /** The commands on the scratch page, every item judged care 10, doubt 5. */
  function commands() {
    const itemJudge = new ItemJudge({
      ask: (request) => {
        asked.push(request)
        return [...request.text.matchAll(/^## (\w+)/gm)].map(([, id]) => ({ id, care: 10, doubt: 5, why: "routine" }))
      }
    })
    const made = new PlanDocCommands({ files: new PlanDocFiles({ root, content: root }), itemJudge })
    made.print = (text) => void said.push(text)
    made.warn = (text) => void said.push(text)
    return made
  }

  /** The page as it is on disk. */
  const page = () => new PlanDocFiles({ root, content: root }).read(file)

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "badges-"))
    mkdirSync(join(root, "epics", "demo"), { recursive: true })
    file = join(root, "epics", "demo", "demo.plan.html")
    const plan = planWith()
    plan.page.setAttribute("epic", "demo")
    writeFileSync(file, plan.toString())
    said = []
    asked = []
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  test("a page without badges is never scored:  not as an item's made, not by `score`", async () => {
    const epic = commands()
    expect(await epic.run(["add", "demo", "judgement", "Kept it simple", "--title-ok"])).toBe(0)
    expect(await epic.run(["badges", "demo", "score"])).toBe(1)
    expect(asked).toEqual([])
    expect(page().item("j1").hasAttribute("care")).toBe(false)
  })

  test("with badges, an item is scored as it's made;  a trial closes nothing, and refuses to", async () => {
    const epic = commands()
    await epic.run(["badges", "demo", "trial"])
    await epic.run(["add", "demo", "judgement", "Kept it simple", "--title-ok"])
    expect(asked).toHaveLength(1)
    expect([page().item("j1").getAttribute("care"), page().item("j1").getAttribute("status")]).toEqual(["10", "open"])
    expect(await epic.run(["badges", "demo", "close", "J1"])).toBe(1)
    expect(page().item("j1").getAttribute("status")).toBe("open")
  })

  test("a judge that fails leaves the item as it's drawn today", async () => {
    const itemJudge = new ItemJudge({
      ask: () => {
        throw new Error("offline")
      }
    })
    const epic = commands()
    await epic.run(["badges", "demo", "trial"])
    const failing = new PlanDocCommands({ files: epic.files, itemJudge })
    failing.print = failing.warn = (text) => void said.push(text)
    expect(await failing.run(["add", "demo", "issue", "It jumps", "--calm", "--title-ok"])).toBe(0)
    const item = page().item("i1")
    expect([item.getAttribute("state"), item.hasAttribute("badge"), item.hasAttribute("care")]).toEqual([
      "open",
      false,
      false
    ])
    expect(said.join("\n")).toMatch(/not scored for a badge:\s+offline/)
  })

  test("on:  one its badge would grey closes as it's made;  off:  one command puts it all back", async () => {
    const epic = commands()
    await epic.run(["add", "demo", "judgement", "An old call", "--calm", "--title-ok"])
    await epic.run(["badges", "demo", "on"])
    await epic.run(["badges", "demo", "score"])
    expect(page().item("j1").getAttribute("status")).toBe("open")
    expect(await epic.run(["badges", "demo", "close", "J1"])).toBe(0)
    await epic.run(["add", "demo", "judgement", "A new call", "--title-ok"])
    expect(["j1", "j2"].map((id) => page().item(id).getAttribute("status"))).toEqual(["done", "done"])
    expect(await epic.run(["badges", "demo", "off"])).toBe(0)
    for (const id of ["j1", "j2"]) {
      const item = page().item(id)
      expect(item.getAttribute("status")).toBe("open")
      for (const name of ["care", "doubt", "badge", "badge-closed", "closed-as", "judged"])
        expect(item.hasAttribute(name)).toBe(false)
    }
    expect(page().page.hasAttribute("badges")).toBe(false)
  })

  test("close --as:  what a recheck found;  never their words", async () => {
    const epic = commands()
    await epic.run(["badges", "demo", "on"])
    await epic.run(["add", "demo", "issue", "A flake", "--title-ok"])
    await epic.run(["add", "demo", "issue", "Their report", "--requested", "--title-ok"])
    expect(await epic.run(["badges", "demo", "close", "I2", "--as", "vanished"])).toBe(1)
    expect(await epic.run(["badges", "demo", "close", "I1", "--as", "vanished"])).toBe(0)
    expect([page().item("i1").getAttribute("badge"), page().item("i1").getAttribute("state")]).toEqual([
      "cantReproduce",
      "old"
    ])
  })

  test("the item goes after the #", () => {
    expect(planDocArgs("badges", ["demo#J3", "set", "--care", "80"])).toEqual([
      ["badges", "demo", "set", "J3", "--care", "80"]
    ])
  })
})
