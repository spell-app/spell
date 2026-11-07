/**
 * A projection (epic `atmosphere` P17):  part of a space's data, written into another space where its readers can see it.
 * - The picnic's sign-up sheet:  its master copy in the event's private space, a published sheet in the picnic's space
 *   showing each row's person and shift, only the confirmed ones.
 * - Real HTTP, a real folder:  a temporary spell.spaces, a browser's `RemotePlace` writing it.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { RemotePlace, SPACE_PROJECTION_OPERATIONS } from "spell/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "projection-token"
/** The event's private space:  the sign-up sheet's master copy. */
const PRIVATE = "@rs/picnic-private"
/** The picnic's space, where the published sheet is. */
const PICNIC = "@rs/picnic"
/** The published sheet, as a program's line names it. */
const SHEET = { name: "published_sheet", into: PICNIC, fields: ["person", "shift"], where: { status: "confirmed" } }

const spaces = mkdtempSync(join(tmpdir(), "spell-projections-"))
const peopleStorage = new DiskStorage(spaces)
let folders: SpaceFolders
let port: number
let server: ReturnType<typeof createServer>

beforeAll(async () => {
  for (const id of ["ana", "bo"]) {
    mkdirSync(join(spaces, "@spell", `${id}@`), { recursive: true })
    writeFileSync(join(spaces, "@spell", `${id}@`, "__me.json5"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  // both spaces:  Ana their admin, Bo a member of the private one
  for (const [folder, members] of [
    [["@rs", "picnic-private"], { ana: "admin", bo: "member" }],
    [["@rs", "picnic"], { ana: "admin" }]
  ] as const) {
    const root = join(spaces, ...folder)
    mkdirSync(join(root, "__members"), { recursive: true })
    for (const [id, role] of Object.entries(members)) {
      const membership = { $type: "Membership", person: { $ref: `Person#${id}@spell` }, role }
      writeFileSync(join(root, "__members", `${id}@spell.json5`), JSON.stringify(membership))
    }
  }

  folders = new SpaceFolders({
    folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
    people: new PeopleStore(peopleStorage),
    personFor: (request) => request.get("x-person") ?? "ana@spell",
    queueFile: join(spaces, "queue", "space-writes.json")
  })
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  folders.route({ router, guard })
  server = createServer(SRV.toListener(router.handle))
  port = await SRV.listenPreferred(server)
  guard.allowPort(port)
})

afterAll(async () => {
  folders.close()
  peopleStorage.close()
  await new Promise<void>((done) => {
    server.closeAllConnections()
    server.close(() => done())
  })
  rmSync(spaces, { recursive: true, force: true })
})

/** A browser's place on `address`, asking as `person`. */
function placeAs(address: string, person: string): RemotePlace {
  const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${address}`, token: TOKEN })
  // who's asking, as sign-in will say:  a header, on every request it sends
  const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown }).answerTo
  ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
    return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
  }
  return remote
}

/** A sign-up as the published sheet's file holds it:  `undefined` when there's none. */
function published(id: string): Record<string, unknown> | undefined {
  const file = join(spaces, "@rs", "picnic", "signups", `${id}.json`)
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : undefined
}

/** Everything the private space's projections have queued is in. */
async function settled(): Promise<void> {
  expect(await folders.projectionsAt(PRIVATE)!.settled).toBe(true)
}

describe("A projection (epic `atmosphere` P17)", () => {
  test("a manager of both spaces sets it;  a member of one is refused, for their role", async () => {
    const refusal = await placeAs(PRIVATE, "bo@spell")
      .call(SPACE_PROJECTION_OPERATIONS.set, SHEET, {})
      .catch((error: unknown) => error)
    expect(refusal).toMatchObject({ cause: { kind: "refused", whyNot: "role" } })

    await placeAs(PRIVATE, "ana@spell").call(SPACE_PROJECTION_OPERATIONS.set, SHEET, {})
    const kept = await placeAs(PRIVATE, "bo@spell").call(SPACE_PROJECTION_OPERATIONS.projections, {}, {})
    expect(kept).toEqual({ published_sheet: { into: PICNIC, fields: ["person", "shift"], where: SHEET.where } })
  })

  test("a change to the private sheet rewrites the public one:  a named field shows, an unnamed one doesn't", async () => {
    await placeAs(PRIVATE, "bo@spell").apply(
      [
        {
          kind: "insert",
          collection: "signups",
          id: "s-1",
          fields: { person: "Bo", shift: "noon", status: "confirmed", note: "get someone more reliable as well" }
        },
        { kind: "insert", collection: "signups", id: "s-2", fields: { person: "Cy", shift: "1pm", status: "maybe" } }
      ],
      {}
    )
    await settled()
    expect(published("s-1")).toMatchObject({ person: "Bo", shift: "noon" })
    expect(published("s-1")).not.toHaveProperty("note")
    expect(published("s-1")).not.toHaveProperty("status")
    // not confirmed:  not shown
    expect(published("s-2")).toBeUndefined()
  })

  test("a thing that leaves the view leaves the public sheet;  one that joins it, joins", async () => {
    const asAna = placeAs(PRIVATE, "ana@spell")
    await asAna.apply([{ kind: "update", collection: "signups", id: "s-1", fields: { status: "cancelled" } }], {})
    await asAna.apply([{ kind: "update", collection: "signups", id: "s-2", fields: { status: "confirmed" } }], {})
    await settled()
    expect(published("s-1")).toBeUndefined()
    expect(published("s-2")).toMatchObject({ person: "Cy", shift: "1pm" })
  })

  test("rebuilt from nothing, it's the same:  nothing is lost", async () => {
    rmSync(join(spaces, "@rs", "picnic", "signups"), { recursive: true, force: true })
    rmSync(join(spaces, "@rs", "picnic", "signups.list.json"), { force: true })
    const done = await placeAs(PRIVATE, "ana@spell").call(SPACE_PROJECTION_OPERATIONS.rebuild, { name: SHEET.name }, {})
    expect(done).toEqual({ inserted: 1, updated: 0, removed: 0 })
    expect(published("s-2")).toMatchObject({ person: "Cy", shift: "1pm" })
    expect(published("s-1")).toBeUndefined()
  })

  test("set again as it was, it changes nothing;  set with a field less, that field goes", async () => {
    const asAna = placeAs(PRIVATE, "ana@spell")
    expect(await asAna.call(SPACE_PROJECTION_OPERATIONS.set, SHEET, {})).toEqual({ unchanged: true })
    await asAna.call(SPACE_PROJECTION_OPERATIONS.set, { ...SHEET, fields: ["person"] }, {})
    expect(published("s-2")).toMatchObject({ person: "Cy" })
    expect(published("s-2")).not.toHaveProperty("shift")
  })
})
