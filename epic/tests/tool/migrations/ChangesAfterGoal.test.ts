/**
 * Tests of the migration `changes-after-goal` (epic `epic-engine` P45):  a phase's Changes after its Goal.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"
import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("changes-after-goal")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 15, 0)

/** A page of phases, each holding `bodies[n]`. */
function page(...bodies: string[]): Document {
  const phases = bodies
    .map((body, at) => `<epic-phase id="p-${at + 1}" title="P" status="todo">${body}</epic-phase>`)
    .join("")
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">${phases}` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Each phase's children, by name:  `symptom goal changes plan`. */
function order(document: Document): string[] {
  return Array.from(document.querySelectorAll("epic-phase"), (phase) =>
    Array.from(phase.children, (child) => child.getAttribute("name") ?? child.localName).join(" ")
  )
}

/** One field. */
function field(name: string, text = name): string {
  return `<epic-field name="${name}"><p>${text}</p></epic-field>`
}

describe("changes-after-goal", () => {
  test("Changes moves after Goal (and Requests), every word kept;  a second run changes nothing", () => {
    const document = page(
      field("symptom") + field("changes", "what changes") + field("goal") + field("plan") + field("files"),
      field("symptom") + field("changes") + field("requests") + field("goal"),
      field("changes") + field("goal") + '<epic-update at="2026-10-25 15:00" summary="s"><p>u</p></epic-update>'
    )
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    expect(order(document)).toEqual([
      "symptom goal changes plan files",
      "symptom requests goal changes",
      "goal changes epic-update"
    ])
    expect(document.querySelector('[name="changes"]')!.textContent).toBe("what changes")
    expect(notes[0]).toBe("changes-after-goal:  p-1:  Changes moved after Goal")
    // in the order `<epic-phase>`'s content model lists
    expect(Markup.validate(document.querySelector("epic-section")!)).toEqual([])
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("a phase already in order, or without Changes, is left as it is", () => {
    const document = page(field("symptom") + field("goal") + field("changes") + field("plan"), field("goal"))
    const before = document.documentElement.outerHTML
    expect(STEP.run(document, { now: NOW })).toBe(false)
    expect(document.documentElement.outerHTML).toBe(before)
  })

  test("a comment on a field that moved follows it:  a move for the inbox", () => {
    const document = page(field("symptom") + field("changes") + field("goal"))
    const inbox = { keyed: {}, comments: { m1: { anchor: "p-1#field-2" }, m2: { anchor: "p-1#field-1" } } }
    const moves: { id: string; from: string; to: string }[] = []
    expect(STEP.run(document, { now: NOW, inbox, moves })).toBe(true)
    // Changes was the 2nd field, now the 3rd;  Symptom stayed the 1st
    expect(moves).toEqual([{ id: "m1", from: "p-1#field-2", to: "p-1#field-3" }])
  })
})
