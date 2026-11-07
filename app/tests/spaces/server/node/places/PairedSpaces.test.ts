/**
 * Paired spaces (epic `atmosphere` P22):  the org, its Admins, each team and each project has a shared space everyone in
 * the org reads, and a private one only its Managers reach, each list worked out from the org's roles.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team, Fay the Finance Team, Cy the project 2026-q4
 *   under the Events Team;  Dee is in RS and manages nothing, Vic is in RS as a viewer, Zed isn't in RS.
 * - Its members (`SpaceMembers`), then the same over HTTP, through the page server's route (`SpaceFolders`), which the
 *   cloud serves too.
 */
import { mkdtempSync, rmSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { RemotePlace } from "spell/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "paired-spaces-token"

/** RS's people, each with a file, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = {
  ana: "editor",
  ada: "editor",
  bo: "editor",
  fay: "editor",
  cy: "editor",
  dee: "manager",
  vic: "viewer"
}

/** RS's ten spaces' addresses, each with a folder in it, as a program names one. */
const SPACES = {
  orgShared: "@rs/minutes",
  orgPrivate: "@rs/__private/budget",
  adminShared: "admins@rs/requests",
  adminPrivate: "@rs/__admin/notes",
  eventsShared: "events_team@rs/welcome",
  eventsPrivate: "events_team@rs/__private/notes",
  financeShared: "finance_team@rs/reports",
  financePrivate: "finance_team@rs/__private/budget-notes",
  projectShared: "events_team@rs/2026-q4/welcome",
  projectPrivate: "events_team@rs/2026-q4/__private/notes"
}

const root = mkdtempSync(join(tmpdir(), "spell-paired-spaces-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const roles = new OrgRoles({ people })

/** RS's members of the folder at `address`. */
const membersAt = (address: string) => new SpaceMembers({ address, storage, people, orgRoles: roles })

/** Who reads the folder at `address`, of all of RS and Zed. */
async function readersOf(address: string): Promise<string[]> {
  const members = membersAt(address)
  const readers: string[] = []
  for (const id of [...Object.keys(RS), "zed"]) if ((await members.memberOf(`${id}@rs`))?.canRead) readers.push(id)
  return readers
}

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
  await roles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ada@rs" })
  await roles.addTeam("rs", { id: "finance_team", name: "Finance Team" }, { by: "ada@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
  await roles.give("rs", { role: "team-manager", person: "fay@rs", of: "finance_team" }, { by: "ada@rs" })
  await roles.addProject("rs", { id: "2026-q4", name: "Fall 2026", team: "events_team" }, { by: "bo@rs" })
  await roles.give("rs", { role: "project-manager", person: "cy@rs", of: "2026-q4" }, { by: "bo@rs" })
})

afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("paired spaces", () => {
  test("each address is in one of RS's ten spaces, by the org's roster", async () => {
    const said = async (address: string) => {
      const space = await roles.spaceAt(address)
      return space && `${space.address} ${space.side}`
    }
    expect(await said(SPACES.orgShared)).toBe("@rs shared")
    expect(await said(SPACES.orgPrivate)).toBe("@rs/__private private")
    expect(await said(SPACES.adminShared)).toBe("admins@rs shared")
    expect(await said(SPACES.adminPrivate)).toBe("@rs/__admin private")
    expect(await said(SPACES.eventsShared)).toBe("events_team@rs shared")
    expect(await said(SPACES.eventsPrivate)).toBe("events_team@rs/__private private")
    expect(await said(SPACES.financePrivate)).toBe("finance_team@rs/__private private")
    expect(await said(SPACES.projectShared)).toBe("events_team@rs/2026-q4 shared")
    expect(await said(SPACES.projectPrivate)).toBe("events_team@rs/2026-q4/__private private")
    // a person's own space, and an org with no Admin space, are in none
    expect(await said("dee@rs/recipes")).toBeUndefined()
    expect(await said("@family/cookbook")).toBeUndefined()
  })

  test("everyone in RS reads every shared space, and no private one;  Zed reads none", async () => {
    const everyone = ["ana", "ada", "bo", "fay", "cy", "dee", "vic"]
    for (const address of [SPACES.orgShared, SPACES.adminShared, SPACES.eventsShared, SPACES.projectShared]) {
      expect(await readersOf(address)).toEqual(everyone)
    }
    for (const address of [SPACES.orgPrivate, SPACES.eventsPrivate, SPACES.financePrivate, SPACES.projectPrivate]) {
      for (const id of ["dee", "vic", "zed"]) expect(await readersOf(address)).not.toContain(id)
    }
  })

  test("a Team Manager reads their team's private space and its projects', and no other team's", async () => {
    expect(await readersOf(SPACES.eventsPrivate)).toContain("bo")
    expect(await readersOf(SPACES.projectPrivate)).toContain("bo")
    expect(await readersOf(SPACES.financePrivate)).not.toContain("bo")
    // and a project's Manager reads only their project's
    expect(await readersOf(SPACES.projectPrivate)).toContain("cy")
    expect(await readersOf(SPACES.eventsPrivate)).not.toContain("cy")
  })

  test("the Board reads every space;  the Admins every one but the org's private one", async () => {
    for (const address of Object.values(SPACES)) expect(await readersOf(address)).toContain("ana")
    expect(await readersOf(SPACES.orgPrivate)).toEqual(["ana"])
    expect(await readersOf(SPACES.adminPrivate)).toEqual(["ana", "ada"])
    expect(await readersOf(SPACES.financePrivate)).toEqual(["ana", "ada", "fay"])
  })

  test("a shared space's list:  its Managers as managers, everyone else by their role, at most an editor", async () => {
    const list = await membersAt(SPACES.eventsShared).list()
    expect(list.map(({ person, role }) => `${person} ${role}`)).toEqual([
      "ana@rs manager",
      "ada@rs manager",
      "bo@rs manager",
      "fay@rs editor",
      "cy@rs editor",
      // RS's org file says Dee is a manager:  in a paired space only the roles make one
      "dee@rs editor",
      "vic@rs viewer"
    ])
    expect(await membersAt(SPACES.eventsShared).keeps("dee@rs")).toBe(false)
    expect(await membersAt(SPACES.eventsShared).keeps("bo@rs")).toBe(true)
  })

  test("a change to the roles reaches the lists at once:  Dee named a Team Manager, then her term ended", async () => {
    await roles.give("rs", { role: "team-manager", person: "dee@rs", of: "finance_team" }, { by: "ada@rs" })
    expect(await readersOf(SPACES.financePrivate)).toContain("dee")
    await roles.end("rs", { role: "team-manager", person: "dee@rs", of: "finance_team" }, { by: "ada@rs" })
    expect(await readersOf(SPACES.financePrivate)).not.toContain("dee")
  })

  test("a list worked out from the roles isn't typed:  only the org's shared space takes a member, as joining RS", async () => {
    await expect(membersAt(SPACES.eventsPrivate).add("dee@rs", "editor")).rejects.toThrow(
      /change them in its Admin space/
    )
    await expect(membersAt(SPACES.eventsShared).remove("vic@rs")).rejects.toThrow(/change them in its Admin space/)
    await expect(membersAt(SPACES.orgShared).add("dee@rs", "manager")).rejects.toThrow(/Board and Admins/)
    await expect(membersAt(SPACES.orgShared).remove("ana@rs")).rejects.toThrow(/Board and Admins/)

    await membersAt(SPACES.orgShared).add("zed@rs", "viewer")
    expect(await readersOf(SPACES.eventsShared)).toContain("zed")
    expect(await readersOf(SPACES.eventsPrivate)).not.toContain("zed")
    await membersAt(SPACES.orgShared).remove("zed@rs")
    expect(await readersOf(SPACES.eventsShared)).not.toContain("zed")
  })
})

describe("paired spaces, over the page server's route", () => {
  let folders: SpaceFolders
  let server: ReturnType<typeof createServer>
  let port: number

  beforeAll(async () => {
    folders = new SpaceFolders({
      folderFor: (address) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
      people,
      personFor: (request) => request.get("x-person") ?? "nobody@rs"
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
    await new Promise<void>((done) => {
      server.closeAllConnections()
      server.close(() => done())
    })
  })

  /** A browser's place on the folder at `address`, asking as `person`. */
  function placeAt(address: string, person: string): RemotePlace {
    const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${address}`, token: TOKEN })
    const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown })
      .answerTo
    ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
      return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
    }
    return remote
  }

  /** `person` writes a note into the folder at `address`. */
  const write = (address: string, person: string, id: string) =>
    placeAt(address, person).apply(
      [{ changeId: `c-${id}`, kind: "insert", collection: "notes", id, fields: { id } }],
      {}
    )

  test("a space appears the first time it's written:  nobody makes its folder by hand", async () => {
    await write(SPACES.financePrivate, "fay@rs", "n-1")
    expect((await placeAt(SPACES.financePrivate, "ana@rs").list("notes", {}, {})).rows.map(({ id }) => id)).toEqual([
      "n-1"
    ])
  })

  test("someone in RS reads a shared space and not a private one;  someone outside reads neither", async () => {
    await write(SPACES.eventsShared, "bo@rs", "w-1")
    expect((await placeAt(SPACES.eventsShared, "vic@rs").list("notes", {}, {})).rows).toHaveLength(1)
    await expect(placeAt(SPACES.financePrivate, "dee@rs").list("notes", {}, {})).rejects.toThrow(/aren't a member/)
    await expect(placeAt(SPACES.eventsShared, "zed@rs").list("notes", {}, {})).rejects.toThrow(/aren't a member/)
  })
})
