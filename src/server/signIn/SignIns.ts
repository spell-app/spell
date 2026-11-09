import { createHash, randomBytes, randomInt } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import {
  CODE_TRIES,
  PASSWORD_ADDRESS_TRIES,
  PASSWORD_PROOF_MINUTES,
  PASSWORD_TRIES,
  PASSWORD_WAIT_MINUTES,
  SESSION_DAYS,
  SIGN_IN_MINUTES,
  SignInError,
  type Session,
  type SessionMade,
  type SignInAsker,
  type SignInRefusal,
  type SignInWay
} from "./signIn.types"
import { Passwords } from "./Passwords"

/** A minute, a day:  ms. */
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** How many requests it keeps, oldest dropped first:  far more than a request's minutes ever hold. */
const REQUESTS_KEPT = 1000

/** How many accounts' and addresses' wrong passwords it remembers, oldest dropped first. */
const TRIES_KEPT = 10_000

/** The file beside the signed-in devices that holds the passwords. */
const PASSWORDS_FILE = "passwords.json"

/** The one answer to a wrong password, whether or not anyone has that email. */
const WRONG_PASSWORD = "That email and password don't go together."

/** Wrong passwords counted against one account, or one address. */
type WrongTries = {
  /** How many so far. */
  count: number
  /** When they're forgotten, ms:  or, at the limit, when the wait is over. */
  ends: number
}

/** One sign-in someone asked for, or an invite:  its link and its code, good once, for `SignIns.minutes`. */
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
 * - A request is good for `minutes` (default `SIGN_IN_MINUTES`, 20), ONCE:  its code typed, or its link confirmed.
 *   - Nothing done by then, it ends.
 *   - A link confirmed on another device signs both in:  that one at once, the asking one at its next ask.
 *   - `CODE_TRIES` wrong codes, and it's done.
 *   - A newer request for the same email doesn't end an older one:  both are good till they run out.
 * - A device's sign-in lasts `SESSION_DAYS`.  Its token is the cookie's, and only its HASH is kept:
 *   a copy of the file signs nobody in.
 *   - Kept in `file`, when it has one, so a restart keeps everyone signed in;  requests are only in memory.
 * - A PASSWORD (epic `atmosphere` T64), `passwords`, a hash per account in a file beside the devices:
 *   - `checkPassword()`, then `signInByPassword()`:  the same `SESSION_DAYS` a code or a link makes
 *   - a wrong password and an account nobody has are refused alike, in about the same time:
 *     a wrong try's count is by account, or the name typed when there's no such account
 *   - `PASSWORD_TRIES` wrong tries for an account, `PASSWORD_ADDRESS_TRIES` from an address, then a
 *     `PASSWORD_WAIT_MINUTES` wait;  only in memory, as requests are
 *   - `changePassword()`:  the current one, or a sign-in by emailed link or code in the last
 *     `PASSWORD_PROOF_MINUTES`;  a password replaced ends the account's other devices
 * - The time is `now()`'s:  a test moves it.
 * - Knows nothing of mail, people or requests over HTTP:  `SignInCheck` does those.
 * - Refusals throw `SignInError`, its words for people.
 ****************/
export class SignIns {
  /** Where the signed-in devices are kept;  left out:  memory only. */
  private readonly file: string | undefined
  /** The time now, ms. */
  private readonly now: () => number
  /** How long a request is good for, in minutes. */
  readonly minutes: number
  /** Each request, by its id:  oldest first. */
  private readonly requests = new Map<string, SignInRequest>()
  /** Each device signed in, by its token's hash. */
  private readonly sessions = new Map<string, Session>()
  /** Each account's password. */
  readonly passwords: Passwords
  /** Wrong passwords, by what they're counted against:  oldest first. */
  private readonly wrongTries = new Map<string, WrongTries>()

  constructor({ file, now = Date.now, minutes = SIGN_IN_MINUTES }: SignInsProps = {}) {
    this.file = file
    this.now = now
    this.minutes = minutes
    this.passwords = new Passwords(file ? { file: join(dirname(file), PASSWORDS_FILE) } : {})
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
      ends: this.now() + this.minutes * MINUTE,
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

  /**
   * A device signed in to `person` with no request:  their host vouched for them, by a linked atmosphere account
   * (epic `atmosphere` P19).
   * - Its session's `email` is `""`.
   */
  signInLinked(person: string): SessionMade {
    return this.signIn({ person, email: "" }, "linked account")
  }

  ////////////////
  // ## Passwords
  ////////////////

  /**
   * Is `password` right for `person`, typed as `typed`, from `address`?
   * - `person`:  `undefined` for nobody with that name:  it takes as long, and is refused the same.
   * - throws `SignInError`:  `"wrong password"`;  `"too many tries"`, right or wrong
   * - SIDE EFFECT:  counts a wrong try
   */
  async checkPassword({ person, typed, address, password }: PasswordTry): Promise<string> {
    const counts = { account: `account:${person ?? typed.toLowerCase()}`, address: `address:${address}` }
    this.dieIfWaiting(counts)
    // counted before it's checked, as checking takes a while:  so tries at the same moment can't all get through
    this.countTry(counts.account, PASSWORD_TRIES)
    this.countTry(counts.address, PASSWORD_ADDRESS_TRIES)
    // asked even for nobody, so nobody takes as long as someone
    const isRight = await this.passwords.matches(person, password)
    if (!person || !isRight) refuse("wrong password", WRONG_PASSWORD)
    this.wrongTries.delete(counts.account)
    this.takeBackTry(counts.address)
    return person
  }

  /** A device signed in to `person` with a password `checkPassword()` said was right. */
  signInByPassword({ person, email }: Pick<Session, "person" | "email">): SessionMade {
    return this.signIn({ person, email }, "password")
  }

  /**
   * Set or change the password of whoever's signed in with `token`.
   * - A first one needs only that.
   * - Changing one needs `current`, or a sign-in by emailed link or code just now (`hasFreshProof()`).
   * - SIDE EFFECT:  replacing a password ends the account's other devices.
   * - throws `SignInError`:  `"needs proof"`, `"wrong password"`, `"bad password"`, `"too many tries"`
   */
  async changePassword({ token, password, current, address }: PasswordChange): Promise<void> {
    const session = this.personOf(token)
    if (!session) refuse("needs proof", "Sign in first, then set your password.")
    if (!this.passwords.has(session.person)) return this.passwords.set(session.person, password)
    if (!this.hasFreshProof(session)) {
      if (!current) refuse("needs proof", "Type your current password, or sign in with an emailed link to change it.")
      await this.currentPasswordOrDie(session.person, current, address)
    }
    await this.passwords.set(session.person, password)
    this.endOtherSessions(session.person, token)
  }

  /**
   * Set `person`'s password from this machine, whoever they are:  for its own person only.
   * - SIDE EFFECT:  replacing a password signs the account out everywhere.
   * - throws `SignInError` `"bad password"`
   */
  async setPasswordFor(person: string, password: string): Promise<void> {
    const had = this.passwords.has(person)
    await this.passwords.set(person, password)
    if (had) this.endOtherSessions(person)
  }

  /** Does a change of `session`'s password go without the current one?  A sign-in by emailed link or code just now. */
  hasFreshProof({ way, at }: Session): boolean {
    return way === "email" && at !== undefined && this.now() - at <= PASSWORD_PROOF_MINUTES * MINUTE
  }

  /** - throws `SignInError` for a wrong `current`:  `"wrong password"`, or `"too many tries"`, on the same count as signing in */
  private async currentPasswordOrDie(person: string, current: string, address: string): Promise<void> {
    await this.checkPassword({ person, typed: person, address, password: current }).catch((error: unknown) => {
      if (error instanceof SignInError && error.kind === "wrong password") {
        refuse("wrong password", "That isn't your current password.")
      }
      throw error
    })
  }

  /** SIDE EFFECT:  every device signed in to `person` ends, but `keep`'s. */
  private endOtherSessions(person: string, keep?: string): void {
    const kept = keep ? hashOf(keep) : undefined
    let changed = false
    for (const [hash, session] of this.sessions) {
      if (session.person !== person || hash === kept) continue
      this.sessions.delete(hash)
      changed = true
    }
    if (changed) this.writeSessions()
  }

  /** - throws `SignInError` `"too many tries"` while `counts` wait */
  private dieIfWaiting(counts: { account: string; address: string }): void {
    const limited = [
      { key: counts.account, limit: PASSWORD_TRIES },
      { key: counts.address, limit: PASSWORD_ADDRESS_TRIES }
    ]
    for (const { key, limit } of limited) {
      const tries = this.liveTries(key)
      if (!tries || tries.count < limit) continue
      const minutes = Math.ceil((tries.ends - this.now()) / MINUTE)
      refuse(
        "too many tries",
        `Too many wrong passwords:  wait ${minutes} ${minutes === 1 ? "minute" : "minutes"}, or sign in with an emailed link instead.`
      )
    }
  }

  /** `key`'s wrong tries, forgetting them once they've ended. */
  private liveTries(key: string): WrongTries | undefined {
    const tries = this.wrongTries.get(key)
    if (tries && tries.ends <= this.now()) this.wrongTries.delete(key)
    return this.wrongTries.get(key)
  }

  /** SIDE EFFECT:  one more wrong try against `key`:  the wait starts afresh with each. */
  private countTry(key: string, limit: number): void {
    const count = (this.liveTries(key)?.count ?? 0) + 1
    this.wrongTries.delete(key)
    this.wrongTries.set(key, { count: Math.min(count, limit), ends: this.now() + PASSWORD_WAIT_MINUTES * MINUTE })
    for (const oldest of this.wrongTries.keys()) {
      if (this.wrongTries.size <= TRIES_KEPT) break
      this.wrongTries.delete(oldest)
    }
  }

  /** SIDE EFFECT:  that try against `key` wasn't wrong after all.  An address isn't forgiven more than that:  it may try many accounts. */
  private takeBackTry(key: string): void {
    const tries = this.liveTries(key)
    if (tries) tries.count = Math.max(0, tries.count - 1)
  }

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
  private signIn({ person, email }: Pick<SignInRequest, "person" | "email">, way: SignInWay = "email"): SessionMade {
    const token = secret()
    this.sessions.set(hashOf(token), { person, email, way, at: this.now(), ends: this.now() + SESSION_DAYS * DAY })
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
      refuse("expired", `That sign-in ran out:  each is good for ${this.minutes} minutes.  Ask for a new one.`)
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

/** One try at a password. */
export type PasswordTry = {
  /** The account it names:  `undefined` for nobody. */
  person: string | undefined
  /** What was typed for who:  counted against, when there's no such account. */
  typed: string
  /** The address it came from:  counted against too. */
  address: string
  /** The password, exactly as typed. */
  password: string
}

/** One change of a password, on a signed-in device. */
export type PasswordChange = {
  /** The device's token. */
  token: string | undefined
  /** The new password, exactly as typed. */
  password: string
  /** The current one:  left out, a sign-in by emailed link or code just now has to do. */
  current?: string
  /** The address it came from. */
  address: string
}

/** Constructor props of `SignIns`. */
export type SignInsProps = {
  /**
   * Where the signed-in devices are kept, a JSON file;  left out:  memory only, so a restart signs everyone out.
   * - The passwords' file goes beside it, `passwords.json`.
   */
  file?: string
  /** The time now, ms;  default `Date.now`. */
  now?: () => number
  /** How long a request is good for, in minutes, nothing done;  default `SIGN_IN_MINUTES`. */
  minutes?: number
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
