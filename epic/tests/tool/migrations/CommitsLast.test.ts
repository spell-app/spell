/**
 * Tests of the migration `commits-last` (epic `epic-engine` I493):  an item's commits after its text.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"
import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("commits-last")!

/** Now, for the context. */
const NOW = new Date(2026, 10, 26, 15, 0)

/** A page of items, each holding `bodies[n]`. */
function page(...bodies: string[]): Document {
  const items = bodies
    .map((body, at) => `<epic-item id="t${at + 1}" title="T" status="done">${body}</epic-item>`)
    .join("")
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="todo" kind="todo">${items}` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Each item's children:  `p epic-commit`. */
function order(document: Document): string[] {
  return Array.from(document.querySelectorAll("epic-item"), (item) =>
    Array.from(item.children, (child) => child.localName).join(" ")
  )
}

/** A commit, `sha` its first letters. */
function commit(sha: string): string {
  return `<epic-commit sha="${sha.padEnd(40, "0")}">${sha}</epic-commit>`
}

describe("commits-last", () => {
  test("an item's commits move after its text, in their order, every word kept;  a second run changes nothing", () => {
    const document = page(
      `<p>one</p>${commit("aa")}<p>two</p><ul><li>three</li></ul>${commit("bb")}`,
      `<p>in order</p>${commit("cc")}${commit("dd")}`
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(order(document)).toEqual(["p p ul epic-commit epic-commit", "p epic-commit epic-commit"])
    const shas = Array.from(document.querySelectorAll("#t1 > epic-commit"), (each) => each.textContent)
    expect(shas).toEqual(["aa", "bb"])
    expect(notes).toEqual(["commits-last:  commits moved after the text:  T1"])
    expect(Markup.validate(document).filter((problem) => problem.kind === "out of order")).toEqual([])
    expect(STEP.run(document, { now: NOW, notes: [] })).toBe(false)
  })

  test("a slotted child after a commit stays, and moves nothing", () => {
    const document = page(`<p>text</p>${commit("aa")}<epic-status slot="status" at="2026-11-26 15:00"></epic-status>`)
    expect(STEP.run(document, { now: NOW, notes: [] })).toBe(false)
  })
})
