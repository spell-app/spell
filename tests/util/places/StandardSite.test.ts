/**
 * `StandardSite` and `AtProtoPasswordSignIn` against `FakeAtmosphere`:  a page published as a Standard.site document,
 * signed in with an app password (epic `atmosphere` P9).
 * - The real network:  manual test M of P9, with a throwaway account.
 */
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { AtProtoPasswordSignIn, STANDARD_SITE_DOCUMENT, StandardSite } from "spell/util/places"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"

const OWEN = "did:plc:owen"
const PASSWORD = "abcd-efgh-ijkl-mnop"
const PAGE = {
  site: "https://spell.example/",
  path: "guides/atmosphere/spaces-and-spell.html",
  title: "Spell and AT Protocol Spaces",
  description: "Where Spaces fits Spell"
}

describe("AtProtoPasswordSignIn", () => {
  let network: FakeAtmosphere

  beforeEach(async () => {
    network = await new FakeAtmosphere().start(["one"])
    network.addAccount(OWEN, { handle: "owen.test", host: "one", password: PASSWORD })
  })

  afterEach(() => network.close())

  it("signs in by handle with an app password, and sends as them to their own host", async () => {
    const signIn = new AtProtoPasswordSignIn({ password: PASSWORD, network: network.network })
    await signIn.signIn("@owen.test")
    expect(signIn).toMatchObject({ status: "signed in", did: OWEN })
    expect(network.asksOf("com.atproto.server.createSession")[0]?.params).toEqual({
      identifier: OWEN,
      password: PASSWORD
    })
    const answer = await signIn.fetch(`/xrpc/com.atproto.repo.listRecords?repo=${OWEN}&collection=x`)
    expect(answer.ok).toBe(true)
  })

  it("says why a wrong password fails, and stays signed out", async () => {
    const signIn = new AtProtoPasswordSignIn({ password: "wrong", network: network.network })
    await expect(signIn.signIn(OWEN)).rejects.toThrow(/Invalid identifier or password/)
    expect(signIn).toMatchObject({ status: "signed out", did: undefined })
    expect(signIn.problem).toMatch(/Invalid identifier or password/)
    expect(() => signIn.fetch("/xrpc/x")).toThrow(/nobody's signed in/)
  })

  it("refuses a handle nobody has", async () => {
    const signIn = new AtProtoPasswordSignIn({ password: PASSWORD, network: network.network })
    await expect(signIn.signIn("nobody.test")).rejects.toThrow(/Unable to resolve handle/)
  })
})

describe("StandardSite", () => {
  let network: FakeAtmosphere
  let site: StandardSite

  beforeEach(async () => {
    network = await new FakeAtmosphere().start(["one"])
    network.addAccount(OWEN, { handle: "owen.test", host: "one", password: PASSWORD })
    const signIn = new AtProtoPasswordSignIn({ password: PASSWORD, network: network.network })
    await signIn.signIn("owen.test")
    site = new StandardSite({ signIn, network: network.network })
  })

  afterEach(() => network.close())

  it("writes a page as a site.standard.document that describes it and links to it", async () => {
    const key = StandardSite.keyFor(PAGE.path)
    const published = await site.publish(key, PAGE, new Date("2026-11-04T10:00:00Z"))

    expect(key).toBe("guides.atmosphere.spaces-and-spell")
    expect(published.uri).toBe(`at://${OWEN}/site.standard.document/guides.atmosphere.spaces-and-spell`)
    expect(published.isNew).toBe(true)
    const held = network.recordsOf(OWEN, STANDARD_SITE_DOCUMENT).get(key)
    expect(held?.value).toEqual({
      $type: "site.standard.document",
      site: "https://spell.example",
      path: "/guides/atmosphere/spaces-and-spell.html",
      title: "Spell and AT Protocol Spaces",
      description: "Where Spaces fits Spell",
      publishedAt: "2026-11-04T10:00:00.000Z"
    })
    expect(published.version).toBe(held?.cid)
    expect(network.asksOf("com.atproto.repo.putRecord")[0]?.as).toBe(OWEN)
  })

  it("publishing again updates the one record:  first published kept, updated said", async () => {
    const key = StandardSite.keyFor(PAGE.path)
    await site.publish(key, PAGE, new Date("2026-11-04T10:00:00Z"))
    const again = await site.publish(key, { ...PAGE, title: "Spaces and Spell" }, new Date("2026-11-05T09:00:00Z"))

    expect(again.isNew).toBe(false)
    const records = network.recordsOf(OWEN, STANDARD_SITE_DOCUMENT)
    expect(records.size).toBe(1)
    expect(records.get(key)?.value).toMatchObject({
      title: "Spaces and Spell",
      publishedAt: "2026-11-04T10:00:00.000Z",
      updatedAt: "2026-11-05T09:00:00.000Z"
    })
    // checked against the version it read, so another device's change in between isn't written over
    expect(network.asksOf("com.atproto.repo.putRecord")[1]?.params.swapRecord).toBeDefined()
  })

  it("says the tag a page points back with, and names pages by their path", () => {
    expect(StandardSite.linkTagFor("at://did:plc:owen/site.standard.document/x")).toBe(
      '<link rel="site.standard.document" href="at://did:plc:owen/site.standard.document/x" />'
    )
    expect(StandardSite.keyFor("/guides/server.html")).toBe("guides.server")
    expect(() => StandardSite.keyFor("/.html")).toThrow(TypeError)
  })

  it("won't start with nobody signed in", () => {
    const nobody = new AtProtoPasswordSignIn({ password: PASSWORD, network: network.network })
    expect(() => new StandardSite({ signIn: nobody })).toThrow(/nobody's signed in/)
  })
})
