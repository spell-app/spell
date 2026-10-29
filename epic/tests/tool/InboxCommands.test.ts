/**
 * Tests of `InboxCommands` (`epic inbox ...`) on a scratch checkout:
 * an epic page in `<epic-*>` markup and its inbox file.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, expect, test, vi } from "vite-plus/test"

import { GuideInbox } from "spell/epic/tool/GuideInbox"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { LISTEN_STALE_MS, ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { SharedComments } from "spell/epic/tool/SharedComments"

import { PageInboxes } from "spell/epic/tools/PageInboxes"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const M1 = "2026-10-07T10:00:00.000-04:00"
const M2 = "2026-10-07T10:01:00.000-04:00"
const M3 = "2026-10-07T10:02:00.000-04:00"

const root = mkdtempSync(join(tmpdir(), "inbox-commands-"))
const file = join(root, "epics", "x", "x.plan.html")
const inboxFile = ReviewInbox.pathFor(file)

/** What the commands printed. */
let printed: string[]

/** The commands, on the scratch checkout, their output caught in `printed`. */
function commands() {
  const owner = new PlanDocCommands({ files: new PlanDocFiles({ root }) })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
  return owner
}

beforeEach(() => {
  printed = []
  mkdirSync(join(root, "epics", "x"), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  plan.addItem("judgement", "a real choice")
  plan.addItem("judgement", "follows WWOD", { calm: true })
  plan.updateStates()
  writeFileSync(file, plan.toString())
  rmSync(inboxFile, { force: true })
  for (const each of SharedComments.pathsBeside(inboxFile)) rmSync(each)
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

test("apply:  the SENT urgency from the id chips goes into the doc, logged, and leaves the inbox;  unsent waits", async () => {
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setUrgency("j1", true, M1)
    inbox.setUrgency("j2", false, M1)
    inbox.markSent(M2)
    inbox.setUrgency("j1", false, M3)
  })
  // j1 changed after the send:  not applied, kept
  await commands().inbox.run("x", file, ["apply"], {})
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  expect([plan.findItem("j1")!.hasAttribute("calm"), plan.findItem("j2")!.hasAttribute("calm")]).toEqual([false, false])
  expect([plan.findItem("j1")!.getAttribute("state"), plan.findItem("j2")!.getAttribute("state")]).toEqual([
    "attention",
    "attention"
  ])
  expect(printed.join("\n")).toContain("J2  marked urgent")
  expect(Object.keys(ReviewInbox.read(inboxFile).urgency)).toEqual(["j1"])
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setUrgency("j1", true, M3)
    inbox.markSent(M3)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  expect(PlanDoc.parse(readFileSync(file, "utf8")).findItem("j1")!.getAttribute("state")).toBe("open")
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

test("apply:  a sent pick on a judgement call's reply cards (I8) approves it with that option;  an old question pick too", async () => {
  const options = (letters: string[]) =>
    `<epic-choices>${letters.map((letter) => `<epic-option letter="${letter}" title="Option ${letter}"></epic-option>`).join("")}</epic-choices>`
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.setDetails("j1", `<p>weighed</p>${options(["A", "B"])}`)
  plan.setDetails("j1", `<epic-reply from="Claude" at="2026-10-07 09:00">${options(["A", "B", "C"])}</epic-reply>`, {
    append: true
  })
  plan.addItem("question", "which?", { details: `<p>why</p>${options(["A", "B"])}` })
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("j1", { action: "pick", pick: "C", choices: 1 }, M1)
    // a mark from before I8:  no card set, the question's own
    inbox.setMark("q1", { action: "pick", pick: "B" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  const j1 = after.findItem("j1")!
  expect(Array.from(j1.querySelectorAll("epic-choices"), (set) => set.getAttribute("chosen"))).toEqual([null, "C"])
  expect([
    j1.getAttribute("status"),
    j1.getAttribute("review-as"),
    // the pick's line on its set, no Noted card (I153)
    j1.querySelectorAll("epic-choices")[1]!.getAttribute("chosen-note"),
    j1.querySelector("epic-status")
  ]).toEqual(["done", "approve", `recorded, the call accepted;  ${after.nextStepWords()}`, null])
  expect(after.findItem("q1")!.querySelector("epic-choices")!.getAttribute("chosen")).toBe("B")
  expect(printed.join("\n")).toContain(
    "J1  Owen picked C:  Option C (a reply's options);  approved:  closed (accepted)"
  )
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

test("print:  the urgency waiting, by item, sent or not", async () => {
  ReviewInbox.update(inboxFile, (inbox) => inbox.setUrgency("j2", false, M1))
  await commands().inbox.run("x", file, [], {})
  expect(printed.join("\n")).toMatch(/urgency, from the id chips \(1\):\n {2}- J2 {2}follows WWOD {2}· urgent · unsent/)
})

test("apply:  a sent todo gets a status card born NOTED, saying what was recorded (Q19);  an approval none", async () => {
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("j1", { action: "todo" }, M1)
    inbox.setMark("j2", { action: "approve" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const card = plan.findItem("j1")!.querySelector(':scope > epic-status[slot="status"]')!
  expect([card.getAttribute("state"), card.innerHTML]).toEqual([
    "noted",
    '<p>Made todo <a href="#t1">T1</a> to follow this up.</p>'
  ])
  expect(plan.findItem("j2")!.querySelector("epic-status")).toBeNull()
})

test("apply:  a todo's plane queues it into the first phase still to do, with a Noted card;  its x cancels it", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("Bring It In")
  plan.addPhase("Fold Into Elements")
  plan.setPhase(1, "active")
  plan.addItem("todo", "tidy the routes")
  plan.addItem("todo", "an old idea")
  plan.updateStates()
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("t1", { action: "next", note: "after the merge" }, M1)
    inbox.setMark("t2", { action: "drop" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  const t1 = after.findItem("t1")!
  expect([t1.getAttribute("queued"), t1.getAttribute("work"), t1.getAttribute("review-as")]).toEqual([
    after.today,
    "P2 · Fold Into Elements",
    "next"
  ])
  const card = t1.querySelector(':scope > epic-status[slot="status"]')!
  expect([card.getAttribute("state"), card.textContent]).toEqual(["noted", "Queued for P2 · Fold Into Elements"])
  // Owen's note kept, as his reply
  expect(t1.querySelector('epic-reply[from="Owen"]')?.textContent).toBe("after the merge")
  const t2 = after.findItem("t2")!
  expect([t2.getAttribute("status"), t2.getAttribute("state"), t2.getAttribute("review-as")]).toEqual([
    "canceled",
    "old",
    "drop"
  ])
  const out = printed.join("\n")
  expect(out).toContain("T1  queued for P2 · Fold Into Elements")
  expect(out).toContain("T2  canceled:  dropped by Owen in review")
  expect(after.toString()).toMatch(/T2 canceled:\s+dropped by Owen in review/)
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

test("apply:  a todo's plane with no phase still to do:  queued for the next phase, and it says so", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addItem("todo", "later")
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("t1", { action: "next" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const t1 = PlanDoc.parse(readFileSync(file, "utf8")).findItem("t1")!
  expect(t1.getAttribute("work")).toBe("the next phase")
  expect(t1.querySelector("epic-status")!.textContent).toMatch(
    /^Queued for the next phase:\s+there's no phase to do yet$/
  )
  expect(printed.join("\n")).toContain("T1  queued for the next phase (no phase to do yet)")
})

test("apply:  the note box's x (`skip`):  reviewed, nothing else, a note kept;  a todo dropped;  a phase noted", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("Bring It In")
  plan.addItem("question", "which way?")
  plan.addItem("todo", "an old idea")
  plan.updateStates()
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("j1", { action: "skip", note: "covered by P3" }, M1)
    inbox.setMark("q1", { action: "skip" }, M1)
    inbox.setMark("t1", { action: "skip" }, M1)
    inbox.setMark("p1", { action: "skip", note: "fine as planned" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  const facts = (id: string) => {
    const item = after.findItem(id)!
    return [item.getAttribute("status"), item.getAttribute("reviewed"), item.getAttribute("review-as")]
  }
  // still open (a skip settles nothing), reviewed, no status card
  expect(facts("j1")).toEqual(["open", after.today, "skip"])
  expect(facts("q1")).toEqual(["open", after.today, "skip"])
  expect(after.findItem("j1")!.querySelector("epic-status")).toBeNull()
  expect(after.findItem("j1")!.getAttribute("state")).not.toBe("attention")
  expect(after.findItem("j1")!.querySelector('epic-reply[from="Owen"][re="skip"]')?.textContent).toBe("covered by P3")
  // a todo:  skipping it IS dropping it
  expect(facts("t1")).toEqual(["canceled", after.today, "drop"])
  expect(after.document.getElementById("p-bring-it-in")!.querySelector('epic-reply[from="Owen"]')?.textContent).toBe(
    "fine as planned"
  )
  const out = printed.join("\n")
  expect(out).toContain("J1  skipped:  nothing to do, reviewed (his note kept)")
  expect(out).toContain("Q1  skipped:  nothing to do, reviewed")
  expect(out).toContain("T1  canceled:  dropped by Owen in review")
  expect(out).toContain("P1  skipped:  nothing to do (his note kept)")
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

test("apply --all:  marks never sent are applied too, as if sent (`/airplane land`)", async () => {
  ReviewInbox.update(inboxFile, (inbox) => inbox.setMark("j1", { action: "todo" }, M1))
  await commands().inbox.run("x", file, ["apply"], {})
  expect(ReviewInbox.read(inboxFile).marks.j1).toBeDefined()
  await commands().inbox.run("x", file, ["apply"], { all: true })
  expect(ReviewInbox.read(inboxFile).marks.j1).toBeUndefined()
  expect(PlanDoc.parse(readFileSync(file, "utf8")).findItem("j1")!.querySelector("epic-status")).not.toBeNull()
})

test("done:  a Do Now request done is `review-as=now`;  a revisit talked over, `revisit`:  neither settles it (J10)", async () => {
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.requestNow("j1", "details", "", M1)
    inbox.setMark("j2", { action: "revisit", when: "soon", note: "why?" }, M1)
  })
  await commands().inbox.run("x", file, ["done", "j1"], {})
  await commands().inbox.run("x", file, ["clear", "j2"], {})
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  expect([plan.findItem("j1")!.getAttribute("review-as"), plan.findItem("j2")!.getAttribute("review-as")]).toEqual([
    "now",
    "revisit"
  ])
  // answered, not settled:  neither turns green (only an approval or a todo does)
  expect(["j1", "j2"].map((id) => plan.findItem(id)!.getAttribute("state"))).not.toContain("recent")
})

test("done C1 --file:  the answer goes on the comment's thread;  Owen's reply lists it as waiting again", async () => {
  const id = "c1"
  ReviewInbox.update(inboxFile, (inbox) => void inbox.commentList.add({ anchor: "j1", kind: "item" }, "Why?"))
  const answer = join(root, "answer.html")
  writeFileSync(answer, "<p>Because.</p>\n")
  await commands().inbox.run("x", file, ["done", id], { file: answer, commit: "8c7e1d3" })
  expect(ReviewInbox.read(inboxFile).comments[id].replies).toEqual([
    { by: "Owen", agent: "claude", at: expect.any(String), html: "<p>Because.</p>", commit: "8c7e1d3" }
  ])
  ReviewInbox.update(inboxFile, (inbox) => inbox.commentList.reply(id, "Say more"))
  await commands().inbox.run("x", file, [], {})
  expect(printed.join("\n")).toMatch(/C1 {2}on j1 \(item\)[^\n]*\n {4}Owen replied:  "Say more"/)
})

// Owen, 2026-10-10:  "send button at top of page doesn't appear to be hooked up" -- he keeps Send as the way comments
// reach Claude, so a send with only comments must wake the waiting session
test("wait:  a send with ONLY comments wakes it, and prints each comment and Owen's latest reply;  once", async () => {
  ReviewInbox.update(inboxFile, (inbox) => {
    const id = inbox.commentList.add({ anchor: "j1", kind: "item", quote: "a real choice" }, "Why?", new Date(M1))
    inbox.commentList.answer(id, "<p>Because.</p>", new Date(M1))
    inbox.commentList.reply(id, "Say more", new Date(M2))
    inbox.commentList.add({ anchor: "p1#field-1", kind: "field" }, "Is this hooked up?", new Date(M2))
  })
  await commands().inbox.run("x", file, [], {})
  expect(printed.join("\n")).toMatch(/sent:  never;  2 unsent/)
  printed = []
  ReviewInbox.update(inboxFile, (inbox) => inbox.markSent(M3))
  expect(await commands().inbox.run("x", file, ["wait"], { timeout: "5" })).toBeUndefined()
  const said = printed.join("\n")
  expect(said).toMatch(/^sent [^\n]* \(0 marks, 2 comments\):/)
  expect(said).toMatch(
    /C1 {2}on j1 \(item\) {2}quoting "a real choice" {2}"Why\?"[^\n]*\n {6}Owen replied:  "Say more"/
  )
  expect(said).toMatch(/C2 {2}on p1#field-1 \(field\) {2}"Is this hooked up\?"/)
  expect(said).toMatch(/epic inbox working x#<M id> on/)
  // nothing to apply:  no line saying so
  expect(said).not.toMatch(/epic inbox apply x/)
  // handed over:  the next wait has nothing until Owen speaks again
  expect(ReviewInbox.read(inboxFile).hasWork).toBe(false)
})

/** Make `guides/x.html` epic x's guide:  a page x owns (`SeeAlso.ownerOf()`);  returns its file. */
function ownGuide(): string {
  const guide = join(root, "guides", "x.html")
  mkdirSync(join(root, "guides"), { recursive: true })
  writeFileSync(guide, "<!doctype html><title>X</title>")
  const html = readFileSync(file, "utf8")
  writeFileSync(file, html.replace(/(<epic-page\b[^>]*>)/, `$1<a slot="durable" href="../../guides/x.html">X</a>`))
  return guide
}

// epic `epic-engine` I140:  a revisit made of Owen's comments in a part's text
test("wait:  a revisit whose content is Owen's comments prints them under it;  `inbox` names them", async () => {
  ReviewInbox.update(inboxFile, (inbox) => {
    const id = inbox.commentList.add(
      { anchor: "j1#para-1", kind: "para", label: "J1", excerpt: "build time" },
      "It should work in the browser too.",
      new Date(M1)
    )
    inbox.setMark(
      "j1",
      { action: "revisit", when: "soon", note: "see my comments in its text:  C1", comments: [id] },
      M1
    )
  })
  await commands().inbox.run("x", file, [], {})
  expect(printed.join("\n")).toMatch(/J1 {2}[^\n]*· "see my comments in its text: {2}C1" · his comments C1 · unsent/)
  printed = []
  ReviewInbox.update(inboxFile, (inbox) => inbox.markSent(M2))
  expect(await commands().inbox.run("x", file, ["wait"], { timeout: "5" })).toBeUndefined()
  expect(printed.join("\n")).toMatch(
    /note: {2}"see my comments in its text: {2}C1"\n {8}his comments in its text, the revisit's content \(1\):\n {10}- C1 {2}on j1#para-1 \(para\) {2}"It should work in the browser too\."/
  )
})

// epic `epic-workflow` P13 (J27):  the epic's own listener hears the guides it owns
test("wait:  a Send on a guide the epic owns wakes it, each comment under its page;  once;  `inbox` lists it", async () => {
  const guide = GuideInbox.fileFor(ownGuide())
  GuideInbox.update(guide, (comments) => {
    comments.add({ anchor: "summary", kind: "section", label: "1. Summary" }, "Too long?", new Date(M1))
  })
  await commands().inbox.run("x", file, [], {})
  expect(printed.join("\n")).toMatch(
    /comments on the pages x owns, waiting for an answer \(1\):\n {2}guides\/x\.html {2}\(sent never\)\n {4}- C1 {2}on summary \(section\) {2}"Too long\?"[^\n]*· unsent/
  )
  printed = []
  GuideInbox.update(guide, (_comments, inbox) => inbox.markSent(M2))
  expect(await commands().inbox.run("x", file, ["wait"], { timeout: "5" })).toBeUndefined()
  const said = printed.join("\n")
  expect(said).toMatch(/^sent from the pages x owns \(1 comment\):\n {2}guides\/x\.html {2}\(sent [^)]+\):\n {4}- C1/)
  expect(said).toMatch(/epic comments working <page>#<M id> on/)
  expect(GuideInbox.read(guide).hasNewSend).toBe(false)
})

// epic `epic-engine` M9 (J7):  the STANDING epic `feedback` hears every page no epic owns;  `guide-changes` is it too
test("wait:  feedback hears a Send on a page no epic owns, not on one an epic owns;  asked as guide-changes too", async () => {
  // only the scratch checkout's inboxes:  never the engine's real Epic UI folder's
  const found = PageInboxes.prototype.inboxFiles
  vi.spyOn(PageInboxes.prototype, "inboxFiles").mockImplementation(function (this: PageInboxes) {
    return found.call(this).filter((each) => each.startsWith(root))
  })
  const feedback = join(root, "epics", "feedback", "feedback.plan.html")
  mkdirSync(join(root, "epics", "feedback"), { recursive: true })
  writeFileSync(feedback, readFileSync(file, "utf8").replace(/epic="x"/, 'epic="feedback"'))
  const owned = GuideInbox.fileFor(ownGuide())
  rmSync(owned, { force: true })
  mkdirSync(join(root, "pages"), { recursive: true })
  writeFileSync(join(root, "pages", "list.html"), "<!doctype html><title>List</title>")
  const unowned = GuideInbox.fileFor(join(root, "pages", "list.html"))
  for (const inbox of [owned, unowned])
    GuideInbox.update(inbox, (comments, box) => {
      comments.add({ anchor: "page", kind: "page", label: "" }, "Which epic?", new Date(M1))
      box.markSent(M2)
    })
  try {
    expect(await commands().inbox.run("guide-changes", feedback, ["wait"], { timeout: "5" })).toBeUndefined()
    const said = printed.join("\n")
    expect(said).toMatch(/^sent from the pages feedback owns \(1 comment\):\n {2}pages\/list\.html {2}\(sent /)
    expect(said).not.toContain("guides/x.html")
    expect(GuideInbox.read(unowned).hasNewSend).toBe(false)
    expect(GuideInbox.read(owned).hasNewSend).toBe(true)
  } finally {
    rmSync(join(root, "epics", "feedback"), { recursive: true, force: true })
    rmSync(join(root, "pages"), { recursive: true, force: true })
    rmSync(owned, { force: true })
  }
})

test("wait --json:  the send's comments, as the inbox holds them", async () => {
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.commentList.add({ anchor: "j1", kind: "item" }, "Why?", new Date(M1))
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["wait"], { timeout: "5", json: true })
  const work = JSON.parse(printed.join("\n")) as { sent: { comments: { id: string; text: string }[] } }
  expect(work.sent.comments).toMatchObject([{ id: "c1", text: "Why?" }])
})

test("working C1 on | off (c1, the old c1 too):  the thread's thinking stub, not an item's spinner;  done turns it off", async () => {
  const id = "c1"
  ReviewInbox.update(inboxFile, (inbox) => void inbox.commentList.add({ anchor: "j1", kind: "item" }, "Why?"))
  const comment = () => ReviewInbox.read(inboxFile).comments[id]
  await commands().inbox.run("x", file, ["working", "C1", "on"], {})
  expect(comment().working).toEqual(expect.any(String))
  expect(ReviewInbox.read(inboxFile).working).toEqual({})
  // being thought about:  no longer waiting for Claude
  expect(ReviewInbox.read(inboxFile).commentList.waiting).toEqual([])
  await commands().inbox.run("x", file, ["working", "c1", "off"], {})
  expect(comment().working).toBeUndefined()
  await commands().inbox.run("x", file, ["working", "cm1", "on"], {})
  await commands().inbox.run("x", file, ["done", id], {})
  expect(comment().working).toBeUndefined()
  expect(printed).toEqual(["C1 working:  on", "C1 working:  off", "C1 working:  on", "comments answered:  C1"])
  await expect(commands().inbox.run("x", file, ["working", "cm9", "on"], {})).rejects.toThrow(/no comment C9/)
})

test("status:  underway writes the card AND turns the page's spinner on;  done turns both;  done again is refused", async () => {
  const owner = commands()
  vi.spyOn(owner, "warn").mockImplementation(() => undefined)
  expect(await owner.run(["status", "x", "j1", "underway", "Weigh it, and answer here."])).toBe(0)
  expect(Object.keys(ReviewInbox.read(inboxFile).working)).toEqual(["j1"])
  // Claude is on it:  the item is `progress` (blue) until the card is done (Q20)
  const state = () => PlanDoc.parse(readFileSync(file, "utf8")).findItem("j1")!.getAttribute("state")
  expect(state()).toBe("progress")
  expect(await owner.run(["status", "x", "j1", "done", "Answered:  keep it."])).toBe(0)
  expect(state()).toBe("attention")
  const card = PlanDoc.parse(readFileSync(file, "utf8")).findItem("j1")!.querySelector("epic-status")!
  // as written to disk, formatted:  whitespace aside
  expect([card.getAttribute("state"), card.hasAttribute("done-at"), card.innerHTML.replace(/\s+/g, " ")]).toEqual([
    "done",
    true,
    '<p>Weigh it, and answer here.</p> <p slot="summary">Answered: keep it.</p>'
  ])
  expect(ReviewInbox.read(inboxFile).working).toEqual({})
  expect(await owner.run(["status", "x", "j1", "done"])).toBe(1)
  // `done --filed`, the older spelling:  a record, so NOTED (Owen, 2026-10-10)
  expect(await owner.run(["status", "x", "j2", "done", "--filed", "Chose B · Keep one file per template"])).toBe(0)
  const filed = PlanDoc.parse(readFileSync(file, "utf8")).findItem("j2")!.querySelector("epic-status")!
  expect([filed.getAttribute("state"), filed.hasAttribute("done-at"), filed.innerHTML]).toEqual([
    "noted",
    false,
    "<p>Chose B · Keep one file per template</p>"
  ])
  expect(printed).toEqual(["J1 underway:  a real choice", "J1 done:  a real choice", "J2 noted:  follows WWOD"])
  expect(await owner.run(["status", "x", "j1", "maybe"])).toBe(1)
})

test("status noted:  Claude only RECORDED Owen's choice -- an underway card turns noted, the spinner off", async () => {
  const owner = commands()
  vi.spyOn(owner, "warn").mockImplementation(() => undefined)
  expect(await owner.run(["status", "x", "j1", "underway", "Take the pick."])).toBe(0)
  expect(await owner.run(["status", "x", "j1", "noted", "Chose B:  waiting for the next phase"])).toBe(0)
  const card = PlanDoc.parse(readFileSync(file, "utf8")).findItem("j1")!.querySelector("epic-status")!
  expect([card.getAttribute("state"), card.hasAttribute("done-at"), card.innerHTML.replace(/\s+/g, " ")]).toEqual([
    "noted",
    true,
    '<p>Take the pick.</p> <p slot="summary">Chose B: waiting for the next phase</p>'
  ])
  expect(ReviewInbox.read(inboxFile).working).toEqual({})
  expect(await owner.run(["status", "x", "j2", "noted"])).toBe(1)
  expect(printed).toEqual(["J1 underway:  a real choice", "J1 noted:  a real choice"])
})

test("status done on an issue (I148):  the card turns green AND the issue closes, green, logged, in one write", async () => {
  const owner = commands()
  vi.spyOn(owner, "warn").mockImplementation(() => undefined)
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addItem("issue", "it stays red")
  plan.updateStates()
  writeFileSync(file, plan.toString())
  const issue = () => PlanDoc.parse(readFileSync(file, "utf8")).findItem("i1")!
  expect(issue().getAttribute("state")).toBe("attention")
  expect(await owner.run(["status", "x", "i1", "underway", "Fix it."])).toBe(0)
  expect(await owner.run(["status", "x", "i1", "done", "Fixed:  CI is green."])).toBe(0)
  expect([issue().getAttribute("status"), issue().getAttribute("state")]).toEqual(["done", "recent"])
  expect(issue().querySelector("epic-status")!.getAttribute("state")).toBe("done")
  const log = Array.from(PlanDoc.parse(readFileSync(file, "utf8")).document.querySelectorAll("#log > epic-event"))
  // as written to disk, formatted:  one space
  expect(log.at(-1)!.textContent).toMatch(/^I1 closed:\s+it stays red$/)
  expect(printed).toEqual(["I1 underway:  it stays red", "I1 done, closed:  it stays red"])
})

test("clear / done:  a pick riding on the mark (pick B, but ...) stays CHOSEN, its line on the set;  logged", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const options = `<epic-choices><epic-option letter="A" title="Option A"></epic-option><epic-option letter="B" title="Option B"></epic-option></epic-choices>`
  plan.setDetails("j1", `<p>weighed</p>${options}`)
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("j1", { action: "revisit", when: "soon", note: "B, but cheaper?", pick: "B" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["clear", "j1"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  const j1 = after.findItem("j1")!
  expect(j1.querySelector("epic-choices")!.getAttribute("chosen")).toBe("B")
  expect(j1.querySelector("epic-choices")!.getAttribute("chosen-note")).toMatch(/^recorded after the talk/)
  expect(j1.querySelector('epic-status[state="noted"]')).toBeNull()
  expect(after.toString()).toMatch(/J1 Owen picked B:\s+Option B \(kept from the revisit\)/)
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

// epic `airplane` P2:  notes on the phases and the summary, and new items from the page

/** The scratch doc, with a phase:  `P1 · Offline Pages`. */
function withPhase() {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("Offline Pages")
  writeFileSync(file, plan.toString())
}

test("apply:  sent new items are made, a phase's and the summary's todos filed;  all leave the inbox;  unsent waits", async () => {
  withPhase()
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setNew(undefined, { kind: "question", title: "window or aisle?", note: "long flight", near: "p1" }, M1)
    inbox.setMark("p1", { action: "todo", note: "after the flight" }, M1)
    inbox.setMark("summary", { action: "todo" }, M1)
    inbox.markSent(M2)
    inbox.setNew(undefined, { kind: "todo", title: "not sent yet" }, M3)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  expect(printed.join("\n")).toBe(
    ["NEW1  made question Q1:  window or aisle?", "P1  to todo T1", "SUMMARY  to todo T2"].join("\n")
  )
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  // `near` the phase by its old id (`p1`):  linked by its stable one
  expect(after.findItem("q1")!.querySelector('a[href="#p-offline-pages"]')).not.toBeNull()
  expect(after.findItem("q1")!.querySelector('epic-status[state="noted"]')).not.toBeNull()
  expect(after.findItem("t1")!.getAttribute("title")).toBe("Follow up:  P1 · Offline Pages")
  expect(after.findItem("t2")!.getAttribute("title")).toBe("Follow up:  the summary")
  expect(Object.keys(ReviewInbox.read(inboxFile).marks)).toEqual(["new2"])
})

test("print:  a new item by its kind and title, with its note and what it's about;  a phase's mark by its title", async () => {
  withPhase()
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setNew(undefined, { kind: "todo", title: "pack", note: "chargers", near: "j1" }, M1)
    inbox.setMark("p1", { action: "revisit", note: "too big?" }, M1)
  })
  await commands().inbox.run("x", file, [], {})
  const text = printed.join("\n")
  expect(text).toContain('new (1):\n  - NEW1  todo:  pack  · "chargers" · about J1 · unsent')
  expect(text).toContain('revisit (1):\n  - P1  Offline Pages  · soon · "too big?" · unsent')
})

test("clear:  a phase's note is kept as Owen's reply in the phase;  a new item's note is never a reply", async () => {
  withPhase()
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("p1", { action: "revisit", note: "too big?" }, M1)
    inbox.setNew(undefined, { kind: "todo", title: "pack", note: "chargers" }, M1)
  })
  await commands().inbox.run("x", file, ["clear", "p1", "new1"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  const replies = after.document.querySelectorAll("epic-reply")
  expect(Array.from(replies, (reply) => [reply.parentElement!.id, reply.textContent])).toEqual([
    ["p-offline-pages", "too big?"]
  ])
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

// epic `epic-engine` P4:  a test run's four answers, printed, handed over by `wait`, applied
test("a test run's answers:  printed, handed over by wait, applied;  each failure's new issue listed", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  for (const title of ["one", "two", "three", "four"]) plan.addItem("test", title)
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("m1", { action: "test", result: "passed" }, M1)
    inbox.setMark("m2", { action: "test", result: "failed", note: "grey", shot: "tests/m2-20261007-1000.png" }, M1)
    inbox.setMark("m3", { action: "test", result: "skip" }, M1)
    inbox.setMark("m4", { action: "test", result: "notnow" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, [], {})
  expect(printed.join("\n")).toContain('M2  two  · FAILED · comment "grey" · screenshot tests/m2-20261007-1000.png')
  printed = []
  await commands().inbox.run("x", file, ["wait"], { timeout: "5" })
  const work = printed.join("\n")
  expect(work).toContain(
    "test, the person's test run:  passed closes, failed files an issue, skip cancels, not now defers (4):"
  )
  expect(work).toMatch(
    /M2 {2}test, open · two\n {8}FAILED\n {8}comment: {2}"grey"\n {8}screenshot: {2}tests\/m2-20261007-1000\.png/
  )
  expect(work).toContain("test results")
  printed = []
  await commands().inbox.run("x", file, ["apply"], {})
  expect(printed.join("\n").split("\n")).toEqual([
    "M1  passed (Owen's run)",
    "M2  failed (Owen's run):  filed I1",
    "M3  canceled:  no longer applies (Owen's run)",
    "M4  not now:  deferred (Owen's run)",
    `failed tests (1):  tell the person one line each, the issue's link (\`epic pages link ${file} --hash <issue> --review\`):`,
    "  M2 -> I1"
  ])
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(["m1", "m2", "m3", "m4"].map((id) => after.findItem(id)!.getAttribute("status"))).toEqual([
    "done",
    "open",
    "canceled",
    "open"
  ])
  expect(after.findItem("m2")!.getAttribute("failed")).toBe("i1")
  expect(ReviewInbox.read(inboxFile).marks).toEqual({})
})

// epic `epic-engine` I44:  a failure's screenshot in its new issue, in a split page's part, as the part reads it
test("a failed test's issue on a split page:  its screenshot written into the part as its root path", async () => {
  const files = new PlanDocFiles({ root })
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addItem("test", "one", { details: "<p>Do it.</p>" })
  await files.writeDoc(file, plan, true)
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("m1", { action: "test", result: "failed", note: "no", shot: "tests/m1-20261007-1000.png" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  // a part holds the page's own folder's URLs as root paths (epic `epic-engine` P46):  from `parts/` they'd climb
  expect(readFileSync(join(root, "epics", "x", "parts", "i1.html"), "utf8")).toContain(
    'src="/epics/x/tests/m1-20261007-1000.png"'
  )
  expect(files.read(file).findItem("i1")!.querySelector("img")!.getAttribute("src")).toBe(
    "/epics/x/tests/m1-20261007-1000.png"
  )
  rmSync(join(root, "epics", "x", "parts"), { recursive: true, force: true })
})

// epic `epic-engine` P29:  the page header's stage button, and a phase's Defer while the phases are agreed
test("apply:  a sent Accept Overview moves the page to the phases stage, logged;  one for a stage it's past is dropped", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.setStage("overview")
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("stage", { action: "accept", stage: "overview" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(after.stage).toBe("phases")
  expect(printed.join("\n")).toContain(
    "STAGE  accepted overview:  stage phases, write the phases and their build plans"
  )
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
  // sent twice:  the page has moved on, so it's dropped, nothing changed
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("stage", { action: "accept", stage: "overview" }, M2)
    inbox.markSent(M3)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  expect(PlanDoc.parse(readFileSync(file, "utf8")).stage).toBe("phases")
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
})

// epic `epic-engine` I125:  ONE Accept for the phases and their plans
test("apply:  a sent Accept Phases accepts every build plan waiting too, and starts the build", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  for (const name of ["One", "Two", "Three"]) plan.addPhase(name, { goal: `<ul><li>${name}</li></ul>` })
  plan.setPhaseFields(1, { plan: "<ol><li>Do one.</li></ol>" })
  plan.setPhaseFields(2, { plan: "<ol><li>Do two.</li></ol>" })
  plan.setStage("phases")
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("stage", { action: "accept", stage: "phases" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(after.stage).toBe("building")
  expect(after.phaseElements.map((phase) => phase.getAttribute("plan"))).toEqual(["accepted", "accepted", null])
  expect(printed.join("\n")).toContain("accepted phases:  stage building, start building (2 build plans accepted)")
})

test("apply:  a phase's sent Defer moves it after the others, still to do;  its Looks good is noted", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  for (const name of ["One", "Two", "Three"]) plan.addPhase(name, { goal: `<ul><li>${name}</li></ul>` })
  plan.setStage("phases")
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("p-one", { action: "defer" }, M1)
    inbox.setMark("p-two", { action: "approve" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(after.phases.map((phase) => `${phase.id} ${phase.status}`)).toEqual([
    "p-two todo",
    "p-three todo",
    "p-one todo"
  ])
  expect(printed.join("\n")).toContain("P-ONE  deferred:  after the other phases, now P3, still to do")
  expect(printed.join("\n")).toContain("P-TWO  approved")
})

////////////////
// ## Change marks (epic `epic-engine` P30)
////////////////

/** The scratch doc with Q1 decided, and the Overview's Structure rewritten by its answer:  one mark, by hand. */
function docWithChange(): PlanDoc {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const q = plan.addItem("question", "Where do caveats go?")
  plan.decide(q, "One list, Caveats")
  plan.document.querySelector("#o1 > p")!.innerHTML =
    `What goes where:  <epic-change item="${q}">one list, Caveats;  todos fold into it</epic-change>.`
  return plan
}

test("a change mark written by hand is STAMPED on the next edit:  its id, time and answer, and its host's to-accept", async () => {
  writeFileSync(file, docWithChange().toString())
  await commands().run(["change", "x"])
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const change = plan.document.querySelector("epic-change")!
  expect({
    id: change.id,
    item: change.getAttribute("item"),
    answer: change.getAttribute("answer"),
    stamped: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(change.getAttribute("at") ?? ""),
    toAccept: plan.document.querySelector("#o1")!.getAttribute("to-accept")
  }).toEqual({ id: "ch1", item: "q1", answer: "One list, Caveats", stamped: true, toAccept: "ch1" })
  expect(printed.join("\n")).toContain("CH1   Q1   new")
  expect(printed.join("\n")).toContain("1 new (1 marked)")
  // the review routes take its marks from the skeleton's text alone
  expect(ReviewInbox.itemIds(readFileSync(file, "utf8")).has("ch1")).toBe(true)
})

test("change --for names the marks written with no item;  lint (check) fails one naming no item, or not stamped", async () => {
  const plan = docWithChange()
  plan.document.querySelector("epic-change")!.removeAttribute("item")
  writeFileSync(file, plan.toString())
  await commands().run(["change", "x", "--for", "Q1"])
  expect(PlanDoc.parse(readFileSync(file, "utf8")).document.querySelector("epic-change")!.getAttribute("item")).toBe(
    "q1"
  )
  const broken = docWithChange()
  broken.document.querySelector("epic-change")!.setAttribute("item", "q9")
  expect(broken.check()).toEqual(
    expect.arrayContaining([
      'change "one list, Caveats; todos fold into it" names Q9:  no such item',
      expect.stringMatching(/^change "one list.*" has no id:  `epic change <name>` stamps it/)
    ])
  )
})

test("apply:  a change's sent Accept makes it accepted (no longer to accept), its chip's answer kept;  Reopen reopens its question", async () => {
  const plan = docWithChange()
  plan.updateStates()
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("ch1", { action: "accept" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  let after = PlanDoc.parse(readFileSync(file, "utf8"))
  const change = after.findChange("ch1")!
  expect([change.hasAttribute("accepted"), change.getAttribute("answer")]).toEqual([true, "One list, Caveats"])
  expect(after.document.querySelector("#o1")!.hasAttribute("to-accept")).toBe(false)
  expect(printed.join("\n")).toContain("CH1  accepted:  Q1's change stands")
  expect(ReviewInbox.read(inboxFile).isEmpty).toBe(true)
  // an accepted change takes no more marks from the page:  it's off the skeleton's list
  expect(ReviewInbox.itemIds(readFileSync(file, "utf8")).has("ch1")).toBe(false)

  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark("ch1", { action: "reopen" }, M2)
    inbox.markSent(M3)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(after.findItem("q1")!.getAttribute("status")).toBe("open")
  expect(after.findChange("ch1")!.hasAttribute("accepted")).toBe(false)
  expect(printed.join("\n")).toContain("CH1  reopened Q1, was decided;  the change waits")
})

////////////////
// ## Handled in a phase (epic `epic-engine` P31)
////////////////

test("a change mark in a PHASE's text marks its item handled there:  grey, logged;  one in the Overview doesn't", () => {
  const plan = docWithChange()
  const q = plan.addItem("question", "How many retries?")
  plan.decide(q, "Three")
  plan.addPhase("Retry Logic", {
    goal: `<ul><li><epic-change item="${q}">three retries, then give up</epic-change></li></ul>`
  })
  plan.updateStates()
  const item = plan.findItem(q)!
  expect([item.getAttribute("handled"), item.getAttribute("state")]).toEqual(["p-retry-logic", "handled"])
  expect(plan.toString()).toMatch(new RegExp(`${q.toUpperCase()} handled in P1`))
  // the Overview's mark (Q1's) is a change to accept, not a phase taking the answer
  expect(plan.findItem("q1")!.hasAttribute("handled")).toBe(false)
  expect(plan.findItem("q1")!.getAttribute("state")).toBe("recent")
})

test("apply:  Reopen on a phase's change mark takes `handled` off:  its question is back, red;  the next edit leaves it so", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const q = plan.addItem("question", "How many retries?")
  plan.decide(q, "Three")
  plan.addPhase("Retry Logic", { goal: `<ul><li><epic-change item="${q}">three retries</epic-change></li></ul>` })
  plan.updateStates()
  const change = plan.document.querySelector("epic-change")!.id
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark(change, { action: "reopen" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  after.updateStates()
  const item = after.findItem(q)!
  expect([item.hasAttribute("handled"), item.getAttribute("status"), item.getAttribute("state")]).toEqual([
    false,
    "open",
    "attention"
  ])
})

test("the inbox takes ONLY Accept and Reopen on a change, and neither anywhere else;  the stage's Accept still needs its stage", () => {
  const inbox = ReviewInbox.read(inboxFile)
  expect(inbox.setMark("ch2", { action: "accept" }, M1)).toMatchObject({ action: "accept" })
  expect(inbox.setMark("ch2", { action: "reopen" }, M1)).toMatchObject({ action: "reopen" })
  expect(() => inbox.setMark("ch2", { action: "approve" }, M1)).toThrow("a change takes Accept or Reopen, not approve")
  expect(() => inbox.setMark("q1", { action: "reopen" }, M1)).toThrow("only a change (ch3 ...) takes Reopen")
  expect(() => inbox.setMark("stage", { action: "accept" }, M1)).toThrow("accept which stage?")
  expect(inbox.setMark("stage", { action: "accept", stage: "overview" }, M1)).toMatchObject({ stage: "overview" })
})

////////////////
// ## Seen on an update block (epic `epic-engine` I168)
////////////////

// Owen, 2026-10-29:  "How do I clear these 'update' marks?"
test("the inbox takes ONLY Seen on an update (`up3`), and Seen nowhere else", () => {
  const inbox = ReviewInbox.read(inboxFile)
  expect(inbox.setMark("up3", { action: "seen" }, M1)).toMatchObject({ action: "seen" })
  expect(() => inbox.setMark("up3", { action: "approve" }, M1)).toThrow("an update takes Seen, not approve")
  expect(() => inbox.setMark("q1", { action: "seen" }, M1)).toThrow("only an update (up3 ...) takes Seen")
  expect(() => inbox.setMark("ch2", { action: "seen" }, M1)).toThrow()
})

test("itemIds:  an update block takes Seen while its host's `to-see` lists it, or it's in the page not `seen`", () => {
  const html =
    `<epic-section id="phases" kind="phases"><epic-phase id="p-one" title="One" status="active" ` +
    `to-see="up1@2026-10-01T09:05 up2"></epic-phase></epic-section>` +
    `<epic-update id="up5" at="2026-10-01 09:05" summary="x"></epic-update>` +
    `<epic-update id="up6" at="2026-10-01 09:05" seen="2026-10-02 10:00" summary="y"></epic-update>`
  const ids = ReviewInbox.itemIds(html)
  expect(["up1", "up2", "up5", "up6"].map((id) => ids.has(id))).toEqual([true, true, true, false])
})

test("apply:  Seen stamps `seen` on the block, for everyone;  it leaves its phase's `to-see`;  the mark is cleared", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("Retry Logic", { goal: "<ul><li>retries</li></ul>" })
  plan.addPhaseUpdate(1, "<p>split in two</p>", { summary: "Split in two" })
  plan.updateStates()
  const update = plan.document.querySelector("epic-update")!.id
  expect(plan.phaseElements[0]!.getAttribute("to-see")).toMatch(new RegExp(`^${update}@`))
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark(update, { action: "seen" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(after.document.getElementById(update)!.hasAttribute("seen")).toBe(true)
  expect(after.phaseElements[0]!.hasAttribute("to-see")).toBe(false)
  expect(printed.join("\n")).toContain(`${update.toUpperCase()}  seen:  Split in two`)
  expect(ReviewInbox.read(inboxFile).marks[update]).toBeUndefined()
})

////////////////
// ## The new flow (epic `epic-engine` P33)
////////////////

test("a phase's build plan waits for Owen:  Accept plan (approve) marks it accepted, logged;  removed, nothing waits", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("Retry Logic", { goal: "<ul><li>retries</li></ul>" })
  plan.setPhaseFields(1, { plan: "<ol><li>Write the loop</li><li>Test it</li></ol>" })
  const phase = plan.phaseElements[0]!
  expect(phase.getAttribute("plan")).toBe("waiting")
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setMark(phase.id, { action: "approve" }, M1)
    inbox.markSent(M2)
  })
  await commands().inbox.run("x", file, ["apply"], {})
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  const accepted = after.phaseElements[0]!
  expect(accepted.getAttribute("plan")).toBe("accepted")
  expect(accepted.querySelector('epic-field[name="plan"]')!.hasAttribute("accepted")).toBe(true)
  expect(printed.join("\n")).toContain("plan accepted:  build it")
  after.setPhaseFields(1, { plan: "" })
  expect(after.phaseElements[0]!.hasAttribute("plan")).toBe(false)
})

test("the doc pass floats:  a new phase goes before a last Doc Review, and a done one is to do again", () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  for (const name of ["Build", "Doc Review"]) plan.addPhase(name)
  plan.setPhase(1, "done")
  plan.setPhase(2, "done")
  plan.addPhase("More")
  expect(plan.phases.map((phase) => `${phase.name} ${phase.status}`)).toEqual([
    "Build done",
    "More todo",
    "Doc Review todo"
  ])
})

test("one question, one choice set:  two open sets are said by choiceSetProblems(), never by check()", () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const set = `<epic-choices><epic-option letter="A" title="A"></epic-option><epic-option letter="B" title="B"></epic-option></epic-choices>`
  const q = plan.addItem("question", "Which?", { details: `<p>pick</p>${set}${set}` })
  expect(plan.choiceSetProblems()).toEqual([`${q.toUpperCase()} asks 2 choice sets at once:  one question, one set`])
  expect(plan.check().some((problem) => problem.includes("choice sets"))).toBe(false)
})

////////////////
// ## Add and order phases (epic `epic-engine` P34)
////////////////

test("move:  a to-do phase to another place;  numbers, links and 'P3 · Name' text follow, history keeps its own", () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  for (const name of ["One", "Two", "Event", "Event Model"]) plan.addPhase(name)
  plan.setPhase(1, "done")
  const q = plan.addItem("limit", "Later")
  plan.document.getElementById(q)!.setAttribute("work", "P4 · Event Model")
  plan.document.getElementById(q)!.setAttribute("phase", "4")
  plan.findSection("log")!.insertAdjacentHTML("beforeend", "<epic-event>queued for P4 · Event Model</epic-event>")
  plan.document.querySelector("#o1 > p")!.innerHTML =
    `See <a href="#p-event-model">P4 · Event Model</a> and P3 · Event.`
  expect(plan.movePhase(4, 2)).toBe(2)
  expect(plan.phases.map((phase) => phase.name)).toEqual(["One", "Event Model", "Two", "Event"])
  const item = plan.document.getElementById(q)!
  expect([item.getAttribute("work"), item.getAttribute("phase")]).toEqual(["P2 · Event Model", "2"])
  expect(plan.document.querySelector("#o1 > p")!.textContent).toBe("See P2 · Event Model and P4 · Event.")
  expect(plan.findSection("log")!.textContent).toContain("queued for P4 · Event Model")
  // a done phase never moves, nor does a phase move past one
  expect(() => plan.movePhase(2, 1)).toThrow("P1 has started")
})

test("add-phase --before:  the 'P8 · Name' text naming the later phases follows their numbers (r21)", () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  for (const name of ["One", "Event Model"]) plan.addPhase(name)
  plan.document.querySelector("#o1 > p")!.innerHTML = "Waits for P2 · Event Model."
  plan.addPhase("Declarations", { before: 2 })
  expect(plan.document.querySelector("#o1 > p")!.textContent).toBe("Waits for P3 · Event Model.")
})

////////////////
// ## What Claude is doing (epic `epic-engine` P35)
////////////////

test("status:  the session's line, with what it answers (titles from the doc, a comment's first words);  --clear", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  const q = plan.addItem("question", "Which way?")
  writeFileSync(file, plan.toString())
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.setListening("s1")
    inbox.comments.c3 = {
      anchor: "o1",
      kind: "section",
      label: "",
      excerpt: "",
      text: "This   reads oddly, and goes on",
      at: M1,
      status: "new"
    } as never
  })
  await commands().inbox.run("x", file, ["status", "Responding"], { items: `${q},c3` })
  const doing = ReviewInbox.read(inboxFile).doing!
  expect([doing.text, doing.items]).toEqual([
    "Responding",
    [
      { id: q, title: "Which way?" },
      { id: "c3", title: "This reads oddly, and goes on" }
    ]
  ])
  expect(printed.join("\n")).toContain(`doing:  Responding (${q.toUpperCase()}, C3)`)
  await commands().inbox.run("x", file, ["status"], { clear: true })
  expect(ReviewInbox.read(inboxFile).doing).toBeNull()
  await expect(commands().inbox.run("x", file, ["status", "Responding"], { items: "q99" })).rejects.toThrow(
    "no item Q99"
  )
})

test("a stale line never lingers:  ignore clears it;  the page reads none once the listener's heartbeat is old", () => {
  const inbox = ReviewInbox.read(inboxFile)
  inbox.setListening("s1", M1)
  inbox.setDoing({ text: "Building P35" }, M1)
  expect(inbox.forPage(Date.parse(M1) + 1000).doing?.text).toBe("Building P35")
  expect(inbox.forPage(Date.parse(M1) + LISTEN_STALE_MS + 1000).doing).toBeNull()
  inbox.setListening(null)
  expect(inbox.doing).toBeNull()
})

////////////////
// ## A phase being worked on (epic `epic-engine` I147)
////////////////

/** The scratch doc with two phases, `P1 · One Repo` and `P2 · Docs`. */
function withPhases() {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("One Repo", { symptom: "two repos", changes: "one" })
  plan.addPhase("Docs", { symptom: "stale", changes: "fresh" })
  writeFileSync(file, plan.toString())
}

// Owen, 2026-10-26:  "repo-split is actively planning this (writing the plan) but there is no indication in the phase
// header"
test("working P1 on | off:  a phase by number or id, kept under its stable id, which `<epic-phase>` reads", async () => {
  withPhases()
  await commands().inbox.run("x", file, ["working", "P1", "on"], {})
  expect(Object.keys(ReviewInbox.read(inboxFile).working)).toEqual(["p-one-repo"])
  await commands().inbox.run("x", file, ["working", "p-one-repo", "off"], {})
  expect(ReviewInbox.read(inboxFile).working).toEqual({})
  await commands().inbox.run("x", file, ["working", "p2", "on"], {})
  expect(Object.keys(ReviewInbox.read(inboxFile).working)).toEqual(["p-docs"])
  expect(printed).toEqual(["P-ONE-REPO working:  on", "P-ONE-REPO working:  off", "P-DOCS working:  on"])
  await expect(commands().inbox.run("x", file, ["working", "P9", "on"], {})).rejects.toThrow(/no phase P9/)
})

test("phase P1 planning [off];  phase-body sets it by itself while the plan isn't accepted;  --plan written ends it", async () => {
  withPhases()
  const owner = commands()
  const working = () => Object.keys(ReviewInbox.read(inboxFile).working)
  expect(await owner.run(["phase", "x", "P1", "planning"])).toBe(0)
  expect(working()).toEqual(["p-one-repo"])
  expect(await owner.run(["phase", "x", "P1", "planning", "off"])).toBe(0)
  expect(working()).toEqual([])
  // `epic update x#P2 --goal ...`:  Claude writing its plan, so the page says so
  expect(await owner.run(["phase-body", "x", "P2", "--goal", "<ul><li>fresh</li></ul>"])).toBe(0)
  expect(working()).toEqual(["p-docs"])
  // the plan written, waiting for Owen's Accept:  nothing more to write
  expect(await owner.run(["phase-body", "x", "P2", "--plan", "<ol><li>Rewrite it.</li></ol>"])).toBe(0)
  expect(working()).toEqual([])
  expect(PlanDoc.parse(readFileSync(file, "utf8")).phase(2).getAttribute("plan")).toBe("waiting")
  // accepted:  a later edit of its fields is no planning
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.acceptPlan(plan.phase(2))
  writeFileSync(file, plan.toString())
  expect(await owner.run(["phase-body", "x", "P2", "--goal", "<ul><li>fresher</li></ul>"])).toBe(0)
  expect(working()).toEqual([])
  expect(printed.slice(0, 2)).toEqual(["P1 planning:  on", "P1 planning:  off"])
})

// epic `epic-friend` P11:  any agent hears a Send with `epic inbox wait`;  the page says whose agent it is
test("wait:  LISTENS while it waits, as this process, naming the person and the agent;  a session already listening keeps the place", async () => {
  const before = process.env.SPELL_EPIC_AGENT
  process.env.SPELL_EPIC_AGENT = "codex"
  try {
    expect(await commands().inbox.run("x", file, ["wait"], { timeout: "1", session: "thread-9" })).toBe(2)
    expect(ReviewInbox.read(inboxFile).listening).toMatchObject({
      session: "thread-9",
      pid: process.pid,
      person: "Owen",
      agent: "codex"
    })
    // a Claude session listening (`watch`):  its place, untouched
    ReviewInbox.update(inboxFile, (inbox) => inbox.setListening("claude-1"))
    process.env.SPELL_EPIC_AGENT = "claude"
    const watched = ReviewInbox.read(inboxFile).listening
    await commands().inbox.run("x", file, ["wait"], { timeout: "1", session: "thread-9" })
    const { seen: _seen, ...kept } = watched!
    expect(ReviewInbox.read(inboxFile).listening).toMatchObject(kept)
  } finally {
    process.env.SPELL_EPIC_AGENT = before
  }
})

// epic `epic-engine` I163 (Owen, 2026-10-29):  "When I approve a phase to which I have just added comments, you should
// just incorporate the feedback and auto-approve rather than asking me again"
test("an Accept plan carrying his comments:  wait says to fold them in, apply accepts the plan and leaves them", async () => {
  const plan = PlanDoc.parse(readFileSync(file, "utf8"))
  plan.addPhase("Retry Logic", { goal: "<ul><li>retries</li></ul>" })
  plan.setPhaseFields(1, { plan: "<ol><li>Write the loop</li></ol>" })
  const phase = plan.phaseElements[0]!.id
  writeFileSync(file, plan.toString())
  let ids: string[] = []
  ReviewInbox.update(inboxFile, (inbox) => {
    const place = { anchor: `${phase}#field-1`, kind: "field", label: "P1", excerpt: "plan" }
    ids = [
      inbox.commentList.add(place, "shorter steps", new Date(M1)),
      inbox.commentList.add(place, "test it", new Date(M1))
    ]
    inbox.setMark(phase, { action: "approve", note: "see my comments in its text:  C1, C2", comments: ids }, M1)
    inbox.markSent(M2)
  })
  expect(await commands().inbox.run("x", file, ["wait"], { timeout: "5" })).toBeUndefined()
  const said = printed.join("\n")
  expect(said).toMatch(/accepted, with comments to fold in: {2}C1, C2\n {10}- C1 [^\n]*"shorter steps"/)
  expect(said).toMatch(/--plan "\.\.\." --accepted/)
  // carried by the approve:  not listed again as comments of their own
  expect(said).not.toMatch(/comments, to answer on their threads/)
  printed = []
  await commands().inbox.run("x", file, ["apply"], {})
  expect(printed.join("\n")).toContain("plan accepted:  build it, with comments to fold in:  C1, C2")
  expect(PlanDoc.parse(readFileSync(file, "utf8")).phaseElements[0]!.getAttribute("plan")).toBe("accepted")
  const inbox = ReviewInbox.read(inboxFile)
  expect(inbox.marks[phase]).toBeUndefined()
  expect(inbox.commentList.waiting.map((comment) => comment.id)).toEqual(ids)
})

test("phase-body --plan ... --accepted writes the plan ACCEPTED:  no waiting, no planning spinner;  without, it waits", async () => {
  withPhases()
  const owner = commands()
  const working = () => Object.keys(ReviewInbox.read(inboxFile).working)
  expect(await owner.run(["phase-body", "x", "P2", "--goal", "<ul><li>fresh</li></ul>"])).toBe(0)
  expect(working()).toEqual(["p-docs"])
  expect(await owner.run(["phase-body", "x", "P2", "--plan", "<ol><li>Folded in.</li></ol>", "--accepted"])).toBe(0)
  expect(working()).toEqual([])
  const after = PlanDoc.parse(readFileSync(file, "utf8"))
  expect(after.phase(2).getAttribute("plan")).toBe("accepted")
  expect(after.phase(2).querySelector('epic-field[name="plan"]')!.hasAttribute("accepted")).toBe(true)
  expect(after.toString()).toMatch(/P2 plan written: +accepted, the person's comments folded in/)
  expect(await owner.run(["phase-body", "x", "P1", "--plan", "<ol><li>Waits.</li></ol>"])).toBe(0)
  expect(PlanDoc.parse(readFileSync(file, "utf8")).phase(1).getAttribute("plan")).toBe("waiting")
})
