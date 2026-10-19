/**
 * Tests of `ThreadFacts`:  what a comment's thread shows, as the docs runtime's comments and `<epic-thread>` both work
 * it out.
 */
import { describe, expect, test } from "vite-plus/test"

import { ThreadFacts, type ThreadComment } from "$/epics/comments"

/** A comment, as the comments route answers it. */
function comment(fields: Partial<ThreadComment> = {}): ThreadComment {
  return {
    id: "m3",
    anchor: "context#table-2",
    kind: "table",
    label: "2. Context",
    excerpt: "Name Kind Where",
    text: "Why?",
    at: "2026-10-17T13:12:00.000Z",
    status: "new",
    ...fields
  }
}

const CLAUDE = { by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>Because.</p>" }
const OWEN = { by: "Owen", at: "2026-10-18T09:00:00.000Z", text: "And then?" }

describe("ThreadFacts", () => {
  test("whose turn:  Claude's while Owen spoke last, Owen's once Claude did, nobody's once done", () => {
    expect([
      ThreadFacts.turnOf(comment()),
      ThreadFacts.turnOf(comment({ status: "answered", replies: [CLAUDE] })),
      ThreadFacts.turnOf(comment({ status: "answered", replies: [CLAUDE, OWEN] })),
      ThreadFacts.turnOf(comment({ status: "answered" })),
      ThreadFacts.turnOf(comment({ done: { how: "good", at: "2026-10-19T00:00:00.000Z" } }))
    ]).toEqual(["claude", "owen", "claude", "owen", "done"])
    expect(ThreadFacts.withTurns([comment({ turn: "owen" }), comment()]).map((each) => each.turn)).toEqual([
      "owen",
      "claude"
    ])
  })

  test("Owen's words Claude hasn't had:  his first while new, his pending reply until taken or thought about", () => {
    expect([
      ThreadFacts.pendingOf(comment()),
      ThreadFacts.pendingOf(comment({ working: "2026-10-17T14:00:00.000Z" })),
      ThreadFacts.pendingOf(comment({ status: "answered", replies: [CLAUDE, OWEN] })),
      ThreadFacts.pendingOf(
        comment({ status: "answered", replies: [CLAUDE, OWEN], working: "2026-10-18T10:00:00.000Z" })
      ),
      ThreadFacts.pendingOf(comment({ status: "answered", replies: [CLAUDE] }))
    ]).toEqual(["edit", null, "reply", null, null])
    expect(ThreadFacts.latestClaudeAt(comment({ replies: [CLAUDE, OWEN] }))).toBe(CLAUDE.at)
  })

  test("ids:  `M3`, `m3` or the old `cm3`, as typed;  shown `M3`", () => {
    expect(["M3", "m3", "#cm3", " cm12 ", "q3"].map(ThreadFacts.numberOf)).toEqual([3, 3, 3, 12, undefined])
    expect([ThreadFacts.label("m3"), ThreadFacts.label("cm7"), ThreadFacts.label("x")]).toEqual(["M3", "M7", "x"])
  })

  test("what it's on:  the quote's first words, else the block's;  its tooltip the block in full", () => {
    expect([
      ThreadFacts.headline(comment()),
      ThreadFacts.headline(comment({ quote: "a quote longer than forty characters, cut short here" })),
      ThreadFacts.headline(comment({ kind: "page" })),
      ThreadFacts.headline(comment({ excerpt: "", label: "", kind: "code" }))
    ]).toEqual(["“Name Kind Where”", "“a quote longer than forty characters, cu…”", "This page", "This code block"])
    expect(ThreadFacts.aboutTip({ id: "m3", place: comment({ quote: "Kind" }) })).toBe(
      "Comment M3, on a table in “2. Context”:  “Kind”"
    )
    expect(ThreadFacts.aboutTip({ place: comment({ kind: "section" }) })).toBe("On “2. Context”")
  })

  test("times:  local, then no year", () => {
    const local = ThreadFacts.localStamp("2026-10-09T22:10:00")
    expect([
      local,
      ThreadFacts.shortStamp(local),
      ThreadFacts.shortStamp("2026-10-09 22:10"),
      ThreadFacts.localStamp("x")
    ]).toEqual(["2026-10-09 22:10", "10/9 22:10", "10/9 22:10", "x"])
  })
})
