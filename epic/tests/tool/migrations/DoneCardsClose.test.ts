/**
 * Tests of the migration `done-cards-close` (epic `epic-engine` I148):  an open issue or todo with a Done card newer
 * than its last reopening is closed.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("done-cards-close")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 26, 15, 0)

/** A status card in `state`, finished `at`. */
function card(state: string, at: string): string {
  const doneAt = state === "underway" ? "" : ` done-at="${at}"`
  return `<epic-status slot="status" state="${state}" at="${at}"${doneAt}><p>x</p></epic-status>`
}

/**
 * A page of issues, todos (one a `limit`), judgement calls, questions and manual tests, each `[id, status, cards,
 * extra attributes]`, and its log (`[at, text]`).
 */
function page(items: [string, string, string, string?][], log: [string, string][] = []): Document {
  const sections: Record<string, string> = { i: "issues", t: "todos", j: "judgements", q: "questions", m: "tests" }
  const html = Object.entries(sections)
    .map(([letter, kind]) => {
      const inner = items
        .filter(([id]) => id.startsWith(letter))
        .map(
          ([id, status, cards, extra]) =>
            `<epic-item id="${id}" title="${id} title" status="${status}"${extra ?? ""}>${cards}</epic-item>`
        )
        .join("")
      return `<epic-section id="${kind}" kind="${kind}">${inner}</epic-section>`
    })
    .join("")
  const events = log.map(([at, text]) => `<epic-event at="${at}">${text}</epic-event>`).join("")
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X">${html}` +
      `<epic-section id="log" kind="log">${events}</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Each item's status, by id. */
function statuses(document: Document): Record<string, string | null> {
  return Object.fromEntries(
    Array.from(document.querySelectorAll("epic-section > epic-item"), (item) => [item.id, item.getAttribute("status")])
  )
}

describe("done-cards-close", () => {
  test("closes open work with a Done card, logged and noted;  a second run changes nothing", () => {
    const document = page([
      ["i1", "open", card("done", "2026-10-20 10:00") + card("done", "2026-10-21 09:30")],
      ["i2", "open", card("done", "2026-10-21 09:30") + card("noted", "2026-10-22 09:30")],
      ["t1", "open", card("done", "2026-10-21 09:30")]
    ])
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(statuses(document)).toEqual({ i1: "done", i2: "done", t1: "done" })
    expect(notes).toEqual([
      "done-cards-close:  I1 closed, its Done card 2026-10-21 09:30:  i1 title",
      "done-cards-close:  I2 closed, its Done card 2026-10-21 09:30:  i2 title",
      "done-cards-close:  T1 closed, its Done card 2026-10-21 09:30:  t1 title"
    ])
    const log = Array.from(document.querySelectorAll("epic-event"), (event) => event.textContent)
    expect(log[0]).toBe("I1 closed:  its Done card (2026-10-21 09:30) said the work was finished")
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("left open:  reopened after its Done card, an underway card, Noted only;  a limit, a call, a question, a test", () => {
    const done = card("done", "2026-10-21 09:30")
    const document = page(
      [
        ["i1", "open", done],
        ["i2", "open", done],
        ["i3", "open", done + card("underway", "2026-10-22 09:00")],
        ["i4", "open", card("noted", "2026-10-21 09:30")],
        ["i5", "canceled", done],
        ["t1", "open", done, " limit"],
        ["j1", "open", done],
        ["q1", "open", done],
        ["m1", "open", done]
      ],
      [
        ["2026-10-22T09:00-04:00", "I1 reopened:  i1 title"],
        ["2026-10-20T09:00-04:00", "I2 reopened:  i2 title"],
        ["2026-10-23T09:00-04:00", "I2 closed:  i2 title"]
      ]
    )
    const before = statuses(document)
    // I2 was reopened BEFORE its card:  the card stands, so it closes
    expect(STEP.run(document, { now: NOW })).toBe(true)
    expect(statuses(document)).toEqual({ ...before, i2: "done" })
  })
})
