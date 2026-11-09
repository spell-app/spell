import { createServer } from "node:http"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { PlaceError, RemotePlace, writeAnswerFor, type PlaceChange } from "spell/places"
import { SRV } from "spell/server"
import { AirtablePlace, PlaceKeys, PlaceServer, RateQueue, Referee, type RateClock } from "spell/server/places"
import { serveAirtableBase } from "spell/server/places/airtableRoutes"
import { AIRTABLE_STUB_TOKEN, AirtableStub } from "spell/server/test/airtableStub"

/** What every test closes. */
const closing: (() => unknown)[] = []

afterEach(async () => {
  await Promise.all(closing.splice(0).map(async (close) => close()))
  vi.restoreAllMocks()
})

/** A new key and base each time:  a `RateQueue` is shared by name, and one test's waits are nobody else's. */
let made = 0

/** The columns of the stub's recipes. */
const COLUMNS = [
  { name: "Spell id" },
  { name: "Title" },
  { name: "Servings", type: "number" },
  { name: "Done", type: "checkbox" },
  { name: "Notes", type: "multilineText" },
  {
    name: "Words",
    type: "formula",
    worksOut: (cells: Record<string, unknown>) => `${(cells.Notes as string | undefined) ?? ""}`.length
  }
]

/** What the recipes start as. */
const ROWS = [
  { "Spell id": "r-1", Title: "Soup", Servings: 4, Notes: "Roast" },
  { "Spell id": "r-2", Title: "Dal", Servings: 6 },
  { "Spell id": "r-3", Title: "Tacos", Servings: 4, Done: true }
]

/** What the program calls them. */
const LINES = {
  idColumn: "Spell id",
  collections: {
    recipes: {
      at: "Recipes",
      fields: { title: "Title", servings: "Servings", done: "Done", notes: "Notes", words: "Words" }
    }
  }
}

/** The stub, recipes on it, and a place. */
async function base({
  lines = LINES as Partial<typeof LINES>,
  checkedEvery = 0.05,
  rows = ROWS as object[],
  key = true
} = {}) {
  const stub = await new AirtableStub(`appTest${++made}`).addTable("Recipes", COLUMNS, rows as never).start()
  closing.push(() => stub.stop())
  stub.penaltyMs = 200
  const keyNamed = `KEY_${made}`
  const keys = new PlaceKeys({ names: [keyNamed], from: key ? { [keyNamed]: AIRTABLE_STUB_TOKEN } : {} })
  const place = new AirtablePlace({ base: stub.base, keyNamed, keys, url: stub.url, checkedEvery, ...lines })
  return { stub, place, keys, keyNamed }
}

/** A change to `recipes`. */
const change = (kind: PlaceChange["kind"], id: string | undefined, fields?: PlaceChange["fields"]): PlaceChange => ({
  kind,
  collection: "recipes",
  ...(id !== undefined && { id }),
  ...(fields && { fields })
})

/** Rows, with the fields a test isn't about left out. */
const titles = (rows: readonly Record<string, unknown>[]) => rows.map(({ id, title }) => [id, title])

describe("AirtablePlace.list()", () => {
  test("rows by what the program calls them, the id from its column, every empty cell back in", async () => {
    const { place } = await base()
    const { rows, readOnlyFields } = await place.list("recipes", {}, {})
    expect(rows[1]).toEqual({ id: "r-2", title: "Dal", servings: 6, done: false, notes: "", words: 0 })
    expect(rows[2]).toMatchObject({ id: "r-3", done: true, notes: "" })
    expect(readOnlyFields).toEqual(["words"])
  })

  test("a cell someone clears in Airtable comes back cleared:  Airtable just leaves it out", async () => {
    const { place, stub } = await base({ checkedEvery: 0 })
    const [{ recordId }] = stub.rowsOf("Recipes")
    expect((await place.list("recipes", {}, {})).rows[0]!.notes).toBe("Roast")
    stub.editInAirtable("Recipes", recordId, { Notes: "" })
    expect((await place.list("recipes", {}, {})).rows[0]!.notes).toBe("")
  })

  test("with no schema to read, the key still works:  it says what that costs", async () => {
    const { place, stub } = await base({ checkedEvery: 0 })
    stub.canReadSchema = false
    const { rows, notes, readOnlyFields } = await place.list("recipes", {}, {})
    expect(rows).toHaveLength(3)
    expect(notes!.join()).toContain("schema.bases:read")
    expect(readOnlyFields).toBeUndefined()
  })

  test("a filter is a formula and a sort is Airtable's, and it says so", async () => {
    const { place, stub } = await base()
    const { rows, handled } = await place.list(
      "recipes",
      { filter: { servings: 4 }, sort: [{ field: "title", descending: true }] },
      {}
    )
    expect(titles(rows)).toEqual([
      ["r-3", "Tacos"],
      ["r-1", "Soup"]
    ])
    expect(handled).toMatchObject({ filter: true, sort: true })
    const asked = stub.asks.find(({ path }) => path.endsWith("/listRecords"))!
    expect(asked.body).toMatchObject({ filterByFormula: "{Servings}=4" })
  })

  test("text in a filter can't break out of its formula", async () => {
    const { place } = await base({ rows: [{ "Spell id": "r-1", Title: `Say "hi" \\ bye` }] })
    const { rows } = await place.list("recipes", { filter: { title: `Say "hi" \\ bye` } }, {})
    expect(rows).toHaveLength(1)
    expect((await place.list("recipes", { filter: { title: `x" , TRUE() , "` } }, {})).rows).toEqual([])
  })

  test("a field with no column isn't Airtable's to filter:  the engine does it", async () => {
    const { place } = await base()
    const { rows, handled } = await place.list("recipes", { filter: { cuisine: "x" } }, {})
    expect(rows).toHaveLength(3)
    expect(handled.filter).toBe(false)
  })

  test("with no schema, a column Airtable refuses is left to the engine too", async () => {
    const { place, stub } = await base()
    stub.canReadSchema = false
    const { rows, handled } = await place.list("recipes", { filter: { cuisine: "x" } }, {})
    expect(rows).toHaveLength(3)
    expect(handled.filter).toBe(false)
  })

  test("pages of 100, every one read", async () => {
    const rows = Array.from({ length: 250 }, (_, index) => ({ "Spell id": `r-${index}`, Title: `Recipe ${index}` }))
    const { place, stub } = await base({ rows })
    expect((await place.list("recipes", {}, {})).rows).toHaveLength(250)
    expect(stub.asksOf("POST", /listRecords$/)).toBe(3)
    expect(stub.asks.every(({ body }) => !body?.pageSize || body.pageSize === 100)).toBe(true)
  })

  test("Airtable lost its place:  the list starts again from the top, and nothing doubles", async () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({ "Spell id": `r-${index}`, Title: `Recipe ${index}` }))
    const { place, stub } = await base({ rows })
    stub.losePlace()
    const { rows: read } = await place.list("recipes", {}, {})
    expect(read).toHaveLength(150)
    expect(new Set(read.map(({ id }) => id)).size).toBe(150)
    // the schema, then:  page 1, a lost page 2, page 1, page 2
    expect(stub.asksOf("POST", /listRecords$/)).toBe(4)
  })

  test("still lost after several tries:  it says so, in Airtable's words", async () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({ "Spell id": `r-${index}`, Title: "x" }))
    const { place, stub } = await base({ rows })
    stub.losePlace(9)
    await expect(place.list("recipes", {}, {})).rejects.toThrow("LIST_RECORDS_ITERATOR_NOT_AVAILABLE")
  })

  test("a row added in Airtable, with no Spell id, is there under its record's id, and can be changed", async () => {
    const { place, stub } = await base({ checkedEvery: 0 })
    const recordId = stub.addInAirtable("Recipes", { Title: "From Airtable" })
    const { rows } = await place.list("recipes", {}, {})
    expect(rows.at(-1)).toMatchObject({ id: recordId, title: "From Airtable" })
    await place.apply([change("update", recordId, { title: "Changed" })], {})
    expect(stub.rowsOf("Recipes").at(-1)).toMatchObject({ Title: "Changed" })
  })

  test("two rows with one id:  the first shows, and it says so", async () => {
    const { place } = await base({ rows: [ROWS[0]!, { ...ROWS[1]!, "Spell id": "r-1" }] })
    const { rows, notes } = await place.list("recipes", {}, {})
    expect(rows).toHaveLength(1)
    expect(notes!.join()).toContain(`"r-1"`)
  })
})

describe("one read, however many tabs", () => {
  test("many tabs asking together are one request, on ONE place or many", async () => {
    const { place, stub } = await base({ checkedEvery: 30 })
    await Promise.all(Array.from({ length: 40 }, () => place.list("recipes", {}, {})))
    const later = await place.list("recipes", {}, {})
    expect(later.rows).toHaveLength(3)
    expect(stub.asksOf("POST", /listRecords$/)).toBe(1)
    expect(stub.busiestSecond).toBeLessThanOrEqual(5)
  })

  test("a tab hanging up doesn't stop the read the others are waiting on", async () => {
    const { place } = await base({ checkedEvery: 30 })
    const stop = new AbortController()
    const leaving = place.list("recipes", {}, { signal: stop.signal })
    const staying = place.list("recipes", {}, {})
    stop.abort(new DOMException("gone", "AbortError"))
    await expect(leaving).rejects.toThrow("gone")
    expect((await staying).rows).toHaveLength(3)
  })

  test("my own write is in the next read, even inside the window", async () => {
    const { place } = await base({ checkedEvery: 30 })
    await place.list("recipes", {}, {})
    await place.apply([change("update", "r-1", { title: "Broth" })], {})
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Broth")
  })

  test("a read that fails isn't kept:  the next one asks again", async () => {
    const { place, stub } = await base({ checkedEvery: 30 })
    stub.tables.delete("Recipes")
    await expect(place.list("recipes", {}, {})).rejects.toBeInstanceOf(PlaceError)
    stub.addTable("Recipes", COLUMNS, ROWS)
    expect((await place.list("recipes", {}, {})).rows).toHaveLength(3)
  })

  test("the limit holds:  20 different reads are spread over 4 seconds, and never trip it", async () => {
    const { place, stub } = await base()
    const reads = Array.from({ length: 20 }, (_, index) => place.list("recipes", { filter: { servings: index } }, {}))
    await Promise.all(reads)
    expect(stub.limitHits).toBe(0)
    expect(stub.busiestSecond).toBeLessThanOrEqual(5)
  }, 15_000)

  test("two places on one base share the limit:  many servers' worth of lines are one queue", async () => {
    const { place, stub } = await base()
    const other = place.withLines({ collections: { recipes: { at: "Recipes" } } })
    const reads = Array.from({ length: 12 }, (_, index) =>
      (index % 2 ? place : other).list("recipes", { filter: { servings: index } }, {})
    )
    await Promise.all(reads)
    expect(stub.limitHits).toBe(0)
  }, 15_000)
})

describe("the limit hit anyway", () => {
  test("a 429 stops everything for the 30 seconds Airtable's page says, though its answer doesn't, then goes on", async () => {
    const slept: number[] = []
    let now = 1000
    const clock: RateClock = {
      now: () => now,
      sleep: async (ms) => {
        slept.push(ms)
        now += ms
      }
    }
    const { stub, keyNamed, keys } = await base()
    const queue = new RateQueue({ limit: { requests: 5, perSeconds: 1, waitAfterHitSeconds: 30 }, clock })
    const place = new AirtablePlace({ base: stub.base, keyNamed, keys, url: stub.url, queue, ...LINES })
    stub.limitNext()
    expect((await place.list("recipes", {}, {})).rows).toHaveLength(3)
    expect(stub.limitHits).toBe(1)
    expect(slept).toContain(30_000)
  })

  test("a real trip:  someone else spends the limit, and this place waits it out", async () => {
    const { stub, keyNamed, keys } = await base()
    stub.penaltyMs = 100
    const someoneElse = () =>
      fetch(`${stub.url}/${stub.base}/Recipes`, { headers: { authorization: `Bearer ${AIRTABLE_STUB_TOKEN}` } })
    await Promise.all(Array.from({ length: 6 }, someoneElse))
    expect(stub.limitHits).toBeGreaterThan(0)
    const queue = new RateQueue({ limit: { requests: 5, perSeconds: 1, waitAfterHitSeconds: 0.2 } })
    const place = new AirtablePlace({ base: stub.base, keyNamed, keys, url: stub.url, queue, ...LINES })
    expect((await place.list("recipes", {}, {})).rows).toHaveLength(3)
  })
})

describe("AirtablePlace.apply()", () => {
  test("a change is a PATCH of the fields named, and nothing else in the row moves", async () => {
    const { place, stub } = await base()
    await place.list("recipes", {}, {})
    const { rows } = await place.apply([change("update", "r-1", { title: "Broth" })], {})
    expect(rows[0]).toMatchObject({ id: "r-1", title: "Broth", servings: 4, notes: "Roast", words: 5 })
    const patch = stub.asks.find(({ method }) => method === "PATCH")!
    expect((patch.body!.records as object[])[0]).toEqual({
      id: stub.rowsOf("Recipes")[0]!.recordId,
      fields: { Title: "Broth" }
    })
    expect(stub.rowsOf("Recipes")[0]).toMatchObject({ Title: "Broth", Servings: 4, Notes: "Roast" })
  })

  test("one edit to two fields is one request", async () => {
    const { place, stub } = await base()
    await place.list("recipes", {}, {})
    await place.apply([change("update", "r-1", { title: "Broth" }), change("update", "r-1", { servings: 9 })], {})
    expect(stub.asksOf("PATCH", /Recipes$/)).toBe(1)
    expect(stub.rowsOf("Recipes")[0]).toMatchObject({ Title: "Broth", Servings: 9 })
  })

  test("an id it hasn't seen is looked up by its column, in one request", async () => {
    const { place, stub } = await base()
    await place.apply([change("update", "r-2", { title: "A" }), change("update", "r-3", { title: "B" })], {})
    expect(stub.asksOf("POST", /listRecords$/)).toBe(1)
    expect(stub.rowsOf("Recipes").map(({ Title }) => Title)).toEqual(["Soup", "A", "B"])
  })

  test("an id nobody holds:  not found, with nothing sent", async () => {
    const { place, stub } = await base()
    const write = place.apply([change("update", "r-404", { title: "A" })], {})
    await expect(write).rejects.toMatchObject({ kind: "not found" })
    expect(stub.asksOf("PATCH", /Recipes$/)).toBe(0)
  })

  test("a record someone removed since it was read:  not found, in Airtable's own words", async () => {
    const { place, stub } = await base()
    await place.list("recipes", {}, {})
    const { recordId } = stub.rowsOf("Recipes")[0]!
    stub.tables.get("Recipes")!.records = stub.tables.get("Recipes")!.records.filter(({ id }) => id !== recordId)
    await expect(place.apply([change("update", "r-1", { title: "A" })], {})).rejects.toMatchObject({
      kind: "not found"
    })
  })

  test("25 changes go 10 at a time", async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ "Spell id": `r-${index}`, Title: "x" }))
    const { place, stub } = await base({ rows })
    await place.list("recipes", {}, {})
    await place.apply(
      rows.map((_, index) => change("update", `r-${index}`, { title: "y" })),
      {}
    )
    expect(stub.asksOf("PATCH", /Recipes$/)).toBe(3)
    expect(stub.rowsOf("Recipes").every(({ Title }) => Title === "y")).toBe(true)
  })

  test("delete, ten at a time", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ "Spell id": `r-${index}`, Title: "x" }))
    const { place, stub } = await base({ rows })
    await place.list("recipes", {}, {})
    await place.apply(
      rows.map((_, index) => change("delete", `r-${index}`)),
      {}
    )
    expect(stub.asksOf("DELETE", /Recipes$/)).toBe(2)
    expect(stub.rowsOf("Recipes")).toEqual([])
  })

  test("a row added and removed in one batch was never there", async () => {
    const { place, stub } = await base()
    await place.apply([change("insert", "r-9", { title: "x" }), change("delete", "r-9")], {})
    expect(stub.rowsOf("Recipes")).toHaveLength(3)
  })

  describe("a field Airtable works out", () => {
    test("reads as read only", async () => {
      const { place } = await base()
      await place.list("recipes", {}, {})
      expect(writeAnswerFor(place, { collection: "recipes", field: "words" })).toEqual({
        canWrite: false,
        whyNot: "field"
      })
      expect(writeAnswerFor(place, { collection: "recipes", field: "title" })).toEqual({ canWrite: true })
    })

    test("refused up front, saying why, with nothing sent", async () => {
      const { place, stub } = await base()
      await place.list("recipes", {}, {})
      const write = place.apply([change("update", "r-1", { words: 3 })], {})
      await expect(write).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "field" } })
      await expect(write).rejects.toThrow("worked out by Airtable")
      expect(stub.asksOf("PATCH", /Recipes$/)).toBe(0)
    })

    test("a row put back by undo holds what Airtable worked out, and that's no write:  it's left out", async () => {
      const { place, stub } = await base()
      const { rows } = await place.list("recipes", {}, {})
      await place.apply([change("delete", "r-1")], {})
      await place.apply([change("insert", "r-1", rows[0])], {})
      expect(stub.rowsOf("Recipes").at(-1)).toMatchObject({ "Spell id": "r-1", Title: "Soup", Words: 5 })
    })

    test("with no schema, it's found from the refusal, and known after", async () => {
      const { place, stub } = await base()
      stub.canReadSchema = false
      await place.list("recipes", {}, {})
      const write = place.apply([change("update", "r-1", { words: 3 })], {})
      await expect(write).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "field" } })
      expect(stub.asksOf("PATCH", /Recipes$/)).toBe(1)
      expect(writeAnswerFor(place, { collection: "recipes", field: "words" }).canWrite).toBe(false)
    })
  })

  test("a value its column can't hold:  refused, about the field, in Airtable's words", async () => {
    const { place } = await base()
    await place.list("recipes", {}, {})
    const write = place.apply([change("update", "r-1", { servings: "lots" })], {})
    await expect(write).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "field" } })
    await expect(write).rejects.toThrow("INVALID_VALUE_FOR_COLUMN")
  })
})

describe("whose id it is (epic data I5)", () => {
  test("with an id column, a new row sent twice after a lost answer is ONE row", async () => {
    const { place, stub } = await base()
    const insert = change("insert", "r-new", { title: "New" })
    await place.apply([insert], {})
    await place.apply([insert], {})
    expect(stub.rowsOf("Recipes").filter(({ Title }) => Title === "New")).toHaveLength(1)
    const upserts = stub.asks.filter(({ body }) => body?.performUpsert)
    expect(upserts).toHaveLength(2)
    expect(upserts[0]!.body!.performUpsert).toEqual({ fieldsToMergeOn: ["Spell id"] })
    expect(place.describe().makesIds).toBeUndefined()
  })

  test("the answer really was lost:  sending it again through the same place still makes one", async () => {
    const { place, stub } = await base()
    const realFetch = globalThis.fetch
    let dropped = false
    vi.spyOn(globalThis, "fetch").mockImplementation(async (...args) => {
      const answer = await realFetch(...args)
      if (dropped || !`${String(args[1]?.method)}`.includes("PATCH")) return answer
      dropped = true
      throw new TypeError("the connection went")
    })
    const insert = change("insert", "r-lost", { title: "Lost" })
    await expect(place.apply([insert], {})).rejects.toThrow("the connection went")
    await place.apply([insert], {})
    expect(stub.rowsOf("Recipes").filter(({ Title }) => Title === "Lost")).toHaveLength(1)
  })

  test("with no id column, Airtable makes the id, and says so", async () => {
    const { place, stub } = await base({ lines: { collections: LINES.collections } })
    expect(place.describe().makesIds).toBe(true)
    const { rows } = await place.apply([change("insert", undefined, { title: "New" })], {})
    expect(rows[0]!.id).toMatch(/^rec/)
    expect(stub.asksOf("POST", /Recipes$/)).toBe(1)
    const { rows: read } = await place.list("recipes", {}, {})
    expect(read.at(-1)!.id).toBe(rows[0]!.id)
  })

  test("with no id column, a lost answer can double:  the one thing the program's line warns of", async () => {
    const { place, stub } = await base({ lines: { collections: LINES.collections } })
    const insert = change("insert", undefined, { title: "Twice" })
    await place.apply([insert], {})
    await place.apply([insert], {})
    expect(stub.rowsOf("Recipes").filter(({ Title }) => Title === "Twice")).toHaveLength(2)
  })
})

describe("links", () => {
  /** Recipes linking to a cookbook. */
  async function linked({ toOne = true } = {}) {
    const stub = await new AirtableStub(`appLinks${++made}`)
      .addTable("Books", [{ name: "Spell id" }, { name: "Name" }], [{ "Spell id": "b-1", Name: "Family" }])
      .addTable("Recipes", [
        { name: "Spell id" },
        { name: "Title" },
        {
          name: "Book",
          type: "multipleRecordLinks",
          options: { linkedTableId: "tblBooks", prefersSingleRecordLink: toOne }
        }
      ])
      .start()
    closing.push(() => stub.stop())
    const keyNamed = `KEY_${made}`
    const keys = new PlaceKeys({ names: [keyNamed], from: { [keyNamed]: AIRTABLE_STUB_TOKEN } })
    const place = new AirtablePlace({
      base: stub.base,
      keyNamed,
      keys,
      url: stub.url,
      idColumn: "Spell id",
      collections: { recipes: { at: "Recipes", fields: { title: "Title", book: "Book" } }, books: { at: "Books" } }
    })
    return { stub, place }
  }

  test("a new child links to its one parent, by the parent's id, with nothing written to the parent", async () => {
    const { stub, place } = await linked()
    const { rows } = await place.apply([change("insert", "r-1", { title: "Soup", book: "b-1" })], {})
    const parent = stub.rowsOf("Books")[0]!
    expect(stub.rowsOf("Recipes")[0]!.Book).toEqual([parent.recordId])
    expect(rows[0]!.book).toBe("b-1")
    expect(stub.asks.filter(({ method, path }) => method !== "POST" && path.endsWith("/Books"))).toEqual([])
  })

  test("a link column that can hold many reads as ids, by the parent's id:  a program's one parent is its first (T63)", async () => {
    const { place } = await linked({ toOne: false })
    await place.list("books", {}, {})
    await place.apply([change("insert", "r-1", { title: "Soup", book: "b-1" })], {})
    const { rows } = await place.list("recipes", {}, {})
    expect(rows[0]!.book).toEqual(["b-1"])
  })
})

describe("what someone else did", () => {
  test("watchers share one poll, and hear a change, an addition and a removal made in Airtable", async () => {
    const { place, stub } = await base({ checkedEvery: 0.05 })
    const heard: { id: string; title?: unknown; gone?: boolean }[] = []
    const onEvent = ({ id, row }: { id: string; row?: Record<string, unknown> }) =>
      heard.push(row ? { id, title: row.title } : { id, gone: true })
    const stops = [place.watch({ collection: "recipes" }, onEvent), place.watch({ collection: "recipes" }, () => {})]
    closing.push(() => stops.forEach((stop) => stop()))
    await vi.waitFor(() => expect(stub.asksOf("POST", /listRecords$/)).toBeGreaterThan(0))
    await new Promise((done) => setTimeout(done, 60))
    const [{ recordId }, , third] = stub.rowsOf("Recipes")
    stub.editInAirtable("Recipes", recordId, { Title: "Edited there" })
    const added = stub.addInAirtable("Recipes", { Title: "Added there" })
    stub.tables.get("Recipes")!.records = stub.tables.get("Recipes")!.records.filter(({ id }) => id !== third!.recordId)
    await vi.waitFor(() => expect(heard).toHaveLength(3), { timeout: 3000, interval: 20 })
    expect(heard).toEqual(
      expect.arrayContaining([
        { id: "r-1", title: "Edited there" },
        { id: added, title: "Added there" },
        { id: "r-3", gone: true }
      ])
    )
  })

  test("my own write isn't heard twice", async () => {
    const { place } = await base({ checkedEvery: 0.05 })
    const heard: string[] = []
    const stop = place.watch({ collection: "recipes" }, ({ id }) => heard.push(id))
    closing.push(stop)
    await place.list("recipes", {}, {})
    await new Promise((done) => setTimeout(done, 60))
    await place.apply([change("update", "r-1", { title: "Mine" })], {})
    await new Promise((done) => setTimeout(done, 300))
    expect(heard).toEqual(["r-1"])
  })

  test("changesSince() finds what changed, with nobody watching", async () => {
    const { place, stub } = await base({ checkedEvery: 0 })
    const { version } = await place.list("recipes", {}, {})
    stub.editInAirtable("Recipes", stub.rowsOf("Recipes")[1]!.recordId, { Title: "Changed" })
    const { rows, removed, token } = await place.changesSince("recipes", version!, {})
    expect(titles(rows)).toEqual([["r-2", "Changed"]])
    expect(removed).toEqual([])
    expect((await place.changesSince("recipes", token, {})).rows).toEqual([])
  })

  test("two people, one field, with no version check:  the last save wins, and the first person isn't told", async () => {
    const { place } = await base()
    expect(place.describe().versionCheck).toBe(false)
    await place.list("recipes", {}, {})
    await place.apply([change("update", "r-1", { title: "Mine" })], {})
    await place.apply([change("update", "r-1", { title: "Theirs" })], {})
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Theirs")
  })

  test("two people, different fields:  both stand", async () => {
    const { place, stub } = await base()
    await place.list("recipes", {}, {})
    await Promise.all([
      place.apply([change("update", "r-1", { title: "Mine" })], {}),
      place.apply([change("update", "r-1", { servings: 9 })], {})
    ])
    expect(stub.rowsOf("Recipes")[0]).toMatchObject({ Title: "Mine", Servings: 9 })
  })
})

describe("behind a server side", () => {
  /** A `PlaceServer` holding the place, and a browser's `RemotePlace` on it. */
  async function served({ lines, keyNamed }: { lines?: object; keyNamed?: string } = {}) {
    const made_ = await base({ lines: {}, checkedEvery: 30 })
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: "this-run" })
    new PlaceServer({ places: { [made_.stub.base]: made_.place }, keys: made_.keys }).route(router, guard)
    const server = createServer(SRV.toListener(router.handle))
    const port = await SRV.listenPreferred(server)
    guard.allowPort(port)
    closing.push(
      () =>
        new Promise<void>((done) => {
          server.closeAllConnections()
          server.close(() => done())
        })
    )
    const remote = new RemotePlace({
      url: `http://127.0.0.1:${port}/api/places/${made_.stub.base}`,
      token: "this-run",
      can: { kind: "airtable", versionCheck: false },
      lines: { ...LINES, keyNamed: keyNamed ?? made_.keyNamed, ...lines }
    })
    return { ...made_, remote, port }
  }

  test("a program's lines come with the request, and rows come back in its names", async () => {
    const { remote } = await served()
    expect((await remote.list("recipes", {}, {})).rows[0]).toMatchObject({ id: "r-1", title: "Soup" })
  })

  test("tabs of one program share one read, through the server", async () => {
    const { remote, stub } = await served()
    await Promise.all(Array.from({ length: 10 }, () => remote.list("recipes", {}, {})))
    expect(stub.asksOf("POST", /listRecords$/)).toBe(1)
  })

  test("the token never reaches a browser, even in Airtable's error", async () => {
    const { remote, stub } = await served()
    stub.tables.delete("Recipes")
    const { message } = (await remote.list("recipes", {}, {}).catch((error: unknown) => error)) as Error
    expect(message).toContain("can't do this")
    expect(message).not.toContain(AIRTABLE_STUB_TOKEN)
  })

  test("a program naming a key this server doesn't hold is told, and reads nothing", async () => {
    const { remote, stub } = await served({ keyNamed: "SOME_OTHER_KEY" })
    await expect(remote.list("recipes", {}, {})).rejects.toThrow(`names the key "SOME_OTHER_KEY"`)
    expect(stub.asks).toEqual([])
  })

  test("a browser knows a worked-out field's read only, and its write comes back refused about that field", async () => {
    const { remote, stub } = await served()
    await remote.list("recipes", {}, {})
    expect(writeAnswerFor(remote, { collection: "recipes", field: "words" })).toEqual({
      canWrite: false,
      whyNot: "field"
    })
    const write = remote.apply([change("update", "r-1", { words: 3 })], {})
    await expect(write).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "field" } })
    expect(stub.asksOf("PATCH", /Recipes$/)).toBe(0)
  })

  test("the page server serves a base only when it's told one and its key", async () => {
    const stub = await new AirtableStub("appRoutes").addTable("Recipes", COLUMNS, ROWS).start()
    closing.push(() => stub.stop())
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: "this-run" })
    await serveAirtableBase({ router, guard }, {})
    const empty = createServer(SRV.toListener(router.handle))
    const emptyPort = await SRV.listenPreferred(empty)
    guard.allowPort(emptyPort)
    closing.push(
      () =>
        new Promise<void>((done) => {
          empty.closeAllConnections()
          empty.close(() => done())
        })
    )
    const noBase = new RemotePlace({ url: `http://127.0.0.1:${emptyPort}/api/places/appRoutes`, token: "this-run" })
    await expect(noBase.list("Recipes", {}, {})).rejects.toBeInstanceOf(PlaceError)

    const withBase = new SRV.Router()
    const guarded = new SRV.Guard({ token: "this-run" })
    await serveAirtableBase(
      { router: withBase, guard: guarded },
      { AIRTABLE_BASE: "appRoutes", AIRTABLE_KEY: AIRTABLE_STUB_TOKEN, AIRTABLE_URL: stub.url }
    )
    const server = createServer(SRV.toListener(withBase.handle))
    const port = await SRV.listenPreferred(server)
    guarded.allowPort(port)
    closing.push(
      () =>
        new Promise<void>((done) => {
          server.closeAllConnections()
          server.close(() => done())
        })
    )
    const remote = new RemotePlace({
      url: `http://127.0.0.1:${port}/api/places/appRoutes`,
      token: "this-run",
      lines: { ...LINES, keyNamed: "AIRTABLE_KEY" }
    })
    expect((await remote.list("recipes", {}, {})).rows[1]).toMatchObject({ id: "r-2", title: "Dal" })
  })
})

describe("behind a room", () => {
  test("a Referee takes it as its store:  a change goes through to Airtable, and an edit in Airtable's window comes in as a step", async () => {
    const { place, stub } = await base({ checkedEvery: 0.05 })
    const referee = new Referee({
      path: "/api/rooms/airtable",
      place,
      collections: { recipes: { select: ["title", "servings"] } },
      guard: new SRV.Guard()
    })
    closing.push(() => referee.close())
    await referee.open()
    expect(referee.rows.rowsOf("recipes")).toHaveLength(3)
    const page = await import("./Referee.helpers")
    const visitor = new page.TestPage(referee, {}, 7)
    closing.push(() => visitor.close())
    await visitor.read()
    visitor.set("r-1", "title", "From the room")
    await vi.waitFor(() => expect(stub.rowsOf("Recipes")[0]!.Title).toBe("From the room"), {
      timeout: 4000,
      interval: 20
    })
    const { sequence } = referee
    stub.editInAirtable("Recipes", stub.rowsOf("Recipes")[1]!.recordId, { Title: "From Airtable" })
    await vi.waitFor(() => expect(visitor.shown.get("r-2")?.title).toBe("From Airtable"), {
      timeout: 4000,
      interval: 20
    })
    expect(referee.sequence).toBeGreaterThan(sequence)
  })
})

describe("a column named differently (epic `data` T65, T84)", () => {
  const LINES_NAMING_NO_FIELD = {
    idColumn: "Spell id",
    collections: { recipes: { at: "Recipes" } }
  } as unknown as Partial<typeof LINES>

  test("found by its words, capitals and spaces too, with no line naming it", async () => {
    const { place } = await base({ lines: LINES_NAMING_NO_FIELD })
    const { rows } = await place.list("recipes", {}, {})
    expect(rows[0]).toMatchObject({ id: "r-1", title: "Soup", servings: 4, notes: "Roast" })
  })

  test("a write goes back under the column it was read from", async () => {
    const { place, stub } = await base({ lines: LINES_NAMING_NO_FIELD })
    await place.list("recipes", {}, {})
    await place.apply([change("update", "r-1", { title: "Broth" })], {})
    expect(stub.rowsOf("Recipes")[0]).toMatchObject({ Title: "Broth" })
  })
})
