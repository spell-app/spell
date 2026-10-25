/**
 * Tests of the migration `taken-in-phase` (epic `epic-engine` I128):  a closed item a phase's text links names that
 * phase, `taken-in`, by `PhaseTakes`' rule.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell-epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("taken-in-phase")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 15, 0)

/** A page with these phases (`[id, status, body]`) and items (`[id, status, extra attributes]`). */
function page(phases: [string, string, string][], items: [string, string, string?][]): Document {
  const phaseHtml = phases
    .map(([id, status, body]) => `<epic-phase id="${id}" title="${id}" status="${status}">${body}</epic-phase>`)
    .join("")
  const itemHtml = items
    .map(([id, status, extra]) => `<epic-item id="${id}" title="${id}" status="${status}"${extra ?? ""}></epic-item>`)
    .join("")
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">${phaseHtml}` +
      `</epic-section><epic-section id="issues" kind="issues">${itemHtml}</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Each item's `taken-in`, in order. */
function takenIn(document: Document): (string | null)[] {
  return Array.from(document.querySelectorAll("#issues > epic-item"), (item) => item.getAttribute("taken-in"))
}

/** A phase field holding `html`. */
const field = (name: string, html: string) => `<epic-field name="${name}">${html}</epic-field>`

describe("taken-in-phase", () => {
  test("the latest done phase linking a closed item takes it;  a second run changes nothing", () => {
    const document = page(
      [
        ["p-a", "done", field("changes", '<a href="#i1">I1</a> <a href="#i2">I2</a>')],
        ["p-b", "done", field("done", '<a href="#i1">I1</a> <epic-link item="d3"></epic-link>')],
        ["p-c", "active", field("changes", '<a href="#i2">I2</a> <a href="#i4">I4</a>')],
        ["p-d", "todo", field("changes", '<a href="#i5">I5</a>')]
      ],
      [
        ["i1", "done"],
        ["i2", "done"],
        ["d3", "decided"],
        ["i4", "done"],
        ["i5", "done"]
      ]
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    // I2:  a done phase beats a later active one;  I4:  only the active one;  I5:  a phase to do takes nothing
    expect(takenIn(document)).toEqual(["p-b", "p-a", "p-b", "p-c", null])
    expect(notes).toContain("taken-in-phase:  I1 in p-b")
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("left alone:  open, canceled, a test, handled, taken already;  To review and nested items don't count", () => {
    const links =
      '<a href="#i1">I1</a> <a href="#i2">I2</a> <a href="#t3">T3</a> <a href="#q4">Q4</a> <a href="#i5">I5</a>'
    const document = page(
      [
        ["p-a", "done", field("changes", links)],
        [
          "p-b",
          "done",
          field("to-review", '<a href="#i6">I6</a>') +
            '<epic-item id="t9" status="done"><a href="#i7">I7</a></epic-item>'
        ]
      ],
      [
        ["i1", "open"],
        ["i2", "canceled"],
        ["t3", "done"],
        ["q4", "decided", ' handled="p-b"'],
        ["i5", "done", ' taken-in="p-b"'],
        ["i6", "done"],
        ["i7", "done"]
      ]
    )
    expect(STEP.run(document, { now: NOW })).toBe(false)
    expect(takenIn(document)).toEqual([null, null, null, null, "p-b", null, null])
  })
})
