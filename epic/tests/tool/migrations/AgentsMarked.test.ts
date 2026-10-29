/**
 * Tests of the migration `agents-marked` (epic `epic-friend` P2):  Claude's old replies marked his, `agent="claude"`.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { ThreadFacts } from "spell/epic/comments"
import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("agents-marked")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 29, 9, 0)

/** A page with one item holding `replies`. */
function page(replies: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="questions" kind="questions">` +
      `<epic-item id="q1" kind="question" title="Q"><p>Why?</p>${replies}</epic-item>` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Each reply's `from` and `agent`, in order. */
function authors(document: Document): (string | null)[][] {
  return Array.from(document.querySelectorAll("epic-reply"), (reply) => [
    reply.getAttribute("from"),
    reply.getAttribute("agent")
  ])
}

describe("agents-marked", () => {
  test("Claude's old replies marked;  Owen's left;  a person named Claude since, left;  a second run changes nothing", () => {
    const document = page(
      '<epic-reply from="Owen" at="2026-10-04 17:00"><p>why not B?</p></epic-reply>' +
        '<epic-reply from="Claude" at="2026-10-04 17:20"><p>Because.</p></epic-reply>' +
        '<epic-reply from="claude"><p>Undated.</p></epic-reply>' +
        '<epic-reply from="Ana" agent="claude" at="2026-11-02 10:00"><p>Marked already.</p></epic-reply>' +
        '<epic-reply from="Claude" at="2026-11-05 10:00"><p>A person named Claude.</p></epic-reply>'
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(authors(document)).toEqual([
      ["Owen", null],
      ["Claude", "claude"],
      ["claude", "claude"],
      ["Ana", "claude"],
      ["Claude", null]
    ])
    expect(notes).toEqual(['agents-marked:  2 of Claude\'s replies marked agent="claude"'])
    expect(STEP.run(document, { now: NOW })).toBe(false)
    // read the same before and after:  nothing old changed meaning
    expect(Array.from(document.querySelectorAll("epic-reply"), (reply) => ThreadFacts.isAgents(reply))).toEqual([
      false,
      true,
      true,
      true,
      false
    ])
  })

  test("cheap markup, run by every edit", () => {
    expect(Migrations.everyEdit).toContain(STEP)
  })
})
