import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ChunkFiles, FilePlace } from "spell/server/places"
import { Places, type PlaceEvent } from "spell/util/places"

import { newFolder, removeFolders } from "./places.helpers"

/** What stops each watch a test started. */
const stops: (() => void)[] = []

afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  removeFolders()
})

/** A one-file place, with a comment in its file. */
function oneFile() {
  const root = newFolder()
  const file = join(root, "box.json5")
  writeFileSync(
    file,
    `{
  // Owen's recipes
  "recipes": [
    { "id": "r-1", "title": "Dal", "notes": "Temper last" },
    { "id": "r-2", "title": "Soup" }
  ]
}
`
  )
  return { file, place: new FilePlace({ storage: new ChunkFiles({ root }), path: "box.json5" }) }
}

describe("FilePlace", () => {
  test("reads each collection from the one file;  one it doesn't hold has no rows", async () => {
    const { place } = oneFile()
    expect((await place.list("recipes", {}, {})).rows).toHaveLength(2)
    expect((await place.list("nothing", {}, {})).rows).toEqual([])
    expect(await place.getMany("recipes", ["r-2"], {})).toEqual([{ id: "r-2", title: "Soup" }])
  })

  test("writes whole, keeping its comment;  a batch that fails writes nothing", async () => {
    const { place, file } = oneFile()
    await place.apply(
      [
        { kind: "update", collection: "recipes", id: "r-1", fields: { title: "Red dal" } },
        { kind: "insert", collection: "recipes", id: "r-3", fields: { title: "New" } },
        { kind: "delete", collection: "recipes", id: "r-2" }
      ],
      {}
    )
    const text = readFileSync(file, "utf8")
    expect(text).toContain("// Owen's recipes")
    expect((await place.list("recipes", {}, {})).rows.map(({ title }) => title)).toEqual(["Red dal", "New"])

    await expect(
      place.apply(
        [
          { kind: "update", collection: "recipes", id: "r-1", fields: { title: "Never" } },
          { kind: "delete", collection: "recipes", id: "nope" }
        ],
        {}
      )
    ).rejects.toMatchObject({ kind: "not found" })
    expect(readFileSync(file, "utf8")).toBe(text)
  })

  test("a save on the disk makes a change from before it out of date;  the engine merges it", async () => {
    const { place, file } = oneFile()
    await place.list("recipes", {}, {})
    const version = place.versionOf("recipes", "r-1")!
    const edited = readFileSync(file, "utf8").replace("Temper last", "Their notes, longer")
    writeFileSync(file, edited)
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" }, version }], {})
    ).rejects.toMatchObject({ kind: "out of date" })

    await place.list("recipes", {}, {})
    const places = new Places({ wait: 0, retry: 5 }).add("box", place)
    const pending = places.pendingFor("box")
    writeFileSync(file, readFileSync(file, "utf8").replace("Their notes, longer", "Their notes, longer still"))
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Mine", was: "Dal" })
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))
    const { rows } = await place.list("recipes", {}, {})
    expect(rows[0]).toMatchObject({ title: "Mine", notes: "Their notes, longer still" })
  })

  test("a watcher hears, thing by thing, what a save on the disk changed", async () => {
    const { place, file } = oneFile()
    await place.list("recipes", {}, {})
    const heard: PlaceEvent[] = []
    stops.push(place.watch({ collection: "recipes" }, (event) => heard.push(event)))
    await new Promise((done) => setTimeout(done, 50))
    writeFileSync(file, readFileSync(file, "utf8").replace("Soup", "Heard"))
    await vi.waitFor(() => expect(heard).toHaveLength(1), { timeout: 3000 })
    expect(heard[0]).toMatchObject({ id: "r-2", row: { title: "Heard" } })
  })

  test("changesSince answers what's changed since a list's version", async () => {
    const { place, file } = oneFile()
    const { version } = await place.list("recipes", {}, {})
    writeFileSync(file, readFileSync(file, "utf8").replace("Soup", "Since"))
    const { rows } = await place.changesSince("recipes", version!)
    expect(rows).toEqual([{ id: "r-2", title: "Since" }])
  })
})
