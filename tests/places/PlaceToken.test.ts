import { afterEach, describe, expect, test } from "vite-plus/test"

import { TokenService } from "spell/server/test/tokenService"
import { PlaceError, PlaceToken, RestPlace, tokenServiceMint } from "spell/places"

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

  test("a web server reads with it, as its key", async () => {
    const { url, token } = await served()
    const place = new RestPlace({ url, keyNamed: "ACME_API_KEY", keyFrom: token.current })
    await expect(place.list("things", {}, {})).resolves.toMatchObject({ rows: [{ id: "t-1", name: "A thing" }] })
  })
})
