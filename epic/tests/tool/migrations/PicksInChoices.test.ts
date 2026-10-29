/**
 * Tests of the migration `picks-in-choices` (epic `epic-engine` I153):  each pick's Noted card moves into its item's
 * Choices.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("picks-in-choices")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 29, 15, 0)

/** A set of options A and B, `chosen` when given. */
function choices(chosen?: string): string {
  const attribute = chosen ? ` chosen="${chosen}"` : ""
  return (
    `<epic-choices${attribute}><epic-option letter="A" title="Keep folds"></epic-option>` +
    `<epic-option letter="B" title="Unfold it"></epic-option></epic-choices>`
  )
}

/** A Noted card saying `text`. */
function noted(text: string, at = "2026-10-22 23:35", extra = ""): string {
  return `<epic-status slot="status" state="noted" at="${at}"${extra}><p>${text}</p></epic-status>`
}

/** A page of `items`, `[id, inner]`, and its log. */
function page(items: [string, string][]): Document {
  const inner = items.map(([id, html]) => `<epic-item id="${id}" title="${id} title" status="open">${html}</epic-item>`)
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="judgements" kind="judgements">` +
      `${inner.join("")}</epic-section><epic-section id="log" kind="log"></epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("picks-in-choices", () => {
  test("moves a pick's card into its set:  its day and what it recorded;  logged;  a second run changes nothing", () => {
    const document = page([
      [
        "j1",
        choices("A") + noted("Chose A · Keep folds: recorded, the call accepted; waiting for a phase to take it up")
      ],
      [
        "q1",
        choices("B") +
          noted("Chose B · Unfold it:  recorded after the talk", "2026-10-20 10:00", ' done-at="2026-10-21 09:00"')
      ]
    ])
    const notes: string[] = []
    expect(STEP.run(document, { now: NOW, notes })).toBe(true)
    const j1 = document.querySelector("#j1 epic-choices")!
    expect(j1.getAttribute("chosen-on")).toBe("2026-10-22")
    expect(j1.getAttribute("chosen-note")).toBe("recorded, the call accepted; waiting for a phase to take it up")
    const q1 = document.querySelector("#q1 epic-choices")!
    expect([q1.getAttribute("chosen-on"), q1.getAttribute("chosen-note")]).toEqual([
      "2026-10-21",
      "recorded after the talk"
    ])
    expect(document.querySelectorAll("epic-status")).toHaveLength(0)
    expect(notes).toHaveLength(2)
    expect(document.querySelector("epic-event")!.textContent).toBe(
      "Picks' Noted cards moved into their Choices:  J1, Q1"
    )
    expect(STEP.run(document, { now: NOW })).toBe(false)
  })

  test("left:  other Noted cards, a card whose letter isn't chosen, a card with a summary, no chosen set", () => {
    const document = page([
      ["j1", choices("A") + noted("Made todo T23 to follow this up.") + noted("Chose B · Unfold it: recorded")],
      [
        "j2",
        choices("A") +
          `<epic-status slot="status" state="noted" at="2026-10-22 10:00"><p>Chose A · Keep folds</p>` +
          `<p slot="summary">done</p></epic-status>`
      ],
      ["j3", choices() + noted("Chose A · Keep folds: recorded")]
    ])
    expect(STEP.run(document, { now: NOW })).toBe(false)
    expect(document.querySelectorAll("epic-status")).toHaveLength(4)
  })

  test("a set that has its line already keeps it;  the card just goes", () => {
    const document = page([
      [
        "j1",
        choices("A").replace("<epic-choices", '<epic-choices chosen-note="kept"') +
          noted("Chose A · Keep folds: recorded")
      ]
    ])
    expect(STEP.run(document, { now: NOW })).toBe(true)
    expect(document.querySelector("epic-choices")!.getAttribute("chosen-note")).toBe("kept")
    expect(document.querySelector("epic-status")).toBeNull()
  })
})
