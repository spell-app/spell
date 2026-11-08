import { describe, expect, it } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { TableColumn, TableEditDetail, TableRow } from "spell/ui/components/components.types"
import type { DOMElement } from "spell/element"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-table"

/** `<ui-table editable>`, with its properties. */
type TableDOMElement = DOMElement & { rows?: TableRow[]; columnDefs?: TableColumn[] }

/** Three reviews:  words, a number, a tick box, a choice. */
const ROWS: TableRow[] = [
  { film: "A New Hope", stars: 5, seen: true, mood: "glad" },
  { film: "The Empire Strikes Back", stars: 4, seen: false, mood: "sad" }
]

/** The columns, with the choice's words. */
const COLUMNS: TableColumn[] = [
  { key: "film", header: "Film" },
  { key: "stars", header: "Stars" },
  { key: "seen", header: "Seen" },
  {
    key: "mood",
    header: "Mood",
    choices: [
      { value: "glad", text: "Glad" },
      { value: "sad", text: "Sad" }
    ]
  }
]

/** Let queued writes and effects run. */
async function settle() {
  await ElementFixture.tick()
  await ElementFixture.tick()
}

/** An editable table of `ROWS`, and the `ui-editing` details it sends;  `cancel` cancels them. */
async function editable(cancel = false) {
  const host = await ElementFixture.render<TableDOMElement>(`<ui-table editable celled></ui-table>`)
  host.columnDefs = COLUMNS
  host.rows = ROWS
  await settle()
  const sent: TableEditDetail[] = []
  host.addEventListener("ui-editing", (event) => {
    sent.push((event as CustomEvent<TableEditDetail>).detail)
    if (cancel) event.preventDefault()
  })
  const table = host.querySelector("table")!
  const cell = (row: number, column: number) => table.tBodies[0]!.rows[row]!.cells[column]!
  return { host, table, cell, sent }
}

describe("<ui-table editable>", () => {
  it("is a grid with one cell in the tab order, the empty last row after the rows", async () => {
    const { host, table, cell } = await editable()
    expect(table.getAttribute("role")).toBe("grid")
    expect(table.className).toContain("editable")
    expect(table.tBodies[0]!.rows).toHaveLength(3)
    expect(table.querySelectorAll("td[tabindex='0']")).toHaveLength(1)
    expect(cell(0, 0).tabIndex).toBe(0)
    expect(cell(0, 3).textContent).toContain("Glad")
    await expectAccessible(host)
  })

  it("moves its cursor with the arrows, Tab and End", async () => {
    const { cell } = await editable()
    cell(0, 0).focus()
    await userEvent.keyboard("{ArrowRight}")
    await settle()
    expect(document.activeElement).toBe(cell(0, 1))
    await userEvent.keyboard("{ArrowDown}")
    await settle()
    expect(document.activeElement).toBe(cell(1, 1))
    await userEvent.keyboard("{End}")
    await settle()
    expect(document.activeElement).toBe(cell(1, 3))
    await userEvent.keyboard("{Tab}")
    await settle()
    expect(document.activeElement).toBe(cell(2, 0))
  })

  it("types into a cell, and Enter keeps it:  one set, shown in new rows of its own", async () => {
    const { host, cell, sent } = await editable()
    cell(0, 1).focus()
    await userEvent.keyboard("3{Enter}")
    await settle()
    expect(sent).toHaveLength(1)
    expect(sent[0]!.edits).toEqual([{ kind: "set", row: ROWS[0], key: "stars", value: 3, was: 5 }])
    expect(cell(0, 1).textContent).toBe("3")
    expect(host.rows![0]).not.toBe(ROWS[0])
    expect(ROWS[0]!.stars).toBe(5)
    expect(document.activeElement).toBe(cell(1, 1))
  })

  it("Escape puts the cell back, and sends nothing", async () => {
    const { cell, sent } = await editable()
    cell(0, 0).focus()
    await userEvent.keyboard("Nope{Escape}")
    await settle()
    expect(sent).toHaveLength(0)
    expect(cell(0, 0).textContent).toBe("A New Hope")
    expect(document.activeElement).toBe(cell(0, 0))
  })

  it("toggles a tick box with Space", async () => {
    const { cell, sent } = await editable()
    cell(1, 2).focus()
    await userEvent.keyboard(" ")
    await settle()
    expect(sent[0]!.edits).toEqual([{ kind: "set", row: ROWS[1], key: "seen", value: true, was: false }])
    expect(cell(1, 2).querySelector("input")!.checked).toBe(true)
  })

  it("adds a row from the empty last row", async () => {
    const { host, cell, sent } = await editable()
    cell(2, 0).focus()
    await userEvent.keyboard("Return of the Jedi{Enter}")
    await settle()
    expect(sent[0]!.edits).toEqual([{ kind: "add", values: { film: "Return of the Jedi" } }])
    expect(host.rows).toHaveLength(3)
  })

  it("clears a cell with Delete, and removes its row with ⌘ / Ctrl + Delete", async () => {
    const { host, cell, sent } = await editable()
    cell(0, 0).focus()
    await userEvent.keyboard("{Delete}")
    await settle()
    expect(sent[0]!.edits).toEqual([{ kind: "set", row: ROWS[0], key: "film", value: undefined, was: "A New Hope" }])
    cell(1, 0).focus()
    await userEvent.keyboard("{Control>}{Delete}{/Control}")
    await settle()
    expect(sent[1]!.edits).toEqual([{ kind: "remove", row: ROWS[1] }])
    expect(host.rows).toHaveLength(1)
  })

  it("fills from the cursor when a block of cells is pasted, as one change", async () => {
    const { cell, sent } = await editable()
    cell(1, 0).focus()
    const data = new DataTransfer()
    data.setData("text/plain", "Empire\t3\nJedi\t4\n")
    cell(1, 0).dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }))
    await settle()
    expect(sent).toHaveLength(1)
    expect(sent[0]!.edits).toEqual([
      { kind: "set", row: ROWS[1], key: "film", value: "Empire", was: "The Empire Strikes Back" },
      { kind: "set", row: ROWS[1], key: "stars", value: 3, was: 4 },
      { kind: "add", values: { film: "Jedi", stars: 4 } }
    ])
    expect(cell(2, 0).textContent).toBe("Jedi")
  })

  it("leaves its rows to a page that cancels ui-editing, and writes them itself", async () => {
    const { host, cell, sent } = await editable(true)
    cell(0, 1).focus()
    await userEvent.keyboard("1{Enter}")
    await settle()
    expect(sent).toHaveLength(1)
    expect(host.rows).toBe(ROWS)
    expect(cell(0, 1).textContent).toBe("5")
  })

  it("opens a choice's list, and keeps the one picked", async () => {
    const { cell, sent } = await editable()
    cell(0, 3).focus()
    await userEvent.keyboard("{F2}")
    await settle()
    const select = cell(0, 3).querySelector("select")!
    expect(document.activeElement).toBe(select)
    await userEvent.selectOptions(select, "1")
    await userEvent.keyboard("{Enter}")
    await settle()
    expect(sent[0]!.edits).toEqual([{ kind: "set", row: ROWS[0], key: "mood", value: "sad", was: "glad" }])
  })

  it("leaves a read-only column alone", async () => {
    const host = await ElementFixture.render<TableDOMElement>(`<ui-table editable></ui-table>`)
    host.columnDefs = [{ key: "film", readOnly: true }]
    host.rows = [{ film: "A New Hope" }]
    await settle()
    const sent: unknown[] = []
    host.addEventListener("ui-editing", (event) => sent.push(event))
    const cell = host.querySelector("td")!
    expect(cell.getAttribute("aria-readonly")).toBe("true")
    cell.focus()
    await userEvent.keyboard("x{Delete}")
    await settle()
    expect(sent).toHaveLength(0)
  })

  it("is square while editable:  no rounded corners on the table or its cells", async () => {
    const { table, cell } = await editable()
    expect(getComputedStyle(table).borderTopLeftRadius).toBe("0px")
    expect(getComputedStyle(cell(0, 0)).borderTopLeftRadius).toBe("0px")
  })
})
