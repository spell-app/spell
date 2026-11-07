/**
 * The design right (`canDesign`, epic `atmosphere` T47, J117):  a space role decides a space's DATA, the design right
 * its PROGRAM, person by person.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team;  Vic and Cy are in RS, a viewer and an
 *   editor;  Zed isn't in RS.
 * - The project:  the Events Team's welcome page, `events_team@rs/welcome`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { OrgRolesPlace } from "spell/app/spaces/server/node/people/OrgRolesPlace"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { ProjectDrafts } from "spell/app/spaces/server/node/projects/ProjectDrafts"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** RS's people, and their role in its org file. */
const RS: Record<string, string> = { ana: "editor", ada: "editor", bo: "editor", vic: "viewer", cy: "editor" }

/** The Events Team's welcome page. */
const PROJECT = "events_team@rs/welcome"

const root = mkdtempSync(join(tmpdir(), "spell-design-right-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const orgRoles = new OrgRoles({ people })

/** Where an address's folder is, under the test's root. */
const folderFor = (address: string) => join(root, "folders", ...address.split("/"))
/** The project's own folder:  its public files. */
const projectFolder = folderFor(PROJECT)

/** `who`'s drafts of the welcome page. */
const draftsOf = (who: string) => ProjectDrafts.for(PROJECT, who, { folderFor, projectFolder, people, orgRoles })

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
  await orgRoles.setUp("rs", { board: "ana@rs" })
  await orgRoles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
  await orgRoles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ada@rs" })
  await orgRoles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })

  mkdirSync(projectFolder, { recursive: true })
  writeFileSync(join(projectFolder, "Welcome.spell"), "Welcome to the picnic\n")
})

afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("The design right", () => {
  test("a space's Managers design it by their role;  a viewer or an editor doesn't, until the org says", async () => {
    expect(await (await draftsOf("bo@rs")).mayDesign()).toBe(true)
    expect(await (await draftsOf("vic@rs")).mayDesign()).toBe(false)
    const cy = await draftsOf("cy@rs")
    expect(await cy.mayDesign()).toBe(false)
    await expect(cy.save("/Welcome.spell", "hi\n")).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/change its pages .* it takes a manager, or someone its org lets design it/)
    })
  })

  test("Bo lets Vic design the team's space:  Vic, still a viewer, drafts its pages, but doesn't publish", async () => {
    await orgRoles.giveDesign("rs", { person: "vic@rs", space: "events_team@rs" }, { by: "bo@rs" })
    expect(await orgRoles.designers("rs")).toEqual([{ person: "vic@rs", space: "events_team@rs" }])
    expect((await orgRoles.log("rs")).at(-1)).toMatchObject({
      action: "give design",
      by: "bo@rs",
      person: "vic@rs",
      space: "events_team@rs"
    })

    const vic = await draftsOf("vic@rs")
    expect(await vic.mayDesign()).toBe(true)
    expect(await vic.mayPublish()).toBe(false)
    await vic.save("/Welcome.spell", "Welcome to the picnic, by the lake\n")
    expect(await vic.read("/Welcome.spell")).toBe("Welcome to the picnic, by the lake\n")
    await expect(vic.publish()).rejects.toMatchObject({ status: 403 })

    // still a viewer of the space's data
    const members = new SpaceMembers({ address: `${PROJECT}`, storage, people, orgRoles })
    expect((await members.memberOf("vic@rs"))?.role).toBe("viewer")
  })

  test("Bo, a Manager, sees whose drafts there are, and publishes Vic's for him", async () => {
    const bo = await draftsOf("bo@rs")
    expect(await bo.drafters()).toEqual(["vic@rs"])
    const { published } = await bo.publish({ of: "vic@rs" })
    expect(published).toEqual(["/Welcome.spell"])
    expect(readFileSync(join(projectFolder, "Welcome.spell"), "utf8")).toBe("Welcome to the picnic, by the lake\n")
    expect(await (await draftsOf("vic@rs")).read("/Welcome.spell")).toBeUndefined()
  })

  test("only the space's Managers say who designs it;  never someone outside the org, nor a space it hasn't", async () => {
    await expect(
      orgRoles.giveDesign("rs", { person: "cy@rs", space: "events_team@rs" }, { by: "vic@rs" })
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      orgRoles.giveDesign("rs", { person: "zed@rs", space: "events_team@rs" }, { by: "bo@rs" })
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/isn't in @rs/) })
    await expect(
      orgRoles.giveDesign("rs", { person: "cy@rs", space: "nowhere@rs" }, { by: "ada@rs" })
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/no space of @rs's/) })
    // the org's shared space is the Board's and the Admins', not a Team Manager's
    await expect(orgRoles.giveDesign("rs", { person: "cy@rs", space: "@rs" }, { by: "bo@rs" })).rejects.toMatchObject({
      status: 403
    })
  })

  test("ended, Vic drafts no more;  on the Admin page, a designer is a row", async () => {
    const orgMembers = new SpaceMembers({ address: "@rs", storage, people, orgRoles })
    const place = new OrgRolesPlace({ org: "rs", orgRoles, people, orgMembers })
    const { rows } = await place.list("designers", {}, { identity: "ada@rs" })
    expect(rows).toEqual([{ id: "vic@rs~events_team@rs", person: "vic@rs", space: "events_team@rs" }])

    await place.apply([{ kind: "delete", collection: "designers", id: "vic@rs~events_team@rs" }], { identity: "bo@rs" })
    expect(await orgRoles.designers("rs")).toEqual([])
    expect(await (await draftsOf("vic@rs")).mayDesign()).toBe(false)
    expect((await orgRoles.log("rs")).at(-1)).toMatchObject({ action: "end design", by: "bo@rs", person: "vic@rs" })
  })
})
