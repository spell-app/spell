/**
 * Reading a space direct (epic `atmosphere` P5, Q6 C), written through the server side:
 * - `ReadCredentials`, `DirectReads` and `PlaceServer`'s `credential`
 * - a browser's `RemotePlace` reading straight from the files
 * - Real HTTP, a real folder.
 *   Node's `fetch` keeps no cookies, so a test sends the one it was given by hand;
 *   a browser's, in the app's recipe box test (`tests/spell/recipeBox.test.ts`).
 */
import { readFileSync } from "node:fs"
import { createServer } from "node:http"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { ChunkFiles, DirectReads, FolderPlace, PlaceServer } from "spell/server/places"
import { ReadCredentials } from "spell/server/signIn"
import { EVERY_FIELD, JsonChunks, PlaceError, RemotePlace, SPACE_READS_PREFIX } from "spell/places"

import { newFolder, removeFolders } from "./places.helpers"

/** The token the write side wants. */
const TOKEN = "direct-reads-token"

/** Every server a test started. */
const closes: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()))
  removeFolders()
})

describe("ReadCredentials", () => {
  test("one says its space and person, signed;  changed, from another key, or old, it says nothing", () => {
    let now = 1_000
    const credentials = new ReadCredentials({ now: () => now })
    const credential = credentials.issue({ space: "@family/cookbook", person: "bo@spell" })
    expect(credentials.check(credential)).toMatchObject({ space: "@family/cookbook", person: "bo@spell" })
    const [text, signature] = credential.split(".")
    const claimed = Buffer.from(JSON.stringify({ space: "@family", person: "bo@spell", until: 9e15 })).toString(
      "base64url"
    )
    expect(credentials.check(`${claimed}.${signature}`)).toBeUndefined()
    expect(credentials.check(`${text}.`)).toBeUndefined()
    expect(credentials.check(undefined)).toBeUndefined()
    expect(new ReadCredentials().check(credential)).toBeUndefined()
    now += 31 * 24 * 60 * 60 * 1000
    expect(credentials.check(credential)).toBeUndefined()
  })

  test("its key, kept in a file:  a restart keeps every credential good", () => {
    const file = `${newFolder()}/key`
    const credential = new ReadCredentials({ file }).issue({ space: "a@spell/x", person: "a@spell" })
    expect(new ReadCredentials({ file }).check(credential)).toMatchObject({ space: "a@spell/x" })
  })
})

describe("DirectReads, and RemotePlace reading through it", () => {
  /** A folder written through a `PlaceServer`, and read direct;  `readers`:  who may read it, as its member list says. */
  async function space({ readers }: { readers: Set<string> }) {
    const root = newFolder()
    const place = new FolderPlace({
      storage: new ChunkFiles({ root }),
      format: new JsonChunks({ summaries: EVERY_FIELD })
    })
    await place.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } },
        { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Pie" } }
      ],
      {}
    )
    const credentials = new ReadCredentials()
    const reads = new DirectReads({
      prefix: SPACE_READS_PREFIX,
      credentials,
      filesOf: (name) => (name === "cookbook" ? new ChunkFiles({ root }) : undefined),
      mayRead: async (_space, person) => person !== undefined && readers.has(person)
    })
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: TOKEN })
    /** Whether the write side answers:  stopped, every request to it is no answer. */
    const writeSide = { isUp: true, credentialsGiven: 0 }
    router.use((request, reply, next) => {
      if (!writeSide.isUp && request.path.startsWith("/api/places/")) return reply.status(503).send("stopped")
      next()
    })
    // node's `fetch` keeps no cookie:  the last one handed out rides with every read, as a browser's would
    let cookie: string | undefined
    router.use((request, _reply, next) => {
      if (cookie && request.path.startsWith(SPACE_READS_PREFIX)) request.headers.cookie = cookie
      next()
    })
    new PlaceServer({
      places: { cookbook: place },
      identityOf: () => "bo@spell",
      credentialFor: async ({ placeName, identity }) => {
        if (!readers.has(identity!)) {
          throw new PlaceError("You can't read this:  you aren't a member", {
            cause: { kind: "refused", whyNot: "role" }
          })
        }
        writeSide.credentialsGiven++
        const made = { cookie: reads.cookieFor(placeName, identity!), readsAt: reads.readsAt(placeName) }
        cookie = made.cookie.split(";")[0]
        return made
      }
    }).route(router, guard)
    reads.route(router, guard)
    const server = createServer(SRV.toListener(router.handle))
    const port = await SRV.listenPreferred(server)
    guard.allowPort(port)
    closes.push(
      () =>
        new Promise((done) => {
          server.closeAllConnections()
          server.close(() => done())
        })
    )
    const base = `http://127.0.0.1:${port}`
    const remote = new RemotePlace({
      url: `${base}/api/places/cookbook`,
      token: TOKEN,
      readsAt: `${base}${SPACE_READS_PREFIX}/cookbook`
    })
    return { remote, writeSide, place }
  }

  test("refused with no credential, it asks the write side for one, once, and reads straight from the files", async () => {
    const { remote, writeSide } = await space({ readers: new Set(["bo@spell"]) })
    const { rows } = await remote.list("recipes", {}, {})
    expect(rows.map(({ title }) => title)).toEqual(expect.arrayContaining(["Dal", "Pie"]))
    expect(writeSide.credentialsGiven).toBe(1)
    await remote.list("recipes", {}, {})
    expect(writeSide.credentialsGiven).toBe(1)
    expect(await remote.getMany("recipes", ["r-2"], {})).toEqual([expect.objectContaining({ title: "Pie" })])
  })

  test("with the write side stopped, it still reads;  a write is no answer, so it waits", async () => {
    const { remote, writeSide } = await space({ readers: new Set(["bo@spell"]) })
    await remote.list("recipes", {}, {})
    writeSide.isUp = false
    expect((await remote.list("recipes", {}, {})).rows).toHaveLength(2)
    await expect(
      remote.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Dal, more" } }], {})
    ).rejects.not.toBeInstanceOf(PlaceError)
  })

  test("what it read is what a change is made from:  its version, from the list", async () => {
    const { remote } = await space({ readers: new Set(["bo@spell"]) })
    await remote.list("recipes", {}, {})
    expect(remote.versionOf("recipes", "r-1")).toMatch(/./)
    await remote.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Dal, more" } }], {})
    expect((await remote.list("recipes", {}, {})).rows).toContainEqual(expect.objectContaining({ title: "Dal, more" }))
  })

  test("someone who's no reader now:  the read is refused, and so is a new credential, saying why", async () => {
    const readers = new Set(["bo@spell"])
    const { remote } = await space({ readers })
    await remote.list("recipes", {}, {})
    readers.delete("bo@spell")
    await expect(remote.list("recipes", {}, {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "You can't read this:  you aren't a member"
    })
  })
})

describe("DirectReads, what's taken down (epic `atmosphere` P6)", () => {
  test("a thing:  left out of its list file as it's served, its own file 451;  the whole space 451;  the disk as it was", async () => {
    const root = newFolder()
    const place = new FolderPlace({
      storage: new ChunkFiles({ root }),
      format: new JsonChunks({ summaries: EVERY_FIELD })
    })
    await place.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } },
        { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Pie" } }
      ],
      {}
    )
    const down = { isWhole: false, things: new Map([["recipes", new Set(["r-2"])]]), contact: "abuse@test.example" }
    const asked: string[] = []
    const reads = new DirectReads({
      prefix: SPACE_READS_PREFIX,
      credentials: new ReadCredentials(),
      filesOf: () => new ChunkFiles({ root }),
      mayRead: async () => true,
      takenDown: async (_space, person) => {
        asked.push(person ?? "nobody")
        return down
      }
    })
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: TOKEN })
    reads.route(router, guard)
    const server = createServer(SRV.toListener(router.handle))
    const port = await SRV.listenPreferred(server)
    guard.allowPort(port)
    closes.push(
      () =>
        new Promise((done) => {
          server.closeAllConnections()
          server.close(() => done())
        })
    )
    const cookie = reads.cookieFor("cookbook", "bo@spell").split(";")[0]!
    const read = async (path: string) => {
      const answer = await fetch(`http://127.0.0.1:${port}${SPACE_READS_PREFIX}/cookbook/${path}`, {
        headers: { cookie }
      })
      return { status: answer.status, text: await answer.text() }
    }
    const list = JSON.parse((await read("recipes.list.json")).text)
    expect(list.rows.map(({ id }: { id: string }) => id)).toEqual(["r-1"])
    expect(Object.keys(list.versions)).toEqual(["r-1"])
    const pie = await read("recipes/r-2.json")
    expect(pie.status).toBe(451)
    expect(JSON.parse(pie.text).error).toBe(
      `"recipes" r-2 was taken down by Spell.  To ask about it:  abuse@test.example`
    )
    expect((await read("recipes/r-1.json")).status).toBe(200)
    expect(asked).toContain("bo@spell")
    down.isWhole = true
    expect((await read("recipes.list.json")).status).toBe(451)
    expect(JSON.parse(readFileSync(`${root}/recipes.list.json`, "utf8")).rows).toHaveLength(2)
  })
})
