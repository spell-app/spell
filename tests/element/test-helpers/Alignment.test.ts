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

  test("words clamped to two lines are measured to the second line's baseline, not past it", () => {
    // a tile beside a title and a description cut to two lines:  the words' capitals to baseline centred on the tile
    const words =
      `<span style="display: flex; flex-direction: column; font: 13px/18px sans-serif">` +
      `<span>Title</span>` +
      `<span style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden">` +
      `${"many words ".repeat(40)}</span></span>`
    Fixture.render(row(pill("T", "height: 40px") + words, "height: 80px; width: 240px"))
    expect(scanFixture()).toEqual([])
  })

  test("looks inside shadow roots and slots", () => {
    const host = Fixture.render(`<div id="host">${pill("slotted", "position: relative; top: 3px")}</div>`)
    host.attachShadow({ mode: "open" }).innerHTML = row(pill("own") + "<slot></slot>")
    const findings = scanFixture()
    expect(findings.map(({ text }) => text)).toEqual(["slotted"])
  })

  describe("columns", () => {
    /** A 20px icon whose glyph is a 12px square, `x` from its box's left. */
    const icon = (x = 4) =>
      `<svg width="20" height="20" viewBox="0 0 20 20"><rect x="${x}" y="4" width="12" height="12" /></svg>`
    /** A 32px square button, its icon centred in it. */
    const button = (glyph = icon()) =>
      `<span class="button" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px">${glyph}</span>`
    /**
     * A rail like the editor's add bar:  a painted strip 40px wide, its buttons in a 32px stack inside it, marked `id="rail"`.
     * - `stack`:  how the stack sits;  by default at the rail's left, as the add bar's did
     */
    const rail = (stack = "display: inline-block; width: 32px") =>
      `<div id="rail" style="width: 40px; height: 240px; background: #eee">` +
      `<div class="stack" style="${stack}">${button() + button() + button()}</div></div>`

    test("a rail whose icons sit left of its middle fails, naming the stack and how far", () => {
      Fixture.render(rail())
      const findings = scanFixture()
      expect(findings).toHaveLength(1)
      expect(findings[0]).toMatchObject({ axis: "column", item: "div.stack", offset: -4 })
      expect(findings[0].message).toMatch(/div#rail:  div\.stack is drawn 4\.00px left of its column's middle/)
    })

    test("the same rail with its stack in its middle passes", () => {
      Fixture.render(rail("display: flex; flex-direction: column; align-items: center"))
      expect(scanFixture()).toEqual([])
    })

    test("a centred column with one glyph drawn off its box's middle fails", () => {
      const column = (items: string) =>
        `<div id="column" style="display: flex; flex-direction: column; align-items: center; width: 60px">${items}</div>`
      Fixture.render(column(button() + button(icon(8)) + button()))
      const findings = scanFixture()
      expect(findings).toHaveLength(1)
      expect(findings[0]).toMatchObject({ axis: "column", item: "span.button", offset: 4 })
      expect(findings[0].message).toMatch(/is drawn 4\.00px right of its column's middle/)
    })

    test("a column marked as meant passes", () => {
      Fixture.render(`<div data-align="free: pinned left">${rail()}</div>`)
      expect(scanFixture()).toEqual([])
    })

    test("an unpainted column holding one icon off its box's middle passes:  nobody sees that middle", () => {
      Fixture.render(`<div style="display: inline-grid; place-items: center; width: 32px">${icon(0)}</div>`)
      expect(scanFixture()).toEqual([])
    })

    test("a column left at the start (a list of labels) is not checked", () => {
      Fixture.render(
        `<div style="display: flex; flex-direction: column; width: 300px">${pill("one")}${pill("a longer label")}</div>`
      )
      expect(scanFixture()).toEqual([])
    })
  })

  test("report() says each kind of finding once, with a count", () => {
    const lineBox = { x: 0, y: 0, width: 10, height: 10 }
    const finding = {
      axis: "row" as const,
      line: "r",
      item: "i",
      text: "a",
      offset: 1,
      message: 'r:  i "a" is drawn 1.00px lower',
      lineBox
    }
    const sameKind = { ...finding, text: "b", message: 'r:  i "b" is drawn 1.00px lower' }
    expect(Alignment.report([finding, sameKind, { ...finding, offset: 2, message: "other" }])).toEqual([
      `${finding.message}  (x2)`,
      "other"
    ])
  })
})
