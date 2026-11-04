/**
 * `SpaceFolders`:  every project data folder in spaces, served by the page server's route (epic `atmosphere` P1).
 * - Real HTTP, a real folder:  a temporary spell.spaces, and a browser's `RemotePlace` asking it.
 * - Who's asking comes from a header here, as sign-in will say it:  the app's own is this machine's person.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { RemotePlace } from "spell/util/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "space-folders-token"

/** The org file:  Owen and Matt are members of spell, and Grace its admin. */
const SPELL_ORG = `{
  "$type": "Org",
  "id": "spell",
  "name": "Spell",
  "members": [
    { "$type": "Membership", "person": { "$ref": "Person#owen@spell" }, "role": "member" },
    { "$type": "Membership", "person": { "$ref": "Person#matt@spell" }, "role": "member" },
    { "$type": "Membership", "person": { "$ref": "Person#grace@spell" }, "role": "admin" }
  ]
}
`

/** A person's starter file. */
function personFile(id: string): string {
  return JSON.stringify({ $type: "Person", id, names: id })
}

const spaces = mkdtempSync(join(tmpdir(), "spell-space-folders-"))
const peopleStorage = new DiskStorage(spaces)
let folders: SpaceFolders
let port: number
let server: ReturnType<typeof createServer>

beforeAll(async () => {
  mkdirSync(join(spaces, "@spell"), { recursive: true })
  writeFileSync(join(spaces, "@spell", "__org.json5"), SPELL_ORG)
  for (const id of ["owen", "matt", "grace"]) {
    mkdirSync(join(spaces, "@spell", `${id}@`), { recursive: true })
    writeFileSync(join(spaces, "@spell", `${id}@`, "__me.json5"), personFile(id))
  }
  folders = new SpaceFolders({
    folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
    people: new PeopleStore(peopleStorage),
    personFor: (request) => request.get("x-person") ?? "owen@spell"
  })
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  folders.route({ router, guard })
  server = createServer(SRV.toListener(router.handle))
  port = await SRV.listenPreferred(server)
  guard.allowPort(port)
})

afterEach(() => folders.close())

afterAll(async () => {
  peopleStorage.close()
  await new Promise<void>((done) => {
    server.closeAllConnections()
    server.close(() => done())
  })
  rmSync(spaces, { recursive: true, force: true })
})

/** A browser's place on the folder at `address`, asking as `person`. */
function folderAt(address: string, person = "owen@spell"): RemotePlace {
  const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${address}`, token: TOKEN })
  // who's asking, as sign-in will say:  a header, on every request it sends
  const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown }).answerTo
  ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
    return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
  }
  return remote
}

/** What the folder at `parts` (from spell.spaces) holds of `id`, as its file says. */
function onDisk(parts: string[], id: string): Record<string, unknown> | undefined {
  const file = join(spaces, ...parts, "recipes", `${id}.json`)
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : undefined
}

describe("SpaceFolders, a folder by its address", () => {
  test("a round trip:  written into that space's folder on disk, and read back, its owner who wrote it", async () => {
    const box = folderAt("owen@spell/recipes")
    await box.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", servings: 4 } }], {})
    expect(onDisk(["@spell", "owen@", "recipes"], "r-1")).toEqual({
      id: "r-1",
      title: "Dal",
      servings: 4,
      owner: "owen@spell"
    })
    // a list holds every field:  nobody named which beforehand
    expect((await folderAt("owen@spell/recipes").list("recipes", {}, {})).rows).toEqual([
      { id: "r-1", title: "Dal", servings: 4, owner: "owen@spell" }
    ])
  })

  test("someone else's row is refused to another person, `owner`;  the space's person may change anyone's", async () => {
    await folderAt("owen@spell/shared").apply(
      [{ kind: "insert", collection: "recipes", id: "m-1", fields: { title: "Matt's" } }],
      {}
    )
    const asMatt = folderAt("owen@spell/shared", "matt@spell")
    await asMatt.apply([{ kind: "insert", collection: "recipes", id: "m-2", fields: { title: "Matt's own" } }], {})
    await expect(
      asMatt.apply([{ kind: "update", collection: "recipes", id: "m-1", fields: { title: "Mine now" } }], {})
    ).rejects.toMatchObject({ kind: "refused", cause: { whyNot: "owner" } })
    expect(onDisk(["@spell", "owen@", "shared"], "m-1")).toMatchObject({ title: "Matt's" })

    // Owen's space:  he keeps it
    await folderAt("owen@spell/shared").apply(
      [{ kind: "update", collection: "recipes", id: "m-2", fields: { title: "Tidied" } }],
      {}
    )
    expect(onDisk(["@spell", "owen@", "shared"], "m-2")).toMatchObject({ title: "Tidied", owner: "matt@spell" })
  })

  test("with no `__members/`, the org's admin keeps it;  a member doesn't", async () => {
    await folderAt("@spell/team-recipes", "matt@spell").apply(
      [{ kind: "insert", collection: "recipes", id: "t-1", fields: { title: "Matt's" } }],
      {}
    )
    const change = { kind: "update" as const, collection: "recipes", id: "t-1", fields: { title: "Grace's" } }
    await expect(folderAt("@spell/team-recipes", "owen@spell").apply([change], {})).rejects.toMatchObject({
      kind: "refused"
    })
    await folderAt("@spell/team-recipes", "grace@spell").apply([change], {})
    expect(onDisk(["@spell", "team-recipes"], "t-1")).toMatchObject({ title: "Grace's", owner: "matt@spell" })
  })

  test("a folder's own `__members/`, when it has one:  its admins keep it, the org's don't;  its person is written in", async () => {
    const members = join(spaces, "@spell", "owen@", "family", "__members")
    mkdirSync(members, { recursive: true })
    writeFileSync(join(members, "matt@spell.json5"), `{ "person": { "$ref": "Person#matt@spell" }, "role": "admin" }`)
    await folderAt("owen@spell/family", "grace@spell").apply(
      [{ kind: "insert", collection: "recipes", id: "g-1", fields: { title: "Grace's" } }],
      {}
    )
    // the owner's membership, with the owner's role
    expect(readFileSync(join(members, "owen@spell.json5"), "utf8")).toContain('"role": "admin"')

    const change = { kind: "update" as const, collection: "recipes", id: "g-1", fields: { title: "Matt's" } }
    await folderAt("owen@spell/family", "matt@spell").apply([change], {})
    expect(onDisk(["@spell", "owen@", "family"], "g-1")).toMatchObject({ title: "Matt's" })
  })
})

describe("SpaceFolders, a personal folder", () => {
  test("one per person, in each person's own space's __data", async () => {
    const insert = { kind: "insert" as const, collection: "recipes", id: "p-1", fields: { title: "Mine" } }
    await folderAt("personal/recipes", "owen@spell").apply([insert], {})
    await folderAt("personal/recipes", "matt@spell").apply([{ ...insert, fields: { title: "Matt's" } }], {})
    expect(onDisk(["@spell", "owen@", "__data", "recipes"], "p-1")).toMatchObject({ title: "Mine" })
    expect(onDisk(["@spell", "matt@", "__data", "recipes"], "p-1")).toMatchObject({ title: "Matt's" })
  })

  test("says what it can do:  only the owner, and not more often than every 5 seconds", async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/api/places/spaces/owen@spell/recipes`, {
      headers: { "x-server-token": TOKEN }
    })
    expect(await answer.json()).toMatchObject({
      capabilities: { whoWrites: "only the owner", checkedAtMostEvery: 5, identifiesBy: "this machine" }
    })
  })

  test("a name that's no address, or one that climbs out, is no folder:  404", async () => {
    for (const name of ["recipes", "owen@spell/../../etc", "@local/x/recipes"]) {
      const answer = await fetch(`http://127.0.0.1:${port}/api/places/spaces/${name}/list`, {
        method: "POST",
        headers: { "x-server-token": TOKEN, "content-type": "application/json" },
        body: JSON.stringify({ collection: "recipes" })
      })
      expect(answer.status, name).toBe(404)
    }
  })
})
