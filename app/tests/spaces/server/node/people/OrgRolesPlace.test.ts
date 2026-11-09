/**
 * An org's roles as a place (epic `atmosphere` P25):  what its Admin page reads and writes, at `@rs/__admin/roles`.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team;  Dee and Eve are in RS and manage nothing;
 *   Zed isn't in RS.
 * - Through the app's `SpaceFolders`, which opens it at that address, as the page server's route does.
 */
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PlaceError, spaceReadAddressFor, type Place } from "spell/places"
import { SP } from "spell/parser/spell"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The Admin page's place, as a program names it. */
const ADDRESS = "@rs/__admin/roles"

const root = mkdtempSync(join(tmpdir(), "spell-org-roles-place-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const folders = new SpaceFolders({
  folderFor: (address) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
  people
})

/** The place, as `who` (`ana`) asks for it. */
async function placeFor(who: string): Promise<Place> {
  return (await folders.placeFor(ADDRESS, `${who}@rs`))!
}

/** The rows of `collection`, as `who` reads them. */
async function rowsOf(collection: string, who = "ana") {
  return (await (await placeFor(who)).list(collection, {}, { identity: `${who}@rs` })).rows
}

/** Make `changes` as `who`. */
async function apply(who: string, ...changes: Parameters<NonNullable<Place["apply"]>>[0]) {
  return (await placeFor(who)).apply!(changes, { identity: `${who}@rs` })
}

beforeAll(async () => {
  for (const id of ["ana", "ada", "bo", "dee", "eve", "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = ["ana", "ada", "bo", "dee"].map((id) => ({
    $type: "Membership",
    person: { $ref: `Person#${id}@rs` },
    role: "editor"
  }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  const roles = folders.orgRoles
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ana@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ana@rs" })
})

afterAll(() => {
  folders.close()
  rmSync(root, { recursive: true, force: true })
})

describe("an org's roles as a place", () => {
  test("it's the org's roles, read through Spell's server alone, never direct", async () => {
    expect((await placeFor("ana")).describe().kind).toBe("org's roles")
    expect(spaceReadAddressFor(`/api/places/spaces/${ADDRESS}`)).toBeUndefined()
    expect(spaceReadAddressFor("/api/places/spaces/@rs/__admin/notes")).toBeDefined()
  })

  test("anyone in the org reads it;  someone outside reads none of it", async () => {
    expect((await rowsOf("teams", "dee")).map((row) => row.id)).toEqual(["events_team"])
    expect((await rowsOf("members")).map((row) => row.id)).toEqual(["ana@rs", "ada@rs", "bo@rs", "dee@rs"])
    expect(await rowsOf("teams", "zed")).toEqual([])
  })

  test("an Admin adds someone, makes a team, names its Manager until a day, and sees it in the log", async () => {
    await apply("ada", { kind: "insert", collection: "members", id: "eve@rs", fields: { person: "eve@rs" } })
    expect((await rowsOf("members")).map((row) => row.id)).toContain("eve@rs")

    await apply("ada", { kind: "insert", collection: "teams", fields: { name: "Finance Team" } })
    await apply("ada", {
      kind: "insert",
      collection: "terms",
      fields: { role: "team-manager", holder: "eve@rs", manages: "finance_team", ends: "2027-06-30" }
    })
    const term = (await rowsOf("terms")).find((row) => row.holder === "eve@rs")
    expect(term).toMatchObject({ role: "team-manager", manages: "finance_team", ends: "2027-06-30" })

    const log = await rowsOf("role_changes")
    expect(log.slice(-3).map((row) => [row.did, row.who])).toEqual([
      ["join", "ada"],
      ["team", "ada"],
      ["give", "ada"]
    ])
  })

  test("a Team Manager makes a project under their team, and names its Manager", async () => {
    await apply("bo", { kind: "insert", collection: "projects", fields: { name: "2026 Q4", team: "events_team" } })
    await apply("bo", {
      kind: "insert",
      collection: "terms",
      fields: { role: "project-manager", holder: "dee@rs", manages: "2026_q4" }
    })
    expect((await rowsOf("projects")).find((row) => row.id === "2026_q4")).toMatchObject({ team: "events_team" })
    expect((await rowsOf("terms")).some((row) => row.holder === "dee@rs")).toBe(true)
  })

  test("the rules hold:  a Project Manager can't end a Team Manager's term, nor add people", async () => {
    const bos = (await rowsOf("terms")).find((row) => row.holder === "bo@rs")!
    const refused = apply("dee", { kind: "delete", collection: "terms", id: bos.id as string })
    await expect(refused).rejects.toBeInstanceOf(PlaceError)
    await expect(refused).rejects.toMatchObject({ cause: { kind: "refused", whyNot: "role", needs: "manager" } })
    await expect(
      apply("dee", { kind: "insert", collection: "members", id: "zed@rs", fields: { person: "zed@rs" } })
    ).rejects.toMatchObject({ cause: { kind: "refused", whyNot: "role" } })
  })

  test("ending a term keeps its record:  it leaves the list, and the log says so", async () => {
    const deeS = (await rowsOf("terms")).find((row) => row.holder === "dee@rs")!
    await apply("bo", { kind: "delete", collection: "terms", id: deeS.id as string })
    expect((await rowsOf("terms")).some((row) => row.holder === "dee@rs")).toBe(false)
    expect((await rowsOf("role_changes")).at(-1)).toMatchObject({
      did: "end",
      who: "bo",
      what: "dee Project Manager of 2026 Q4"
    })
  })

  test("Admins approve an app at a version, and take it off", async () => {
    await apply("ada", {
      kind: "insert",
      collection: "approved_apps",
      id: "@spell/sign-up",
      fields: { version: "1.0.0" }
    })
    expect(await rowsOf("approved_apps")).toEqual([{ id: "@spell/sign-up", name: "@spell/sign-up", version: "1.0.0" }])
    await apply("ada", { kind: "delete", collection: "approved_apps", id: "@spell/sign-up" })
    expect(await rowsOf("approved_apps")).toEqual([])
  })

  test("what isn't a change of the roles is refused, saying so", async () => {
    await expect(apply("ana", { kind: "insert", collection: "role_changes", fields: {} })).rejects.toMatchObject({
      cause: { kind: "refused", whyNot: "place" }
    })
    await expect(rowsOf("budgets")).rejects.toMatchObject({ cause: { kind: "not found" } })
  })
})

describe("an org's event stages, from its Admin page (epic `atmosphere` T50, J153)", () => {
  const keys = async () => (await rowsOf("event_stages")).map((each) => each.id)

  test("an Admin adds one before the last, the one before it moving to it", async () => {
    await apply("ada", { kind: "insert", collection: "event_stages", id: "r1", fields: { name: "Rehearsal" } })
    expect(await keys()).toEqual(["proposed", "approved", "planning", "open", "analysis", "rehearsal", "quiet"])
    const rows = await rowsOf("event_stages")
    expect(rows.find((each) => each.id === "analysis")?.movesTo).toBe("rehearsal")
    expect(rows.find((each) => each.id === "rehearsal")).toMatchObject({ movesTo: "quiet", movedBy: "its organizers" })
  })

  test("adding one by a name it has changes that one", async () => {
    await apply("ana", {
      kind: "insert",
      collection: "event_stages",
      id: "r2",
      fields: { name: "Rehearsal", movedBy: "the team" }
    })
    expect((await rowsOf("event_stages")).filter((each) => each.id === "rehearsal")).toMatchObject([
      { movedBy: "the team" }
    ])
  })

  test("a stage another moves to can't be removed;  once nothing does, it can", async () => {
    await expect(apply("ada", { kind: "delete", collection: "event_stages", id: "rehearsal" })).rejects.toThrow(
      /Analysis moves to it/
    )
    await apply("ada", { kind: "update", collection: "event_stages", id: "analysis", fields: { movesTo: "quiet" } })
    await apply("ada", { kind: "delete", collection: "event_stages", id: "rehearsal" })
    expect(await keys()).toEqual(["proposed", "approved", "planning", "open", "analysis", "quiet"])
  })

  test("only the Board and the Admins change them", async () => {
    await expect(
      apply("bo", { kind: "insert", collection: "event_stages", id: "x", fields: { name: "Party" } })
    ).rejects.toThrow(PlaceError)
    expect(await keys()).not.toContain("party")
  })
})
