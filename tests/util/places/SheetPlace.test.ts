import { createServer } from "node:http"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { pollWhileVisible } from "spell/util/polling"
import { PlaceError, Places, SheetPlace, writeAnswerFor, type SheetPlaceProps } from "spell/util/places"

const RECIPES = `id,title,servings,notes
r-1,Soup,4,"Roast it, first"
r-2,Dal,6,"Two
lines"
r-3,Tacos,10,"Say ""hi"""
`

/** Every server a test started. */
const servers: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((close) => close()))
})

/** A web server with one file, its text changing as a test says, and a place on it. */
async function served(props: Partial<SheetPlaceProps> = {}, csv = RECIPES) {
  const file = { text: csv, status: 200, reads: 0, hungUp: 0 }
  const http = createServer((_request, reply) => {
    file.reads++
    reply.writeHead(file.status, { "Content-Type": "text/csv" })
    reply.end(file.text)
  })
  await new Promise<void>((done) => http.listen(0, "127.0.0.1", done))
  servers.push(
    () =>
      new Promise((done) => {
        http.closeAllConnections()
        http.close(() => done())
      })
  )
  const { port } = http.address() as { port: number }
  const place = new SheetPlace({ url: `http://127.0.0.1:${port}/recipes.csv`, collection: "recipes", ...props })
  const places = new Places().add("box", place)
  return { file, place, places }
}

describe("SheetPlace.list()", () => {
  test("WITH an id:  rows by column, quoting and all, and no notes", async () => {
    const { places } = await served({ idColumn: "id" })
    const result = places.read({ placeName: "box", collection: "recipes" })
    const rows = (await result.load())!
    expect(rows).toEqual([
      { id: "r-1", title: "Soup", servings: "4", notes: "Roast it, first" },
      { id: "r-2", title: "Dal", servings: "6", notes: "Two\nlines" },
      { id: "r-3", title: "Tacos", servings: "10", notes: 'Say "hi"' }
    ])
    expect(result.status).toBe("complete")
    expect(result.notes).toEqual([])
  })

  test("WITHOUT an id:  rows read just the same, and the answer SAYS they share no identity", async () => {
    const { places, place } = await served()
    const result = places.read({ placeName: "box", collection: "recipes" })
    expect(await result.load()).toHaveLength(3)
    expect(place.describe().idOf).toBeUndefined()
    expect(result.notes).toEqual([expect.stringContaining("share no identity")])
  })

  test("without an id, a type doesn't put rows in the cache:  two lists stay two", async () => {
    const { places } = await served()
    const rows = (await places.read({ placeName: "box", collection: "recipes", type: "Recipe" }).load())!
    expect(rows[0]).not.toBe(
      await places.read({ placeName: "box", collection: "recipes", type: "Recipe", query: { select: ["id"] } }).load()
    )
    expect(places.cache.rowFor("Recipe", "r-1")).toBeUndefined()
  })

  test("with an id and a type, each row is the cache's ONE row", async () => {
    const { places } = await served({ idColumn: "id" })
    const rows = (await places.read({ placeName: "box", collection: "recipes", type: "Recipe" }).load())!
    expect(places.cache.rowFor("Recipe", "r-1")).toBe(rows[0])
  })

  test("a duplicate id and a missing id:  the rest still shows, and notes say which rows", async () => {
    const { places } = await served({ idColumn: "id" }, "id,title\nr-1,a\nr-1,b\n,c\nr-2,d\n")
    const result = places.read({ placeName: "box", collection: "recipes" })
    expect((await result.load())!.map(({ title }) => title)).toEqual(["a", "d"])
    expect(result.notes).toEqual([
      `"recipes":  row 4 has no id in "id", so left out`,
      `"recipes":  row 3 has an id a row above already has, so left out`
    ])
  })

  test("notes come through what the engine does too:  a filter, a sort, a page", async () => {
    const { places } = await served({ idColumn: "id" }, "id,title\nr-1,a\n,b\nr-2,a\n")
    const result = places.read({
      placeName: "box",
      collection: "recipes",
      query: { filter: { title: "a" }, page: { size: 1 } }
    })
    expect(await result.load()).toHaveLength(1)
    expect(result.notes).toEqual([expect.stringContaining("row 3 has no id")])
  })

  test("the engine filters, sorts and slices;  `numbers` makes a sort a real number sort", async () => {
    const { places } = await served({ idColumn: "id", numbers: ["servings"] })
    const sorted = (await places
      .read({ placeName: "box", collection: "recipes", query: { sort: [{ field: "servings", descending: true }] } })
      .load())!
    expect(sorted.map(({ servings }) => servings)).toEqual([10, 6, 4])
    const filtered = (await places
      .read({ placeName: "box", collection: "recipes", query: { filter: { servings: 6 }, select: ["title"] } })
      .load())!
    expect(filtered).toEqual([{ title: "Dal", id: "r-2" }])
    const paged = places.read({ placeName: "box", collection: "recipes", query: { page: { size: 2 } } })
    expect(await paged.load()).toHaveLength(2)
    expect(paged.nextPage).toBe("2")
  })

  test("without `numbers`, `10` sorts before `4`:  a CSV's cells are text", async () => {
    const { places } = await served({ idColumn: "id" })
    const sorted = (await places
      .read({ placeName: "box", collection: "recipes", query: { sort: [{ field: "servings" }] } })
      .load())!
    expect(sorted.map(({ servings }) => servings)).toEqual(["10", "4", "6"])
  })

  test("an edit in the file is found by polling", async () => {
    const { places, file } = await served({ idColumn: "id" })
    const result = places.read({ placeName: "box", collection: "recipes" })
    await result.load()
    file.text = "id,title\nr-1,Better soup\n"
    const stop = pollWhileVisible(0.01, () => result.reload())
    await vi.waitFor(() => expect(result.contents).toEqual([{ id: "r-1", title: "Better soup" }]))
    stop()
  })

  test("a half-saved file:  the rows stay, `couldn't update`, until it's whole again", async () => {
    const { places, file } = await served({ idColumn: "id" })
    const result = places.read({ placeName: "box", collection: "recipes" })
    const rows = await result.load()
    file.text = 'id,title\nr-1,"oops'
    await expect(result.reload()).rejects.toThrow(/never closes/)
    expect(result.status).toBe("couldn't update")
    expect(result.contents).toEqual(rows)
    file.text = "id,title\nr-1,fixed\n"
    await result.reload()
    expect(result.status).toBe("complete")
  })

  test("a file that isn't there, or another collection:  `not found`;  a 500:  no answer", async () => {
    const { place, file } = await served()
    await expect(place.list("other", {}, {})).rejects.toMatchObject({ kind: "not found" })
    file.status = 404
    await expect(place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "not found" })
    file.status = 500
    await expect(place.list("recipes", {}, {})).rejects.not.toBeInstanceOf(PlaceError)
  })

  test("a stated id column that isn't in the file:  `not found`, saying what is", async () => {
    const { place } = await served({ idColumn: "key" })
    await expect(place.list("recipes", {}, {})).rejects.toThrow(/no column "key".*"id", "title"/)
  })

  test("the ceiling holds WHILE reading, for a read that asks for nothing the engine would count", async () => {
    const big = `id\n${Array.from({ length: 1000 }, (_, index) => `r-${index}`).join("\n")}\n`
    const overBytes = await served({ ceiling: { bytes: 100 } }, big)
    await expect(overBytes.place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "over the ceiling" })
    const overRows = await served({ ceiling: { rows: 10 } }, big)
    await expect(overRows.place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "over the ceiling" })
    expect(overRows.place.describe().ceiling).toMatchObject({ rows: 10 })
  })

  test("an aborted read really stops", async () => {
    const { place } = await served()
    const stop = new AbortController()
    stop.abort()
    await expect(place.list("recipes", {}, { signal: stop.signal })).rejects.toThrow()
  })
})

describe("SheetPlace, read only", () => {
  test("it says so, whole place and each kind of write, and takes no change", async () => {
    const { place, places } = await served({ idColumn: "id" })
    expect(place.describe().write).toBe("none")
    expect(writeAnswerFor(place, { collection: "recipes" })).toEqual({ canWrite: false, whyNot: "place" })
    expect(writeAnswerFor(place, { collection: "recipes", kind: "insert" })).toEqual({
      canWrite: false,
      whyNot: "place"
    })
    const failures: unknown[] = []
    places.onWriteFailed((failure) => failures.push(failure))
    places.pendingFor("box").setField({ collection: "recipes", id: "r-1", field: "title", value: "x", was: "Soup" })
    await vi.waitFor(() => expect(failures).toHaveLength(1), { timeout: 5000 })
  })

  test("a key it isn't given:  refused, and it never asks", async () => {
    const { file } = await served()
    const needsKey = new SheetPlace({ url: "http://127.0.0.1:9/x.csv", collection: "recipes", keyNamed: "SECRET" })
    await expect(needsKey.list("recipes", {}, {})).rejects.toMatchObject({ kind: "refused" })
    expect(file.reads).toBe(0)
  })
})
