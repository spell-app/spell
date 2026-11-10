import { describe, expect, test } from "vite-plus/test"

import { PoliteReader } from "spell/parser/spell/ingest/PoliteReader"
import type { ReaderSession } from "spell/parser/spell/ingest/ingest.types"

/** Reading signed in (epic `mockup` P12):  the cookie goes only where it should, and never comes back written down. */

const SECRET = "cookie-value-123456"

/** A session for `https://a.example` alone. */
const session: ReaderSession = {
  place: "console",
  hasEnded: false,
  secrets: [SECRET],
  cookieFor: (url) => (new URL(url).host === "a.example" ? `sid=${SECRET}` : undefined),
  sentToSignIn: (from, to) => new URL(from).host !== new URL(to).host || /login/.test(new URL(to).pathname)
}

/** A reader answered by `answers`, one a request, with each request noted in `asked`. */
function readerWith(answers: Response[]) {
  const asked: { url: string; cookie: string | null; origin: string | null; redirect?: RequestRedirect }[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers)
    asked.push({ url, cookie: headers.get("cookie"), origin: headers.get("origin"), redirect: init.redirect })
    return answers.shift()!
  }) as typeof globalThis.fetch
  return { asked, reader: new PoliteReader({ fetch, session, sleep: async () => {} }) }
}

const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } })

describe("PoliteReader, signed in", () => {
  test("sends the cookie, asks as itself, and follows redirects itself", async () => {
    const { reader, asked } = readerWith([redirectTo("/racks/"), new Response("[]")])
    const { landed } = { landed: (await reader.read("https://a.example/racks")).url }
    expect(landed).toBe("https://a.example/racks/")
    expect(asked).toEqual([
      { url: "https://a.example/racks", cookie: `sid=${SECRET}`, origin: null, redirect: "manual" },
      { url: "https://a.example/racks/", cookie: `sid=${SECRET}`, origin: null, redirect: "manual" }
    ])
  })

  test("takes the session out of what comes back, as written in JSON too", async () => {
    const { reader } = readerWith([new Response(JSON.stringify({ was: SECRET }))])
    expect((await reader.read("https://a.example/x")).text).toBe('{"was":"[its session]"}')
  })

  test.each([
    ["a 401", new Response("no", { status: 401 })],
    ["sent to another host", redirectTo("https://sso.example/start")],
    ["sent to a sign-in page", redirectTo("/login?next=/x")]
  ])("%s:  the session has ended, and it says how to go on", async (_, answer) => {
    const { reader, asked } = readerWith([answer])
    await expect(reader.read("https://a.example/x")).rejects.toThrow(
      "the session for console has ended:  sign in again, spell place sign-in console"
    )
    expect(asked).toHaveLength(1)
  })

  test("sends nothing to a host that isn't the session's", async () => {
    const { reader, asked } = readerWith([new Response("ok")])
    await reader.read("https://b.example/x")
    expect(asked[0]!.cookie).toBeNull()
  })
})
