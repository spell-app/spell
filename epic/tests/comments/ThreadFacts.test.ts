/**
 * Tests of `ThreadFacts`:  what a comment's thread shows, as the docs runtime's comments and `<epic-thread>` both work
 * it out.
 */
import { describe, expect, test } from "vite-plus/test"

import { ThreadFacts, type ThreadComment } from "spell/epic/comments"

/** A comment, as the comments route answers it. */
function comment(fields: Partial<ThreadComment> = {}): ThreadComment {
  return {
    id: "c3",
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

/** A page's reply element, as far as `ThreadFacts` reads it:  its attributes. */
function reply(attributes: Record<string, string>) {
  return { getAttribute: (name: string) => attributes[name] ?? null }
}

/** Dated after agents' replies were marked (`ThreadFacts.AGENTS_MARKED`). */
const LATER = "2026-11-05T10:00:00.000Z"

describe("ThreadFacts:  who wrote it (epic `epic-friend` P2)", () => {
  test("an agent's words carry `agent`, in both shapes;  a person's none", () => {
    expect([
      ThreadFacts.agentOf({ by: "Ana", agent: "claude", at: LATER }),
      ThreadFacts.agentOf(reply({ from: "Ana", agent: "claude", at: "2026-11-05 10:00" })),
      ThreadFacts.agentOf({ by: "Ana", at: LATER }),
      ThreadFacts.agentOf(reply({ from: "Ana", at: "2026-11-05 10:00" })),
      ThreadFacts.agentOf(undefined)
    ]).toEqual(["claude", "claude", undefined, undefined, undefined])
  })

  test("the OLD RULE:  by Claude before the marker is Claude's;  a person NAMED Claude since is a person", () => {
    expect([
      ThreadFacts.isAgents(CLAUDE),
      ThreadFacts.isAgents(reply({ from: "claude", at: "2026-10-04 17:20" })),
      ThreadFacts.isAgents(reply({ from: "Claude" })),
      ThreadFacts.isAgents(OWEN),
      ThreadFacts.isAgents({ by: "Claude", at: LATER }),
      ThreadFacts.isAgents(reply({ from: "Claude", at: "2026-11-05 10:00" }))
    ]).toEqual([true, true, true, false, false, false])
  })

  test("speakerOf():  You, a name, Claude, or Claude (Ana), as the reader sees it", () => {
    const as = (each: Parameters<typeof ThreadFacts.speakerOf>[0]) => ThreadFacts.speakerOf(each, "Ana")
    expect([
      as({ by: "Ana", at: LATER }),
      as({ by: "ben", at: LATER }),
      as({ by: "ana", agent: "claude", at: LATER }),
      as({ by: "Ben", agent: "claude", at: LATER }),
      as(CLAUDE),
      as({ by: "Claude", agent: "claude", at: CLAUDE.at }),
      as({ by: "Claude", at: LATER })
    ]).toEqual([
      { person: "Ana", agent: undefined, mine: true },
      { person: "ben", agent: undefined, mine: false },
      { person: "ana", agent: "claude", mine: true },
      { person: "Ben", agent: "claude", mine: false },
      { person: undefined, agent: "claude", mine: false },
      { person: undefined, agent: "claude", mine: false },
      { person: "Claude", agent: undefined, mine: false }
    ])
    expect(ThreadFacts.speakerOf({ by: "Ana", at: LATER }, undefined).mine).toBe(false)
  })

  test("viewer():  the page server's person;  none, or off a page server:  undefined", () => {
    expect([
      ThreadFacts.viewer({ SPELL_SERVER: { person: " Ana " } }),
      ThreadFacts.viewer({ SPELL_SERVER: {} }),
      ThreadFacts.viewer({})
    ]).toEqual(["Ana", undefined, undefined])
  })

  test("a thread with a person named Claude and one named Ana:  whose turn, whose words wait", () => {
    const ana = { by: "Ana", at: "2026-11-05T09:00:00.000Z", text: "Why?" }
    const answer = { by: "Ana", agent: "claude", at: "2026-11-05T09:30:00.000Z", html: "<p>So.</p>" }
    const person = { by: "Claude", at: LATER, text: "I'm Claude, a person" }
    const thread = comment({ status: "answered", by: "Ana", replies: [ana, answer, person] })
    expect([
      ThreadFacts.turnOf(thread),
      ThreadFacts.lastPersonReply(thread),
      ThreadFacts.latestAgentAt(thread),
      ThreadFacts.pendingReplyOf(thread),
      ThreadFacts.isWaiting(thread),
      ThreadFacts.lastWordsAt(thread)
    ]).toEqual(["agent", person, answer.at, person, true, LATER])
  })
})

describe("ThreadFacts:  any agent's words (epic `epic-friend` P10)", () => {
  test("agentLabel():  Claude, Codex, any other capitalised;  none:  Claude", () => {
    expect(["claude", "codex", "CODEX", "gemini", "", undefined].map(ThreadFacts.agentLabel)).toEqual([
      "Claude",
      "Codex",
      "Codex",
      "Gemini",
      "Claude",
      "Claude"
    ])
  })

  test("Bob's Codex:  its agent, Bob its person;  a reply `from` the agent's own name names nobody", () => {
    expect([
      ThreadFacts.speakerOf({ by: "Bob", agent: "codex", at: LATER }, "Ana"),
      ThreadFacts.speakerOf(reply({ from: "Codex", agent: "codex", at: "2026-11-05 10:00" }), "Ana"),
      ThreadFacts.speakerOf({ by: "Codex", at: LATER }, "Ana")
    ]).toEqual([
      { person: "Bob", agent: "codex", mine: false },
      { person: undefined, agent: "codex", mine: false },
      { person: "Codex", agent: undefined, mine: false }
    ])
  })

  test("a Codex answer is the person's turn;  a comment waiting reads `agent`, and the old `claude` the same", () => {
    const codex = { by: "Bob", agent: "codex", at: LATER, html: "<p>Done.</p>" }
    expect([
      ThreadFacts.turnOf(comment({ status: "answered", replies: [codex] })),
      ThreadFacts.turnOf(comment()),
      ThreadFacts.isWaiting(comment()),
      ThreadFacts.latestAgentAt(comment({ replies: [codex] }))
    ]).toEqual(["person", "agent", true, LATER])
    expect(["agent", "claude", "owen", "person", "done", "nobody", undefined].map(ThreadFacts.asTurn)).toEqual([
      "agent",
      "agent",
      "person",
      "person",
      "done",
      undefined,
      undefined
    ])
    expect(ThreadFacts.isAgentsTurn(comment({ turn: "claude" as never }))).toBe(true)
  })

  test("voiceOf():  the speaker's own token, the repo's colour its fallback;  an agent's words, the agent's", () => {
    const colors = { people: { Ana: "#2f9e6e" }, agents: { codex: "#0f8b8d" } }
    expect([
      ThreadFacts.voiceOf({ person: "ana", agent: undefined }, colors),
      ThreadFacts.voiceOf({ person: "Bob", agent: "codex" }, colors),
      ThreadFacts.voiceOf({ person: "Ana Lima", agent: undefined }, colors),
      ThreadFacts.voiceOf({ person: "Ana", agent: "claude" }, colors),
      ThreadFacts.voiceOf({ person: undefined, agent: undefined }, colors)
    ]).toEqual([
      "var(--epic-voice-person-ana, #2f9e6e)",
      "var(--epic-voice-agent-codex, #0f8b8d)",
      "var(--epic-voice-person-ana-lima)",
      "var(--epic-voice-agent-claude)",
      undefined
    ])
  })

  test("voiceOf():  a Spell UI colour name, any case, is the theme's colour;  any other colour as it is (P14)", () => {
    const colors = { people: { ana: "Green", bob: "#3b7dd8" }, agents: { codex: " teal " } }
    expect([
      ThreadFacts.voiceOf({ person: "ana", agent: undefined }, colors),
      ThreadFacts.voiceOf({ person: "bob", agent: undefined }, colors),
      ThreadFacts.voiceOf({ person: "Bob", agent: "codex" }, ThreadFacts.colors({ SPELL_SERVER: { colors } }))
    ]).toEqual([
      "var(--epic-voice-person-ana, var(--ui-green))",
      "var(--epic-voice-person-bob, #3b7dd8)",
      "var(--epic-voice-agent-codex, var(--ui-teal))"
    ])
  })

  test("colors():  the page server's, anything not a colour left out;  none:  empty", () => {
    const said = { people: { ana: " teal ", bob: "red; } body { x", ben: 3 }, agents: { codex: "oklch(60% 0.1 180)" } }
    expect(ThreadFacts.colors({ SPELL_SERVER: { colors: said } })).toEqual({
      people: { ana: "teal" },
      agents: { codex: "oklch(60% 0.1 180)" }
    })
    expect(ThreadFacts.colors({})).toEqual({ people: {}, agents: {} })
  })
})

describe("ThreadFacts", () => {
  test("whose turn:  Claude's while Owen spoke last, Owen's once Claude did, nobody's once done", () => {
    expect([
      ThreadFacts.turnOf(comment()),
      ThreadFacts.turnOf(comment({ status: "answered", replies: [CLAUDE] })),
      ThreadFacts.turnOf(comment({ status: "answered", replies: [CLAUDE, OWEN] })),
      ThreadFacts.turnOf(comment({ status: "answered" })),
      ThreadFacts.turnOf(comment({ done: { how: "good", at: "2026-10-19T00:00:00.000Z" } }))
    ]).toEqual(["agent", "person", "agent", "person", "done"])
    // a page server from before epic `epic-friend` P2 says `owen` for the person's turn;  before P10, `claude` an agent's
    const old = comment({ turn: "owen" as never })
    const older = comment({ turn: "claude" as never })
    expect(
      ThreadFacts.withTurns([comment({ turn: "person" }), old, older, comment()]).map((each) => each.turn)
    ).toEqual(["person", "person", "agent", "agent"])
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
    expect(ThreadFacts.latestAgentAt(comment({ replies: [CLAUDE, OWEN] }))).toBe(CLAUDE.at)
  })

  test("ids:  `C3`, `c3` or the old `cm3`, as typed;  shown `C3`", () => {
    expect(["C3", "c3", "#cm3", " cm12 ", "q3", "M3", "m3"].map(ThreadFacts.numberOf)).toEqual([
      3,
      3,
      3,
      12,
      undefined,
      undefined,
      undefined
    ])
    expect([ThreadFacts.label("c3"), ThreadFacts.label("cm7"), ThreadFacts.label("x")]).toEqual(["C3", "C7", "x"])
  })

  test("its headline:  Owen's own first words once he's written some (I162)", () => {
    expect([
      ThreadFacts.headline(comment()),
      ThreadFacts.headline(comment({ text: "  a comment longer than forty characters,\n cut short here" })),
      ThreadFacts.headline(comment({ kind: "page" }))
    ]).toEqual(["“Why?”", "“a comment longer than forty characters,…”", "“Why?”"])
  })

  test("what it's on, before he writes:  the quote's first words, else the block's;  its tooltip the block in full", () => {
    const place = (overrides: Parameters<typeof comment>[0] = {}) => comment({ text: "", ...overrides })
    expect([
      ThreadFacts.headline(place()),
      ThreadFacts.headline(place({ quote: "a quote longer than forty characters, cut short here" })),
      ThreadFacts.headline(place({ kind: "page" })),
      ThreadFacts.headline(place({ excerpt: "", label: "", kind: "code" }))
    ]).toEqual(["“Name Kind Where”", "“a quote longer than forty characters, cu…”", "This page", "This code block"])
    expect(ThreadFacts.aboutTip({ id: "c3", place: comment({ quote: "Kind" }) })).toBe(
      "Comment C3, on a table in “2. Context”:  “Kind”"
    )
    expect(ThreadFacts.aboutTip({ place: comment({ kind: "section" }) })).toBe("On “2. Context”")
    // the whole Overview (epic `epic-engine` I55):  "the", as the page
    const overview = place({ kind: "overview", excerpt: "", label: "" })
    expect([ThreadFacts.headline(overview), ThreadFacts.aboutTip({ place: overview })]).toEqual([
      "This Overview",
      "On the Overview"
    ])
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
