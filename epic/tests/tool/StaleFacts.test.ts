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
      '<p><code title="src/Keep.ts">Keep.stillHere()</code> and <code>GoneClass.method()</code>, ' +
      '<a href="/src/Gone.ts">a link</a>, <code>its</code>, <code>Keep.ts</code></p>'
  })
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
        { name: "method", found: false }
      ])
    )
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

  test("a tidy's card is reported, so a later run doesn't note it twice", () => {
    plan.noteStatus("t1", "Maybe obsolete:  check it")
    const again = new StaleFacts({ plan, epic: "x", checkout: root }).report()
    expect(again.items.find((each) => each.id === "t1")!.tidyNoted).toBeTruthy()
  })
})
