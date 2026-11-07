/**
 * Sign-up sheets (epic `atmosphere` P27, J101):  RS's picnic, its master sheet in the project's private space, signed up
 * for from its shared one, each shift two places, only its attendees, and a published sheet with no organizers' notes.
 * - A small RS:  Ana is the Board, Cy manages the picnic (a project under the org);  Bo and Dee are its attendees, Vic is
 *   in RS and isn't one, Zed isn't in RS.
 * - Over the page server's route (`SpaceFolders`), as a page asks.
 */
import { mkdtempSync, rmSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { RemotePlace, SPACE_PROJECTION_OPERATIONS, SPACE_SHEET_OPERATIONS, type PlaceError } from "spell/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "sign-up-sheet-token"

/** The master sheet, in the picnic's private space;  the published one, and where sign-ups come from, its shared. */
const MASTER = "picnic@rs/__private/signups"
const PUBLISHED = "picnic@rs/sheet"

/** RS's people, each with a file, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = { ana: "editor", cy: "editor", bo: "viewer", dee: "viewer", vic: "viewer" }

const root = mkdtempSync(join(tmpdir(), "spell-sign-up-sheet-"))
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
    { signUpsFrom: PUBLISHED, onlyFrom: "attendees", mostEach: { field: "shift", most: 2 } },
    {}
  )
  await placeAt(MASTER, "cy@rs").call!(
    SPACE_PROJECTION_OPERATIONS.set,
    { name: "published_sheet", into: PUBLISHED, fields: ["person", "shift"] },
    {}
  )
  await placeAt(MASTER, "cy@rs").apply(
    ["bo@rs", "dee@rs"].map((person, at) => ({
      changeId: `a-${at}`,
      kind: "insert" as const,
      collection: "attendees",
      id: `a-${at}`,
      fields: { person }
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

/** `person` signs up for `shift`, as row `id`, with an organizer's `note` if one's given. */
const signUp = (person: string, id: string, shift: string, note?: string) =>
  placeAt(MASTER, person).apply(
    [
      {
        changeId: `s-${id}`,
        kind: "insert",
        collection: "sign_ups",
        id,
        fields: { id, person, shift, ...(note && { note }) }
      }
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

/** The master's rows, as its Manager reads them. */
const masterRows = async () => (await placeAt(MASTER, "cy@rs").list("sign_ups", {}, {})).rows

describe("a sign-up sheet", () => {
  test("an attendee signs up from the shared space, though they can't read the master", async () => {
    await signUp("bo@rs", "s-bo", "setup")
    expect((await masterRows()).map(({ person, shift, by }) => `${person} ${shift} ${by}`)).toEqual([
      "bo@rs setup bo@rs"
    ])
    await expect(placeAt(MASTER, "bo@rs").list("sign_ups", {}, {})).rejects.toThrow(/aren't a member/)
  })

  test("only its attendees add rows (J101):  Vic is refused, and Zed, outside RS, too", async () => {
    expect(await whyNot(signUp("vic@rs", "s-vic", "setup"))).toBe("not listed")
    expect(await whyNot(signUp("zed@rs", "s-zed", "setup"))).toBe("role")
    expect((await masterRows()).map(({ person }) => person)).toEqual(["bo@rs"])
  })

  test("a sign-up is your own:  Bo can't sign Dee up", async () => {
    expect(
      await whyNot(
        placeAt(MASTER, "bo@rs").apply(
          [
            {
              changeId: "s-x",
              kind: "insert",
              collection: "sign_ups",
              id: "s-x",
              fields: { person: "dee@rs", shift: "setup" }
            }
          ],
          {}
        )
      )
    ).toBe("owner")
  })

  test("two asking for the last place at once:  one gets it, the other is told it's gone", async () => {
    // the cleanup shift has one place left
    await placeAt(MASTER, "cy@rs").apply(
      [
        {
          changeId: "s-cy",
          kind: "insert",
          collection: "sign_ups",
          id: "s-cy",
          fields: { person: "cy@rs", shift: "cleanup" }
        }
      ],
      {}
    )
    const asked = await Promise.allSettled([signUp("bo@rs", "s-bo-2", "cleanup"), signUp("dee@rs", "s-dee", "cleanup")])
    expect(asked.map(({ status }) => status).sort()).toEqual(["fulfilled", "rejected"])
    const refused = asked.find(({ status }) => status === "rejected") as PromiseRejectedResult
    expect((refused.reason as PlaceError).cause).toMatchObject({ whyNot: "full" })
    expect((await masterRows()).filter(({ shift }) => shift === "cleanup")).toHaveLength(2)
  })

  test("Bo changes or removes only his own row;  the picnic's Manager changes anyone's", async () => {
    const dee = (await masterRows()).find(({ person }) => person === "dee@rs")
    const deeRow = dee ?? (await signUp("dee@rs", "s-dee-2", "setup"), { id: "s-dee-2" })
    expect(
      await whyNot(
        placeAt(MASTER, "bo@rs").apply(
          [{ changeId: "x-1", kind: "delete", collection: "sign_ups", id: `${deeRow.id}` }],
          {}
        )
      )
    ).toBe("owner")
    await placeAt(MASTER, "bo@rs").apply(
      [{ changeId: "x-2", kind: "update", collection: "sign_ups", id: "s-bo", fields: { shift: "setup" } }],
      {}
    )
    await placeAt(MASTER, "cy@rs").apply(
      [
        {
          changeId: "x-3",
          kind: "update",
          collection: "sign_ups",
          id: `${deeRow.id}`,
          fields: { note: "get someone more reliable on this shift as well" }
        }
      ],
      {}
    )
  })

  test("the published sheet shows each row's person and shift, and never an organizer's note", async () => {
    await vi.waitFor(async () => {
      const shown = (await placeAt(PUBLISHED, "vic@rs").list("sign_ups", {}, {})).rows
      expect(shown.length).toBe((await masterRows()).length)
      for (const row of shown) expect(row.note).toBeUndefined()
      expect(shown.map(({ person }) => person)).toContain("bo@rs")
    })
  })
})
