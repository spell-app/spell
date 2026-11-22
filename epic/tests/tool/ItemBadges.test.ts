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
import type { ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { SelfFix } from "spell/epic/tool/SelfFix"

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

/** A judgement call made 5 days before `NOW`, so its work can be on main;  scored `care`.  Its id. */
function oldCall(plan: PlanDoc, details?: string, care = 10, more: Partial<Judgement> = {}) {
  plan.now = new Date(NOW.getTime() - 5 * 86_400_000)
  const id = plan.addItem("judgement", "A routine call", { calm: true, details })
  plan.now = NOW
  score(plan, id, care, 5, more)
  plan.badges.refresh()
  return id
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
    expect(plan.closeRefusal("j1")).toMatch(/got to it/)
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

describe("one rule for closing (I435):  tidy and badges the same", () => {
  test("a routine old call may close, by either", () => {
    const plan = planWith("on")
    const id = oldCall(plan)
    expect(plan.closeRefusal(id)).toBeUndefined()
    plan.closeByBadge(id)
    expect(drawn(plan, id)[1]).toBe("decided")
  })

  test.each<[string, (plan: PlanDoc) => string, RegExp]>([
    [
      "promised, not delivered",
      (plan) => {
        const id = oldCall(plan)
        plan.promiseUnkept(id, "the second half")
        return id
      },
      /promised, not delivered/
    ],
    [
      "being worked on",
      (plan) => {
        const id = oldCall(plan)
        plan.readHeld = () => new Map([[id, "being worked on"]])
        return id
      },
      /being worked on/
    ],
    [
      "a note not sent",
      (plan) => {
        const id = oldCall(plan)
        plan.readHeld = () => new Map([[id, "their note on it isn't sent yet"]])
        return id
      },
      /isn't sent/
    ],
    ["YOUR CALL", (plan) => oldCall(plan, undefined, 90), /YOUR CALL/],
    ["AGAINST YOUR ASK", (plan) => oldCall(plan, undefined, 10, { severe: true }), /AGAINST YOUR ASK/],
    [
      "an issue only they can decide",
      (plan) => {
        const id = plan.addItem("issue", "A choice", { calm: true })
        score(plan, id, 90, 80, { needsYou: true })
        return id
      },
      /YOUR CALL/
    ],
    [
      "YOU TEST",
      (plan) => {
        const id = plan.addItem("test", "Press it")
        score(plan, id, 90, 5, { needsYou: true })
        return id
      },
      /YOU TEST/
    ],
    [
      "an answered Revisit",
      (plan) => {
        const id = oldCall(plan)
        plan.item(id).setAttribute("review-as", "revisit")
        return id
      },
      /Revisit answered/
    ],
    [
      "its words rewritten for a Revisit (J28, J192)",
      (plan) => {
        const id = oldCall(plan, "<p>As first written</p>")
        plan.keepOriginal(plan.item(id), [plan.document.createTextNode("Before the Revisit")])
        return id
      },
      /Revisit answered/
    ],
    [
      "an open question asks about it (Q80)",
      (plan) => {
        const id = oldCall(plan)
        plan.addItem("question", "Grey the old calls?", { details: `<p>It asks about <a href="#${id}">it</a>.</p>` })
        plan.badges.refresh()
        return id
      },
      /Q\d+ is open/
    ],
    [
      "an open question lists it among many, in a More Details card (Q80's 70)",
      (plan) => {
        const id = oldCall(plan)
        const question = plan.addItem("question", "Grey the old calls?", { details: "<p>Grey all but J66?</p>" })
        plan
          .item(question)
          .insertAdjacentHTML("beforeend", `<epic-more><p>The calls:  J1, ${id.toUpperCase()}, J99.</p></epic-more>`)
        plan.badges.refresh()
        return id
      },
      /Q\d+ is open/
    ],
    [
      "a new call, its work maybe not on main",
      (plan) => {
        const id = plan.addItem("judgement", "Just made", { calm: true })
        score(plan, id, 10)
        return id
      },
      /may not be on main/
    ],
    [
      "work not on main",
      (plan) => {
        const id = oldCall(plan)
        plan.item(id).setAttribute("unmerged", "epic-engine")
        return id
      },
      /isn't on main/
    ]
  ])("never:  %s", (_, make, reason) => {
    const plan = planWith("on")
    const id = make(plan)
    expect(plan.closeRefusal(id, { tests: true })).toMatch(reason)
    expect(() => plan.closeByBadge(id, { as: "declined" })).toThrow(reason)
    expect(() => plan.closeObsolete(id, "overtaken")).toThrow()
    expect(plan.item(id).getAttribute("status")).toBe("open")
  })

  test("a call is new from when it was made, not from a retitle today (I439's rule)", () => {
    const plan = planWith("on")
    // made 5 days ago, a card then;  retitled now, which stamps it
    plan.now = new Date(NOW.getTime() - 5 * 86_400_000)
    const id = plan.addItem("judgement", "A routine call", { calm: true })
    plan.addStatus(id, "Looked again", { state: "noted", quiet: true })
    plan.now = NOW
    score(plan, id, 10)
    plan.renameEntry(id, "A routine call, read cold")
    expect(Date.parse(plan.item(id).getAttribute("changed")!)).toBe(NOW.getTime())
    plan.badges.refresh()
    expect(plan.closeRefusal(id)).toBeUndefined()
    // one with no card of its own:  as old as a later call's card says
    const bare = oldCall(plan)
    plan.renameEntry(bare, "Another call, read cold")
    const later = oldCall(plan)
    plan.now = new Date(NOW.getTime() - 4 * 86_400_000)
    plan.addStatus(later, "Looked again", { state: "noted", quiet: true })
    plan.now = NOW
    plan.badges.refresh()
    expect(plan.closeRefusal(bare)).toBeUndefined()
  })

  test("a note not sent is something they did", () => {
    const plan = planWith("on")
    const id = oldCall(plan)
    const inbox = { marks: {}, taken: {}, urgency: {}, now: [], comments: {}, drafts: { [id]: { note: "no!" } } }
    plan.readActedOn = () => SelfFix.actedOn(inbox as unknown as ReviewInbox)
    plan.badges.refresh()
    expect(plan.closeRefusal(id)).toMatch(/got to it/)
  })

  test("closed through setItem():  an underway card never stays blue", () => {
    const plan = planWith("on")
    const id = oldCall(plan)
    plan.addStatus(id, "Looked again", { state: "noted", quiet: true })
    plan.closeByBadge(id, { as: "moot" })
    expect(plan.item(id).getAttribute("status")).toBe("canceled")
    expect(plan.item(id).hasAttribute("taken-in")).toBe(false)
  })
})

describe("their words (I435)", () => {
  test.each([
    ["a <q>", "<p>Owen's comment C7: <q>Center this button</q></p>"],
    ["after Was titled:", '<p class="spell-meta">Was titled: An old title</p><p>Owen: "Center this"</p>'],
    ["after a first line", "<p>Picked one box.</p><p>Owen, 2026-11-14: “Change this to a single textarea”</p>"],
    ["asked for", '<p>Owen asked for "updated" to mean a phase with news for him.</p>'],
    ["named, not quoted", "<p>Owen's comments C6 and C9 take the git button away.</p>"],
    ["picked", '<p>Owen picked "Fade them" for a heading.</p>'],
    ["in brackets", '<ul><li>No pencil (Owen, 2026-10-08: "they did nothing there").</li></ul>'],
    ["said to them", "<ul><li>You said <q>Start I66 in the background</q>.</li></ul>"],
    ["quoted, then named", '<p>Kept "stay in place" (Owen, 2026-10-10) on guides.</p>']
  ])("%s:  theirs, so never closed", (_, details) => {
    const plan = planWith("on")
    const id = oldCall(plan, details)
    expect(plan.closeRefusal(id)).toMatch(/their words/)
    expect(drawn(plan, id)).toEqual(["requested", "decided"])
  })

  test("the rest isn't:  a UI word in <q>, the person named in passing, a commit's quote", () => {
    for (const details of [
      "<p>The row reads <q>Theme · Paper</q>.</p>",
      "<p>The list keeps the order Owen gave the sagas.</p>",
      '<p>One box.</p><epic-commit sha="abc1234">Owen: "Change this"</epic-commit>'
    ]) {
      const plan = planWith("on")
      const id = oldCall(plan, details)
      expect(plan.closeRefusal(id), details).toBeUndefined()
    }
  })

  test("one they add on the page:  their words, its finish light orange", () => {
    const plan = planWith("on")
    plan.applyMark({ id: "new1", action: "new", kind: "todo", title: "Their todo" })
    score(plan, "t1", 10)
    expect(drawn(plan, "t1")).toEqual(["open", "willDo"])
    plan.setItem("t1", "done")
    expect(drawn(plan, "t1")).toEqual(["requested", "done"])
  })
})

describe("finished, never grey unseen (I435, T144's footnote)", () => {
  test("queued by them, then done:  orange, as they got to it", () => {
    const plan = planWith("on")
    plan.addItem("todo", "Theirs", { requested: true })
    score(plan, "t1", 90)
    plan.queue("t1", "now")
    plan.setItem("t1", "done")
    expect(drawn(plan, "t1")).toEqual(["replied", "done"])
  })

  test("their words, canceled by Claude:  light orange", () => {
    const plan = planWith("on")
    plan.addItem("issue", "Their report", { requested: true })
    plan.setItem("i1", "canceled")
    expect(drawn(plan, "i1")).toEqual(["requested", "moot"])
  })

  test("their Do this, done:  orange;  their check on the result:  grey", () => {
    const plan = planWith("on")
    plan.addItem("issue", "It jumps")
    plan.applyMark({ id: "i1", action: "todo" })
    plan.setItem("i1", "done")
    expect(drawn(plan, "i1")).toEqual(["replied", "fixed"])
    plan.now = new Date(NOW.getTime() + 600_000)
    plan.applyMark({ id: "i1", action: "approve" })
    expect(drawn(plan, "i1")).toEqual(["handled", "fixed"])
  })

  test("approved before it was built is no look at the result", () => {
    const plan = planWith("on")
    plan.addItem("todo", "Build it")
    plan.applyMark({ id: "t1", action: "approve" })
    plan.now = new Date(NOW.getTime() + 600_000)
    plan.setItem("t1", "done")
    expect(drawn(plan, "t1")).toEqual(["replied", "done"])
  })

  test("open, though a phase handled it:  never grey", () => {
    const plan = planWith("on")
    const theirs = oldCall(plan, '<p>Owen: "Add choice by default"</p>')
    const routine = oldCall(plan)
    const question = plan.addItem("question", "Which?")
    if (!plan.phaseElements.length) plan.addPhase("The phase that took them")
    for (const id of [theirs, routine, question]) plan.item(id).setAttribute("handled", plan.phaseElements[0]!.id)
    plan.phaseElements[0]!.setAttribute("status", "done")
    expect(drawn(plan, theirs)).toEqual(["requested", "decided"])
    expect(drawn(plan, routine)[0]).toBe("open")
    expect(drawn(plan, question)[0]).toBe("attention")
  })

  test("canceled with a card left underway:  struck, not UNDERWAY (I312)", () => {
    const plan = planWith("on")
    plan.addItem("issue", "Old")
    plan.addStatus("i1", "On it")
    plan.now = new Date(NOW.getTime() + 3_600_000)
    plan.item("i1").setAttribute("status", "canceled")
    plan.stamp(plan.item("i1"))
    expect(drawn(plan, "i1")[1]).not.toBe("underway")
  })
})

describe("waiting on them (I435)", () => {
  test("hush:  never what waits on them by a badge, nor their finished work", () => {
    const plan = planWith("on")
    const against = oldCall(plan, undefined, 10, { severe: true })
    const theirs = oldCall(plan, '<p>Owen: "Do it so"</p>')
    const acted = oldCall(plan)
    plan.log(`${acted.toUpperCase()} urgent (Owen, from its id chip)`)
    const routine = oldCall(plan)
    plan.badges.refresh()
    const hushed = Hush.candidates(plan).map(({ id }) => id)
    expect([against, theirs, acted].filter((id) => hushed.includes(id))).toEqual([])
    expect(hushed).toContain(routine)
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

  test("on:  no new item closes as it's made, until they say yes to that;  off:  one command puts it all back", async () => {
    const epic = commands()
    await epic.run(["badges", "demo", "on"])
    await epic.run(["add", "demo", "todo", "Nice to have", "--title-ok"])
    expect(page().item("t1").getAttribute("status")).toBe("open")
    expect(await epic.run(["badges", "demo", "close", "T1"])).toBe(0)
    expect(await epic.run(["badges", "demo", "close-new", "yes"])).toBe(0)
    await epic.run(["add", "demo", "todo", "Another", "--title-ok"])
    await epic.run(["add", "demo", "judgement", "A new call", "--title-ok"])
    const statuses = ["t1", "t2", "j1"].map((id) => page().item(id).getAttribute("status"))
    expect(statuses).toEqual(["canceled", "canceled", "open"])
    expect(await epic.run(["badges", "demo", "off"])).toBe(0)
    for (const id of ["t1", "t2", "j1"]) {
      const item = page().item(id)
      expect(item.getAttribute("status")).toBe("open")
      for (const name of ["care", "doubt", "badge", "badge-closed", "closed-as", "judged"])
        expect(item.hasAttribute(name)).toBe(false)
    }
    expect(page().page.hasAttribute("badges")).toBe(false)
    expect(page().page.hasAttribute("badges-close-new")).toBe(false)
  })

  test("one they add on the page is never closed as it's made", async () => {
    const epic = commands()
    await epic.run(["badges", "demo", "on"])
    await epic.run(["badges", "demo", "close-new", "yes"])
    await epic.edit(file, (plan) => plan.applyMark({ id: "new1", action: "new", kind: "todo", title: "Their todo" }))
    expect(page().item("t1").getAttribute("status")).toBe("open")
  })

  test("off:  what they approved since stays closed;  calm comes back", async () => {
    const epic = commands()
    await epic.run(["badges", "demo", "on"])
    await epic.run(["add", "demo", "todo", "Nice to have", "--title-ok"])
    await epic.run(["add", "demo", "issue", "It jumps", "--calm", "--title-ok"])
    await epic.run(["badges", "demo", "close", "T1"])
    await epic.files.edit(file, (plan) => {
      plan.applyMark({ id: "t1", action: "approve" })
      plan.setCalm("i1", false)
    })
    await epic.run(["badges", "demo", "off"])
    expect(page().item("t1").getAttribute("status")).toBe("canceled")
    expect(page().item("i1").hasAttribute("calm")).toBe(true)
  })

  test("set --your-call yes:  a call, a test and a question too, whatever their scores", async () => {
    const epic = commands()
    await epic.run(["badges", "demo", "trial"])
    for (const kind of ["judgement", "test", "question"]) await epic.run(["add", "demo", kind, "It asks", "--title-ok"])
    for (const id of ["J1", "M1", "Q1"]) {
      const flags = ["--care", "10", "--doubt", "90", "--your-call", "yes"]
      expect(await epic.run(["badges", "demo", "set", id, ...flags])).toBe(0)
    }
    const look = (id: string) => [page().item(id).getAttribute("badge"), page().item(id).getAttribute("state")]
    expect([look("j1"), look("m1"), look("q1")]).toEqual([
      ["yourCall", "replied"],
      ["youTest", "open"],
      ["yourCall", "attention"]
    ])
  })

  test("off:  a plain UPDATE label is plain again, though it said DONE while its badge had it closed", async () => {
    const epic = commands()
    await epic.run(["add", "demo", "todo", "An old wish", "--title-ok"])
    await epic.files.edit(file, (plan) => plan.markUpdate(plan.item("t1")))
    await epic.run(["badges", "demo", "on"])
    await epic.run(["badges", "demo", "score"])
    await epic.run(["badges", "demo", "close", "T1"])
    await epic.run(["log", "demo", "the next edit"])
    expect(PlanItem.updateLabelOf(page().item("t1"))!.getAttribute("became")).toBe("canceled")
    await epic.run(["badges", "demo", "off"])
    expect(PlanItem.updateLabelOf(page().item("t1"))!.hasAttribute("became")).toBe(false)
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
