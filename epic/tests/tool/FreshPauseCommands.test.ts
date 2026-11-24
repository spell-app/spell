/**
 * `epic fresh all --pause | quiet | wait | cancel`, and `epic fresh all`'s gate (`FreshPauseCommands`, epic
 * `epic-engine` T139), on a scratch checkout, epic home and Claude folder.
 * - The sessions are stubs and the `TELL:` lines only printed:  no session is messaged, paused or moved.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, expect, test, vi } from "vite-plus/test"

import { FreshAll } from "spell/epic/command/FreshAll"
import { FreshPause } from "spell/epic/command/FreshPause"
import { Turns, type OwnRun } from "spell/epic/command/Turns"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "plan-doc-pause-"))
const FILES = new PlanDocFiles({ root })

const SEO = "0a1b2c3d-0000-4000-8000-000000000001"
const DOCS = "0a1b2c3d-0000-4000-8000-000000000002"
const ME = "0a1b2c3d-0000-4000-8000-000000000003"
const LATE = "0a1b2c3d-0000-4000-8000-000000000004"
const OUTSIDE = "0a1b2c3d-0000-4000-8000-000000000005"

/** Every environment variable these tests set, as it was. */
const before = { ...process.env }

let running: Record<string, { name: string; sessionId: string }[]>
let printed: string[]
let warned: string[]
let scratch: string

/** Run `epic fresh <args>` as session `me`;  resolves to its exit code, its output caught. */
async function fresh(me: string, ...args: string[]): Promise<number> {
  printed = []
  warned = []
  process.env.CLAUDE_CODE_SESSION_ID = me
  const owner = new PlanDocCommands({ files: FILES, sessionsOf: async (epic) => running[epic] ?? [] })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(...text.split("\n")))
  vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
  return owner.run(["fresh", ...args])
}

/** The sessions the last command said to message. */
function told(): string[] {
  return printed.flatMap((line) => /^ {2}to (.+?): {2}/.exec(line)?.slice(1) ?? [])
}

/** Epic `epic`'s agents list. */
function listAgents(epic: string, agents: object[]) {
  writeFileSync(join(root, "epics", epic, "agents.json5"), JSON.stringify(agents))
}

/** Write epic `name`, in progress, no agents. */
async function writeEpic(name: string) {
  const file = join(root, "epics", name, `${name}.plan.html`)
  mkdirSync(join(root, "epics", name), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  plan.addPhase("One", { goal: "<ul><li>One's goal</li></ul>" })
  await FILES.writeDoc(file, plan, true)
  await FILES.edit(file, (doc) => doc.setPhase(1, "active"))
  listAgents(name, [])
}

beforeEach(async () => {
  scratch = mkdtempSync(join(tmpdir(), "fresh-pause-home-"))
  process.env.SPELL_EPIC_HOME = join(scratch, "epic")
  process.env.CLAUDE_CONFIG_DIR = join(scratch, "claude")
  running = {
    seo: [{ name: "🚧 seo", sessionId: SEO }],
    docs: [
      { name: "🚧 docs", sessionId: DOCS },
      { name: "🚧 docs (me)", sessionId: ME }
    ]
  }
  await writeEpic("seo")
  await writeEpic("docs")
})
afterEach(() => {
  vi.restoreAllMocks()
  for (const name of ["SPELL_EPIC_HOME", "CLAUDE_CONFIG_DIR", "CLAUDE_CODE_SESSION_ID"]) {
    if (before[name] === undefined) delete process.env[name]
    else process.env[name] = before[name]
  }
  rmSync(scratch, { recursive: true, force: true })
})
afterAll(() => rmSync(root, { recursive: true, force: true }))

////////////////
// ## Starting
////////////////

test("all --pause:  the initiator recorded, every other session told, NOBODY marked to go fresh", async () => {
  expect(await fresh(ME, "all", "--pause")).toBe(0)
  expect(FreshPause.round()).toMatchObject({ initiator: { session: "🚧 docs (me)", sessionId: ME, epic: "docs" } })
  expect(told().sort()).toEqual(["🚧 docs", "🚧 seo"])
  const line = printed.find((each) => each.startsWith("  to 🚧 seo:"))
  expect(line).toContain("we are going to start epic fresh ASAP")
  for (const step of ["epic turns stop test", "epic agents pause", "NEVER while a merge", "epic fresh quiet"])
    expect(line).toContain(step)
  expect(printed).toContainEqual(expect.stringMatching(/^this session: {2}docs: {2}pause its agents now/))
  expect(FreshAll.allPending()).toEqual([])
})

test("all --pause from a session no epic runs:  still who they report back to, by its address", async () => {
  mkdirSync(join(scratch, "claude", "sessions"), { recursive: true })
  const record = { pid: process.pid, sessionId: OUTSIDE, name: "tidy up" }
  writeFileSync(join(scratch, "claude", "sessions", "1.json"), JSON.stringify(record))
  await fresh(OUTSIDE, "all", "--pause")
  expect(FreshPause.round()?.initiator).toEqual({ session: "tidy up", sessionId: OUTSIDE })
  await fresh(SEO, "quiet")
  expect(told()).toEqual(["tidy up"])
})

test("all --pause again:  only those not quiet, and whoever started since, are told", async () => {
  await fresh(ME, "all", "--pause")
  await fresh(SEO, "quiet")
  running.docs!.push({ name: "🚧 docs (late)", sessionId: LATE })
  await fresh(ME, "all", "--pause")
  expect(told().sort()).toEqual(["🚧 docs", "🚧 docs (late)"])
  expect(FreshPause.round()?.sessions).toHaveLength(4)
})

test("all --pause from another session:  refused, until the one that started it has exited", async () => {
  await fresh(ME, "all", "--pause")
  expect(await fresh(SEO, "all", "--pause")).toBe(1)
  expect(warned.join()).toContain("already started a pause")
  running.docs!.pop()
  expect(await fresh(SEO, "all", "--pause")).toBe(0)
  expect(FreshPause.round()?.initiator.sessionId).toBe(SEO)
})

test("all --pause with no session to report back to:  refused, no round", async () => {
  expect(await fresh("", "all", "--pause")).toBe(1)
  expect(FreshPause.round()).toBeUndefined()
})

////////////////
// ## Reporting back
////////////////

test("quiet:  refused while agents run;  paused, the line for the initiator names what was saved", async () => {
  await fresh(ME, "all", "--pause")
  listAgents("seo", [{ name: "seo-fix" }])
  expect(await fresh(SEO, "quiet")).toBe(1)
  expect(warned.join()).toContain("seo-fix")
  listAgents("seo", [{ name: "seo-fix", paused: { next: "the tests" } }])
  expect(await fresh(SEO, "quiet")).toBe(0)
  expect(told()).toEqual(["🚧 docs (me)"])
  expect(printed.at(-1)).toContain("seo is quiet (paused and saved:  seo-fix)")
})

test("quiet:  refused while a merge of its own runs, so none is killed half way", async () => {
  await fresh(ME, "all", "--pause")
  const merge: OwnRun = { kind: "merge", pid: 42, label: "epic merge seo", waiting: false }
  vi.spyOn(Turns, "runsOf").mockReturnValue([merge])
  expect(await fresh(SEO, "quiet")).toBe(1)
  expect(warned.join()).toContain("let a merge finish")
})

test("quiet:  two sessions on one epic, the last to report answers for its agents", async () => {
  await fresh(ME, "all", "--pause")
  listAgents("docs", [{ name: "docs-pass" }])
  expect(await fresh(DOCS, "quiet")).toBe(0)
  expect(await fresh(ME, "quiet")).toBe(1)
})

test("quiet with no round, or from a session not in it:  refused", async () => {
  expect(await fresh(SEO, "quiet")).toBe(1)
  await fresh(ME, "all", "--pause")
  expect(await fresh(LATE, "quiet")).toBe(1)
})

test("status:  who is quiet and who is outstanding", async () => {
  await fresh(ME, "all", "--pause")
  await fresh(SEO, "quiet")
  expect(await fresh(ME, "status")).toBe(0)
  expect(printed.slice(0, 3)).toEqual([
    "Pausing every session before each restarts fresh.  🚧 docs (me) started it.",
    "Ready:",
    "  🚧 seo:  paused"
  ])
  expect(printed).toContain("Still waiting for:")
  expect(printed.at(-2)).toBe("No session restarts until every one has paused.")
  await fresh(ME, "status", "--json")
  expect(JSON.parse(printed.join("\n"))).toMatchObject({ allQuiet: false, pause: { initiator: { sessionId: ME } } })
})

test("wait:  no round 3;  time up 2, naming who's outstanding and skipping nobody;  all quiet 0", async () => {
  expect(await fresh(ME, "wait")).toBe(3)
  await fresh(ME, "all", "--pause")
  expect(await fresh(ME, "wait", "--max", "0")).toBe(2)
  expect(printed).toContainEqual(expect.stringMatching(/^ {2}🚧 seo: {2}hasn't said it's paused/))
  expect(FreshPause.round()?.sessions).toHaveLength(3)
  for (const session of [SEO, DOCS, ME]) await fresh(session, "quiet")
  expect(await fresh(ME, "wait", "--max", "0")).toBe(0)
  expect(await fresh(ME, "wait", "--max", "soon")).toBe(1)
})

////////////////
// ## Going fresh
////////////////

test("all:  NOT before all are quiet, naming who isn't;  nor from another session", async () => {
  await fresh(ME, "all", "--pause")
  await fresh(SEO, "quiet")
  expect(await fresh(ME, "all")).toBe(1)
  expect(warned).toContainEqual(expect.stringMatching(/^ {2}🚧 docs: {2}hasn't said it's paused/))
  expect(FreshAll.allPending()).toEqual([])
  for (const session of [DOCS, ME]) await fresh(session, "quiet")
  expect(await fresh(SEO, "all")).toBe(1)
  expect(FreshPause.round()).toBeDefined()
})

test("all, all quiet:  the ordinary marks, paused, the round over;  paused agents don't make it wait", async () => {
  await fresh(ME, "all", "--pause")
  listAgents("seo", [{ name: "seo-fix", paused: { next: "the tests" } }])
  for (const session of [SEO, DOCS, ME]) await fresh(session, "quiet")
  expect(await fresh(ME, "all")).toBe(0)
  expect(FreshPause.round()).toBeUndefined()
  expect(FreshAll.pending(SEO)).toMatchObject({ epic: "seo", paused: true })
  expect(FreshAll.pending(ME)).toMatchObject({ self: true, paused: true })
  expect(printed).toContainEqual(expect.stringMatching(/to 🚧 seo:.*paused agents stay saved/))
  expect(printed).toContainEqual(expect.stringMatching(/^now:.*🚧 seo/))
  // run again before they've gone:  still paused
  await fresh(ME, "all")
  expect(FreshAll.pending(SEO)?.paused).toBe(true)
})

test("all:  a session that exited doesn't hold it up, nor get marked", async () => {
  await fresh(ME, "all", "--pause")
  for (const session of [DOCS, ME]) await fresh(session, "quiet")
  delete running.seo
  expect(await fresh(ME, "all")).toBe(0)
  expect(FreshAll.pending(SEO)).toBeUndefined()
})

test("all:  the initiator exited, anyone may finish the round once all are quiet", async () => {
  await fresh(ME, "all", "--pause")
  for (const session of [SEO, DOCS]) await fresh(session, "quiet")
  running.docs!.pop()
  expect(await fresh(SEO, "all")).toBe(0)
})

test("no pause:  all marks nobody paused and says nothing of one", async () => {
  expect(await fresh(ME, "all")).toBe(0)
  for (const { mark } of FreshAll.allPending()) expect(mark.paused).toBeUndefined()
  expect(printed.join("\n")).not.toMatch(/pause/i)
})

////////////////
// ## Calling it off
////////////////

test("cancel:  the round over, every session told to resume, the initiator too", async () => {
  await fresh(ME, "all", "--pause")
  expect(await fresh(SEO, "cancel")).toBe(0)
  expect(FreshPause.round()).toBeUndefined()
  expect(told().sort()).toEqual(["🚧 docs", "🚧 docs (me)"])
  expect(printed.join("\n")).toContain("epic agents resume")
})

test("cancel after all:  the paused sessions still waiting no longer go fresh", async () => {
  await fresh(ME, "all", "--pause")
  for (const session of [SEO, DOCS, ME]) await fresh(session, "quiet")
  await fresh(ME, "all")
  expect(await fresh(ME, "cancel")).toBe(0)
  expect(FreshAll.allPending()).toEqual([])
})

test("cancel with no pause:  refused, an ordinary fresh all left as it was", async () => {
  await fresh(ME, "all")
  expect(await fresh(ME, "cancel")).toBe(1)
  expect(FreshAll.allPending()).toHaveLength(3)
})

test("drop of a paused session says to resume its agents", async () => {
  FreshAll.mark(SEO, "seo", { paused: true })
  expect(await fresh(SEO, "drop")).toBe(0)
  expect(printed.at(-1)).toContain("epic agents resume")
})
