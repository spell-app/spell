/**
 * `FreshAll` (epic `epic-engine` T113):  `/epic fresh all`'s pending marks, the CLEAR MOMENT rule, and the end-of-turn
 * hook's wait, on scratch transcripts and a scratch checkout's agents list;  the marks in the test's own epic home.
 * - Nothing here hands a session on, opens a window or messages a session:  the wait resolves to its line, and stops.
 */
import { spawnSync } from "node:child_process"
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { FreshAll } from "spell/epic/command/FreshAll"

/** A scratch checkout with no config:  its own epic folder, `epics/seo/`. */
const root = mkdtempSync(join(tmpdir(), "fresh-all-"))
mkdirSync(join(root, "epics", "seo"), { recursive: true })
const agentsFile = join(root, "epics", "seo", "agents.json5")

const SEO = "0a1b2c3d-0000-4000-8000-000000000001"
const DOCS = "0a1b2c3d-0000-4000-8000-000000000002"
const ME = "0a1b2c3d-0000-4000-8000-000000000003"

/** The time the tests run at. */
const NOW = Date.parse("2026-11-19T12:00:00Z")
const minutes = (count: number) => count * 60 * 1000
const at = (ms: number) => new Date(ms).toISOString()

/** Transcript lines. */
const prompt = (when: number, text = "how's it going?") =>
  JSON.stringify({ type: "user", timestamp: at(when), message: { role: "user", content: text } })
const peer = (when: number) =>
  JSON.stringify({
    type: "user",
    isMeta: true,
    timestamp: at(when),
    origin: { kind: "peer", name: "🚧 epic-engine" },
    message: { role: "user", content: "Another Claude session sent a message:\n<cross-session-message>..." }
  })
const toolResult = (when: number, id = "t1") =>
  JSON.stringify({
    type: "user",
    timestamp: at(when),
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] }
  })
const question = (when: number) =>
  JSON.stringify({
    type: "assistant",
    timestamp: at(when),
    message: { content: [{ type: "tool_use", id: "q1", name: "AskUserQuestion", input: { questions: [] } }] }
  })

/** A transcript file of `lines`. */
function transcript(name: string, lines: string[]): string {
  const file = join(root, `${name}.jsonl`)
  writeFileSync(file, `${lines.join("\n")}\n`)
  return file
}

beforeEach(() => {
  rmSync(FreshAll.folder(), { recursive: true, force: true })
  rmSync(agentsFile, { force: true })
})
afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("the marks", () => {
  test("marked, read back, listed, dropped;  a bad session id is refused", () => {
    FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
    FreshAll.mark(ME, "docs", { round: "r1", now: NOW, self: true })
    expect(FreshAll.pending(SEO)).toEqual({ epic: "seo", since: at(NOW), round: "r1" })
    expect(FreshAll.pending(ME)?.self).toBe(true)
    expect(
      FreshAll.allPending()
        .map(({ sessionId }) => sessionId)
        .sort()
    ).toEqual([SEO, ME])
    FreshAll.drop(SEO)
    expect(FreshAll.pending(SEO)).toBeUndefined()
    expect(FreshAll.mark(DOCS, "docs", { paused: true }).paused).toBe(true)
    expect(FreshAll.pending("../nope")).toBeUndefined()
    expect(() => FreshAll.mark("../nope", "seo")).toThrow(TypeError)
  })
})

describe("the clear moment", () => {
  test("clear:  no agents, no question, the person's last prompt long ago;  another session's message doesn't count", () => {
    const mark = FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
    const file = transcript("clear", [prompt(NOW - minutes(30)), toolResult(NOW - minutes(29)), peer(NOW - minutes(1))])
    expect(FreshAll.whyNot(SEO, mark, { transcript: file, cwd: root, now: NOW })).toBeNull()
  })

  test("paused agents aren't running (T139):  clear, and woken told to leave them saved", () => {
    const mark = FreshAll.mark(SEO, "seo", { round: "r1", now: NOW, paused: true })
    writeFileSync(agentsFile, '[{ name: "docs-pass", status: "paused", paused: { next: "the tests" } }]\n')
    expect(FreshAll.whyNot(SEO, mark, { cwd: root, now: NOW })).toBeNull()
    expect(FreshAll.runningAgents("seo", root)).toEqual([])
    expect(FreshAll.pausedAgents("seo", root)).toEqual(["docs-pass"])
    expect(FreshAll.wakeLine(mark)).toMatch(/don't restart them/)
  })

  test("waits:  agents running, a question waiting, a prompt in the last 5 minutes", () => {
    const mark = FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
    const quiet = transcript("quiet", [prompt(NOW - minutes(30))])
    writeFileSync(agentsFile, '[{ name: "docs-pass", task: "the docs" }]\n')
    expect(FreshAll.whyNot(SEO, mark, { transcript: quiet, cwd: root, now: NOW })).toMatch(/agents.*docs-pass/)
    rmSync(agentsFile)
    const asked = transcript("asked", [prompt(NOW - minutes(30)), question(NOW - minutes(20))])
    expect(FreshAll.whyNot(SEO, mark, { transcript: asked, cwd: root, now: NOW })).toMatch(/question/)
    const answered = transcript("answered", [question(NOW - minutes(20)), toolResult(NOW - minutes(19), "q1")])
    expect(FreshAll.whyNot(SEO, mark, { transcript: answered, cwd: root, now: NOW })).toBeNull()
    const talking = transcript("talking", [prompt(NOW - minutes(2))])
    expect(FreshAll.whyNot(SEO, mark, { transcript: talking, cwd: root, now: NOW })).toMatch(/wrote to it/)
    // a slash command is a prompt too;  harness text isn't
    expect(FreshAll.lastPrompt(prompt(NOW, "<command-name>/epic</command-name>"))).toBe(NOW)
    expect(FreshAll.lastPrompt(prompt(NOW, "<system-reminder>x</system-reminder>"))).toBeUndefined()
  })

  test("the session that asked:  its own prompt doesn't count;  it goes after the others of its round, or 10 minutes on", () => {
    const self = FreshAll.mark(ME, "docs", { round: "r1", now: NOW, self: true })
    FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
    FreshAll.mark(DOCS, "docs", { round: "r0", now: NOW })
    const asked = transcript("self", [prompt(NOW - 2000, "/epic fresh all")])
    expect(FreshAll.whyNot(ME, self, { transcript: asked, cwd: root, now: NOW })).toMatch(/goes last:  1 other/)
    expect(FreshAll.whyNot(ME, self, { transcript: asked, cwd: root, now: NOW + minutes(11) })).toBeNull()
    FreshAll.drop(SEO)
    expect(FreshAll.whyNot(ME, self, { transcript: asked, cwd: root, now: NOW + minutes(1) })).toBeNull()
    // a later prompt is the person talking to it
    const talking = transcript("self-talking", [prompt(NOW - 2000, "/epic fresh all"), prompt(NOW + minutes(2))])
    expect(FreshAll.whyNot(ME, self, { transcript: talking, cwd: root, now: NOW + minutes(3) })).toMatch(/wrote to it/)
  })
})

describe("the end-of-turn hook's wait", () => {
  /** A clock the stubbed sleep moves on;  `onSleep` runs at each look. */
  function clock(onSleep: (looks: number) => void = () => {}) {
    let time = NOW
    let looks = 0
    return {
      now: () => time,
      sleep: async (ms: number) => {
        time += ms
        onSleep(++looks)
      }
    }
  }

  test("clear at once:  the wake line, the wake noted;  not woken again within half an hour", async () => {
    FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
    const file = transcript("hook-clear", [prompt(NOW - minutes(30))])
    const line = await FreshAll.waitForClear({ sessionId: SEO, transcript: file, cwd: root, waiter: "w1", ...clock() })
    expect(line).toMatch(/clear now.*run \/epic fresh for seo now/)
    expect(FreshAll.pending(SEO)?.woken).toBe(at(NOW))
    expect(await FreshAll.waitForClear({ sessionId: SEO, transcript: file, cwd: root, ...clock() })).toBeNull()
  })

  test("waits for the agents, then wakes it", async () => {
    FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
    writeFileSync(agentsFile, '[{ name: "docs-pass" }]\n')
    const file = transcript("hook-agents", [prompt(NOW - minutes(30))])
    const ticking = clock((looks) => looks === 3 && rmSync(agentsFile))
    const line = await FreshAll.waitForClear({ sessionId: SEO, transcript: file, cwd: root, waiter: "w1", ...ticking })
    expect(line).toMatch(/clear now/)
    expect(ticking.now()).toBe(NOW + 3 * 30 * 1000)
  })

  test("stops:  not pending, the mark dropped, a new turn, a newer waiter, or given up", async () => {
    const file = transcript("hook-stops", [prompt(NOW - minutes(30))])
    expect(await FreshAll.waitForClear({ sessionId: SEO, transcript: file, cwd: root, ...clock() })).toBeNull()
    writeFileSync(agentsFile, '[{ name: "docs-pass" }]\n')
    const wait = (onSleep: (looks: number) => void, giveUpMs?: number) => {
      FreshAll.mark(SEO, "seo", { round: "r1", now: NOW })
      return FreshAll.waitForClear({
        sessionId: SEO,
        transcript: file,
        cwd: root,
        waiter: "w1",
        giveUpMs,
        ...clock(onSleep)
      })
    }
    expect(await wait(() => FreshAll.drop(SEO))).toBeNull()
    expect(await wait(() => appendFileSync(file, `${prompt(NOW)}\n`))).toBeNull()
    expect(await wait(() => writeFileSync(join(FreshAll.folder(), `${SEO}.waiter`), "w2"))).toBeNull()
    expect(await wait(() => {}, minutes(2))).toBeNull()
  })
})

describe("the hook script, hooks/fresh-wait.mjs", () => {
  const HOOK = join(import.meta.dirname, "../../hooks/fresh-wait.mjs")
  /** Run the hook on `input`, in this test's epic home. */
  const run = (input: object, attended = "1") =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...process.env, CLAUDE_CODE_SESSION_ATTENDED: attended }
    })

  test("a marked session at its clear moment:  the wake line, exit 2;  unmarked or unattended:  nothing, exit 0", () => {
    const file = transcript("hook-script", [prompt(Date.now() - minutes(30))])
    const input = { session_id: SEO, transcript_path: file, cwd: root }
    expect(run(input)).toMatchObject({ status: 0, stderr: "" })
    FreshAll.mark(SEO, "seo", { round: "r1" })
    expect(run(input, "0")).toMatchObject({ status: 0, stderr: "" })
    const woken = run(input)
    expect(woken.status).toBe(2)
    expect(woken.stderr).toMatch(/\/epic fresh all:  this session is clear now/)
  })
})
