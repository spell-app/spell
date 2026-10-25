/**
 * `WorkTime` (epic `epic-engine` P41):  a phase's time and an agent's, from the transcripts in Claude Code's folder.
 * - a scratch folder:  an epic's session (`🚧 seo`), and the background agents it started, in its `subagents/`
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { WorkTime } from "spell-epic/command/WorkTime"

import { transcript, type Line } from "./transcripts"

const HOME = mkdtempSync(join(tmpdir(), "work-time-"))
afterAll(() => rmSync(HOME, { recursive: true, force: true }))

/** The session's id, and its project folder. */
const SESSION = "s-seo"
const PROJECT = join(HOME, "projects", "-repo")

/** Write session `SESSION`'s transcript (titled `🚧 seo`), and its agents, each `[description, lines]`. */
function writeSession(lines: Line[], agents: [string, Line[]][] = []): void {
  rmSync(join(PROJECT, SESSION), { recursive: true, force: true })
  mkdirSync(join(PROJECT, SESSION, "subagents"), { recursive: true })
  const title = JSON.stringify({ type: "custom-title", customTitle: "🚧 seo", sessionId: SESSION })
  writeFileSync(join(PROJECT, `${SESSION}.jsonl`), `${title}\n${transcript(lines)}`)
  agents.forEach(([description, agentLines], at) => {
    const base = join(PROJECT, SESSION, "subagents", `agent-a${at}`)
    writeFileSync(`${base}.meta.json`, JSON.stringify({ agentType: "general-purpose", description }))
    writeFileSync(`${base}.jsonl`, transcript(agentLines))
  })
}

/** 2026-10-25 at `at` (`HH:MM`, UTC), in ms. */
const at = (time: string) => Date.parse(`2026-10-25T${time}:00Z`)

/** The session:  a turn launching P3's agent (10:00-10:02), then idle;  a turn of its own, 11:00-11:10. */
const SESSION_LINES: Line[] = [
  { at: "10:00:00", owen: "Build P3" },
  { at: "10:02:00", says: "Started seo-p3." },
  { at: "11:00:00", owen: "Fix the docs" },
  { at: "11:10:00", says: "Fixed." }
]

/** A run of `minutes` minutes of an agent's work from `start` (`HH:MM`):  a line every minute. */
function agentRun(start: string, minutes: number): Line[] {
  const [hours, mins] = start.split(":").map(Number)
  const time = (minute: number) => new Date(Date.UTC(2026, 9, 25, hours!, mins! + minute)).toISOString().slice(11, 19)
  const work: Line[] = Array.from({ length: minutes }, (_, minute) => ({ at: time(minute + 1), says: "..." }))
  return [{ at: time(0), owen: "You are the background agent" }, ...work]
}

describe("ofPhase()", () => {
  test("a phase built by its own agents:  their time, side by side counted once;  other agents left out", () => {
    writeSession(SESSION_LINES, [
      ["seo-p3: build P3 Sitemap", agentRun("10:01", 20)],
      ["seo-p3-docs: docs for P3", agentRun("10:11", 20)],
      ["seo-p30: build P30", agentRun("10:05", 50)],
      ["seo-plans: rename phases", agentRun("10:05", 50)]
    ])
    const time = new WorkTime({ home: HOME }).ofPhase({
      epic: "seo",
      phase: "P3",
      window: { from: at("10:00"), to: at("10:40") }
    })
    // 10:01-10:31:  the two runs overlap 10:11-10:21
    expect(time).toEqual({ minutes: 30, agents: ["seo-p3", "seo-p3-docs"], sessions: [] })
  })

  test("a phase built in the session:  its turns while active, never the hour it sat waiting", () => {
    writeSession(SESSION_LINES)
    const time = new WorkTime({ home: HOME }).ofPhase({
      epic: "seo",
      phase: "P4",
      window: { from: at("09:59"), to: at("11:30") }
    })
    expect(time).toEqual({ minutes: 12, agents: [], sessions: [SESSION] })
  })

  test("an agent named for the phase that ran outside it doesn't count", () => {
    writeSession(SESSION_LINES, [["seo-p3: build P3", agentRun("08:00", 20)]])
    const time = new WorkTime({ home: HOME }).ofPhase({
      epic: "seo",
      phase: "P3",
      window: { from: at("10:00"), to: at("10:30") }
    })
    expect(time).toEqual({ minutes: 2, agents: [], sessions: [SESSION] })
  })
})

describe("ofAgent()", () => {
  test("an agent's own working time, from its session's agents;  else from the epic's sessions;  none:  undefined", () => {
    writeSession(SESSION_LINES, [["seo-aaa: docstrings", agentRun("10:00", 25)]])
    const work = new WorkTime({ home: HOME })
    expect(work.ofAgent("seo-aaa", { sessionId: SESSION })).toBe(25)
    expect(work.ofAgent("seo-aaa", { sessionId: "gone", epic: "seo" })).toBe(25)
    expect(work.ofAgent("seo-bbb", { sessionId: SESSION })).toBeUndefined()
  })
})

describe("phasePattern()", () => {
  test("named for the phase, or saying it;  never another phase whose number starts the same", () => {
    const pattern = WorkTime.phasePattern("seo", "P11")
    const matches = ["seo-p11: x", "seo-p11-docs: x", "seo-fix: build P11 Sitemap", "seo-p11.1: x", "seo-p110: x"].map(
      (description) => pattern.test(description)
    )
    expect(matches).toEqual([true, true, true, false, false])
    expect(WorkTime.phasePattern("seo", "P11.1").test("seo-p11.1: x")).toBe(true)
  })
})
