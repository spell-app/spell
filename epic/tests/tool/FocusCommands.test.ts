/**
 * Tests of `epic focus on | off | status | summary` (`FocusCommands`, `FocusMode`, `FocusSummary`;  epic `epic-engine`
 * T93) on a scratch checkout:  the switch in a scratch epic home, the `TELL:` lines printed for each running epic
 * session (never sent), the session running the command left out, and what happened since focus started.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { FocusMode } from "spell/epic/config/FocusMode"
import { FocusSummary } from "spell/epic/tool/FocusSummary"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** This checkout's root:  its `packages/` linked into the scratch one, as the migrate tests do. */
const CHECKOUT = fileURLToPath(new URL("../..", import.meta.url))

/** A scratch checkout:  its own `epics/`. */
const root = mkdtempSync(join(tmpdir(), "plan-doc-focus-"))
symlinkSync(join(CHECKOUT, "packages"), join(root, "packages"))
const FILES = new PlanDocFiles({ root })

/** What the commands printed, on stdout and stderr. */
let printed: string[]
let warned: string[]

/** The epic home before each test:  each test gets its own, so the switch starts unset. */
let home: string
const homeBefore = process.env.SPELL_EPIC_HOME
const sessionBefore = process.env.CLAUDE_CODE_SESSION_ID

/** The commands, on the scratch checkout, their output caught;  `running`:  each epic's sessions' names. */
function commands(running: Record<string, string[]> = {}) {
  const sessionsOf = async (epic: string) =>
    (running[epic] ?? []).map((name, at) => ({ name, sessionId: `${epic}-${at}` }))
  const owner = new PlanDocCommands({ files: FILES, sessionsOf })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(...text.split("\n")))
  vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
  return owner
}

/** Epic `name`'s doc in the scratch checkout. */
const docOf = (name: string) => join(root, "epics", name, `${name}.plan.html`)

/** Write epic `name`:  two phases, the first under way, so it's in progress. */
async function writeEpic(name: string) {
  mkdirSync(join(root, "epics", name), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  for (const phase of ["One", "Two"]) plan.addPhase(phase, { goal: `<ul><li>${phase}'s goal</li></ul>` })
  await FILES.writeDoc(docOf(name), plan, true)
  await FILES.edit(docOf(name), (doc) => doc.setPhase(1, "active"))
}

beforeEach(() => {
  printed = []
  warned = []
  home = mkdtempSync(join(tmpdir(), "focus-home-"))
  process.env.SPELL_EPIC_HOME = home
  process.env.CLAUDE_CODE_SESSION_ID = "seo-0"
})
afterEach(() => {
  rmSync(home, { recursive: true, force: true })
  process.env.SPELL_EPIC_HOME = homeBefore
  if (sessionBefore === undefined) delete process.env.CLAUDE_CODE_SESSION_ID
  else process.env.CLAUDE_CODE_SESSION_ID = sessionBefore
})
afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("FocusMode", () => {
  test("on keeps its start and takes a new why;  off keeps the times;  never on:  nothing", () => {
    expect(FocusMode.read()).toBeUndefined()
    expect(FocusMode.off()).toBeUndefined()
    const on = FocusMode.on({ why: "the demo", now: new Date("2026-11-17T14:30:00Z") })
    expect(on).toEqual({ on: true, since: "2026-11-17T14:30:00.000Z", why: "the demo" })
    expect(FocusMode.on({ now: new Date("2026-11-17T15:00:00Z") })).toEqual(on)
    expect(FocusMode.isOn).toBe(true)
    const off = FocusMode.off(new Date("2026-11-17T16:10:00Z"))
    expect(off).toMatchObject({ on: false, since: on.since, ended: "2026-11-17T16:10:00.000Z" })
    expect(FocusMode.isOn).toBe(false)
    expect(FocusMode.read()).toEqual(off)
  })

  test("the lines:  ask nothing until /back;  /back names its summary command;  the hook's notice only while on", () => {
    const state = FocusMode.on({ why: "the demo" })
    expect(FocusMode.onMessage(state)).toMatch(/^\/focus:  .*\(the demo\).*Ask him NOTHING until the \/back line/)
    expect(FocusMode.backMessage("seo", state)).toContain(`\`epic focus summary seo --since ${state.since}\``)
    expect(FocusMode.notice()?.claude).toContain("If this is an epic's session")
    FocusMode.off()
    expect(FocusMode.notice()).toBeUndefined()
  })
})

describe("epic focus", () => {
  test("status:  off, never on;  then on, with its why", async () => {
    expect(await commands().run(["focus"])).toBe(0)
    expect(printed).toEqual(["focus off (never on)"])
    FocusMode.on({ why: "the demo" })
    printed = []
    expect(await commands().run(["focus", "status", "--json"])).toBe(0)
    expect(JSON.parse(printed.join("\n"))).toMatchObject({ on: true, why: "the demo" })
  })

  test("on:  a TELL line per running epic session, printed, never sent;  this session's own epic named", async () => {
    await writeEpic("seo")
    await writeEpic("docs")
    await writeEpic("idle")
    const owner = commands({ seo: ["🚧 seo"], docs: ["🚧 docs"] })
    expect(await owner.run(["focus", "on", "--why", "the demo"])).toBe(0)
    expect(printed[0]).toMatch(/^focus on since .*:  the demo$/)
    expect(printed[1]).toMatch(/^TELL:  send each running session its line/)
    expect(printed.filter((line) => line.startsWith("  to "))).toEqual([
      `  to 🚧 docs:  ${FocusMode.onMessage(FocusMode.read()!)}`
    ])
    // the session running it (CLAUDE_CODE_SESSION_ID seo-0) is seo's:  left out, and named
    expect(printed).toContain("this session:  seo:  follow the focus line yourself until /back")
    expect(printed.at(-1)).toBe("sessions to tell:  1")
  })

  test("off:  refused while off;  then a /back line per running session, and the idle epics with news", async () => {
    expect(await commands().run(["focus", "off"])).toBe(1)
    expect(warned).toEqual(["epic:  focus mode isn't on"])
    await writeEpic("busy")
    await writeEpic("quiet")
    FocusMode.on({ now: new Date(Date.now() - 60_000) })
    await FILES.edit(docOf("quiet"), (doc) => doc.addItem("judgement", "Kept the old routes for now"))
    expect(await commands({ busy: ["🚧 busy"] }).run(["focus", "off"])).toBe(0)
    expect(printed.find((line) => line.startsWith("  to 🚧 busy:  /back:"))).toContain("epic focus summary busy")
    expect(printed).toContain("NO SESSION:  epics with news and nobody running them")
    expect(printed.find((line) => line.startsWith("  quiet:  "))).toMatch(/waiting on you/)
  })

  test("summary:  what waits on Owen first, since --since;  nothing since:  said so", async () => {
    await writeEpic("seo")
    const since = new Date(Date.now() - 60_000).toISOString()
    await FILES.edit(docOf("seo"), (doc) => doc.addItem("question", "Which sitemap?"))
    expect(await commands().run(["focus", "summary", "seo", "--since", since])).toBe(0)
    expect(printed[0]).toMatch(/^seo · .*, since /)
    expect(printed).toContain("## Waiting on you")
    expect(printed.some((line) => /^- Q\d+ · Which sitemap\? -- needs your call$/.test(line))).toBe(true)
    printed = []
    const later = new Date(Date.now() + 60_000).toISOString()
    expect(await commands().run(["focus", "summary", "seo", "--since", later, "--json"])).toBe(0)
    const summary = JSON.parse(printed.join("\n"))
    expect(FocusSummary.isEmpty(summary)).toBe(true)
    expect(FocusSummary.oneLine(summary)).toBe("seo:  nothing new")
  })

  test("summary with no --since and focus never on:  refused, saying why", async () => {
    await writeEpic("seo")
    expect(await commands().run(["focus", "summary", "seo"])).toBe(1)
    expect(warned[0]).toMatch(/since when\?/)
  })
})
