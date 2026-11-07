/**
 * `SpaceFolders`:  every project data folder in spaces, served by the page server's route (epic `atmosphere` P1),
 * a space's own written by its members (P4);  its settings, limits, export, delete and backups (P7);  its files (P15).
 * - Real HTTP, a real folder:  a temporary spell.spaces, and a browser's `RemotePlace` asking it.
 * - Who's asking comes from a header here, as sign-in will say it:  the app's own is this machine's person.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { FILES_COLLECTION, LiveRoomPlace, RemotePlace, SPACE_MEMBER_OPERATIONS, SPACE_ROOMS_PREFIX } from "spell/places"
import { SRV } from "spell/server"
import { contentHash } from "spell/server/places"
import { SP } from "spell/parser/spell"
import { SpaceBackups } from "spell/app/spaces/server/node/places/SpaceBackups"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { unzipped } from "spell/app/spaces/server/node/storage/zip"

/** The token the server wants. */
const TOKEN = "space-folders-token"

/** Where people ask about a takedown, here. */
const ABUSE = "abuse@test.example"

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
    // a socket can't set a header:  a room's page says who it is in its address, `?as=`
    personFor: (request) => request.get("x-person") ?? (request.query.as as string | undefined) ?? "owen@spell",
    abuseContact: ABUSE
  })
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  const upgrades: { prefix: string; handle: SRV.UpgradeHandler }[] = []
  folders.route({ router, guard, upgrade: (prefix, handle) => upgrades.push({ prefix, handle }) })
  server = createServer(SRV.toListener(router.handle))
  server.on("upgrade", (raw, socket, head) => {
    const claim = upgrades.find(({ prefix }) => raw.url?.startsWith(`${prefix}/`))
    if (claim) void claim.handle(raw, socket, head)
    else socket.destroy()
  })
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

/** Ask the write side for `person`'s credential to read `address`:  the cookie to send back, and the answer. */
async function credentialOf(
  address: string,
  person: string
): Promise<{ status: number; cookie: string; body: unknown }> {
  const answer = await fetch(`http://127.0.0.1:${port}/api/places/spaces/${address}/credential`, {
    method: "POST",
    headers: { "x-server-token": TOKEN, "x-person": person, "content-type": "application/json" },
    body: "{}"
  })
  const setCookie = answer.headers.get("set-cookie") ?? ""
  return { status: answer.status, cookie: setCookie.split(";")[0]!, body: await answer.json() }
}

/** A plain read of `path` on the read side, sending `cookie`. */
async function readDirect(path: string, cookie?: string): Promise<{ status: number; text: string }> {
  const answer = await fetch(`http://127.0.0.1:${port}/api/reads/spaces/${path}`, {
    headers: cookie ? { cookie } : {}
  })
  return { status: answer.status, text: await answer.text() }
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
    expect(readFileSync(join(members, "owen@spell.json5"), "utf8")).toContain('"role": "manager"')

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

  test("a guest, read as a viewer, reads but can't write;  someone outside the org can't either:  `role`, saying why", async () => {
    await folderAt(COOKBOOK, "ana@spell").apply([insertOf("c-2", "Pie")], {})
    expect((await folderAt(COOKBOOK, "cy@spell").list("recipes", {}, {})).rows.map(({ id }) => id)).toContain("c-2")
    await expect(folderAt(COOKBOOK, "cy@spell").apply([updateOf("c-2", "Cy's pie")], {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role", needs: "editor" },
      message: "Your role can't change rows here:  you're a viewer of @family, and it takes an editor"
    })
    await expect(folderAt(COOKBOOK, "dee@spell").apply([insertOf("c-3", "Dee's")], {})).rejects.toMatchObject({
      message: "Your role can't write here:  you aren't a member of @family"
    })
    expect(onDisk(["@family", "cookbook"], "c-2")).toMatchObject({ title: "Pie", by: "ana@spell" })
  })

  test("its member list:  a manager adds and removes, an editor can't, anyone may leave;  written to the org's file;  older files' words read as the new ones", async () => {
    const asAna = folderAt(COOKBOOK, "ana@spell")
    const people = (members: unknown) =>
      (members as { person: string; role: string }[]).map(({ person, role }) => `${person} ${role}`)
    expect(people(await asAna.call(SPACE_MEMBER_OPERATIONS.members, undefined, {}))).toEqual([
      "ana@spell manager",
      "bo@spell editor",
      "cy@spell viewer"
    ])
    expect(await folderAt(COOKBOOK, "bo@spell").call(SPACE_MEMBER_OPERATIONS.members, undefined, {})).toContainEqual({
      person: "bo@spell",
      role: "editor",
      canRead: true,
      canWrite: true,
      canManage: false
    })
    await expect(
      folderAt(COOKBOOK, "dee@spell").call(SPACE_MEMBER_OPERATIONS.members, undefined, {})
    ).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })

    // an editor can't add;  the manager can, and Dee writes at once
    const addDee = { person: "dee@spell", role: "member" }
    await expect(folderAt(COOKBOOK, "bo@spell").call(SPACE_MEMBER_OPERATIONS.add, addDee, {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "Your role can't add members:  you're an editor of @family"
    })
    await asAna.call(SPACE_MEMBER_OPERATIONS.add, addDee, {})
    expect(readFileSync(join(spaces, "@family", "__org.json5"), "utf8")).toContain("Person#dee@spell")
    await folderAt(COOKBOOK, "dee@spell").apply([insertOf("c-4", "Dee's stew")], {})
    expect(onDisk(["@family", "cookbook"], "c-4")).toMatchObject({ owner: "@family", by: "dee@spell" })

    // given the manager role (an older word, `admin`, read as it), Bo may remove;  Cy leaves by herself
    await asAna.call(SPACE_MEMBER_OPERATIONS.add, { person: "bo@spell", role: "admin" }, {})
    await folderAt(COOKBOOK, "bo@spell").call(SPACE_MEMBER_OPERATIONS.remove, { person: "dee@spell" }, {})
    await folderAt(COOKBOOK, "cy@spell").call(SPACE_MEMBER_OPERATIONS.remove, { person: "cy@spell" }, {})
    expect(people(await asAna.call(SPACE_MEMBER_OPERATIONS.members, undefined, {}))).toEqual([
      "ana@spell manager",
      "bo@spell manager"
    ])
    await expect(folderAt(COOKBOOK, "dee@spell").apply([updateOf("c-4", "Still mine?")], {})).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })

    // the last manager can't leave it with none;  someone with no account can't be added
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
    expect(readFileSync(join(members, "owen@spell.json5"), "utf8")).toContain('"role": "manager"')
    expect(readFileSync(join(members, "matt@spell.json5"), "utf8")).toContain('"role": "editor"')
    await folderAt("owen@spell/garden", "matt@spell").apply([insertOf("t-1", "Tomatoes")], {})
    expect(onDisk(["@spell", "owen@", "garden"], "t-1")).toMatchObject({ owner: "owen@spell", by: "matt@spell" })
  })
})

describe("SpaceFolders, a live room (epic `atmosphere` T38, from I8)", () => {
  /** The club's org, its own for these tests:  Bo a member, Cy a guest. */
  const CLUB = "@club/pantry"

  beforeAll(() => {
    mkdirSync(join(spaces, "@club"), { recursive: true })
    const members = [
      { $type: "Membership", person: { $ref: "Person#bo@spell" }, role: "member" },
      { $type: "Membership", person: { $ref: "Person#cy@spell" }, role: "guest" }
    ]
    writeFileSync(join(spaces, "@club", "__org.json5"), JSON.stringify({ $type: "Org", id: "club", members }))
  })

  /** The address of the pantry's room of recipes, as `person`. */
  const roomUrl = (person: string) => `127.0.0.1:${port}${SPACE_ROOMS_PREFIX}/${CLUB}/recipes?as=${person}`

  /** Can `person` join the room? */
  const joins = (person: string) =>
    new Promise<string>((resolve) => {
      const socket = new WebSocket(`ws://${roomUrl(person)}`, [`spell-token.${TOKEN}`])
      socket.addEventListener("open", () => (socket.close(), resolve("open")))
      socket.addEventListener("error", () => resolve("refused"))
    })

  test("a room's write reaches the space as its page's person:  a member's lands, by them;  a guest's is refused", async () => {
    const [bo, cy] = ["bo@spell", "cy@spell"].map(
      (person) => new LiveRoomPlace({ url: `http://${roomUrl(person)}`, token: TOKEN, answerSeconds: 1 })
    )
    try {
      await bo!.list("recipes", {}, {})
      await bo!.apply([{ kind: "insert", collection: "recipes", id: "room-1", fields: { title: "Stew" } }], {})
      expect(onDisk(["@club", "pantry"], "room-1")).toMatchObject({ title: "Stew", owner: "@club", by: "bo@spell" })
      await cy!.list("recipes", {}, {})
      await expect(
        cy!.apply([{ kind: "update", collection: "recipes", id: "room-1", fields: { title: "Cy's stew" } }], {})
      ).rejects.toMatchObject({ kind: "refused" })
      expect(onDisk(["@club", "pantry"], "room-1")).toMatchObject({ title: "Stew", by: "bo@spell" })
    } finally {
      bo!.close()
      cy!.close()
    }
  })

  test("joining is reading:  someone who isn't a member is turned away;  a member comes in", async () => {
    expect(await joins("dee@spell")).toBe("refused")
    expect(await joins("cy@spell")).toBe("open")
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

describe("SpaceFolders, a space read direct, with a credential for the whole space (epic `atmosphere` P5)", () => {
  const COOKBOOK = "@family/cookbook"

  // Cy left the cookbook above:  back as a guest
  beforeAll(async () => {
    await folderAt(COOKBOOK, "ana@spell").call(SPACE_MEMBER_OPERATIONS.add, { person: "cy@spell", role: "guest" }, {})
  })

  test("a member's credential, and a guest's, reads the whole space:  its list and each thing, no run token", async () => {
    await folderAt(COOKBOOK, "ana@spell").apply([insertOf("d-1", "Dal")], {})
    for (const person of ["bo@spell", "cy@spell"]) {
      const { status, cookie, body } = await credentialOf(COOKBOOK, person)
      expect(status, person).toBe(200)
      expect(body).toEqual({ readsAt: "/api/reads/spaces/@family/cookbook" })
      expect(cookie).toMatch(/^spell-space-read=/)
      const list = await readDirect(`${COOKBOOK}/recipes.list.json`, cookie)
      expect(list.status, person).toBe(200)
      expect(JSON.parse(list.text).rows).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Dal" })]))
      const dal = await readDirect(`${COOKBOOK}/recipes/d-1.json`, cookie)
      expect(JSON.parse(dal.text)).toMatchObject({ title: "Dal", owner: "@family", by: "ana@spell" })
    }
  })

  test("its cookie:  only that space's read address gets it, out of every script's and other site's reach", async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/api/places/spaces/${COOKBOOK}/credential`, {
      method: "POST",
      headers: { "x-server-token": TOKEN, "x-person": "bo@spell", "content-type": "application/json" },
      body: "{}"
    })
    expect(answer.headers.get("set-cookie")).toMatch(
      /; Path=\/api\/reads\/spaces\/@family\/cookbook\/; HttpOnly; SameSite=Strict; Max-Age=2592000$/
    )
  })

  test("no credential, a forged one, or one for another space:  401;  someone outside it gets none:  `role`", async () => {
    expect((await readDirect(`${COOKBOOK}/recipes.list.json`)).status).toBe(401)
    const { cookie } = await credentialOf(COOKBOOK, "bo@spell")
    const forged = cookie.replace(/.$/, (last) => (last === "A" ? "B" : "A"))
    expect((await readDirect(`${COOKBOOK}/recipes.list.json`, forged)).status).toBe(401)
    // Ana's own recipe box is a space of its own:  the family's credential reads none of it
    await folderAt("ana@spell/recipes", "ana@spell").apply([insertOf("a-1", "Ana's own")], {})
    expect((await readDirect("ana@spell/recipes/recipes.list.json", cookie)).status).toBe(401)
    const refused = await credentialOf("ana@spell/recipes", "bo@spell")
    expect(refused.status).toBe(422)
    expect(refused.body).toEqual({
      error: "You can't read this:  you aren't a member of ana@spell",
      kind: "refused",
      whyNot: "role"
    })
    expect((await credentialOf(COOKBOOK, "dee@spell")).status).toBe(422)
    // Ana reads her own
    const anas = await credentialOf("ana@spell/recipes", "ana@spell")
    expect((await readDirect("ana@spell/recipes/recipes/a-1.json", anas.cookie)).status).toBe(200)
  })

  test("someone who leaves is refused at once:  their credential is no good any more, 403", async () => {
    const NOTES = "ana@spell/notes"
    const asAna = folderAt(NOTES, "ana@spell")
    await asAna.call(SPACE_MEMBER_OPERATIONS.add, { person: "bo@spell", role: "guest" }, {})
    await asAna.apply([insertOf("n-1", "Shopping")], {})
    const { cookie } = await credentialOf(NOTES, "bo@spell")
    expect((await readDirect(`${NOTES}/recipes.list.json`, cookie)).status).toBe(200)
    await asAna.call(SPACE_MEMBER_OPERATIONS.remove, { person: "bo@spell" }, {})
    const after = await readDirect(`${NOTES}/recipes.list.json`, cookie)
    expect(after.status).toBe(403)
    expect(after.text).toContain("bo@spell can't read ana@spell/notes")
  })

  test("only its list and things:  never its members, a dot file, or a folder of its own", async () => {
    const NOTES = "ana@spell/notes"
    const { cookie } = await credentialOf(NOTES, "ana@spell")
    for (const path of ["__members/ana@spell.json5", ".hidden.json", "recipes/../__members/x.json", "nothing/x.json"]) {
      expect((await readDirect(`${NOTES}/${path}`, cookie)).status, path).toBe(404)
    }
  })

  test("a program's own data isn't read direct:  no credential for it, 404", async () => {
    expect((await credentialOf("personal/recipes", "owen@spell")).status).toBe(404)
  })

  test("a file edited by hand shows in the next read direct:  watched while a page reads it (T17)", async () => {
    await folderAt(COOKBOOK, "ana@spell").apply([insertOf("h-1", "Soup")], {})
    folders.close()
    const file = join(spaces, "@family", "cookbook", "recipes", "h-1.json")
    /** Retitle `h-1` on the disk, as a hand in VS Code would. */
    const editByHand = (title: string) => {
      const body = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
      writeFileSync(file, `${JSON.stringify({ ...body, title }, null, 2)}\n`)
    }
    const titleRead = async (cookie: string) => {
      const list = JSON.parse((await readDirect(`${COOKBOOK}/recipes.list.json`, cookie)).text) as {
        rows: { id: string; title: string }[]
      }
      return list.rows.find((row) => row.id === "h-1")?.title
    }
    // edited while nobody's connected:  the first read brings the list into step
    editByHand("Hand soup")
    const { cookie } = await credentialOf(COOKBOOK, "bo@spell")
    expect(folders.isConnected(COOKBOOK)).toBe(false)
    expect(await titleRead(cookie)).toBe("Hand soup")
    expect(folders.isConnected(COOKBOOK)).toBe(true)
    // edited while connected:  the watch brings it into step, with no read through the write side
    editByHand("Stew")
    await vi.waitFor(async () => expect(await titleRead(cookie)).toBe("Stew"), { timeout: 5000, interval: 100 })
    folders.close()
    expect(folders.isConnected(COOKBOOK)).toBe(false)
  })

  test("reads through the write side are checked against the member list too (T15)", async () => {
    await expect(folderAt(COOKBOOK, "dee@spell").list("recipes", {}, {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role" },
      message: "You can't read this:  you aren't a member of @family"
    })
    expect((await folderAt(COOKBOOK, "cy@spell").list("recipes", {}, {})).rows.length).toBeGreaterThan(0)
  })
})

describe("SpaceFolders, what Spell took down (epic `atmosphere` P6, Q7 A)", () => {
  const PANTRY = "@family/pantry"
  const BY = { by: "grace@spell", reason: "doxxing:  a stranger's home address" }

  /** The recipes' ids the write side lists, as `person`. */
  async function idsThrough(address: string, person: string): Promise<string[]> {
    return (await folderAt(address, person).list("recipes", {}, {})).rows.map((row) => `${row.id}`)
  }

  /** The recipes' ids the list file read direct holds, as `person`. */
  async function idsDirect(address: string, person: string): Promise<string[]> {
    const { cookie } = await credentialOf(address, person)
    const { text } = await readDirect(`${address}/recipes.list.json`, cookie)
    return (JSON.parse(text) as { rows: { id: string }[] }).rows.map((row) => row.id)
  }

  beforeAll(async () => {
    await folderAt(PANTRY, "ana@spell").apply([insertOf("p-1", "Dal"), insertOf("p-2", "Grace's address")], {})
  })

  test("a record:  gone from both read paths, its own file 451, a change refused;  put back, there again", async () => {
    await folders.takedowns.take("hide", { kind: "record", space: PANTRY, collection: "recipes", id: "p-2" }, BY)
    expect(await idsThrough(PANTRY, "bo@spell")).toEqual(["p-1"])
    expect(await idsDirect(PANTRY, "bo@spell")).toEqual(["p-1"])
    const { cookie } = await credentialOf(PANTRY, "bo@spell")
    const own = await readDirect(`${PANTRY}/recipes/p-2.json`, cookie)
    expect(own.status).toBe(451)
    expect(JSON.parse(own.text).error).toBe(`"recipes" p-2 was taken down by Spell.  To ask about it:  ${ABUSE}`)
    await expect(folderAt(PANTRY, "ana@spell").apply([updateOf("p-2", "Again")], {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "taken down" }
    })
    // its file stays on the disk, as it was
    expect(onDisk(["@family", "pantry"], "p-2")).toMatchObject({ title: "Grace's address" })

    await folders.takedowns.take("restore", { kind: "record", space: PANTRY, collection: "recipes", id: "p-2" }, BY)
    expect((await idsThrough(PANTRY, "bo@spell")).sort()).toEqual(["p-1", "p-2"])
    expect((await idsDirect(PANTRY, "bo@spell")).sort()).toEqual(["p-1", "p-2"])
  })

  test("a reader asking what changed hears it taken down, and put back", async () => {
    const place = folderAt(PANTRY, "bo@spell")
    const { version } = await place.list("recipes", {}, {})
    await folders.takedowns.take("hide", { kind: "record", space: PANTRY, collection: "recipes", id: "p-1" }, BY)
    const down = await place.changesSince!("recipes", version!, {})
    expect(down.removed).toContain("p-1")
    expect(down.rows.map((row) => row.id)).not.toContain("p-1")
    await folders.takedowns.take("restore", { kind: "record", space: PANTRY, collection: "recipes", id: "p-1" }, BY)
    const back = await place.changesSince!("recipes", down.token, {})
    expect(back.rows).toEqual([expect.objectContaining({ id: "p-1", title: "Dal" })])
  })

  test("a space:  every read, write and credential refused, 451, naming the abuse contact;  then put back", async () => {
    const before = await credentialOf(PANTRY, "bo@spell")
    await folders.takedowns.take("hide", { kind: "space", space: PANTRY }, BY)
    const message = `This space was taken down by Spell.  To ask about it:  ${ABUSE}`
    await expect(folderAt(PANTRY, "bo@spell").list("recipes", {}, {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "taken down" },
      message
    })
    await expect(folderAt(PANTRY, "ana@spell").apply([insertOf("p-3", "New")], {})).rejects.toMatchObject({
      cause: { whyNot: "taken down" }
    })
    const credential = await credentialOf(PANTRY, "bo@spell")
    expect(credential.status).toBe(451)
    expect(credential.body).toEqual({ error: message, kind: "refused", whyNot: "taken down" })
    const direct = await readDirect(`${PANTRY}/recipes.list.json`, before.cookie)
    expect(direct.status).toBe(451)
    expect(JSON.parse(direct.text).error).toBe(message)

    await folders.takedowns.take("restore", { kind: "space", space: PANTRY }, BY)
    expect((await idsThrough(PANTRY, "bo@spell")).sort()).toEqual(["p-1", "p-2"])
    expect((await readDirect(`${PANTRY}/recipes.list.json`, before.cookie)).status).toBe(200)
  })

  test("an account:  its own spaces down for everyone, and its requests to any other refused;  then put back", async () => {
    const ANAS = "ana@spell/recipes"
    await folders.takedowns.take("hide", { kind: "account", person: "ana@spell" }, BY)
    await expect(folderAt(ANAS, "ana@spell").list("recipes", {}, {})).rejects.toMatchObject({
      cause: { whyNot: "taken down" }
    })
    await expect(folderAt(PANTRY, "ana@spell").list("recipes", {}, {})).rejects.toMatchObject({
      cause: { whyNot: "taken down" }
    })
    expect((await credentialOf(PANTRY, "ana@spell")).status).toBe(451)
    // everyone else reads the family's pantry as before
    expect((await idsThrough(PANTRY, "bo@spell")).length).toBe(2)
    expect(await folders.takedowns.isAccountDown("ana@spell")).toBe(true)

    await folders.takedowns.take("restore", { kind: "account", person: "ana@spell" }, BY)
    expect((await idsThrough(PANTRY, "ana@spell")).length).toBe(2)
    expect(await folders.takedowns.isAccountDown("ana@spell")).toBe(false)
  })

  test("the log says who, when and why, in the folder's `__takedowns.json5`:  never read direct", async () => {
    const log = await folders.takedowns.log(PANTRY)
    expect(log[0]).toMatchObject({
      action: "hide",
      kind: "record",
      space: PANTRY,
      collection: "recipes",
      id: "p-2",
      by: "grace@spell",
      reason: "doxxing:  a stranger's home address"
    })
    expect(log.at(-1)).toMatchObject({ action: "restore", kind: "space" })
    expect(readFileSync(join(spaces, "@family", "pantry", "__takedowns.json5"), "utf8")).toContain("doxxing")
    expect(await folders.takedowns.log("ana@spell")).toEqual([
      expect.objectContaining({ action: "hide", kind: "account", person: "ana@spell" }),
      expect.objectContaining({ action: "restore", kind: "account", person: "ana@spell" })
    ])
    const { cookie } = await credentialOf(PANTRY, "bo@spell")
    expect((await readDirect(`${PANTRY}/__takedowns.json5`, cookie)).status).toBe(404)
  })

  test("delete:  hidden, and its file removed;  an account is never deleted, and a reason is a must", async () => {
    await folderAt(PANTRY, "ana@spell").apply([insertOf("p-9", "To delete")], {})
    await folders.takedowns.take("delete", { kind: "record", space: PANTRY, collection: "recipes", id: "p-9" }, BY)
    expect(onDisk(["@family", "pantry"], "p-9")).toBeUndefined()
    expect(await idsThrough(PANTRY, "bo@spell")).not.toContain("p-9")
    await expect(folders.takedowns.take("delete", { kind: "account", person: "ana@spell" }, BY)).rejects.toThrow(
      TypeError
    )
    await expect(
      folders.takedowns.take("hide", { kind: "space", space: PANTRY }, { by: "grace@spell", reason: " " })
    ).rejects.toThrow(/say why/)
  })
})

describe("SpaceFolders, a sign-up sheet:  publicRead and publicWrite (epic `atmosphere` P7, Q13)", () => {
  const SHEET = "@family/sign-ups"

  test("both off until an admin turns them on;  only an admin may", async () => {
    await folderAt(SHEET, "ana@spell").apply([insertOf("s-0", "Ana brings bread")], {})
    expect(await folderAt(SHEET, "bo@spell").call(SPACE_MEMBER_OPERATIONS.settings, undefined, {})).toEqual({
      publicRead: false,
      publicWrite: false,
      viewersPost: true
    })
    await expect(folderAt(SHEET, "dee@spell").list("recipes", {}, {})).rejects.toMatchObject({
      cause: { whyNot: "role" }
    })
    await expect(
      folderAt(SHEET, "bo@spell").call(SPACE_MEMBER_OPERATIONS.changeSettings, { publicRead: true }, {})
    ).rejects.toMatchObject({ message: expect.stringContaining("Your role can't change its settings") })
    await expect(
      folderAt(SHEET, "ana@spell").call(SPACE_MEMBER_OPERATIONS.changeSettings, { publicRead: "yes" }, {})
    ).rejects.toThrow()
    expect(
      await folderAt(SHEET, "ana@spell").call(
        SPACE_MEMBER_OPERATIONS.changeSettings,
        { publicRead: true, publicWrite: true },
        {}
      )
    ).toEqual({ publicRead: true, publicWrite: true, viewersPost: true })
    // one of spaces' own files:  never read direct
    expect(readFileSync(join(spaces, "@family", "sign-ups", "__settings", "space.json5"), "utf8")).toContain(
      '"publicWrite": true'
    )
  })

  test("publicRead:  a stranger reads it through Spell, gets a credential, and reads it direct with none", async () => {
    expect((await folderAt(SHEET, "dee@spell").list("recipes", {}, {})).rows.map(({ id }) => id)).toContain("s-0")
    const { status, cookie } = await credentialOf(SHEET, "dee@spell")
    expect(status).toBe(200)
    expect((await readDirect(`${SHEET}/recipes.list.json`, cookie)).status).toBe(200)
    const anyone = await readDirect(`${SHEET}/recipes.list.json`)
    expect(anyone.status).toBe(200)
    expect(anyone.text).toContain("Ana brings bread")
    expect((await readDirect(`${SHEET}/recipes/s-0.json`)).status).toBe(200)
    expect((await readDirect(`${SHEET}/__settings/space.json5`)).status).toBe(404)
    // the cookbook is still members only
    expect((await readDirect("@family/cookbook/recipes.list.json")).status).toBe(401)
  })

  test("publicWrite:  a stranger adds their own row and changes only it;  a member changes any", async () => {
    const asDee = folderAt(SHEET, "dee@spell")
    await asDee.apply([insertOf("s-1", "Dee brings soup")], {})
    await asDee.apply([updateOf("s-1", "Dee brings soup, and bowls")], {})
    expect(onDisk(["@family", "sign-ups"], "s-1")).toMatchObject({
      title: "Dee brings soup, and bowls",
      owner: "@family",
      by: "dee@spell"
    })
    await expect(asDee.apply([updateOf("s-0", "Dee took Ana's")], {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "owner" }
    })
    await folderAt(SHEET, "bo@spell").apply([updateOf("s-1", "Soup:  Dee, bowls:  Bo")], {})
    expect(onDisk(["@family", "sign-ups"], "s-1")).toMatchObject({ by: "bo@spell" })
  })

  test("what Spell took down stays down in a public space too", async () => {
    await folders.takedowns.take(
      "hide",
      { kind: "record", space: SHEET, collection: "recipes", id: "s-1" },
      { by: "grace@spell", reason: "spam" }
    )
    expect((await folderAt(SHEET, "dee@spell").list("recipes", {}, {})).rows.map(({ id }) => id)).not.toContain("s-1")
    expect((await readDirect(`${SHEET}/recipes/s-1.json`)).status).toBe(451)
    await folders.takedowns.take(
      "restore",
      { kind: "record", space: SHEET, collection: "recipes", id: "s-1" },
      { by: "grace@spell", reason: "not spam" }
    )
  })
})

describe("SpaceFolders, limits (epic `atmosphere` P7)", () => {
  test("a thing over about 1 MB is refused, 413, over the ceiling, saying why;  nothing is written", async () => {
    const big = { kind: "insert" as const, collection: "recipes", id: "big", fields: { title: "x".repeat(1_100_000) } }
    await expect(folderAt("@family/cookbook", "ana@spell").apply([big], {})).rejects.toMatchObject({
      kind: "over the ceiling",
      message: expect.stringContaining("over the 1 MB one may hold:  it isn't saved, and stays on this page")
    })
    expect(onDisk(["@family", "cookbook"], "big")).toBeUndefined()
  })
})

describe("SpaceFolders, leaving and deleting (epic `atmosphere` P7)", () => {
  const BOX = "@family/leaving"

  test("export:  a zip of plain JSON for a member, what's taken down left out, and a note on leaving with the id", async () => {
    const asAna = folderAt(BOX, "ana@spell")
    await asAna.apply([insertOf("l-1", "Soup"), insertOf("l-2", "Stew")], {})
    await folders.takedowns.take(
      "hide",
      { kind: "record", space: BOX, collection: "recipes", id: "l-2" },
      { by: "grace@spell", reason: "doxxing" }
    )
    const answer = await fetch(`http://127.0.0.1:${port}/api/exports/spaces/${BOX}`, {
      headers: { "x-server-token": TOKEN, "x-person": "bo@spell" }
    })
    expect(answer.status).toBe(200)
    expect(answer.headers.get("content-disposition")).toContain('filename="family-leaving.zip"')
    const files = new Map(
      unzipped(Buffer.from(await answer.arrayBuffer())).map(([path, bytes]) => [path, bytes.toString("utf8")])
    )
    expect([...files.keys()].sort()).toEqual([
      "/about-this-export.txt",
      "/members.json",
      "/recipes.list.json",
      "/recipes/l-1.json"
    ])
    expect(JSON.parse(files.get("/recipes/l-1.json")!)).toMatchObject({ title: "Soup", by: "ana@spell" })
    expect(files.get("/about-this-export.txt")).toContain(
      "This space's id, @family, is Spell's own:  it has no keys yet"
    )
    expect(files.get("/about-this-export.txt")).toContain("Spell promises to hand those keys over")
    expect(JSON.parse(files.get("/members.json")!)).toContainEqual(expect.objectContaining({ person: "bo@spell" }))

    const refused = await fetch(`http://127.0.0.1:${port}/api/exports/spaces/${BOX}`, {
      headers: { "x-server-token": TOKEN, "x-person": "dee@spell" }
    })
    expect(refused.status).toBe(422)
  })

  test("delete:  only an admin;  every file gone but Spell's takedown log, and it opens afresh, empty", async () => {
    await expect(
      folderAt(BOX, "bo@spell").call(SPACE_MEMBER_OPERATIONS.deleteSpace, undefined, {})
    ).rejects.toMatchObject({ message: expect.stringContaining("Your role can't delete the space") })
    expect(await folderAt(BOX, "ana@spell").call(SPACE_MEMBER_OPERATIONS.deleteSpace, undefined, {})).toEqual({
      deleted: "@family"
    })
    expect(readdirSync(join(spaces, "@family", "leaving"))).toEqual(["__takedowns.json5"])
    expect((await folderAt(BOX, "ana@spell").list("recipes", {}, {})).rows).toEqual([])
  })
})

describe("SpaceFolders, files (epic `atmosphere` P15)", () => {
  const EVENTS = "@family/events"

  /** The space's files' address, with `name`, now that the server's port is known. */
  function filesAt(name?: string): string {
    const query = name === undefined ? "" : `?name=${encodeURIComponent(name)}`
    return `http://127.0.0.1:${port}/api/files/spaces/${EVENTS}${query}`
  }

  /** `PUT` one file as `person`. */
  function put(name: string, bytes: Uint8Array, person = "ana@spell", type = "image/png") {
    return fetch(filesAt(name), {
      method: "PUT",
      headers: { "x-server-token": TOKEN, "x-person": person, "content-type": type },
      body: bytes as BodyInit
    })
  }

  /** The hashes the space keeps bytes under. */
  function bytesKept(): string[] {
    const folder = join(spaces, "@family", "events", "__blobs")
    return existsSync(folder) ? readdirSync(folder).sort() : []
  }

  const PICTURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
  const MAP = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9])

  test("a picture added shows on the page:  its bytes and type, listed by name, read by a guest with no token", async () => {
    expect((await put("poster.png", PICTURE)).status).toBe(200)
    const listed = await fetch(filesAt(), { headers: { "x-person": "cy@spell" } })
    expect(await listed.json()).toEqual([{ name: "poster.png", mimeType: "image/png", size: PICTURE.length }])

    const picture = await fetch(filesAt("poster.png"), { headers: { "x-person": "cy@spell" } })
    expect([picture.status, picture.headers.get("content-type")]).toEqual([200, "image/png"])
    expect(new Uint8Array(await picture.arrayBuffer())).toEqual(PICTURE)
    expect(bytesKept()).toEqual([contentHash(PICTURE)])

    // never read direct:  not its record, nor its bytes
    const { cookie } = await credentialOf(EVENTS, "cy@spell")
    expect((await readDirect(`${EVENTS}/__files.list.json`, cookie)).status).toBe(404)
    expect((await readDirect(`${EVENTS}/__blobs/${contentHash(PICTURE)}`, cookie)).status).toBe(404)
  })

  test("a guest can't add one, nor someone outside;  a name not there is 404", async () => {
    expect((await put("guest.png", MAP, "cy@spell")).status).toBe(422)
    expect((await put("dee.png", MAP, "dee@spell")).status).toBe(422)
    expect((await fetch(filesAt("never.png"), { headers: { "x-person": "bo@spell" } })).status).toBe(404)
    expect((await fetch(filesAt("poster.png"), { headers: { "x-person": "dee@spell" } })).status).toBe(422)
    expect(bytesKept()).toEqual([contentHash(PICTURE)])
  })

  test("several at once, replacing one;  then one removed, and bytes nothing points to go", async () => {
    const files = [
      { name: "poster.png", mimeType: "image/png", base64: Buffer.from(MAP).toString("base64") },
      { name: "Bo's map.png", mimeType: "image/png", base64: Buffer.from(MAP).toString("base64") }
    ]
    const written = await fetch(filesAt(), {
      method: "POST",
      headers: { "x-server-token": TOKEN, "x-person": "bo@spell", "content-type": "application/json" },
      body: JSON.stringify({ files })
    })
    expect(written.status).toBe(200)
    expect(bytesKept()).toEqual([contentHash(MAP)])
    const removed = await fetch(filesAt("poster.png"), {
      method: "DELETE",
      headers: { "x-server-token": TOKEN, "x-person": "ana@spell" }
    })
    expect(removed.status).toBe(200)
    expect(await (await fetch(filesAt(), { headers: { "x-person": "ana@spell" } })).json()).toEqual([
      { name: "Bo's map.png", mimeType: "image/png", size: MAP.length }
    ])
    expect(bytesKept()).toEqual([contentHash(MAP)])
  })

  test("export:  the files as files, beside the rows, and a list of them", async () => {
    await put("poster.png", PICTURE)
    const answer = await fetch(`http://127.0.0.1:${port}/api/exports/spaces/${EVENTS}`, {
      headers: { "x-server-token": TOKEN, "x-person": "bo@spell" }
    })
    const files = new Map(unzipped(Buffer.from(await answer.arrayBuffer())))
    expect(new Uint8Array(files.get("/files/poster.png")!)).toEqual(PICTURE)
    expect(new Uint8Array(files.get("/files/Bo's map.png")!)).toEqual(MAP)
    expect(JSON.parse(files.get("/files.json")!.toString("utf8"))).toEqual([
      { name: "Bo's map.png", mimeType: "image/png", size: MAP.length, file: "files/Bo's map.png" },
      { name: "poster.png", mimeType: "image/png", size: PICTURE.length, file: "files/poster.png" }
    ])
    expect([...files.keys()].some((path) => path.includes("__"))).toBe(false)
  })

  test("taken down like a record:  hidden, 404;  deleted, its bytes go too", async () => {
    const target = { kind: "record" as const, space: EVENTS, collection: FILES_COLLECTION, id: "poster.png" }
    const BY = { by: "grace@spell", reason: "a stranger's photo, shared without consent" }
    await folders.takedowns.take("hide", target, BY)
    expect((await fetch(filesAt("poster.png"), { headers: { "x-person": "bo@spell" } })).status).toBe(404)
    expect(bytesKept()).toContain(contentHash(PICTURE))
    await folders.takedowns.take("delete", target, BY)
    expect(bytesKept()).toEqual([contentHash(MAP)])
  })
})

describe("SpaceBackups (epic `atmosphere` P7)", () => {
  /** A clock a test moves. */
  let now = new Date("2026-11-04T03:12:00Z")
  const backupsDir = mkdtempSync(join(tmpdir(), "spell-backups-"))
  const backups = new SpaceBackups({
    spacesDir: spaces,
    backupsDir,
    keep: 3,
    folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
    now: () => now
  })
  afterAll(() => rmSync(backupsDir, { recursive: true, force: true }))

  test("a round trip:  backed up, changed and deleted, brought back as it was", async () => {
    const ROUND = "@family/round-trip"
    await folderAt(ROUND, "ana@spell").apply([insertOf("b-1", "Before")], {})
    expect(await backups.backUp()).toBe("2026-11-04-0312")
    await folderAt(ROUND, "ana@spell").apply([updateOf("b-1", "After"), insertOf("b-2", "New")], {})
    await expect(backups.restore("@family/nowhere")).rejects.toThrow(/has no copy of @family\/nowhere/)
    expect(await backups.restore(ROUND)).toBe("2026-11-04-0312")
    folders.close()
    expect((await folderAt(ROUND, "ana@spell").list("recipes", {}, {})).rows.map(({ title }) => title)).toEqual([
      "Before"
    ])
  })

  test("a few kept:  the oldest goes;  a missed night is reported, and the next look backs up", async () => {
    for (const day of ["05", "06", "07"]) {
      now = new Date(`2026-11-${day}T03:12:00Z`)
      await backups.backUp()
    }
    expect(await backups.list()).toEqual(["2026-11-07-0312", "2026-11-06-0312", "2026-11-05-0312"])
    now = new Date("2026-11-07T20:00:00Z")
    expect(await backups.backUpIfDue()).toBeUndefined()
    now = new Date("2026-11-10T03:30:00Z")
    expect(await backups.status()).toMatchObject({ newest: "2026-11-07-0312", missedNights: 2 })
    const said: string[] = []
    expect(await backups.backUpIfDue((text) => said.push(text))).toBe("2026-11-10-0330")
    expect(said).toEqual(["Spell missed 2 nights' backups:  the last was 2026-11-07-0312."])
    expect(await backups.status()).toMatchObject({ missedNights: 0, count: 3 })
  })
})
