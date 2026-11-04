import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ChunkFiles, FolderPlace } from "spell/server/places"
import { JsonChunks, Places, type PlaceConflict, type PlaceEvent } from "spell/util/places"

import { newFolder, removeFolders } from "./places.helpers"

/** What stops each watch and storage a test started. */
const stops: (() => void)[] = []

afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  vi.restoreAllMocks()
  removeFolders()
})

/** A folder place on a real folder, with two recipes. */
async function twoRecipes() {
  const root = newFolder()
  const storage = new ChunkFiles({ root })
  const place = new FolderPlace({ storage, format: new JsonChunks({ summaries: { recipes: ["title"] } }) })
  await place.apply(
    [
      { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", notes: "Temper last" } },
      { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Soup", notes: "Roast first" } }
    ],
    {}
  )
  const file = (id: string) => join(root, "recipes", `${id}.json`)
  /** An edit in VS Code:  the file saved, and the place knows nothing. */
  const editOnDisk = (id: string, fields: object) => {
    const text = readFileSync(file(id), "utf8")
    writeFileSync(file(id), JSON.stringify({ ...JSON.parse(text), ...fields }, null, 2))
  }
  return { root, storage, place, file, editOnDisk }
}

describe("FolderPlace, its files", () => {
  test("a list file, and one file per thing", async () => {
    const { root, file } = await twoRecipes()
    expect(JSON.parse(readFileSync(join(root, "recipes.list.json"), "utf8")).rows).toEqual([
      { id: "r-1", title: "Dal" },
      { id: "r-2", title: "Soup" }
    ])
    expect(JSON.parse(readFileSync(file("r-1"), "utf8"))).toEqual({ id: "r-1", title: "Dal", notes: "Temper last" })
  })

  test("a read of the list reads no bodies", async () => {
    const { storage, place } = await twoRecipes()
    const read = vi.spyOn(storage, "read")
    const { rows } = await place.list("recipes", {}, {})
    expect(rows.map(({ title }) => title)).toEqual(["Dal", "Soup"])
    expect(read.mock.calls.map(([path]) => path)).toEqual(["recipes.list.json", "recipes.list.json"])
  })

  test("the bodies come when a read names what's in them", async () => {
    const { place } = await twoRecipes()
    const { rows } = await place.list("recipes", { select: ["notes"] }, {})
    expect(rows[0]).toEqual({ id: "r-1", title: "Dal", notes: "Temper last" })
  })

  test("any id is one file, and comes back as itself", async () => {
    const { root, place } = await twoRecipes()
    const ids = ["a/b", "new one", "../up", ".hidden", "100%", "ñandú"]
    await place.apply(
      ids.map((id) => ({ kind: "insert", collection: "recipes", id, fields: { title: id } })),
      {}
    )
    expect(existsSync(join(root, "recipes", "a%2Fb.json"))).toBe(true)
    expect(existsSync(join(root, "up.json"))).toBe(false)
    const names = (await place.list("recipes", {}, {})).rows.map(({ id }) => id)
    expect(names).toEqual(["r-1", "r-2", ...ids])
    expect(await place.getMany("recipes", ids, {})).toHaveLength(ids.length)
    rmSync(join(root, "recipes.list.json"))
    const again = (await place.list("recipes", {}, {})).rows.map(({ id }) => id)
    expect(new Set(again)).toEqual(new Set(["r-1", "r-2", ...ids]))
  })

  test("a list that's lost is made again from the files", async () => {
    const { root, place } = await twoRecipes()
    rmSync(join(root, "recipes.list.json"))
    const { rows } = await place.list("recipes", {}, {})
    expect(rows.map(({ id }) => id)).toEqual(["r-1", "r-2"])
    expect(existsSync(join(root, "recipes.list.json"))).toBe(true)
  })
})

describe("FolderPlace, a file changed on the disk", () => {
  test("an edit with nothing watching shows on the next read, and only that file is read", async () => {
    const { storage, place, editOnDisk } = await twoRecipes()
    editOnDisk("r-1", { title: "Red dal" })
    const read = vi.spyOn(storage, "read")
    const { rows } = await place.list("recipes", {}, {})
    expect(rows[0]).toEqual({ id: "r-1", title: "Red dal" })
    expect(read.mock.calls.map(([path]) => path)).not.toContain("recipes/r-2.json")
  })

  test("a file added or removed on the disk is a thing added or removed", async () => {
    const { root, place, file } = await twoRecipes()
    writeFileSync(join(root, "recipes", "new one.json"), `{ "title": "Copied" }`)
    rmSync(file("r-2"))
    const { rows } = await place.list("recipes", {}, {})
    expect(rows).toEqual([
      { id: "r-1", title: "Dal" },
      { id: "new one", title: "Copied" }
    ])
  })

  test("a watcher hears an edit, a new file and a removed one, through the storage's own watch", async () => {
    const { root, place, editOnDisk, file } = await twoRecipes()
    const heard: PlaceEvent[] = []
    stops.push(place.watch({ collection: "recipes" }, (event) => heard.push(event)))
    // the watcher has to be up before the edit, and a file watcher starts a moment later
    await new Promise((done) => setTimeout(done, 50))

    editOnDisk("r-1", { title: "Heard" })
    await vi.waitFor(() => expect(heard.at(-1)?.row?.title).toBe("Heard"), { timeout: 3000 })
    expect(heard.at(-1)).toMatchObject({ collection: "recipes", id: "r-1", row: { notes: "Temper last" } })

    writeFileSync(join(root, "recipes", "r-3.json"), `{ "title": "New" }`)
    await vi.waitFor(() => expect(heard.at(-1)).toMatchObject({ id: "r-3", row: { title: "New" } }), { timeout: 3000 })

    rmSync(file("r-2"))
    await vi.waitFor(() => expect(heard.at(-1)).toEqual({ collection: "recipes", id: "r-2" }), { timeout: 3000 })
  })

  test("its own write is told once, and the file watcher finds nothing more", async () => {
    const { place } = await twoRecipes()
    const heard: PlaceEvent[] = []
    stops.push(place.watch({ collection: "recipes", id: "r-1" }, (event) => heard.push(event)))
    await new Promise((done) => setTimeout(done, 50))
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" } }], {})
    await new Promise((done) => setTimeout(done, 400))
    expect(heard.map(({ row }) => row?.title)).toEqual(["Mine"])
  })

  test("changesSince answers what an edit changed, from a list's version", async () => {
    const { place, editOnDisk, file } = await twoRecipes()
    const { version } = await place.list("recipes", {}, {})
    editOnDisk("r-1", { title: "Since" })
    rmSync(file("r-2"))
    const changes = await place.changesSince("recipes", version!)
    expect(changes.rows.map(({ title }) => title)).toEqual(["Since"])
    expect(changes.removed).toEqual(["r-2"])
    expect(await place.changesSince("recipes", changes.token)).toMatchObject({ rows: [], removed: [] })
  })

  test("a token from another run answers with every thing", async () => {
    const { place } = await twoRecipes()
    const { rows } = await place.changesSince("recipes", "9999")
    expect(rows.map(({ notes }) => notes)).toEqual(["Temper last", "Roast first"])
  })

  test("a half typed file leaves its thing as it was, logged once, until it's fixed", async () => {
    const { place, file, editOnDisk } = await twoRecipes()
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const good = readFileSync(file("r-1"), "utf8")
    expect((await place.list("recipes", { select: ["notes"] }, {})).rows[0]!.notes).toBe("Temper last")
    writeFileSync(file("r-1"), `{ "title": "half`)
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Dal")
    // a read of the bodies still answers, with this one as it last read
    expect((await place.list("recipes", { select: ["notes"] }, {})).rows[0]!.notes).toBe("Temper last")
    expect(logged).toHaveBeenCalledTimes(1)
    // a change to it can't be merged over what it can't read:  no answer, so it's sent again
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" } }], {})
    ).rejects.toThrow(SyntaxError)

    writeFileSync(file("r-1"), good)
    editOnDisk("r-1", { title: "Fixed" })
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Fixed")
  })
})

describe("FolderPlace, conflicts", () => {
  test("a change made from a version a save on the disk has passed is out of date", async () => {
    const { place, editOnDisk } = await twoRecipes()
    await place.list("recipes", {}, {})
    const version = place.versionOf("recipes", "r-1")!
    expect(version).toBeDefined()
    editOnDisk("r-1", { title: "Theirs, and longer" })
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" }, version }], {})
    ).rejects.toMatchObject({ kind: "out of date" })
  })

  test("under the engine:  their edit to another field stands, and mine goes through", async () => {
    const { place, editOnDisk, file } = await twoRecipes()
    const places = new Places({ wait: 0, retry: 5 }).add("box", place)
    const conflicts: PlaceConflict[] = []
    places.onConflict((conflict) => conflicts.push(conflict))
    await place.list("recipes", {}, {})
    const pending = places.pendingFor("box")

    editOnDisk("r-1", { notes: "Their notes, a longer note" })
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Mine", was: "Dal" })
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))

    expect(JSON.parse(readFileSync(file("r-1"), "utf8"))).toMatchObject({
      title: "Mine",
      notes: "Their notes, a longer note"
    })
    expect(conflicts).toEqual([])
  })

  test("a file moved over its own name keeps working:  an editor's save", async () => {
    const { root, place, file } = await twoRecipes()
    const temp = join(root, "recipes", ".r-1.json.tmp")
    writeFileSync(temp, `{ "title": "Swapped in" }`)
    renameSync(temp, file("r-1"))
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Swapped in")
  })
})
