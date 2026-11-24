import { describe, expect, test } from "vite-plus/test"

import { Alignment } from "spell/test-helpers/Alignment"
import { Fixture } from "spell/test-helpers/Fixture"

/** A pill:  a 20px painted shape, its label inside. */
const pill = (text: string, style = "") =>
  `<span class="pill" style="display: inline-block; height: 20px; padding: 0 8px; background: #ddd; ${style}">${text}</span>`

/** A centred row of `items`, 32px tall, in an element marked `id="row"`. */
const row = (items: string, style = "") =>
  `<div id="row" style="display: flex; align-items: center; gap: 8px; height: 32px; ${style}">${items}</div>`

/** The scan's findings inside the fixture only. */
const scanFixture = () => Alignment.scan({ within: "[data-fixture]" })

describe("Alignment", () => {
  test("a row with one item 2px low fails, naming it and how far", () => {
    Fixture.render(row(pill("one") + pill("two") + pill("three", "position: relative; top: 2px")))
    const findings = scanFixture()
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ item: "span.pill", text: "three", offset: 2 })
    expect(findings[0].message).toMatch(/div#row:  span\.pill "three" is drawn 2\.00px lower than the rest of its row/)
  })

  test("the same row lined up passes", () => {
    Fixture.render(row(pill("one") + pill("two") + pill("three")))
    expect(scanFixture()).toEqual([])
  })

  test("a row marked as meant passes", () => {
    Fixture.render(
      `<div data-align="free: raised badge">${row(pill("one") + pill("two", "position: relative; top: -3px"))}</div>`
    )
    expect(scanFixture()).toEqual([])
  })

  test("an item marked as meant is left out of its row", () => {
    Fixture.render(
      row(
        pill("one") +
          pill("two") +
          pill("badge", "margin-top: -6px").replace("<span", '<span data-align="free: raised"')
      )
    )
    expect(scanFixture()).toEqual([])
  })

  test("a row on a shared text baseline passes", () => {
    Fixture.render(
      `<div style="display: flex; align-items: baseline; gap: 8px"><span style="font-size: 24px">Big</span><span style="font-size: 11px">small</span></div>`
    )
    expect(scanFixture()).toEqual([])
  })

  test("measures what's drawn, not the outer box:  a painted shape off-centre in its box fails", () => {
    // both boxes are 24px and centred;  the second's painted shape sits at its box's bottom
    const offset = `<span style="display: inline-flex; height: 24px; align-items: flex-end">${pill("low", "height: 16px")}</span>`
    Fixture.render(row(pill("one", "height: 16px") + offset))
    const findings = scanFixture()
    expect(findings).toHaveLength(1)
    expect(Math.abs(findings[0].offset)).toBeCloseTo(4, 0)
  })

  test("an icon is measured by its glyph", () => {
    // a 20px icon whose glyph is drawn in the top half of its box
    const icon = `<svg width="20" height="20" viewBox="0 0 20 20"><rect x="0" y="0" width="20" height="8" /></svg>`
    Fixture.render(row(pill("label") + icon))
    const findings = scanFixture()
    expect(findings).toHaveLength(1)
    expect(findings[0].item).toMatch(/^svg/)
    expect(findings[0].offset).toBeCloseTo(-6, 0)
  })

  test("looks inside shadow roots and slots", () => {
    const host = Fixture.render(`<div id="host">${pill("slotted", "position: relative; top: 3px")}</div>`)
    host.attachShadow({ mode: "open" }).innerHTML = row(pill("own") + "<slot></slot>")
    const findings = scanFixture()
    expect(findings.map(({ text }) => text)).toEqual(["slotted"])
  })

  test("report() says each kind of finding once, with a count", () => {
    const rowBox = { x: 0, y: 0, width: 10, height: 10 }
    const finding = { row: "r", item: "i", text: "a", offset: 1, message: 'r:  i "a" is drawn 1.00px lower', rowBox }
    const sameKind = { ...finding, text: "b", message: 'r:  i "b" is drawn 1.00px lower' }
    expect(Alignment.report([finding, sameKind, { ...finding, offset: 2, message: "other" }])).toEqual([
      `${finding.message}  (x2)`,
      "other"
    ])
  })
})
