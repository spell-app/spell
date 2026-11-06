import * as XLSX from "xlsx"
import { describe, expect, test } from "vite-plus/test"

import { PlaceError, Workbook, formulaMovedBy, type WorkbookProps } from "spell/places"

import { workbookBytes } from "./workbookBytes"

/** A day, as a workbook's date cell holds it. */
const day = (year: number, month: number, date: number, hours = 0, minutes = 0) =>
  new Date(Date.UTC(year, month - 1, date, hours, minutes))

/** A box of recipes, a sheet of shelves, and an empty sheet. */
const BOX = {
  Recipes: [
    ["id", "title", "servings", "made", "shelf"],
    ["r-1", "Soup", 4, day(1977, 5, 25), "top"],
    [],
    ["r-2", "Dal", 6, day(2024, 1, 2, 10, 30), "top"],
    ["r-3", "Tacos", 10, "", "low"]
  ],
  Shelves: [
    ["name", "height"],
    ["top", 180]
  ],
  Empty: []
}

/** `sheets` read. */
async function read(sheets: Record<string, unknown[][]> = BOX, props: WorkbookProps = { idColumn: "id" }) {
  return new Workbook(workbookBytes(sheets), await Workbook.sheetJs(), props)
}

describe("Workbook:  reading (epic `data` P38)", () => {
  test("each sheet is a collection by its tab, in any case;  numbers stay numbers, dates read as text, a blank row is skipped", async () => {
    const workbook = await read()
    expect(workbook.sheets).toEqual(["Recipes", "Shelves", "Empty"])
    expect(workbook.rowsOf("recipes").rows).toEqual([
      { id: "r-1", title: "Soup", servings: 4, made: "1977-05-25", shelf: "top" },
      { id: "r-2", title: "Dal", servings: 6, made: "2024-01-02T10:30", shelf: "top" },
      { id: "r-3", title: "Tacos", servings: 10, made: "", shelf: "low" }
    ])
    expect((await read(BOX, {})).rowsOf("Shelves").rows).toEqual([{ name: "top", height: 180 }])
  })

  test("the id column is every sheet's:  a sheet without it is NOT FOUND, as a CSV file's is", async () => {
    const workbook = await read()
    expect(() => workbook.rowsOf("shelves")).toThrow(/"shelves" has no column "id"/)
  })

  test("an empty sheet has no rows;  a name no tab has is NOT FOUND, naming the tabs", async () => {
    const workbook = await read(BOX, {})
    expect(workbook.rowsOf("Empty").rows).toEqual([])
    expect(() => workbook.rowsOf("pantry")).toThrow(
      /no sheet holds "pantry";  its sheets are "Recipes", "Shelves", "Empty"/
    )
    expect(() => workbook.rowsOf("pantry")).toThrow(PlaceError)
  })

  test("a workbook with one tab answers any name, as a CSV file does", async () => {
    const workbook = await read({ Sheet1: BOX.Recipes })
    expect(workbook.rowsOf("recipes").rows).toHaveLength(3)
  })

  test("a row with no id, or a repeated one, is left out and said, as a CSV file's is", async () => {
    const workbook = await read({
      Recipes: [
        ["id", "title"],
        ["r-1", "Soup"],
        ["", "Stew"],
        ["r-1", "Again"]
      ]
    })
    const { rows, notes } = workbook.rowsOf("recipes")
    expect(rows).toEqual([{ id: "r-1", title: "Soup" }])
    expect(notes).toEqual([
      `"recipes":  row 3 has no id in "id", so left out`,
      `"recipes":  row 4 has an id a row above already has, so left out`
    ])
    expect(workbook.whyUnclear("recipes")).toMatch(/blank or repeated id/)
  })

  test("the address's ending says it's a workbook", () => {
    expect(Workbook.isWorkbookAddress("/data/recipes.xlsx")).toBe(true)
    expect(Workbook.isWorkbookAddress("https://x.com/r.XLSX?raw=1")).toBe(true)
    expect(Workbook.isWorkbookAddress("/data/recipes.csv")).toBe(false)
  })
})

describe("Workbook.saved()", () => {
  /** `workbook` saved, read back. */
  async function again(bytes: Uint8Array, props: WorkbookProps = { idColumn: "id" }) {
    return new Workbook(bytes, await Workbook.sheetJs(), props)
  }

  test("an edit changes that cell:  other sheets, unknown columns, widths and the blank row stay", async () => {
    const workbook = new Workbook(workbookBytes(BOX, [8, 30]), await Workbook.sheetJs(), { idColumn: "id" })
    const rows = workbook
      .rowsOf("recipes")
      .rows.map((row) => (row.id === "r-2" ? { ...row, title: "Dal makhani" } : row))
    const save = workbook.saved(
      "recipes",
      rows.map(({ shelf: _shelf, ...row }) => row)
    )
    expect(save).toMatchObject({ added: [], moved: [], edited: ["r-2"], removed: [] })
    const back = XLSX.read(save.bytes, { type: "array", cellStyles: true })
    expect(back.SheetNames).toEqual(["Recipes", "Shelves", "Empty"])
    expect(back.Sheets.Recipes!.B4!.v).toBe("Dal makhani")
    expect(back.Sheets.Recipes!.E4!.v).toBe("top")
    expect(back.Sheets.Recipes!.A3).toBeUndefined()
    expect(back.Sheets.Recipes!["!cols"]!.map(({ wch }) => wch)).toEqual([8, 30])
    expect((await again(save.bytes, {})).rowsOf("shelves").rows).toEqual([{ name: "top", height: 180 }])
  })

  test("added, removed and moved rows;  a date stays a date;  a moved row's formula moves with it", async () => {
    const sheets = {
      Recipes: [
        ["id", "title", "servings", "double", "made"],
        ["r-1", "Soup", 4, { t: "n", f: "C2*2", v: 8 }, day(1977, 5, 25)],
        ["r-2", "Dal", 6, { t: "n", f: "C3*2", v: 12 }, day(2024, 1, 2)]
      ]
    }
    const workbook = await read(sheets)
    const [soup, dal] = workbook.rowsOf("recipes").rows
    const save = workbook.saved("recipes", [
      { ...dal!, made: "2024-02-03" },
      { id: "r-9", title: "Pho", servings: 2 }
    ])
    expect(save).toMatchObject({ added: ["r-9"], moved: [], edited: ["r-2"], removed: ["r-1"] })
    expect(soup!.id).toBe("r-1")
    const back = XLSX.read(save.bytes, { type: "array", cellDates: true, UTC: true })
    const sheet = back.Sheets.Recipes!
    expect(sheet.D2!.f).toBe("C2*2")
    expect(sheet.E2!.t).toBe("d")
    expect(sheet.A3!.v).toBe("r-9")
    expect(sheet.D3).toBeUndefined()
    expect((await again(save.bytes)).rowsOf("recipes").rows[0]).toMatchObject({ id: "r-2", made: "2024-02-03" })
  })

  test("a field with no column is REFUSED:  a new column would move every cell after it", async () => {
    const workbook = await read()
    expect(() => workbook.saved("recipes", [{ id: "r-1", rating: 5 }])).toThrow(/has no column "rating"/)
  })

  test("a sheet with a repeated id is REFUSED, rather than saved over", async () => {
    const workbook = await read({ Recipes: [["id"], ["r-1"], ["r-1"]] })
    expect(() => workbook.saved("recipes", [])).toThrow(/blank or repeated id/)
  })

  test("a new workbook gets a sheet named for the collection, its columns the first row's fields", async () => {
    const workbook = new Workbook(undefined, await Workbook.sheetJs(), { idColumn: "id" })
    const save = workbook.saved("recipes", [{ id: "r-1", title: "Soup", servings: 4 }])
    const back = await again(save.bytes)
    expect(back.sheets).toEqual(["recipes"])
    expect(back.rowsOf("recipes").rows).toEqual([{ id: "r-1", title: "Soup", servings: 4 }])
  })
})

describe("formulaMovedBy()", () => {
  test("relative rows move;  anchored ones and text in quotes stay", () => {
    expect(formulaMovedBy("C2*2", 1)).toBe("C3*2")
    expect(formulaMovedBy("SUM($C$2:C2)+Other!B2", -1)).toBe("SUM($C$2:C1)+Other!B1")
    expect(formulaMovedBy('IF(A2="B2",LOG10(A2),0)', 2)).toBe('IF(A4="B2",LOG10(A4),0)')
  })
})
