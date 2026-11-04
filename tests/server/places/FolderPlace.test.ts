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

describe("FolderPlace, versions from content (epic `atmosphere` P1)", () => {
  test("a save that changes nothing moves no version;  a change to what it holds does", async () => {
    const { place, file, editOnDisk } = await twoRecipes()
    await place.list("recipes", {}, {})
    const before = place.versionOf("recipes", "r-1")!
    // the same fields, laid out again and in another order:  a touch, a checkout, a formatter
    const { title, notes, id } = JSON.parse(readFileSync(file("r-1"), "utf8")) as Record<string, string>
    writeFileSync(file("r-1"), JSON.stringify({ notes, id, title }))
    await place.list("recipes", {}, {})
    expect(place.versionOf("recipes", "r-1")).toBe(before)
    await expect(
      place.apply(
        [{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" }, version: before }],
        {}
      )
    ).resolves.toBeDefined()

    const after = place.versionOf("recipes", "r-1")!
    editOnDisk("r-1", { title: "Theirs" })
    await place.list("recipes", {}, {})
    expect(place.versionOf("recipes", "r-1")).not.toBe(after)
  })

  test("the same content is the same version in another folder:  it's made from what's there, not when", async () => {
    const one = await twoRecipes()
    const other = await twoRecipes()
    await one.place.list("recipes", {}, {})
    await other.place.list("recipes", {}, {})
    expect(one.place.versionOf("recipes", "r-2")).toBe(other.place.versionOf("recipes", "r-2"))
  })

  test("a list from before content versions reads each file once, and its versions are content's after", async () => {
    const { root, place } = await twoRecipes()
    await place.list("recipes", {}, {})
    const version = place.versionOf("recipes", "r-1")
    const listFile = join(root, "recipes.list.json")
    const { stamps, ...old } = JSON.parse(readFileSync(listFile, "utf8")) as { stamps: Record<string, string> }
    writeFileSync(listFile, JSON.stringify({ ...old, versions: stamps }))
    const fresh = new FolderPlace({ storage: new ChunkFiles({ root }), format: new JsonChunks() })
    await fresh.list("recipes", {}, {})
    expect(fresh.versionOf("recipes", "r-1")).toBe(version)
  })
})

describe("FolderPlace, only the owner (epic `atmosphere` P1)", () => {
  /** A folder where each thing is its maker's, and Owen keeps it. */
  function ownedFolder() {
    const root = newFolder()
    const place = new FolderPlace({
      storage: new ChunkFiles({ root }),
      format: new JsonChunks({ summaries: "every field" }),
      whoWrites: "only the owner",
      mayChangeAnyRow: async (identity) => identity === "owen@spell"
    })
    return { root, place }
  }

  const ANA = { identity: "ana@spell" }
  const BO = { identity: "bo@spell" }

  test("a thing made is its maker's, whatever the change claims, and the list holds it whole", async () => {
    const { place } = ownedFolder()
    const fields = { title: "Dal", owner: "bo@spell" }
    await place.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields }], ANA)
    expect((await place.list("recipes", {}, {})).rows).toEqual([
      { id: "r-1", title: "Dal", owner: "ana@spell", by: "ana@spell" }
    ])
    expect(place.describe()).toMatchObject({ whoWrites: "only the owner" })
  })

  test("someone else's is refused, `owner`, to change or remove;  its maker and a keeper may", async () => {
    const { place } = ownedFolder()
    await place.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } }], ANA)
    const change = { kind: "update" as const, collection: "recipes", id: "r-1", fields: { title: "Bo's" } }
    await expect(place.apply([change], BO)).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "owner" } })
    await expect(place.apply([{ kind: "delete", collection: "recipes", id: "r-1" }], BO)).rejects.toMatchObject({
      kind: "refused"
    })
    await place.apply([{ ...change, fields: { title: "Ana's" } }], ANA)
    await place.apply([{ ...change, fields: { title: "Owen's" } }], { identity: "owen@spell" })
    expect((await place.getMany("recipes", ["r-1"], {}))[0]).toMatchObject({
      title: "Owen's",
      owner: "ana@spell",
      by: "owen@spell"
    })
  })

  test("as a hint, before it's asked:  someone else's thing can't be written", async () => {
    const { place } = ownedFolder()
    const row = { id: "r-1", owner: "ana@spell" }
    expect(place.canWrite({ collection: "recipes", row, identity: "bo@spell" })).toEqual({
      canWrite: false,
      whyNot: "owner"
    })
    expect(place.canWrite({ collection: "recipes", row, identity: "ana@spell" })).toEqual({ canWrite: true })
  })

  test("a request saying nobody is the folder's own, on this machine:  trusted", async () => {
    const { place } = ownedFolder()
    await place.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } }], ANA)
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Tool's" } }], {})
    expect((await place.getMany("recipes", ["r-1"], {}))[0]).toMatchObject({ title: "Tool's", owner: "ana@spell" })
  })
})

describe("FolderPlace, written by its members (epic `atmosphere` P4)", () => {
  /** A space's folder:  Ana its admin, Bo a member, Cy a guest;  anyone else, nobody. */
  function membersFolder() {
    const roles: Record<string, string> = { "ana@spell": "admin", "bo@spell": "member", "cy@spell": "guest" }
    const place = new FolderPlace({
      storage: new ChunkFiles({ root: newFolder() }),
      format: new JsonChunks({ summaries: "every field" }),
      whoWrites: "its members",
      space: {
        id: "@family",
        memberOf: async (person) => {
          const role = roles[person]
          if (!role) return undefined
          return { person, role, canRead: true, canWrite: role !== "guest", canManage: role === "admin" }
        }
      },
      operations: { hello: async (input, { identity }) => `${String(input)}, ${identity}` }
    })
    return { place }
  }

  const insert = { kind: "insert" as const, collection: "recipes", id: "r-1", fields: { title: "Dal" } }

  test("every thing is the space's own, and `by` whoever wrote it last:  one thing, two people", async () => {
    const { place } = membersFolder()
    await place.apply([{ ...insert, fields: { title: "Dal", owner: "bo@spell", by: "bo@spell" } }], {
      identity: "ana@spell"
    })
    expect((await place.getMany("recipes", ["r-1"], {}))[0]).toEqual({
      id: "r-1",
      title: "Dal",
      owner: "@family",
      by: "ana@spell"
    })
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Bo's dal" } }], {
      identity: "bo@spell"
    })
    expect((await place.getMany("recipes", ["r-1"], {}))[0]).toMatchObject({
      title: "Bo's dal",
      owner: "@family",
      by: "bo@spell"
    })
    expect(place.describe()).toMatchObject({ whoWrites: "its members" })
  })

  test("a guest, or someone who isn't a member, is refused:  `role`, and the message says why", async () => {
    const { place } = membersFolder()
    await expect(place.apply([insert], { identity: "cy@spell" })).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "Your role can't write here:  you're a guest of @family, a role that only reads"
    })
    await expect(place.apply([insert], { identity: "dee@spell" })).rejects.toMatchObject({
      cause: { whyNot: "role" },
      message: "Your role can't write here:  you aren't a member of @family"
    })
    expect((await place.list("recipes", {}, {})).rows).toEqual([])
  })

  test("read by its members only, a guest too:  anyone else is refused, `role` (epic `atmosphere` P5, T15)", async () => {
    const { place } = membersFolder()
    await place.apply([insert], { identity: "ana@spell" })
    expect((await place.list("recipes", {}, { identity: "cy@spell" })).rows).toHaveLength(1)
    for (const read of [
      () => place.list("recipes", {}, { identity: "dee@spell" }),
      () => place.getMany("recipes", ["r-1"], { identity: "dee@spell" }),
      () => place.changesSince("recipes", "", { identity: "dee@spell" })
    ]) {
      await expect(read()).rejects.toMatchObject({
        kind: "refused",
        cause: { whyNot: "role" },
        message: "You can't read this:  you aren't a member of @family"
      })
    }
  })

  test("its own operations, as who's asking;  one it hasn't is not found", async () => {
    const { place } = membersFolder()
    expect(await place.call("hello", "hi", { identity: "ana@spell" })).toBe("hi, ana@spell")
    await expect(place.call("nope", undefined, {})).rejects.toMatchObject({ kind: "not found" })
  })

  test("needs its space:  without one it won't be made", () => {
    expect(() => new FolderPlace({ storage: new ChunkFiles({ root: newFolder() }), whoWrites: "its members" })).toThrow(
      TypeError
    )
  })
})
