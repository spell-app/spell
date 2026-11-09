/**
 * Tests of `StaleFacts` (`epic stale`) on a sample page against a scratch git repo:  the facts it reports,
 * and that it decides nothing.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { StaleFacts } from "spell/epic/tool/StaleFacts"

const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "stale-facts-"))

const git = (...args: string[]) =>
  execFileSync("git", ["-c", "user.name=T", "-c", "user.email=t@t", ...args], { cwd: root, encoding: "utf8" })

let report: ReturnType<StaleFacts["report"]>
let plan: PlanDoc

beforeAll(() => {
  mkdirSync(join(root, "src"), { recursive: true })
  writeFileSync(join(root, "src", "Keep.ts"), "export class Keep { stillHere() {} }\n")
  writeFileSync(join(root, "src", "Gone.ts"), "export const goneName = 1\n")
  git("init", "-q")
  git("add", ".")
  git("commit", "-qm", "the start", "--date", new Date(Date.now() - 20 * 86_400_000).toISOString())
  plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  plan.addPhase("One", { goal: "<ul><li>a goal</li></ul>" })
  plan.setPhase(1, "done")
  plan.now = new Date(Date.now() - 10 * 86_400_000)
  plan.addItem("issue", "The old issue", {
    details:
      '<p><code title="src/Keep.ts">Keep.stillHere()</code> and <code>Gone.goneName()</code>, ' +
      '<a href="/src/Gone.ts">a link</a>, <code>its</code>, <code>Keep.ts</code>, ' +
      "<code>NeverReal.method()</code>, <code>__members/owen@spell.json5</code>, <code>~/.spell/x.json5</code>, " +
      "<code>CNAME</code></p>"
  })
  plan.log("I1 added")
  plan.addItem("question", "A question")
  plan.now = new Date()
  plan.item("i1").setAttribute("phase", "1")
  plan.addItem("todo", "Later work", { details: '<p>Follows on from <a href="#i1">I1</a>.</p>' })
  plan.addItem("judgement", "Wanted one")
  plan.item("j1").setAttribute("urgent", "")
  git("rm", "-q", "src/Gone.ts")
  writeFileSync(join(root, "src", "Keep.ts"), "export class Keep { stillHere() { return 1 } }\n")
  git("add", ".")
  git("commit", "-qm", "x I1:  the fix, and Gone.ts removed")
  report = new StaleFacts({ plan, epic: "x", checkout: root }).report()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("StaleFacts", () => {
  const item = (id: string) => report.items.find((each) => each.id === id)!

  test("only open calls, issues and todos", () => {
    expect(report.items.map((each) => each.id).sort()).toEqual(["i1", "j1", "t1"])
  })

  test("age, phase and whether it's done", () => {
    expect(item("i1").ageDays).toBe(10)
    expect(item("i1").phase).toMatchObject({ number: "1", done: true })
    expect(item("t1").phase).toBeUndefined()
  })

  test("files:  tracked, by base name, or gone;  a plain word is no name", () => {
    expect(item("i1").paths).toEqual(
      expect.arrayContaining([
        { path: "src/Keep.ts", exists: true, at: ["src/Keep.ts"] },
        { path: "src/Gone.ts", exists: false, at: [] },
        { path: "Keep.ts", exists: true, at: ["src/Keep.ts"] }
      ])
    )
    expect(item("i1").names).toEqual(
      expect.arrayContaining([
        { name: "stillHere", found: true },
        { name: "goneName", found: false }
      ])
    )
    expect(item("i1").names.map((each) => each.name)).not.toContain("method")
    expect(item("i1").names.map((each) => each.name)).not.toContain("CNAME")
    expect(
      item("i1")
        .paths.map((each) => each.path)
        .join()
    ).not.toMatch(/__members|\.spell/)
    expect(item("i1").names.some((each) => each.name === "its")).toBe(false)
  })

  test("commits since it was written, a gone file included;  a subject naming it", () => {
    expect(item("i1").commits.count).toBe(1)
    expect(item("i1").commits.latest[0]!.subject).toMatch(/Gone\.ts removed/)
    expect(item("i1").namedInCommits).toHaveLength(1)
  })

  test("later items that mention it", () => {
    expect(item("i1").laterMentions.map((each) => each.id)).toContain("t1")
  })

  test("says what close --why would refuse, and decides nothing itself", () => {
    expect(item("j1").closeRefused).toMatch(/Owen asked for it/)
    expect(item("i1").closeRefused).toBeUndefined()
    expect(plan.facts(plan.item("i1")).status).toBe("open")
  })

  const facts = (id: string, options: Partial<ConstructorParameters<typeof StaleFacts>[0]> = {}) =>
    new StaleFacts({ plan, epic: "x", checkout: root, ...options }).report().items.find((each) => each.id === id)!

  test.each(["Maybe obsolete:  check it", "Partly obsolete:  half", "Promised, not delivered:  a page"])(
    "a tidy's card is reported, so a later run doesn't note it twice:  %s",
    (card) => {
      plan.noteStatus("t1", card)
      expect(facts("t1").tidyNoted).toBeTruthy()
      for (const each of Array.from(plan.item("t1").querySelectorAll("epic-status"))) each.remove()
    }
  )

  test("age comes from the log or dated content, never the changed stamp", () => {
    const before = facts("i1").written
    plan.item("i1").setAttribute("changed", new Date().toISOString())
    expect(facts("i1").written).toBe(before)
    // nothing else dates it:  unknown, not the stamp
    plan.addItem("todo", "No date on it")
    const undated = [...plan.itemsOf("todo")].at(-1)!
    undated.setAttribute("changed", "2026-01-01T00:00:00-05:00")
    expect(facts(undated.id).written).toBeUndefined()
    undated.remove()
  })

  test("the todo made to follow it up:  a card's, or a todo's From line", () => {
    plan.noteStatus("i1", 'Made todo <a href="#t1">T1</a> to follow this up.')
    expect(facts("i1").madeTodo).toEqual({ id: "t1", status: "open" })
    for (const card of Array.from(plan.item("i1").querySelectorAll("epic-status"))) card.remove()
    plan.addItem("todo", "Follow up:  it", { details: '<p>From <a href="#j1">J1</a> (judgement), marked</p>' })
    expect(facts("j1").madeTodo?.id).toBe("t2")
  })

  test("every earlier status card is reported", () => {
    plan.addStatus("t1", "Obviated by P3", { state: "done" })
    expect(facts("t1").statusCards).toEqual([expect.objectContaining({ state: "done", text: "Obviated by P3" })])
    for (const card of Array.from(plan.item("t1").querySelectorAll("epic-status"))) card.remove()
  })

  test("another epic's id doesn't count as a mention", () => {
    plan.addItem("todo", "Elsewhere", { details: "<p>Same as data I1, and `data` J1, J9.  Ours:  x-other, J1.</p>" })
    const epics = new Set(["data", "x"])
    expect(facts("i1", { epics }).laterMentions.map((each) => each.id)).not.toContain("t3")
    expect(facts("j1", { epics }).laterMentions.map((each) => each.id)).toContain("t3")
  })

  test("commits for a bare base name several files share aren't counted", () => {
    git("checkout", "-q", "-b", "side")
    mkdirSync(join(root, "a"), { recursive: true })
    mkdirSync(join(root, "b"), { recursive: true })
    writeFileSync(join(root, "a", "index.ts"), "export const a = 1\n")
    writeFileSync(join(root, "b", "index.ts"), "export const b = 1\n")
    git("add", ".")
    git("commit", "-qm", "unrelated")
    plan.addItem("todo", "Bare", { details: "<p><code>index.ts</code></p>" })
    const bare = facts("t4")
    expect(bare.paths[0]!.at).toHaveLength(2)
    expect(bare.commits.count).toBe(0)
    git("checkout", "-q", "-")
  })

  test("a name or file only on main still exists", () => {
    git("branch", "behind", "HEAD~1")
    const worktree = join(root, "..", `${root.split("/").at(-1)}-wt`)
    git("worktree", "add", "-q", worktree, "behind")
    // `src/Gone.ts` is deleted on main, there in the worktree;  check the other way:  a file only on main
    writeFileSync(join(root, "src", "OnlyMain.ts"), "export class OnlyMain { onlyHere() {} }\n")
    git("add", ".")
    git("commit", "-qm", "only on main")
    plan.addItem("todo", "Main", { details: '<p><code title="src/OnlyMain.ts">OnlyMain.onlyHere()</code></p>' })
    const seen = facts("t5", { checkout: worktree, main: root })
    expect(seen.paths[0]).toMatchObject({ exists: true })
    expect(seen.names[0]).toEqual({ name: "onlyHere", found: true })
    rmSync(worktree, { recursive: true, force: true })
    git("worktree", "prune")
  })

  test("a done phase the item says it waits for is a hint;  a phase not done isn't", () => {
    plan.addItem("judgement", "Waits, until P1 sorts it out")
    plan.addItem("judgement", "Waits, until P2 sorts it out")
    const [one, two] = [...plan.itemsOf("judgement")].slice(-2).map((each) => each.id)
    expect(facts(one!).waitsOnDone.map((each) => each.number)).toEqual(["1"])
    expect(facts(two!).waitsOnDone).toEqual([])
  })

  test("a judgement call Owen reviewed is settled;  one with an open ask isn't", () => {
    plan.addItem("judgement", "Recorded")
    const id = [...plan.itemsOf("judgement")].at(-1)!.id
    expect(facts(id).settled).toBe(false)
    plan.item(id).setAttribute("reviewed", "2026-11-01")
    expect(facts(id).settled).toBe(true)
    plan.item(id).setAttribute("review-as", "revisit")
    expect(facts(id).settled).toBe(false)
  })
})
