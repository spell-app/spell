import { afterEach, describe, expect, test } from "vite-plus/test"
import { page } from "vite-plus/test/browser"

import { roomFor, widenTable } from "spell/epic/tools/_assets/spell-doc-helpers.js"

/**
 * Where a table lands when its expand button runs it the page's width (the runtime's `wireTableWidths()`), in a real
 * browser's layout:  `roomFor()` says how far it may run, `widenTable()` moves it there.
 * - Owen, 2026-11-20 (epic `epic-engine` I367):  "zoomed tables still don't work -- it is probably the right size, but
 *   it pins the left side and cuts off the right side."  A table in the reading column, centred by its
 *   `margin-inline` (`spell-doc.css`'s `--spell-column-inset`), was widened with that margin counted twice:  at
 *   1420px it started 270px left of the window.
 * - the page here is the docs layout's own rules, written small:  `<main>` the window's width, a container, each block
 *   in it centred in an 880px column by the same `margin-inline` expression
 */

/** The widths checked:  a desktop, VS Code's side bar as Owen has it, narrower, and a wide screen. */
const WIDTHS = [1420, 1200, 1024, 900, 1800]

/** How far off a measured edge may be, px. */
const TOLERANCE = 1

/** The docs layout's rules, as `spell-doc.css` has them ("Layout"). */
const LAYOUT_CSS = `
  body { margin: 0 }
  main { --spell-gutter: 16px; --spell-measure: 880px; container-type: inline-size; display: block; width: 100% }
  main > .block, main > section > .block, main > section > ul {
    margin-inline: max(var(--spell-gutter), (100cqi - var(--spell-measure)) / 2 + var(--spell-gutter));
  }
  .block { display: block; overflow-x: auto; max-width: 100% }
  .block table { width: 100%; border-collapse: collapse }
  .block td { border: 1px solid; padding: 4px 8px }
  epic-actions { display: block; height: 0 }
`

/** A table of `columns` columns, each cell's words long enough that a wide table wants the whole page. */
function tableHtml(columns: number, words = "a long cell of words that wants room to breathe on one line") {
  const cells = Array.from({ length: columns }, (_cell, at) => `<td>${at + 1}: ${words}</td>`).join("")
  return `<epic-actions></epic-actions><div class="block"><table><tr>${cells}</tr><tr>${cells}</tr></table></div>`
}

/** The page:  `<main>` holding `html`, at `width` px wide;  its `main`, and its first table's box and actions row. */
async function pageOf(width: number, html: string) {
  await page.viewport(width, 800)
  document.body.innerHTML = `<style>${LAYOUT_CSS}</style><main>${html}</main>`
  const main = document.querySelector("main")!
  const box = main.querySelector<HTMLElement>(".block")!
  const row = box.previousElementSibling as HTMLElement
  return { main, box, row }
}

/** Widen `box` as the expand button does, and measure where it and its table landed. */
function widen(main: HTMLElement, box: HTMLElement, row: HTMLElement) {
  const room = roomFor(box, main)
  widenTable(box, row, room)
  const rect = box.getBoundingClientRect()
  return { room, rect, rowRect: row.getBoundingClientRect(), scrolls: box.scrollWidth > box.clientWidth }
}

/** `rect` in the window:  its left edge on screen, its right edge on screen too (or its box scrolls to it). */
function expectOnScreen({ rect, room }: ReturnType<typeof widen>) {
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(Math.abs(rect.left - room.left)).toBeLessThanOrEqual(TOLERANCE)
  expect(rect.right).toBeLessThanOrEqual(innerWidth)
  expect(Math.abs(rect.right - room.right)).toBeLessThanOrEqual(TOLERANCE)
}

/** An element laying out what it's given in a padded box of its shadow root, as an `<epic-field>`'s `.text` does. */
class PaddedField extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" }).innerHTML = `<div style="padding-left: 51px"><slot></slot></div>`
  }
}
if (!customElements.get("padded-field")) customElements.define("padded-field", PaddedField)

afterEach(() => {
  document.body.innerHTML = ""
})

describe("widenTable():  a widened table runs the page's width, all of it on screen", () => {
  for (const width of WIDTHS) {
    test(`a wide table centred in the reading column, at ${width}px:  its left edge on screen, its right reachable`, async () => {
      const { main, box, row } = await pageOf(width, `<section>${tableHtml(4)}</section>`)
      const landed = widen(main, box, row)
      expectOnScreen(landed)
      // its own table:  inside the box, or the box scrolls sideways to it
      const table = box.querySelector("table")!.getBoundingClientRect()
      expect(table.left).toBeGreaterThanOrEqual(landed.rect.left - TOLERANCE)
      expect(table.right <= landed.rect.right + TOLERANCE || landed.scrolls).toBe(true)
      // its actions row (the bullhorn and the expand button) moves with it
      expect(Math.abs(landed.rowRect.left - landed.rect.left)).toBeLessThanOrEqual(TOLERANCE)
      expect(Math.abs(landed.rowRect.right - landed.rect.right)).toBeLessThanOrEqual(TOLERANCE)
    })
  }

  test("widened again (the window resized, a section opened):  it lands in the same place, never drifting", async () => {
    const { main, box, row } = await pageOf(1420, `<section>${tableHtml(4)}</section>`)
    widen(main, box, row)
    await page.viewport(1100, 800)
    expectOnScreen(widen(main, box, row))
  })

  test("a table inside a list item (no margin of its own, its parent indented):  out to the gutter too", async () => {
    const { main, box, row } = await pageOf(1420, `<section><ul><li>An item ${tableHtml(4)}</li></ul></section>`)
    expectOnScreen(widen(main, box, row))
  })

  test("a table slotted into an element whose shadow box is padded (an `<epic-field>`'s, I315):  where it's laid out", async () => {
    const { main, box, row } = await pageOf(
      1420,
      `<section><div class="block-holder"><padded-field>${tableHtml(4)}</padded-field></div></section>`
    )
    expectOnScreen(widen(main, box, row))
  })

  for (const width of [1420, 900]) {
    test(`a narrow table (two short columns), at ${width}px:  centred, in the column and widened`, async () => {
      const { main, box, row } = await pageOf(width, `<section>${tableHtml(2, "short")}</section>`)
      const column = box.getBoundingClientRect()
      expect(Math.abs(column.left - (innerWidth - column.right))).toBeLessThanOrEqual(TOLERANCE)
      const landed = widen(main, box, row)
      expectOnScreen(landed)
      expect(Math.abs(landed.rect.left - (innerWidth - landed.rect.right))).toBeLessThanOrEqual(TOLERANCE)
    })
  }
})
