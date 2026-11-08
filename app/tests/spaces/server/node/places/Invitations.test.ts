/**
 * Invitations (epic `atmosphere` P31):  RS's picnic's tickets, in the same master sheet as its shifts.
 * - Each attendee asks for as many as their row says (`invitations`);  the picnic has 3 in all, so two asking for the
 *   last one at once:  one gets it, the other is told it's gone.
 * - Each change sends its person their count, an update in their inbox.
 * - Only Cy, the picnic's Manager, confirms one:  its guest then reads the attendees' space, a third space.
 * - A small RS:  Ana is the Board, Cy manages the picnic;  Bo (2 invitations), Dee and Eve (1 each) are its attendees,
 *   Vic is in RS and isn't one.
 * - Over the page server's route (`SpaceFolders`), as a page asks.
 */
import { mkdtempSync, rmSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { RemotePlace, SPACE_SHEET_OPERATIONS, type PlaceError } from "spell/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "invitations-token"

/** The master sheet, in the picnic's private space;  the published one, and where sign-ups come from, its shared. */
const MASTER = "picnic@rs/__private/signups"
const PUBLISHED = "picnic@rs/sheet"

/** The picnic's attendees' space:  whoever's ticket is confirmed reads it. */
const ATTENDEES = "picnic@rs/__attendees"

/** RS's people, each with a file, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = {
  ana: "editor",
  cy: "editor",
  bo: "viewer",
  dee: "viewer",
  eve: "viewer",
  vic: "viewer"
}

/** Each attendee's invitations, as the organizers' page worked them out from their standing and shifts. */
const INVITATIONS: Record<string, number> = { "bo@rs": 2, "dee@rs": 1, "eve@rs": 1 }

const root = mkdtempSync(join(tmpdir(), "spell-invitations-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const roles = new OrgRoles({ people })

let folders: SpaceFolders
let server: ReturnType<typeof createServer>
let port: number

beforeAll(async () => {
  for (const id of [...Object.keys(RS), "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = Object.entries(RS).map(([id, role]) => ({
    $type: "Membership",
    person: { $ref: `Person#${id}@rs` },
    role
  }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.addProject("rs", { id: "picnic", name: "The Picnic" }, { by: "ana@rs" })
  await roles.give("rs", { role: "project-manager", person: "cy@rs", of: "picnic" }, { by: "ana@rs" })

  folders = new SpaceFolders({
    folderFor: (address) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
    people,
    personFor: (request) => request.get("x-person") ?? "nobody@rs",
    queueFile: join(root, "queue.json")
  })
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  folders.route({ router, guard })
  server = createServer(SRV.toListener(router.handle))
  port = await SRV.listenPreferred(server)
  guard.allowPort(port)

  // Cy, the picnic's Manager, opens the organizers' page:  it makes the master a sign-up sheet, and publishes it
  await placeAt(MASTER, "cy@rs").call!(
    SPACE_SHEET_OPERATIONS.set,
    {
      signUpsFrom: PUBLISHED,
      onlyFrom: "attendees",
      mostEach: [
        { field: "shift", most: 2 },
        { field: "event", most: 3 }
      ],
      allowance: { collection: "tickets", field: "invitations" },
      joins: { collection: "tickets", address: ATTENDEES }
    },
    {}
  )
  await placeAt(MASTER, "cy@rs").apply(
    Object.entries(INVITATIONS).map(([person, invitations], at) => ({
      changeId: `a-${at}`,
      kind: "insert" as const,
      collection: "attendees",
      id: `a-${at}`,
      fields: { person, invitations }
    })),
    {}
  )
})

afterAll(async () => {
  folders.close()
  await new Promise<void>((done) => {
    server.closeAllConnections()
    server.close(() => done())
  })
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

/** A browser's place on the folder at `address`, asking as `person`. */
function placeAt(address: string, person: string): RemotePlace {
  const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${address}`, token: TOKEN })
  const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown }).answerTo
  ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
    return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
  }
  return remote
}

/** `person` asks for a ticket, as row `id`, for `guest`. */
const ask = (person: string, id: string, guest = "") =>
  placeAt(MASTER, person).apply(
    [
      { changeId: `t-${id}`, kind: "insert", collection: "tickets", id, fields: { id, person, guest, event: "picnic" } }
    ],
    {}
  )

/** Why a write was refused:  its `whyNot`. */
async function whyNot(write: Promise<unknown>): Promise<unknown> {
  const error = (await write.then(
    () => undefined,
    (refused: unknown) => refused
  )) as PlaceError | undefined
  return (error?.cause as { whyNot?: string } | undefined)?.whyNot ?? error?.message
}

/** What `person`'s inbox says of their invitations:  Spell's update, written over as their count changes. */
async function countIn(person: string): Promise<string | undefined> {
  const { rows } = await placeAt(`${person}/__inbox`, person).list("messages", {}, {})
  return rows.find((row) => row.thread === "invitations")?.text as string | undefined
}

describe("invitations", () => {
  test("Bo asks for his 2;  a third is refused, used up;  his inbox says how many he's used", async () => {
    await ask("bo@rs", "t-bo-1", "ann@example.com")
    await ask("bo@rs", "t-bo-2")
    expect(await whyNot(ask("bo@rs", "t-bo-3"))).toBe("used up")
    await vi.waitFor(async () => expect(await countIn("bo@rs")).toBe("You have used 2 of your 2 available invitations"))
  })

  test("someone the list doesn't name asks for none", async () => {
    expect(await whyNot(ask("vic@rs", "t-vic"))).toBe("not listed")
  })

  test("Dee and Eve ask for the picnic's last ticket at once:  one gets it, the other is told it's gone", async () => {
    const [dee, eve] = await Promise.allSettled([ask("dee@rs", "t-dee"), ask("eve@rs", "t-eve")])
    const outcomes = [dee, eve].map((each) => each.status)
    expect(outcomes.sort()).toEqual(["fulfilled", "rejected"])
    const refused = [dee, eve].find((each) => each.status === "rejected") as PromiseRejectedResult
    expect((refused.reason as PlaceError).cause).toMatchObject({ kind: "refused", whyNot: "full" })
  })

  test("Bo can't confirm his own ticket;  Cy confirms it, and its guest reads the attendees' space", async () => {
    const confirm = (person: string) =>
      placeAt(MASTER, person).apply(
        [
          {
            changeId: `c-${person}`,
            kind: "update",
            collection: "tickets",
            id: "t-bo-2",
            fields: { status: "confirmed" }
          }
        ],
        {}
      )
    expect(await whyNot(confirm("bo@rs"))).toBe("field")
    await placeAt(MASTER, "cy@rs").apply(
      [{ changeId: "g-bo-2", kind: "update", collection: "tickets", id: "t-bo-2", fields: { guest: "vic@rs" } }],
      {}
    )
    await confirm("cy@rs")
    await vi.waitFor(async () => expect(await placeAt(ATTENDEES, "vic@rs").list("notes", {}, {})).toBeTruthy())
    expect(await whyNot(placeAt(ATTENDEES, "dee@rs").list("notes", {}, {}))).toBeDefined()
    // the Manager reads it too, and the count stays Bo's:  a manager's change counts for the row's person
    expect(await placeAt(ATTENDEES, "cy@rs").list("notes", {}, {})).toBeTruthy()
    expect(await countIn("bo@rs")).toBe("You have used 2 of your 2 available invitations")
  })

  test("Bo gives one back:  his count goes down, and he may ask again", async () => {
    await placeAt(MASTER, "bo@rs").apply(
      [{ changeId: "r-bo-1", kind: "delete", collection: "tickets", id: "t-bo-1" }],
      {}
    )
    await vi.waitFor(async () => expect(await countIn("bo@rs")).toBe("You have used 1 of your 2 available invitations"))
  })
})
