import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { RemotePlace, Workbook, WORKBOOK_STYLES_NOTE, type PlaceChange, type WorkbookProps } from "spell/places"
import { SRV } from "spell/server"
import { ExcelPlace, PlaceServer } from "spell/server/places"
import { serveHandler } from "spell/server/test/serve"

import { workbookBytes } from "../../places/workbookBytes"
import { newFolder } from "./places.helpers"

/** The collection. */
const RECIPES = "recipes"

/** A box of recipes, with a column nobody knows and a sheet of its own beside it. */
const BOX = {
  Recipes: [
    ["id", "title", "servings", "shelf"],
    ["r-1", "Soup", 4, "top"],
    ["r-2", "Dal", 6, "top"]
  ],
  Notes: [
    ["id", "said"],
    ["n-1", "Buy lentils"]
  ]
}

/** A workbook in a new folder, and its place. */
function aFile(sheets: Record<string, unknown[][]> = BOX, props: { idColumn?: string } = { idColumn: "id" }) {
  const file = join(newFolder(), "recipes.xlsx")
  writeFileSync(file, workbookBytes(sheets))
  const place = new ExcelPlace({ file, ...props })
  return { file, place }
}

/** `file`'s sheet `name` as rows, read afresh. */
async function rowsIn(file: string, name = RECIPES, props: WorkbookProps = { idColumn: "id" }) {
  return new Workbook(new Uint8Array(readFileSync(file)), await Workbook.sheetJs(), props).rowsOf(name).rows
}

/** A change to row `id`. */
const update = (id: string, fields: object, version?: string): PlaceChange => ({
  kind: "update",
  collection: RECIPES,
  id,
  fields: fields as Record<string, unknown>,
  ...(version !== undefined && { version })
})

describe("ExcelPlace (epic `data` P38)", () => {
  test("reads each sheet as a collection, numbers as numbers, and says what it can do", async () => {
    const { place } = aFile()
    expect((await place.list(RECIPES, {})).rows).toEqual([
      { id: "r-1", title: "Soup", servings: 4, shelf: "top" },
      { id: "r-2", title: "Dal", servings: 6, shelf: "top" }
    ])
    expect((await place.list("notes", {})).rows).toEqual([{ id: "n-1", said: "Buy lentils" }])
    expect(place.describe()).toMatchObject({ kind: "sheet", idOf: "id", atomic: true, versionCheck: true })
  })

  test("add, edit and remove reach the sheet;  the other sheet and the unknown column stay;  the answer says styles go", async () => {
    const { place, file } = aFile()
    await place.list(RECIPES, {})
    const answer = await place.apply([
      { kind: "insert", collection: RECIPES, id: "r-9", fields: { title: "Toast", servings: 1 } },
      update("r-1", { servings: 8 }),
      { kind: "delete", collection: RECIPES, id: "r-2" }
    ])
    expect(answer.notes).toEqual([WORKBOOK_STYLES_NOTE])
    expect(answer.rows).toEqual([
      { id: "r-9", title: "Toast", servings: 1 },
      { id: "r-1", title: "Soup", servings: 8, shelf: "top" }
    ])
    expect(await rowsIn(file)).toEqual([
      { id: "r-1", title: "Soup", servings: 8, shelf: "top" },
      { id: "r-9", title: "Toast", servings: 1, shelf: "" }
    ])
    expect(await rowsIn(file, "notes")).toEqual([{ id: "n-1", said: "Buy lentils" }])
  })

  test("a change made from an old version of THAT row is refused as out of date;  another row's isn't", async () => {
    const { place, file } = aFile()
    await place.list(RECIPES, {})
    const soup = place.versionOf(RECIPES, "r-1")
    const dal = place.versionOf(RECIPES, "r-2")
    expect(soup).toMatch(/^[0-9a-f]{40}$/)
    writeFileSync(file, workbookBytes({ ...BOX, Recipes: [...BOX.Recipes.slice(0, 2), ["r-2", "Dal", 7, "top"]] }))
    await expect(place.apply([update("r-2", { title: "No" }, dal)])).rejects.toMatchObject({ kind: "out of date" })
    await place.apply([update("r-1", { title: "Broth" }, soup)])
    expect((await rowsIn(file))[0]).toMatchObject({ title: "Broth" })
  })

  test("a field with no column, and a sheet with a repeated id, are refused, saying why", async () => {
    await expect(aFile().place.apply([update("r-1", { rating: 5 })])).rejects.toThrow(/no column "rating"/)
    const { place } = aFile({ Recipes: [["id"], ["r-1"], ["r-1"]] })
    await expect(place.apply([update("r-1", { id: "r-1" })])).rejects.toThrow(/blank or repeated id/)
  })

  test("a file that isn't a workbook is refused, rather than saved over", async () => {
    const { place, file } = aFile()
    writeFileSync(file, "not a workbook")
    await expect(place.apply([update("r-1", { title: "No" })])).rejects.toMatchObject({ kind: "refused" })
    expect(readFileSync(file, "utf8")).toBe("not a workbook")
  })

  test("with no id column it only adds:  a change to a row says why it can't", async () => {
    const { place, file } = aFile(BOX, {})
    expect(place.describe()).toMatchObject({ write: ["insert"] })
    await place.apply([{ kind: "insert", collection: RECIPES, fields: { title: "Pho" } }])
    expect((await rowsIn(file, RECIPES, {})).at(-1)).toMatchObject({ title: "Pho" })
    await expect(place.apply([update("r-1", { title: "No" })])).rejects.toThrow(/no id column/)
  })

  test("a file that isn't there yet is made by the first save", async () => {
    const file = join(newFolder(), "new.xlsx")
    const place = new ExcelPlace({ file, idColumn: "id" })
    await place.apply([{ kind: "insert", collection: RECIPES, id: "r-1", fields: { title: "Soup" } }])
    expect(await rowsIn(file)).toEqual([{ id: "r-1", title: "Soup" }])
  })

  test("behind a place server:  a browser's edit reaches the workbook", async () => {
    const { place, file } = aFile()
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: "t" })
    new PlaceServer({ places: { box: place } }).route(router, guard)
    const server = await serveHandler(router.handle)
    guard.allowPort(server.port)
    const remote = new RemotePlace({ url: `${server.base}/api/places/box`, token: "t", can: { kind: "sheet" } })
    await remote.list(RECIPES, {}, {})
    await remote.apply([update("r-2", { title: "Dal makhani" }, remote.versionOf(RECIPES, "r-2"))], {})
    expect((await rowsIn(file))[1]).toMatchObject({ title: "Dal makhani" })
    await server.close()
  })
})

describe("ExcelPlace, a column under another name (epic `data` I36, T84)", () => {
  const NAMED = {
    Recipes: [
      ["id", "Dish Name", "Hair Color"],
      ["r-1", "Soup", "red"]
    ]
  }
  const lines = { collections: { [RECIPES]: { fields: { title: "Dish Name" } } } }

  test("reads and writes by the program's names, and the workbook keeps its own", async () => {
    const { file, place } = aFile(NAMED)
    const described = place.withLines(lines)
    expect((await described.list(RECIPES, {}, {})).rows).toEqual([{ id: "r-1", title: "Soup", hairColor: "red" }])
    const { rows } = await described.apply([update("r-1", { title: "Broth", hairColor: "blue" })], {})
    expect(rows).toEqual([{ id: "r-1", title: "Broth", hairColor: "blue" }])
    expect(await rowsIn(file)).toEqual([{ id: "r-1", "Dish Name": "Broth", "Hair Color": "blue" }])
  })
})
