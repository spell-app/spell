import { randomBytes } from "node:crypto"
import { fileURLToPath } from "node:url"

import {
  BACK_OUTCOME,
  BACK_WHY,
  SIGN_IN_PREFIX,
  type AtProtoAsk,
  type AtProtoAskAnswer,
  type AtProtoOutcome,
  type SignedInAnswer,
  type SignInAskAnswer,
  type SignInMeAnswer,
  type SignInAsker,
  type SignInLinkAnswer,
  type SignInWaitAnswer
} from "spell/places/SpellSignIn"
import { handleFor } from "spell/places/AtProtoSignIn"
import { SRV } from "spell/server"

import {
  ATPROTO_BACK_PAGE,
  ATPROTO_CLIENT_FILE,
  CONFIRM_PAGE,
  MAIL_PAGE,
  SESSION_COOKIE,
  SESSION_DAYS,
  SignInError,
  type AtProtoIdentities,
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
  used: 410,
  "taken down": 451,
  "not linked": 403,
  "linked elsewhere": 409
}

/** Where an atmosphere sign-in starts when nobody's named:  Bluesky's own host, whose page asks who. */
const BLUESKY = "https://bsky.social"

/** How long a sign-in gone to an atmosphere account's host may take to come back, ms. */
const ATPROTO_MINUTES_MS = 20 * 60_000

/** A sign-in gone to an atmosphere account's host, waiting for it to send the browser back. */
type AtProtoPending = {
  /** Sign in by it, or link it. */
  mode: AtProtoAsk["mode"]
  /** Who was named:  a handle is kept, to show beside the account it's linked to. */
  who: string
  /** Linking:  the Spell account signed in as it started.  The cookie doesn't come back with the host's redirect. */
  person?: string
  /** The page to go back to. */
  back: string
  /** When it's forgotten, ms. */
  ends: number
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
 * - SIGNING IN, under `SIGN_IN_PREFIX` (its page half is `SpellSignIn`, `spell/places`):
 *   - `GET me`:  who's signed in here
 *   - `POST ask { email }`:  a one-time request, and a mail with its link and code;  the page keeps its id
 *   - `POST code { email, code }`:  the code typed on the asking device:  signed in
 *   - `POST waiting { request }`:  the asking page asks after it;  once its link's confirmed elsewhere, signed in too
 *   - `GET link?key=`:  what the link's page shows:  where it was asked, with one button
 *   - `POST confirm { key }`:  that button:  the device that opened the link, signed in
 *   - `POST out`:  signed out
 *   - `POST invite { email }`:  an account made, and a mail with a link and code:  this run's token only, never a
 *     sign-in (the machine's person invites)
 *   - `GET mail`:  every mail the local catcher caught, for its page;  404 with a real sender, and on a server people
 *     reach from outside (`caughtMail: "hidden"`, epic `atmosphere` P8)
 * - SIGNING IN WITH AN ATMOSPHERE (BLUESKY) ACCOUNT, given `atProto` (epic `atmosphere` P19):
 *   - `POST atproto { who, mode, back }`:  where to send the browser, the account's own host
 *     - `mode: "link"`:  the Spell account signed in now is linked to it, once they're back
 *     - `mode: "sign in"`:  the account linked to it is signed in on this device, the same session the emailed code
 *       makes
 *   - `GET atproto/back`:  the host sends the browser back here;  then on to `back`, with how it went in its address
 *     (`BACK_OUTCOME`)
 *   - `GET atproto/client.json`:  who the server is, for a host, on an `https` address
 *   - INVITE ONLY still:  an atmosphere account no Spell account is linked to is refused, `"not linked"`;
 *     one linked to an account taken down, `"taken down"`
 *   - The account's DID is what's linked;  its handle only for show.
 * - The link's page (`CONFIRM_PAGE`) first says where the request came from:  so nobody can trick someone into
 *   approving their own sign-in.  Then one button.
 * - INVITE ONLY:  an email with no account is refused, `"not invited"`.  Accounts are the app's (`SignInAccounts`).
 * - An account Spell took down (epic `atmosphere` P6) is refused too, `"taken down"`, naming the abuse contact:
 *   no mail goes out.
 *   A device signed in to it before stays signed in, but every space refuses it (the app's `Takedowns`).
 * - The ABUSE CONTACT (`abuseContact`, the server's settings) is in `GET me`'s answer:  the sign-in bar and the
 *   link's page show it.
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
  /** Where people report abuse:  `""` for none. */
  private readonly abuseContact: string
  /** Where people reach this server, its mails' links' start:  `undefined`, whatever host a request named, over http. */
  private readonly address: string | undefined
  /** The other addresses people reach it at:  a sign-in begun at one finishes there. */
  private readonly alsoAt: string[]
  /** Does it show what the local mail catcher caught (`GET mail`, its page)? */
  private readonly caughtMail: "shown" | "hidden"
  /** Who someone is on the atmosphere:  left out, no signing in that way. */
  private readonly atProto: AtProtoIdentities | undefined
  /** Each sign-in gone to a host, by the state it carries. */
  private readonly atProtoPending = new Map<string, AtProtoPending>()

  constructor({
    signIns = new SignIns(),
    mailer,
    accounts,
    abuseContact = "",
    address,
    alsoAt = [],
    caughtMail = "shown",
    atProto
  }: SignInCheckProps) {
    this.signIns = signIns
    this.mailer = mailer
    this.accounts = accounts
    this.abuseContact = abuseContact
    this.address = address?.replace(/\/+$/, "")
    this.alsoAt = alsoAt.map((each) => each.replace(/\/+$/, ""))
    this.caughtMail = caughtMail
    this.atProto = atProto
  }

  /** Middleware:  who's signed in on this device, on the request (`request.person`);  nobody, `undefined`. */
  check: SRV.Handler = (request, _reply, next) => {
    this.putPersonOn(request)
    next()
  }

  /**
   * Put who's signed in on `request`, from its cookie.
   * - SIDE EFFECT:  sets `request.person`.
   * - For a request the router never saw, too:  a socket's.
   * - NEVER throws.
   */
  putPersonOn(request: SRV.Request): void {
    request.person = this.signIns.personOf(cookieOf(request, SESSION_COOKIE))?.person
  }

  /** Add the sign-in routes and pages to `router`, behind `guard`'s host check. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    const body = SRV.parseBodies({ limit: 64 * 1024 })
    const checks = [guard.hostCheck, this.check, body]
    const at = (what: string) => `${SIGN_IN_PREFIX}/${what}`
    router.get(at("me"), ...checks, async (request, reply) => answer(reply, await this.me(request)))
    router.post(at("ask"), ...checks, async (request, reply) => answer(reply, await this.ask(request)))
    router.post(at("code"), ...checks, (request, reply) => answer(reply, this.byCode(request, reply)))
    router.post(at("waiting"), ...checks, (request, reply) => answer(reply, this.waiting(request, reply)))
    router.get(at("link"), ...checks, (request, reply) => answer(reply, this.link(request)))
    router.post(at("confirm"), ...checks, (request, reply) => answer(reply, this.confirm(request, reply)))
    router.post(at("out"), ...checks, (request, reply) => answer(reply, this.signOut(request, reply)))
    router.post(at("invite"), ...checks, guard.tokenCheck, async (request, reply) =>
      answer(reply, await this.invite(request))
    )
    if (this.atProto) {
      router.post(at("atproto"), ...checks, async (request, reply) => answer(reply, await this.startAtProto(request)))
      router.get(ATPROTO_BACK_PAGE, guard.hostCheck, this.check, async (request, reply) =>
        this.atProtoBack(request, reply)
      )
      router.get(ATPROTO_CLIENT_FILE, guard.hostCheck, (request, reply) => {
        const file = this.atProto?.clientFile?.(this.addressFor(request))
        if (!file) throw new SRV.HttpError(404, "this server's address is local:  a host needs no client file")
        answer(reply, file)
      })
    }
    if (this.caughtMail === "shown") {
      router.get(at("mail"), ...checks, async (_request, reply) => answer(reply, { mails: await this.caught() }))
    }
    for (const [page, file] of Object.entries(PAGES)) {
      if (page === MAIL_PAGE && this.caughtMail === "hidden") continue
      router.get(page, guard.hostCheck, (_request, reply) => reply.set("Cache-Control", "no-store").sendFile(file))
    }
    return this
  }

  /**
   * Which of this server's addresses `request` came to:  one of `alsoAt` when its `Host` is that one's, else `address`.
   * - So a `Host` naming anywhere else never picks where a mail's link goes.
   */
  private addressFor(request: SRV.Request): string | undefined {
    const host = request.get("host")?.toLowerCase()
    return this.alsoAt.find((each) => new URL(each).host === host) ?? this.address
  }

  /** The link a mail carries:  this server's confirm page, at the address asked at, else the one the request reached. */
  private linkFor(request: SRV.Request, linkKey: string): string {
    return `${this.addressFor(request) ?? `http://${request.get("host")}`}${CONFIRM_PAGE}?key=${linkKey}`
  }

  ////////////////
  // ## Each request
  ////////////////

  /** `GET me`:  who's signed in on this device, where to report abuse, and the atmosphere account they're linked to. */
  private async me(request: SRV.Request): Promise<SignInMeAnswer> {
    const session = this.signIns.personOf(cookieOf(request, SESSION_COOKIE))
    const linked = session && this.atProto ? await this.accounts.linkedOf?.(session.person) : undefined
    return {
      ...(session && { person: session.person, email: session.email }),
      ...(this.abuseContact && { abuseContact: this.abuseContact }),
      ...(this.atProto && { atProto: linked ? { linked: linked.handle } : {} })
    }
  }

  /** - throws `HttpError(451)` for an account Spell took down, naming the abuse contact */
  private async notTakenDownOrDie(person: string): Promise<void> {
    if (!(await this.accounts.isTakenDown?.(person))) return
    const asking = this.abuseContact ? `  To ask about it:  ${this.abuseContact}` : ""
    throw new SRV.HttpError(STATUS_OF_REFUSAL["taken down"], `The account ${person} was taken down by Spell.${asking}`)
  }

  /**
   * `POST ask { email }`:  a request, and its mail.
   * - throws `HttpError(403)` for an email with no account;  451 for an account taken down
   */
  private async ask(request: SRV.Request): Promise<SignInAskAnswer> {
    const email = emailIn(request)
    const person = await this.accounts.accountFor(email)
    if (!person) {
      throw new SRV.HttpError(403, `${email} has no Spell account here:  this server is by invite only.`)
    }
    await this.notTakenDownOrDie(person)
    const asked = this.signIns.ask({ email, person, kind: "sign-in", from: askerOf(request) })
    const where = whereFrom(asked.from)
    await this.mailer.send({
      to: email,
      subject: "Sign in to Spell",
      text: [
        `Someone asked to sign in to Spell as ${person}${where ? `, ${where}` : ""}.`,
        "",
        "To sign in on any device, open this link:",
        this.linkFor(request, asked.linkKey),
        "",
        "Or type this code on the page that asked:",
        asked.code,
        "",
        `Both are good for ${this.signIns.minutes} minutes, once.  If it wasn't you, ignore this mail:  nobody's signed in until one is used.`
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
    await this.notTakenDownOrDie(person)
    const asked = this.signIns.ask({ email, person, kind: "invite", from: { near: "from this machine's person" } })
    await this.mailer.send({
      to: email,
      subject: "You're invited to Spell",
      text: [
        `You're invited to Spell:  your account is ${person}.`,
        "",
        "To sign in on any device, open this link:",
        this.linkFor(request, asked.linkKey),
        "",
        "Or, on a Spell page that asks for your email, type it and then this code:",
        asked.code,
        "",
        `Both are good for ${this.signIns.minutes} minutes, once.  After that, sign in with your email on any Spell page.`
      ].join("\n")
    })
    return { person }
  }

  ////////////////
  // ## Signing in with an atmosphere account
  ////////////////

  /**
   * `POST atproto { who, mode, back }`:  where to send the browser to sign in at the account's own host.
   * - throws `HttpError(401)` linking with nobody signed in;  400 for a `back` that isn't this server's;
   *   502 for a `who` that can't be found, or a host that can't be reached
   */
  private async startAtProto(request: SRV.Request): Promise<AtProtoAskAnswer> {
    const mode: AtProtoAsk["mode"] = textIn(request.body, "mode") === "link" ? "link" : "sign in"
    if (mode === "link" && !request.person) {
      throw new SRV.HttpError(401, "Sign in to your Spell account first, then link a Bluesky account to it.")
    }
    const who = handleFor(textIn(request.body, "who")) || BLUESKY
    const back = this.backOrDie(request, textIn(request.body, "back"))
    const state = randomBytes(16).toString("hex")
    this.dropOldPending()
    this.atProtoPending.set(state, {
      mode,
      who,
      back,
      ends: Date.now() + ATPROTO_MINUTES_MS,
      ...(mode === "link" && { person: request.person })
    })
    try {
      return { url: await this.atProto!.start(who, state, this.addressFor(request)) }
    } catch (error) {
      this.atProtoPending.delete(state)
      throw new SRV.HttpError(502, `Can't sign in as ${who}:  ${(error as Error)?.message ?? error}`)
    }
  }

  /**
   * `GET atproto/back`:  the host sent the browser back.  Signs in or links, then sends it on to the page it came
   * from, with how it went in the address (`BACK_OUTCOME`).
   * - NEVER throws:  every failure goes back to the page, said.
   */
  private async atProtoBack(request: SRV.Request, reply: SRV.Reply): Promise<void> {
    const params = new URLSearchParams(request.originalUrl.split("?")[1] ?? "")
    const pending = this.atProtoPending.get(params.get("state") ?? "")
    if (pending) this.atProtoPending.delete(params.get("state")!)
    const goBack = (outcome: AtProtoOutcome, why?: string) => {
      const url = new URL(pending?.back ?? "/", "http://here")
      url.searchParams.set(BACK_OUTCOME, outcome)
      if (why) url.searchParams.set(BACK_WHY, why)
      reply.set("Cache-Control", "no-store").redirect(`${url.pathname}${url.search}${url.hash}`, 303)
    }
    if (!pending || pending.ends <= Date.now()) {
      return goBack("failed", "That sign-in ran out, or it's from before the server restarted:  try again.")
    }
    let did: string
    let handle: string | undefined
    try {
      ;({ did, handle } = await this.atProto!.finish(params, this.addressFor(request)))
    } catch (error) {
      return goBack("failed", `${(error as Error)?.message ?? error}`)
    }
    try {
      if (pending.mode === "link") {
        await this.accounts.link!(pending.person!, { did, handle: handle ?? handleShown(pending.who, did) })
        return goBack("linked")
      }
      const person = await this.accounts.accountForDid?.(did)
      if (!person) return goBack("not linked")
      if (await this.accounts.isTakenDown?.(person)) return goBack("taken down")
      signedIn(reply, this.signIns.signInLinked(person))
      return goBack("signed in")
    } catch (error) {
      if (error instanceof SignInError && error.kind === "linked elsewhere") return goBack("linked elsewhere")
      console.error("SignInCheck:  an atmosphere sign-in came back, and failed", error)
      return goBack("failed", `${(error as Error)?.message ?? error}`)
    }
  }

  /**
   * The page to come back to, as a path on this server.
   * - throws `HttpError(400)` for one on another server:  so nobody's sent on somewhere else, signed in
   */
  private backOrDie(request: SRV.Request, back: string): string {
    const here = `http://${request.get("host")}`
    const url = new URL(back || "/", here)
    const addresses = [...(this.address ? [this.address] : []), ...this.alsoAt]
    const isHere = url.host === request.get("host") || addresses.some((each) => url.origin === new URL(each).origin)
    if (!isHere) throw new SRV.HttpError(400, `"${back}" isn't a page of this server's to come back to`)
    return `${url.pathname}${url.search}${url.hash}`
  }

  /** Forget every sign-in gone to a host that ran out. */
  private dropOldPending(): void {
    const now = Date.now()
    for (const [state, { ends }] of this.atProtoPending) if (ends <= now) this.atProtoPending.delete(state)
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
  /** Where people report abuse, the server's settings':  shown on the sign-in bar and the link's page.  Default none. */
  abuseContact?: string
  /**
   * Where people reach this server, `https://spell.example.org`, behind whatever gives it that address (epic
   * `atmosphere` P8):  its mails' links start with it.  Default whatever host a request named, over http.
   */
  address?: string
  /** The other addresses people reach it at:  a sign-in begun at one has its link, and comes back, there. */
  alsoAt?: string[]
  /**
   * Does it show what the local mail catcher caught (`GET mail`, `MAIL_PAGE`)?  Default `"shown"`, for this machine;
   * `"hidden"` on a server people reach from outside, where it would hand anyone everyone's codes.
   */
  caughtMail?: "shown" | "hidden"
  /**
   * Who someone is on the atmosphere (`AtProtoIdentity`, or a test's):  signing in with an atmosphere (Bluesky)
   * account linked to a Spell account (epic `atmosphere` P19).  Left out:  no signing in that way.
   */
  atProto?: AtProtoIdentities
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

/**
 * Where a request came from, as its link's page shows it:  browser, system, and a rough place.
 * - The place is only what its address says by itself:  this machine, or this network.
 *   Somewhere farther needs a lookup by address, a new dependency:  left out (epic `atmosphere` P3).
 * - Its address is the asker's, not a tunnel's or proxy's on this machine:  `addressOf()`.
 */
export function askerOf(request: SRV.Request): SignInAsker {
  const agent = request.get("user-agent") ?? ""
  const browser = BROWSERS.find(([pattern]) => pattern.test(agent))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(agent))?.[1]
  const address = addressOf(request)
  const near = THIS_MACHINE.test(address)
    ? "on this machine"
    : THIS_NETWORK.test(address)
      ? "on this network"
      : undefined
  return { ...(browser && { browser }), ...(system && { system }), ...(near && { near }) }
}

/**
 * The address a request came from:  the socket's, or, when that's this machine,
 * the one a tunnel or proxy here passed on in `X-Forwarded-For` (epic `atmosphere` I4).
 * - Behind a tunnel, every request comes from this machine, so the confirm page said "on this machine" for Ana's laptop.
 * - Trusted only from this machine:  anyone farther could write the header themselves.
 * - The LAST address in the header, the one the proxy here added;  earlier ones came from the asker.
 */
function addressOf(request: SRV.Request): string {
  const socket = request.raw.socket.remoteAddress ?? ""
  const forwarded = request.get("x-forwarded-for")
  if (!forwarded || !THIS_MACHINE.test(socket)) return socket
  return forwarded.split(",").at(-1)!.trim() || socket
}

/** The handle to show for a linked account:  what was named, when it's a handle;  else its DID. */
function handleShown(who: string, did: string): string {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(who) && !/^https?:/.test(who) && who !== BLUESKY ? who : did
}

/** `from` as a mail says it:  `from Chrome, on a Mac, on this machine`;  `""` when it can't tell. */
function whereFrom({ browser, system, near }: SignInAsker): string {
  const parts = [browser && `from ${browser}`, system && `on ${system}`, near].filter(Boolean)
  return parts.join(", ")
}
