import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ChunkFiles, FolderPlace } from "spell/server/places"
import { JsonChunks, PlaceError, Places, type PlaceConflict, type PlaceEvent } from "spell/places"
import type { ThingChange } from "spell/places/places.types"

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

describe("FolderPlace, writes by kind of thing (epic `atmosphere` P23)", () => {
  test("handed a write check, it asks it of each change a member makes:  the kind, made, changed or removed, and `by`", async () => {
    const asked: ThingChange[] = []
    const place = new FolderPlace({
      storage: new ChunkFiles({ root: newFolder() }),
      format: new JsonChunks({ summaries: "every field" }),
      whoWrites: "its members",
      space: {
        id: "@family",
        memberOf: async (person) => ({ person, role: "viewer", canRead: true, canWrite: false, canManage: false }),
        changeOrDie: async (change) => {
          asked.push(change)
          if (change.kind === "row") {
            throw new PlaceError("rows take an editor", { cause: { kind: "refused", whyNot: "role", needs: "editor" } })
          }
        }
      }
    })
    const post = { kind: "insert" as const, collection: "posts", id: "p-1", fields: { text: "Hi" } }
    // a viewer's role writes nothing by its flags:  the check lets this one through
    await place.apply([post], { identity: "bo@spell" })
    await place.apply([{ ...post, fields: { text: "Hello" } }], { identity: "bo@spell" })
    await place.apply([{ kind: "delete", collection: "posts", id: "p-1" }], { identity: "bo@spell" })
    expect(asked.map(({ kind, action, by }) => `${kind} ${action} ${by ?? "-"}`)).toEqual([
      "post make -",
      "post change bo@spell",
      "post remove bo@spell"
    ])
    await expect(
      place.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } }], {
        identity: "bo@spell"
      })
    ).rejects.toMatchObject({ cause: { whyNot: "role", needs: "editor" } })
    expect((await place.list("recipes", {}, {})).rows).toEqual([])
  })
})

describe("FolderPlace, who besides its members (epic `atmosphere` P7, Q13)", () => {
  /** A space's folder whose settings are `settings`:  Ana its admin, Cy a guest;  anyone else, nobody. */
  function publicFolder(settings: { publicRead: boolean; publicWrite: boolean }) {
    const roles: Record<string, string> = { "ana@spell": "admin", "cy@spell": "guest" }
    return new FolderPlace({
      storage: new ChunkFiles({ root: newFolder() }),
      format: new JsonChunks({ summaries: "every field" }),
      whoWrites: "its members",
      space: {
        id: "@club",
        memberOf: async (person) => {
          const role = roles[person]
          return role
            ? { person, role, canRead: true, canWrite: role !== "guest", canManage: role === "admin" }
            : undefined
        },
        settings: async () => settings
      }
    })
  }

  const row = (id: string, name: string) => ({ kind: "insert" as const, collection: "slots", id, fields: { name } })
  const rename = (id: string, name: string) => ({ kind: "update" as const, collection: "slots", id, fields: { name } })

  test("publicRead:  anyone reads it, a stranger too;  writing is still its members'", async () => {
    const place = publicFolder({ publicRead: true, publicWrite: false })
    await place.apply([row("s-1", "Ana")], { identity: "ana@spell" })
    expect((await place.list("slots", {}, { identity: "dee@spell" })).rows).toHaveLength(1)
    await expect(place.apply([row("s-2", "Dee")], { identity: "dee@spell" })).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })
  })

  test("publicWrite:  a stranger adds a thing of their own and changes only it;  a member changes any", async () => {
    const place = publicFolder({ publicRead: true, publicWrite: true })
    await place.apply([row("s-1", "Ana")], { identity: "ana@spell" })
    await place.apply([row("s-2", "Dee")], { identity: "dee@spell" })
    await place.apply([rename("s-2", "Dee, 2pm")], { identity: "dee@spell" })
    expect((await place.getMany("slots", ["s-2"], {}))[0]).toEqual({
      id: "s-2",
      name: "Dee, 2pm",
      owner: "@club",
      by: "dee@spell"
    })
    // a guest of the space counts as anyone:  their own only
    await place.apply([row("s-3", "Cy")], { identity: "cy@spell" })
    for (const change of [
      rename("s-1", "Dee took it"),
      { kind: "delete" as const, collection: "slots", id: "s-1" },
      row("s-1", "Dee over Ana")
    ]) {
      await expect(place.apply([change], { identity: "dee@spell" })).rejects.toMatchObject({
        kind: "refused",
        cause: { whyNot: "owner" },
        message: `"slots" s-1 is ana@spell's:  you can change only what you added, and the space's members anything`
      })
    }
    await place.apply([{ kind: "delete", collection: "slots", id: "s-2" }], { identity: "dee@spell" })
    await place.apply([rename("s-3", "Cy, moved by Ana")], { identity: "ana@spell" })
    expect((await place.list("slots", {}, {})).rows.map(({ name }) => `${name}`).toSorted()).toEqual([
      "Ana",
      "Cy, moved by Ana"
    ])
  })

  test("both off:  as before, members only", async () => {
    const place = publicFolder({ publicRead: false, publicWrite: false })
    await expect(place.list("slots", {}, { identity: "dee@spell" })).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })
  })
})

describe("FolderPlace, limits (epic `atmosphere` P7)", () => {
  /** A folder that takes things of at most 2 KB, and holds at most `inUse` + what's left of 10 KB. */
  function limited(inUse = 0) {
    return new FolderPlace({
      storage: new ChunkFiles({ root: newFolder() }),
      limits: { thing: 2048, space: 10_240 },
      bytesInUse: async () => inUse
    })
  }
  const notes = (id: string, size: number) => ({
    kind: "insert" as const,
    collection: "notes",
    id,
    fields: { text: "x".repeat(size) }
  })

  test("a thing over its limit is refused, over the ceiling, saying how big;  nothing is written", async () => {
    const place = limited()
    await expect(place.apply([notes("n-1", 3000)], {})).rejects.toMatchObject({
      kind: "over the ceiling",
      message: "This notes thing is 3 KB, over the 2 KB one may hold:  it isn't saved, and stays on this page"
    })
    expect((await place.list("notes", {}, {})).rows).toEqual([])
    await place.apply([notes("n-2", 1000)], {})
  })

  test("a space too full is refused;  a smaller save that still fits goes through", async () => {
    const place = limited(10_000)
    await expect(place.apply([notes("n-1", 1000)], {})).rejects.toMatchObject({
      kind: "over the ceiling",
      message: "This space holds 10 KB of the 10 KB it may, too full for this:  it isn't saved, and stays on this page"
    })
    await place.apply([notes("n-2", 100)], {})
  })
})

describe("FolderPlace, taken down (epic `atmosphere` P6)", () => {
  /** Two recipes, and what its host says is taken down:  changed by the test as it goes. */
  async function withTakedowns() {
    const down: { isWhole: boolean; things: Map<string, Set<string>>; contact: string } = {
      isWhole: false,
      things: new Map(),
      contact: "abuse@test.example"
    }
    const asked: (string | undefined)[] = []
    const root = newFolder()
    const place = new FolderPlace({
      storage: new ChunkFiles({ root }),
      format: new JsonChunks({ summaries: { recipes: ["title"] } }),
      takenDown: async (identity) => {
        asked.push(identity)
        return down
      }
    })
    await place.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } },
        { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Soup" } }
      ],
      {}
    )
    return { place, down, asked, root }
  }

  test("a thing:  left out of lists and reads by id, a change to it refused;  its file stays", async () => {
    const { place, down, root } = await withTakedowns()
    down.things.set("recipes", new Set(["r-2"]))
    expect((await place.list("recipes", {}, {})).rows.map(({ id }) => id)).toEqual(["r-1"])
    expect(await place.getMany("recipes", ["r-1", "r-2"], {})).toEqual([expect.objectContaining({ id: "r-1" })])
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "r-2", fields: { title: "x" } }], {})
    ).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "taken down" },
      message: `"recipes" r-2 was taken down by Spell.  To ask about it:  abuse@test.example`
    })
    expect(existsSync(join(root, "recipes", "r-2.json"))).toBe(true)
  })

  test("the whole folder:  every read, write and operation refused, naming where to ask", async () => {
    const { place, down } = await withTakedowns()
    down.isWhole = true
    const refused = { kind: "refused", cause: { whyNot: "taken down" } }
    await expect(place.list("recipes", {}, {})).rejects.toMatchObject({
      ...refused,
      message: "This space was taken down by Spell.  To ask about it:  abuse@test.example"
    })
    await expect(place.getMany("recipes", ["r-1"], {})).rejects.toMatchObject(refused)
    await expect(place.changesSince("recipes", "x", {})).rejects.toMatchObject(refused)
    await expect(
      place.apply([{ kind: "insert", collection: "recipes", id: "r-3", fields: { title: "x" } }], {})
    ).rejects.toMatchObject(refused)
  })

  test("asked afresh, for who's asking:  a watcher hears a thing taken down as removed, and put back as there", async () => {
    const { place, down, asked } = await withTakedowns()
    const heard: PlaceEvent[] = []
    stops.push(place.watch({ collection: "recipes" }, (event) => heard.push(event)))
    down.things.set("recipes", new Set(["r-1"]))
    await place.list("recipes", {}, { identity: "bo@spell" })
    expect(heard).toEqual([{ collection: "recipes", id: "r-1" }])
    down.things.clear()
    await place.list("recipes", {}, {})
    expect(heard.at(-1)).toMatchObject({ collection: "recipes", id: "r-1", row: { title: "Dal" } })
    expect(asked).toContain("bo@spell")
  })
})
