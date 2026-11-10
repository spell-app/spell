import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs"
import { inspect } from "node:util"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { PlaceSessions, type BrowserCookie } from "spell/server/places"

/** A cookie, with what a test doesn't care about filled in. */
const cookie = (overrides: Partial<BrowserCookie> = {}): BrowserCookie => ({
  name: "sid",
  value: "abcdefgh12345678",
  domain: "app.example.com",
  path: "/",
  expires: -1,
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  ...overrides
})

let folder: string
let sessions: PlaceSessions
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "place-sessions-"))
  sessions = new PlaceSessions({ folder: join(folder, "kept") })
})
afterEach(() => rmSync(folder, { recursive: true, force: true }))

const kept = (
  cookies: BrowserCookie[],
  origins: { origin: string; localStorage: { name: string; value: string }[] }[] = []
) => {
  sessions.keep("console", { address: "https://app.example.com", state: { cookies, origins } })
  return sessions.named("console")!
}

describe("PlaceSessions", () => {
  test("keeps a session only its owner can read", () => {
    const file = sessions.keep("console", { address: "https://a.example", state: { cookies: [cookie()], origins: [] } })
    expect(file).toBe(join(folder, "kept", "console.json"))
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(statSync(join(folder, "kept")).mode & 0o777).toBe(0o700)
  })

  test("none for a place never signed in, and a name can't reach another folder", () => {
    expect(sessions.named("nope")).toBeUndefined()
    expect(() => sessions.named("../up")).toThrow(TypeError)
    expect(existsSync(join(folder, "up.json"))).toBe(false)
  })
})

describe("PlaceSession", () => {
  test("sends a cookie only to its own host and path", () => {
    const session = kept([cookie({ path: "/api" })])
    expect(session.cookieFor("https://app.example.com/api/racks")).toBe("sid=abcdefgh12345678")
    expect(session.cookieFor("https://app.example.com/apiary")).toBeUndefined()
    expect(session.cookieFor("https://other.example.com/api")).toBeUndefined()
    expect(session.cookieFor("https://evil.app.example.com/api")).toBeUndefined()
    expect(session.cookieFor("recipes.csv")).toBeUndefined()
  })

  test("a leading dot takes in the hosts under it;  a secure cookie needs https, but for this machine", () => {
    const session = kept([cookie({ domain: ".example.com" })])
    expect(session.cookieFor("https://deep.example.com/")).toBe("sid=abcdefgh12345678")
    expect(session.cookieFor("http://deep.example.com/")).toBeUndefined()
    const local = kept([cookie({ domain: "localhost" })])
    expect(local.cookieFor("http://localhost:3000/")).toBe("sid=abcdefgh12345678")
  })

  test("an expired cookie isn't sent, and with all expired the session has ended", () => {
    const session = kept([cookie({ expires: 1000 })])
    expect(session.cookieFor("https://app.example.com/")).toBeUndefined()
    expect(session.hasEnded).toBe(true)
    expect(kept([cookie({ expires: Date.now() / 1000 + 60 })]).hasEnded).toBe(false)
  })

  test("sent to another host or a sign-in path is sent to sign in", () => {
    const session = kept([cookie()])
    expect(session.sentToSignIn("https://a.example/x", "https://sso.example/start")).toBe(true)
    expect(session.sentToSignIn("https://a.example/x", "https://a.example/login?next=/x")).toBe(true)
    expect(session.sentToSignIn("https://a.example/x", "https://a.example/x/")).toBe(false)
  })

  test("scrubs cookies and long stored values, as written in JSON too;  a short value isn't a secret", () => {
    const quoted = 'token"with\\marks'.padEnd(20, "x")
    const session = kept(
      [cookie(), cookie({ name: "lang", value: "en" })],
      [{ origin: "https://app.example.com", localStorage: [{ name: "token", value: quoted }] }]
    )
    expect(session.scrubbed("a abcdefgh12345678 b")).toBe("a [its session] b")
    expect(session.scrubbed(JSON.stringify({ quoted }))).toBe('{"quoted":"[its session]"}')
    expect(session.scrubbed("en and then")).toBe("en and then")
  })

  test("never prints what's secret", () => {
    const session = kept([cookie()])
    for (const printed of [JSON.stringify(session), String(session), inspect(session)]) {
      expect(printed).not.toContain("abcdefgh12345678")
    }
  })
})
