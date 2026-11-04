/**
 * `SpaceFolders`:  every project data folder in spaces, served by the page server's route (epic `atmosphere` P1),
 * a space's own written by its members (P4).
 * - Real HTTP, a real folder:  a temporary spell.spaces, and a browser's `RemotePlace` asking it.
 * - Who's asking comes from a header here, as sign-in will say it:  the app's own is this machine's person.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { RemotePlace, SPACE_MEMBER_OPERATIONS } from "spell/util/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "space-folders-token"

/** The org file:  Owen and Matt are members of spell, and Grace its admin. */
const SPELL_ORG = `{
  "$type": "Org",
  "id": "spell",
  "name": "Spell",
  "members": [
    { "$type": "Membership", "person": { "$ref": "Person#owen@spell" }, "role": "member" },
    { "$type": "Membership", "person": { "$ref": "Person#matt@spell" }, "role": "member" },
    { "$type": "Membership", "person": { "$ref": "Person#grace@spell" }, "role": "admin" }
  ]
}
`

/** The family's org:  Ana its admin, Bo a member, Cy a guest.  Dee is in no org but Spell's own. */
const FAMILY_ORG = `{
  "$type": "Org",
  "id": "family",
  "name": "The family",
  "members": [
    { "$type": "Membership", "person": { "$ref": "Person#ana@spell" }, "role": "admin" },
    { "$type": "Membership", "person": { "$ref": "Person#bo@spell" }, "role": "member" },
    { "$type": "Membership", "person": { "$ref": "Person#cy@spell" }, "role": "guest" }
  ]
}
`

/** A person's starter file. */
function personFile(id: string): string {
  return JSON.stringify({ $type: "Person", id, names: id })
}

const spaces = mkdtempSync(join(tmpdir(), "spell-space-folders-"))
const peopleStorage = new DiskStorage(spaces)
let folders: SpaceFolders
let port: number
let server: ReturnType<typeof createServer>

beforeAll(async () => {
  mkdirSync(join(spaces, "@spell"), { recursive: true })
  writeFileSync(join(spaces, "@spell", "__org.json5"), SPELL_ORG)
  mkdirSync(join(spaces, "@family"), { recursive: true })
  writeFileSync(join(spaces, "@family", "__org.json5"), FAMILY_ORG)
  for (const id of ["owen", "matt", "grace", "ana", "bo", "cy", "dee"]) {
    mkdirSync(join(spaces, "@spell", `${id}@`), { recursive: true })
    writeFileSync(join(spaces, "@spell", `${id}@`, "__me.json5"), personFile(id))
  }
  folders = new SpaceFolders({
    folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
    people: new PeopleStore(peopleStorage),
    personFor: (request) => request.get("x-person") ?? "owen@spell"
  })
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  folders.route({ router, guard })
  server = createServer(SRV.toListener(router.handle))
  port = await SRV.listenPreferred(server)
  guard.allowPort(port)
})

afterEach(() => folders.close())

afterAll(async () => {
  peopleStorage.close()
  await new Promise<void>((done) => {
    server.closeAllConnections()
    server.close(() => done())
  })
  rmSync(spaces, { recursive: true, force: true })
})

/** A browser's place on the folder at `address`, asking as `person`. */
function folderAt(address: string, person = "owen@spell"): RemotePlace {
  const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${address}`, token: TOKEN })
  // who's asking, as sign-in will say:  a header, on every request it sends
  const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown }).answerTo
  ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
    return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
  }
  return remote
}

/** An insert of recipe `id`. */
function insertOf(id: string, title: string) {
  return { kind: "insert" as const, collection: "recipes", id, fields: { title } }
}

/** An update of recipe `id`'s title. */
function updateOf(id: string, title: string) {
  return { kind: "update" as const, collection: "recipes", id, fields: { title } }
}

/** What the folder at `parts` (from spell.spaces) holds of `id`, as its file says. */
function onDisk(parts: string[], id: string): Record<string, unknown> | undefined {
  const file = join(spaces, ...parts, "recipes", `${id}.json`)
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : undefined
}

describe("SpaceFolders, a person's space:  written by its members (epic `atmosphere` P4)", () => {
  test("a round trip:  written into that space's folder on disk as the space, and read back, by whom", async () => {
    const box = folderAt("owen@spell/recipes")
    await box.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", servings: 4 } }], {})
    const dal = { id: "r-1", title: "Dal", servings: 4, owner: "owen@spell", by: "owen@spell" }
    expect(onDisk(["@spell", "owen@", "recipes"], "r-1")).toEqual(dal)
    // a list holds every field:  nobody named which beforehand
    expect((await folderAt("owen@spell/recipes").list("recipes", {}, {})).rows).toEqual([dal])
  })

  test("with no `__members/`, only its person writes:  anyone else is refused, `role`", async () => {
    await expect(
      folderAt("owen@spell/shared", "matt@spell").apply([insertOf("m-1", "Matt's")], {})
    ).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "Your role can't write here:  you aren't a member of owen@spell"
    })
    expect(onDisk(["@spell", "owen@", "shared"], "m-1")).toBeUndefined()
  })

  test("its own `__members/`, when it has one:  a member writes the same thing, a stranger is refused;  its person is written in", async () => {
    const members = join(spaces, "@spell", "owen@", "family", "__members")
    mkdirSync(members, { recursive: true })
    writeFileSync(join(members, "matt@spell.json5"), `{ "person": { "$ref": "Person#matt@spell" }, "role": "member" }`)
    await folderAt("owen@spell/family").apply([insertOf("g-1", "Owen's")], {})
    // the owner's membership, with the owner's role
    expect(readFileSync(join(members, "owen@spell.json5"), "utf8")).toContain('"role": "admin"')

    await folderAt("owen@spell/family", "matt@spell").apply([updateOf("g-1", "Matt's")], {})
    expect(onDisk(["@spell", "owen@", "family"], "g-1")).toMatchObject({
      title: "Matt's",
      owner: "owen@spell",
      by: "matt@spell"
    })
    await expect(
      folderAt("owen@spell/family", "grace@spell").apply([updateOf("g-1", "Grace's")], {})
    ).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })
  })
})

describe("SpaceFolders, an org's space:  @family's cookbook (epic `atmosphere` P4)", () => {
  const COOKBOOK = "@family/cookbook"

  test("two members edit ONE recipe:  the org's own, each save saying by whom", async () => {
    await folderAt(COOKBOOK, "ana@spell").apply([insertOf("c-1", "Grandma's soup")], {})
    expect(onDisk(["@family", "cookbook"], "c-1")).toEqual({
      id: "c-1",
      title: "Grandma's soup",
      owner: "@family",
      by: "ana@spell"
    })
    await folderAt(COOKBOOK, "bo@spell").apply([updateOf("c-1", "Grandma's soup, less salt")], {})
    expect(onDisk(["@family", "cookbook"], "c-1")).toEqual({
      id: "c-1",
      title: "Grandma's soup, less salt",
      owner: "@family",
      by: "bo@spell"
    })
  })

  test("a guest reads, but can't write;  someone outside the org can't either:  `role`, saying why", async () => {
    await folderAt(COOKBOOK, "ana@spell").apply([insertOf("c-2", "Pie")], {})
    expect((await folderAt(COOKBOOK, "cy@spell").list("recipes", {}, {})).rows.map(({ id }) => id)).toContain("c-2")
    await expect(folderAt(COOKBOOK, "cy@spell").apply([updateOf("c-2", "Cy's pie")], {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "Your role can't write here:  you're a guest of @family, a role that only reads"
    })
    await expect(folderAt(COOKBOOK, "dee@spell").apply([insertOf("c-3", "Dee's")], {})).rejects.toMatchObject({
      message: "Your role can't write here:  you aren't a member of @family"
    })
    expect(onDisk(["@family", "cookbook"], "c-2")).toMatchObject({ title: "Pie", by: "ana@spell" })
  })

  test("its member list:  an admin adds and removes, a member can't, anyone may leave;  written to the org's file", async () => {
    const asAna = folderAt(COOKBOOK, "ana@spell")
    const people = (members: unknown) =>
      (members as { person: string; role: string }[]).map(({ person, role }) => `${person} ${role}`)
    expect(people(await asAna.call(SPACE_MEMBER_OPERATIONS.members, undefined, {}))).toEqual([
      "ana@spell admin",
      "bo@spell member",
      "cy@spell guest"
    ])
    expect(await folderAt(COOKBOOK, "bo@spell").call(SPACE_MEMBER_OPERATIONS.members, undefined, {})).toContainEqual({
      person: "bo@spell",
      role: "member",
      canRead: true,
      canWrite: true,
      canManage: false
    })
    await expect(
      folderAt(COOKBOOK, "dee@spell").call(SPACE_MEMBER_OPERATIONS.members, undefined, {})
    ).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })

    // a member can't add;  the admin can, and Dee writes at once
    const addDee = { person: "dee@spell", role: "member" }
    await expect(folderAt(COOKBOOK, "bo@spell").call(SPACE_MEMBER_OPERATIONS.add, addDee, {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "Your role can't add members:  you're a member of @family"
    })
    await asAna.call(SPACE_MEMBER_OPERATIONS.add, addDee, {})
    expect(readFileSync(join(spaces, "@family", "__org.json5"), "utf8")).toContain("Person#dee@spell")
    await folderAt(COOKBOOK, "dee@spell").apply([insertOf("c-4", "Dee's stew")], {})
    expect(onDisk(["@family", "cookbook"], "c-4")).toMatchObject({ owner: "@family", by: "dee@spell" })

    // given the admin role, Bo may remove;  Cy leaves by herself
    await asAna.call(SPACE_MEMBER_OPERATIONS.add, { person: "bo@spell", role: "admin" }, {})
    await folderAt(COOKBOOK, "bo@spell").call(SPACE_MEMBER_OPERATIONS.remove, { person: "dee@spell" }, {})
    await folderAt(COOKBOOK, "cy@spell").call(SPACE_MEMBER_OPERATIONS.remove, { person: "cy@spell" }, {})
    expect(people(await asAna.call(SPACE_MEMBER_OPERATIONS.members, undefined, {}))).toEqual([
      "ana@spell admin",
      "bo@spell admin"
    ])
    await expect(folderAt(COOKBOOK, "dee@spell").apply([updateOf("c-4", "Still mine?")], {})).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })

    // the last admin can't leave it with none;  someone with no account can't be added
    await asAna.call(SPACE_MEMBER_OPERATIONS.add, { person: "bo@spell", role: "member" }, {})
    await expect(asAna.call(SPACE_MEMBER_OPERATIONS.remove, { person: "ana@spell" }, {})).rejects.toMatchObject({
      kind: "refused"
    })
    await expect(asAna.call(SPACE_MEMBER_OPERATIONS.add, { person: "zed@spell", role: "member" }, {})).rejects.toThrow(
      /nobody called zed@spell/
    )
    await expect(asAna.call(SPACE_MEMBER_OPERATIONS.add, { person: "bo@spell", role: "boss" }, {})).rejects.toThrow(
      /send a role/
    )
  })

  test("a person's space's list:  adding someone makes its `__members/`, its person first", async () => {
    await folderAt("owen@spell/garden").call(SPACE_MEMBER_OPERATIONS.add, { person: "matt@spell", role: "member" }, {})
    const members = join(spaces, "@spell", "owen@", "garden", "__members")
    expect(readFileSync(join(members, "owen@spell.json5"), "utf8")).toContain('"role": "admin"')
    expect(readFileSync(join(members, "matt@spell.json5"), "utf8")).toContain('"role": "member"')
    await folderAt("owen@spell/garden", "matt@spell").apply([insertOf("t-1", "Tomatoes")], {})
    expect(onDisk(["@spell", "owen@", "garden"], "t-1")).toMatchObject({ owner: "owen@spell", by: "matt@spell" })
  })
})

describe("SpaceFolders, a program's own data:  each row its maker's (epic `atmosphere` P1)", () => {
  const APP = "@spell/team-app/__data/recipes"

  test("someone else's row is refused, `owner`;  the org's admin keeps it, a member doesn't", async () => {
    await folderAt(APP, "matt@spell").apply([insertOf("t-1", "Matt's")], {})
    await expect(folderAt(APP, "owen@spell").apply([updateOf("t-1", "Owen's")], {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "owner" }
    })
    await folderAt(APP, "grace@spell").apply([updateOf("t-1", "Grace's")], {})
    expect(onDisk(["@spell", "team-app", "__data", "recipes"], "t-1")).toMatchObject({
      title: "Grace's",
      owner: "matt@spell",
      by: "grace@spell"
    })
  })

  test("personal:  one per person, in each person's own space's __data", async () => {
    await folderAt("personal/recipes", "owen@spell").apply([insertOf("p-1", "Mine")], {})
    await folderAt("personal/recipes", "matt@spell").apply([insertOf("p-1", "Matt's")], {})
    expect(onDisk(["@spell", "owen@", "__data", "recipes"], "p-1")).toMatchObject({ title: "Mine" })
    expect(onDisk(["@spell", "matt@", "__data", "recipes"], "p-1")).toMatchObject({ title: "Matt's" })
  })
})

describe("SpaceFolders, what it says", () => {
  /** What the folder at `address` says it can do. */
  async function capabilitiesOf(address: string) {
    const answer = await fetch(`http://127.0.0.1:${port}/api/places/spaces/${address}`, {
      headers: { "x-server-token": TOKEN }
    })
    return ((await answer.json()) as { capabilities: object }).capabilities
  }

  test("who writes, by its address;  not more often than every 5 seconds", async () => {
    expect(await capabilitiesOf("owen@spell/recipes")).toMatchObject({
      whoWrites: "its members",
      checkedAtMostEvery: 5,
      identifiesBy: "this machine"
    })
    expect(await capabilitiesOf("personal/recipes")).toMatchObject({ whoWrites: "only the owner" })
  })

  test("a name that's no address, or one that climbs out, is no folder:  404", async () => {
    for (const name of ["recipes", "owen@spell/../../etc", "@local/x/recipes"]) {
      const answer = await fetch(`http://127.0.0.1:${port}/api/places/spaces/${name}/list`, {
        method: "POST",
        headers: { "x-server-token": TOKEN, "content-type": "application/json" },
        body: JSON.stringify({ collection: "recipes" })
      })
      expect(answer.status, name).toBe(404)
    }
  })
})
