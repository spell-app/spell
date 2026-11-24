/**
 * `FreshPause` (epic `epic-engine` T139):  the pause round's record and each state a session of it can be in, on a
 * scratch epic home, Claude folder and checkout.  Nothing here messages, stops or moves a session.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeEach, expect, test } from "vite-plus/test"

import { FreshAll } from "spell/epic/command/FreshAll"
import { FreshPause, type PauseSession } from "spell/epic/command/FreshPause"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"

const root = mkdtempSync(join(tmpdir(), "fresh-pause-"))
for (const epic of ["seo", "docs"]) mkdirSync(join(root, "epics", epic), { recursive: true })

const SEO: PauseSession = { epic: "seo", session: "🚧 seo", sessionId: "0a1b2c3d-0000-4000-8000-000000000001" }
const DOCS: PauseSession = { epic: "docs", session: "🚧 docs", sessionId: "0a1b2c3d-0000-4000-8000-000000000002" }
const INITIATOR = { session: "main", sessionId: "0a1b2c3d-0000-4000-8000-000000000003" }

const NOW = Date.parse("2026-11-22T12:00:00Z")
const DAYS_LATER = NOW + 3 * 24 * 60 * 60 * 1000

/** Both sessions running, as Claude Code's registry has them. */
const LIVE = [SEO, DOCS].map(({ sessionId }, index) => ({ pid: 100 + index, sessionId, status: "idle" }))

/** A round of both, begun at `NOW`. */
function begin() {
  return FreshPause.start({ initiator: INITIATOR, running: [SEO, DOCS], now: NOW })
}

/** Epic `epic`'s agents list. */
function listAgents(epic: string, agents: object[]) {
  writeFileSync(join(root, "epics", epic, "agents.json5"), JSON.stringify(agents))
}

beforeEach(() => {
  FreshPause.end()
  rmSync(FreshAll.folder(), { recursive: true, force: true })
  rmSync(ClaudeHome.projects(), { recursive: true, force: true })
  for (const epic of ["seo", "docs"]) listAgents(epic, [])
})
afterAll(() => rmSync(root, { recursive: true, force: true }))

test("no round:  none read, NOTHING held;  a file that won't read is no round either", () => {
  expect(FreshPause.round()).toBeUndefined()
  expect(FreshPause.holds("seo", SEO.sessionId)).toBe(false)
  mkdirSync(FreshPause.folder(), { recursive: true })
  writeFileSync(join(FreshPause.folder(), "round.json5"), "{ half")
  expect(FreshPause.round()).toBeUndefined()
})

test("start():  who started it and who's in it;  an earlier fresh all's marks go, so none goes fresh early", () => {
  FreshAll.mark(SEO.sessionId, "seo", { round: "old" })
  const round = begin()
  expect(round).toEqual({ since: new Date(NOW).toISOString(), initiator: INITIATOR, sessions: [SEO, DOCS] })
  expect(FreshPause.round()).toEqual(round)
  expect(FreshAll.allPending()).toEqual([])
  expect(FreshPause.holds("seo")).toBe(true)
  expect(FreshPause.holds("elsewhere")).toBe(false)
})

test("start() again:  new sessions added, its start and who reported quiet KEPT", () => {
  FreshPause.start({ initiator: INITIATOR, running: [SEO], now: NOW })
  FreshPause.markQuiet(SEO.sessionId, NOW)
  const round = FreshPause.start({ initiator: INITIATOR, running: [SEO, DOCS], now: DAYS_LATER })
  expect(round).toMatchObject({ since: new Date(NOW).toISOString(), sessions: [SEO, DOCS] })
  expect(FreshPause.quietAt(SEO.sessionId)).toBe(new Date(NOW).toISOString())
  expect(() => FreshPause.markQuiet("../nope")).toThrow(TypeError)
})

test("quiet, and all quiet;  a paused agent doesn't count as running", () => {
  const round = begin()
  listAgents("seo", [{ name: "seo-fix", paused: { next: "the tests" } }])
  for (const { sessionId } of [SEO, DOCS]) FreshPause.markQuiet(sessionId)
  expect(FreshPause.report(round, { running: [SEO, DOCS], cwd: root, live: LIVE })).toEqual({
    sessions: [
      { ...SEO, state: "quiet", why: "paused" },
      { ...DOCS, state: "quiet", why: "paused" }
    ],
    outstanding: [],
    allQuiet: true
  })
})

test("pausing:  named, with its agents, and NEVER skipped however long it takes", () => {
  const round = begin()
  FreshPause.markQuiet(DOCS.sessionId)
  listAgents("seo", [{ name: "seo-fix" }])
  const report = FreshPause.report(round, { running: [SEO, DOCS], cwd: root, live: LIVE, now: DAYS_LATER })
  expect(report.allQuiet).toBe(false)
  expect(report.outstanding).toEqual([
    {
      ...SEO,
      state: "pausing",
      why: "hasn't said it's paused, 4320 minutes after the pause began.  Also, its agents are still working:  seo-fix"
    }
  ])
})

test("said it was quiet, then an agent runs again:  it holds the round up again", () => {
  const round = begin()
  for (const { sessionId } of [SEO, DOCS]) FreshPause.markQuiet(sessionId)
  listAgents("docs", [{ name: "docs-pass" }])
  const { outstanding } = FreshPause.report(round, { running: [SEO, DOCS], cwd: root, live: LIVE })
  expect(outstanding).toEqual([{ ...DOCS, state: "pausing", why: "its agents are still working:  docs-pass" }])
})

test("waiting on the person:  by a question in its transcript, or Claude Code saying so;  holds the round up", () => {
  const round = begin()
  mkdirSync(join(ClaudeHome.projects(), "repo"), { recursive: true })
  const asked = {
    type: "assistant",
    message: { content: [{ type: "tool_use", id: "q1", name: "AskUserQuestion", input: { questions: [] } }] }
  }
  writeFileSync(join(ClaudeHome.projects(), "repo", `${SEO.sessionId}.jsonl`), `${JSON.stringify(asked)}\n`)
  const live = [LIVE[0]!, { ...LIVE[1]!, status: "waiting" }]
  const { outstanding, allQuiet } = FreshPause.report(round, { running: [SEO, DOCS], cwd: root, live })
  expect(outstanding.map(({ state }) => state)).toEqual(["waiting", "waiting"])
  expect(allQuiet).toBe(false)
})

test("exited:  holds nothing up, reported or not;  still running by EITHER account isn't exited", () => {
  const round = begin()
  listAgents("seo", [{ name: "seo-fix" }])
  expect(FreshPause.report(round, { running: [], cwd: root, live: [] })).toMatchObject({
    sessions: [{ state: "exited" }, { state: "exited" }],
    allQuiet: true
  })
  expect(FreshPause.report(round, { running: [SEO], cwd: root, live: [] }).allQuiet).toBe(false)
  expect(FreshPause.report(round, { running: [], cwd: root, live: [LIVE[0]!] }).allQuiet).toBe(false)
})

test("untold:  a session started since holds the round up", () => {
  const round = FreshPause.start({ initiator: INITIATOR, running: [SEO], now: NOW })
  FreshPause.markQuiet(SEO.sessionId)
  const { outstanding } = FreshPause.report(round, { running: [SEO, DOCS], cwd: root, live: LIVE })
  expect(outstanding).toMatchObject([{ ...DOCS, state: "untold" }])
})

test("after it went fresh:  a paused session still starts nothing;  ended, nothing's held", () => {
  begin()
  FreshPause.end()
  FreshAll.mark(SEO.sessionId, "seo", { paused: true })
  expect(FreshPause.holds("seo", SEO.sessionId)).toBe(true)
  // the fresh session that takes the epic on
  expect(FreshPause.holds("seo", DOCS.sessionId)).toBe(false)
})
