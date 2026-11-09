/**
 * `FolderFiles`:  a space's files on Spell's own server (epic `atmosphere` P15), each its bytes and one record naming it.
 * - On a real folder, written by its members:  Ana writes, Cy is a guest, anyone else nobody.
 * - Its bytes in memory (`FileBytes`), so a test sees every one kept and let go.
 */
import { afterEach, describe, expect, test } from "vite-plus/test"

import { ChunkFiles, FolderFiles, FolderPlace, contentHash, type FileBytes } from "spell/server/places"
import { FILES_COLLECTION, JsonChunks, fileKeyFor } from "spell/places"

import { newFolder, removeFolders } from "./places.helpers"

afterEach(() => removeFolders())

/** A picture's bytes. */
const PICTURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
/** Another's. */
const OTHER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 4, 5, 6, 7])

/** Bytes kept in memory, by hash. */
function memoryBytes(): FileBytes & { kept: Map<string, Uint8Array> } {
  const kept = new Map<string, Uint8Array>()
  return {
    kept,
    read: async (hash) => kept.get(hash),
    has: async (hash) => kept.has(hash),
    write: async (hash, bytes) => void kept.set(hash, bytes),
    remove: async (hash) => void kept.delete(hash)
  }
}

/** The Events Team's space:  Ana writes, Cy is a guest;  `inUse` bytes held, of 10 KB;  what's taken down, changed as it goes. */
function eventsTeam({ inUse = 0 } = {}) {
  const roles: Record<string, string> = { "ana@spell": "member", "cy@spell": "guest" }
  const down = { isWhole: false, things: new Map<string, Set<string>>(), contact: "abuse@test.example" }
  const place = new FolderPlace({
    storage: new ChunkFiles({ root: newFolder() }),
    format: new JsonChunks({ summaries: "every field" }),
    whoWrites: "its members",
    space: {
      id: "@events",
      memberOf: async (person) => {
        const role = roles[person]
        if (!role) return undefined
        return { person, role, canRead: true, canWrite: role !== "guest", canManage: false }
      }
    },
    limits: { space: 10_240 },
    bytesInUse: async () => inUse,
    takenDown: async () => down
  })
  const bytes = memoryBytes()
  return { place, bytes, down, files: new FolderFiles({ place, bytes }) }
}

const ana = { identity: "ana@spell" }

describe("FolderFiles", () => {
  test("a picture added shows by name, type and size, and reads back as itself;  never its hash", async () => {
    const { files } = eventsTeam()
    expect(await files.write([{ name: "poster.png", mimeType: "image/png", bytes: PICTURE }], ana)).toEqual([
      { name: "poster.png", mimeType: "image/png", size: PICTURE.length }
    ])
    expect(await files.list({ identity: "cy@spell" })).toEqual([
      { name: "poster.png", mimeType: "image/png", size: PICTURE.length }
    ])
    const file = await files.read("poster.png", { identity: "cy@spell" })
    expect(file).toEqual({ name: "poster.png", mimeType: "image/png", size: PICTURE.length, bytes: PICTURE })
    expect(Object.keys(file!)).not.toContain("hash")
    expect(await files.read("nothing.png", ana)).toBeUndefined()
  })

  test("its record is a thing of the space's own, `by` its writer;  its bytes kept once, by hash", async () => {
    const { files, place, bytes } = eventsTeam()
    await files.write(
      [
        { name: "Ana's photo.jpg", mimeType: "image/jpeg", bytes: PICTURE },
        { name: "copy.jpg", mimeType: "image/jpeg", bytes: PICTURE }
      ],
      ana
    )
    const [record] = await place.getMany(FILES_COLLECTION, [fileKeyFor("Ana's photo.jpg")], ana)
    expect(record).toMatchObject({ id: "Ana~27s~20photo.jpg", owner: "@events", by: "ana@spell" })
    expect([...bytes.kept.keys()]).toEqual([contentHash(PICTURE)])
  })

  test("replaced:  the name stays, the bytes are the new ones, and the old ones go", async () => {
    const { files, bytes } = eventsTeam()
    await files.write([{ name: "poster.png", mimeType: "image/png", bytes: PICTURE }], ana)
    await files.write([{ name: "poster.png", mimeType: "image/png", bytes: OTHER }], ana)
    expect(await files.list(ana)).toEqual([{ name: "poster.png", mimeType: "image/png", size: OTHER.length }])
    expect((await files.read("poster.png", ana))?.bytes).toEqual(OTHER)
    expect([...bytes.kept.keys()]).toEqual([contentHash(OTHER)])
  })

  test("several at once:  every file's bytes first, then one change of their records", async () => {
    const { files, place, bytes } = eventsTeam()
    const order: string[] = []
    const write = bytes.write
    bytes.write = async (hash, data) => {
      order.push("bytes")
      await write(hash, data)
    }
    const apply = place.apply.bind(place)
    place.apply = async (changes, context) => {
      order.push(`records ${changes.length}`)
      return apply(changes, context)
    }
    await files.write(
      [
        { name: "a.png", mimeType: "image/png", bytes: PICTURE },
        { name: "b.png", mimeType: "image/png", bytes: OTHER }
      ],
      ana
    )
    expect(order).toEqual(["bytes", "bytes", "records 2"])
    expect((await files.list(ana)).map(({ name }) => name)).toEqual(["a.png", "b.png"])
  })

  test("deleted:  its bytes go once no file points to them", async () => {
    const { files, bytes } = eventsTeam()
    await files.write(
      [
        { name: "a.png", mimeType: "image/png", bytes: PICTURE },
        { name: "b.png", mimeType: "image/png", bytes: PICTURE },
        { name: "c.png", mimeType: "image/png", bytes: OTHER }
      ],
      ana
    )
    await files.remove(["a.png", "c.png", "never.png"], ana)
    expect((await files.list(ana)).map(({ name }) => name)).toEqual(["b.png"])
    expect([...bytes.kept.keys()]).toEqual([contentHash(PICTURE)])
  })

  test("a guest can't write one:  refused for their role, and nothing is left behind", async () => {
    const { files, bytes } = eventsTeam()
    await expect(
      files.write([{ name: "poster.png", mimeType: "image/png", bytes: PICTURE }], { identity: "cy@spell" })
    ).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "role" } })
    expect(bytes.kept.size).toBe(0)
    await expect(files.list({ identity: "zed@spell" })).rejects.toMatchObject({ cause: { whyNot: "role" } })
  })

  test("a file over the space's limit is refused, over the ceiling;  its bytes count as the things do", async () => {
    const { files, bytes } = eventsTeam({ inUse: 10_000 })
    await expect(
      files.write([{ name: "big.png", mimeType: "image/png", bytes: new Uint8Array(1000) }], ana)
    ).rejects.toMatchObject({ kind: "over the ceiling", message: expect.stringMatching(/^This space holds 10 KB/) })
    expect(bytes.kept.size).toBe(0)
  })

  test("taken down:  left out and unread, a change refused;  its bytes kept for its putting back", async () => {
    const { files, down, bytes } = eventsTeam()
    await files.write([{ name: "poster.png", mimeType: "image/png", bytes: PICTURE }], ana)
    down.things.set(FILES_COLLECTION, new Set([fileKeyFor("poster.png")]))
    expect(await files.list(ana)).toEqual([])
    expect(await files.read("poster.png", ana)).toBeUndefined()
    await expect(files.write([{ name: "poster.png", mimeType: "image/png", bytes: OTHER }], ana)).rejects.toMatchObject(
      { cause: { whyNot: "taken down" } }
    )
    expect([...bytes.kept.keys()]).toEqual([contentHash(PICTURE)])
    down.things.clear()
    expect((await files.read("poster.png", ana))?.bytes).toEqual(PICTURE)
  })
})

describe("fileKeyFor()", () => {
  test("any name is a key AT Protocol takes, and two names are two keys", () => {
    expect(fileKeyFor("poster.png")).toBe("poster.png")
    expect(fileKeyFor("Ana's photo.jpg")).toBe("Ana~27s~20photo.jpg")
    expect(fileKeyFor("a/b")).toBe("a~2Fb")
    expect(fileKeyFor(".hidden")).toBe("~2Ehidden")
    expect(fileKeyFor("ñ~")).toBe("~C3~B1~7E")
    expect(() => fileKeyFor("")).toThrow(TypeError)
    expect(() => fileKeyFor("x".repeat(201))).toThrow(TypeError)
  })
})
