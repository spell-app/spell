/**
 * Tests of the migration `clarified-bodies` (epic `epic-engine` I301):  an item clarified before More Details replaced
 * its text loses the "What it says on the tin" body it was given.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("clarified-bodies")!

/** The context every run gets. */
const NOW = { now: new Date(2026, 10, 15, 16, 0) }

/** The body a bodiless item is given (`PlanItem.giveBody()`). */
const TIN = '<p data-title-body=""><em>What it says on the tin.</em><epic-clarify></epic-clarify></p>'

/** A page holding `items`' markup, in an issues section. */
function page(items: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="issues" kind="issues">${items}` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("clarified-bodies", () => {
  test("takes the given body off an item with More Details, keeps its other children, and runs once", () => {
    const document = page(
      `<epic-item id="i283" title="a" status="open">${TIN}<epic-more><p>clear</p></epic-more>` +
        `<epic-commit sha="abc"></epic-commit></epic-item>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { ...NOW, notes })).toBe(true)
    const item = document.getElementById("i283")!
    expect([...item.children].map((child) => child.localName)).toEqual(["epic-more", "epic-commit"])
    expect(notes).toEqual(["clarified-bodies:  I283"])
    expect(STEP.run(document, NOW)).toBe(false)
  })

  test("leaves a given body with no More Details, and prose anyone wrote above one", () => {
    const document = page(
      `<epic-item id="i1" title="a" status="open">${TIN}</epic-item>` +
        `<epic-item id="i2" title="b" status="open"><p>said</p><epic-more><p>more</p></epic-more></epic-item>`
    )
    const before = document.body.innerHTML
    expect(STEP.run(document, NOW)).toBe(false)
    expect(document.body.innerHTML).toBe(before)
  })
})
