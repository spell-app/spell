/**
 * `ActiveTime` (epic `epic-engine` P41):  how long Claude worked in a transcript, never the time waiting on Owen.
 * - on made-up transcripts:  a turn, a long wait for Owen, a question he answers, background work, an agent in parallel
 */
import { describe, expect, test } from "vite-plus/test"

import { ActiveTime } from "spell/epic/command/ActiveTime"

import { transcript, type Line } from "./transcripts"

/** A session:  a turn (10:00-10:02), an hour waiting for Owen, a turn with a question he took 27 minutes to answer. */
const SESSION: Line[] = [
  { at: "10:00:00", owen: "Build P3" },
  { at: "10:00:05", tool: { id: "b1", name: "Bash" } },
  { at: "10:01:00", result: "b1" },
  { at: "10:02:00", says: "Done." },
  // an hour later:  Owen types again
  { at: "11:00:00", owen: "And the docs?" },
  { at: "11:03:00", tool: { id: "q1", name: "AskUserQuestion" } },
  { at: "11:30:00", result: "q1" },
  { at: "11:31:00", says: "Written." }
]

/** A background agent, its own transcript:  10:01 to 10:20, side by side with the session's first turn. */
const AGENT: Line[] = [
  { at: "10:01:00", owen: "You are the background agent x-p3" },
  { at: "10:05:00", tool: { id: "a1", name: "Bash" } },
  { at: "10:12:00", result: "a1" },
  { at: "10:20:00", says: "Report." }
]

describe("spans() and minutes()", () => {
  test("a turn counts from its first entry to its last;  the wait for Owen's next prompt doesn't", () => {
    expect(ActiveTime.minutes(ActiveTime.spans(transcript(SESSION.slice(0, 5))))).toBe(2)
  })

  test("the time Owen took to answer a question doesn't count;  the rest of the turn does", () => {
    // 2m, then 11:00-11:03 and 11:30-11:31
    expect(ActiveTime.minutes(ActiveTime.spans(transcript(SESSION)))).toBe(6)
  })

  test("an agent working side by side counts once:  wall clock, not added up", () => {
    const spans = [...ActiveTime.spans(transcript(SESSION)), ...ActiveTime.spans(transcript(AGENT))]
    // 10:00-10:20 (the session's turn inside the agent's run), then the second turn's 4m
    expect(ActiveTime.minutes(spans)).toBe(24)
  })

  test("`within`:  only the entries inside it", () => {
    const window = { from: Date.parse("2026-10-25T11:00:00Z"), to: Date.parse("2026-10-25T12:00:00Z") }
    expect(ActiveTime.minutes(ActiveTime.spans(transcript(SESSION), window))).toBe(4)
  })

  test("background work counts until its notice;  a background wait for Owen's notes doesn't", () => {
    const lines: Line[] = [
      { at: "10:00:00", owen: "Test it" },
      { at: "10:00:10", tool: { id: "t1", name: "Bash", command: "yarn test", background: true } },
      { at: "10:00:20", result: "t1" },
      { at: "10:00:30", says: "Running." },
      // its notice, 25 minutes later:  the tests ran all that time
      { at: "10:25:30", notice: "t1" },
      { at: "10:26:00", tool: { id: "w1", name: "Bash", command: "epic inbox wait seo", background: true } },
      { at: "10:26:10", result: "w1" },
      { at: "10:26:20", says: "Waiting for your notes." },
      // Owen pressed Send an hour later
      { at: "11:30:00", notice: "w1" },
      { at: "11:31:00", says: "On it." }
    ]
    expect(ActiveTime.minutes(ActiveTime.spans(transcript(lines)))).toBe(27)
  })

  test("a tool's result much later than `TURN_GAP`, or a notice past `NOTICE_GAP`, isn't work", () => {
    const lines: Line[] = [
      { at: "10:00:00", owen: "Go" },
      { at: "10:01:00", tool: { id: "s1", name: "Bash" } },
      { at: "10:31:00", result: "s1" },
      { at: "10:32:00", tool: { id: "s2", name: "Bash", command: "spell server start", background: true } },
      { at: "10:33:00", result: "s2" },
      { at: "12:33:00", notice: "s2" }
    ]
    // 10:00-10:01, 10:31-10:33
    expect(ActiveTime.minutes(ActiveTime.spans(transcript(lines)))).toBe(3)
  })

  test("a permission Owen gave by hand is his time;  one from a rule or the mode isn't", () => {
    const lines: Line[] = [
      { at: "10:00:00", owen: "Go" },
      { at: "10:01:00", tool: { id: "p1", name: "Bash" } },
      { at: "10:09:00", result: "p1", permission: { source: "user_temporary" } },
      { at: "10:10:00", tool: { id: "p2", name: "Bash" } },
      { at: "10:12:00", result: "p2", permission: { source: "user_permanent", reasonType: "rule" } }
    ]
    // 10:00-10:01, 10:09-10:12
    expect(ActiveTime.minutes(ActiveTime.spans(transcript(lines)))).toBe(4)
  })

  test("other lines (titles, API requests), broken lines and an empty transcript:  nothing", () => {
    expect(ActiveTime.spans("")).toEqual([])
    expect(ActiveTime.spans('{"type":"custom-title","customTitle":"x"}\nnot json\n{"parentUuid":')).toEqual([])
    expect(ActiveTime.minutes([])).toBe(0)
  })
})

describe("union()", () => {
  test("overlapping and touching spans merge, oldest first", () => {
    expect(
      ActiveTime.union([
        { from: 5, to: 9 },
        { from: 0, to: 3 },
        { from: 3, to: 4 },
        { from: 8, to: 12 }
      ])
    ).toEqual([
      { from: 0, to: 4 },
      { from: 5, to: 12 }
    ])
  })
})
