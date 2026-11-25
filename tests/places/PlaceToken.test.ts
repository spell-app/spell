import { afterEach, describe, expect, test } from "vite-plus/test"

import { TokenService } from "spell/server/test/tokenService"
import { PlaceError, PlaceToken, RestPlace, tokenRefreshMint, tokenServiceMint } from "spell/places"

/**
 * A token made from a secret, kept, and made again before it runs out (epic `data` P49, J255):
 * against the stand-in token service (J263).
 */

/** What closes each service a test started. */
const closing: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(closing.splice(0).map((close) => close()))
})

/** A token service knowing one key, and a token kept from it, on a clock a test moves. */
async function served(seconds = 3600) {
  const service = new TokenService({ keys: ["k-1:sesame"], seconds })
  const { url, close } = await service.serve()
  closing.push(close)
  const clock = { now: 1_000_000 }
  const held: string[] = []
  const token = new PlaceToken({
    keyNamed: "ACME_API_KEY",
    keyFrom: (name) => (name === "ACME_API_KEY" ? "k-1:sesame" : undefined),
    mint: tokenServiceMint(`${url}/api-keys/{key id}/token`),
    hold: (_label, secret) => held.push(secret),
    now: () => clock.now
  })
  return { service, url, token, clock, held }
}

describe("PlaceToken", () => {
  test("made once, kept, and made again a minute before it runs out", async () => {
    const { service, token, clock, held } = await served(600)
    await expect(Promise.all([token.current(), token.current()])).resolves.toEqual(["tok-1", "tok-1"])
    clock.now += 500_000
    await expect(token.current()).resolves.toBe("tok-1")
    clock.now += 60_000
    await expect(token.current()).resolves.toBe("tok-2")
    expect(service.made).toEqual(["tok-1", "tok-2"])
    expect(held).toEqual(["tok-1", "tok-2"])
  })

  test("a key the service turns down, or none set, is refused", async () => {
    const { url } = await served()
    const turnedDown = new PlaceToken({
      keyNamed: "ACME_API_KEY",
      keyFrom: () => "k-1:wrong",
      mint: tokenServiceMint(`${url}/api-keys/{key id}/token`)
    })
    await expect(turnedDown.current()).rejects.toThrow(/turned down the key \(401\)/)
    const unset = new PlaceToken({
      keyNamed: "ACME_API_KEY",
      keyFrom: () => undefined,
      mint: async () => ({ token: "x" })
    })
    const refused = await unset.current().catch((error: unknown) => error)
    expect(refused).toBeInstanceOf(PlaceError)
    expect((refused as PlaceError).cause).toMatchObject({ kind: "refused" })
  })

  test("each request for a token carries a fresh request id:  a service may refuse one without", async () => {
    const ids: Array<string | null> = []
    const fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      ids.push(new Headers(init?.headers).get("x-request-id"))
      return Response.json({ token: `tok-${ids.length}`, expires_in: 1 })
    }) as typeof globalThis.fetch
    const mint = tokenServiceMint("https://auth.lab.test/api-keys/{key id}/token", fetch)
    await mint("k-1:sesame")
    await mint("k-1:sesame")
    expect(ids).toHaveLength(2)
    expect(ids[0]).toMatch(/^spell-[0-9a-z]+$/)
    expect(ids[1]).not.toBe(ids[0])
  })

  test("a web server reads with it, as its key", async () => {
    const { url, token } = await served()
    const place = new RestPlace({ url, keyNamed: "ACME_API_KEY", keyFrom: token.current })
    await expect(place.list("things", {}, {})).resolves.toMatchObject({ rows: [{ id: "t-1", name: "A thing" }] })
  })
})

/** A made-up JWT, unsigned, lasting from `issued` to `ends` (msec):  only its claims are read. */
function jwt(issued: number, ends: number, mark = "a"): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${part({ alg: "none" })}.${part({ iat: issued / 1000, exp: ends / 1000, mark })}.sig`
}

/** A token that renews itself at a made-up refresh route, on a clock a test moves;  what it kept and said. */
function renewing({ hours = 8, refuses = false } = {}) {
  const clock = { now: 1_000_000_000 }
  const store: { given?: string } = { given: jwt(clock.now, clock.now + hours * 3_600_000) }
  const asked: Array<string | null> = []
  const saved: string[] = []
  const said: string[] = []
  const fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const sent = new Headers(init?.headers).get("authorization")
    asked.push(sent)
    if (refuses) return Response.json({ error: "no" }, { status: 401 })
    return Response.json({ token: jwt(clock.now, clock.now + hours * 3_600_000, `r${asked.length}`) })
  }) as typeof globalThis.fetch
  const token = new PlaceToken({
    keyNamed: "ACME_TOKEN",
    keyFrom: () => store.given,
    mint: tokenRefreshMint("https://acme.test/api/auth/refresh", fetch),
    renews: true,
    save: (fresh) => saved.push(fresh),
    say: (line) => said.push(line),
    now: () => clock.now
  })
  return { token, clock, store, asked, saved, said }
}

describe("a token that renews itself", () => {
  test("used as it is until its last hour, then renewed at its refresh route, sent as a Bearer, and saved", async () => {
    const { token, clock, store, asked, saved, said } = renewing()
    const first = store.given!
    await expect(token.current()).resolves.toBe(first)
    expect(asked).toEqual([])
    expect(token.state()).toEqual({ state: "ok", minutesLeft: 480 })
    clock.now += 7.5 * 3_600_000
    const fresh = await token.current()
    expect(fresh).not.toBe(first)
    expect(asked).toEqual([`Bearer ${first}`])
    expect(saved).toEqual([fresh])
    expect(said).toEqual(["renewed ACME_TOKEN:  it has 480 minutes left"])
    // kept, and asked no more till its own last hour
    await expect(token.current()).resolves.toBe(fresh)
    expect(asked).toHaveLength(1)
    expect(said.join()).not.toContain(fresh)
  })

  test("a short-lived one renews in the last quarter of its life", async () => {
    const { token, clock, asked } = renewing({ hours: 1 })
    clock.now += 40 * 60_000
    await token.current()
    expect(asked).toHaveLength(0)
    clock.now += 6 * 60_000
    await token.current()
    expect(asked).toHaveLength(1)
  })

  test("a refused renewal is said once, the token used till it runs out, and tried again in 5 minutes", async () => {
    const { token, clock, store, asked, said } = renewing({ refuses: true })
    clock.now += 7.5 * 3_600_000
    await expect(token.current()).resolves.toBe(store.given)
    await expect(token.current()).resolves.toBe(store.given)
    expect(asked).toHaveLength(1)
    expect(said).toEqual([expect.stringMatching(/^couldn't renew ACME_TOKEN \(.*turned down the token \(401\)\)/)])
    expect(token.state()).toMatchObject({ state: "renew-failed", minutesLeft: 30, why: expect.stringMatching(/401/) })
    clock.now += 5 * 60_000
    await token.current()
    expect(asked).toHaveLength(2)
    expect(said).toHaveLength(1)
  })

  test("run out, it's refused and expired, till a fresh one is kept under its name", async () => {
    const { token, clock, store } = renewing({ refuses: true })
    clock.now += 9 * 3_600_000
    const refused = await token.current().catch((error: unknown) => error)
    expect(refused).toBeInstanceOf(PlaceError)
    expect((refused as PlaceError).message).toMatch(/ACME_TOKEN has run out/)
    expect(token.state()).toMatchObject({ state: "expired", minutesLeft: 0 })
    store.given = jwt(clock.now, clock.now + 8 * 3_600_000, "fresh")
    await expect(token.current()).resolves.toBe(store.given)
    expect(token.state()).toEqual({ state: "ok", minutesLeft: 480 })
  })

  test("its last quarter hour, not renewed, is expiring;  with none set, missing", async () => {
    const { token, clock, store } = renewing({ hours: 1 })
    clock.now += 50 * 60_000
    expect(token.state()).toEqual({ state: "expiring", minutesLeft: 10 })
    store.given = undefined
    expect(token.state()).toEqual({ state: "missing" })
  })

  test("one made from a key says when making it failed", async () => {
    const turnedDown = new PlaceToken({
      keyNamed: "ACME_API_KEY",
      keyFrom: () => "k-1:wrong",
      mint: async () => {
        throw new Error("the service is down")
      }
    })
    await expect(turnedDown.current()).rejects.toThrow()
    expect(turnedDown.state()).toEqual({ state: "renew-failed", why: "the service is down" })
  })
})
