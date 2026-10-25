/**
 * Tests of the migration `to-review-marks` (epic `epic-engine` P45):  To review links as `<epic-mark item link>`s.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell-epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("to-review-marks")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 15, 0)

/** A page with one phase, its To review field holding `html`, and a Goal with a link of its own. */
function page(html: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">` +
      `<epic-phase id="p-a" title="A" status="active"><epic-field name="goal"><p>See <a href="#q1">Q1</a>.</p></epic-field>` +
      `<epic-field name="to-review">${html}</epic-field></epic-phase></epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** The To review field's markup. */
function toReview(document: Document): string {
  return document.querySelector('epic-field[name="to-review"]')!.innerHTML
}

describe("to-review-marks", () => {
  test("each link a mark, the commas kept;  a link elsewhere left;  a second run changes nothing", () => {
    const document = page('<a href="#j8">J8</a>, <a href="#q12">Q12</a>')
    expect(STEP.run(document, { now: NOW })).toBe(true)
    expect(toReview(document)).toBe(
      '<epic-mark item="j8" link=""></epic-mark>, <epic-mark item="q12" link=""></epic-mark>'
    )
    expect(document.querySelector('epic-field[name="goal"] a')!.getAttribute("href")).toBe("#q1")
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("a link whose words aren't its id is left, and reported:  every word kept", () => {
    const document = page('<a href="#j8">the colours call</a>, <a href="#i3">I3</a>')
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(toReview(document)).toBe('<a href="#j8">the colours call</a>, <epic-mark item="i3" link=""></epic-mark>')
    expect(notes).toEqual(["to-review-marks:  p-a:  <a href=\"#j8\">the colours call</a> isn't an item's id;  left"])
  })
})
