import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { MemoryPlace } from "spell/places/MemoryPlace"
import { SRV } from "spell/server"
import {
  MailCatcher,
  SignInCheck,
  SignInError,
  SignIns,
  type LinkedAccount,
  type SignInAccounts
} from "spell/server/signIn"
import { PlaceServer, Referee } from "spell/server/places"
import { FakeAtProtoIdentity } from "spell/server/test/FakeAtProtoIdentity"
import { ask, serveHandler, type Served } from "spell/server/test/serve"

/** The accounts:  Ana has one;  an invite makes one. */
class FakeAccounts implements SignInAccounts {
  readonly people = new Map([
    ["ana@example.com", "ana@spell"],
    ["eve@example.com", "eve@spell"]
  ])
  /** The accounts Spell took down. */
  readonly takenDown = new Set(["eve@spell"])
  async accountFor(email: string) {
    return this.people.get(email)
  }
  async invite(email: string) {
    const person = `${email.split("@")[0]}@spell`
    this.people.set(email, person)
    return person
  }
  async isTakenDown(person: string) {
    return this.takenDown.has(person)
  }
  /** Each account's linked atmosphere account:  Eve's, though she was taken down. */
  readonly linked = new Map<string, LinkedAccount>([["eve@spell", { did: "did:plc:eve", handle: "eve.bsky.social" }]])
  async accountForDid(did: string) {
    return [...this.linked].find(([, each]) => each.did === did)?.[0]
  }
  async linkedOf(person: string) {
    return this.linked.get(person)
  }
  async link(person: string, linked: LinkedAccount) {
    const other = await this.accountForDid(linked.did)
    if (other && other !== person)
      throw new SignInError("linked to someone else", { cause: { kind: "linked elsewhere" } })
    this.linked.set(person, linked)
  }
}

/** The atmosphere's accounts, by handle. */
const atmosphere = new FakeAtProtoIdentity({
  "ana.bsky.social": "did:plc:ana",
  "bo.bsky.social": "did:plc:bo",
  "eve.bsky.social": "did:plc:eve"
})

const TOKEN = "this-run"
const CHROME_ON_A_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"

let folder: string
let served: Served
let mailer: MailCatcher
let referee: Referee
let check: SignInCheck
const accounts = new FakeAccounts()

beforeAll(async () => {
  folder = mkdtempSync(join(tmpdir(), "spell-sign-in-check-"))
  mailer = new MailCatcher({ folder: join(folder, "mail") })
  check = new SignInCheck({
    signIns: new SignIns(),
    mailer,
    accounts,
    abuseContact: "abuse@test.example",
    atProto: atmosphere
  })
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

describe("signing in by password", () => {
  const PASSWORD = "a long enough one"
  const NEWER = "another long enough one"
  const PERSON = { person: "pat@spell", email: "pat@example.com" }
  const byPassword = (email: string, password: string) => posted("/api/sign-in/password", { email, password })
  const change = (body: object, cookie: string) =>
    posted("/api/sign-in/password/change", body, { cookie, origin: `http://127.0.0.1:${served.port}` })
  const asMachine = (body: object) => posted("/api/sign-in/password/for", body, { "x-server-token": TOKEN })

  beforeAll(async () => {
    accounts.people.set(PERSON.email, PERSON.person)
    await asMachine({ email: PERSON.email, password: PASSWORD })
  })

  test("the right one signs in, with the same cookie the code makes;  who's signed in says it has one", async () => {
    const right = await byPassword(PERSON.email, PASSWORD)
    expect(right.status).toBe(200)
    expect(JSON.parse(right.text)).toEqual(PERSON)
    expect(`${right.headers["set-cookie"]}`).toMatch(/HttpOnly; SameSite=Strict; Max-Age=2592000/)
    const cookie = cookieFrom(right.headers)
    const me = await ask(served.port, "GET", "/api/sign-in/me", { headers: { cookie } })
    expect(JSON.parse(me.text).password).toEqual({ set: true, currentNeeded: true })
  })

  test("a wrong password and a stranger get the same answer, the password in no answer", async () => {
    const wrong = await byPassword(PERSON.email, "not the password")
    const stranger = await byPassword("nobody@example.com", PASSWORD)
    expect(wrong.status).toBe(401)
    expect(stranger.status).toBe(wrong.status)
    expect(stranger.text).toBe(wrong.text)
    expect(wrong.text).not.toContain("not the password")
    expect(wrong.headers["set-cookie"]).toBeUndefined()
  })

  test("the same answer's words as a field that isn't an email, without repeating what was typed", async () => {
    const notAnEmail = await byPassword("just some words", PASSWORD)
    expect(notAnEmail.status).toBe(401)
    expect((await posted("/api/sign-in/ask", { email: "owen@willzalone" })).text).toContain("your email address")
  })

  test("too many wrong:  429, saying how long", async () => {
    const email = "locks@example.com"
    for (let index = 0; index < 5; index++) await byPassword(email, "guess number one")
    const locked = await byPassword(email, "guess number one")
    expect(locked.status).toBe(429)
    expect(JSON.parse(locked.text).error).toMatch(/wait 15 minutes/)
  })

  test("an account taken down is refused only by the right password's answer", async () => {
    await check.signIns.setPasswordFor("eve@spell", PASSWORD)
    expect((await byPassword("eve@example.com", "not the password")).status).toBe(401)
    const down = await byPassword("eve@example.com", PASSWORD)
    expect(down.status).toBe(451)
    expect(JSON.parse(down.text).error).toContain("abuse@test.example")
    expect(down.headers["set-cookie"]).toBeUndefined()
  })

  test("changing:  needs being signed in, then the current one;  ends the others;  the new one works", async () => {
    expect((await change({ password: NEWER }, "")).status).toBe(403)
    const cookie = cookieFrom((await byPassword(PERSON.email, PASSWORD)).headers)
    const elsewhere = cookieFrom((await byPassword(PERSON.email, PASSWORD)).headers)
    expect((await change({ password: NEWER }, cookie)).status).toBe(403)
    expect((await change({ password: "short" }, cookie)).status).toBe(403)
    expect((await change({ password: "short", current: PASSWORD }, cookie)).status).toBe(400)

    const changed = await change({ password: NEWER, current: PASSWORD }, cookie)
    expect(changed.status).toBe(200)
    const who = (each: string) => ask(served.port, "GET", "/api/sign-in/me", { headers: { cookie: each } })
    expect(JSON.parse((await who(cookie)).text).person).toBe(PERSON.person)
    expect(JSON.parse((await who(elsewhere)).text).person).toBeUndefined()
    expect((await byPassword(PERSON.email, NEWER)).status).toBe(200)
    await asMachine({ email: PERSON.email, password: PASSWORD })
  })

  test("from another site:  refused, whoever's cookie it sends", async () => {
    const cookie = cookieFrom((await byPassword(PERSON.email, PASSWORD)).headers)
    const elsewhere = await posted(
      "/api/sign-in/password/change",
      { password: NEWER, current: PASSWORD },
      { cookie, origin: "https://evil.example" }
    )
    expect(elsewhere.status).toBe(403)
  })

  test("forgot it:  an emailed link's sign-in changes it with no current one", async () => {
    await posted("/api/sign-in/ask", { email: PERSON.email })
    const { key } = await mailTo(PERSON.email)
    const cookie = cookieFrom((await posted("/api/sign-in/confirm", { key })).headers)
    const me = await ask(served.port, "GET", "/api/sign-in/me", { headers: { cookie } })
    expect(JSON.parse(me.text).password).toEqual({ set: true, currentNeeded: false })
    expect((await change({ password: NEWER }, cookie)).status).toBe(200)
    expect((await byPassword(PERSON.email, NEWER)).status).toBe(200)
    await asMachine({ email: PERSON.email, password: PASSWORD })
  })

  test("this machine's person sets anyone's:  only with this run's token, never a sign-in", async () => {
    const cookie = cookieFrom((await byPassword(PERSON.email, PASSWORD)).headers)
    expect(
      (await posted("/api/sign-in/password/for", { email: PERSON.email, password: NEWER }, { cookie })).status
    ).toBe(403)
    expect((await asMachine({ email: "nobody@example.com", password: NEWER })).status).toBe(404)
    expect((await asMachine({ email: PERSON.email, password: "short" })).status).toBe(400)
  })
})

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
    expect(JSON.parse(me.text)).toEqual({
      person: "ana@spell",
      email: "ana@example.com",
      abuseContact: "abuse@test.example",
      password: { set: false, currentNeeded: false },
      atProto: {}
    })

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

  test("behind a tunnel on this machine:  the place is the asker's address the tunnel passed on, never this machine", async () => {
    const fromAnaLaptop = { "x-forwarded-for": "198.51.100.7" }
    const fromHomeNetwork = { "x-forwarded-for": "203.0.113.9, 192.168.1.20" }
    for (const [headers, near] of [
      [fromAnaLaptop, undefined],
      [fromHomeNetwork, "on this network"]
    ] as const) {
      await posted("/api/sign-in/ask", { email: "ana@example.com" }, headers)
      const { key } = await mailTo("ana@example.com")
      const { from } = JSON.parse((await ask(served.port, "GET", `/api/sign-in/link?key=${key}`)).text)
      expect(from).toEqual({ browser: "Chrome", system: "a Mac", ...(near && { near }) })
    }
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

  test("an account Spell took down can't sign in, or be invited:  451, naming the abuse contact, and no mail", async () => {
    for (const path of ["/api/sign-in/ask", "/api/sign-in/invite"]) {
      const refused = await posted(path, { email: "eve@example.com" }, { "x-server-token": TOKEN })
      expect(refused.status, path).toBe(451)
      expect(JSON.parse(refused.text).error).toBe(
        "The account eve@spell was taken down by Spell.  To ask about it:  abuse@test.example"
      )
    }
    expect(await mailer.newestTo("eve@example.com")).toBeUndefined()
  })

  test("`me` says where to report abuse, signed in or not;  so does the link's page", async () => {
    expect(JSON.parse((await ask(served.port, "GET", "/api/sign-in/me")).text)).toEqual({
      abuseContact: "abuse@test.example",
      atProto: {}
    })
    expect((await ask(served.port, "GET", "/sign-in/confirm")).text).toContain("To report abuse on Spell")
  })

  test("the mail catcher's list, and its page", async () => {
    const { mails } = JSON.parse((await ask(served.port, "GET", "/api/sign-in/mail")).text)
    expect(mails.length).toBeGreaterThanOrEqual(3)
    expect((await ask(served.port, "GET", "/sign-in/mail")).text).toContain("Caught mail")
  })
})

/** Ana signed in by email:  her device's cookie. */
async function anaByEmail(): Promise<string> {
  await posted("/api/sign-in/ask", { email: "ana@example.com" })
  const { code } = await mailTo("ana@example.com")
  return cookieFrom((await posted("/api/sign-in/code", { email: "ana@example.com", code })).headers)
}

/** Where the server sent the browser back to, and how it went:  `{ path, outcome, why, cookie }`. */
async function cameBack(url: string, options?: Parameters<FakeAtProtoIdentity["backFor"]>[1]) {
  const back = await ask(served.port, "GET", atmosphere.backFor(url, options))
  expect(back.status).toBe(303)
  const location = new URL(`${back.headers.location}`, "http://here")
  return {
    path: location.pathname,
    outcome: location.searchParams.get("spell-sign-in"),
    why: location.searchParams.get("spell-sign-in-why"),
    cookie: cookieFrom(back.headers)
  }
}

describe("signing in with a Bluesky account (epic `atmosphere` P19)", () => {
  test("Ana links hers, signed in by email;  then it signs her in on another device, the same session", async () => {
    const cookie = await anaByEmail()
    const asked = await posted(
      "/api/sign-in/atproto",
      { who: "@ana.bsky.social", mode: "link", back: "/recipes/?tab=2" },
      { cookie }
    )
    const { url } = JSON.parse(asked.text)
    expect(url).toMatch(/^https:\/\/host\.fake\.example\/.*who=ana\.bsky\.social/)
    // the host sends the browser back with no cookie:  SameSite=Strict
    expect(await cameBack(url)).toMatchObject({ path: "/recipes/", outcome: "linked" })
    const me = await ask(served.port, "GET", "/api/sign-in/me", { headers: { cookie } })
    expect(JSON.parse(me.text).atProto).toEqual({ linked: "ana.bsky.social" })

    // another device:  Bluesky's own host asks who
    const signIn = JSON.parse((await posted("/api/sign-in/atproto", { mode: "sign in", back: "/" })).text)
    expect(signIn.url).toContain("who=https%3A%2F%2Fbsky.social")
    const back = await cameBack(signIn.url, { as: "ana.bsky.social" })
    expect(back.outcome).toBe("signed in")
    const other = await ask(served.port, "GET", "/api/sign-in/me", { headers: { cookie: back.cookie } })
    expect(JSON.parse(other.text)).toMatchObject({ person: "ana@spell", email: "" })
    const write = await posted("/write", {}, { cookie: back.cookie, origin: `http://127.0.0.1:${served.port}` })
    expect(JSON.parse(write.text)).toEqual({ person: "ana@spell" })
  })

  test("invite only still:  a Bluesky account no Spell account is linked to is refused;  so is one taken down", async () => {
    const bo = JSON.parse(
      (await posted("/api/sign-in/atproto", { who: "bo.bsky.social", mode: "sign in", back: "/" })).text
    )
    expect(await cameBack(bo.url)).toMatchObject({ outcome: "not linked", cookie: "" })
    const eve = JSON.parse(
      (await posted("/api/sign-in/atproto", { who: "eve.bsky.social", mode: "sign in", back: "/" })).text
    )
    expect(await cameBack(eve.url)).toMatchObject({ outcome: "taken down", cookie: "" })
  })

  test("refused:  linking with nobody signed in, one linked to someone else, a host that says no, a page elsewhere", async () => {
    const nobody = await posted("/api/sign-in/atproto", { who: "ana.bsky.social", mode: "link", back: "/" })
    expect(nobody.status).toBe(401)

    const cookie = await anaByEmail()
    const eves = JSON.parse(
      (await posted("/api/sign-in/atproto", { who: "eve.bsky.social", mode: "link", back: "/" }, { cookie })).text
    )
    expect(await cameBack(eves.url)).toMatchObject({ outcome: "linked elsewhere" })

    const said = JSON.parse(
      (await posted("/api/sign-in/atproto", { who: "ana.bsky.social", mode: "sign in", back: "/" })).text
    )
    expect(await cameBack(said.url, { refuse: true })).toMatchObject({ outcome: "failed", why: /said no/ })
    // its state is spent
    expect(await cameBack(said.url)).toMatchObject({ outcome: "failed", why: expect.stringMatching(/ran out/) })

    const elsewhere = await posted("/api/sign-in/atproto", { mode: "sign in", back: "https://evil.example/" })
    expect(elsewhere.status).toBe(400)
    const nobodyCalled = await posted("/api/sign-in/atproto", { who: "zed.bsky.social", mode: "sign in", back: "/" })
    expect(nobodyCalled.status).toBe(502)
  })

  test("its client file is for an https address only:  here, local, there's none", async () => {
    expect((await ask(served.port, "GET", "/api/sign-in/atproto/client.json")).status).toBe(404)
  })
})

describe("a server at several addresses", () => {
  const MAIN = "https://spell.app"
  const OTHER = "https://spell.space"
  const identity = new FakeAtProtoIdentity({ "ana.bsky.social": "did:plc:ana" })
  let several: Served
  let catcher: MailCatcher

  beforeAll(async () => {
    catcher = new MailCatcher({ folder: join(folder, "several-mail") })
    const check = new SignInCheck({
      signIns: new SignIns(),
      mailer: catcher,
      accounts,
      address: MAIN,
      alsoAt: [`${OTHER}/`],
      atProto: identity
    })
    const guard = new SRV.Guard({ token: TOKEN })
    guard.allowAddress(MAIN).allowAddress(OTHER)
    const router = new SRV.Router()
    router.use(check.check)
    check.route(router, guard)
    several = await serveHandler(router.handle)
    guard.allowPort(several.port)
  })

  afterAll(() => several?.close())

  /** `POST <path>` with `body`, as a browser at `address`. */
  const postedAt = (address: string, path: string, body: object) =>
    ask(several.port, "POST", path, {
      body: JSON.stringify(body),
      headers: { host: new URL(address).host, origin: address, "content-type": "application/json" }
    })

  test("a mail's link starts with the address it was asked at", async () => {
    for (const address of [MAIN, OTHER]) {
      expect((await postedAt(address, "/api/sign-in/ask", { email: "ana@example.com" })).status).toBe(200)
      expect((await catcher.newestTo("ana@example.com"))!.text).toContain(`${address}/sign-in/confirm?key=`)
    }
  })

  test("a Bluesky sign-in starts, and comes back, at the address it was asked at", async () => {
    const { text } = await postedAt(OTHER, "/api/sign-in/atproto", {
      who: "ana.bsky.social",
      mode: "sign in",
      back: "/"
    })
    expect(identity.lastAt.started).toBe(OTHER)
    await ask(several.port, "GET", identity.backFor(JSON.parse(text).url), {
      headers: { host: new URL(OTHER).host }
    })
    expect(identity.lastAt.finished).toBe(OTHER)
  })

  test("any page at any of its addresses is a page to come back to;  nowhere else is", async () => {
    const ask = (back: string) =>
      postedAt(MAIN, "/api/sign-in/atproto", { who: "ana.bsky.social", mode: "sign in", back })
    expect((await ask(`${OTHER}/apps/x`)).status).toBe(200)
    expect((await ask("https://elsewhere.example/x")).status).toBe(400)
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
