import { beforeEach, describe, expect, it } from "vite-plus/test"
import { page, userEvent } from "vite-plus/test/browser"

import type { DOMElement } from "spell/element"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-table"

/** `<ui-table>` DOM element, with the properties these tests set. */
type TableDOMElement = DOMElement & { sortColumn?: number; sortDirection?: string }

/** A header row and three body rows:  names, numbers that sort differently as text, notes. */
const ROWS =
  `<ui-row header><ui-cell header>Name</ui-cell><ui-cell header>Count</ui-cell>` +
  `<ui-cell header data-sortable="false">Notes</ui-cell></ui-row>` +
  `<ui-row><ui-cell header>Jamie</ui-cell><ui-cell>10</ui-cell><ui-cell>b</ui-cell></ui-row>` +
  `<ui-row><ui-cell header>Jill</ui-cell><ui-cell>9</ui-cell><ui-cell>c</ui-cell></ui-row>` +
  `<ui-row><ui-cell header>John</ui-cell><ui-cell>100</ui-cell><ui-cell>a</ui-cell></ui-row>`

/** Render a rows-mode `<ui-table>`, wide enough not to stack. */
async function table(attributes = "", inner = ROWS) {
  const wrapper = await ElementFixture.render<HTMLElement>(
    `<div style="width: 1000px"><ui-table ${attributes}>${inner}</ui-table></div>`
  )
  await ElementFixture.settle()
  await ElementFixture.tick()
  return wrapper.querySelector<TableDOMElement>("ui-table")!
}

/** The first column's text, top to bottom, body rows only. */
function names(host: Element): string[] {
  return [...host.querySelectorAll("ui-row:not([header]) > ui-cell:first-child")].map((cell) => cell.textContent!)
}

beforeEach(async () => {
  await page.viewport(1200, 900)
})

describe("<ui-table> rows and cells", () => {
  it("is a table of rows and cells to assistive tech:  table, row, columnheader, rowheader, cell", async () => {
    const host = await table(`caption="Scores"`)
    expect(host.matches(":state(rows)")).toBe(true)
    const internals = (element: Element) => (element as DOMElement).internals
    expect(internals(host).role).toBe("table")
    expect(internals(host).ariaLabel).toBe("Scores")
    const [header, body] = host.querySelectorAll("ui-row")
    expect(internals(header!).role).toBe("row")
    expect(internals(header!.firstElementChild!).role).toBe("columnheader")
    expect(internals(body!.firstElementChild!).role).toBe("rowheader")
    expect(internals(body!.lastElementChild!).role).toBe("cell")
    await expectAccessible(host)
  })

  it("lines its columns up:  every row a subgrid of the table's columns", async () => {
    const host = await table("celled")
    const lefts = (column: number) =>
      [...host.querySelectorAll(`ui-row > ui-cell:nth-child(${column})`)].map((cell) =>
        Math.round(cell.getBoundingClientRect().left)
      )
    expect(new Set(lefts(2)).size).toBe(1)
    expect(new Set(lefts(3)).size).toBe(1)
    expect(host.classList.contains("celled")).toBe(true)
  })

  it("spans columns with `span`, and says so (`aria-colspan`)", async () => {
    const host = await table(
      "",
      `<ui-row><ui-cell>a</ui-cell><ui-cell>b</ui-cell><ui-cell>c</ui-cell></ui-row>` +
        `<ui-row footer><ui-cell span="2">Total</ui-cell><ui-cell>3</ui-cell></ui-row>`
    )
    const [a, , c] = host.querySelectorAll("ui-row:first-child > ui-cell")
    const total = host.querySelector<DOMElement>("ui-cell[span]")!
    const box = total.getBoundingClientRect()
    expect(Math.round(box.left)).toBe(Math.round(a!.getBoundingClientRect().left))
    expect(Math.round(box.right)).toBe(Math.round(c!.getBoundingClientRect().left))
    expect(total.internals.ariaColSpan).toBe("2")
  })

  it("sorts by a header cell, and `client-sort` moves the row elements;  the header row stays first", async () => {
    const host = await table("sortable client-sort")
    const count = host.querySelector<HTMLElement>("ui-row[header] > ui-cell:nth-child(2)")!
    expect(count.getAttribute("tabindex")).toBe("0")
    await userEvent.click(count)
    await ElementFixture.settle()
    expect(host.sortColumn).toBe(1)
    expect(count.getAttribute("aria-sort")).toBe("ascending")
    expect(names(host)).toEqual(["Jill", "Jamie", "John"])
    await userEvent.click(count)
    await ElementFixture.settle()
    expect(names(host)).toEqual(["John", "Jamie", "Jill"])
    expect(host.firstElementChild!.hasAttribute("header")).toBe(true)
  })

  it('skips an opted-out header (`data-sortable="false"`)', async () => {
    const host = await table("sortable")
    const notes = host.querySelector<HTMLElement>("ui-row[header] > ui-cell:nth-child(3)")!
    expect(notes.hasAttribute("tabindex")).toBe(false)
    await userEvent.click(notes)
    await ElementFixture.settle()
    expect(host.sortColumn).toBeUndefined()
  })

  it("draws its `caption` above the rows", async () => {
    const host = await table(`caption="Scores"`)
    const caption = host.shadowRoot!.querySelector(".caption")!
    expect(caption.textContent).toBe("Scores")
    const firstRow = host.querySelector("ui-row")!
    expect(caption.getBoundingClientRect().bottom).toBeLessThanOrEqual(firstRow.getBoundingClientRect().top + 1)
  })

  it("leaves the grid's rows as they are:  a `<ui-row>` in a `<ui-grid>` is a grid row", async () => {
    const grid = await ElementFixture.render<HTMLElement>(
      `<ui-grid><ui-row columns="2"><ui-column>a</ui-column><ui-column>b</ui-column></ui-row></ui-grid>`
    )
    await ElementFixture.settle()
    const row = grid.querySelector<DOMElement>("ui-row")!
    expect(row.matches(":state(in-table)")).toBe(false)
    expect(row.internals.role).toBeFalsy()
    expect(row.shadowRoot!.querySelector(".row")).not.toBeNull()
  })
})
