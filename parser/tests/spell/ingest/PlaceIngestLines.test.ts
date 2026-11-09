import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { PlaceIngest, descriptionFromDisk } from "spell/parser/spell/ingest/PlaceIngest"
import type { IngestFiles, PlaceDescription, PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"

/**
 * What `spell place ingest` writes of what it sees a server do, and of a place that moved
 * (epic `data` T57, T77, T126, T162).
 */

const API = "https://kitchen.test/api"

/** Rows a test's server holds:  unsorted by title, two cuisines, and a server's own times. */
const ROWS = [
  {
    id: 1,
    title: "Dal",
    cuisine: "indian",
    servings: 4,
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-02T10:00:00Z"
  },
  {
    id: 2,
    title: "Brisket",
    cuisine: "texan",
    servings: 8,
    created_at: "2024-03-03T10:00:00Z",
    updated_at: "2024-03-04T10:00:00Z"
  },
  {
    id: 3,
    title: "Chana",
    cuisine: "indian",
    servings: 2,
    created_at: "2024-03-05T10:00:00Z",
    updated_at: "2024-03-06T10:00:00Z"
  }
]

/** A server that does what the test asks of a list:  filters, sorts, gives only some fields, and pages by a position. */
function kitchenServer({ methods = "GET, OPTIONS", address = API }: { methods?: string; address?: string } = {}) {
  const asked: string[] = []
  const fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(`${input instanceof URL ? input.href : (input as string)}`)
    asked.push(url.href)
    const answerWith = (body: unknown) =>
      Response.json(body, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": methods } })
    if (url.href === address) return answerWith({ recipes: `${address}/recipes` })
    if (url.pathname !== `${new URL(address).pathname}/recipes`) return new Response("nope", { status: 404 })
    const { searchParams: query } = url
    let rows = ROWS.filter((row) =>
      [...query].every(([name, value]) => !(name in row) || `${row[name as "id"]}` === value)
    )
    const by = query.get("_sort")
    if (by) rows = rows.toSorted((one, other) => `${one[by as "id"]}`.localeCompare(`${other[by as "id"]}`))
    if (query.has("limit"))
      rows = rows.slice(Number(query.get("offset") ?? 0), Number(query.get("offset") ?? 0) + Number(query.get("limit")))
    const fields = query.get("fields")?.split(",")
    return answerWith(
      fields ? rows.map((row) => Object.fromEntries(fields.map((name) => [name, row[name as "id"]]))) : rows
    )
  }) as typeof globalThis.fetch
  return { fetch, asked }
}

/** Files in memory. */
function memoryFiles() {
  const texts = new Map<string, string>()
  const descriptions = new Map<string, PlaceDescriptionOnDisk>()
  const files: IngestFiles = {
    read: async (path) => texts.get(path),
    write: async (path, text) => void texts.set(path, text),
    readDescription: async (path) => descriptions.get(path),
    writeDescription: async (path, description) => void descriptions.set(path, structuredClone(description)),
    otherSpellBeside: async () => []
  }
  return { files, texts, descriptions }
}

/** A `PlaceIngest` on `fetch`, with no agent. */
function ingestOn(fetch: typeof globalThis.fetch, disk = memoryFiles()) {
  return {
    ingest: new PlaceIngest({
      fetch,
      ask: async () => undefined,
      files: disk.files,
      readThrough: readThroughSpell,
      sleep: async () => {}
    }),
    ...disk
  }
}

describe("what a server does when it's asked (T162)", () => {
  test("it writes each line it saw work:  filters, sorts, the fields it gives, a position, read only", async () => {
    const { ingest } = ingestOn(kitchenServer().fetch)
    const { spell, description } = await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    expect(spell).toContain(`- its next page is asked for with "limit" and "offset"`)
    expect(spell).toContain(`- it filters by title, cuisine and servings`)
    expect(spell).toContain(`- it sorts by title, cuisine and servings with "_sort"`)
    expect(spell).toContain(`- it gives only the fields named in "fields"`)
    expect(spell).toContain(`- it is read only`)
    expect(description.spellCantSay.join("\n")).not.toMatch(/filter or sort|read only/)
    expect(description.collections.recipes!.readThrough!.rows).toBe(3)
  })

  test("a server that ignores what it's asked has none of those lines", async () => {
    const plain = (async () =>
      Response.json(ROWS, { headers: { "access-control-allow-methods": "GET, POST" } })) as typeof globalThis.fetch
    const { ingest } = ingestOn(plain)
    const { spell, description } = await ingest.add({ address: `${API}/recipes`, into: "/K.spell", name: "kitchen" })
    expect(spell).not.toMatch(/filters by|sorts by|gives only|read only|asked for with/)
    expect(description.spellCantSay.join("\n")).toMatch(/filter or sort/)
  })

  test("a server that takes writes isn't read only, and keeping a copy isn't suggested (T126)", async () => {
    const { ingest } = ingestOn(kitchenServer({ methods: "GET, POST, PATCH" }).fetch)
    const { spell, description } = await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    expect(spell).not.toContain("read only")
    expect(description.notes.join("\n")).not.toMatch(/keep a copy/)
  })

  test("a server that only reads:  the report suggests keeping a copy, unless a person's line says so already (T126)", async () => {
    const { ingest, texts } = ingestOn(kitchenServer().fetch)
    const { description } = await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    expect(description.notes.join("\n")).toMatch(/add `- keep a copy on this device`/)
    texts.set(
      "/K.spell",
      texts.get("/K.spell")!.replace("- it is read only", "- it is read only\n\t- keep a copy on this device")
    )
    const again = await ingest.update("/K.spell")
    expect(again.description.notes.join("\n")).not.toMatch(/keep a copy/)
    expect(texts.get("/K.spell")).toContain("- keep a copy on this device")
  })
})

describe("a server's own times (T57)", () => {
  test("its created and updated fields are Spell's, by their own names, and their lines stay", async () => {
    const { ingest } = ingestOn(kitchenServer().fetch)
    const { spell, description } = await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    expect(spell).toContain(`- a recipe's created is its "created_at"`)
    expect(spell).toContain(`- a recipe's modified is its "updated_at"`)
    expect(spell).toContain(`- its "created at" is a date`)
    expect(description.notes.join("\n")).not.toMatch(/No row read filled/)
  })

  test("a field already called created needs no line, and one that isn't a date doesn't count", async () => {
    const rows = [
      { id: 1, title: "Dal", created: "2024-03-01T10:00:00Z", created_at: "last spring" },
      { id: 2, title: "Soup", created: "2024-03-02T10:00:00Z", created_at: "last spring" }
    ]
    const plain = (async () => Response.json(rows)) as typeof globalThis.fetch
    const { spell } = await ingestOn(plain).ingest.add({ address: `${API}/recipes`, into: "/K.spell", name: "kitchen" })
    expect(spell).not.toContain("created is its")
  })

  test("spell place update adds them to a file it wrote before", async () => {
    const disk = memoryFiles()
    const { ingest } = ingestOn(kitchenServer().fetch, disk)
    await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    const held = disk.descriptions.get("/K.json5") as PlaceDescriptionOnDisk
    disk.texts.set("/K.spell", disk.texts.get("/K.spell")!.replace(/.*created is its.*\n/, ""))
    held.spell = held.spell.filter((line) => !/created is its/.test(line))
    const { changes } = await ingest.update("/K.spell")
    expect(changes.join("\n")).toMatch(/Added:  - a recipe's created is its "created_at"/)
    expect(disk.texts.get("/K.spell")).toContain(`- a recipe's created is its "created_at"`)
  })
})

describe("a place that moved (T77)", () => {
  const NEW_HOME = "https://kitchen-moved.test/api"

  test("--address looks there, and changes only the place's line", async () => {
    const disk = memoryFiles()
    const { ingest } = ingestOn(kitchenServer().fetch, disk)
    await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    const before = disk.texts.get("/K.spell")!
    const { fetch } = kitchenServer({ address: NEW_HOME })
    const { changes, description } = await ingestOn(fetch, disk).ingest.update("/K.spell", { movedTo: NEW_HOME })
    expect(changes).toEqual([`Moved:  kitchen is a web server at "${NEW_HOME}":`])
    expect(disk.texts.get("/K.spell")).toBe(before.replace(API, NEW_HOME))
    expect(description.about.address).toBe(NEW_HOME)
    expect((descriptionFromDisk(disk.descriptions.get("/K.json5")!) as PlaceDescription).about.address).toBe(NEW_HOME)
  })

  test("without it, it looks where it was, and a line a person changed still stops the move's edit from touching it", async () => {
    const disk = memoryFiles()
    const { ingest } = ingestOn(kitchenServer().fetch, disk)
    await ingest.add({ address: API, into: "/K.spell", name: "kitchen" })
    disk.texts.set("/K.spell", disk.texts.get("/K.spell")!.replace(`at "${API}":`, `from "${API}":`))
    const { couldntChange } = await ingestOn(kitchenServer({ address: NEW_HOME }).fetch, disk).ingest.update(
      "/K.spell",
      {
        movedTo: NEW_HOME
      }
    )
    expect(couldntChange.join("\n")).toMatch(/isn't as it was written/)
  })
})
