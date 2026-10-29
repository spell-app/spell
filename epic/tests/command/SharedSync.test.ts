/**
 * Tests of the content repo's sync (`Shared.sync()`, `SharedSync`;  epic `epic-friend` P5):  two people, Ana and Ben,
 * each a checkout with a clone of ONE bare remote, all in a temp folder;  no network, never Spell's own content repo.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, test } from "vite-plus/test"

import { Shared } from "spell/epic/command/Shared"
import { SyncState } from "spell/epic/command/SyncState"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("../tool/fixtures", import.meta.url))

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "shared-sync-")))
const REMOTE = join(TEMP, "plans.git")
const EPIC = "seo"
process.env.SPELL_EPIC_HOME = join(TEMP, "home")
for (const [key, value] of Object.entries({ NAME: "Test", EMAIL: "test@example.com" })) {
  process.env[`GIT_AUTHOR_${key}`] = value
  process.env[`GIT_COMMITTER_${key}`] = value
}
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

git(TEMP, "init", "-q", "--bare", "-b", "main", REMOTE)

/** One person's checkout:  a repo whose config names the content folder and its remote, the content repo in it. */
function person(name: string, { remote = REMOTE }: { remote?: string } = {}) {
  const main = join(TEMP, name)
  mkdirSync(join(main, ".epic"), { recursive: true })
  git(main, "init", "-q", "-b", "main")
  writeFileSync(
    join(main, ".epic", "config.json5"),
    JSON.stringify({ contentFolder: "plans", contentRemote: remote, sharedFolders: [] })
  )
  const dir = join(main, "plans")
  const shared = new Shared({ checkout: main, config: { main, dir, worktrees: [], links: [] } })
  const files = new PlanDocFiles({ root: main, content: dir })
  const doc = join(dir, "epics", EPIC, `${EPIC}.plan.html`)
  return { main, dir, shared, files, doc }
}

/** Run `git <args>` in `cwd`;  its output, trimmed. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim()
}

const ana = person("ana")
const ben = person("ben")

/** Every item id on a person's page, in page order. */
function itemIds(who: typeof ana): string[] {
  return [...readFileSync(who.doc, "utf8").matchAll(/<epic-item\b[^>]*?\sid="([a-z]+\d+)"/g)].map((m) => m[1]!)
}

////////////////
// ## Tests
////////////////

describe("Shared.sync()", () => {
  test("the first person:  the content repo made, its own files written, the epic page pushed", async () => {
    ana.shared.init()
    expect(ana.shared.publish(REMOTE)).toBeUndefined()
    // the remote's own branch is the first person's (`git init`'s default, whatever this machine's is)
    git(REMOTE, "symbolic-ref", "HEAD", `refs/heads/${git(ana.dir, "branch", "--show-current")}`)
    mkdirSync(join(ana.dir, "epics", EPIC), { recursive: true })
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
    plan.addPhase("One", { goal: "<ul><li>its goal</li></ul>" })
    plan.addItem("question", "which way?")
    await ana.files.writeDoc(ana.doc, plan, true)
    const { commits, sync } = await ana.shared.sync()
    expect(commits.length).toBeGreaterThan(0)
    expect(sync).toMatchObject({ result: "synced", pushed: true })
    expect(readFileSync(join(ana.dir, ".gitattributes"), "utf8")).toMatch(
      /^epics\/\*\*\/parts\/log\.html merge=union$/m
    )
    expect(git(REMOTE, "rev-parse", "HEAD")).toBe(git(ana.dir, "rev-parse", "HEAD"))
  })

  test("a later person clones it:  up to date", async () => {
    expect(ben.shared.clone(REMOTE)).toBeUndefined()
    expect((await ben.shared.sync()).sync).toMatchObject({ result: "up to date" })
  })

  test("both add a todo, a change mark and a request:  after the sync no id twice, the LOCAL ones renumbered, links following, both logs kept in time order", async () => {
    for (const [who, words] of [
      [ana, "Ana's"],
      [ben, "Ben's"]
    ] as const) {
      await who.files.edit(who.doc, (plan) => {
        const id = plan.addItem("todo", `${words} todo`, {
          details: `<p><epic-change item="q1">${words} words</epic-change></p>`
        })
        plan.addItem("todo", `${words} second`, { details: `<p>after <a href="#${id}">${id.toUpperCase()}</a></p>` })
        plan.addPhaseRequest(1, "r1", "a session", `<p><a href="requests/r1/request.md">${words} request</a></p>`)
      })
      const folder = join(who.dir, "epics", EPIC, "requests", "r1")
      mkdirSync(folder, { recursive: true })
      writeFileSync(join(folder, "request.md"), `---\nid: r1\nepic: ${EPIC}\n---\n\n${words} request\n`)
    }
    // Ana syncs first;  Ben's are the ones renumbered
    expect((await ana.shared.sync()).sync).toMatchObject({ result: "synced" })
    const { sync } = await ben.shared.sync()
    expect(sync).toMatchObject({
      result: "synced",
      renumbered: [{ epic: EPIC, renames: { t1: "t3", t2: "t4", ch1: "ch2", r1: "r2" } }]
    })
    const page = readFileSync(ben.doc, "utf8")
    expect(itemIds(ben)).toEqual(expect.arrayContaining(["q1", "t1", "t2", "t3", "t4"]))
    expect(new Set(itemIds(ben)).size).toBe(itemIds(ben).length)
    const parts = join(ben.dir, "epics", EPIC, "parts")
    expect(readFileSync(join(parts, "t3.html"), "utf8")).toMatch(/id="ch2"[^>]*>Ben's words/)
    expect(readFileSync(join(parts, "t4.html"), "utf8")).toMatch(/href="#t3"/)
    expect(readFileSync(join(parts, "t1.html"), "utf8")).toMatch(/Ana's words/)
    expect(readFileSync(join(ben.dir, "epics", EPIC, "requests", "r2", "request.md"), "utf8")).toMatch(/^id: r2$/m)
    expect(ben.files.read(ben.doc).check()).toEqual([])
    const phase = readFileSync(join(parts, "p-one.html"), "utf8")
    expect(phase).toMatch(/label="r1 · [\s\S]*Ana's request[\s\S]*label="r2 · [\s\S]*requests\/r2\/request\.md/)
    // the log:  both people's lines, Ben's renumbering line, in time order
    const log = readFileSync(join(parts, "log.html"), "utf8")
    expect(log).toMatch(/Renumbered as the plans synced: CH1 → CH2, R1 → R2, T1 → T3, T2 → T4/)
    const times = [...log.matchAll(/<epic-event at="([^"]+)"/g)].map((m) => Date.parse(m[1]!))
    expect(times).toEqual([...times].sort((a, b) => a - b))
    // Ana's next sync takes it all:  the two pages the same
    expect((await ana.shared.sync()).sync).toMatchObject({ result: "synced" })
    expect(readFileSync(ana.doc, "utf8")).toBe(page)
    expect(git(ana.dir, "status", "--porcelain")).toBe("")
  })

  test("offline:  the commit stands, and the next sync pushes it", async () => {
    git(ben.dir, "remote", "set-url", "origin", join(TEMP, "gone.git"))
    await ben.files.edit(ben.doc, (plan) => void plan.addItem("todo", "written on a plane"))
    const offline = await ben.shared.sync()
    expect(offline.commits.length).toBe(1)
    expect(offline.sync).toMatchObject({ result: "offline" })
    expect(SyncState.notice(ben.dir)).toBeUndefined()
    git(ben.dir, "remote", "set-url", "origin", REMOTE)
    expect((await ben.shared.sync()).sync).toMatchObject({ result: "synced", pushed: true })
    expect(git(REMOTE, "log", "-1", "--format=%s", "HEAD")).toBe(git(ben.dir, "log", "-1", "--format=%s"))
  })

  test("a conflict it can't settle:  the rebase undone, the commits kept, the state file and the notice say which files", async () => {
    await ana.shared.sync()
    await ana.files.edit(ana.doc, (plan) => void plan.renameEntry("q1", "Ana's way?"))
    await ben.files.edit(ben.doc, (plan) => void plan.renameEntry("q1", "Ben's way?"))
    await ana.shared.sync()
    ben.shared.commit()
    const head = git(ben.dir, "rev-parse", "HEAD")
    const { sync } = await ben.shared.sync()
    expect(sync?.result).toBe("conflict")
    expect(sync?.files).toContain(`epics/${EPIC}/${EPIC}.plan.html`)
    expect(existsSync(join(ben.dir, ".git", "rebase-merge"))).toBe(false)
    expect(git(ben.dir, "rev-parse", "HEAD")).toBe(head)
    expect(SyncState.read(ben.dir)).toMatchObject({ result: "conflict", files: sync?.files })
    expect(SyncState.notice(ben.dir)?.person).toContain(`epics/${EPIC}/${EPIC}.plan.html`)
    expect(SyncState.notice(ben.dir)?.claude).toMatch(/git rebase --continue/)
  })

  test("no contentRemote in the config:  commits, never syncs, even with an origin;  `sync` refuses", async () => {
    const quiet = person("quiet", { remote: "" })
    expect(quiet.shared.clone(REMOTE)).toBeUndefined()
    expect(quiet.shared.remote).toBe(REMOTE)
    expect(quiet.shared.syncsWith).toBe("")
    writeFileSync(join(quiet.dir, "note.md"), "mine\n")
    const before = git(REMOTE, "rev-parse", "HEAD")
    expect(await quiet.shared.sync()).toEqual({ commits: [expect.any(String)] })
    expect(git(REMOTE, "rev-parse", "HEAD")).toBe(before)
    await expect(quiet.shared.run(["sync"])).rejects.toThrow(/contentRemote/)
  })
})

describe("Shared.keepRepoFiles()", () => {
  test("an old unmarked .gitignore (spell dev shared init's) becomes the marked block;  the team's lines kept;  again:  nothing", () => {
    const { shared, dir } = person("files", { remote: "" })
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, ".gitignore"),
      "# written by `spell dev shared init`\n*.lock\npackages/docs/content/details/\n"
    )
    expect(shared.keepRepoFiles()).toEqual([".gitignore", ".gitattributes"])
    const ignore = readFileSync(join(dir, ".gitignore"), "utf8")
    expect(ignore).toMatch(/^# epic:start/)
    expect(ignore).not.toContain("packages/docs")
    writeFileSync(join(dir, ".gitignore"), `${ignore}\n# ours\n/scratch/\n`)
    writeFileSync(join(dir, ".gitattributes"), `*.png binary\n${readFileSync(join(dir, ".gitattributes"), "utf8")}`)
    expect(shared.keepRepoFiles()).toEqual([])
    expect(readFileSync(join(dir, ".gitignore"), "utf8")).toContain("/scratch/")
    expect(readFileSync(join(dir, ".gitattributes"), "utf8")).toMatch(/^\*\.png binary$/m)
  })
})
