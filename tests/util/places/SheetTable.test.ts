import { describe, expect, test } from "vite-plus/test"

import { PlaceError, SheetTable } from "spell/util/places"

/** A table called `t`, with the first row its columns. */
const table = (cells: unknown[][], idColumn?: string, numbers?: string[]) =>
  new SheetTable({ name: "t", cells, idColumn, numbers })

describe("SheetTable", () => {
  test("column names are the fields;  a short row's missing cells are blanks", () => {
    const { rows, notes } = table(
      [
        ["id", "name", "notes"],
        ["1", "a", "x"],
        ["2", "b"]
      ],
      "id"
    )
    expect(rows).toEqual([
      { id: "1", name: "a", notes: "x" },
      { id: "2", name: "b", notes: "" }
    ])
    expect(notes).toEqual([])
  })

  test("no rows at all is no rows, with or without an id column", () => {
    expect(table([], "id").rows).toEqual([])
    expect(table([["id"]], "id").rows).toEqual([])
  })

  test("a row with nothing in it is skipped, saying nothing", () => {
    const { rows, notes } = table([["id"], ["1"], [""], [], ["2"]], "id")
    expect(rows.map(({ id }) => id)).toEqual(["1", "2"])
    expect(notes).toEqual([])
  })

  test("with NO id column, repeats are fine:  rows share no identity", () => {
    const { rows, notes } = table([["name"], ["a"], ["a"]])
    expect(rows).toEqual([{ name: "a" }, { name: "a" }])
    expect(notes).toEqual([])
  })

  test("a row with no id is LEFT OUT, and the note names its row", () => {
    const { rows, notes } = table(
      [
        ["id", "name"],
        ["1", "a"],
        ["", "b"],
        ["3", "c"]
      ],
      "id"
    )
    expect(rows.map(({ name }) => name)).toEqual(["a", "c"])
    expect(notes).toEqual([`"t":  row 3 has no id in "id", so left out`])
  })

  test("a repeated id keeps the FIRST row, and the note names the others", () => {
    const { rows, notes } = table(
      [
        ["id", "name"],
        ["1", "a"],
        ["1", "b"],
        ["1", "c"]
      ],
      "id"
    )
    expect(rows).toEqual([{ id: "1", name: "a" }])
    expect(notes).toEqual([`"t":  rows 3, 4 have an id a row above already has, so left out`])
  })

  test("a long list of rows is counted, not listed", () => {
    const cells = [["id"], ["1"], ...Array.from({ length: 8 }, () => ["1"])]
    expect(table(cells, "id").notes[0]).toContain("rows 3, 4, 5, 6, 7 and 3 more have")
  })

  test("ids that are numbers count too:  `12` and `12` repeat", () => {
    const { rows, notes } = table([["id"], [12], [12]], "id")
    expect(rows).toEqual([{ id: 12 }])
    expect(notes).toHaveLength(1)
  })

  test("a stated id column that isn't there THROWS, naming what is", () => {
    expect.assertions(2)
    try {
      table(
        [
          ["ID", "name"],
          ["1", "a"]
        ],
        "id"
      )
    } catch (error) {
      expect((error as PlaceError).kind).toBe("not found")
      expect((error as PlaceError).message).toContain(
        `no column "id" to take its ids from;  its columns are "ID", "name"`
      )
    }
  })

  test("a repeated column name is read once, and noted;  a column with no name isn't read", () => {
    const { rows, notes, columns } = table([
      ["a", "", " a "],
      ["1", "2", "3"]
    ])
    expect(rows).toEqual([{ a: "1" }])
    expect(columns).toEqual(["a", "", ""])
    expect(notes).toEqual([`"t":  two columns are called "a", and only the first is read`])
  })

  test("a row with more cells than columns:  a note, and the rest of it reads", () => {
    const { rows, notes } = table([["a"], ["1", "x"], ["2", ""]])
    expect(rows).toEqual([{ a: "1" }, { a: "2" }])
    expect(notes).toEqual([`"t":  row 2 has more cells than there are columns, and those are ignored`])
  })

  test("`numbers`:  those columns as numbers, a blank or a word left as it is", () => {
    const { rows } = table(
      [
        ["n", "m"],
        ["4", "4"],
        ["", "x"],
        ["many", "x"]
      ],
      undefined,
      ["n"]
    )
    expect(rows.map(({ n }) => n)).toEqual([4, "", "many"])
    expect(rows[0]!.m).toBe("4")
  })

  test("`rowIndexOf()` and `columnIndexOf()`:  places in the cells, for writing back", () => {
    const sheet = table([["id", "name", ""], ["a", "x"], [], ["b", "y"]], "id")
    expect(sheet.rowIndexOf("b")).toBe(3)
    expect(sheet.rowIndexOf("nope")).toBeUndefined()
    expect(sheet.columnIndexOf("name")).toBe(1)
    expect(sheet.columnIndexOf("")).toBe(-1)
    expect(sheet.columnIndexOf("nope")).toBe(-1)
  })
})
