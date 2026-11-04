import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { MemoryPlace } from "spell/util/places/MemoryPlace"
import { SRV } from "spell/server"
import { MailCatcher, SignInCheck, SignIns, type SignInAccounts } from "spell/server/signIn"
import { PlaceServer, Referee } from "spell/server/places"
import { ask, serveHandler, type Served } from "spell/server/test/serve"

/** The accounts:  Ana has one;  an invite makes one. */
class FakeAccounts implements SignInAccounts {
  readonly people = new Map([["ana@example.com", "ana@spell"]])
  async accountFor(email: string) {
    return this.people.get(email)
  }
  async invite(email: string) {
    const person = `${email.split("@")[0]}@spell`
    this.people.set(email, person)
    return person
  }
}

const TOKEN = "this-run"
const CHROME_ON_A_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"

let folder: string
let served: Served
let mailer: MailCatcher
let referee: Referee

beforeAll(async () => {
  folder = mkdtempSync(join(tmpdir(), "spell-sign-in-check-"))
  mailer = new MailCatcher({ folder: join(folder, "mail") })
  const check = new SignInCheck({ signIns: new SignIns(), mailer, accounts: new FakeAccounts() })
  const guard = new SRV.Guard({ token: TOKEN })
  const router = new SRV.Router()
  router.use(check.check)
  check.route(router, guard)
  // a guarded write, and a place:  who each sees
  router.post("/write", guard.hostCheck, guard.writeCheck, (request, reply) => reply.json({ person: request.person }))
  const place = new MemoryPlace({ collections: { notes: [] } })
  let identity: string | undefined
  new PlaceServer({ open: (_name, who) => ((identity = who), place) }).route(router, guard)
  router.get("/identity", (_request, reply) => reply.json({ identity }))
  served = await serveHandler(router.handle)
  guard.allowPort(served.port)
  referee = await new Referee({ path: "/room", place, collections: { notes: {} }, guard, signIn: check }).open()
  served.server.on("upgrade", (raw, socket, head) => referee.upgrade(raw, socket, head))
})

afterAll(async () => {
  referee?.close()
  await served?.close()
  rmSync(folder, { recursive: true, force: true })
})

/** `POST <path>` with JSON `body`, and `cookie`. */
const posted = (path: string, body: object, headers: Record<string, string> = {}) =>
  ask(served.port, "POST", path, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "user-agent": CHROME_ON_A_MAC, ...headers }
  })

/** The cookie an answer sets:  `spell-session=...`. */
const cookieFrom = (headers: Record<string, string | string[] | undefined>) =>
  `${[headers["set-cookie"]].flat()[0] ?? ""}`.split(";")[0]!

/** The newest mail to `to`:  its link's key and its code. */
async function mailTo(to: string) {
  const mail = (await mailer.newestTo(to))!
  return {
    mail,
    key: /key=(\w+)/.exec(mail.text)![1]!,
    code: /^(\d{6})$/m.exec(mail.text)![1]!
  }
}

describe("signing in by email", () => {
  test("asked:  a mail with the link and the code, saying where it was asked from;  the code signs the device in", async () => {
    const asked = await posted("/api/sign-in/ask", { email: "ana@example.com" })
    expect(asked.status).toBe(200)
    expect(JSON.parse(asked.text).request).toMatch(/^\w{64}$/)
    const { mail, code } = await mailTo("ana@example.com")
    expect(mail.subject).toBe("Sign in to Spell")
    expect(mail.text).toContain("from Chrome, on a Mac, on this machine")
    expect(mail.text).toContain(`http://127.0.0.1:${served.port}/sign-in/confirm?key=`)

    const wrong = await posted("/api/sign-in/code", {
      email: "ana@example.com",
      code: code === "000000" ? "1" : "000000"
    })
    expect(wrong.status).toBe(400)
    expect(JSON.parse(wrong.text).error).toMatch(/tries left/)

    const right = await posted("/api/sign-in/code", { email: "ana@example.com", code })
    expect(JSON.parse(right.text)).toEqual({ person: "ana@spell", email: "ana@example.com" })
    const cookie = cookieFrom(right.headers)
    expect(`${right.headers["set-cookie"]}`).toMatch(/HttpOnly; SameSite=Strict/)
    const me = await ask(served.port, "GET", "/api/sign-in/me", { headers: { cookie } })
    expect(JSON.parse(me.text)).toEqual({ person: "ana@spell", email: "ana@example.com" })

    // all the readers see her:  a guarded write with no token, and a place's identity
    const write = await posted("/write", {}, { cookie, origin: `http://127.0.0.1:${served.port}` })
    expect(JSON.parse(write.text)).toEqual({ person: "ana@spell" })
    await posted("/api/places/notes/list", { collection: "notes" }, { cookie })
    expect(JSON.parse((await ask(served.port, "GET", "/identity")).text)).toEqual({ identity: "ana@spell" })

    // signed out:  the guard wants the token again
    await posted("/api/sign-in/out", {}, { cookie })
    expect((await posted("/write", {}, { cookie })).status).toBe(403)
  })

  test("the link on a second device:  its page says where it came from;  confirmed, both are signed in;  twice, refused", async () => {
    const { request } = JSON.parse((await posted("/api/sign-in/ask", { email: "ana@example.com" })).text)
    expect(JSON.parse((await posted("/api/sign-in/waiting", { request })).text)).toEqual({ status: "waiting" })
    const { key } = await mailTo("ana@example.com")
    const link = await ask(served.port, "GET", `/api/sign-in/link?key=${key}`)
    expect(JSON.parse(link.text)).toEqual({
      email: "ana@example.com",
      kind: "sign-in",
      from: { browser: "Chrome", system: "a Mac", near: "on this machine" }
    })
    const page = await ask(served.port, "GET", `/sign-in/confirm?key=${key}`)
    expect(page.text).toContain("Yes, sign me in")

    const phone = await posted("/api/sign-in/confirm", { key })
    expect(JSON.parse(phone.text).person).toBe("ana@spell")
    expect(cookieFrom(phone.headers)).toMatch(/^spell-session=\w+/)
    const laptop = await posted("/api/sign-in/waiting", { request })
    expect(JSON.parse(laptop.text)).toMatchObject({ status: "signed in", person: "ana@spell" })
    expect(cookieFrom(laptop.headers)).not.toBe(cookieFrom(phone.headers))

    const twice = await posted("/api/sign-in/confirm", { key })
    expect(twice.status).toBe(410)
    expect(JSON.parse(twice.text).error).toMatch(/used already/)
  })

  test("invite only:  an email with no account is refused;  an invite, with this run's token only, makes one", async () => {
    const refused = await posted("/api/sign-in/ask", { email: "bo@example.com" })
    expect(refused.status).toBe(403)
    expect(JSON.parse(refused.text).error).toMatch(/by invite only/)
    expect((await posted("/api/sign-in/invite", { email: "bo@example.com" })).status).toBe(403)

    const invited = await posted("/api/sign-in/invite", { email: "bo@example.com" }, { "x-server-token": TOKEN })
    expect(JSON.parse(invited.text)).toEqual({ person: "bo@spell" })
    const { mail, key } = await mailTo("bo@example.com")
    expect(mail.subject).toBe("You're invited to Spell")
    expect(JSON.parse((await posted("/api/sign-in/confirm", { key })).text).person).toBe("bo@spell")
    expect((await posted("/api/sign-in/ask", { email: "bo@example.com" })).status).toBe(200)
  })

  test("the mail catcher's list, and its page", async () => {
    const { mails } = JSON.parse((await ask(served.port, "GET", "/api/sign-in/mail")).text)
    expect(mails.length).toBeGreaterThanOrEqual(3)
    expect((await ask(served.port, "GET", "/sign-in/mail")).text).toContain("Caught mail")
  })
})

describe("a room's socket", () => {
  /** How a socket to the room fares, offering `protocols`, sending `cookie`. */
  const statusOf = (protocols: string[] = [], headers: Record<string, string> = {}) =>
    new Promise<string>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${served.port}/room`, { protocols, headers } as never)
      socket.addEventListener("open", () => (socket.close(), resolve("open")))
      socket.addEventListener("error", () => resolve("refused"))
    })

  test("signed in, the cookie lets it in with no token;  else the token rides as its sub-protocol", async () => {
    expect(await statusOf()).toBe("refused")
    expect(await statusOf([`spell-token.${TOKEN}`])).toBe("open")
    const { code } = await (async () => {
      await posted("/api/sign-in/ask", { email: "ana@example.com" })
      return mailTo("ana@example.com")
    })()
    const cookie = cookieFrom((await posted("/api/sign-in/code", { email: "ana@example.com", code })).headers)
    expect(await statusOf([], { cookie })).toBe("open")
  })
})
