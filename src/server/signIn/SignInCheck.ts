import { fileURLToPath } from "node:url"

import {
  SIGN_IN_PREFIX,
  type SignedInAnswer,
  type SignInAskAnswer,
  type SignInAsker,
  type SignInLinkAnswer,
  type SignInWaitAnswer
} from "spell/util/places/SpellSignIn"
import { SRV } from "spell/server"

import {
  CONFIRM_PAGE,
  MAIL_PAGE,
  SESSION_COOKIE,
  SESSION_DAYS,
  SIGN_IN_MINUTES,
  SignInError,
  type Mailer,
  type SessionMade,
  type SignInAccounts,
  type SignInRefusal
} from "./signIn.types"
import { SignIns } from "./SignIns"

/** What each refusal is answered with. */
const STATUS_OF_REFUSAL: Record<SignInRefusal, number> = {
  "not invited": 403,
  "no such request": 404,
  "wrong code": 400,
  "too many tries": 429,
  expired: 410,
  used: 410
}

/** What an email looks like, near enough:  something, an `@`, something with a dot. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The pages beside this file:  the link's confirm page, and the mail catcher's list. */
const PAGES = {
  [CONFIRM_PAGE]: fileURLToPath(new URL("confirm.html", import.meta.url)),
  [MAIL_PAGE]: fileURLToPath(new URL("mail.html", import.meta.url))
}

/** A request's addresses on this machine, and on a home or office network. */
const THIS_MACHINE = /^(127\.|::1$|::ffff:127\.)/
const THIS_NETWORK = /^(::ffff:)?(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|^f[cd]/i

/** A browser's name in its `User-Agent`, most particular first. */
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"]
]

/** A system's name in a `User-Agent`, most particular first. */
const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "an iPhone"],
  [/iPad/, "an iPad"],
  [/Android/, "an Android phone"],
  [/Mac OS X|Macintosh/, "a Mac"],
  [/Windows/, "Windows"],
  [/CrOS/, "a Chromebook"],
  [/Linux/, "Linux"]
]

/****************
 * ### `SignInCheck`
 * The ONE sign-in check of a server:  it puts the person signed in on every request (`request.person`), and answers
 * signing in by email (epic `atmosphere` P3).
 *
 * ```ts
 * const check = new SignInCheck({ signIns: new SignIns({ file }), mailer: new MailCatcher({ folder }), accounts })
 * router.use(check.check)               // first:  every route after it reads `request.person`
 * check.route(router, guard)
 * ```
 *
 * - WHO'S ASKING:  `check` reads the device's cookie (`SESSION_COOKIE`), and puts their address on the request.
 *   Every decider reads it there:  `Guard` (a signed-in page needs no run token), a `Referee`'s socket, the app's
 *   `prefsPersonFor()`, a place's `PlaceContext.identity` (`PlaceServer`), and so this machine's person is only who's
 *   asking when nobody's signed in.
 * - SIGNING IN, under `SIGN_IN_PREFIX` (its page half is `SpellSignIn`, `spell/util/places`):
 *   - `GET me`:  who's signed in here
 *   - `POST ask { email }`:  a one-time request, and a mail with its link and code;  the page keeps its id
 *   - `POST code { email, code }`:  the code typed on the asking device:  signed in
 *   - `POST waiting { request }`:  the asking page asks after it;  once its link's confirmed elsewhere, signed in too
 *   - `GET link?key=`:  what the link's page shows:  where it was asked, with one button
 *   - `POST confirm { key }`:  that button:  the device that opened the link, signed in
 *   - `POST out`:  signed out
 *   - `POST invite { email }`:  an account made, and a mail with a link and code:  this run's token only, never a
 *     sign-in (the machine's person invites)
 *   - `GET mail`:  every mail the local catcher caught, for its page;  404 with a real sender
 * - The link's page (`CONFIRM_PAGE`) first says where the request came from:  so nobody can trick someone into
 *   approving their own sign-in.  Then one button.
 * - INVITE ONLY:  an email with no account is refused, `"not invited"`.  Accounts are the app's (`SignInAccounts`).
 * - The cookie is `HttpOnly` and `SameSite=Strict`:  no other site's page sends it, nor any page's script reads it.
 * - Every route is behind `Guard`'s host check:  the server's own addresses only.
 * - Knows no people and no mail service:  `accounts` and `mailer` are handed in.
 ****************/
export class SignInCheck {
  /** The requests and signed-in devices. */
  readonly signIns: SignIns
  /** The mail seam. */
  readonly mailer: Mailer
  /** Who has an account, and making one. */
  private readonly accounts: SignInAccounts

  constructor({ signIns = new SignIns(), mailer, accounts }: SignInCheckProps) {
    this.signIns = signIns
    this.mailer = mailer
    this.accounts = accounts
  }

  /** Middleware:  who's signed in on this device, on the request (`request.person`);  nobody, `undefined`. */
  check: SRV.Handler = (request, _reply, next) => {
    this.putPersonOn(request)
    next()
  }

  /** SIDE EFFECT:  `request.person`, from its cookie.  For a request the router never saw:  a socket's.  NEVER throws. */
  putPersonOn(request: SRV.Request): void {
    request.person = this.signIns.personOf(cookieOf(request, SESSION_COOKIE))?.person
  }

  /** Add the sign-in routes and pages to `router`, behind `guard`'s host check. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    const body = SRV.parseBodies({ limit: 64 * 1024 })
    const checks = [guard.hostCheck, this.check, body]
    const at = (what: string) => `${SIGN_IN_PREFIX}/${what}`
    router.get(at("me"), ...checks, (request, reply) => answer(reply, this.me(request)))
    router.post(at("ask"), ...checks, async (request, reply) => answer(reply, await this.ask(request)))
    router.post(at("code"), ...checks, (request, reply) => answer(reply, this.byCode(request, reply)))
    router.post(at("waiting"), ...checks, (request, reply) => answer(reply, this.waiting(request, reply)))
    router.get(at("link"), ...checks, (request, reply) => answer(reply, this.link(request)))
    router.post(at("confirm"), ...checks, (request, reply) => answer(reply, this.confirm(request, reply)))
    router.post(at("out"), ...checks, (request, reply) => answer(reply, this.signOut(request, reply)))
    router.post(at("invite"), ...checks, guard.tokenCheck, async (request, reply) =>
      answer(reply, await this.invite(request))
    )
    router.get(at("mail"), ...checks, async (_request, reply) => answer(reply, { mails: await this.caught() }))
    for (const [page, file] of Object.entries(PAGES)) {
      router.get(page, guard.hostCheck, (_request, reply) => reply.set("Cache-Control", "no-store").sendFile(file))
    }
    return this
  }

  ////////////////
  // ## Each request
  ////////////////

  /** `GET me`:  who's signed in on this device. */
  private me(request: SRV.Request): SignedInAnswer {
    const session = this.signIns.personOf(cookieOf(request, SESSION_COOKIE))
    return session ? { person: session.person, email: session.email } : {}
  }

  /** `POST ask { email }`:  a request, and its mail.  - throws `HttpError(403)` for an email with no account */
  private async ask(request: SRV.Request): Promise<SignInAskAnswer> {
    const email = emailIn(request)
    const person = await this.accounts.accountFor(email)
    if (!person) {
      throw new SRV.HttpError(403, `${email} has no Spell account here:  this server is by invite only.`)
    }
    const asked = this.signIns.ask({ email, person, kind: "sign-in", from: askerOf(request) })
    const where = whereFrom(asked.from)
    await this.mailer.send({
      to: email,
      subject: "Sign in to Spell",
      text: [
        `Someone asked to sign in to Spell as ${person}${where ? `, ${where}` : ""}.`,
        "",
        "To sign in on any device, open this link:",
        linkFor(request, asked.linkKey),
        "",
        "Or type this code on the page that asked:",
        asked.code,
        "",
        `Both are good for ${SIGN_IN_MINUTES} minutes, once.  If it wasn't you, ignore this mail:  nobody's signed in until one is used.`
      ].join("\n")
    })
    return { request: asked.id }
  }

  /** `POST code { email, code }`:  this device, signed in. */
  private byCode(request: SRV.Request, reply: SRV.Reply): Required<SignedInAnswer> {
    return signedIn(
      reply,
      refusing(() => this.signIns.byCode(emailIn(request), textIn(request.body, "code")))
    )
  }

  /** `POST waiting { request }`:  still waiting, or signed in now. */
  private waiting(request: SRV.Request, reply: SRV.Reply): SignInWaitAnswer {
    const made = refusing(() => this.signIns.waiting(textIn(request.body, "request")))
    return made ? { status: "signed in", ...signedIn(reply, made) } : { status: "waiting" }
  }

  /** `GET link?key=`:  what the link's page shows. */
  private link(request: SRV.Request): SignInLinkAnswer {
    return refusing(() => this.signIns.link(textIn(request.query, "key")))
  }

  /** `POST confirm { key }`:  the device that opened the link, signed in. */
  private confirm(request: SRV.Request, reply: SRV.Reply): Required<SignedInAnswer> {
    return signedIn(
      reply,
      refusing(() => this.signIns.confirm(textIn(request.body, "key")))
    )
  }

  /** `POST out`:  this device, signed out. */
  private signOut(request: SRV.Request, reply: SRV.Reply): SignedInAnswer {
    this.signIns.end(cookieOf(request, SESSION_COOKIE))
    reply.set("Set-Cookie", `${SESSION_COOKIE}=; ${COOKIE_RULES}; Max-Age=0`)
    return {}
  }

  /** `POST invite { email }`:  an account for `email`, and a mail with its link and code. */
  private async invite(request: SRV.Request): Promise<{ person: string }> {
    const email = emailIn(request)
    const person = await this.accounts.invite(email)
    const asked = this.signIns.ask({ email, person, kind: "invite", from: { near: "from this machine's person" } })
    await this.mailer.send({
      to: email,
      subject: "You're invited to Spell",
      text: [
        `You're invited to Spell:  your account is ${person}.`,
        "",
        "To sign in on any device, open this link:",
        linkFor(request, asked.linkKey),
        "",
        "Or, on a Spell page that asks for your email, type it and then this code:",
        asked.code,
        "",
        `Both are good for ${SIGN_IN_MINUTES} minutes, once.  After that, sign in with your email on any Spell page.`
      ].join("\n")
    })
    return { person }
  }

  /** Every mail the catcher caught;  - throws `HttpError(404)` with a real sender */
  private async caught(): Promise<unknown[]> {
    if (!this.mailer.caught) throw new SRV.HttpError(404, "mail goes out for real here:  nothing's kept")
    return this.mailer.caught()
  }
}

/** Constructor props of a `SignInCheck`. */
export type SignInCheckProps = {
  /** The requests and signed-in devices:  default in memory only. */
  signIns?: SignIns
  /** The mail seam:  a `MailCatcher` for tests and this machine. */
  mailer: Mailer
  /** Who has an account, and making one:  the app's. */
  accounts: SignInAccounts
}

/** What the session cookie always says:  the whole server, out of every script's and other site's reach. */
const COOKIE_RULES = "Path=/; HttpOnly; SameSite=Strict"

/** Answer `value` as JSON, never cached. */
function answer(reply: SRV.Reply, value: unknown): void {
  reply.set("Cache-Control", "no-store").json(value)
}

/** SIDE EFFECT:  the reply sets `made`'s cookie;  returns who's signed in, as the page reads it. */
function signedIn(reply: SRV.Reply, { token, person, email }: SessionMade): Required<SignedInAnswer> {
  reply.set("Set-Cookie", `${SESSION_COOKIE}=${token}; ${COOKIE_RULES}; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`)
  return { person, email }
}

/** `run()`'s answer;  a `SignInError` as the `HttpError` it's answered with. */
function refusing<T>(run: () => T): T {
  try {
    return run()
  } catch (error) {
    if (error instanceof SignInError && error.kind) {
      throw new SRV.HttpError(STATUS_OF_REFUSAL[error.kind], error.message)
    }
    throw error
  }
}

/** The email a request's body names.  - throws `HttpError(400)` for one that isn't */
function emailIn(request: SRV.Request): string {
  const trimmed = textIn(request.body, "email")
  if (!EMAIL.test(trimmed)) throw new SRV.HttpError(400, `"${trimmed}" isn't an email address`)
  return trimmed
}

/** What a body or query says of `name`, trimmed:  `""` for anything but text. */
function textIn(said: unknown, name: string): string {
  const value = (said as Record<string, unknown> | undefined)?.[name]
  return typeof value === "string" ? value.trim() : ""
}

/** The cookie `name` a request carries;  `undefined` for none. */
function cookieOf(request: SRV.Request, name: string): string | undefined {
  return cookiesOf(request, name)[0]
}

/**
 * Every cookie named `name` a request carries, most particular path first, as a browser sends them:
 * a space's read credentials share one name, each with its own path (`ReadCredentials`).
 * - The ONE reader of a request's cookies.
 */
export function cookiesOf(request: SRV.Request, name: string): string[] {
  const values: string[] = []
  for (const part of (request.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=")
    if (key === name && value.join("=")) values.push(value.join("="))
  }
  return values
}

/** The link a mail carries:  this server's confirm page, at the address the request reached it by. */
function linkFor(request: SRV.Request, linkKey: string): string {
  return `http://${request.get("host")}${CONFIRM_PAGE}?key=${linkKey}`
}

/**
 * Where a request came from, as its link's page shows it:  browser, system, and a rough place.
 * - The place is only what its address says by itself:  this machine, or this network.
 *   Somewhere farther needs a lookup by address, a new dependency:  left out (epic `atmosphere` P3).
 */
export function askerOf(request: SRV.Request): SignInAsker {
  const agent = request.get("user-agent") ?? ""
  const browser = BROWSERS.find(([pattern]) => pattern.test(agent))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(agent))?.[1]
  const address = request.raw.socket.remoteAddress ?? ""
  const near = THIS_MACHINE.test(address)
    ? "on this machine"
    : THIS_NETWORK.test(address)
      ? "on this network"
      : undefined
  return { ...(browser && { browser }), ...(system && { system }), ...(near && { near }) }
}

/** `from` as a mail says it:  `from Chrome, on a Mac, on this machine`;  `""` when it can't tell. */
function whereFrom({ browser, system, near }: SignInAsker): string {
  const parts = [browser && `from ${browser}`, system && `on ${system}`, near].filter(Boolean)
  return parts.join(", ")
}
