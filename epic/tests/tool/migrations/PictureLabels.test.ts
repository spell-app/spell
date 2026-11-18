/**
 * Tests of the migration `picture-labels` (epic `epic-engine` P75):  an item's pictures each get their label, in order;
 * a labelled one keeps its label, and a gap stays.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("picture-labels")!

/** The context every run gets. */
const NOW = { now: new Date(2026, 10, 17, 23, 0) }

/** A picture of `src`, labelled `label` when given. */
function picture(src: string, label?: string): string {
  return `<epic-picture${label ? ` label="${label}"` : ""}><img src="pictures/${src}.png" alt="x"></epic-picture>`
}

/** A page of one issue, `i1`, holding `pictures`, and a second, `i2`, holding `others`. */
function page(pictures: string, others = ""): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="issues" kind="issues">` +
      `<epic-item id="i1"><p>Words.</p>${pictures}</epic-item><epic-item id="i2">${others}</epic-item>` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** The labels of item `id`'s pictures, in order. */
function labelsOf(document: Document, id: string): (string | null)[] {
  return [...document.getElementById(id)!.querySelectorAll("epic-picture")].map((each) => each.getAttribute("label"))
}

describe("picture-labels", () => {
  test("each item's pictures are labelled in order, counting from 1 in every item", () => {
    const document = page(picture("a") + picture("b"), picture("c"))
    const notes: string[] = []
    expect(STEP.run(document, { ...NOW, notes })).toBe(true)
    expect(labelsOf(document, "i1")).toEqual(["IMG1", "IMG2"])
    expect(labelsOf(document, "i2")).toEqual(["IMG1"])
    expect(notes).toEqual(["picture-labels:  labelled the pictures of I1, I2"])
  })

  test("a labelled picture keeps its label, a gap stays, and a new one counts on from the highest", () => {
    const document = page(picture("a", "IMG1") + picture("c", "IMG3") + picture("d"))
    expect(STEP.run(document, NOW)).toBe(true)
    expect(labelsOf(document, "i1")).toEqual(["IMG1", "IMG3", "IMG4"])
  })

  test("idempotent:  a page labelled already is left alone", () => {
    const document = page(picture("a", "IMG1"))
    expect(STEP.run(document, NOW)).toBe(false)
    expect(STEP.run(page(""), NOW)).toBe(false)
  })
})
