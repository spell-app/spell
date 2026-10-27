/**
 * Tests of the migration `took-as-minutes` (epic `epic-engine` P41):  a phase's `took` in the tool's form.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("took-as-minutes")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 15, 0)

/** A page whose phases have these `took`s (`null`:  none). */
function page(...took: (string | null)[]): Document {
  const phases = took
    .map((value, at) => {
      const attribute = value === null ? "" : ` took="${value}"`
      return `<epic-phase id="p-${at + 1}" title="P" status="done"${attribute}></epic-phase>`
    })
    .join("")
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">${phases}` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Every phase's `took`, in order. */
function tooks(document: Document): (string | null)[] {
  return Array.from(document.querySelectorAll("epic-phase"), (phase) => phase.getAttribute("took"))
}

describe("took-as-minutes", () => {
  test("a hand-written took becomes the tool's form;  a second run changes nothing", () => {
    const document = page("21 min", "1.5h", "took 45m", "~2h", "")
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(tooks(document)).toEqual(["21m", "1h 30m", "45m", "2h", null])
    expect(notes).toContain('took-as-minutes:  p-1:  took="21 min" -> "21m"')
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("a page without one, or already in the tool's form, is left as it is;  one that won't read is reported", () => {
    const document = page(null, "21m", "1h 30m", "a while")
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(false)
    expect(tooks(document)).toEqual([null, "21m", "1h 30m", "a while"])
    expect(notes).toEqual(['took-as-minutes:  p-4:  took="a while" won\'t read as a time;  left'])
  })
})
