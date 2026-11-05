/**
 * `AtProtoSpace` and `AtProtoSpacePlace` against `FakeSpaces`:  Spell's Spaces seam, the trial of epic `atmosphere` P11.
 * - An org's account (`@family`'s test DID) makes the space, as Q10 has it;  Ana is a member, Bo isn't.
 * - Everyone signs in with an app password, `AtProtoPasswordSignIn`:  no new sign-in.
 * - The same steps against the real Spaces alpha:  `tests/server/spacesTrial.test.ts`, skipped unless asked.
 */
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { MemoryPlace, PlaceCopy } from "spell/util/places"
import { AtProtoPasswordSignIn } from "spell/util/places/AtProtoPasswordSignIn"
import {
  AtProtoSpace,
  MEMBERSPACE_POLICY,
  SPELL_SPACE_TYPE,
  SpaceRefusal,
  memberAccessFor,
  policyFor,
  settingsFor
} from "spell/util/places/AtProtoSpace"
import { AtProtoSpacePlace } from "spell/util/places/AtProtoSpacePlace"
import { SpaceCredential, didKeyFor, publicKeyOf } from "spell/util/places/SpaceCredential"
import { FakeSpaces } from "spell/server/test/fakeSpaces"

const HOST = "spaces-alpha.host"
const FAMILY = "did:plc:family"
const ANA = "did:plc:ana"
const BO = "did:plc:bo"
const RECIPE = "app.spell.data.recipe"

/** The real alpha's MAC key, from its test account's document (read 2026-11-04):  a real P-256 key to decode. */
const ALPHA_KEM_KEY = "zDnaercjVwoY3fCip6eBovUjLt8eFssA1gprLyiP9azzMH8uf"

/** The refusal `promise` ends in. */
async function refusalOf(promise: Promise<unknown>): Promise<SpaceRefusal> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown
  )
  expect(error).toBeInstanceOf(SpaceRefusal)
  return error as SpaceRefusal
}

describe("AtProtoSpace", () => {
  let fake: FakeSpaces
  const signIns: Record<string, AtProtoPasswordSignIn> = {}

  /** The space as `did` reaches it. */
  function spaceAs(did: string | undefined, uri: string): AtProtoSpace {
    return new AtProtoSpace({ uri, ...(did && { access: signIns[did] }), network: fake.network })
  }

  /** A new space, made by the org. */
  function familySpace(skey = "recipes", settings = { publicRead: false, publicWrite: false }) {
    return AtProtoSpace.create(signIns[FAMILY]!, { skey, settings, network: fake.network })
  }

  beforeEach(async () => {
    fake = await new FakeSpaces().start([HOST])
    for (const [did, handle] of [
      [FAMILY, "family"],
      [ANA, "ana"],
      [BO, "bo"]
    ] as const) {
      await fake.addAccount(did, { handle: `${handle}.${HOST}`, host: HOST, password: `${handle}-app-password` })
      signIns[did] = new AtProtoPasswordSignIn({ password: `${handle}-app-password`, network: fake.network })
      await signIns[did].signIn(`${handle}.${HOST}`)
    }
  })

  afterEach(async () => {
    await fake.close()
  })

  test("the org makes a space:  its authority is the org's DID, its type Spell's, its key the folder's", async () => {
    const space = await familySpace()
    expect(space.uri).toBe(`at://${FAMILY}/space/${SPELL_SPACE_TYPE}/recipes`)
    expect(space.authority).toBe(FAMILY)
    expect(await space.settings()).toMatchObject({ publicRead: false, publicWrite: false })
    expect((await refusalOf(familySpace())).error).toBe("SpaceAlreadyExists")
  })

  test("a member is given a credential, reads the org's record with its MAC checked, and writes their own", async () => {
    const space = await familySpace()
    await space.putMember(ANA, { read: true, write: true })
    expect(await space.members()).toEqual([{ did: ANA, read: true, write: true }])
    await space.put(RECIPE, "r-1", { title: "Dal" })

    const asAna = spaceAs(ANA, space.uri)
    const credential = await asAna.credential()
    expect(credential.claims).toMatchObject({ iss: FAMILY, sub: space.uri, cnf: { kid: credential.key.didKey } })
    expect(await asAna.record(FAMILY, RECIPE, "r-1")).toMatchObject({ value: { title: "Dal" }, mac: "checked" })

    await asAna.put(RECIPE, "r-1", { title: "Ana's dal" })
    expect(fake.recordsOf(space.uri, FAMILY).get(`${RECIPE}/r-1`)?.value).toEqual({ title: "Dal" })
    expect((await space.writers()).map(({ did }) => did).sort()).toEqual([ANA, FAMILY])
    expect(fake.asksOf("com.atproto.space.getRecord")[0]?.audience).toBe(FAMILY)
  })

  test("someone who's no member is refused a credential:  role", async () => {
    const space = await familySpace()
    const refusal = await refusalOf(spaceAs(BO, space.uri).credential())
    expect([refusal.error, refusal.kind, refusal.cause?.whyNot]).toEqual(["UserNotAuthorized", "refused", "role"])
    expect((await refusalOf(spaceAs(BO, space.uri).putMember(BO, { read: true, write: true }))).error).toBe(
      "NotSpaceOwner"
    )
  })

  test("a member's writes are tracked only while they write:  a non-member's never, until publicWrite", async () => {
    const space = await familySpace()
    await space.put(RECIPE, "r-1", { title: "Dal" })
    await spaceAs(BO, space.uri).put(RECIPE, "b-1", { title: "Bo's" })
    expect((await space.writers()).map(({ did }) => did)).toEqual([FAMILY])
    expect(fake.recordsOf(space.uri, BO).size).toBe(1)

    await space.changeSettings({ publicRead: false, publicWrite: true })
    await spaceAs(BO, space.uri).put(RECIPE, "b-2", { title: "Bo's again" })
    expect((await space.writers()).map(({ did }) => did)).toContain(BO)
  })

  test("removed:  out of the writer set, and refused a new credential;  the old one reads until it ends", async () => {
    const space = await familySpace()
    await space.putMember(ANA, { read: true, write: true })
    await space.put(RECIPE, "r-1", { title: "Dal" })
    const asAna = spaceAs(ANA, space.uri)
    await asAna.put(RECIPE, "a-1", { title: "Ana's" })
    await asAna.credential()

    await space.removeMember(ANA)
    expect((await space.writers()).map(({ did }) => did)).toEqual([FAMILY])
    expect((await asAna.record(FAMILY, RECIPE, "r-1")).value).toEqual({ title: "Dal" })
    asAna.forgetCredential()
    expect((await refusalOf(asAna.credential())).error).toBe("UserNotAuthorized")
  })

  test("publicRead:  anyone, signed in or not, is given a credential and reads", async () => {
    const space = await familySpace("events", { publicRead: true, publicWrite: false })
    await space.put(RECIPE, "e-1", { title: "Picnic" })
    expect((await spaceAs(undefined, space.uri).record(FAMILY, RECIPE, "e-1")).value).toEqual({ title: "Picnic" })
    expect((await spaceAs(BO, space.uri).records(FAMILY, RECIPE)).map(({ rkey }) => rkey)).toEqual(["e-1"])
  })

  test("deleted:  no more credentials, SpaceDeleted, and its own records gone;  a member's stay theirs", async () => {
    const space = await familySpace()
    await space.putMember(ANA, { read: true, write: true })
    await space.put(RECIPE, "r-1", { title: "Dal" })
    await spaceAs(ANA, space.uri).put(RECIPE, "a-1", { title: "Ana's" })
    await space.delete()
    const refusal = await refusalOf(spaceAs(ANA, space.uri).credential())
    expect([refusal.error, refusal.kind]).toEqual(["SpaceDeleted", "not found"])
    expect(fake.recordsOf(space.uri, FAMILY).size).toBe(0)
    expect(fake.recordsOf(space.uri, ANA).size).toBe(1)
  })

  test("clearing my records leaves the space, and my place in the writer set", async () => {
    const space = await familySpace()
    await space.put(RECIPE, "r-1", { title: "Dal" })
    await space.clearMine()
    expect(await space.records(FAMILY, RECIPE)).toEqual([])
    expect((await space.writers()).map(({ did }) => did)).toEqual([FAMILY])
  })
})

describe("Spell's words as Spaces'", () => {
  test("a space's settings are a member space's two flags, both ways", () => {
    expect(policyFor({ publicRead: true, publicWrite: false })).toEqual({
      $type: MEMBERSPACE_POLICY,
      publicRead: true,
      publicWrite: false
    })
    expect(settingsFor({ $type: MEMBERSPACE_POLICY, publicWrite: true })).toEqual({
      publicRead: false,
      publicWrite: true
    })
    expect(settingsFor({ $type: "com.atproto.personalspace.policy" })).toEqual({
      publicRead: false,
      publicWrite: false
    })
  })

  test("a member's role is a read and a write flag:  a guest reads, managing stays Spell's", () => {
    expect(memberAccessFor({ canRead: true, canWrite: false })).toEqual({ read: true, write: false })
    expect(memberAccessFor({ canRead: true, canWrite: true })).toEqual({ read: true, write: true })
  })
})

describe("SpaceCredential", () => {
  test("a did:key is P-256's, zDna..., and reads back as the same key", async () => {
    const { didKey } = await SpaceCredential.newKey()
    expect(didKey).toMatch(/^did:key:zDna/)
    expect(await didKeyFor(await publicKeyOf(didKey, "ECDSA"))).toBe(didKey)
  })

  test("the real alpha's MAC key decodes:  a compressed point put back together", async () => {
    const key = await publicKeyOf(ALPHA_KEM_KEY, "ECDH")
    expect(await didKeyFor(key)).toBe(`did:key:${ALPHA_KEM_KEY}`)
  })
})

describe("AtProtoSpacePlace", () => {
  let fake: FakeSpaces
  const signIns: Record<string, AtProtoPasswordSignIn> = {}

  beforeEach(async () => {
    fake = await new FakeSpaces().start([HOST])
    for (const [did, handle] of [
      [FAMILY, "family"],
      [ANA, "ana"]
    ] as const) {
      await fake.addAccount(did, { handle: `${handle}.${HOST}`, host: HOST, password: "pw" })
      signIns[did] = new AtProtoPasswordSignIn({ password: "pw", network: fake.network })
      await signIns[did].signIn(did)
    }
  })

  afterEach(async () => {
    await fake.close()
  })

  test("the recipe box saved to an org's space, as the org's account, and read back", async () => {
    const space = await AtProtoSpace.create(signIns[FAMILY]!, { skey: "recipes", network: fake.network })
    await space.putMember(ANA, { read: true, write: true })
    const box = new MemoryPlace({
      collections: {
        recipes: [
          { id: "r-1", title: "Dal", serves: 4 },
          { id: "r-2", title: "Soup", serves: 2 }
        ]
      }
    })
    const asFamily = new AtProtoSpacePlace({ space, me: () => signIns[FAMILY]!.did })
    expect(await new PlaceCopy({ from: box, to: asFamily }).copy("recipes")).toEqual({ inserted: 2, updated: 0 })

    const anaSpace = new AtProtoSpace({ uri: space.uri, access: signIns[ANA], network: fake.network })
    const asAna = new AtProtoSpacePlace({ space: anaSpace, me: () => signIns[ANA]!.did })
    const { rows } = await asAna.list("recipes", {})
    expect(rows).toEqual([
      { $type: RECIPE, title: "Dal", serves: 4, id: "r-1", owner: FAMILY },
      { $type: RECIPE, title: "Soup", serves: 2, id: "r-2", owner: FAMILY }
    ])
    expect(asAna.canWrite({ collection: "recipes", row: rows[0] })).toEqual({ canWrite: false, whyNot: "owner" })
    const refused = await asAna
      .apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" } }])
      .catch((error: unknown) => error as SpaceRefusal)
    expect(refused).toMatchObject({ kind: "refused" })

    await asAna.apply([{ kind: "insert", collection: "recipes", id: "a-1", fields: { title: "Ana's tacos" } }])
    const after = await asFamily.list("recipes", {})
    expect(after.rows.map(({ id, owner }) => `${id as string} ${owner as string}`)).toEqual([
      `r-1 ${FAMILY}`,
      `r-2 ${FAMILY}`,
      `a-1 ${ANA}`
    ])
  })
})
