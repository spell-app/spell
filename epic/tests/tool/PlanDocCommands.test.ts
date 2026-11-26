/**
 * Tests of `PlanDocCommands` (the `epic` tool in its own order, `epic <verb>`'s) on a scratch checkout:  the command line itself, its flags,
 * output and log lines, on a doc written as a real one is (linked, formatted, split).
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { EpicProgram } from "spell/epic/cli/EpicProgram"
import { VERB_FLAGS } from "spell/epic/cli/epicGroups"
import { planDocArgs } from "spell/epic/command/epicArgs"
import { Markup } from "spell/epic/markup"
import { PhaseIds } from "spell/epic/phases"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands, movedDown } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { PlanItem } from "spell/epic/tool/PlanItem"
import { ShortTitle } from "spell/epic/tool/planDoc.types"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { TitleReader, type TitleRequest, type TitleVerdict } from "spell/epic/tool/TitleReader"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "plan-doc-commands-"))
const file = join(root, "epics", "x", "x.plan.html")
const parts = join(root, "epics", "x", "parts")
const FILES = new PlanDocFiles({ root })

/** What the commands printed, on stdout and stderr. */
let printed: string[]
let warned: string[]

/** What the phase timer was asked (`phaseTimer`), and the minutes it answers. */
let timed: { epic: string; phase: string; window: { from: number; to: number } }[]
let timerMinutes = 0

/**
 * The commands, on the scratch checkout, their output caught in `printed` / `warned`;  a phase's time is
 * `timerMinutes`, never the real transcripts'.
 */
function commands() {
  const phaseTimer = (request: (typeof timed)[number]) => {
    timed.push(request)
    return timerMinutes
  }
  const owner = new PlanDocCommands({ files: FILES, phaseTimer })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
  vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
  return owner
}

beforeEach(async () => {
  printed = []
  warned = []
  timed = []
  timerMinutes = 0
  rmSync(join(root, "epics"), { recursive: true, force: true })
  mkdirSync(join(root, "epics", "x"), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  for (const name of ["One", "Two", "Three"]) plan.addPhase(name, { goal: `<ul><li>${name}'s goal</li></ul>` })
  plan.setPhase(1, "done")
  await FILES.writeDoc(file, plan, true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

// epic `epic-engine` P41:  how long Claude worked on a phase, beside its estimate
describe("PlanDocCommands phase … done / took", () => {
  test("done:  the time since it went active, as `took`;  logged;  the Overview's total says it", async () => {
    expect(await commands().run(["estimate", "x", "2", "3-4h"])).toBe(0)
    expect(await commands().run(["phase", "x", "2", "active", "--no-open"])).toBe(0)
    timerMinutes = 21
    expect(await commands().run(["phase", "x", "2", "done", "--no-open"])).toBe(0)
    expect(timed).toHaveLength(1)
    expect(timed[0]).toMatchObject({ epic: "x", phase: "P2" })
    expect(timed[0]!.window.to - timed[0]!.window.from).toBeLessThan(2 * 60_000)
    const plan = FILES.read(file)
    expect(plan.phase(2).getAttribute("took")).toBe("21m")
    const last = Array.from(plan.document.querySelectorAll("#log > epic-event")).at(-1)!
    expect(last.textContent!.replace(/\s+/g, " ")).toBe("P2 done: took 21m")
    // its clock time is under a minute here, so `/ 1m` or nothing, as the clock ticks over
    expect(plan.estimate).toMatch(
      /^3h-4h in all, 0m left \(P1, P3 not estimated\);  1 done took 21m( \/ 1m)?, estimated 3h-4h$/
    )
  })

  test("done with no time found, or never logged active:  no `took`", async () => {
    expect(await commands().run(["phase", "x", "3", "done", "--no-open"])).toBe(0)
    expect(timed).toEqual([])
    expect(FILES.read(file).phase(3).hasAttribute("took")).toBe(false)
  })

  test("took:  a done phase's time worked out again, from its active to its done;  --dry-run writes nothing", async () => {
    expect(await commands().run(["phase", "x", "2", "active", "--no-open"])).toBe(0)
    expect(await commands().run(["phase", "x", "2", "done", "--no-open"])).toBe(0)
    timerMinutes = 58
    expect(await commands().run(["phase", "x", "2", "took", "--dry-run"])).toBe(0)
    expect(FILES.read(file).phase(2).hasAttribute("took")).toBe(false)
    expect(await commands().run(["phase", "x", "2", "took"])).toBe(0)
    expect(printed).toEqual(["P2 took 58m  (dry run:  not written)", "P2 took 58m"])
    expect(FILES.read(file).phase(2).getAttribute("took")).toBe("58m")
    // not done, or never active:  says why
    expect(await commands().run(["phase", "x", "3", "took"])).toBe(1)
    expect(warned.at(-1)).toBe("epic:  took:  P3 isn't done yet")
    expect(await commands().run(["phase", "x", "1", "took"])).toBe(1)
    expect(warned.at(-1)).toBe("epic:  took:  the log doesn't say when P1 was active, and done")
  })
})

// epic `epic-engine` P52 (Q56 C):  the page shows only the Log's commits;  `epic log` prints the review lines
describe("PlanDocCommands log", () => {
  test("no text:  the newest review lines, newest last, as `<time>  <text>`;  --last <n>;  a commit is none", async () => {
    for (const line of ["one", "two", "three"]) expect(await commands().run(["log", "x", line])).toBe(0)
    await FILES.edit(file, (plan) =>
      plan.logCommit(
        { sha: "a".repeat(40), subject: "x P1:  One -- built", time: "2026-10-20T12:00:00-04:00" },
        {
          sentence: "built",
          refs: []
        }
      )
    )
    printed = []
    expect(await commands().run(["log", "x", "--last", "2"])).toBe(0)
    expect(printed).toHaveLength(2)
    expect(printed.map((line) => line.replace(/^\d{4}-\d\d-\d\d \d\d:\d\d  /, ""))).toEqual(["two", "three"])
    printed = []
    expect(await commands().run(["log", "x"])).toBe(0)
    expect(printed.at(-1)).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d  three$/)
    expect(printed.join("\n")).not.toMatch(/built/)
    expect(await commands().run(["log", "x", "--last", "none"])).toBe(1)
  })
})

describe("PlanDocCommands add-phase --before", () => {
  test("inserts the phase, logs what moved;  ids stay, so every part file stays where it is", async () => {
    expect(await commands().run(["add-phase", "x", "Inserted", "--before", "2"])).toBe(0)
    expect(printed).toEqual(["P2"])
    const plan = FILES.read(file)
    expect(plan.phases.map((phase) => `${phase.n} ${phase.name}`)).toEqual(["1 One", "2 Inserted", "3 Two", "4 Three"])
    const last = Array.from(plan.document.querySelectorAll("#log > epic-event")).at(-1)!
    // whitespace squeezed:  the written page's formatter folds the double spaces
    expect(last.textContent!.replace(/\s+/g, " ")).toBe("P2 added: Inserted; P2-P3 moved down to P3-P4")
    const three = plan.phases.at(-1)!
    expect(movedDown([{ ...three, number: "3" }], plan.phases)).toBe("P3 · Three moved down to P4")
    expect(movedDown(plan.phases, plan.phases)).toBe("")
    // each part under its phase's stable id:  the inserted one's beside them, nothing moved
    expect(
      readdirSync(parts)
        .filter((name) => /^p-/.test(name))
        .sort()
    ).toEqual(["p-inserted.html", "p-one.html", "p-three.html", "p-two.html"])
    expect(readFileSync(join(parts, "p-three.html"), "utf8")).toMatch(/#p-three's body[\s\S]*Three's goal/)
    expect(readFileSync(join(parts, "p-inserted.html"), "utf8")).toContain("TBD")
    expect(readFileSync(file, "utf8")).toMatch(
      /<epic-phase\s+id="p-three"\s+title="Three"[^>]*source="parts\/p-three.html"/
    )
    // by its name too
    expect(await commands().run(["add-phase", "x", "Second Insert", "--before", "three"])).toBe(0)
    expect(FILES.read(file).phases.map((phase) => phase.id)).toEqual([
      "p-one",
      "p-inserted",
      "p-two",
      "p-second-insert",
      "p-three"
    ])
  })

  // epic `epic-engine` I126:  `--after 1` adds a WHOLE P2, the to-do phases after it moving down (P39 made P1.1)
  test("--after:  the next whole number, printed and logged;  the phases after it renumbered", async () => {
    expect(await commands().run(["add-phase", "x", "Notebook", "--after", "1"])).toBe(0)
    expect(await commands().run(["add-phase", "x", "Reassess", "--after", "P2"])).toBe(0)
    expect(printed).toEqual(["P2", "P3"])
    const plan = FILES.read(file)
    expect(plan.phases.map((phase) => `P${phase.number} ${phase.name}`)).toEqual([
      "P1 One",
      "P2 Notebook",
      "P3 Reassess",
      "P4 Two",
      "P5 Three"
    ])
    expect(plan.phaseElements.some((phase) => phase.hasAttribute("number"))).toBe(false)
    const last = Array.from(plan.document.querySelectorAll("#log > epic-event")).at(-1)!
    expect(last.textContent!.replace(/\s+/g, " ")).toBe("P3 added: Reassess; P3-P4 moved down to P4-P5")
    // a title naming markup, quotes and all, written to the file and read back
    const title = `a <ui-menu direction="vertical"> & a right click's`
    expect(await commands().run(["add", "x", "judgement", title])).toBe(0)
    const written = readFileSync(file, "utf8")
    expect(written).not.toContain("<ui-menu")
    expect(FILES.read(file).document.getElementById(printed.at(-1)!.toLowerCase())!.getAttribute("title")).toBe(title)
  })

  // epic `epic-engine` I1 (epic-workflow's I7):  the inbox keys a phase by its STABLE id, so an insert moves nothing
  test("a comment, mark and draft on P10 are on P11 after add-phase --before 10:  the inbox is left as it was", async () => {
    const plan = FILES.read(file)
    for (const name of ["Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]) plan.addPhase(name)
    await FILES.writeDoc(file, plan, true)
    const ten = FILES.read(file).phase(10).id
    expect(ten).toBe("p-ten")
    const inboxFile = ReviewInbox.pathFor(file)
    ReviewInbox.update(inboxFile, (inbox) => {
      inbox.commentList.add({ anchor: `${ten}#field-1`, kind: "field", label: "Ten", excerpt: "TBD" }, "wrong phase?")
      inbox.setMark(ten, { action: "approve" })
      inbox.setDraft(ten, "revisit", "half a note")
    })
    const inboxBefore = readFileSync(inboxFile, "utf8")
    expect(await commands().run(["add-phase", "x", "Inserted", "--before", "10"])).toBe(0)
    expect(readFileSync(inboxFile, "utf8")).toBe(inboxBefore)
    const after = FILES.read(file)
    const { comments, marks, drafts } = ReviewInbox.read(inboxFile).toRecord()
    const [comment] = Object.values(comments)
    for (const key of [comment!.anchor.split("#")[0]!, ...Object.keys(marks), ...Object.keys(drafts)]) {
      const phase = after.document.getElementById(key)!
      expect(`${PhaseIds.labelOf(phase)} · ${PhaseIds.titleOf(phase)}`).toBe("P11 · Ten")
    }
    expect(PhaseIds.titleOf(after.phase(10))).toBe("Inserted")
  })

  test("refuses a bare --before, a phase that isn't there, or a started phase, writing nothing", async () => {
    const skeleton = readFileSync(file, "utf8")
    const owner = commands()
    expect(await owner.run(["add-phase", "x", "Y", "--before"])).toBe(1)
    expect(await owner.run(["add-phase", "x", "Y", "--before", "nine"])).toBe(1)
    expect(await owner.run(["add-phase", "x", "Y", "--before", "1"])).toBe(1)
    expect(warned).toEqual([
      "epic:  --before needs a phase (its number, or its name)",
      'epic:  no phase "nine" in the doc (P1-P3, or a phase\'s name)',
      "epic:  --before 1:  P1 has started;  only to-do phases move down"
    ])
    expect(readFileSync(file, "utf8")).toBe(skeleton)
  })
})

// epic `epic-engine` T169:  `epic phase <epic>#P5 remove`
describe("PlanDocCommands phase remove:  a phase never started off the page", () => {
  test("removes a to-do phase, the ones after it up a number;  refuses a started one, writing nothing", async () => {
    const plan = FILES.read(file)
    for (const name of ["Four", "Five"]) plan.addPhase(name)
    await FILES.writeDoc(file, plan, true)
    const owner = commands()
    expect(await owner.run(["phase", "x", "4", "remove"])).toBe(0)
    expect(printed.at(-1)).toBe("P4 Four removed")
    expect(
      FILES.read(file)
        .phases.map((phase) => `P${phase.number} ${phase.name}`)
        .slice(-2)
    ).toEqual(["P3 Three", "P4 Five"])
    const skeleton = readFileSync(file, "utf8")
    expect(await owner.run(["phase", "x", "1", "remove"])).toBe(1)
    expect(warned.at(-1)).toMatch(/^epic:  remove P1 .*only a phase not started is removed/)
    expect(readFileSync(file, "utf8")).toBe(skeleton)
  })
})

// epic `epic-engine` I174:  `epic update <epic>#M3 --failed I12`, the session filing a failed test itself
describe("PlanDocCommands failed:  a manual test marked failed, filed as an issue;  off, or closing it, clears it", () => {
  test("writes `failed`, reopens it, a Noted card linking the issue, logged;  off and close take it off", async () => {
    const owner = commands()
    await owner.run(["add", "x", "test", "Send wakes the session", "--step", "Press Send", "--should", "It wakes"])
    await owner.run(["add", "x", "issue", "M1 failed:  Send wakes the session"])
    const [test, issue] = printed
    printed = []
    await owner.run(["close", "x", test])
    printed = []
    expect(await owner.run(["failed", "x", test, issue])).toBe(0)
    expect(printed).toEqual([`${test} failed -> ${issue}:  Send wakes the session`])
    const plan = FILES.read(file)
    const item = plan.item(test)
    expect([item.getAttribute("status"), item.getAttribute("failed")]).toEqual(["open", issue.toLowerCase()])
    expect(item.querySelector(`epic-status a[href="#${issue.toLowerCase()}"]`)?.textContent).toBe(issue)
    const log = Array.from(plan.document.querySelectorAll("#log > epic-event"), (each) => each.textContent!)
    expect(log.at(-1)!.replace(/\s+/g, " ")).toBe(`${test} failed -> ${issue}: Send wakes the session`)

    printed = []
    expect(await owner.run(["failed", "x", test, "off"])).toBe(0)
    expect(printed).toEqual([`${test} no longer marked failed:  Send wakes the session`])
    expect(FILES.read(file).item(test).hasAttribute("failed")).toBe(false)

    // tried again once fixed, and it passed:  closing it takes the mark off
    await owner.run(["failed", "x", test, issue])
    await owner.run(["close", "x", test])
    const closed = FILES.read(file).item(test)
    expect([closed.getAttribute("status"), closed.hasAttribute("failed")]).toEqual(["done", false])
  })

  test("refuses an item that isn't a test, an id that isn't an issue, or one the doc doesn't have", async () => {
    const owner = commands()
    await owner.run(["add", "x", "test", "A test", "--step", "Do it", "--should", "It works"])
    await owner.run(["add", "x", "todo", "A todo"])
    const [test, todo] = printed
    const doc = readFileSync(file, "utf8")
    expect(await owner.run(["failed", "x", test])).toBe(1)
    expect(await owner.run(["failed", "x", todo, "i1"])).toBe(1)
    expect(await owner.run(["failed", "x", test, todo])).toBe(1)
    expect(await owner.run(["failed", "x", test, "i99"])).toBe(1)
    expect(warned.slice(-3)).toEqual([
      `epic:  ${todo} isn't a manual test:  only a test is marked failed`,
      `epic:  ${todo} isn't an issue:  a failed test is filed as one (I12)`,
      'epic:  no item "i99"'
    ])
    expect(readFileSync(file, "utf8")).toBe(doc)
  })
})

describe("PlanDocCommands calm:  an existing call or issue not urgent, or urgent again (--loud)", () => {
  test("sets `calm` on each id, prints and logs what it did, and says so when it already was", async () => {
    const owner = commands()
    await owner.run(["add", "x", "judgement", "A call"])
    await owner.run(["add", "x", "issue", "An issue"])
    const [call, issue] = printed
    printed = []
    expect(await owner.run(["calm", "x", call, issue.toLowerCase()])).toBe(0)
    expect(printed).toEqual([`${call} not urgent:  A call\n${issue} not urgent:  An issue`])
    const plan = FILES.read(file)
    expect(plan.item(call).hasAttribute("calm")).toBe(true)
    expect(plan.itemState(plan.item(issue))).toBe("open")
    const log = Array.from(plan.document.querySelectorAll("#log > epic-event"), (each) => each.textContent!)
    expect(log.at(-1)!.replace(/\s+/g, " ")).toBe(`${issue} not urgent: An issue`)

    printed = []
    expect(await owner.run(["calm", "x", call])).toBe(0)
    expect(printed).toEqual([`${call} not urgent already:  A call`])
    expect(await owner.run(["calm", "x", call, "--loud"])).toBe(0)
    const loud = FILES.read(file)
    expect(loud.item(call).hasAttribute("calm")).toBe(false)
    expect(loud.itemState(loud.item(call))).toBe("attention")
  })

  test("an issue Claude found and fixed itself is grey;  one reviewed, or not calm, stays green (I236)", async () => {
    const owner = commands()
    await owner.run(["add", "x", "issue", "Quiet"])
    await owner.run(["add", "x", "issue", "Loud"])
    const [quiet, loud] = printed
    await owner.run(["calm", "x", quiet])
    await owner.run(["close", "x", quiet, loud])
    const plan = FILES.read(file)
    expect(plan.itemState(plan.item(quiet))).toBe("handled")
    expect(plan.itemState(plan.item(loud))).toBe("recent")
    plan.item(quiet).setAttribute("reviewed", "2026-11-08")
    expect(plan.itemState(plan.item(quiet))).toBe("recent")
  })

  test("closing or canceling an item takes its working flag off (I280);  another item's stays", async () => {
    const owner = commands()
    for (const title of ["One", "Two", "Three"]) await owner.run(["add", "x", "todo", title])
    const [one, two, three] = printed
    const inbox = ReviewInbox.pathFor(file)
    ReviewInbox.update(inbox, (box) => {
      for (const id of [one, two, three]) box.setWorking(id, "details")
    })
    await owner.run(["close", "x", one])
    await owner.run(["cancel", "x", two])
    expect(Object.keys(ReviewInbox.read(inbox).working)).toEqual([three.toLowerCase()])
  })

  test("refuses no id, an id the doc doesn't have, or an item that's never urgent (a limit, a question), writing nothing", async () => {
    const owner = commands()
    await owner.run(["add", "x", "todo", "A limit", "--limit"])
    await owner.run(["add", "x", "question", "Which?"])
    const doc = readFileSync(file, "utf8")
    expect(await owner.run(["calm", "x"])).toBe(1)
    expect(await owner.run(["calm", "x", "j99"])).toBe(1)
    expect(await owner.run(["calm", "x", printed[0], "--loud"])).toBe(1)
    expect(await owner.run(["calm", "x", printed[1], "--loud"])).toBe(1)
    expect(readFileSync(file, "utf8")).toBe(doc)
  })

  test("a plain todo flagged red as a reminder (T94):  --loud makes it urgent, red even once reviewed;  --calm takes it back", async () => {
    const owner = commands()
    await owner.run(["add", "x", "todo", "Rethink id and name"])
    const [todo] = printed
    printed = []
    expect(await owner.run(["calm", "x", todo])).toBe(0)
    expect(printed).toEqual([`${todo} not urgent already:  Rethink id and name`])
    await FILES.edit(file, (plan) => plan.review(todo))
    expect(await owner.run(["calm", "x", todo, "--loud"])).toBe(0)
    const loud = FILES.read(file)
    expect(loud.item(todo).hasAttribute("urgent")).toBe(true)
    expect(loud.item(todo).hasAttribute("reviewed")).toBe(false)
    expect(loud.itemState(loud.item(todo))).toBe("attention")
    expect(await owner.run(["calm", "x", todo, "--loud"])).toBe(0)
    expect(printed.at(-1)).toBe(`${todo} urgent already:  Rethink id and name`)
    expect(await owner.run(["calm", "x", todo])).toBe(0)
    const calm = FILES.read(file)
    expect(calm.itemState(calm.item(todo))).toBe("open")
  })

  test("add #T --loud (T94):  a new todo red at once;  --loud on another kind is refused", async () => {
    const owner = commands()
    expect(await owner.run(["add", "x", "todo", "Think tomorrow", "--loud"])).toBe(0)
    const plan = FILES.read(file)
    expect(plan.itemState(plan.item(printed[0]))).toBe("attention")
    expect(await owner.run(["add", "x", "issue", "An issue", "--loud"])).toBe(1)
  })
})

describe("PlanDocCommands choose:  an option Owen settled in conversation, on any item", () => {
  test("chooses on the latest card set (or --set N), prints what it did;  the doc written keeps it", async () => {
    const owner = commands()
    const options = (...letters: string[]) =>
      `<epic-choices>${letters.map((letter) => `<epic-option letter="${letter}" title="Way ${letter}"></epic-option>`).join("")}</epic-choices>`
    await owner.run(["add", "x", "judgement", "A call", "--details", `<p>two ways</p>${options("A", "B")}`])
    const reply = `<epic-reply from="Claude" at="2026-10-01 09:20"><p>or:</p>${options("A", "B", "C")}</epic-reply>`
    writeFileSync(join(root, "reply.html"), reply)
    await owner.run(["details", "x", "j1", "--append", "--file", join(root, "reply.html")])
    printed = []
    expect(await owner.run(["choose", "x", "J1", "c", "Owen:  'C, please';  built"])).toBe(0)
    expect(printed).toEqual(["J1 Owen picked C:  Way C (a reply's options);  approved:  closed (accepted)"])
    const plan = FILES.read(file)
    const sets = Array.from(plan.item("j1").querySelectorAll("epic-choices"), (set) => set.getAttribute("chosen"))
    expect([plan.item("j1").getAttribute("status"), sets]).toEqual(["done", [null, "C"]])
    // the outcome on the set, no Noted card (I153)
    expect(plan.item("j1").querySelectorAll("epic-choices")[1]!.getAttribute("chosen-note")).toBe(
      "recorded, the call accepted;  Owen:  'C, please';  built"
    )
    expect(plan.item("j1").querySelector("epic-status")).toBeNull()

    await owner.run(["add", "x", "question", "Which?", "--details", `<p>why</p>${options("A", "B")}`])
    expect(await owner.run(["choose", "x", "q1", "B", "--set", "1"])).toBe(0)
    expect(FILES.read(file).item("q1").querySelector(":scope > epic-answer")!.getAttribute("title")).toBe("Way B")
  })

  test("refuses no letter, or an option the item hasn't, writing nothing", async () => {
    const owner = commands()
    await owner.run(["add", "x", "issue", "An issue"])
    const doc = readFileSync(file, "utf8")
    expect(await owner.run(["choose", "x", "i1"])).toBe(1)
    expect(await owner.run(["choose", "x", "i1", "A"])).toBe(1)
    expect(warned.at(-1)).toBe("epic:  I1 has no option cards to choose from")
    expect(readFileSync(file, "utf8")).toBe(doc)
  })
})

// epic `epic-engine` P50
describe("PlanDocCommands option sets:  choose several, option add | edit | remove | close, #choices, --choices", () => {
  const options = (...letters: string[]) =>
    letters
      .map((letter) => `<epic-option letter="${letter}" title="Way ${letter}"><p>${letter}</p></epic-option>`)
      .join("")

  test("choose several letters in a pick-any set;  refused in a pick-one set, writing nothing", async () => {
    const owner = commands()
    await owner.run([
      "add",
      "x",
      "question",
      "Which?",
      "--details",
      `<p>why</p><epic-choices multiple>${options("A", "B", "C")}</epic-choices>`
    ])
    await owner.run([
      "add",
      "x",
      "question",
      "One?",
      "--details",
      `<p>why</p><epic-choices>${options("A", "B")}</epic-choices>`
    ])
    printed = []
    expect(await owner.run(["choose", "x", "Q1", "A", "c", "both, Owen said"])).toBe(0)
    expect(printed).toEqual(["Q1 picked A · Way A, C · Way C"])
    const plan = FILES.read(file)
    expect(plan.item("q1").querySelector("epic-choices")!.getAttribute("chosen")).toBe("A C")
    expect(plan.item("q1").getAttribute("status")).toBe("decided")
    const doc = readFileSync(file, "utf8")
    expect(await owner.run(["choose", "x", "Q2", "A,B"])).toBe(1)
    expect(warned.at(-1)).toBe("epic:  Q2:  a pick-one set takes one letter, not A B")
    expect(readFileSync(file, "utf8")).toBe(doc)
  })

  test("option add | edit | remove | close;  --choices into a phase;  a standing set by #choices", async () => {
    const owner = commands()
    await owner.run([
      "add",
      "x",
      "question",
      "Which?",
      "--details",
      `<p>why</p><epic-choices>${options("A", "B")}</epic-choices>`
    ])
    printed = []
    expect(await owner.run(["option", "x", "add", "Q1", "Neither", "skip it"])).toBe(0)
    expect(await owner.run(["option", "x", "edit", "Q1", "A", "--note", "<p>new</p>"])).toBe(0)
    expect(await owner.run(["option", "x", "remove", "Q1", "B"])).toBe(0)
    expect(await owner.run(["option", "x", "close", "Q1"])).toBe(0)
    expect(printed).toEqual([
      "Q1 option C:  Neither",
      "Q1 option A edited",
      "Q1 option B removed:  Way B",
      "Q1 option set closed"
    ])
    expect(await owner.run(["option", "x", "add", "Q1", "More"])).toBe(1)
    expect(await owner.run(["option", "x", "bogus", "Q1"])).toBe(1)

    expect(
      await owner.run(["phase-body", "x", "2", "--choices", `<epic-choices>${options("A", "B")}</epic-choices>`])
    ).toBe(0)
    let plan = FILES.read(file)
    expect(plan.phase(2).querySelector(':scope > epic-field[name="choices"] > epic-choices')).not.toBeNull()
    expect(plan.phase(2).getAttribute("choices-open")).toBe("1")
    expect(await owner.run(["choose", "x", "P2", "B"])).toBe(0)
    expect(FILES.read(file).phase(2).hasAttribute("choices-open")).toBe(false)

    printed = []
    expect(await owner.run(["add", "x", "choices", "Upgrades on offer", "--multiple"])).toBe(0)
    expect(await owner.run(["option", "x", "add", "s-upgrades-on-offer", "Dark mode"])).toBe(0)
    expect(printed).toEqual(["s-upgrades-on-offer", "S-UPGRADES-ON-OFFER option A:  Dark mode"])
    plan = FILES.read(file)
    const section = plan.document.querySelector('epic-page > epic-section[kind="choices"]')!
    expect(section.nextElementSibling!.getAttribute("kind")).toBe("phases")
    printed = []
    expect(await owner.run(["summary", "x"])).toBe(0)
    expect(printed[0]).toContain("choices:  1 set open, 1 option")
    // the markup checks clean (`epic lint`'s structure check;  its browser check needs the page server)
    expect(Markup.validate(plan.document).map((problem) => problem.message)).toEqual([])
  })
})

// epic `repo-split` J141
describe("PlanDocCommands summarize:  an item condensed from a file, the rest folded into its history", () => {
  test("replaces what it shows, keeps the rest in its Original Discussion, logs it, prints what moved", async () => {
    const owner = commands()
    await owner.run(["add", "x", "issue", "It breaks", "--details", "<p>long</p><p>longer</p>"])
    writeFileSync(
      join(root, "reply.html"),
      '<epic-reply from="Claude" at="2026-10-01 09:20"><p>and more</p></epic-reply>'
    )
    await owner.run(["details", "x", "i1", "--append", "--file", join(root, "reply.html")])
    writeFileSync(join(root, "condensed.html"), "<p>It breaks on Safari.</p>")
    printed = []
    expect(await owner.run(["summarize", "x", "i1", "--file", join(root, "condensed.html")])).toBe(0)
    expect(printed).toEqual(["I1 condensed:  It breaks (3 blocks into its Original Discussion)"])
    const item = FILES.read(file).item("i1")
    expect(item.querySelector(":scope > p")!.textContent).toBe("It breaks on Safari.")
    expect(item.querySelector(":scope > epic-original")!.textContent).toMatch(/long[\s\S]*and more/)
  })

  test("refuses no --file, or an item with nothing to condense, writing nothing", async () => {
    const owner = commands()
    await owner.run(["add", "x", "issue", "It breaks"])
    const doc = readFileSync(file, "utf8")
    expect(await owner.run(["summarize", "x", "i1"])).toBe(1)
    writeFileSync(join(root, "condensed.html"), "<p>Fixed.</p>")
    expect(await owner.run(["summarize", "x", "i1", "--file", join(root, "condensed.html")])).toBe(1)
    expect(warned.at(-1)).toMatch(/I1:  nothing to condense/)
    expect(readFileSync(file, "utf8")).toBe(doc)
  })
})

describe("PlanDocCommands add --details:  a name and its path", () => {
  test("works in a repo with no `packages/` (spell-epic's own, epic `epic-engine` I14):  a bare name looked up", async () => {
    rmSync(join(root, "packages"), { recursive: true, force: true })
    const details = "<p>In <code>nowhere.ts</code>, and <code>zz/missing.ts</code>.</p>"
    expect(await commands().run(["add", "x", "issue", "No packages", "--details", details])).toBe(0)
    const part = readdirSync(parts).find((name) => /^i\d+\.html$/.test(name))!
    expect(readFileSync(join(parts, part), "utf8")).toContain("<code>nowhere.ts</code>")
  })

  test("written as the name, its path its tooltip, linked to the file (epic `airplane`)", async () => {
    mkdirSync(join(root, "packages", "x", "src"), { recursive: true })
    writeFileSync(join(root, "packages", "x", "src", "buildTsx.ts"), "export {}\n")
    const details = "<p>Built:  <code>buildTsx()</code>, <code>packages/x/src/buildTsx.ts:4</code></p>"
    expect(await commands().run(["add", "x", "judgement", "Built it", "--details", details])).toBe(0)
    const part = readdirSync(parts).find((name) => /^j\d+\.html$/.test(name))!
    expect(readFileSync(join(parts, part), "utf8")).toMatch(
      /<a href="\/packages\/x\/src\/buildTsx\.ts" target="src-packages-x-src-buildtsx-ts"\s*>\s*<code title="packages\/x\/src\/buildTsx\.ts:4">buildTsx\(\)<\/code\s*>\s*<\/a\s*>/
    )
  })
})

// epic `epic-engine` I321, I322:  a title is at most 30 plain words, one sentence, read cold
describe("PlanDocCommands:  short titles", () => {
  const LONG =
    "epic init puts the stand-aside words into the repo's AGENTS.md only when it finds superpowers on, and " +
    "otherwise it asks nothing at all, and a flag writes them in without asking anyone first"

  test("add refuses a title over 30 words, a ';' list or two sentences, asking for it rewritten;  writing nothing", async () => {
    const skeleton = readFileSync(file, "utf8")
    expect(await commands().run(["add", "x", "judgement", LONG, "--calm"])).toBe(1)
    expect(await commands().run(["add", "x", "todo", "Retry it;  then tell them"])).toBe(1)
    expect(await commands().run(["add", "x", "issue", "The turn was stuck. It hung for a minute"])).toBe(1)
    expect(warned[0]).toMatch(/^epic:  rewrite this title:  it's 33 words \(the most is 30\)\./)
    expect(warned[0]).toContain("read cold, hours later")
    expect(warned[0]).toContain("the rest goes in --details")
    expect(warned[1]).toContain('it runs on, a list after ";"')
    expect(warned[2]).toContain("it's more than one sentence")
    expect(readFileSync(file, "utf8")).toBe(skeleton)
  })

  test("add takes 30 words, a dash, and an e.g.", async () => {
    const thirty = Array.from({ length: 30 }, (_, n) => `word${n}`).join(" ")
    expect(await commands().run(["add", "x", "todo", thirty])).toBe(0)
    expect(await commands().run(["add", "x", "todo", "Titles -- up to 30 words, e.g. Owen's own"])).toBe(0)
  })

  test(`add takes "Nothing you'd see." as a second sentence (T123)`, async () => {
    const title = "Each session's background listener now uses 48 MB instead of 188 MB. Nothing you'd see."
    expect(await commands().run(["add", "x", "todo", title])).toBe(0)
  })

  test("rename refuses a long title too, and leaves the body as it was", async () => {
    await FILES.edit(file, (plan) => plan.addItem("judgement", LONG, { details: "<p>Why:  it was asked.</p>" }))
    expect(await commands().run(["rename", "x", "J1", LONG])).toBe(1)
    expect(warned.at(-1)).toMatch(/rewrite this title/)

    printed = []
    expect(await commands().run(["rename", "x", "J1", "Superpowers words in AGENTS.md"])).toBe(0)
    const item = FILES.read(file).item("j1")
    expect(PlanItem.titleOf(item)).toBe("Superpowers words in AGENTS.md")
    expect(item.textContent).not.toContain("only when it finds superpowers")
    expect(item.textContent).toContain("it was asked")
  })
})

// epic `epic-engine` I339:  a status card in short paragraphs or bullets, one idea each
describe("PlanDocCommands:  card text", () => {
  const RUN_ON = Array.from({ length: 60 }, (_, n) => `word${n}`).join(" ")

  /** The blocks of item `id`'s last status card, as tag:text. */
  function cardBlocks(id: string): string[] {
    const card = Array.from(FILES.read(file).item(id).querySelectorAll(":scope > epic-status")).at(-1)!
    return Array.from(card.children, (block) => `${block.localName}:${block.textContent!.replace(/\s+/g, " ").trim()}`)
  }

  test("a blank line starts a paragraph, '- ' lines are bullets, a shell's \\n counts", async () => {
    await FILES.edit(file, (plan) => plan.addItem("issue", "Cards run on"))
    const text = "Fixed the cards.\\n\\nWhat changed:\\n- paragraphs\\n- bullets"
    expect(await commands().run(["status", "x", "i1", "fixed", text])).toBe(0)
    const blocks = FILES.read(file).item("i1").querySelector(":scope > epic-status")!
    expect(Array.from(blocks.children, (block) => block.localName)).toEqual(["p", "p", "ul"])
    expect(blocks.querySelectorAll("li")).toHaveLength(2)
  })

  test("a run-in '(1) … (2) …' becomes a numbered list under its lead", async () => {
    await FILES.edit(file, (plan) => plan.addItem("issue", "Run-in list"))
    expect(await commands().run(["status", "x", "i1", "fixed", "Merged. (1) names fixed (2) lines found"])).toBe(0)
    expect(cardBlocks("i1")).toEqual(["p:Merged.", "ol:names fixed lines found"])
  })

  test("one paragraph over 50 words is refused, saying how to break it up;  writing nothing", async () => {
    await FILES.edit(file, (plan) => plan.addItem("issue", "Too dense"))
    const before = readFileSync(file, "utf8")
    expect(await commands().run(["status", "x", "i1", "fixed", RUN_ON])).toBe(1)
    expect(warned[0]).toMatch(/break this card up:  a paragraph of 60 words runs on \(the most is 50\)/)
    expect(warned[0]).toContain("the full story goes in the item's body")
    expect(readFileSync(file, "utf8")).toBe(before)
  })

  test("--file takes a long card, in blocks of its own", async () => {
    await FILES.edit(file, (plan) => plan.addItem("issue", "From a file"))
    const card = join(root, "card.html")
    writeFileSync(card, "<p>Done.</p><ul><li>one</li><li>two</li></ul>")
    expect(await commands().run(["status", "x", "i1", "fixed", "--file", card])).toBe(0)
    expect(cardBlocks("i1")).toEqual(["p:Done.", "ul:one two"])
  })
})

describe("PlanDocCommands rename:  a phase's or an item's title (epic `epic-workflow`)", () => {
  test("retitles it, rewrites the links saying the old title, prints and logs what it did", async () => {
    const owner = commands()
    await owner.run(["add", "x", "todo", "Linked", "--details", '<p><a href="#p-two">P2 · Two</a></p>'])
    printed = []
    expect(await owner.run(["rename", "x", "p2", "Second"])).toBe(0)
    expect(printed).toEqual(['P2 · Second (was "Two";  1 link rewritten)'])
    // its id stays the one made from its first name
    expect(readFileSync(file, "utf8")).toMatch(/<epic-phase\s+id="p-two"\s+title="Second"/)
    const plan = FILES.read(file)
    expect(plan.document.querySelector('a[href="#p-two"]')!.textContent).toBe("P2 · Second")
    const last = Array.from(plan.document.querySelectorAll("#log > epic-event")).at(-1)!
    expect(last.textContent!.replace(/\s+/g, " ")).toBe('P2 renamed: "Two" -> "Second" (1 link)')

    printed = []
    expect(await owner.run(["rename", "x", "T1", "<code>Linked</code> todo", "--html"])).toBe(0)
    expect(printed).toEqual(['T1 · Linked todo (was "Linked")'])
    expect(FILES.read(file).item("t1").querySelector(':scope > [slot="title"] > code')!.textContent).toBe("Linked")
  })

  test("refuses no title, or no such phase, writing nothing", async () => {
    const owner = commands()
    const skeleton = readFileSync(file, "utf8")
    expect(await owner.run(["rename", "x", "p2"])).toBe(1)
    expect(await owner.run(["rename", "x", "p7", "Seven"])).toBe(1)
    expect(warned[0]).toMatch(/^epic:  missing the new title/)
    expect(warned[1]).toBe("epic:  no phase P7 in the doc (P1-P3, or a phase's name)")
    expect(readFileSync(file, "utf8")).toBe(skeleton)
  })
})

// epic `epic-engine` P29, Q15:  new epics start in the Overview stage;  `epic stage` sets it by hand
describe("PlanDocCommands stage", () => {
  test("create --stage overview starts a new epic in the Overview stage (opt-in until P33);  none:  building", async () => {
    expect(FILES.read(file).stage).toBe("building")
    // no docs home in the scratch checkout to list it on
    vi.spyOn(FILES, "reindex").mockImplementation(() => undefined)
    expect(await commands().run(["create", "fresh", "--title", "Fresh", "--stage", "overview"])).toBe(0)
    const fresh = FILES.findDoc("fresh")
    expect(readFileSync(fresh, "utf8")).toMatch(/<epic-page[^>]*\sstage="overview"/)
    expect(FILES.read(fresh).stage).toBe("overview")
  })

  test("stage sets it, logged;  the same again changes nothing;  a word that isn't a stage is refused", async () => {
    expect(await commands().run(["stage", "x", "phases"])).toBe(0)
    expect(printed).toEqual(["x:  phases"])
    expect(FILES.read(file).stage).toBe("phases")
    expect(readFileSync(join(parts, "log.html"), "utf8")).toContain("stage: phases (was building)")
    expect(await commands().run(["stage", "x", "phases"])).toBe(0)
    expect(printed.at(-1)).toBe("already phases")
    expect(await commands().run(["stage", "x", "later"])).toBe(1)
    expect(warned.at(-1)).toBe('epic:  stage:  overview, phases, building, not "later"')
    expect(await commands().run(["stage", "x", "building"])).toBe(0)
    expect(FILES.read(file).stage).toBe("building")
  })
})

// epic `epic-engine` Q69:  closing obsolete items, with the reason on each
describe("PlanDocCommands close --why", () => {
  const seed = (change: (plan: PlanDoc) => void) => FILES.edit(file, change)
  const add = (plan: PlanDoc, kind: "judgement" | "issue" | "question" | "test" | "todo", title: string) =>
    plan.addItem(kind, title)

  test("several ids:  each done, the reason a Done card and in the log, the rest of the page untouched", async () => {
    await seed((plan) => {
      add(plan, "judgement", "An old call")
      add(plan, "issue", "An old issue")
      add(plan, "todo", "An old todo")
    })
    expect(await commands().run(["close", "x", "j1", "i1", "--why", "P2 removed it (abc123)"])).toBe(0)
    const plan = FILES.read(file)
    expect(plan.facts(plan.item("j1")).status).toBe("done")
    expect(plan.facts(plan.item("i1")).status).toBe("done")
    expect(plan.facts(plan.item("t1")).status).toBe("open")
    const card = plan.item("i1").querySelector('epic-status[state="done"]')!
    expect(card.textContent).toContain("P2 removed it (abc123)")
    expect(plan.reviewLines().map((line) => line.text)).toContain("J1 closed: An old call -- P2 removed it (abc123)")
    expect(printed).toEqual(["J1 closed:  An old call", "I1 closed:  An old issue"])
  })

  test("refused, the others still closed:  a question, a test, Owen's wanted, a fix for his review, his pick, his mark", async () => {
    await seed((plan) => {
      add(plan, "question", "Which?")
      add(plan, "test", "Try it")
      add(plan, "issue", "Wanted")
      add(plan, "issue", "Fixed")
      add(plan, "judgement", "Waits on a pick")
      add(plan, "issue", "Marked")
      add(plan, "todo", "Fine")
      Markup.set<"epic-item">(plan.item("i1"), { urgent: true })
      Markup.set<"epic-item">(plan.item("i2"), { requested: true })
      plan.fixedForReview("i2", "changed it")
      const reply = plan.document.createElement("epic-reply")
      reply.setAttribute("agent", "claude")
      reply.setAttribute("from", "Owen")
      reply.append(plan.document.createElement("epic-choices"))
      plan.item("j1").append(reply)
    })
    ReviewInbox.update(ReviewInbox.pathFor(file), (inbox) => inbox.setMark("i3", { action: "revisit", note: "wait" }))
    const code = await commands().run(["close", "x", "q1", "m1", "i1", "i2", "j1", "i3", "t1", "--why", "gone"])
    expect(code).toBe(1)
    const plan = FILES.read(file)
    expect(plan.facts(plan.item("t1")).status).toBe("done")
    for (const id of ["q1", "m1", "i1", "i2", "j1", "i3"]) expect(plan.facts(plan.item(id)).status).toBe("open")
    expect(warned.join("\n")).toMatch(/Q1 not closed:  a question/)
    expect(warned.join("\n")).toMatch(/I1 not closed:  Owen asked for it/)
    expect(warned.join("\n")).toMatch(/I2 not closed:  fixed/)
    expect(warned.join("\n")).toMatch(/J1 not closed:  waiting for Owen's pick/)
    expect(warned.join("\n")).toMatch(/I3 not closed:  Owen's mark/)
    expect(printed).toEqual(["T1 closed:  Fine"])
  })

  test("--why is text:  a live tag can't blank the card, or reach the log as markup", async () => {
    await seed((plan) => void add(plan, "issue", "Tagged"))
    expect(await commands().run(["close", "x", "i1", "--why", 'P2 made <ui-container width="1"> moot'])).toBe(0)
    const plan = FILES.read(file)
    const card = plan.item("i1").querySelector('epic-status[state="done"]')!
    expect(card.querySelector("ui-container")).toBeNull()
    expect(card.textContent).toContain('<ui-container width="1">')
    expect(plan.reviewLines().at(-1)!.text).toContain('<ui-container width="1">')
  })

  test("--why-file:  a reason per item in one call;  a refused one said, the rest closed", async () => {
    await seed((plan) => {
      add(plan, "issue", "One")
      add(plan, "issue", "Two")
      add(plan, "todo", "Three")
      Markup.set<"epic-item">(plan.item("i2"), { urgent: true })
    })
    const reasons = join(dirname(file), "reasons.json5")
    writeFileSync(reasons, '{ I1: "P2 did it", "x#T1": "P3 did it", i2: "nope" }')
    expect(await commands().run(["close", "x", "--why-file", reasons])).toBe(1)
    const plan = FILES.read(file)
    expect(plan.item("i1").querySelector('epic-status[state="done"]')!.textContent).toContain("P2 did it")
    expect(plan.item("t1").querySelector('epic-status[state="done"]')!.textContent).toContain("P3 did it")
    expect(plan.facts(plan.item("i2")).status).toBe("open")
    expect(await commands().run(["close", "x", "t1", "--why-file", reasons])).toBe(1)
    expect(warned.join("")).toMatch(/names its own ids/)
  })

  test("a Done card already there takes the reason:  never a second card", async () => {
    await seed((plan) => {
      add(plan, "issue", "Obviated")
      plan.addStatus("i1", "Obviated by P9", { state: "done" })
    })
    expect(await commands().run(["close", "x", "i1", "--why", "P9 removed it"])).toBe(0)
    const cards = FILES.read(file).item("i1").querySelectorAll("epic-status")
    expect(cards.length).toBe(1)
    expect(cards[0]!.textContent).toContain("P9 removed it")
  })

  test("refused:  a recent ask of his;  an old review isn't refused", async () => {
    await seed((plan) => {
      add(plan, "todo", "Do it now")
      add(plan, "todo", "Reviewed long ago")
      Markup.set<"epic-item">(plan.item("t1"), { reviewAs: "now" })
      const reply = plan.document.createElement("epic-reply")
      reply.setAttribute("from", "Owen")
      reply.setAttribute("at", new Date().toISOString().slice(0, 16).replace("T", " "))
      reply.textContent = "do it"
      plan.item("t1").append(reply)
      Markup.set<"epic-item">(plan.item("t2"), { reviewAs: "now", reviewed: "2020-01-01" })
    })
    expect(await commands().run(["close", "x", "t1", "t2", "--why", "gone"])).toBe(1)
    expect(warned.join("\n")).toMatch(/T1 not closed:  Owen asked for it lately/)
    expect(FILES.read(file).facts(FILES.read(file).item("t2")).status).toBe("done")
  })

  test("promised, not delivered:  a card a later run knows, back on his list, refused from closing", async () => {
    await seed((plan) => {
      add(plan, "judgement", "Until P35")
      Markup.set<"epic-item">(plan.item("j1"), { calm: true, reviewed: "2026-11-01" })
    })
    expect(await commands().run(["status", "x", "j1", "promised", "the Spanish Inbox never came"])).toBe(0)
    const plan = FILES.read(file)
    const item = plan.item("j1")
    expect(item.querySelector('epic-status[state="noted"]')!.textContent).toMatch(/^\s*Promised, not delivered:/)
    expect(item.hasAttribute("calm")).toBe(false)
    expect(item.hasAttribute("reviewed")).toBe(false)
    expect(plan.closeRefusal("j1")).toMatch(/promised/)
  })

  test("no --why:  as ever;  --why with no reason refused", async () => {
    await seed((plan) => void add(plan, "question", "Which?"))
    expect(await commands().run(["close", "x", "q1"])).toBe(0)
    expect(FILES.read(file).facts(FILES.read(file).item("q1")).status).toBe("done")
    expect(await commands().run(["close", "x", "q1", "--why"])).toBe(1)
    expect(warned.join("")).toMatch(/--why needs the reason/)
  })

  test("a quiet noted card leaves the change stamp alone", async () => {
    await seed((plan) => void add(plan, "issue", "Maybe"))
    const changed = () => FILES.read(file).item("i1").getAttribute("changed")
    const before = changed()
    await new Promise((resolve) => setTimeout(resolve, 1100))
    expect(await commands().run(["status", "x", "i1", "noted", "Maybe obsolete:  check", "--quiet"])).toBe(0)
    expect(changed()).toBe(before)
    expect(FILES.read(file).item("i1").querySelector('epic-status[state="noted"]')!.textContent).toContain(
      "Maybe obsolete"
    )
  })

  // epic `epic-engine` I452:  a Noted "Fixed in <sha>" left editor's I329 red, its fix never marked fixed
  test("a noted card saying the work is finished is refused, saying what to run;  nothing written", async () => {
    await seed((plan) => void add(plan, "issue", "Broken"))
    expect(await commands().run(["status", "x", "i1", "noted", "Fixed in f43cc8655, merging next"])).toBe(1)
    expect(warned.join("")).toMatch(/I1:  a Noted card is a record[\s\S]*fixed "<what changed>"[\s\S]*underway/)
    expect(FILES.read(file).item("i1").querySelector("epic-status")).toBeNull()
  })
})

// epic `epic-engine` T78:  an issue filed from the person's words and taken up at once is blue, never red
describe("PlanDocCommands add --start", () => {
  test("the person's words its body, an Underway card, the spinner on;  in progress, not attention", async () => {
    const words = `Clicking <Clarify> jumps to the top. Don't do that!`
    const args = ["add", "x", "issue", "Clarify jumps to the top", "--requested", "--start", words]
    expect(await commands().run([...args, "--agent", "epic-engine-clarify-scroll"])).toBe(0)
    const id = printed.at(-1)!.toLowerCase()
    const plan = FILES.read(file)
    const item = plan.item(id)
    expect(item.textContent).toContain(`“${words}”`)
    const card = item.querySelector(':scope > epic-status[state="underway"]')!
    expect(card.textContent).toContain("epic-engine-clarify-scroll")
    expect(plan.itemState(item)).toBe("progress")
    expect(ReviewInbox.read(ReviewInbox.pathFor(file)).working[id]).toBeDefined()
  })

  test("--start needs the words", async () => {
    expect(await commands().run(["add", "x", "issue", "No words", "--start"])).toBe(1)
    expect(warned.join("\n")).toMatch(/--start needs the person's words/)
  })
})

// epic `epic-engine` T111:  a session loading an epic skips what the page shows grey
describe("PlanDocCommands summary / items:  finished phases and grey items left out, unless --all", () => {
  test("summary:  a count line for the done phases and the grey items;  --all lists them", async () => {
    const owner = commands()
    await owner.run(["add", "x", "limit", "Only on macOS"])
    await owner.run(["add", "x", "issue", "It breaks"])
    printed = []
    expect(await owner.run(["summary", "x"])).toBe(0)
    const lean = printed.join("\n")
    expect(lean).toContain("  1 phase done  (--all lists them)")
    expect(lean).not.toContain("P1 · One")
    expect(lean).toContain("P2 · Two")
    expect(lean).toContain("It breaks")
    expect(lean).not.toContain("Only on macOS")
    expect(lean).toContain("1 grey item left out:  limits, handled  (--all)")
    printed = []
    expect(await owner.run(["summary", "--all", "x"])).toBe(0)
    const all = printed.join("\n")
    expect(all).toContain("[x] P1 · One")
    expect(all).toContain("Only on macOS")
    expect(all).not.toContain("left out")
  })

  test("summary --json:  `done` and `quiet` count them;  `next` and `active` whichever the scope", async () => {
    const owner = commands()
    await owner.run(["add", "x", "limit", "Only on macOS"])
    printed = []
    await owner.run(["summary", "x", "--json"])
    const lean = JSON.parse(printed[0]!)
    expect(lean.phases.map((phase: { number: string }) => phase.number)).toEqual(["2", "3"])
    expect([lean.done, lean.quiet, lean.next.number, lean.open.limit]).toEqual([1, 1, "2", []])
    printed = []
    await owner.run(["summary", "x", "--json", "--all"])
    const all = JSON.parse(printed[0]!)
    expect(all.phases).toHaveLength(3)
    expect([all.done, all.quiet, all.open.limit.length]).toEqual([1, 1, 1])
  })

  test("items:  grey items counted per section;  --all lists them", async () => {
    const owner = commands()
    await owner.run(["add", "x", "limit", "Only on macOS"])
    printed = []
    await owner.run(["items", "x", "--json"])
    const limits = JSON.parse(printed[0]!).sections.find((s: { kind: string }) => s.kind === "limit")
    expect([limits.items.length, limits.quiet]).toEqual([0, 1])
    printed = []
    await owner.run(["items", "x", "--json", "--all"])
    const every = JSON.parse(printed[0]!).sections.find((s: { kind: string }) => s.kind === "limit")
    expect([every.items.length, every.quiet]).toEqual([1, undefined])
  })
})

// epic `epic-engine` T123:  a fresh reader reads each new or changed title cold
describe("PlanDocCommands:  titles read cold", () => {
  const INSIDE = "The monitor is split in two:  a tiny plain-JS poller, and a short look that runs the epic tool"
  const REWRITE =
    "Each Claude session's background 'listen for my Send' process now uses less memory. Nothing you'd see."

  /** What the reader was handed. */
  let asked: TitleRequest[]

  /** The commands, with a reader that fails every title naming "the monitor". */
  function reading() {
    asked = []
    const ask = (request: TitleRequest): TitleVerdict => {
      asked.push(request)
      return /the monitor/i.test(request.text)
        ? { pass: false, reasons: ['"the monitor" is an internal name'], rewrite: REWRITE }
        : { pass: true, reasons: [], rewrite: "" }
    }
    const owner = new PlanDocCommands({
      files: FILES,
      titleReader: new TitleReader({ ask, skipReason: () => undefined })
    })
    vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
    vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
    return owner
  }

  test("add refuses a title the reader fails, with its reasons and the rewrite to use;  writing nothing", async () => {
    const skeleton = readFileSync(file, "utf8")
    expect(await reading().run(["add", "x", "todo", INSIDE])).toBe(1)
    expect(asked[0]!.text).toBe(`Kind:  todo\nTitle:  ${INSIDE}`)
    expect(warned[0]).toContain("rewrite this title:  a reader with no context couldn't follow it.")
    expect(warned[0]).toContain('- "the monitor" is an internal name')
    expect(warned[0]).toContain(`Try:  "${REWRITE}"`)
    expect(warned[0]).toContain("--title-ok keeps it as it is")
    expect(readFileSync(file, "utf8")).toBe(skeleton)
  })

  test("add takes a title the reader passes, and --title-ok skips the reader", async () => {
    expect(await reading().run(["add", "x", "todo", "The Send button keeps its place when the page reloads"])).toBe(0)
    expect(await reading().run(["add", "x", "todo", INSIDE, "--title-ok"])).toBe(0)
    expect(asked).toEqual([])
  })

  test("rename reads the new title too, its markup taken off", async () => {
    await FILES.edit(file, (plan) => plan.addItem("todo", "Old title", {}))
    expect(await reading().run(["rename", "x", "T1", `<b>${INSIDE}</b>`, "--html"])).toBe(1)
    expect(asked[0]!.text).toBe(`Kind:  item\nTitle:  ${INSIDE}`)
    expect(await reading().run(["rename", "x", "T1", INSIDE, "--title-ok"])).toBe(0)
  })

  /** `epic <verb> ...args` as the `epic` command takes it:  its flags checked, turned into the tool's order, run. */
  async function typed(verb: string, args: string[]): Promise<number[]> {
    const checked = EpicProgram.checkFlags(`epic ${verb}`, VERB_FLAGS[verb], args)
    const codes: number[] = []
    for (const run of planDocArgs(verb, [...checked])) codes.push(await reading().run(run))
    return codes
  }

  // epic `epic-engine` I385:  the flag was the tool's, but the `epic` command refused it as "no such flag"
  test("epic add and epic update --title take --title-ok, as typed", async () => {
    expect(await typed("add", ["x#T", INSIDE, "--title-ok"])).toEqual([0])
    expect(await typed("update", ["x#T1", "--title", INSIDE, "--title-ok"])).toEqual([0])
    expect(asked).toEqual([])
    expect(await typed("update", ["x#T1", "--title", INSIDE])).toEqual([1])
  })

  // epic `epic-engine` I385:  the coherence and designer skills tell sessions to end a title so
  test("a known trailing tag, (coherence) or (designer), is a label:  the reader and the word count never see it", async () => {
    const title = "The Send button keeps its place when the page reloads (coherence)"
    expect(await typed("add", ["x#Q", title])).toEqual([0])
    expect(asked[0]!.text).toBe("Kind:  question\nTitle:  The Send button keeps its place when the page reloads")
    expect(await reading().run(["rename", "x", "Q1", "The Send button keeps its place (designer)"])).toBe(0)
    expect(asked[0]!.text).toBe("Kind:  item\nTitle:  The Send button keeps its place")
    // written as given, tag and all
    expect(readFileSync(file, "utf8")).toContain("The Send button keeps its place (designer)")
    // any other bracket at the end is the title's own
    reading().titleReader.check("The Send button moves (sometimes)", "issue")
    expect(asked[0]!.text).toBe("Kind:  issue\nTitle:  The Send button moves (sometimes)")
  })
})

describe("ShortTitle", () => {
  test("a known trailing tag isn't counted:  30 words plus (coherence) is a title, 31 isn't", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => `w${i}`).join(" ")
    expect(ShortTitle.problemOf(`${thirty} (coherence)`)).toBeUndefined()
    expect(ShortTitle.problemOf(`${thirty} (sometimes)`)).toBe("it's 31 words (the most is 30)")
    expect(ShortTitle.withoutTag("  A title (designer) ")).toBe("A title")
    expect(ShortTitle.withoutTag("A title (coherence) more")).toBe("A title (coherence) more")
  })
})

describe("TitleReader", () => {
  test("skipped:  says why once, or nothing for a quiet skip;  never asks", () => {
    const lines: string[] = []
    const ask = vi.fn()
    const reader = new TitleReader({
      ask,
      skipReason: () => ({ why: "no claude on the PATH" }),
      warn: (line) => void lines.push(line)
    })
    reader.check("A", "todo")
    reader.check("B", "todo")
    expect(lines).toEqual(["epic:  title not read cold (no claude on the PATH)"])
    new TitleReader({
      ask,
      skipReason: () => ({ why: "a test run", quiet: true }),
      warn: (line) => void lines.push(line)
    }).check("C", "todo")
    expect(lines).toHaveLength(1)
    expect(ask).not.toHaveBeenCalled()
  })

  test("a reader that fails lets the title through, saying so", () => {
    const lines: string[] = []
    const ask = () => {
      throw new Error("claude -p didn't run")
    }
    new TitleReader({ ask, skipReason: () => undefined, warn: (line) => void lines.push(line) }).check("A", "todo")
    expect(lines).toEqual(["epic:  title not read cold:  claude -p didn't run"])
  })

  // epic `epic-engine` I390:  its rewrite ran past 30 words, which `epic add` then refused
  test("offers only a rewrite epic add would take:  tidied, cut to its first sentence, else none", () => {
    const long = Array.from({ length: 31 }, () => "word").join(" ")
    expect(TitleReader.offerable(`">The Send button keeps its place."`)).toBe("The Send button keeps its place.")
    expect(TitleReader.offerable(`The Send button keeps its place. And ${long}`)).toBe(
      "The Send button keeps its place."
    )
    expect(TitleReader.offerable("The cache is smaller.  Nothing you'd see.")).toBe(
      "The cache is smaller.  Nothing you'd see."
    )
    expect(TitleReader.offerable(long)).toBeUndefined()
    expect(TitleReader.offerable("")).toBeUndefined()
  })

  /** A reader failing every title but `passing`, rewriting to `rewrite`;  its asks counted. */
  function failing(rewrite: string, file: string, clock = { now: 0 }) {
    const asked: string[] = []
    const reader = new TitleReader({
      ask: ({ text }) => {
        asked.push(text)
        return { pass: false, reasons: ["unclear"], rewrite }
      },
      skipReason: () => undefined,
      suggestionsFile: file,
      now: () => clock.now,
      warn: () => {}
    })
    return { reader, asked, clock }
  }

  test("a too-long rewrite isn't offered", () => {
    const long = Array.from({ length: 31 }, () => "word").join(" ")
    const { reader } = failing(long, join(mkdtempSync(join(tmpdir(), "titles-")), "kept.json5"))
    expect(() => reader.check("The thing", "todo")).toThrow(/^(?![\s\S]*Try:)/)
  })

  // epic `epic-engine` I390:  it refused two of its own rewrites
  test("its own rewrite, given back within the hour, passes unread;  after it, it's read again", () => {
    const file = join(mkdtempSync(join(tmpdir(), "titles-")), "home", "kept.json5")
    const REWRITE = "The Send button keeps its place when the page reloads."
    const { reader, asked, clock } = failing(REWRITE, file)
    expect(() => reader.check("The poller keeps it", "todo")).toThrow(`Try:  "${REWRITE}"`)
    expect(asked).toHaveLength(1)
    reader.check(REWRITE, "todo")
    reader.check("the send button keeps its place  when the page reloads (coherence)", "todo")
    expect(asked).toHaveLength(1)
    clock.now = 60 * 60 * 1000
    expect(() => reader.check(REWRITE, "todo")).toThrow()
    expect(asked).toHaveLength(2)
  })
})
