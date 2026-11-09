/**
 * An org's events, from someone's idea to a quiet record (epic `atmosphere` P32).
 * - A small RS:  Ana is the Board, Bo manages the Events Team;  Cy, Dee and Eve are in RS and manage nothing;
 *   Zed isn't in RS.
 * - Through the app's `SpaceFolders`, as a page asks:  the events page's place, `@rs/__admin/events`, and a write to the
 *   event's own shared space.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PlaceError, SPACE_MEMBER_OPERATIONS, SPACE_SHEET_OPERATIONS, type Place } from "spell/places"
import { SP } from "spell/parser/spell"
import { RS_EVENT_PROGRAM } from "spell/app/spaces/server/node/people/OrgEvents"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The events page's place, as a program names it. */
const EVENTS = "@rs/__admin/events"

/** The picnic's own shared space, once it's approved:  a sheet in it. */
const PICNIC_SHEET = "events_team@rs/picnic/sheet"

/** The picnic's master sign-up sheet, in its private space:  its organizers' alone, but for sign-ups. */
const PICNIC_MASTER = "events_team@rs/picnic/__private/signups"

const root = mkdtempSync(join(tmpdir(), "spell-org-events-"))
const folderFor = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const folders = new SpaceFolders({ folderFor, people })

/** The events place, as `who` (`ana`) asks for it. */
async function eventsPlace(who: string): Promise<Place> {
  return (await folders.placeFor(EVENTS, `${who}@rs`))!
}

/** The rows of `collection`, as `who` reads them. */
async function rowsOf(collection: string, who = "ana") {
  return (await (await eventsPlace(who)).list(collection, {}, { identity: `${who}@rs` })).rows
}

/** As `who`, move the picnic to `stage`. */
async function move(who: string, stage: string) {
  return (await eventsPlace(who)).apply!([{ kind: "update", collection: "events", id: "picnic", fields: { stage } }], {
    identity: `${who}@rs`
  })
}

/** As `who`, add a row to the picnic's sheet. */
async function writeSheet(who: string, id: string) {
  const place = (await folders.placeFor(PICNIC_SHEET, `${who}@rs`))!
  return place.apply!([{ kind: "insert", collection: "volunteers", id, fields: { shift: "setup" } }], {
    identity: `${who}@rs`
  })
}

beforeAll(async () => {
  for (const id of ["ana", "bo", "cy", "dee", "eve", "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = ["ana", "bo", "cy", "dee", "eve"].map((id) => ({
    $type: "Membership",
    person: { $ref: `Person#${id}@rs` },
    role: "editor"
  }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  const roles = folders.orgRoles
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ana@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ana@rs" })
  // RS's template event:  a project with one page
  const template = folderFor("@spell/examples/SignUpSheet")
  mkdirSync(template, { recursive: true })
  writeFileSync(join(template, "SignUpSheet.spell"), "the sign up sheet is a data folder\n")
})

afterAll(() => {
  folders.close()
  rmSync(root, { recursive: true, force: true })
})

describe("an org's events", () => {
  test("its stages are RS's until it says its own:  Proposed to Quiet", async () => {
    expect((await rowsOf("event_stages", "dee")).map((row) => row.name)).toEqual(
      RS_EVENT_PROGRAM.stages.map((stage) => stage.name)
    )
  })

  test("anyone in RS proposes one;  someone outside can't", async () => {
    await (
      await eventsPlace("cy")
    ).apply!([{ kind: "insert", collection: "events", fields: { name: "Picnic", organizers: "cy@rs, dee@rs" } }], {
      identity: "cy@rs"
    })
    expect(await rowsOf("events", "dee")).toEqual([
      {
        id: "picnic",
        name: "Picnic",
        team: "",
        organizers: "cy@rs, dee@rs",
        proposed: "cy@rs",
        stage: "proposed",
        stageName: "Proposed",
        onward: "approved",
        onwardName: "Approved"
      }
    ])
    await expect(
      folders.events.propose("rs", { id: "gala", name: "Gala", organizers: ["zed@rs"] }, { by: "zed@rs" })
    ).rejects.toMatchObject({ status: 403 })
  })

  test("only the Events Team's Managers say yes, which makes the event's project and copies the template", async () => {
    await expect(move("cy", "approved")).rejects.toBeInstanceOf(PlaceError)
    await expect(move("bo", "open")).rejects.toThrow(/can't go from Proposed to Open/)
    await move("bo", "approved")

    const roster = (await people.roster("rs"))!
    expect(roster.projects.items.map((each) => [each.folder, each.team?.folder])).toEqual([["picnic", "events_team"]])
    expect((await folders.orgRoles.managersOf("rs", "picnic")).sort()).toEqual(
      ["ana@rs", "bo@rs", "cy@rs", "dee@rs"].sort()
    )
    const copied = join(folderFor("events_team@rs/picnic"), "SignUpSheet", "SignUpSheet.spell")
    expect(readFileSync(copied, "utf8")).toMatch(/data folder/)
  })

  test("its organizers move it on, through Planning, Open and Analysis;  someone else can't", async () => {
    await expect(move("bo", "planning")).resolves.toBeDefined() // a Team Manager manages its projects too
    await expect(move("zed", "open")).rejects.toBeInstanceOf(PlaceError)
    await move("cy", "open")
    await writeSheet("cy", "cy-setup")
    await move("dee", "analysis")
    expect((await rowsOf("events"))[0]).toMatchObject({ stage: "analysis", stageName: "Analysis" })
  })

  test("quiet, its spaces are read only;  its record stays, and every move is in the log", async () => {
    await move("cy", "quiet")
    expect(await folders.events.isQuietAt(PICNIC_SHEET)).toBe(true)
    expect(await folders.events.isQuietAt("events_team@rs/welcome")).toBe(false)
    await expect(writeSheet("cy", "late")).rejects.toThrow(/quiet/)

    const sheet = (await folders.placeFor(PICNIC_SHEET, "dee@rs"))!
    expect((await sheet.list("volunteers", {}, { identity: "dee@rs" })).rows.map((row) => row.id)).toEqual(["cy-setup"])
    const moves = (await folders.orgRoles.log("rs")).filter((each) => each.action === "event")
    expect(moves.map((each) => each.name)).toEqual(["proposed", "approved", "planning", "open", "analysis", "quiet"])
  })

  test("quiet holds for someone who isn't a member of the space:  a sign-up, a public write", async () => {
    const sheet = (await folders.placeFor(PICNIC_MASTER, "cy@rs"))!
    await sheet.call!(SPACE_SHEET_OPERATIONS.set, { signUpsFrom: PICNIC_SHEET }, { identity: "cy@rs" })
    const shared = (await folders.placeFor(PICNIC_SHEET, "cy@rs"))!
    await shared.call!(SPACE_MEMBER_OPERATIONS.changeSettings, { publicWrite: true }, { identity: "cy@rs" })

    const signUp = sheet.apply!(
      [{ kind: "insert", collection: "volunteers", id: "eve", fields: { person: "eve@rs", shift: "setup" } }],
      { identity: "eve@rs" }
    )
    await expect(signUp).rejects.toThrow(/quiet/)
    const publicWrite = shared.apply!(
      [{ kind: "insert", collection: "volunteers", id: "zed", fields: { shift: "setup" } }],
      { identity: "zed@rs" }
    )
    await expect(publicWrite).rejects.toThrow(/quiet/)
  })

  test("the program is RS's to change:  only its Board and Admins", async () => {
    const program = { ...RS_EVENT_PROGRAM, stages: RS_EVENT_PROGRAM.stages.slice(0, 2) }
    program.stages[1] = { ...program.stages[1]!, next: [] }
    await expect(folders.events.setProgram("rs", program, { by: "bo@rs" })).rejects.toMatchObject({ status: 403 })
    await folders.events.setProgram("rs", program, { by: "ana@rs" })
    expect((await rowsOf("event_stages")).map((row) => row.id)).toEqual(["proposed", "approved"])
  })
})
