/**
 * Inboxes and messages (epic `atmosphere` P29, Q23 A):  each person in an org has an inbox, `ana@rs/__inbox`, which
 * they, the Board and the Admins read;  a message is a copy in each inbox it's sent to, never edited.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team;  Cy and Vic are in RS;  Zed isn't.
 * - Through the page server's places (`SpaceFolders`), as each person;  one read over HTTP, `@rs/__inbox` for whoever
 *   asks;  and a copy that fails once, tried again (`PersonInbox`).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { RemotePlace } from "spell/places"
import type { PlaceChange, PlaceRow } from "spell/places/places.types"
import { SRV } from "spell/server"
import type { FolderPlace } from "spell/server/places"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { PersonInbox } from "spell/app/spaces/server/node/places/PersonInbox"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "person-inbox-token"

/** RS's people, each with a file, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = { ana: "editor", ada: "editor", bo: "editor", cy: "editor", vic: "viewer" }

/** The invitations page the Events Team's Manager, Bo, put in its shared space. */
const INVITATIONS = "events_team@rs/invitations"

const root = mkdtempSync(join(tmpdir(), "spell-person-inbox-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)

/** Where an address's folder is, under the test's root. */
const folderFor = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))

const folders = new SpaceFolders({
  folderFor,
  people,
  personFor: (request) => request.get("x-person") ?? "nobody@rs",
  queueFile: join(root, "queue.json")
})
const roles: OrgRoles = folders.orgRoles

/** `person`'s inbox place, as Spell itself opens it. */
const inboxPlace = async (person: string) => (await folders.placeFor(`${person}/__inbox`, undefined)) as FolderPlace

/** `person` writes `changes` into the inbox at `address`, as themselves. */
async function write(person: string, address: string, changes: PlaceChange[]) {
  const place = await folders.placeFor(address, person)
  return place!.apply!(changes, { identity: person })
}

/** `sender` sends `fields` as message `id`:  added to their own inbox's messages. */
async function send(sender: string, id: string, fields: PlaceRow) {
  await write(sender, `${sender}/__inbox`, [{ kind: "insert", collection: "messages", id, fields: { id, ...fields } }])
  await (await folders.inboxOf(sender))!.settled
}

/** The messages in `person`'s inbox, by id, as they read them. */
async function messagesOf(person: string, reader = person): Promise<Record<string, PlaceRow>> {
  const place = (await folders.placeFor(`${person}/__inbox`, reader)) as FolderPlace
  const { rows } = await place.list("messages", {}, { identity: reader })
  const whole = await place.getMany(
    "messages",
    rows.map(({ id }) => String(id)),
    { identity: reader }
  )
  return Object.fromEntries(whole.map((row) => [String(row.id), row]))
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
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
})

afterAll(() => {
  folders.close()
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("a person's inbox", () => {
  test("ana@rs/__inbox is Ana's inbox:  a team's isn't, and it's no part of her own space", async () => {
    expect(await roles.inboxAt("ana@rs/__inbox")).toEqual({ org: "rs", person: "ana@rs" })
    expect(await roles.inboxAt("events_team@rs/__inbox")).toBeUndefined()
    expect(await roles.inboxAt("owen@spell/__inbox")).toBeUndefined()
    expect(await roles.memberSpaceAt("ana@rs/__inbox")).toBeUndefined()
  })

  test("Cy reads his, as the Board and the Admins do;  Vic doesn't, nor does anyone outside RS", async () => {
    const members = new SpaceMembers({ address: "cy@rs/__inbox", storage, people, orgRoles: roles })
    expect((await members.list()).map(({ person, role }) => `${person} ${role}`)).toEqual([
      "cy@rs editor",
      "ana@rs viewer",
      "ada@rs viewer"
    ])
    await expect(members.add("vic@rs", "viewer")).rejects.toThrow(/an inbox is read by its person/)
    expect(await members.mayRead("vic@rs")).toBe(false)
    expect(await members.mayRead("zed@rs")).toBe(false)
  })
})

describe("messages", () => {
  test("Ana messages Bo:  a copy in each inbox, so deleting hers leaves his", async () => {
    await send("ana@rs", "m-1", { text: "Can you bring chairs?", recipients: "bo@rs" })
    const bos = await messagesOf("bo@rs")
    expect(bos["m-1"]).toMatchObject({
      text: "Can you bring chairs?",
      from: "ana@rs",
      recipients: "bo@rs",
      thread: "m-1",
      sent: expect.stringMatching(/^\d{4}-/)
    })
    expect((await messagesOf("ana@rs"))["m-1"]).toMatchObject({ from: "ana@rs", thread: "m-1" })

    await write("ana@rs", "ana@rs/__inbox", [{ kind: "delete", collection: "messages", id: "m-1" }])
    expect((await messagesOf("ana@rs"))["m-1"]).toBeUndefined()
    expect((await messagesOf("bo@rs"))["m-1"]).toBeDefined()
  })

  test("a message to several people:  one copy each, drawn as one thread with its replies", async () => {
    await send("bo@rs", "m-2", { text: "Who's free Saturday?", recipients: "cy@rs, vic@rs" })
    await send("cy@rs", "m-3", { text: "I am", recipients: "bo@rs, vic@rs", thread: "m-2" })
    await send("vic@rs", "m-4", { text: "Me too", recipients: "bo@rs cy@rs", thread: "m-2" })
    for (const person of ["bo@rs", "cy@rs", "vic@rs"]) {
      const thread = Object.values(await messagesOf(person)).filter((each) => each.thread === "m-2")
      expect(thread.map(({ id }) => String(id)).sort((one, other) => one.localeCompare(other))).toEqual([
        "m-2",
        "m-3",
        "m-4"
      ])
    }
  })

  test("it can't be edited once sent;  nobody writes in someone else's inbox, and Spell's copy is its own", async () => {
    await expect(
      write("bo@rs", "bo@rs/__inbox", [{ kind: "update", collection: "messages", id: "m-2", fields: { text: "x" } }])
    ).rejects.toThrow(/can't be edited once it's sent/)
    await expect(
      write("ana@rs", "cy@rs/__inbox", [
        { kind: "insert", collection: "messages", id: "m-x", fields: { text: "hi", recipients: "cy@rs" } }
      ])
    ).rejects.toThrow(/Only cy@rs writes in their inbox/)
    await expect(
      write("bo@rs", "bo@rs/__inbox", [{ kind: "insert", collection: "notes", id: "n-1", fields: { text: "x" } }])
    ).rejects.toThrow(/keeps messages only/)
  })

  test("refused before anything's written:  nobody to send it to, someone outside RS, an empty one, another's name", async () => {
    const tries: [PlaceRow, RegExp][] = [
      [{ text: "hi" }, /is sent to someone/],
      [{ text: "hi", recipients: "zed@rs" }, /zed@rs isn't in @rs/],
      [{ text: "  ", recipients: "cy@rs" }, /its text is empty/],
      [{ text: "hi", recipients: "cy@rs", from: "ana@rs" }, /from whoever sends it:  bo@rs/]
    ]
    for (const [fields, why] of tries) {
      await expect(
        write("bo@rs", "bo@rs/__inbox", [{ kind: "insert", collection: "messages", id: "m-bad", fields }])
      ).rejects.toThrow(why)
    }
    expect((await messagesOf("cy@rs"))["m-bad"]).toBeUndefined()
  })
})

describe("pointers to trusted pages", () => {
  /** A saved version of the invitations page, in its space's private folder, as Publish keeps one. */
  const VERSION = "invitations.2026-11-07-120000.zip"

  beforeAll(() => {
    const versions = join(folderFor("events_team@rs/__private/invitations"), "versions")
    mkdirSync(versions, { recursive: true })
    writeFileSync(join(versions, VERSION), "zip")
  })

  test("Bo, the Events Team's Manager, sends its invitations page:  a title, a line and the facts it needs", async () => {
    await send("bo@rs", "p-1", {
      recipients: "cy@rs",
      page: INVITATIONS,
      title: "Your invitations",
      line: "You have invitations to give out",
      facts: { invitationsLeft: 3 }
    })
    expect((await messagesOf("cy@rs"))["p-1"]).toMatchObject({
      page: INVITATIONS,
      title: "Your invitations",
      facts: { invitationsLeft: 3 },
      from: "bo@rs"
    })
  })

  test("only a page a Manager put in the org's spaces, by its Manager:  Vic sends plain messages", async () => {
    const pointer = (page: string) => [
      {
        kind: "insert" as const,
        collection: "messages",
        id: "p-bad",
        fields: { recipients: "cy@rs", page, title: "Look" }
      }
    ]
    await expect(write("vic@rs", "vic@rs/__inbox", pointer(INVITATIONS))).rejects.toThrow(/Only a page a Manager/)
    await expect(write("ana@rs", "ana@rs/__inbox", pointer("ana@rs/about"))).rejects.toThrow(/Only a page a Manager/)
  })

  test("a fixed one points to one saved version of its page, kept for good;  a version that isn't there is refused", async () => {
    await send("bo@rs", "p-2", { recipients: "cy@rs", page: INVITATIONS, title: "As sent", saved_version: VERSION })
    const kept = join(folderFor("events_team@rs/__private/invitations"), "versions", "__kept.json5")
    expect(readFileSync(kept, "utf8")).toContain(VERSION)
    await expect(
      write("bo@rs", "bo@rs/__inbox", [
        {
          kind: "insert",
          collection: "messages",
          id: "p-3",
          fields: { recipients: "cy@rs", page: INVITATIONS, title: "x", saved_version: "nope.zip" }
        }
      ])
    ).rejects.toThrow(/has no version nope.zip/)
  })
})

test("a copy an inbox didn't take is tried again, and lands", async () => {
  const address = "cy@rs/__inbox"
  let failures = 1
  const inbox = new PersonInbox({
    address,
    owner: { org: "rs", person: "cy@rs" },
    members: new SpaceMembers({ address, storage, people, orgRoles: roles }),
    people,
    orgRoles: roles,
    placeAt: async (at) => {
      if (at === "vic@rs/__inbox" && failures-- > 0) throw new Error("the disk was busy")
      return (await folders.placeFor(at, undefined)) as FolderPlace
    },
    keepVersion: async () => {},
    queueStorage: new SRV.FileStorage(join(root, "retry-queue.json")),
    retry: 50
  })
  inbox.written([
    { collection: "messages", id: "m-9", row: { id: "m-9", text: "Again?", recipients: "vic@rs", by: "cy@rs" } }
  ])
  await expect.poll(async () => (await messagesOf("vic@rs"))["m-9"]?.text, { timeout: 5_000 }).toBe("Again?")
  expect(inbox.unsent).toEqual([])
  inbox.stop()
})

describe("over the page server's route:  @rs/__inbox is whoever's asking's own", () => {
  let server: ReturnType<typeof createServer>
  let port: number

  beforeAll(async () => {
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: TOKEN })
    folders.route({ router, guard })
    server = createServer(SRV.toListener(router.handle))
    port = await SRV.listenPreferred(server)
    guard.allowPort(port)
  })

  afterAll(async () => {
    await new Promise<void>((done) => {
      server.closeAllConnections()
      server.close(() => done())
    })
  })

  test("Cy's page and Vic's read the same address, each their own messages", async () => {
    /** The page's place on `@rs/__inbox`, asking as `person`. */
    function placeAs(person: string): RemotePlace {
      const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/@rs/__inbox`, token: TOKEN })
      const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown })
        .answerTo
      ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
        return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
      }
      return remote
    }
    const ids = async (person: string) =>
      (await placeAs(person).list("messages", {}, {})).rows.map(({ id }) => String(id)).sort()
    expect(await ids("cy@rs")).toContain("p-1")
    expect(await ids("vic@rs")).not.toContain("p-1")
    expect(await ids("vic@rs")).toContain("m-2")
    expect(await inboxPlace("vic@rs")).toBeDefined()
  })
})
