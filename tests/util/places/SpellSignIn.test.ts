import { expect, test, vi } from "vite-plus/test"

import { personOnThisPage } from "spell/util/places/people"
import { SpellSignIn } from "spell/util/places/SpellSignIn"

/** A sign-in server that answers as `answers` says, by what's asked;  and what was asked. */
function fakeServer(answers: Record<string, () => { status?: number; body: object }>) {
  const asked: { what: string; body?: unknown }[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    const what = url.split("/").pop()!
    asked.push({ what, ...(typeof init.body === "string" && { body: JSON.parse(init.body) }) })
    const { status = 200, body } = answers[what]?.() ?? { status: 404, body: { error: "no" } }
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  return { asked, fetcher }
}

test("signed out:  an email asked for, it waits for a code;  a wrong one says so;  the right one signs in, and this page's person is theirs", async () => {
  const { asked, fetcher } = fakeServer({
    me: () => ({ body: {} }),
    ask: () => ({ body: { request: "r-1" } }),
    waiting: () => ({ body: { status: "waiting" } }),
    code: () =>
      (asked.at(-1)!.body as { code: string }).code === "123456"
        ? { body: { person: "ana@spell", email: "ana@example.com" } }
        : { status: 400, body: { error: "That code is wrong:  4 tries left." } },
    out: () => ({ body: {} })
  })
  const signIn = new SpellSignIn({ fetcher })
  await signIn.ready
  expect(signIn.status).toBe("signed out")
  expect(signIn.account).toBe("Spell account")

  await signIn.signIn("ana@example.com")
  expect(signIn.status).toBe("waiting for a code")
  expect(signIn.sentTo).toBe("ana@example.com")

  await signIn.enterCode("000000")
  expect(signIn.status).toBe("waiting for a code")
  expect(signIn.problem).toBe("That code is wrong:  4 tries left.")

  await signIn.enterCode(" 123456 ")
  expect(signIn.status).toBe("signed in")
  expect(signIn.person).toMatchObject({ id: "ana@spell", name: "ana@spell" })
  expect(personOnThisPage(() => "a guest")).toEqual({ id: "ana@spell", name: "ana@spell" })

  await signIn.signOut()
  expect(signIn.status).toBe("signed out")
  expect(personOnThisPage(() => "a guest").id).not.toBe("ana@spell")
})

test("waiting:  the link confirmed elsewhere signs this page in at its next ask", async () => {
  vi.useFakeTimers()
  let confirmed = false
  const { fetcher } = fakeServer({
    me: () => ({ body: {} }),
    ask: () => ({ body: { request: "r-2" } }),
    waiting: () => ({
      body: confirmed ? { status: "signed in", person: "ana@spell", email: "ana@example.com" } : { status: "waiting" }
    })
  })
  const signIn = new SpellSignIn({ fetcher })
  await signIn.ready
  await signIn.signIn("ana@example.com")
  await vi.advanceTimersByTimeAsync(2_100)
  expect(signIn.status).toBe("waiting for a code")
  confirmed = true
  await vi.advanceTimersByTimeAsync(2_100)
  // a real browser's answer comes in its own time, not the fake clock's
  vi.useRealTimers()
  await vi.waitFor(() => expect(signIn.status).toBe("signed in"))
})

test("an email with no account:  signed out, saying why", async () => {
  const { fetcher } = fakeServer({
    me: () => ({ body: {} }),
    ask: () => ({
      status: 403,
      body: { error: "bo@example.com has no Spell account here:  this server is by invite only." }
    })
  })
  const signIn = new SpellSignIn({ fetcher })
  await signIn.signIn("bo@example.com")
  expect(signIn.status).toBe("signed out")
  expect(signIn.problem).toMatch(/by invite only/)
})

test("one sign-in per server, for every place on the page", () => {
  expect(SpellSignIn.for("/api/places/spaces/a")).toBe(SpellSignIn.for("/api/places/spaces/b"))
  expect(SpellSignIn.for("http://127.0.0.1:9/x")).not.toBe(SpellSignIn.for("/api/places/spaces/a"))
})
