import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { afterAll, beforeEach, describe, test, expect } from "vite-plus/test"

import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile, rosterFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/**
 * Who leads what in an org (epic `atmosphere` P20):  a small RS.
 * - Ana is the Board, Ada an Admin, Bo leads the Events Team, Cy the picnic, a project under it;
 *   Dee is in RS and leads nothing, Zed isn't in RS.
 */
const root = mkdtempSync(resolve(tmpdir(), "spell-org-roles-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

/** Today, and a test's clock, moved on by `later()`. */
let today = new Date("2026-11-06T12:00:00.000Z")
const roles = new OrgRoles({ people, now: () => today })

/** RS's people, each with a file;  all but Zed in its org file, as editors. */
const RS = ["ana", "ada", "bo", "cy", "dee"]

beforeEach(async () => {
  today = new Date("2026-11-06T12:00:00.000Z")
  await storage.remove("@rs")
  for (const id of [...RS, "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = RS.map((id) => ({ $type: "Membership", person: { $ref: `Person#${id}@rs` }, role: "editor" }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))

  await roles.setUp("rs", { board: "ana@rs" })
  await roles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ada@rs" })
  await roles.give("rs", { role: "team-lead", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
  await roles.addProject("rs", { id: "picnic", name: "Picnic", team: "events_team" }, { by: "bo@rs" })
  await roles.give("rs", { role: "project-lead", person: "cy@rs", of: "picnic" }, { by: "bo@rs" })
})

describe("OrgRoles", () => {
  test("who leads which space, today:  the Board everything, the Admins all but the org's own, each team and project its Leads", async () => {
    expect(await roles.leadsOf("rs")).toEqual(["ana@rs"])
    expect(await roles.leadsOf("rs", "__admin")).toEqual(["ana@rs", "ada@rs"])
    expect(await roles.leadsOf("rs", "events_team")).toEqual(["ana@rs", "ada@rs", "bo@rs"])
    expect(await roles.leadsOf("rs", "picnic")).toEqual(["ana@rs", "ada@rs", "bo@rs", "cy@rs"])
    expect(await roles.leads("dee@rs", "rs", "picnic")).toBe(false)
    // an org with no Admin space has no Leads
    expect(await roles.leadsOf("family", "cookbook")).toEqual([])
  })

  test("the roster is the people library's, in the Admin space:  people by reference, teams by reference", async () => {
    const text = await storage.read(rosterFile("rs"))
    expect(text).toContain('"$type": "Roster"')
    expect(text).toContain('"$ref": "Person#bo@rs"')
    expect(text).toContain('"folder": "events_team"')
    expect(text).toMatch(/"team": \{\s*"\$ref": "Team#/)
    expect((await people.roster("rs"))!.teams.items.map(({ name }) => name)).toEqual(["Events Team"])
  })

  test("a term ends:  on its end day, or ended today;  the record of who held it stays", async () => {
    await roles.give("rs", { role: "project-lead", person: "dee@rs", of: "picnic", end: new Date("2026-12-01") }, {})
    expect(await roles.leads("dee@rs", "rs", "picnic")).toBe(true)
    today = new Date("2026-12-02T00:00:00.000Z")
    expect(await roles.leads("dee@rs", "rs", "picnic")).toBe(false)

    await roles.end("rs", { role: "project-lead", person: "cy@rs", of: "picnic" }, { by: "bo@rs", why: "moved away" })
    expect(await roles.leads("cy@rs", "rs", "picnic")).toBe(false)
    expect((await people.roster("rs"))!.terms.items.filter(({ person }) => person?.id === "cy")).toHaveLength(1)
    expect((await roles.log("rs")).at(-1)).toMatchObject({
      at: "2026-12-02T00:00:00.000Z",
      by: "bo@rs",
      action: "end",
      role: "project-lead",
      person: "cy@rs",
      of: "picnic",
      why: "moved away"
    })
  })

  test("a Project Lead can't remove the Leads above them:  a Team Lead, an Admin, the Board;  they can name their own", async () => {
    const asCy = { by: "cy@rs" }
    await expect(
      roles.end("rs", { role: "team-lead", person: "bo@rs", of: "events_team" }, asCy)
    ).rejects.toMatchObject({
      status: 403,
      message: "cy@rs may not end a Team Lead's term in @rs:  the Board, the Admins and the Events Team's Leads may"
    })
    await expect(roles.end("rs", { role: "admins", person: "ada@rs" }, asCy)).rejects.toMatchObject({ status: 403 })
    await expect(roles.end("rs", { role: "board", person: "ana@rs" }, asCy)).rejects.toMatchObject({ status: 403 })

    await roles.give("rs", { role: "project-lead", person: "dee@rs", of: "picnic" }, asCy)
    expect(await roles.leads("dee@rs", "rs", "picnic")).toBe(true)
    await roles.end("rs", { role: "project-lead", person: "dee@rs", of: "picnic" }, asCy)
    expect(await roles.leads("dee@rs", "rs", "picnic")).toBe(false)
  })

  test("only the Board names the Board;  the Admins name Admins", async () => {
    await expect(roles.give("rs", { role: "board", person: "dee@rs" }, { by: "ada@rs" })).rejects.toMatchObject({
      status: 403,
      message: "ada@rs may not name a Board in @rs:  only the Board may"
    })
    await roles.give("rs", { role: "admins", person: "dee@rs" }, { by: "ada@rs" })
    expect(await roles.leads("dee@rs", "rs", "__admin")).toBe(true)
  })

  test("someone not eligible is refused, whoever names them;  nor anyone outside the org", async () => {
    await roles.defineRole("rs", { id: "treasurer", name: "Treasurer", eligiblePeople: ["dee@rs"] }, { by: "ana@rs" })
    await expect(roles.give("rs", { role: "treasurer", person: "bo@rs" }, { by: "ana@rs" })).rejects.toMatchObject({
      status: 403,
      message: "bo@rs isn't eligible to be a Treasurer of @rs"
    })
    await roles.give("rs", { role: "treasurer", person: "dee@rs" }, { by: "ana@rs" })
    expect((await roles.terms("rs")).find(({ role }) => role === "treasurer")).toMatchObject({ person: "dee@rs" })
    // a title leads nothing
    expect(await roles.leads("dee@rs", "rs", "picnic")).toBe(false)

    await expect(
      roles.give("rs", { role: "project-lead", person: "zed@rs", of: "picnic" }, { by: "bo@rs" })
    ).rejects.toMatchObject({ status: 403, message: "zed@rs isn't in @rs:  invite them first" })

    // eligible by team:  the Events Team's people today, its Team Leads
    await roles.defineRole("rs", { id: "project-lead", eligibleTeams: ["events_team"] }, { by: "ada@rs" })
    await expect(
      roles.give("rs", { role: "project-lead", person: "dee@rs", of: "picnic" }, { by: "bo@rs" })
    ).rejects.toMatchObject({ status: 403 })
    await roles.give("rs", { role: "project-lead", person: "bo@rs", of: "picnic" }, { by: "bo@rs" })
  })

  test("the org renames a role, never what a built-in one leads", async () => {
    await roles.defineRole("rs", { id: "board", name: "Council" }, { by: "ada@rs" })
    expect((await people.roster("rs"))!.roles.items.find(({ key }) => key === "board")!.name).toBe("Council")
    await expect(roles.defineRole("rs", { id: "board", leads: "a-team" }, { by: "ada@rs" })).rejects.toMatchObject({
      status: 400
    })
    await expect(roles.defineRole("rs", { id: "x", name: "X" }, { by: "bo@rs" })).rejects.toMatchObject({ status: 403 })
  })

  test("a project names a team, not its people:  a change to the team reaches it at once", async () => {
    await roles.addProject("rs", { id: "retreat", name: "Spring retreat" }, { by: "ana@rs" })
    await roles.give("rs", { role: "project-lead", team: "events_team", of: "retreat" }, { by: "ana@rs" })
    expect(await roles.leads("bo@rs", "rs", "retreat")).toBe(true)
    await roles.give("rs", { role: "team-lead", person: "dee@rs", of: "events_team" }, { by: "bo@rs" })
    expect(await roles.leads("dee@rs", "rs", "retreat")).toBe(true)
  })

  test("a Lead is the space's manager;  everyone else in the org, their membership's role", async () => {
    const picnic = new SpaceMembers({ address: "@rs/picnic", storage, people, orgRoles: roles })
    expect(await picnic.memberOf("cy@rs")).toMatchObject({ role: "manager", canManage: true })
    expect(await picnic.memberOf("dee@rs")).toMatchObject({ role: "editor", canWrite: true, canManage: false })
    expect(await picnic.keeps("cy@rs")).toBe(true)
    expect(await picnic.keeps("dee@rs")).toBe(false)
    expect((await picnic.list()).map(({ person, role }) => `${person} ${role}`)).toEqual([
      "ana@rs manager",
      "ada@rs manager",
      "bo@rs manager",
      "cy@rs manager",
      "dee@rs editor"
    ])
  })

  test("the log says who changed what, when", async () => {
    expect((await roles.log("rs")).map(({ action, by }) => `${action} ${by}`)).toEqual([
      "set up spell",
      "give spell",
      "give ana@rs",
      "team ada@rs",
      "give ada@rs",
      "project bo@rs",
      "give bo@rs"
    ])
  })
})
