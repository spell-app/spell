/**
 * Members' own spaces (epic `atmosphere` P28):  each person in an org has a space of their own there, `ana@rs`, which
 * everyone in the org reads, only they write, and the Board and Admins may delete from but never edit.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team;  Mo and Vic are in RS;  Zed isn't.
 * - Its members (`SpaceMembers`), then over HTTP through the page server's route (`SpaceFolders`);
 *   what a project there may hold (`ProjectRoles`);  and Mo leaving with his (`SpaceFolders.takeOwnSpace()`).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
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
import { ProjectRoles } from "spell/app/spaces/server/node/projects/ProjectRoles"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "members-own-spaces-token"

/** RS's people, each with a file, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = { ana: "editor", ada: "editor", bo: "editor", mo: "editor", vic: "viewer" }

/** Mo's "About me", in his own space in RS. */
const ABOUT = "mo@rs/about"

const root = mkdtempSync(join(tmpdir(), "spell-members-own-spaces-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const roles = new OrgRoles({ people })

/** Where an address's folder is, under the test's root. */
const folderFor = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))

/** RS's members of the folder at `address`. */
const membersAt = (address: string) => new SpaceMembers({ address, storage, people, orgRoles: roles })

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
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
})

afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("members' own spaces", () => {
  test("mo@rs is Mo's own space in RS;  a team's folder, a private side, or an org with no Admin space isn't", async () => {
    expect(await roles.memberSpaceAt(ABOUT)).toEqual({ org: "rs", person: "mo@rs" })
    expect(await roles.memberSpaceAt("events_team@rs/welcome")).toBeUndefined()
    expect(await roles.memberSpaceAt("mo@rs/__private/inbox")).toBeUndefined()
    expect(await roles.memberSpaceAt("owen@spell/recipes")).toBeUndefined()
  })

  test("Mo is its manager;  everyone else in RS a viewer, who reads it and can't post;  Zed reads nothing", async () => {
    const members = membersAt(ABOUT)
    expect((await members.list()).map(({ person, role }) => `${person} ${role}`)).toEqual([
      "mo@rs manager",
      "ana@rs viewer",
      "ada@rs viewer",
      "bo@rs viewer",
      "vic@rs viewer"
    ])
    expect(await members.memberOf("zed@rs")).toBeUndefined()
    expect((await members.settings()).viewersPost).toBe(false)
    await expect(members.add("zed@rs", "viewer")).rejects.toThrow(/everyone in its org reads it/)
    await expect(members.remove("vic@rs")).rejects.toThrow(/only its person writes/)
  })

  describe("over the page server's route", () => {
    let folders: SpaceFolders
    let server: ReturnType<typeof createServer>
    let port: number

    beforeAll(async () => {
      folders = new SpaceFolders({ folderFor, people, personFor: (request) => request.get("x-person") ?? "nobody@rs" })
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

    /** `person` makes, changes or removes a service on Mo's "About me". */
    const change = (person: string, kind: "insert" | "update" | "delete", id: string, name = "Guitar lessons") =>
      placeAt(ABOUT, person).apply(
        [{ changeId: `c-${person}-${kind}-${id}`, kind, collection: "services", id, fields: { id, name } }],
        {}
      )

    test("it's made on Mo's first write;  everyone in RS reads it, Zed doesn't", async () => {
      await change("mo@rs", "insert", "s-1")
      await change("mo@rs", "insert", "s-2", "Bike repair")
      expect(
        (await placeAt(ABOUT, "vic@rs").list("services", {}, {})).rows
          .map(({ id }) => id)
          .sort((one, other) => one.localeCompare(other))
      ).toEqual(["s-1", "s-2"])
      await expect(placeAt(ABOUT, "zed@rs").list("services", {}, {})).rejects.toThrow(/aren't a member/)
    })

    test("only Mo writes it:  Vic can't add, nor the Board edit;  the Board and Admins may delete", async () => {
      await expect(change("vic@rs", "insert", "s-3")).rejects.toThrow(/viewer/)
      await expect(change("ana@rs", "update", "s-1", "Guitar lessons, cheap")).rejects.toThrow(/viewer/)
      await expect(change("bo@rs", "delete", "s-2")).rejects.toThrow(/viewer/)
      await change("ada@rs", "delete", "s-2")
      expect((await placeAt(ABOUT, "mo@rs").list("services", {}, {})).rows.map(({ id }) => id)).toEqual(["s-1"])
    })

    test("Mo leaves RS with his own space:  copied into another space of his;  nobody in RS reads it any more", async () => {
      await expect(folders.takeOwnSpace("mo@rs", "bo@spell/from-rs")).rejects.toThrow(/isn't another space of mo@rs's/)
      expect(await folders.ownSpaceContents("mo@rs")).toEqual(["about"])
      expect(await folders.takeOwnSpace("mo@rs", "mo@spell/from-rs")).toEqual(["about"])
      expect(existsSync(join(folderFor("mo@spell/from-rs"), "about"))).toBe(true)
      await expect(folders.takeOwnSpace("mo@rs", "mo@spell/from-rs")).rejects.toThrow(/already holds about/)

      await roles.leave("rs", "mo@rs", { by: "mo@rs" })
      expect((await membersAt(ABOUT).list()).map(({ person }) => person)).toEqual(["mo@rs"])
      await expect(placeAt(ABOUT, "vic@rs").list("services", {}, {})).rejects.toThrow(/aren't a member/)
    })
  })

  test("a project in someone's own space holds documents and approved apps, never code", async () => {
    const folder = join(root, "projects", "about")
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, "About.spellml"), "<text>Hi</text>\n")
    const vicAbout = new ProjectRoles({ projectId: "vic@rs/about", person: "vic@rs", folder, people, orgRoles: roles })
    await vicAbout.mayHoldOrDie("/About.spellml", "<text>I teach guitar.</text>")
    await vicAbout.mayHoldOrDie("/About.css", "text { color: teal }")
    for (const code of ["/About.spell", "/about.js", "/page.html", "/logo.svg"]) {
      await expect(vicAbout.mayHoldOrDie(code, "")).rejects.toMatchObject({
        status: 403,
        message: expect.stringMatching(/vic@rs's own space:  it holds documents and approved apps, never code/)
      })
    }
    await expect(vicAbout.mayHoldOrDie("/About.spellml", '<action "pay">send money</action>')).rejects.toMatchObject({
      status: 403
    })
    // anywhere else, code is fine:  a team's space
    const welcome = new ProjectRoles({
      projectId: "events_team@rs/welcome",
      person: "bo@rs",
      folder,
      people,
      orgRoles: roles
    })
    await welcome.mayHoldOrDie("/Welcome.spell", "")
    expect(readFileSync(join(folder, "About.spellml"), "utf8")).toBe("<text>Hi</text>\n")
  })
})
