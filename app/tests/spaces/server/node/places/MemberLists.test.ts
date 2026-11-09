/**
 * Member lists that follow roles, and their audit (epic `atmosphere` P24):  a term ending, someone leaving the org,
 * a role moving;  `MemberLists.audit()` on a list edited by hand;  a real Space's list brought into step
 * (`MemberLists.follow()`), against Spell's own Spaces host (`FakeSpaces`, P13).
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team, Fay the Finance Team, Cy the project
 *   2026-q4 under the Events Team;  Dee and Vic are in RS and manage nothing;  Zed isn't in RS.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { AtProtoPasswordSignIn } from "spell/places/AtProtoPasswordSignIn"
import { AtProtoSpace } from "spell/places/AtProtoSpace"
import { FakeSpaces } from "spell/server/test/fakeSpaces"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { MemberLists } from "spell/app/spaces/server/node/places/MemberLists"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** RS's people, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = {
  ana: "editor",
  ada: "editor",
  bo: "editor",
  fay: "editor",
  cy: "editor",
  vic: "viewer"
}

/** Each person's AT Protocol account, on the test host. */
const DIDS: Record<string, string> = Object.fromEntries(
  [...Object.keys(RS), "dee", "zed"].map((id) => [id, `did:plc:${id}`])
)

const HOST = "spaces.test"
const RS_DID = "did:plc:rs"
const EVENTS_PRIVATE = "events_team@rs/__private/notes"
const FINANCE_PRIVATE = "finance_team@rs/__private/budget"
const ORG_SHARED = "@rs/minutes"

const root = mkdtempSync(join(tmpdir(), "spell-member-lists-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
/** A test's clock, before the real one (a real Space's `SpaceFolders` reads that):  moved on to end a term on its date. */
let today = new Date("2026-01-10T12:00:00Z")
const roles = new OrgRoles({ people, now: () => today })

/** The folder on disk of `address`. */
const folderOf = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))

/** RS's members of the folder at `address`, on the test's clock. */
const membersAt = (address: string) =>
  new SpaceMembers({ address, storage: new DiskStorage(folderOf(address)), people, orgRoles: roles })

/**
 * Wait for the people store's list of the folder at `address` to show `name`:  it follows the disk through a watcher,
 * which the audit's walk reads.
 */
async function listed(address: string, name: string): Promise<void> {
  const path = SP.SpellUrls.folderFor(address)!.path
  await vi.waitFor(async () => expect(await storage.list(path)).toContain(name))
}

/** Who of RS (and Zed) reads the folder at `address`. */
async function readersOf(address: string): Promise<string[]> {
  const members = membersAt(address)
  const readers: string[] = []
  for (const id of Object.keys(DIDS)) if ((await members.memberOf(`${id}@rs`))?.canRead) readers.push(id)
  return readers
}

beforeAll(async () => {
  for (const id of Object.keys(DIDS)) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id, did: DIDS[id] }))
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
  await roles.addTeam("rs", { id: "finance_team", name: "Finance Team" }, { by: "ada@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
  await roles.give("rs", { role: "team-manager", person: "fay@rs", of: "finance_team" }, { by: "ada@rs" })
  await roles.addProject("rs", { id: "2026-q4", name: "Fall 2026", team: "events_team" }, { by: "bo@rs" })
  await roles.give("rs", { role: "project-manager", person: "cy@rs", of: "2026-q4" }, { by: "bo@rs" })
  for (const address of [EVENTS_PRIVATE, FINANCE_PRIVATE, ORG_SHARED]) mkdirSync(folderOf(address), { recursive: true })
})

afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("lists follow roles, on Spell's own server", () => {
  test("a term that ends on its date takes them off the private space the moment it ends", async () => {
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    await roles.give(
      "rs",
      { role: "team-manager", person: "vic@rs", of: "finance_team", end: tomorrow },
      { by: "ada@rs" }
    )
    expect(await readersOf(FINANCE_PRIVATE)).toContain("vic")
    today = new Date(tomorrow.getTime() + 1000)
    expect(await readersOf(FINANCE_PRIVATE)).not.toContain("vic")
    // the record of who held it stays
    expect((await roles.log("rs")).some((change) => change.action === "give" && change.person === "vic@rs")).toBe(true)
  })

  test("a role moving:  Bo's term ends, Cy is named;  the list follows at once", async () => {
    await roles.end("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
    await roles.give("rs", { role: "team-manager", person: "cy@rs", of: "events_team" }, { by: "ada@rs" })
    expect(await readersOf(EVENTS_PRIVATE)).toContain("cy")
    expect(await readersOf(EVENTS_PRIVATE)).not.toContain("bo")
  })

  test("someone leaving the org leaves every list, their terms ended;  what they wrote stays", async () => {
    const post = join(folderOf(ORG_SHARED), "posts", "p-1.json")
    mkdirSync(join(folderOf(ORG_SHARED), "posts"), { recursive: true })
    writeFileSync(post, JSON.stringify({ id: "p-1", text: "Budget's in", by: "fay@rs" }))
    // nobody else leaves her:  Vic manages nothing
    await expect(membersAt(ORG_SHARED).remove("fay@rs", "vic@rs")).rejects.toThrow(/may not take fay@rs out/)

    await membersAt(ORG_SHARED).remove("fay@rs", "fay@rs")
    expect(await readersOf(FINANCE_PRIVATE)).not.toContain("fay")
    expect(await readersOf(ORG_SHARED)).not.toContain("fay")
    expect(await roles.isInOrg("rs", "fay@rs")).toBe(false)
    expect((await roles.terms("rs")).some((term) => term.person === "fay@rs")).toBe(false)
    const roster = await people.roster("rs")
    const ended = roster!.terms.items.filter((term) => term.person && people.addressOf(term.person) === "fay@rs")
    expect(ended.map((term) => !!term.end)).toEqual([true])
    expect((await roles.log("rs")).at(-1)).toMatchObject({ action: "leave", by: "fay@rs", person: "fay@rs" })
    expect(JSON.parse((await storage.read("@rs/minutes/posts/p-1.json")) as string)).toMatchObject({ by: "fay@rs" })
  })
})

describe("the audit", () => {
  const lists = new MemberLists({
    people,
    orgRoles: roles,
    membersAt,
    realSpaceAt: async () => undefined
  })

  test("RS's lists agree with its roles", async () => {
    expect(await lists.audit("rs")).toEqual([])
  })

  test("a list edited by hand, an org file's manager who manages nothing, a term held from outside RS", async () => {
    const own = join(folderOf(EVENTS_PRIVATE), "__members")
    mkdirSync(own, { recursive: true })
    writeFileSync(
      join(own, "zed@rs.json5"),
      JSON.stringify({ $type: "Membership", person: { $ref: "Person#zed@rs" }, role: "editor" })
    )
    await listed(EVENTS_PRIVATE, "__members/")
    const org = (await people.org("rs"))!
    const dee = (await people.person("dee", "rs")).person!
    await people.setRole(org, dee, "manager")
    await roles.give("rs", { role: "project-manager", person: "vic@rs", of: "2026-q4" }, { by: "ada@rs" })
    const vic = (await people.person("vic", "rs")).person!
    await people.removeMembership((await people.org("rs"))!, vic)

    const said = (await lists.audit("rs")).map(({ address, person, said }) => ({ address, person, said }))
    expect(said).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: "@rs/__admin",
          person: "vic@rs",
          said: expect.stringMatching(/isn't in @rs/)
        }),
        expect.objectContaining({ address: "@rs", person: "dee@rs", said: expect.stringMatching(/nothing to manage/) }),
        expect.objectContaining({
          address: EVENTS_PRIVATE,
          person: "zed@rs",
          said: expect.stringMatching(/its own list has zed@rs.*doesn't count here/)
        })
      ])
    )
    // and it says who the roles put there that the hand-made list leaves out
    expect(said.some(({ address, person }) => address === EVENTS_PRIVATE && person === "cy@rs")).toBe(true)

    // put back for what follows
    rmSync(own, { recursive: true })
    await people.setRole((await people.org("rs"))!, dee, "editor")
    await roles.end("rs", { role: "project-manager", person: "vic@rs", of: "2026-q4" }, {})
    await people.setRole((await people.org("rs"))!, vic, "viewer")
    expect(await lists.audit("rs")).toEqual([])
  })
})

describe("a real Space's list, in step with the roles (P14's spaces)", () => {
  let fake: FakeSpaces
  let rs: AtProtoPasswordSignIn
  let space: AtProtoSpace
  let folders: SpaceFolders

  /** Who's on the Space's list, by id, the org's own account left out. */
  const onTheSpace = async () =>
    (await space.members())
      .map(({ did }) => did.replace("did:plc:", ""))
      .filter((id) => id !== "rs")
      .sort()

  beforeAll(async () => {
    fake = await new FakeSpaces().start([HOST])
    await fake.addAccount(RS_DID, { handle: `rs.${HOST}`, host: HOST, password: "rs-app-password" })
    for (const [id, did] of Object.entries(DIDS)) await fake.addAccount(did, { handle: `${id}.${HOST}`, host: HOST })
    rs = new AtProtoPasswordSignIn({ password: "rs-app-password", network: fake.network })
    await rs.signIn(`rs.${HOST}`)
    space = await AtProtoSpace.create(rs, { skey: "events-notes", network: fake.network })
    mkdirSync(join(folderOf(EVENTS_PRIVATE), "__settings"), { recursive: true })
    writeFileSync(join(folderOf(EVENTS_PRIVATE), "__settings", "space.json5"), JSON.stringify({ realSpace: space.uri }))
    await listed(EVENTS_PRIVATE, "__settings/")
    folders = new SpaceFolders({
      folderFor: folderOf,
      people,
      orgAccess: async () => rs,
      network: fake.network,
      queueFile: join(root, "queue", "space-writes.json")
    })
  })

  afterAll(async () => {
    folders.close()
    await fake.close()
  })

  test("following puts each Manager on the Space's list;  a role changing moves it at once", async () => {
    await folders.lists.follow("rs")
    // the Board, the Admins, and the Events Team's Manager:  Cy, since Bo's term ended
    expect(await onTheSpace()).toEqual(["ada", "ana", "cy"])

    await folders.orgRoles.give("rs", { role: "team-manager", person: "dee@rs", of: "events_team" }, { by: "ada@rs" })
    expect(await onTheSpace()).toEqual(["ada", "ana", "cy", "dee"])
    await folders.orgRoles.end("rs", { role: "team-manager", person: "cy@rs", of: "events_team" }, { by: "ada@rs" })
    expect(await onTheSpace()).toEqual(["ada", "ana", "dee"])
  })

  test("the audit finds an account put on the Space by hand;  following takes it off", async () => {
    await space.putMember(DIDS.zed!, { read: true, write: false })
    const differences = await folders.lists.audit("rs")
    expect(differences).toEqual([
      expect.objectContaining({
        address: EVENTS_PRIVATE,
        said: expect.stringMatching(/did:plc:zed is on its real Space's list/)
      })
    ])
    const changes = await folders.lists.followAll()
    expect(changes).toEqual([{ address: EVENTS_PRIVATE, did: DIDS.zed, action: "remove" }])
    expect(await onTheSpace()).toEqual(["ada", "ana", "dee"])
    expect(await folders.lists.audit("rs")).toEqual([])
  })
})
