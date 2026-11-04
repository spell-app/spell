/**
 * Tests of `EpicOwners` (`epic owns`):  its pure rules, then a scratch checkout with git, a child repo inside it,
 * a worktree of both for one epic, an epic repo its config names, and four epics' pages.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EpicOwners } from "spell/epic/tool/EpicOwners"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

describe("EpicOwners rules", () => {
  test("names():  a whole path, a link's climb too;  never inside a longer path", () => {
    const yes = [
      "<code>src/a.ts</code>",
      'title="src/a.ts"',
      'href="../../../src/a.ts"',
      "edits src/a.ts.",
      "src/a.ts, then"
    ]
    const no = ["epic/src/a.ts", "src/a.tsx", "src/a.ts/", "src/a.ts.bak", "xsrc/a.ts", "my-src/a.ts"]
    expect(yes.filter((text) => !EpicOwners.names(text, "src/a.ts"))).toEqual([])
    expect(no.filter((text) => EpicOwners.names(text, "src/a.ts"))).toEqual([])
  })

  test("stageOf():  a future epic or a page agreeing its plan is planning;  NO stage reads as building", () => {
    const page = (stage?: string) => `<epic-page\n  epic="x"\n  ${stage ? `stage="${stage}"` : ""}\n>`
    expect(EpicOwners.stageOf({ status: "future" }, page())).toBe("planning")
    expect(EpicOwners.stageOf({ status: "in progress" }, page("overview"))).toBe("planning")
    expect(EpicOwners.stageOf({ status: "in progress" }, page("phases"))).toBe("planning")
    expect(EpicOwners.stageOf({ status: "in progress" }, page("building"))).toBe("building")
    expect(EpicOwners.stageOf({ status: "in progress" }, page())).toBe("building")
  })

  test("pathOf():  slashes, no leading ./, an absolute path from the root", () => {
    expect(EpicOwners.pathOf("./src/a.ts", "/r")).toBe("src/a.ts")
    expect(EpicOwners.pathOf("/r/ui/src/b.ts", "/r")).toBe("ui/src/b.ts")
  })
})

describe("EpicOwners on a scratch checkout", () => {
  const scratch = mkdtempSync(join(tmpdir(), "epic-owners-"))
  const root = join(scratch, "kit")
  const shared = join(scratch, "shared")
  const worktree = join(scratch, "worktrees", "builder")
  const files = new PlanDocFiles({ root, content: shared })

  beforeAll(async () => {
    mkdirSync(join(shared, "epics"), { recursive: true })
    // the kit, its child repo `child` (git-ignored there), each with a commit on main
    write(root, ".epic/config.json5", JSON.stringify({ contentFolder: "../shared", worktreesFolder: "../worktrees" }))
    git(root, "init", "-q", "-b", "main")
    commit(root, "kit", { ".gitignore": ".epic\nchild\n", "src/a.ts": "a", "src/same.ts": "s" })
    mkdirSync(join(root, "child"))
    git(join(root, "child"), "init", "-q", "-b", "main")
    commit(join(root, "child"), "child", { "src/b.ts": "b" })
    // epic `builder`'s worktree:  one of the kit, one of the child inside it;  a commit in each, one file not committed
    git(root, "worktree", "add", "-q", "-b", "builder", worktree)
    git(join(root, "child"), "worktree", "add", "-q", "-b", "builder", join(worktree, "child"))
    commit(worktree, "builder P1", { "src/a.ts": "a2" })
    commit(join(worktree, "child"), "builder P1", { "src/b.ts": "b2" })
    write(worktree, "src/new.ts", "not committed")
    // main moves on after the branch left it:  not the branch's
    commit(root, "main's own", { "src/same.ts": "s2" })
    // the pages:  building (no stage, its branch), planning (names a path in a part), done and future (name it too)
    await page("builder", (plan) => plan.addPhase("One"))
    await page(
      "planner",
      (plan) => {
        plan.setStage("overview")
        plan.addItem("question", "where?", { details: '<p><a href="../../../src/a.ts">a</a>, `child/src/b.ts`</p>' })
      },
      true
    )
    await page("finished", (plan) => {
      plan.addPhase("One", { goal: "<p>src/a.ts and src/same.ts</p>" })
      plan.setPhase(1, "done", { done: "<ul><li>built</li></ul>" })
    })
    await page("later", (plan) => {
      plan.page.setAttribute("future", "")
      plan.addItem("limit", "touches src/new.ts")
    })
  })

  afterAll(() => rmSync(scratch, { recursive: true, force: true }))

  // owners in `listEpics()`' order:  in progress (most not reviewed first:  planner's question), then future
  test("find():  branch and plan owners with their stage;  never a done epic, main's own change, or nobody", () => {
    const owners = new EpicOwners({ files })
    expect(owners.epics.map((epic) => epic.name).sort()).toEqual(["builder", "later", "planner"])
    expect(owners.find(["src/a.ts", "./child/src/b.ts", "src/new.ts", "src/same.ts"])).toEqual([
      {
        path: "src/a.ts",
        owners: [
          { epic: "planner", stage: "planning", how: ["plan"] },
          { epic: "builder", stage: "building", how: ["branch"] }
        ]
      },
      {
        path: "child/src/b.ts",
        owners: [
          { epic: "planner", stage: "planning", how: ["plan"] },
          { epic: "builder", stage: "building", how: ["branch"] }
        ]
      },
      {
        path: "src/new.ts",
        owners: [
          { epic: "builder", stage: "building", how: ["branch"] },
          { epic: "later", stage: "planning", how: ["plan"] }
        ]
      },
      { path: "src/same.ts", owners: [] }
    ])
  })

  test("branchFiles():  the worktree's commits, in the kit and its child repo, and what's not committed", () => {
    const owners = new EpicOwners({ files })
    const builder = owners.epics.find((epic) => epic.name === "builder")!
    expect([...owners.branchFiles(builder)].sort()).toEqual(["child/src/b.ts", "src/a.ts", "src/new.ts"])
    const planner = owners.epics.find((epic) => epic.name === "planner")!
    expect(owners.branchFiles(planner).size).toBe(0)
  })

  ////////////////
  // ## Helpers
  ////////////////

  /** Write epic `name`'s page from the fixture, changed by `change`;  `split`:  its bodies in part files. */
  async function page(name: string, change: (plan: PlanDoc) => void, split = false): Promise<void> {
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
    plan.page.setAttribute("epic", name)
    plan.page.removeAttribute("worktree")
    change(plan)
    await files.writeDoc(join(shared, "epics", name, `${name}.plan.html`), plan, split)
  }
})

/** Write `text` to `path` under `dir`, making its folders. */
function write(dir: string, path: string, text: string): void {
  const file = join(dir, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

/** `git <args>` in `cwd`, as a test user;  throws on failure. */
function git(cwd: string, ...args: string[]): string {
  const run = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" })
  if (run.status !== 0) throw new Error(`git ${args.join(" ")}:  ${run.stderr}`)
  return run.stdout.trim()
}

/** Commit `files` (path => text, written first) in `cwd` as `message`. */
function commit(cwd: string, message: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) write(cwd, path, text)
  git(cwd, "add", ...Object.keys(files))
  git(cwd, "commit", "-q", "-m", message)
}
