import { describe, expect, it } from "vite-plus/test"

import type { TableColumn, TableRow } from "spell/ui/components/components.types"
import { TableEditing } from "spell/ui/components/ui-table/TableEditing"

describe("TableEditing.columnsOf()", () => {
  it("names a plain row's keys", () => {
    expect(TableEditing.columnsOf([{ name: "Ana", age: 3 }]).map((column) => column.key)).toEqual(["name", "age"])
  })

  it("names a thing's columns by its toJSON(), without its $ keys", () => {
    class Thing {
      hidden = "kept on the side"
      toJSON() {
        return { $type: "Thing", id: "t1", filmTitle: "A", stars: 4 }
      }
    }
    const rows = [new Thing()] as unknown as TableRow[]
    expect(TableEditing.columnsOf(rows)).toEqual([
      { key: "id", header: "id", readOnly: true },
      { key: "filmTitle", header: "film title" },
      { key: "stars", header: "stars" }
    ])
  })
})

describe("TableEditing.typeOf()", () => {
  const rows: TableRow[] = [{ name: "", count: 3, done: false, when: new Date(2026, 10, 7) }]

  it("is a column's own type first, then what its first value is", () => {
    expect(TableEditing.typeOf({ key: "name", type: "date" }, rows)).toBe("date")
    expect(TableEditing.typeOf({ key: "count" }, rows)).toBe("number")
    expect(TableEditing.typeOf({ key: "done" }, rows)).toBe("yes-no")
    expect(TableEditing.typeOf({ key: "when" }, rows)).toBe("date")
    expect(TableEditing.typeOf({ key: "name" }, rows)).toBe("text")
    expect(TableEditing.typeOf({ key: "name", choices: [{ value: "a" }] }, rows)).toBe("choice")
  })
})

describe("TableEditing.valueFrom()", () => {
  const choices: TableColumn = {
    key: "size",
    choices: [
      { value: "s", text: "Small" },
      { value: "l", text: "Large" }
    ]
  }

  it("reads an editor's text as its column's kind of value", () => {
    expect(TableEditing.valueFrom({ key: "n" }, "number", "1,200")).toBe(1200)
    expect(TableEditing.valueFrom({ key: "n" }, "number", "")).toBeUndefined()
    expect(TableEditing.valueFrom({ key: "n" }, "number", "lots")).toBeUndefined()
    expect(TableEditing.valueFrom({ key: "d" }, "date", "2026-11-07")).toBe("2026-11-07")
    expect(TableEditing.valueFrom({ key: "d" }, "date", "2026-11-07", new Date())).toBeInstanceOf(Date)
    expect(TableEditing.valueFrom({ key: "y" }, "yes-no", "yes")).toBe(true)
    expect(TableEditing.valueFrom({ key: "y" }, "yes-no", "no")).toBe(false)
    expect(TableEditing.valueFrom(choices, "choice", "1")).toBe("l")
    expect(TableEditing.valueFrom(choices, "choice", "Small")).toBe("s")
    expect(TableEditing.valueFrom({ key: "t" }, "text", " as typed ")).toBe(" as typed ")
  })

  it("starts an editor with the cell's value, and shows a choice's words", () => {
    expect(TableEditing.draftFor(choices, "choice", "l")).toBe("1")
    expect(TableEditing.draftFor({ key: "d" }, "date", new Date(2026, 10, 7))).toBe("2026-11-07")
    expect(TableEditing.textFor(choices, "choice", "s")).toBe("Small")
  })
})

describe("TableEditing paste", () => {
  const rows: TableRow[] = [
    { name: "Ana", stars: 3 },
    { name: "Ben", stars: 4 }
  ]
  const columns: TableColumn[] = [{ key: "name" }, { key: "stars" }]
  const types = ["text", "number"] as const

  it("reads tab-separated lines, as a spreadsheet copies them", () => {
    expect(TableEditing.cellsOf("a\tb\r\nc\td\n")).toEqual([
      ["a", "b"],
      ["c", "d"]
    ])
  })

  it("sets the cells it covers, adds rows past the end, and drops cells past the last column", () => {
    const edits = TableEditing.pasteEdits({
      rows,
      columns,
      types: [...types],
      row: 1,
      column: 0,
      cells: [
        ["Bea", "4", "extra"],
        ["Cy", "5"]
      ]
    })
    expect(edits).toEqual([
      { kind: "set", row: rows[1], key: "name", value: "Bea", was: "Ben" },
      { kind: "add", values: { name: "Cy", stars: 5 } }
    ])
  })

  it("passes over a read-only column", () => {
    const edits = TableEditing.pasteEdits({
      rows,
      columns: [{ key: "name", readOnly: true }, { key: "stars" }],
      types: [...types],
      row: 0,
      column: 0,
      cells: [["Zed", "1"]]
    })
    expect(edits).toEqual([{ kind: "set", row: rows[0], key: "stars", value: 1, was: 3 }])
  })
})

describe("TableEditing.applied()", () => {
  it("makes new rows, never changing one in place", () => {
    const rows: TableRow[] = [{ name: "Ana" }, { name: "Ben" }]
    const next = TableEditing.applied(rows, [
      { kind: "set", row: rows[0]!, key: "name", value: "Anna", was: "Ana" },
      { kind: "set", row: rows[0]!, key: "stars", value: 2, was: undefined },
      { kind: "remove", row: rows[1]! },
      { kind: "add", values: { name: "Cy" } }
    ])
    expect(next).toEqual([{ name: "Anna", stars: 2 }, { name: "Cy" }])
    expect(rows).toEqual([{ name: "Ana" }, { name: "Ben" }])
  })
})
