/**
 * Tests of `epic fresh all | status | drop` (`FreshCommands`, epic `epic-engine` T113) on a scratch checkout:  every
 * running epic session marked in a scratch epic home, the `TELL:` lines printed (never sent), the session running the
 * command marked to go last, and which go now and which later.
 * - The sessions are stubs, with no transcripts:  nothing is handed on, no window opened, no session messaged.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, expect, test, vi } from "vite-plus/test"

import { AFTER_FRESH, FreshAll } from "spell/epic/command/FreshAll"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** This checkout's root:  its `packages/` linked into the scratch one, as the focus tests do. */
const CHECKOUT = fileURLToPath(new URL("../..", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "plan-doc-fresh-"))
symlinkSync(join(CHECKOUT, "packages"), join(root, "packages"))
const FILES = new PlanDocFiles({ root })

const SEO = "0a1b2c3d-0000-4000-8000-000000000001"
const DOCS = "0a1b2c3d-0000-4000-8000-000000000002"
const ME = "0a1b2c3d-0000-4000-8000-000000000003"

let printed: string[]
let warned: string[]
let home: string
const homeBefore = process.env.SPELL_EPIC_HOME
const sessionBefore = process.env.CLAUDE_CODE_SESSION_ID

/** The commands, on the scratch checkout, their output caught;  the running sessions:  seo's, docs' and mine. */
function commands() {
  const running: Record<string, { name: string; sessionId: string }[]> = {
    seo: [{ name: "🚧 seo", sessionId: SEO }],
    docs: [
      { name: "🚧 docs", sessionId: DOCS },
      { name: "🚧 docs (me)", sessionId: ME }
    ]
  }
  const owner = new PlanDocCommands({ files: FILES, sessionsOf: async (epic) => running[epic] ?? [] })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(...text.split("\n")))
  vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
  return owner
}

/** Write epic `name`, in progress. */
async function writeEpic(name: string) {
  const file = join(root, "epics", name, `${name}.plan.html`)
  mkdirSync(join(root, "epics", name), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  for (const phase of ["One", "Two"]) plan.addPhase(phase, { goal: `<ul><li>${phase}'s goal</li></ul>` })
  await FILES.writeDoc(file, plan, true)
  await FILES.edit(file, (doc) => doc.setPhase(1, "active"))
}

beforeEach(async () => {
  printed = []
  warned = []
  home = mkdtempSync(join(tmpdir(), "fresh-home-"))
  process.env.SPELL_EPIC_HOME = home
  process.env.CLAUDE_CODE_SESSION_ID = ME
  await writeEpic("seo")
  await writeEpic("docs")
})
afterEach(() => {
  rmSync(home, { recursive: true, force: true })
  process.env.SPELL_EPIC_HOME = homeBefore
  if (sessionBefore === undefined) delete process.env.CLAUDE_CODE_SESSION_ID
  else process.env.CLAUDE_CODE_SESSION_ID = sessionBefore
})
afterAll(() => rmSync(root, { recursive: true, force: true }))

test("all:  every running epic session marked, this one last;  TELL lines;  now and later, with why", async () => {
  writeFileSync(join(root, "epics", "docs", "agents.json5"), '[{ name: "docs-pass" }]\n')
  try {
    expect(await commands().run(["fresh", "all"])).toBe(0)
  } finally {
    rmSync(join(root, "epics", "docs", "agents.json5"))
  }
  expect(FreshAll.pending(SEO)).toMatchObject({ epic: "seo" })
  expect(FreshAll.pending(DOCS)).toMatchObject({ epic: "docs" })
  expect(FreshAll.pending(ME)).toMatchObject({ epic: "docs", self: true })
  expect(FreshAll.pending(SEO)?.round).toBe(FreshAll.pending(ME)?.round)
  expect(printed).toContain(
    "TELL:  send each running session its line (SendMessage:  this command can't send them itself)"
  )
  expect(printed.filter((line) => line.startsWith("  to 🚧 "))).toHaveLength(2)
  expect(printed).toContainEqual(expect.stringMatching(/^  to 🚧 seo:  \/epic fresh all:  seo goes to a fresh session/))
  expect(printed).toContain("this session:  docs:  goes last, at its own next clear moment")
  expect(printed).toContain("now:  🚧 seo")
  expect(printed).toContain("  🚧 docs:  its agents are running (docs-pass)")
  expect(printed).toContain("  🚧 docs (me):  it's this session:  it goes last")
  expect(printed.at(-1)).toBe("sessions marked:  3 (1 now, 2 later)")
})

test("status and drop:  who still waits, and one let off", async () => {
  expect(await commands().run(["fresh", "status"])).toBe(0)
  expect(printed).toEqual(["no session waits to go fresh"])
  await commands().run(["fresh", "all", "--json"])
  printed = []
  expect(await commands().run(["fresh", "drop"])).toBe(0)
  expect(FreshAll.pending(ME)).toBeUndefined()
  expect(await commands().run(["fresh", "drop"])).toBe(1)
  expect(warned.at(-1)).toMatch(/isn't waiting to go fresh/)
  printed = []
  await commands().run(["fresh", "status", "--json"])
  const pending = JSON.parse(printed.join("\n"))
  expect(pending.map((one: { epic: string }) => one.epic).sort()).toEqual(["docs", "seo"])
})

test("later (T172):  marks this session to go once its agents are done;  queued lists the post-fresh list;  drop calls it off", async () => {
  const agents = join(root, "epics", "seo", "agents.json5")
  expect(await commands().run(["fresh", "later", "seo"])).toBe(1)
  expect(warned.at(-1)).toMatch(/none of seo's agents is running:  go fresh now/)
  expect(FreshAll.pending(ME)).toBeUndefined()
  writeFileSync(agents, '[{ name: "seo-docs", task: "the docs" }]\n')
  try {
    expect(await commands().run(["fresh", "later", "seo"])).toBe(0)
    expect(printed[0]).toBe("fresh as soon as seo-docs finish")
    expect(FreshAll.pending(ME)).toMatchObject({ epic: "seo", solo: true })
    // the post-fresh list:  items queued "after the fresh"
    const owner = commands()
    const itemId = await FILES.edit(FILES.findDoc("seo"), (doc) => doc.addItem("todo", "Add a dark theme"))
    await owner.run(["queue", "seo", itemId, AFTER_FRESH])
    printed = []
    expect(await commands().run(["fresh", "queued", "seo"])).toBe(0)
    expect(printed[0]).toMatch(/queued for seo's fresh session/)
    expect(printed[1]).toMatch(/Add a dark theme/)
    printed = []
    await commands().run(["fresh", "status"])
    expect(printed[0]).toMatch(/seo \(0a1b2c3d\):  its agents are running \(seo-docs\)  \(its own \/epic fresh/)
    expect(printed.join("\n")).toMatch(/Add a dark theme/)
    printed = []
    expect(await commands().run(["fresh", "drop"])).toBe(0)
    expect(FreshAll.pending(ME)).toBeUndefined()
    expect(printed.join("\n")).toMatch(/take these up yourself[\s\S]*Add a dark theme/)
  } finally {
    rmSync(agents, { force: true })
  }
})
