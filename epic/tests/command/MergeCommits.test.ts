/**
 * Commits landing on an epic page BY THEMSELVES (epic `epic-engine` I135), on SCRATCH git repos laid out as a kit:
 * the top, `kit`, with one child repo, `spell-ui`, each on GitHub (its `origin`);  the epic `x`'s worktree, `wt`,
 * a worktree of the top on branch `x` with one of the child inside it;  the shared content folder, `content`.
 * - `phase ... done`, in the worktree:  the branch's commits so far, into their phases and items
 * - `epic merge x`:  the commits it just fast-forwarded onto each repo's `main`, each linking to its own repo
 * - neither adds a commit twice, nor one another epic names;  a failure never fails the merge
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { Requests } from "spell/epic/command/Requests"
import { planDocArgs } from "spell/epic/command/epicArgs"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("../tool/fixtures", import.meta.url))

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "merge-commits-")))
const KIT = join(TEMP, "kit")
const UI = join(KIT, "spell-ui")
const WORKTREE = join(TEMP, "wt")
const CONTENT = join(TEMP, "content")
const PAGE = join(CONTENT, "epics", "x", "x.plan.html")

/** git's identity and no signing, for every commit here */
const GIT_ENV = {
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t",
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "commit.gpgsign",
  GIT_CONFIG_VALUE_0: "false"
}
const SAVED = { ...process.env }
Object.assign(process.env, GIT_ENV, { SPELL_EPIC_HOME: join(TEMP, "home") })
afterAll(() => {
  for (const key of [...Object.keys(GIT_ENV), "SPELL_EPIC_HOME"])
    if (SAVED[key] === undefined) delete process.env[key]
    else process.env[key] = SAVED[key]
  rmSync(TEMP, { recursive: true, force: true })
})

////////
// The kit and its child repo, each on `main`, each with a GitHub `origin`
mkdirSync(join(KIT, ".epic"), { recursive: true })
git(KIT, "init", "-q", "-b", "main")
git(KIT, "remote", "add", "origin", "git@github.com:spell-app/spell.git")
writeFileSync(join(KIT, ".gitignore"), "/spell-*/\n")
writeFileSync(
  join(KIT, "repos.json5"),
  '{ "repos": [{ "name": "spell-ui", "url": "git@x:spell-ui.git", "needs": [] }] }\n'
)
writeFileSync(
  join(KIT, ".epic", "config.json5"),
  JSON.stringify({ repos: "repos.json5", contentFolder: "../content", worktreesFolder: "../wt-folder" })
)
commit(KIT, "the kit")
mkdirSync(UI)
git(UI, "init", "-q", "-b", "main")
git(UI, "remote", "add", "origin", "https://github.com/spell-app/spell-ui.git")
commit(UI, "spell-ui:  first")
// the epic's worktree:  the kit's, the child's inside it, both on branch `x`
git(KIT, "worktree", "add", "-q", "-b", "x", WORKTREE)
git(UI, "worktree", "add", "-q", "-b", "x", join(WORKTREE, "spell-ui"))
mkdirSync(join(CONTENT, "epics", "x"), { recursive: true })
// the docs index the phase verb rewrites
mkdirSync(join(CONTENT, "pages"))

/** What the tool printed. */
let printed: string[] = []

/** The `epic` tool's commands on checkout `root`'s pages, their output caught in `printed`, no transcripts read. */
function commands(root: string): PlanDocCommands {
  const owner = new PlanDocCommands({ files: new PlanDocFiles({ root }), phaseTimer: () => 0 })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
  vi.spyOn(owner, "warn").mockImplementation((text) => void printed.push(text))
  return owner
}

/** `Requests.recordMerged()`'s `record`:  `epic <verb> ...` on checkout `root`, in this process. */
async function record(argv: string[], root: string): Promise<number> {
  const [verb, ...args] = argv
  for (const each of planDocArgs(verb!, args)) {
    const exitCode = await commands(root).run(each)
    if (exitCode) return exitCode
  }
  return 0
}

/** The page's commits:  `<where> <sha7> <repo or ->`, in page order. */
function listed(): string[] {
  const plan = new PlanDocFiles({ root: KIT }).read(PAGE)
  return Array.from(plan.document.querySelectorAll("epic-commit")).map((commit) => {
    const host = commit.parentElement!
    const where = host.localName === "epic-phase" ? `P${plan.phases.find((p) => p.id === host.id)?.number}` : host.id
    return `${where} ${commit.getAttribute("sha")!.slice(0, 7)} ${commit.getAttribute("repo") ?? "-"}`
  })
}

// git, the docs index and two page writes a test:  slow under a full run
describe("commits on the epic page by themselves (I135)", { timeout: 30_000 }, () => {
  /** The shas, by name. */
  const sha: Record<string, string> = {}

  test("phase ... done:  the branch's commits so far, into their phases and items;  another epic's left out", async () => {
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
    for (const name of ["One", "Two"]) plan.addPhase(name, { goal: `<ul><li>${name}'s goal</li></ul>` })
    await new PlanDocFiles({ root: KIT }).writeDoc(PAGE, plan, true)
    expect(await commands(KIT).run(["add", "x", "issue", "A bug"])).toBe(0)
    const item = /^I\d+$/.exec(printed.at(-1)!)![0].toLowerCase()

    sha.kitOne = commit(WORKTREE, "x P1:  One -- the kit's half")
    sha.uiOne = commit(join(WORKTREE, "spell-ui"), "x P1:  One -- the ui's half")
    sha.other = commit(join(WORKTREE, "spell-ui"), "other P1:  One -- another epic's")
    sha.plain = commit(WORKTREE, "unrelated work")
    printed = []
    expect(await commands(WORKTREE).run(["phase", "x", "1", "done", "--no-open"])).toBe(0)
    expect(printed).toContain("2 commits listed on the page")
    // the same second's commits, from two repos, in either order
    expect(listed().sort()).toEqual(
      [`P1 ${sha.kitOne!.slice(0, 7)} -`, `P1 ${sha.uiOne!.slice(0, 7)} https://github.com/spell-app/spell-ui`].sort()
    )
    // done again:  nothing twice
    printed = []
    expect(await commands(WORKTREE).run(["phase", "x", "1", "done", "--no-open"])).toBe(0)
    expect(printed.join("\n")).not.toMatch(/listed on the page/)

    sha.uiTwo = commit(join(WORKTREE, "spell-ui"), `x P2, ${item.toUpperCase()}:  Two -- the ui's fix`)
    sha.kitItem = commit(WORKTREE, `x ${item.toUpperCase()}:  the kit's fix`)
    sha.item = item
  })

  test("epic merge:  what it just merged, every repo's, each linking to its own;  none twice", async () => {
    const merged = Requests.mergeEach("x", KIT)
    expect(merged.map(({ repo, commits }) => `${repo} ${commits.length}`)).toEqual(["kit 3", "spell-ui 3"])
    printed = []
    await Requests.recordMerged("x", merged, { cwd: WORKTREE, record })
    const ui = "https://github.com/spell-app/spell-ui"
    expect(listed().sort()).toEqual(
      [
        `P1 ${sha.kitOne!.slice(0, 7)} -`,
        `P1 ${sha.uiOne!.slice(0, 7)} ${ui}`,
        `P2 ${sha.uiTwo!.slice(0, 7)} ${ui}`,
        `${sha.item} ${sha.uiTwo!.slice(0, 7)} ${ui}`,
        `${sha.item} ${sha.kitItem!.slice(0, 7)} -`
      ].sort()
    )
    expect(printed.at(-1)).toBe("3 commits added (6 merged)")
    expect(readFileSync(PAGE, "utf8")).toMatch(/repo="https:\/\/github\.com\/spell-app\/spell"/)
    printed = []
    await Requests.recordMerged("x", merged, { cwd: KIT, record })
    expect(printed.at(-1)).toBe("0 commits added (6 merged)")
    expect(listed()).toHaveLength(5)
  })

  test("best effort:  a failing record says so in one line, never throws;  nothing merged or no page, nothing run", async () => {
    const lines: string[] = []
    const write = vi.spyOn(process.stdout, "write").mockImplementation((text) => Boolean(lines.push(String(text))))
    try {
      const merged = [{ repo: "spell", base: "main", commits: ["abc1234 x P1:  One"], ditched: [] }]
      await Requests.recordMerged("x", merged, {
        cwd: KIT,
        record: () => Promise.reject(new Error("the page is locked"))
      })
      await Requests.recordMerged("x", merged, { cwd: KIT, record: () => Promise.resolve(1) })
      expect(lines).toEqual([
        "merged, but its commits aren't on the epic page (the page is locked):  epic commits x --backfill\n",
        "merged, but its commits aren't on the epic page:  epic commits x --backfill\n"
      ])
      const called = vi.fn(() => Promise.resolve(0))
      await Requests.recordMerged("x", [{ ...merged[0]!, commits: [] }], { cwd: KIT, record: called })
      await Requests.recordMerged("nope", merged, { cwd: KIT, record: called })
      expect(called).not.toHaveBeenCalled()
    } finally {
      write.mockRestore()
    }
  })
})

/** `git <args>` in `cwd`, its output trimmed. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

/** A commit in `cwd` with `message`, touching a file of its own;  returns its sha. */
function commit(cwd: string, message: string): string {
  writeFileSync(join(cwd, `${message.replace(/\W+/g, "-")}.txt`), message)
  git(cwd, "add", "-A")
  git(cwd, "commit", "-q", "-m", message)
  return git(cwd, "rev-parse", "HEAD")
}
