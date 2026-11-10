/**
 * Setting up an org on Spell's own server, in one go (epic `atmosphere` P35, Q29):
 * what `spell space org create rs --name "RS" --admin ana@example.org --team "Events Team"` does.
 * - On an empty server:  its file, its Admin space, its Admins and teams, its paired spaces' folders.
 * - Run again:  nothing doubled.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { OrgSetup } from "spell/app/spaces/server/node/people/OrgSetup"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

const root = mkdtempSync(join(tmpdir(), "spell-org-setup-"))
const folderFor = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const folders = new SpaceFolders({ folderFor, people })
const setup = new OrgSetup({ people, roles: folders.orgRoles, folderFor })
const ask = { org: "rs", name: "Rock Society", admins: ["ana@example.org"], teams: ["Events Team"] }

afterAll(() => {
  folders.close()
  rmSync(root, { recursive: true, force: true })
})

describe("an org's own programs", () => {
  test("are a project group of their own, found by address;  nothing lists it", () => {
    expect(new SP.SpellLocation("@rs/OrgAdmin/OrgAdmin.spell").projectId).toBe("@rs/OrgAdmin")
    expect(SP.SpellSetup.projectRootPaths).not.toContain("@rs")
  })

  test("never Spell's own folders, its built-ins, or a local folder", () => {
    expect(SP.SpellSetup.groupFor("@rs/__admin/roles")).toBeUndefined()
    expect(SP.SpellSetup.groupFor("@spell/nothing/x")).toBeUndefined()
    expect(SP.SpellSetup.groupFor("@local/mine/x")).toBeUndefined()
  })
})

describe("spell space org create", () => {
  test("on an empty server:  the org, its Admin space, its first Admin as Board and Admin, its team and spaces", async () => {
    const report = await setup.create(ask)
    expect(report.admins).toEqual([{ email: "ana@example.org", address: "ana@spell" }])
    expect(report.already).toEqual([])
    expect((await people.org("rs"))?.name).toBe("Rock Society")
    expect(await folders.orgRoles.isInOrg("rs", "ana@spell")).toBe(true)
    expect(await folders.orgRoles.boardAndAdmins("rs")).toEqual(["ana@spell"])
    const held = (await folders.orgRoles.terms("rs")).map((each) => `${each.role} ${each.person}`)
    expect(held.sort()).toEqual(["admins ana@spell", "board ana@spell"])
    expect((await people.roster("rs"))?.teams.items.map((each) => each.folder)).toEqual(["events_team"])
    for (const address of [
      "@rs",
      "@rs/__private",
      "admins@rs",
      "@rs/__admin",
      "events_team@rs",
      "events_team@rs/__private"
    ]) {
      expect(existsSync(folderFor(address)), address).toBe(true)
    }
    expect(report.next.join("\n")).toMatch(/spell space org codes rs ana@spell <someone>/)
  })

  test("its own copies of the org's pages, each naming the org:  the built-in's sample name gone", async () => {
    await setup.create({ org: "willzalone", name: "Willzalone", admins: ["ana@example.org"] })
    const source = (page: string, file: string) => readFileSync(join(folderFor(`@willzalone/${page}`), file), "utf8")
    expect(source("OrgAdmin", "OrgAdmin.api.spell")).toContain('"@willzalone/__admin/roles"')
    expect(source("Inbox", "Inbox.api.spell")).toContain('"@willzalone/__inbox"')
    expect(source("OrgFeed", "OrgFeed.api.spell")).toContain('"@willzalone/__feed"')
    expect(source("OrgChat", "OrgChat.api.spell")).toContain('"@willzalone/__thread"')
    for (const [page, file] of [
      ["OrgAdmin", "OrgAdmin.spell"],
      ["OrgChat", "OrgChat.api.spell"]
    ] as const) {
      expect(source(page, file)).not.toMatch(/@rs\b|Rock Society|\bRS\b/)
    }
  })

  test("run again, it makes nothing:  each part already there", async () => {
    const report = await setup.create(ask)
    expect(report.made).toEqual([])
    expect(report.already).toHaveLength(10)
    expect((await folders.orgRoles.terms("rs")).length).toBe(2)
    expect((await people.org("rs"))?.members.items).toHaveLength(1)
  })

  test("run again, a copy someone edited stays as it is", async () => {
    const file = join(folderFor("@rs/OrgAdmin"), "OrgAdmin.api.spell")
    writeFileSync(file, "// edited\n")
    await setup.create(ask)
    expect(readFileSync(file, "utf8")).toBe("// edited\n")
  })

  test("a second Admin later joins the same org;  recovery codes then name both", async () => {
    const report = await setup.create({ ...ask, admins: ["ana@example.org", "bo@example.org"] })
    expect(report.made).toEqual([
      "bo@spell's account, for bo@example.org",
      "bo@spell in @rs, as a manager",
      "bo@spell one of @rs's Admins"
    ])
    expect(report.next.join("\n")).toMatch(/spell space org codes rs ana@spell bo@spell/)
    expect(report.next.join("\n")).toContain("/apps/@rs/OrgAdmin")
  })

  test("an id that's no folder's name, or no Admin, is refused", async () => {
    await expect(setup.create({ org: "Rock Society", admins: ["a@b.org"] })).rejects.toThrow(/can't be an org's id/)
    await expect(setup.create({ org: "rs", admins: [] })).rejects.toThrow(/first Admin/)
  })
})
