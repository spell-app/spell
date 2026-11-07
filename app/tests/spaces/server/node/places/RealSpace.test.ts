/**
 * A space kept in a real AT Protocol Space (epic `atmosphere` P14):  `SpaceFolders` and `RealSpace`, against Spell's
 * own Spaces host (`FakeSpaces`, the host from P13).
 * - The club's pantry:  its org's account makes the Space, Spell writes it as the org, Bo reads it with his own
 *   credential, passed through Spell to the host.
 * - Real HTTP, a real folder:  a temporary spell.spaces, a browser's `RemotePlace` writing it.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { RemotePlace, SPACE_MEMBER_OPERATIONS, SPACE_READS_PREFIX } from "spell/places"
import { DEFAULT_CORNER } from "spell/places/AtProtoPlace"
import { AtProtoPasswordSignIn } from "spell/places/AtProtoPasswordSignIn"
import type { AtProtoAccess } from "spell/places/AtProtoSignIn"
import { AtProtoSpace, SpaceRefusal } from "spell/places/AtProtoSpace"
import { SRV } from "spell/server"
import { FakeSpaces } from "spell/server/test/fakeSpaces"
import { SP } from "spell/parser/spell"
import { RealSpace } from "spell/app/spaces/server/node/places/RealSpace"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "real-space-token"
const HOST = "spaces.test"
const CLUB = "did:plc:club"
const BO = "did:plc:bo"
const PANTRY = "@club/pantry"
/** A recipe's record type:  the corner's, as `AtProtoSpacePlace` names it. */
const RECIPE = `${DEFAULT_CORNER}.recipe`

const spaces = mkdtempSync(join(tmpdir(), "spell-real-space-"))
const peopleStorage = new DiskStorage(spaces)
let fake: FakeSpaces
let club: AtProtoPasswordSignIn
let bo: AtProtoPasswordSignIn
let uri: string
let folders: SpaceFolders
let port: number
let server: ReturnType<typeof createServer>

beforeAll(async () => {
  fake = await new FakeSpaces().start([HOST])
  for (const [did, handle] of [
    [CLUB, "club"],
    [BO, "bo"]
  ] as const) {
    await fake.addAccount(did, { handle: `${handle}.${HOST}`, host: HOST, password: `${handle}-app-password` })
  }
  club = new AtProtoPasswordSignIn({ password: "club-app-password", network: fake.network })
  await club.signIn(`club.${HOST}`)
  bo = new AtProtoPasswordSignIn({ password: "bo-app-password", network: fake.network })
  await bo.signIn(`bo.${HOST}`)
  uri = (await AtProtoSpace.create(club, { skey: "pantry", network: fake.network })).uri

  for (const id of ["ana", "bo"]) {
    mkdirSync(join(spaces, "@spell", `${id}@`), { recursive: true })
    writeFileSync(join(spaces, "@spell", `${id}@`, "__me.json5"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  // the pantry:  Ana its admin, on Spell's list alone;  kept in the club's Space
  const pantry = join(spaces, "@club", "pantry")
  mkdirSync(join(pantry, "__members"), { recursive: true })
  mkdirSync(join(pantry, "__settings"), { recursive: true })
  const ana = { $type: "Membership", person: { $ref: "Person#ana@spell" }, role: "admin" }
  writeFileSync(join(pantry, "__members", "ana@spell.json5"), JSON.stringify(ana))
  writeFileSync(join(pantry, "__settings", "space.json5"), JSON.stringify({ realSpace: uri }))

  folders = new SpaceFolders({
    folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
    people: new PeopleStore(peopleStorage),
    personFor: (request) => request.get("x-person") ?? "ana@spell",
    orgAccess: async () => club,
    network: fake.network,
    queueFile: join(spaces, "queue", "space-writes.json")
  })
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  folders.route({ router, guard })
  server = createServer(SRV.toListener(router.handle))
  port = await SRV.listenPreferred(server)
  guard.allowPort(port)
})

afterAll(async () => {
  folders.close()
  peopleStorage.close()
  await new Promise<void>((done) => {
    server.closeAllConnections()
    server.close(() => done())
  })
  await fake.close()
  rmSync(spaces, { recursive: true, force: true })
})

/** A browser's place on the pantry, asking as `person`. */
function pantryAs(person: string): RemotePlace {
  const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${PANTRY}`, token: TOKEN })
  // who's asking, as sign-in will say:  a header, on every request it sends
  const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown }).answerTo
  ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
    return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": person } }, context)
  }
  return remote
}

/** The Space as Bo reaches it:  his own credential, its reads through Spell to the host. */
function spaceAsBo(): AtProtoSpace {
  const through = () => `http://127.0.0.1:${port}${SPACE_READS_PREFIX}/${PANTRY}/__host`
  return new AtProtoSpace({ uri, access: bo, network: fake.network, through })
}

describe("A space kept in a real Space (epic `atmosphere` P14)", () => {
  test("a member added with their account is on the Space's list;  their write lands as the org's record, by them", async () => {
    await pantryAs("ana@spell").call(SPACE_MEMBER_OPERATIONS.add, { person: "bo@spell", role: "member", did: BO }, {})
    const org = new AtProtoSpace({ uri, access: club, network: fake.network })
    expect((await org.members()).map(({ did }) => did)).toContain(BO)

    await pantryAs("bo@spell").apply(
      [{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal" } }],
      {}
    )
    expect(JSON.parse(readFileSync(join(spaces, "@club", "pantry", "recipes", "r-1.json"), "utf8"))).toMatchObject({
      title: "Dal",
      by: "bo@spell"
    })
    expect(await (await folders.realSpaceAt(PANTRY))!.settled).toBe(true)
    const [record] = await org.records(CLUB, RECIPE)
    expect(record).toMatchObject({ rkey: "r-1", value: { $type: RECIPE, title: "Dal", by: "bo@spell" } })
    expect(record!.value).not.toHaveProperty("owner")
  })

  test("Bo reads it with his own credential, passed through Spell to the host, which decides", async () => {
    const asBo = spaceAsBo()
    expect((await asBo.records(CLUB, RECIPE)).map(({ value }) => value.title)).toEqual(["Dal"])
    // the credential went through Spell, to the host, unchanged
    expect(fake.asksOf("com.atproto.space.getSpaceCredential").length).toBeGreaterThan(0)
  })

  test("taken off Spell's list, he's off the Space's:  the HOST refuses his next credential", async () => {
    await pantryAs("ana@spell").call(SPACE_MEMBER_OPERATIONS.remove, { person: "bo@spell" }, {})
    const org = new AtProtoSpace({ uri, access: club, network: fake.network })
    expect((await org.members()).map(({ did }) => did)).not.toContain(BO)
    const refusal = await spaceAsBo()
      .records(CLUB, RECIPE)
      .catch((error: unknown) => error)
    expect(refusal).toBeInstanceOf(SpaceRefusal)
    expect(refusal).toMatchObject({ error: "SpaceNotFound" })
  })

  test("the pass-through passes only a Space's reading calls, and only for a space kept in one", async () => {
    const ask = (path: string) => fetch(`http://127.0.0.1:${port}${SPACE_READS_PREFIX}/${path}`)
    expect((await ask(`${PANTRY}/__host/xrpc/com.atproto.space.putRecord`)).status).toBe(404)
    expect((await ask(`${PANTRY}/__host/xrpc/com.atproto.server.createSession`)).status).toBe(404)
    expect((await ask(`@club/elsewhere/__host/xrpc/com.atproto.space.listRepos`)).status).toBe(404)
  })
})

describe("RealSpace's retry queue (Q19 A)", () => {
  test("a write the host didn't take is kept on the disk, and goes once it answers;  in order", async () => {
    const file = join(spaces, "queue", "retry.json")
    let failures = 1
    const flaky: AtProtoAccess = Object.assign(Object.create(club) as AtProtoAccess, {
      fetch: (path: string, init?: RequestInit) => {
        if (failures-- > 0) return Promise.reject(new TypeError("fetch failed"))
        return club.fetch(path, init)
      }
    })
    const real = new RealSpace({
      address: PANTRY,
      uri,
      access: flaky,
      network: fake.network,
      storage: new SRV.FileStorage(file),
      retry: 20
    })
    real.written([
      { collection: "recipes", id: "q-1", row: { id: "q-1", title: "Soup" } },
      { collection: "recipes", id: "q-2", row: { id: "q-2", title: "Bread" } }
    ])
    expect(await real.settled).toBe(false)
    expect(Object.values(JSON.parse(readFileSync(file, "utf8")) as Record<string, string>)[0]).toMatch(/q-1.*q-2/s)
    await vi.waitFor(() => expect(real.unsent).toEqual([]))
    const org = new AtProtoSpace({ uri, access: club, network: fake.network })
    expect((await org.records(CLUB, RECIPE)).map(({ rkey }) => rkey)).toEqual(expect.arrayContaining(["q-1", "q-2"]))
    real.stop()
  })
})
