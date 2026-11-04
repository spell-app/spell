import { createHash, randomBytes, randomInt } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import {
  CODE_TRIES,
  SESSION_DAYS,
  SIGN_IN_MINUTES,
  SignInError,
  type Session,
  type SessionMade,
  type SignInAsker,
  type SignInRefusal
} from "./signIn.types"

/** A minute, a day:  ms. */
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** How many requests it keeps, oldest dropped first:  far more than ten minutes ever holds. */
const REQUESTS_KEPT = 1000

/** One sign-in someone asked for, or an invite:  its link and its code, good once, for `SIGN_IN_MINUTES`. */
type SignInRequest = {
  /** The asking page's id for it:  only that page knows it. */
  id: string
  /** What its emailed link carries:  only the email knows it. */
  linkKey: string
  /** Its six digits. */
  code: string
  /** The email it went to. */
  email: string
  /** The account it signs into. */
  person: string
  /** A sign-in someone asked for, which a page waits on;  or an invite, which nothing waits on. */
  kind: "sign-in" | "invite"
  /** Where it was asked for. */
  from: SignInAsker
  /** When it runs out, ms. */
  ends: number
  /** Wrong codes so far. */
  tries: number
  /**
   * Where it stands:
   * - `"waiting"`:  for its link, or its code
   * - `"confirmed"`:  its link was, on some device;  the asking page's sign-in waits in `forAsker`
   * - `"used"`:  done
   */
  state: "waiting" | "confirmed" | "used"
  /** The asking page's sign-in, made as the link was confirmed, handed out once. */
  forAsker?: SessionMade
}

/****************
 * ### `SignIns`
 * The sign-in requests and the signed-in devices of one server (epic `atmosphere` P3):  the rules, with no HTTP.
 *
 * ```ts
 * const request = signIns.ask({ email, person: "ana@spell", kind: "sign-in", from })
 * signIns.byCode(email, "123456")       // the asking device, signed in
 * signIns.confirm(request.linkKey)      // the device that opened the link, signed in;  and then:
 * signIns.waiting(request.id)           // the asking device too, once
 * ```
 *
 * - A request is good for `SIGN_IN_MINUTES`, ONCE:  its code typed, or its link confirmed.
 *   - A link confirmed on another device signs both in:  that one at once, the asking one at its next ask.
 *   - `CODE_TRIES` wrong codes, and it's done.
 *   - A newer request for the same email doesn't end an older one:  both are good till they run out.
 * - A device's sign-in lasts `SESSION_DAYS`.  Its token is the cookie's, and only its HASH is kept:
 *   a copy of the file signs nobody in.
 *   - Kept in `file`, when it has one, so a restart keeps everyone signed in;  requests are only in memory.
 * - The time is `now()`'s:  a test moves it.
 * - Knows nothing of mail, people or requests over HTTP:  `SignInCheck` does those.
 * - Refusals throw `SignInError`, its words for people.
 ****************/
export class SignIns {
  /** Where the signed-in devices are kept;  left out:  memory only. */
  private readonly file: string | undefined
  /** The time now, ms. */
  private readonly now: () => number
  /** Each request, by its id:  oldest first. */
  private readonly requests = new Map<string, SignInRequest>()
  /** Each device signed in, by its token's hash. */
  private readonly sessions = new Map<string, Session>()

  constructor({ file, now = Date.now }: SignInsProps = {}) {
    this.file = file
    this.now = now
    this.readSessions()
  }

  ////////////////
  // ## Asking
  ////////////////

  /** A new request for `email`, to sign into `person`:  its link's key and code go in the mail. */
  ask({ email, person, kind, from }: Pick<SignInRequest, "email" | "person" | "kind" | "from">): SignInRequest {
    const request: SignInRequest = {
      id: secret(),
      linkKey: secret(),
      code: `${randomInt(0, 1_000_000)}`.padStart(6, "0"),
      email,
      person,
      kind,
      from,
      ends: this.now() + SIGN_IN_MINUTES * MINUTE,
      tries: 0,
      state: "waiting"
    }
    this.requests.set(request.id, request)
    for (const oldest of this.requests.keys()) {
      if (this.requests.size <= REQUESTS_KEPT) break
      this.requests.delete(oldest)
    }
    return request
  }

  /**
   * The code typed for `email`:  this device signed in.
   * - It's the newest request for that email still good.
   * - throws `SignInError`:  none waiting, run out, too many tries, a wrong code (saying how many are left)
   */
  byCode(email: string, code: string): SessionMade {
    const request = this.newestFor(email)
    if (!request) refuse("no such request", "No sign-in is waiting for that email:  ask for a new one.")
    this.dieUnlessWaiting(request)
    if (request.tries >= CODE_TRIES) refuse("too many tries", "Too many wrong codes:  ask for a new one.")
    if (code !== request.code) {
      request.tries++
      const left = CODE_TRIES - request.tries
      if (!left) refuse("too many tries", "That code is wrong, and it was the last try:  ask for a new one.")
      refuse("wrong code", `That code is wrong:  ${left} ${left === 1 ? "try" : "tries"} left.`)
    }
    request.state = "used"
    return this.signIn(request)
  }

  /**
   * The link opened, and confirmed:  this device signed in, and the asking one at its next ask (`waiting()`).
   * - throws `SignInError`:  no such link, run out, already used
   */
  confirm(linkKey: string): SessionMade {
    const request = this.byLink(linkKey)
    this.dieUnlessWaiting(request)
    if (request.kind === "sign-in") {
      request.state = "confirmed"
      request.forAsker = this.signIn(request)
    } else request.state = "used"
    return this.signIn(request)
  }

  /**
   * The asking page asks after its request:  `undefined` while it waits;  its sign-in once the link's confirmed, ONCE.
   * - throws `SignInError`:  no such request, run out, already used
   */
  waiting(id: string): SessionMade | undefined {
    const request = this.requests.get(id)
    if (!request) refuse("no such request", "That sign-in isn't waiting any more:  ask for a new one.")
    if (request.state === "confirmed" && request.forAsker) {
      const made = request.forAsker
      request.state = "used"
      delete request.forAsker
      return made
    }
    this.dieUnlessWaiting(request)
    return undefined
  }

  /** What the link's page shows:  where it went, what it's for, where it was asked.  - throws as `confirm()` */
  link(linkKey: string): Pick<SignInRequest, "email" | "kind" | "from"> {
    const request = this.byLink(linkKey)
    this.dieUnlessWaiting(request)
    const { email, kind, from } = request
    return { email, kind, from }
  }

  ////////////////
  // ## Signed-in devices
  ////////////////

  /** Who a device's token signs in:  `undefined` for none, or one that's ended. */
  personOf(token: string | undefined): Session | undefined {
    if (!token) return undefined
    const session = this.sessions.get(hashOf(token))
    if (!session) return undefined
    if (session.ends > this.now()) return session
    this.sessions.delete(hashOf(token))
    this.writeSessions()
    return undefined
  }

  /** That device signs out.  NEVER throws. */
  end(token: string | undefined): void {
    if (token && this.sessions.delete(hashOf(token))) this.writeSessions()
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** A device signed in by `request`. */
  private signIn({ person, email }: SignInRequest): SessionMade {
    const token = secret()
    this.sessions.set(hashOf(token), { person, email, ends: this.now() + SESSION_DAYS * DAY })
    this.writeSessions()
    return { token, person, email }
  }

  /** The newest request for `email` still waiting and good, else the newest at all, for its refusal. */
  private newestFor(email: string): SignInRequest | undefined {
    const forEmail = [...this.requests.values()].filter((request) => request.email === email).reverse()
    return forEmail.find((request) => request.state === "waiting" && request.ends > this.now()) ?? forEmail[0]
  }

  /** The request whose link is `linkKey`.  - throws `SignInError`, `"no such request"` */
  private byLink(linkKey: string): SignInRequest {
    const request = [...this.requests.values()].find((each) => each.linkKey === linkKey)
    if (!request) refuse("no such request", "That link isn't one this server sent, or it's from before it restarted.")
    return request
  }

  /** - throws `SignInError` unless `request` is waiting, and good */
  private dieUnlessWaiting(request: SignInRequest): void {
    if (request.state !== "waiting") refuse("used", "That sign-in was used already:  ask for a new one.")
    if (request.ends <= this.now()) {
      refuse("expired", `That sign-in ran out:  each is good for ${SIGN_IN_MINUTES} minutes.  Ask for a new one.`)
    }
  }

  /** The devices signed in, from `file`.  NEVER throws:  one that won't read is nobody signed in, and said. */
  private readSessions(): void {
    if (!this.file || !existsSync(this.file)) return
    try {
      const kept = JSON.parse(readFileSync(this.file, "utf8")) as Record<string, Session>
      for (const [hash, session] of Object.entries(kept)) this.sessions.set(hash, session)
    } catch (ignored) {
      console.error(`SignIns:  ${this.file} won't read, so nobody's signed in`, ignored)
    }
  }

  /** SIDE EFFECT:  the devices signed in, to `file`, all at once, readable by this machine's person only. */
  private writeSessions(): void {
    if (!this.file) return
    const now = this.now()
    const kept = Object.fromEntries([...this.sessions].filter(([, { ends }]) => ends > now))
    mkdirSync(dirname(this.file), { recursive: true })
    const temp = `${this.file}.${process.pid}.tmp`
    writeFileSync(temp, `${JSON.stringify(kept, null, 2)}\n`, { mode: 0o600 })
    renameSync(temp, this.file)
  }
}

/** Constructor props of `SignIns`. */
export type SignInsProps = {
  /** Where the signed-in devices are kept, a JSON file;  left out:  memory only, so a restart signs everyone out. */
  file?: string
  /** The time now, ms;  default `Date.now`. */
  now?: () => number
}

/** A secret:  32 random bytes, as hex. */
function secret(): string {
  return randomBytes(32).toString("hex")
}

/** What's kept of a token:  its SHA-256. */
function hashOf(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** - throws `SignInError`, `kind`, saying `message` */
function refuse(kind: SignInRefusal, message: string): never {
  throw new SignInError(message, { cause: { kind } })
}
