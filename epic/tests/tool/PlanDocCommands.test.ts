/**
 * Tests of `PlanDocCommands` (the `epic` tool in its own order, `epic <verb>`'s) on a scratch checkout:  the command line itself, its flags,
 * output and log lines, on a doc written as a real one is (linked, formatted, split).
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { PhaseIds } from "spell-epic/phases"
import { PlanDoc } from "spell-epic/tool/PlanDoc"
import { PlanDocCommands, movedDown } from "spell-epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell-epic/tool/PlanDocFiles"
import { ReviewInbox } from "spell-epic/tool/ReviewInbox"

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
    expect(plan.estimate).toBe("3h-4h in all, 0m left (P1, P3 not estimated);  1 done took 21m, estimated 3h-4h")
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

  // epic `epic-engine` P39:  `--after 2` adds P2.1, then P2.2;  nothing moves, so no links-agree pass
  test("--after:  a decimal phase after its base, printed and logged;  no other phase renumbered", async () => {
    expect(await commands().run(["add-phase", "x", "Notebook", "--after", "1"])).toBe(0)
    expect(await commands().run(["add-phase", "x", "Reassess", "--after", "P1"])).toBe(0)
    expect(printed).toEqual(["P1.1", "P1.2"])
    const plan = FILES.read(file)
    expect(plan.phases.map((phase) => `P${phase.number} ${phase.name}`)).toEqual([
      "P1 One",
      "P1.1 Notebook",
      "P1.2 Reassess",
      "P2 Two",
      "P3 Three"
    ])
    const last = Array.from(plan.document.querySelectorAll("#log > epic-event")).at(-1)!
    expect(last.textContent!.replace(/\s+/g, " ")).toBe("P1.2 added: Reassess")
    // the tool's verbs take it by its number
    expect(await commands().run(["phase", "x", "P1.1", "active", "--no-open"])).toBe(0)
    expect(FILES.read(file).phases[1]!.status).toBe("active")
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

  test("refuses no id, an id the doc doesn't have, or an item that's never urgent, writing nothing", async () => {
    const owner = commands()
    await owner.run(["add", "x", "todo", "A todo"])
    const doc = readFileSync(file, "utf8")
    expect(await owner.run(["calm", "x"])).toBe(1)
    expect(await owner.run(["calm", "x", "j99"])).toBe(1)
    expect(await owner.run(["calm", "x", printed[0]])).toBe(1)
    expect(readFileSync(file, "utf8")).toBe(doc)
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
    expect(printed).toEqual(["J1 picked C:  Way C (a reply's options);  approved:  closed (accepted)"])
    const plan = FILES.read(file)
    const sets = Array.from(plan.item("j1").querySelectorAll("epic-choices"), (set) => set.getAttribute("chosen"))
    expect([plan.item("j1").getAttribute("status"), sets]).toEqual(["done", [null, "C"]])
    // the doc is written formatted:  its spaces squeezed
    expect(plan.item("j1").querySelector("epic-status")!.textContent!.replace(/\s+/g, " ")).toBe(
      "Chose C · Way C: recorded, the call accepted; Owen: 'C, please'; built"
    )

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
      /<a href="(?:\.\.\/){3}packages\/x\/src\/buildTsx\.ts" target="src-packages-x-src-buildtsx-ts"\s*>\s*<code title="packages\/x\/src\/buildTsx\.ts:4">buildTsx\(\)<\/code\s*>\s*<\/a\s*>/
    )
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
    expect(await owner.run(["rename", "x", "C1", "<code>Linked</code> todo", "--html"])).toBe(0)
    expect(printed).toEqual(['C1 · Linked todo (was "Linked")'])
    expect(FILES.read(file).item("c1").querySelector(':scope > [slot="title"] > code')!.textContent).toBe("Linked")
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
