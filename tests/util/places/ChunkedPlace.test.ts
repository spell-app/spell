import { describe, expect, test } from "vite-plus/test"

import {
  ChunkedPlace,
  JsonChunks,
  PlaceError,
  Places,
  oneAtATime,
  type ChunkFormat,
  type ChunkStore,
  type PlaceConflict
} from "spell/util/places"

/** A store in memory that says what it's been asked. */
class CountingStore implements ChunkStore {
  readonly files = new Map<string, string>()
  readonly reads: string[] = []
  private versions = new Map<string, number>()
  private lastVersion = 0

  /** Each address read so far that's a body. */
  get bodiesRead(): string[] {
    return this.reads.filter((address) => !address.endsWith(".list.json"))
  }

  async read(address: string): Promise<string | undefined> {
    this.reads.push(address)
    return this.files.get(address)
  }

  async write(address: string, text: string): Promise<void> {
    this.files.set(address, text)
    this.versions.set(address, ++this.lastVersion)
  }

  async remove(address: string): Promise<void> {
    this.files.delete(address)
    this.versions.delete(address)
  }

  versionOf(address: string): string | undefined {
    const version = this.versions.get(address)
    return version === undefined ? undefined : String(version)
  }

  async writeIfVersion(address: string, text: string, version: string): Promise<string> {
    if (this.versionOf(address) !== version) {
      throw new PlaceError(`${address} moved on`, { cause: { kind: "out of date" } })
    }
    await this.write(address, text)
    return this.versionOf(address)!
  }
}

/** A place with two recipes, whose list holds only their titles. */
async function twoRecipes() {
  const store = new CountingStore()
  const place = new ChunkedPlace({ store, format: new JsonChunks({ summaries: { recipes: ["title"] } }) })
  await place.apply(
    [
      { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", notes: "Temper last" } },
      { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Soup", notes: "Roast first" } }
    ],
    {}
  )
  store.reads.length = 0
  return { store, place }
}

describe("ChunkedPlace, reading", () => {
  test("a read of the list fetches no bodies", async () => {
    const { store, place } = await twoRecipes()
    const { rows } = await place.list("recipes", {}, {})
    expect(rows).toEqual([
      { id: "r-1", title: "Dal" },
      { id: "r-2", title: "Soup" }
    ])
    expect(store.bodiesRead).toEqual([])
  })

  test("a query naming only what the summaries hold fetches no bodies", async () => {
    const { store, place } = await twoRecipes()
    await place.list("recipes", { select: ["title"], filter: { title: "Dal" }, sort: [{ field: "id" }] }, {})
    await place.getMany("recipes", ["r-1"], { select: ["title"] })
    expect(store.bodiesRead).toEqual([])
  })

  test("a query naming a field that isn't in the list fetches the bodies", async () => {
    const { store, place } = await twoRecipes()
    const { rows } = await place.list("recipes", { select: ["notes"] }, {})
    expect(rows[1]).toEqual({ id: "r-2", title: "Soup", notes: "Roast first" })
    expect(store.bodiesRead).toEqual(["recipes/r-1.json", "recipes/r-2.json"])
  })

  test("getMany fetches only the bodies asked for;  an id the list doesn't name is left out", async () => {
    const { store, place } = await twoRecipes()
    const rows = await place.getMany("recipes", ["r-2", "nope"], {})
    expect(rows).toEqual([{ id: "r-2", title: "Soup", notes: "Roast first" }])
    expect(store.bodiesRead).toEqual(["recipes/r-2.json"])
  })

  test("bodyOf reads one body, and never the list", async () => {
    const { store, place } = await twoRecipes()
    expect(await place.bodyOf("recipes", "r-1")).toMatchObject({ notes: "Temper last" })
    expect(store.reads).toEqual(["recipes/r-1.json"])
    expect(await place.bodyOf("recipes", "nope")).toBeUndefined()
  })

  test("a collection with no list has no things", async () => {
    const { place } = await twoRecipes()
    expect((await place.list("nothing", {}, {})).rows).toEqual([])
  })

  test("an abort stops a read before it starts", async () => {
    const { place } = await twoRecipes()
    const stop = new AbortController()
    stop.abort(new DOMException("gone", "AbortError"))
    await expect(place.list("recipes", {}, { signal: stop.signal })).rejects.toThrow("gone")
  })
})

describe("ChunkedPlace, its format handed in", () => {
  /** A format with no JSON in it at all, and no way to write:  as an epic page's will be. */
  const LINES: ChunkFormat = {
    listAddress: (page) => `${page}.txt`,
    bodyAddress: (page, id) => `${page}/parts/${id}.txt`,
    summaryFields: () => ["title"],
    listIn: (text) => ({
      rows: text
        .trim()
        .split("\n")
        .map((line) => {
          const [id, title] = line.split(":")
          return { id, title, hasPart: line.endsWith("+") }
        })
    }),
    bodyIn: (text) => ({ html: text }),
    hasBody: (summary) => summary.hasPart === true
  }

  test("reads a list and bodies it knows nothing about, and is read only", async () => {
    const store = new CountingStore()
    store.files.set("seo.txt", "p1:One+\np2:Two\n")
    store.files.set("seo/parts/p1.txt", "<p>the body</p>")
    const place = new ChunkedPlace({ store, format: LINES })

    expect(place.describe().write).toBe("none")
    expect((await place.list("seo", {}, {})).rows).toHaveLength(2)
    expect(store.reads).toEqual(["seo.txt"])

    const rows = await place.getMany("seo", ["p1", "p2"], {})
    expect(rows[0]!.html).toBe("<p>the body</p>")
    expect(rows[1]!.html).toBeUndefined()
    expect(store.reads).toEqual(["seo.txt", "seo.txt", "seo/parts/p1.txt"])

    await expect(place.apply([{ kind: "delete", collection: "seo", id: "p1" }], {})).rejects.toMatchObject({
      kind: "refused"
    })
  })
})

describe("ChunkedPlace, writing", () => {
  test("the body goes first, then the list, which holds only the summary", async () => {
    const store = new CountingStore()
    const writes: string[] = []
    const write = store.write.bind(store)
    store.write = async (address, text) => {
      writes.push(address)
      await write(address, text)
    }
    const place = new ChunkedPlace({ store, format: new JsonChunks({ summaries: { recipes: ["title"] } }) })
    const { rows } = await place.apply(
      [{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", notes: "x" } }],
      {}
    )
    expect(rows).toEqual([{ id: "r-1", title: "Dal", notes: "x" }])
    expect(writes).toEqual(["recipes/r-1.json", "recipes.list.json"])
    expect(JSON.parse(store.files.get("recipes.list.json")!).rows).toEqual([{ id: "r-1", title: "Dal" }])
  })

  test("an update merges over the body, and the list follows a summary field", async () => {
    const { store, place } = await twoRecipes()
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Red dal" } }], {})
    expect(JSON.parse(store.files.get("recipes/r-1.json")!)).toEqual({
      id: "r-1",
      title: "Red dal",
      notes: "Temper last"
    })
    expect((await place.list("recipes", {}, {})).rows[0]).toEqual({ id: "r-1", title: "Red dal" })
  })

  test("an update from an old version is out of date;  two fields from one version are one write's", async () => {
    const { store, place } = await twoRecipes()
    await place.getMany("recipes", ["r-1"], {})
    const version = place.versionOf("recipes", "r-1")!
    await place.apply(
      [
        { kind: "update", collection: "recipes", id: "r-1", fields: { title: "A" }, version },
        { kind: "update", collection: "recipes", id: "r-1", fields: { notes: "B" }, version }
      ],
      {}
    )
    expect(JSON.parse(store.files.get("recipes/r-1.json")!)).toMatchObject({ title: "A", notes: "B" })
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "C" }, version }], {})
    ).rejects.toMatchObject({ kind: "out of date" })
  })

  test("a delete carries no version, and wins;  the list and the body both go", async () => {
    const { store, place } = await twoRecipes()
    await place.apply([{ kind: "delete", collection: "recipes", id: "r-1" }], {})
    expect(store.files.has("recipes/r-1.json")).toBe(false)
    expect((await place.list("recipes", {}, {})).rows.map(({ id }) => id)).toEqual(["r-2"])
  })

  test("a thing that isn't there:  not found", async () => {
    const { place } = await twoRecipes()
    for (const kind of ["update", "delete"] as const) {
      await expect(
        place.apply([{ kind, collection: "recipes", id: "nope", fields: { title: "x" } }], {})
      ).rejects.toMatchObject({ kind: "not found" })
    }
  })

  test("another writer got to the list first:  it reads again, and neither is lost", async () => {
    const { store, place } = await twoRecipes()
    const writeIfVersion = store.writeIfVersion.bind(store)
    let isFirst = true
    store.writeIfVersion = async (address, text, version) => {
      if (isFirst && address === "recipes.list.json") {
        isFirst = false
        const list = JSON.parse(store.files.get(address)!) as { rows: object[] }
        list.rows.push({ id: "r-9", title: "Theirs" })
        await store.write(address, JSON.stringify(list))
      }
      return writeIfVersion(address, text, version)
    }
    await place.apply([{ kind: "insert", collection: "recipes", id: "r-3", fields: { title: "Mine" } }], {})
    const ids = (await place.list("recipes", {}, {})).rows.map(({ id }) => id)
    expect(ids).toEqual(["r-1", "r-2", "r-9", "r-3"])
  })

  test("what a failed batch made before failing is still in the list", async () => {
    const { place } = await twoRecipes()
    await expect(
      place.apply(
        [
          { kind: "insert", collection: "recipes", id: "r-3", fields: { title: "Made" } },
          { kind: "update", collection: "recipes", id: "nope", fields: { title: "x" } }
        ],
        {}
      )
    ).rejects.toMatchObject({ kind: "not found" })
    expect((await place.list("recipes", {}, {})).rows.map(({ id }) => id)).toContain("r-3")
  })
})

describe("ChunkedPlace, under the engine", () => {
  test("someone else's edit to another field merges;  to the same field, mine wins and says what was lost", async () => {
    const { store, place } = await twoRecipes()
    const places = new Places({ wait: 0, retry: 5 }).add("box", place)
    const conflicts: PlaceConflict[] = []
    places.onConflict((conflict) => conflicts.push(conflict))
    await place.getMany("recipes", ["r-1"], {})
    const pending = places.pendingFor("box")
    const sent = () => expect.poll(() => pending.hasPending).toBe(false)

    await store.write("recipes/r-1.json", JSON.stringify({ id: "r-1", title: "Dal", notes: "Theirs" }))
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Mine", was: "Dal" })
    await sent()
    expect(JSON.parse(store.files.get("recipes/r-1.json")!)).toMatchObject({ title: "Mine", notes: "Theirs" })
    expect(conflicts).toEqual([])

    await place.getMany("recipes", ["r-1"], {})
    await store.write("recipes/r-1.json", JSON.stringify({ id: "r-1", title: "Theirs now", notes: "Theirs" }))
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Mine again", was: "Mine" })
    await sent()
    expect(JSON.parse(store.files.get("recipes/r-1.json")!)).toMatchObject({ title: "Mine again" })
    expect(conflicts.map(({ theirs }) => theirs)).toEqual(["Theirs now"])
  })
})

describe("JsonChunks", () => {
  test("an id is one file name, and comes back from it", () => {
    const format = new JsonChunks()
    expect(format.bodyAddress("recipes", "a/b")).toBe("recipes/a%252Fb.json")
    expect(format.bodyAddress("recipes", "..")).toBe("recipes/%252E..json")
    expect(format.bodyAddress("recipes", "new one")).toBe("recipes/new%20one.json")
    expect(format.idOfFile("new one.json")).toBe("new one")
    expect(format.idOfFile("a%2Fb.json")).toBe("a/b")
    expect(format.idOfFile(".hidden.json")).toBeUndefined()
    expect(format.idOfFile("notes.txt")).toBeUndefined()
  })

  test("a thing's id is its file's, whatever it says;  a file that isn't one thing can't be read", () => {
    const format = new JsonChunks()
    expect(format.bodyIn(`{ "id": "other", "x": 1 }`, "recipes", "r-1")).toEqual({ id: "r-1", x: 1 })
    expect(() => format.bodyIn("[1]", "recipes", "r-1")).toThrow(SyntaxError)
    expect(() => format.bodyIn("{ half", "recipes", "r-1")).toThrow(SyntaxError)
  })
})

describe("oneAtATime", () => {
  test("runs each after the last, failed or not", async () => {
    const inTurn = oneAtATime()
    const order: number[] = []
    const first = inTurn(async () => {
      await Promise.resolve()
      order.push(1)
      throw new Error("no")
    })
    const second = inTurn(async () => order.push(2))
    await expect(first).rejects.toThrow("no")
    await second
    expect(order).toEqual([1, 2])
  })
})
