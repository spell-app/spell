import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { RemotePlace, Places, PlaceError, type PlaceConflict, type PlaceChange } from "spell/util/places"
import { SRV } from "spell/server"
import { CSV_SAVE_ROWS, CsvPlace, PlaceServer, type CsvSaveRowsAnswer } from "spell/server/places"
import { serveHandler, type Served } from "spell/server/test/serve"

import { newFolder, removeFolders } from "./places.helpers"

/** The collection. */
const RECIPES = "recipes"

/** A file with what real ones have:  a comma, quotes, a line end in a cell, a column nobody knows. */
const FIRST = `id,title,servings,notes,shelf
r-1,Soup,4,"Roast first, then blend.",top
r-2,"Dal",6,Temper last.,top
r-3,Tacos,4,"Pineapple.
Warm them.",low
`

/** A file in a new folder, holding `text`, and its place. */
function aFile(text = FIRST, props: { idColumn?: string; positionField?: string } = { idColumn: "id" }) {
  const file = join(newFolder(), "recipes.csv")
  writeFileSync(file, text)
  const place = new CsvPlace({ file, collection: RECIPES, numbers: ["servings"], ...props })
  return { file, place, read: () => readFileSync(file, "utf8") }
}

/** A change to row `id`. */
const update = (id: string, fields: object, version?: string): PlaceChange => ({
  kind: "update",
  collection: RECIPES,
  id,
  fields: fields as Record<string, unknown>,
  ...(version !== undefined && { version })
})

/** A new row. */
const insert = (id: string, fields: object): PlaceChange => ({
  kind: "insert",
  collection: RECIPES,
  id,
  fields: fields as Record<string, unknown>
})

/** Row `id` gone. */
const remove = (id: string): PlaceChange => ({ kind: "delete", collection: RECIPES, id })

afterEach(removeFolders)

describe("CsvPlace", () => {
  test("reads the file's rows, numbers as numbers, and what it can do", async () => {
    const { place } = aFile()
    const { rows, version } = await place.list(RECIPES, {}, {})
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ id: "r-1", title: "Soup", servings: 4, shelf: "top" })
    expect(version).toBeDefined()
    expect(place.describe()).toMatchObject({ kind: "sheet", idOf: "id", atomic: true, versionCheck: true })
    await expect(place.list("other", {}, {})).rejects.toMatchObject({ kind: "not found" })
  })

  test("add, edit and remove each change their own line, and nothing else, byte for byte", async () => {
    const { place, read } = aFile()
    await place.apply([insert("r-4", { title: "Toast, buttered", servings: 1 })], {})
    expect(read()).toBe(`${FIRST}r-4,"Toast, buttered",1,,\n`)
    await place.apply([update("r-1", { servings: 8 })], {})
    expect(read()).toBe(`${FIRST.replace("Soup,4", "Soup,8")}r-4,"Toast, buttered",1,,\n`)
    await place.apply([remove("r-3")], {})
    expect(read()).toBe(
      `id,title,servings,notes,shelf
r-1,Soup,8,"Roast first, then blend.",top
r-2,"Dal",6,Temper last.,top
r-4,"Toast, buttered",1,,
`
    )
  })

  test("what it answers is the row as it's now kept, and its version moves", async () => {
    const { place } = aFile()
    await place.list(RECIPES, {}, {})
    const before = place.versionOf(RECIPES, "r-1")
    const { rows } = await place.apply([update("r-1", { servings: 8 })], {})
    expect(rows).toEqual([expect.objectContaining({ id: "r-1", servings: 8, shelf: "top" })])
    expect(place.versionOf(RECIPES, "r-1")).not.toBe(before)
  })

  test("a batch is one save, all or none", async () => {
    const { place, read } = aFile()
    await expect(
      place.apply([update("r-1", { servings: 8 }), update("nope", { servings: 1 })], {})
    ).rejects.toMatchObject({
      kind: "not found"
    })
    expect(read()).toBe(FIRST)
  })

  test("a field with no column is refused, and says which", async () => {
    const { place, read } = aFile()
    await expect(place.apply([update("r-1", { rating: 5 })], {})).rejects.toThrow(/no column "rating"/)
    expect(read()).toBe(FIRST)
  })

  describe("moving", () => {
    /** A place whose rows read with their place in the file. */
    const moving = () => aFile(FIRST, { idColumn: "id", positionField: "place" })

    test("a row's place in the file reads as a position, and writing one moves that line alone", async () => {
      const { place, read } = moving()
      const { rows } = await place.list(RECIPES, {}, {})
      const ats = rows.map((row) => (row.place as { at: string }).at)
      expect([...ats].sort()).toEqual(ats)
      await place.apply([update("r-1", { place: { parent: null, at: `${ats[2]!}z` } })], {})
      expect(read()).toBe(`id,title,servings,notes,shelf
r-2,"Dal",6,Temper last.,top
r-3,Tacos,4,"Pineapple.
Warm them.",low
r-1,Soup,4,"Roast first, then blend.",top
`)
    })

    test("an edit and a move at once are both understood", async () => {
      const { place, read } = moving()
      const { rows } = await place.list(RECIPES, {}, {})
      const at = (rows[0]!.place as { at: string }).at
      await place.apply([update("r-3", { servings: 9, place: { parent: null, at: `0${at}` } })], {})
      expect(read().split("\n")[1]).toBe('r-3,Tacos,9,"Pineapple.')
      expect(read()).toContain('r-1,Soup,4,"Roast first, then blend.",top\n')
    })

    test("the position never reaches the file, and the answer holds the one given", async () => {
      const { place, read } = moving()
      const given = { parent: null, at: "zz" }
      const { rows } = await place.apply([update("r-1", { place: given })], {})
      expect(rows[0]!.place).toEqual(given)
      expect(read().split("\n")[0]).toBe("id,title,servings,notes,shelf")
    })
  })

  describe("the file changed since it was read", () => {
    test("a change made from an old version of THAT row is refused as out of date;  another row's isn't", async () => {
      const { file, place, read } = aFile()
      await place.list(RECIPES, {}, {})
      const [one, two] = [place.versionOf(RECIPES, "r-1")!, place.versionOf(RECIPES, "r-2")!]
      writeFileSync(file, FIRST.replace("Soup,4", "Soup,5"))
      await expect(place.apply([update("r-1", { title: "No" }, one)], {})).rejects.toMatchObject({
        kind: "out of date"
      })
      await place.apply([update("r-2", { servings: 7 }, two)], {})
      expect(read()).toBe(FIRST.replace("Soup,4", "Soup,5").replace('"Dal",6', '"Dal",7'))
    })

    test("a version is the row's own content:  saving another row doesn't move it, and changed back is the same", async () => {
      const { file, place } = aFile()
      await place.list(RECIPES, {}, {})
      const version = place.versionOf(RECIPES, "r-1")
      await place.apply([update("r-2", { servings: 7 })], {})
      expect(place.versionOf(RECIPES, "r-1")).toBe(version)
      writeFileSync(file, FIRST.replace("Soup,4", "Soup,5"))
      await place.list(RECIPES, {}, {})
      expect(place.versionOf(RECIPES, "r-1")).not.toBe(version)
      writeFileSync(file, FIRST)
      await place.list(RECIPES, {}, {})
      expect(place.versionOf(RECIPES, "r-1")).toBe(version)
    })

    test("a column nobody knows changing moves that row's version too:  its whole line is what it holds", async () => {
      const { file, place } = aFile()
      await place.list(RECIPES, {}, {})
      const version = place.versionOf(RECIPES, "r-1")
      writeFileSync(file, FIRST.replace('blend.",top', 'blend.",bottom'))
      await place.list(RECIPES, {}, {})
      expect(place.versionOf(RECIPES, "r-1")).not.toBe(version)
    })

    test("through the engine:  different fields both stand;  the same field keeps mine, with the usual notice", async () => {
      const { file, place, read } = aFile()
      const places = new Places({ wait: 0, retry: 1 }).add(RECIPES, place)
      const conflicts: PlaceConflict[] = []
      places.onConflict((conflict) => conflicts.push(conflict))
      const pending = places.pendingFor(RECIPES)
      const allSent = () => vi.waitFor(() => expect(pending.hasPending).toBe(false))
      await place.list(RECIPES, {}, {})

      writeFileSync(file, FIRST.replace("Soup,4", "Soup,5"))
      pending.setField({ collection: RECIPES, id: "r-1", field: "title", value: "Mine", was: "Soup" })
      await allSent()
      expect(read()).toContain('r-1,Mine,5,"Roast first, then blend.",top')
      expect(conflicts).toEqual([])

      const now = read()
      writeFileSync(file, now.replace("r-1,Mine,", "r-1,Theirs,"))
      pending.setField({ collection: RECIPES, id: "r-1", field: "title", value: "Mine again", was: "Mine" })
      await allSent()
      expect(read()).toContain("r-1,Mine again,5,")
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0]).toMatchObject({ field: "title", theirs: "Theirs", mine: "Mine again" })
    })
  })

  describe("two writers", () => {
    test("two places on one file, saving at once:  no row is lost", async () => {
      const { file, read } = aFile()
      const [one, two] = [1, 2].map(() => new CsvPlace({ file, collection: RECIPES, idColumn: "id" }))
      const saves = Array.from({ length: 40 }, (_, at) =>
        (at % 2 ? one! : two!).apply([insert(`n-${at}`, { title: `New ${at}` })], {})
      )
      await Promise.all(saves)
      const { rows } = await one!.list(RECIPES, {}, {})
      expect(rows).toHaveLength(43)
      expect(read().startsWith(FIRST)).toBe(true)
    })
  })

  describe("a file it can't trust refuses a write, and says so", () => {
    test("half saved:  a read answers as it last read, with a note;  a write is refused;  the file's untouched", async () => {
      const { file, place, read } = aFile()
      await place.list(RECIPES, {}, {})
      const half = `${FIRST}r-5,"Never closes`
      writeFileSync(file, half)
      const { rows, notes } = await place.list(RECIPES, {}, {})
      expect(rows).toHaveLength(3)
      expect(notes!.join()).toMatch(/can't be read just now/)
      const refusal = await place.apply([update("r-1", { title: "No" })], {}).catch((error: unknown) => error)
      expect(refusal).toBeInstanceOf(PlaceError)
      expect(refusal).toMatchObject({ kind: "refused" })
      expect((refusal as Error).message).toMatch(/can't be saved over/)
      expect(read()).toBe(half)
    })

    test("half saved, never read whole:  a read throws", async () => {
      const { place } = aFile('id\n"oops')
      await expect(place.list(RECIPES, {}, {})).rejects.toThrow(SyntaxError)
    })

    test("not UTF-8:  saving would lose its letters, so it's refused", async () => {
      const { file, place } = aFile()
      const latin1 = Buffer.from("id,title\nr-1,Jalapeño\n", "latin1")
      writeFileSync(file, latin1)
      await expect(place.apply([update("r-1", { title: "No" })], {})).rejects.toThrow(/isn't UTF-8/)
      expect(readFileSync(file).equals(latin1)).toBe(true)
    })

    test("a blank or repeated id:  a read leaves it out and says so;  a write is refused", async () => {
      const text = "id,title\nr-1,A\nr-1,B\n"
      const { place, read } = aFile(text)
      const { rows, notes } = await place.list(RECIPES, {}, {})
      expect(rows).toHaveLength(1)
      expect(notes!.join()).toMatch(/repeated id/)
      await expect(place.apply([update("r-1", { title: "No" })], {})).rejects.toMatchObject({ kind: "refused" })
      expect(read()).toBe(text)
    })

    test("no such id column:  a write is refused", async () => {
      const text = "name\nx\n"
      const { place, read } = aFile(text)
      await expect(place.apply([update("r-1", { name: "No" })], {})).rejects.toMatchObject({ kind: "refused" })
      expect(read()).toBe(text)
    })
  })

  describe("with no id column", () => {
    const PLAIN = "title,servings\nSoup,4\nDal,6\n"
    /** A place on `PLAIN`, with nothing saying which row is which. */
    const noIds = () => aFile(PLAIN, {})

    test("it says it can only add", () => {
      expect(noIds().place.describe()).toMatchObject({ write: ["insert"], atomic: true })
      expect(noIds().place.describe().idOf).toBeUndefined()
    })

    test("adding a row works, and is one new line", async () => {
      const { place, read } = noIds()
      await place.apply([{ kind: "insert", collection: RECIPES, fields: { title: "Toast", servings: 1 } }], {})
      expect(read()).toBe(`${PLAIN}Toast,1\n`)
    })

    test("saving a change to a row says why it can't", async () => {
      const { place, read } = noIds()
      await expect(place.apply([update("thing-1", { servings: 8 })], {})).rejects.toThrow(
        /no id column, so nothing says which row/
      )
      await expect(place.apply([remove("thing-1")], {})).rejects.toMatchObject({ kind: "refused" })
      expect(read()).toBe(PLAIN)
    })

    test("a whole list saved:  added and moved rows are found;  an edited row reads as one gone and one new, and says so", async () => {
      const { place, read } = noIds()
      const moved = (await place.call(CSV_SAVE_ROWS, {
        rows: [
          { title: "Dal", servings: 6 },
          { title: "Soup", servings: 4 },
          { title: "Toast", servings: 1 }
        ]
      })) as CsvSaveRowsAnswer
      expect(moved).toMatchObject({ added: 1, moved: 1, edited: 0, removed: 0, notes: [] })
      expect(read()).toBe("title,servings\nDal,6\nSoup,4\nToast,1\n")
      const edited = (await place.call(CSV_SAVE_ROWS, {
        rows: [
          { title: "Dal", servings: 8 },
          { title: "Soup", servings: 4 },
          { title: "Toast", servings: 1 }
        ]
      })) as CsvSaveRowsAnswer
      expect(edited).toMatchObject({ added: 1, removed: 1, edited: 0 })
      expect(edited.notes.join()).toMatch(/has no id column/)
      expect(read()).toBe("title,servings\nDal,8\nSoup,4\nToast,1\n")
    })

    test("a whole list from an old version says it's out of date, and nothing's saved", async () => {
      const { file, place, read } = noIds()
      const { version } = await place.list(RECIPES, {}, {})
      writeFileSync(file, `${PLAIN}Pie,1\n`)
      await expect(place.call(CSV_SAVE_ROWS, { rows: [], from: version })).rejects.toMatchObject({
        kind: "out of date"
      })
      expect(read()).toBe(`${PLAIN}Pie,1\n`)
    })

    test("any other operation is not found", async () => {
      await expect(noIds().place.call("nope", {}, {})).rejects.toMatchObject({ kind: "not found" })
    })
  })

  describe("behind a place server", () => {
    /** The file behind a real `PlaceServer`, and the `RemotePlace` a browser would have. */
    async function served(): Promise<{ remote: RemotePlace; read: () => string; file: string; server: Served }> {
      const { place, read, file } = aFile()
      const router = new SRV.Router()
      const guard = new SRV.Guard({ token: "t" })
      new PlaceServer({ places: { csv: place } }).route(router, guard)
      const server = await serveHandler(router.handle)
      guard.allowPort(server.port)
      const remote = new RemotePlace({ url: `${server.base}/api/places/csv`, token: "t", can: { kind: "sheet" } })
      return { remote, read, file, server }
    }

    test("a browser's add, edit and remove reach the file's own lines;  a clash on a row comes back as out of date", async () => {
      const { remote, read, file, server } = await served()
      const context = {}
      await remote.list(RECIPES, {}, context)
      await remote.apply([insert("r-9", { title: "Toast" })], context)
      await remote.apply([remove("r-9")], context)
      await remote.apply([update("r-1", { servings: 8 }, remote.versionOf(RECIPES, "r-1"))], context)
      expect(read()).toBe(FIRST.replace("Soup,4", "Soup,8"))
      const version = remote.versionOf(RECIPES, "r-1")
      writeFileSync(file, read().replace("Soup,8", "Soup,9"))
      await expect(remote.apply([update("r-1", { title: "No" }, version)], context)).rejects.toMatchObject({
        kind: "out of date"
      })
      await server.close()
    })

    test("a refusal reaches the browser in its own words", async () => {
      const { remote, file, server } = await served()
      writeFileSync(file, '"half')
      await expect(remote.apply([update("r-1", { title: "No" })], {})).rejects.toThrow(/can't be saved over/)
      await server.close()
    })
  })
})
