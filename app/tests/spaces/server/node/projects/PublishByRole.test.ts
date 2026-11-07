/**
 * Publish By Role (`ProjectDrafts`, epic `atmosphere` P26):  an RS event project's drafts live in its space's private
 * one, only its Managers draft and publish, and the org's policy caps its versions.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo and Eve manage the Events Team;  Vic is in RS as a viewer.
 * - The project:  the Events Team's welcome page, `events_team@rs/welcome`, in the team's shared space;
 *   its drafts and versions go in `events_team@rs/__private/welcome`, which only the team's Managers reach.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { ProjectDrafts } from "spell/app/spaces/server/node/projects/ProjectDrafts"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** RS's people, and their role in its org file. */
const RS: Record<string, string> = { ana: "editor", ada: "editor", bo: "editor", eve: "editor", vic: "viewer" }

/** The Events Team's welcome page. */
const PROJECT = "events_team@rs/welcome"
/** Its space's private one, where its drafts and versions go. */
const PRIVATE = "events_team@rs/__private/welcome"

const root = mkdtempSync(join(tmpdir(), "spell-publish-by-role-"))
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
  for (const id of Object.keys(RS)) {
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
  await orgRoles.give("rs", { role: "team-manager", person: "eve@rs", of: "events_team" }, { by: "ada@rs" })

  mkdirSync(projectFolder, { recursive: true })
  writeFileSync(join(projectFolder, "Welcome.spell"), "Welcome to the picnic\n")
})

afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("Publish By Role", () => {
  test("a Manager's draft goes in the space's private one, which only its Managers read;  the public file stays", async () => {
    const bo = await draftsOf("bo@rs")
    await bo.save("/Welcome.spell", "Welcome to the picnic, on Saturday\n")

    const drafted = readdirSync(join(folderFor(PRIVATE), "__draft"))
    expect(drafted).toContainEqual(expect.stringMatching(/^Welcome\.bo@rs-\d{4}-\d{2}-\d{2}\.spell$/))
    expect(existsSync(join(projectFolder, "__draft"))).toBe(false)
    expect(await bo.read("/Welcome.spell")).toBe("Welcome to the picnic, on Saturday\n")

    // the private space:  the Board and the team's Managers read it, a viewer doesn't
    const members = new SpaceMembers({ address: PRIVATE, storage, people, orgRoles })
    for (const id of ["ana", "bo", "eve"]) expect((await members.memberOf(`${id}@rs`))?.canRead).toBe(true)
    expect((await members.memberOf("vic@rs"))?.canRead ?? false).toBe(false)
  })

  test("Vic, a viewer, can't draft or publish;  Publish isn't offered to him", async () => {
    const vic = await draftsOf("vic@rs")
    expect(await vic.mayPublish()).toBe(false)
    await expect(vic.save("/Welcome.spell", "hi")).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/it takes a manager/)
    })
    await expect(vic.publish()).rejects.toMatchObject({ status: 403 })
    expect(await (await draftsOf("bo@rs")).mayPublish()).toBe(true)
  })

  test("two Managers drafting one file each have their own;  publishing over a change since shows both", async () => {
    const eve = await draftsOf("eve@rs")
    await eve.save("/Welcome.spell", "Welcome, everyone\n")
    expect((await eve.drafts()).map((draft) => draft.mine)).toEqual(["Welcome, everyone\n"])
    expect((await (await draftsOf("bo@rs")).drafts()).map((draft) => draft.mine)).toEqual([
      "Welcome to the picnic, on Saturday\n"
    ])

    // Bo publishes first:  Eve's draft started from what's no longer published
    const published = await (await draftsOf("bo@rs")).publish()
    expect(published.published).toEqual(["/Welcome.spell"])
    const [clash] = await eve.drafts()
    expect(clash).toMatchObject({ clashes: true, theirs: "Welcome to the picnic, on Saturday\n" })
    await expect(eve.publish()).rejects.toMatchObject({ status: 409 })
  })

  test("Publish writes the shared file, keeps the version in the private space, and deletes the draft", async () => {
    const bo = await draftsOf("bo@rs")
    await bo.save("/Welcome.spell", "Welcome to the picnic, at noon\n")
    const { version } = await bo.publish()

    expect(readFileSync(join(projectFolder, "Welcome.spell"), "utf8")).toBe("Welcome to the picnic, at noon\n")
    expect(existsSync(join(folderFor(PRIVATE), "versions", version!))).toBe(true)
    expect(existsSync(join(projectFolder, "versions"))).toBe(false)
    expect(await bo.read("/Welcome.spell")).toBeUndefined()
  })

  test("the org's policy, in its Admin space, says how many versions are kept;  only the Board and Admins set it", async () => {
    await expect(orgRoles.setPolicy("rs", { versionsKept: 1 }, { by: "bo@rs" })).rejects.toMatchObject({ status: 403 })
    await orgRoles.setPolicy("rs", { versionsKept: 2 }, { by: "ada@rs" })
    expect(await orgRoles.policy("rs")).toEqual({ versionsKept: 2 })
    expect((await orgRoles.log("rs")).at(-1)).toMatchObject({ action: "policy", by: "ada@rs", versionsKept: 2 })

    const bo = await draftsOf("bo@rs")
    for (const text of ["one\n", "two\n", "three\n"]) {
      await bo.save("/Welcome.spell", text)
      await bo.publish()
    }
    expect(await bo.versions()).toHaveLength(2)
  })

  test("a project in no org's paired space keeps its drafts beside it, as before", async () => {
    const family = ProjectDrafts.for("@family/cookbook", "owen@spell", {
      folderFor,
      projectFolder: folderFor("@family/cookbook"),
      people,
      orgRoles
    })
    mkdirSync(folderFor("@family/cookbook"), { recursive: true })
    writeFileSync(join(folderFor("@family/cookbook"), "Recipes.spell"), "Soup\n")
    await (await family).save("/Recipes.spell", "Soup and bread\n")
    expect(readdirSync(join(folderFor("@family/cookbook"), "__draft"))).toContainEqual(
      expect.stringMatching(/^Recipes\.owen-\d{4}-\d{2}-\d{2}\.spell$/)
    )
  })
})
