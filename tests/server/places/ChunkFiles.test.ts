import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { ChunkFiles } from "spell/server/places"
import { serveHandler } from "spell/server/test/serve"
import { ChunkedPlace, JsonChunks, WebChunks } from "spell/util/places"

import { newFolder, removeFolders } from "./places.helpers"

/** What stops each thing a test started. */
const stops: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(stops.splice(0).map((stop) => stop()))
  removeFolders()
})

describe("ChunkFiles, as a store", () => {
  test("reads, writes making its folders, lists and removes;  nothing for what isn't there", async () => {
    const files = new ChunkFiles({ root: newFolder() })
    await files.write("a/b.json", "{}")
    expect(await files.read("a/b.json")).toBe("{}")
    expect(await files.read("a/nope.json")).toBeUndefined()
    expect(await files.list("")).toEqual(["a/"])
    expect(await files.list("a")).toEqual(["b.json"])
    expect(await files.list("nope")).toEqual([])
    await files.remove("a/b.json")
    await files.remove("a/b.json")
    expect(await files.read("a/b.json")).toBeUndefined()
  })

  test("nothing outside its root, and no dot files", async () => {
    const files = new ChunkFiles({ root: newFolder() })
    await expect(files.read("../x")).rejects.toThrow()
    await expect(files.write(".hidden", "x")).rejects.toThrow()
  })

  test("a write from an old version is out of date, through the file operations' own check", async () => {
    const root = newFolder()
    const files = new ChunkFiles({ root })
    await files.write("a.json", "the first")
    const version = files.versionOf("a.json")!
    const next = await files.writeIfVersion("a.json", "two", version)
    expect(next).toBe(files.versionOf("a.json"))
    await expect(files.writeIfVersion("a.json", "three, longer", version)).rejects.toMatchObject({
      kind: "out of date"
    })
    expect(readFileSync(join(root, "a.json"), "utf8")).toBe("two")
    expect(files.versionOf("nope.json")).toBeUndefined()
  })

  test("a change by anyone is told once it's quiet;  a save with the same text isn't told again", async () => {
    const root = newFolder()
    const files = new ChunkFiles({ root })
    mkdirSync(join(root, "a"))
    const heard: string[] = []
    const stopWatching = files.watch("a", (path) => heard.push(path))
    stops.push(async () => stopWatching())
    await new Promise((done) => setTimeout(done, 50))

    writeFileSync(join(root, "other.json"), "not watched")
    writeFileSync(join(root, "a", "x%2Fy.json"), "one")
    await vi.waitFor(() => expect(heard).toEqual(["a/x%2Fy.json"]), { timeout: 3000 })

    writeFileSync(join(root, "a", "x%2Fy.json"), "one")
    await new Promise((done) => setTimeout(done, 300))
    expect(heard).toHaveLength(1)
  })
})

describe("ChunkFiles, straight to the files", () => {
  /** A list and two bodies to write, in a new folder. */
  function outputs() {
    const root = newFolder()
    const list = join(root, "x.plan.html")
    const place = { folder: "parts", ending: ".html" }
    const body = (id: string) => ChunkFiles.bodyFile(list, id, place)
    return { list, place, body }
  }

  test("a body's file is beside its list, and a reader finds it", () => {
    const { list, place, body } = outputs()
    expect(body("p1")).toBe(join(list, "..", "parts", "p1.html"))
    const read = ChunkFiles.reader(list, place)
    expect(read("p1")).toBeUndefined()
    ChunkFiles.writeChanged([[body("p1"), "text"]])
    expect(read("p1")).toBe("text")
  })

  test("a body's file, for a list named from where it is:  no `./` on the front", () => {
    expect(ChunkFiles.bodyFile("x.plan.html", "p1", { folder: "parts", ending: ".html" })).toBe(
      join("parts", "p1.html")
    )
  })

  test("bodies first and the list last, each only if changed, and what's gone removed", () => {
    const { list, body } = outputs()
    const first = ChunkFiles.writeListAndBodies({
      list: [list, "list"],
      bodies: [
        [body("a"), "A"],
        [body("b"), "B"]
      ]
    })
    expect(first).toEqual([body("a"), body("b"), list])

    const second = ChunkFiles.writeListAndBodies({
      list: [list, "list"],
      bodies: [[body("a"), "A, changed"]],
      gone: [body("b")]
    })
    expect(second).toEqual([body("a")])
    expect(existsSync(body("b"))).toBe(false)
    expect(readFileSync(body("a"), "utf8")).toBe("A, changed")
  })
})

describe("ChunkedPlace on static hosting", () => {
  test("a list and its bodies from plain files on a plain server:  each body only when it's read, and nothing to write", async () => {
    const root = newFolder()
    const files = new ChunkFiles({ root })
    const format = new JsonChunks({ summaries: { recipes: ["title"] } })
    await files.write(format.listAddress("recipes"), format.listText({ rows: [{ id: "r-1", title: "Dal" }] }))
    await files.write(
      format.bodyAddress("recipes", "r-1"),
      format.bodyText({ id: "r-1", title: "Dal", notes: "Temper" })
    )

    const asked: string[] = []
    const statics = new SRV.StaticHandler({ mounts: [{ prefix: "/", dir: root }] })
    const server = await serveHandler((request, reply, next) => {
      asked.push(request.path)
      return statics.handle(request, reply, next)
    })
    stops.push(server.close)
    const place = new ChunkedPlace({ store: new WebChunks({ url: `${server.base}/` }), format })

    expect(place.describe()).toMatchObject({ write: "none", abort: "hard" })
    expect((await place.list("recipes", {}, {})).rows).toEqual([{ id: "r-1", title: "Dal" }])
    expect(asked).toEqual(["/recipes.list.json"])

    expect(await place.getMany("recipes", ["r-1"], {})).toEqual([{ id: "r-1", title: "Dal", notes: "Temper" }])
    expect(asked).toEqual(["/recipes.list.json", "/recipes.list.json", "/recipes/r-1.json"])

    expect((await place.list("nothing", {}, {})).rows).toEqual([])
    expect(await place.bodyOf("recipes", "nope")).toBeUndefined()
  })
})
