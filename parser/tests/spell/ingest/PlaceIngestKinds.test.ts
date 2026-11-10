import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { ChunkFiles, FilePlace } from "spell/server/places"
import { AIRTABLE_STUB_TOKEN, AirtableStub } from "spell/server/test/airtableStub"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"
import { startRecipeServers, type RecipeServers } from "spell/server/test/recipeDemo"
import { DEMO_TOKEN } from "spell/server/test/recipeServers"
import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import type { IngestFiles, IngestSettings, PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"

/**
 * `spell place ingest`'s looks at each other kind of place (epic `data` T71):  against each one's stand-in server,
 * every read through the Spell really run.
 */

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
  return { files, texts }
}

/** A `PlaceIngest` on the real network, with no one to ask. */
function realIngest(more: Partial<IngestSettings> = {}) {
  const disk = memoryFiles()
  const ingest = new PlaceIngest({
    shape: "plain",
    fetch: globalThis.fetch,
    ask: async () => undefined,
    files: disk.files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    ...more
  })
  return { ingest, ...disk }
}

describe("a place server's kinds, and a room", { timeout: 30_000 }, () => {
  let servers: RecipeServers
  let folder: string
  const token = { keyNamed: () => DEMO_TOKEN }
  const place = (name: string) => `${servers.url}/api/places/${name}`

  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "place-ingest-kinds-"))
    writeFileSync(join(folder, "book.json5"), `{ recipes: [{ id: "r-1", title: "Dal", servings: 4 }] }`)
    const oneFile = new FilePlace({ storage: new ChunkFiles({ root: folder }), path: "book.json5" })
    servers = await startRecipeServers({ port: 0, folder, morePlaces: { book: oneFile } })
  })
  afterAll(() => {
    // not waited for:  the room's read through the Spell stays connected, and a command's end is what closes it
    void servers.close()
    rmSync(folder, { recursive: true, force: true })
  })

  test("a data folder:  its collections named, each read as a program reads it, its token only sent", async () => {
    const { ingest, texts } = realIngest(token)
    const { description, spell } = await ingest.add({
      address: place("recipes"),
      into: "/Folder.spell",
      name: "cookbook",
      kind: "data folder",
      collections: ["recipes"],
      keySecret: "SERVER_TOKEN",
      keyGoes: { header: "x-server-token" }
    })
    expect(spell).toContain(`cookbook is a data folder at "${place("recipes")}":`)
    expect(spell).toContain(`- it lives in cookbook`)
    expect(spell).toContain(`- check it every 30 seconds`)
    // a run's token is no line of a program
    expect(texts.get("/Folder.spell")).not.toContain("key")
    expect(description.collections.recipes!.readThrough!.rows).toBeGreaterThan(0)
  })

  test("the place server says what kind it holds", async () => {
    const { ingest } = realIngest(token)
    const { description } = await ingest.add({
      address: place("book"),
      into: "/Book.spell",
      collections: ["recipes"],
      keySecret: "SERVER_TOKEN",
      keyGoes: { header: "x-server-token" }
    })
    expect(description.about.kind).toBe("file")
    expect(description.about.name).toBe("book file")
    expect(description.collections.recipes!.readThrough!.rows).toBe(1)
  })

  test("a file names no collections:  it stops, saying so", async () => {
    const { ingest } = realIngest(token)
    await expect(ingest.add({ address: place("book"), into: "/F.spell", kind: "file" })).rejects.toThrow(
      /doesn't list what it holds:  name its collections/
    )
  })

  test("a room:  its referee says what it holds, and a read through the Spell finds it", async () => {
    const { ingest } = realIngest(token)
    const address = `${servers.url.replace("http", "ws")}/api/rooms/recipes`
    const { description, spell } = await ingest.add({ address, into: "/Room.spell", keySecret: "SERVER_TOKEN" })
    expect(description.about).toMatchObject({ kind: "room", address, name: "recipes room" })
    expect(spell).toContain(`recipes room is a room at "${address}":`)
    expect(spell).toContain(`a "recipe" is a thing:`)
    expect(spell).toContain(`- its "title" is text`)
    expect(description.canDo.live).toMatch(/says what changed/)
    expect(description.collections.recipes!.readThrough!.rows).toBeGreaterThan(0)
  })
})

describe("an airtable", { timeout: 30_000 }, () => {
  let stub: AirtableStub
  beforeAll(async () => {
    stub = await new AirtableStub().start()
    stub.addTable(
      "Recipes",
      [
        { name: "Dish Name" },
        { name: "Servings", type: "number" },
        { name: "Doubled", type: "formula", worksOut: ({ Servings }) => (Servings as number) * 2 }
      ],
      [
        { "Dish Name": "Dal", Servings: 4 },
        { "Dish Name": "Soup", Servings: 2 }
      ]
    )
  })
  afterAll(() => stub.stop())

  /** `fetch`, Airtable's own address on the stub. */
  const toStub: typeof globalThis.fetch = (input, init) =>
    globalThis.fetch(`${input as string}`.replace("https://api.airtable.com/v0", stub.url), init)

  test("its schema says its tables, a page of each what's in it, and a server side reads it:  so the look's rows stand", async () => {
    const { ingest } = realIngest({ fetch: toStub, keyNamed: () => AIRTABLE_STUB_TOKEN })
    const { description, spell } = await ingest.add({ address: stub.base, into: "/Air.spell", keySecret: "AIRTABLE" })
    expect(description.about).toMatchObject({ kind: "airtable", name: "airtable base" })
    expect(spell).toContain(`airtable base is an airtable at "${stub.base}":`)
    expect(spell).toContain(`- its key is the secret "AIRTABLE"`)
    expect(spell).toContain(`- recipes live at "Recipes"`)
    expect(spell).toContain(`- its "dish name" is text`)
    expect(description.collections.recipes!.readThrough).toEqual({ rows: 2, readByTheLook: true })
    expect(description.notes.join("\n")).toMatch(/works out Doubled itself/)
    expect(description.notes.join("\n")).toMatch(/wasn't read through the Spell/)
  })

  test("a key that can't read its schema stops, saying what it needs", async () => {
    const { ingest } = realIngest({ fetch: toStub, keyNamed: () => "wrong" })
    await expect(ingest.add({ address: stub.base, into: "/A.spell", keySecret: "AIRTABLE" })).rejects.toThrow(
      /schema\.bases:read/
    )
  })
})

describe("an atmosphere account", { timeout: 30_000 }, () => {
  const DID = "did:plc:alice111"
  let fake: FakeAtmosphere
  const pageSettings = globalThis as { SPELL_ATMOSPHERE?: unknown }
  beforeAll(async () => {
    fake = await new FakeAtmosphere().start(["pds-one"])
    fake.addAccount(DID, { handle: "alice.test", host: "pds-one" })
    fake.putRecord(DID, "com.example.recipe", "3k2a", { $type: "com.example.recipe", title: "Dal", servings: 4 })
    fake.putRecord(DID, "com.example.recipe", "3k2b", { $type: "com.example.recipe", title: "Soup", servings: 2 })
    pageSettings.SPELL_ATMOSPHERE = fake.network
  })
  afterAll(async () => {
    delete pageSettings.SPELL_ATMOSPHERE
    await fake.close()
  })

  test("its document says which host holds it, the host what it holds;  its records read through the Spell", async () => {
    const { ingest } = realIngest()
    const { description, spell } = await ingest.add({ address: DID, into: "/At.spell" })
    expect(description.about).toMatchObject({ kind: "atmosphere account", name: "alice" })
    expect(spell).toContain(`alice is an atmosphere account at "${DID}":`)
    expect(spell).toContain(`- recipes live at "com.example.recipe"`)
    expect(spell).toContain(`- its "title" is text`)
    expect(spell).not.toContain("$type")
    expect(description.collections.recipes!.readThrough!.rows).toBe(2)
  })
})
