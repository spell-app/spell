import { every } from "spell/util/timing"

import { noteSignedIn } from "./people"
import type { AtProtoRefusal, PersonHere, PlaceSignIn, SignInStatus } from "./places.types"

/** Where a page server answers sign-in:  `SignInCheck`'s routes, in `spell/server/signIn`. */
export const SIGN_IN_PREFIX = "/api/sign-in"

/** How often a waiting page asks whether its emailed link was opened, in seconds. */
export const SIGN_IN_WAIT_SECONDS = 2

/** What `GET /api/sign-in/me` answers:  who's signed in on this device;  nobody, `{}`. */
export type SignedInAnswer = {
  /** Their Spell account's address, `ana@spell`. */
  person?: string
  /** The email they signed in with. */
  email?: string
}

/** Where a signed-in person's password stands (epic `atmosphere` T64). */
export type PasswordState = {
  /** Do they have one? */
  set: boolean
  /** Does changing it take the current one?  Not just after a sign-in by emailed link or code. */
  currentNeeded: boolean
}

/**
 * What `GET /api/sign-in/me` answers in full:  who's signed in, and where to report abuse (epic `atmosphere` P6).
 * - `abuseContact`:  the host's abuse address, which the sign-in bar shows;  left out by a server that has none.
 */
export type SignInMeAnswer = SignedInAnswer & {
  /** Their password, while someone's signed in. */
  password?: PasswordState
  /** The host's abuse contact:  `abuse@...`. */
  abuseContact?: string
  /**
   * Signing in with an atmosphere (Bluesky) account (epic `atmosphere` P19):  left out by a server that doesn't.
   * - `linked`:  the handle of the one the account signed in is linked to;  left out for none, or nobody signed in
   */
  atProto?: { linked?: string }
}

/**
 * What a page coming back from signing in with an atmosphere account finds in its address (epic `atmosphere` P19):
 * `?spell-sign-in=signed in`, `linked`, or the refusal's kind (`not linked` ...), with its words in `spell-sign-in-why`.
 * - The page takes them out of its address as it reads them.
 */
export const BACK_OUTCOME = "spell-sign-in"
/** Beside `BACK_OUTCOME`:  why it failed, in the server's words. */
export const BACK_WHY = "spell-sign-in-why"

/**
 * How a page coming back from an atmosphere account's host stands (`BACK_OUTCOME`):
 * - `"signed in"`, `"linked"`:  done
 * - `"not linked"`:  no Spell account here is linked to it:  ask for an invite, sign in by email, then link it
 * - `"taken down"`:  the account it's linked to was taken down by Spell
 * - `"linked elsewhere"`:  another Spell account here is linked to it already
 * - `"failed"`:  the host refused, or the sign-in ran out:  `BACK_WHY` says what happened
 */
export type AtProtoOutcome = "signed in" | "linked" | "not linked" | "taken down" | "linked elsewhere" | "failed"

/** What `POST /api/sign-in/atproto` takes:  sign in with an atmosphere account, or link one (epic `atmosphere` P19). */
export type AtProtoAsk = {
  /** Who:  a handle, a DID, or a host's address;  left out, Bluesky's own (`https://bsky.social`), which asks. */
  who?: string
  /** Sign in by it, or link it to the Spell account signed in now. */
  mode: "sign in" | "link"
  /** The page to come back to:  this server's. */
  back: string
}

/** What `POST /api/sign-in/atproto` answers:  where to send the browser, the account's own host. */
export type AtProtoAskAnswer = {
  /** Its sign-in page. */
  url: string
}

/** What `POST /api/sign-in/ask` answers:  the one-time request this page waits on. */
export type SignInAskAnswer = {
  /** Its id:  only this page knows it, and asks after it by it (`POST /api/sign-in/waiting`). */
  request: string
}

/** What `POST /api/sign-in/waiting` answers:  still waiting, or signed in now (its cookie set on this answer). */
export type SignInWaitAnswer = { status: "waiting" } | ({ status: "signed in" } & Required<SignedInAnswer>)

/** Where a sign-in's link was asked for, as its confirm page shows it:  so nobody approves someone else's. */
export type SignInAsker = {
  /** The browser, `Chrome`;  left out when it can't tell. */
  browser?: string
  /** The system, `a Mac`;  left out when it can't tell. */
  system?: string
  /** A rough place, `on this machine`, `near Boston`;  left out when it can't tell. */
  near?: string
}

/** What `GET /api/sign-in/link?key=` answers:  what the link's page shows before its one button. */
export type SignInLinkAnswer = {
  /** The email it was sent to. */
  email: string
  /** A sign-in someone asked for, or an invite. */
  kind: "sign-in" | "invite"
  /** Where it was asked for:  an invite's is whoever invited. */
  from: SignInAsker
}

/****************
 * ### `SpellSignIn`
 * A person signing in to a Spell account by email, in a browser (epic `atmosphere` P3):
 * the page half of `SignInCheck`, which is `spell/server/signIn`'s.
 *
 * ```ts
 * new RemotePlace({ url: "/api/places/spaces/owen@spell/recipes", signIn: new SpellSignIn() })
 * ```
 *
 * - `signIn("ana@example.com")` asks the server to email a link and a six-digit code:  it then waits for a code
 *   (`"waiting for a code"`), asking after the request every `SIGN_IN_WAIT_SECONDS`.
 *   - Opening the link on ANY device, and confirming there, signs that device in;  this page's next ask signs it in too.
 *   - Or the code typed here:  `enterCode()`.
 * - OR WITH A PASSWORD (epic `atmosphere` T64):  `signInWithPassword(email, password)`;  a wrong one is `problem`.
 *   - Signed in, `setPassword()`:  `hasPassword`, `currentPasswordNeeded`, and how it went, `passwordProblem`, `passwordSaved`.
 * - Signed in, the server keeps it in a cookie:  every request to the same server carries it, so it needs no token.
 * - Who's signed in is this page's person too (`noteSignedIn()`):  a room on the page says so.
 * - OR WITH A BLUESKY (atmosphere) ACCOUNT linked to theirs, where the server offers it (epic `atmosphere` P19):
 *   - `signInAtProto(who)`:  the page leaves for the account's own host, and comes back signed in
 *   - `linkAtProto(who)`, signed in:  the same trip, and the account's linked to theirs
 *   - coming back, the page's address says how it went (`BACK_OUTCOME`):  read, then taken out of it
 *     - a refusal is `refused` (`"not linked"` ...), for the bar to say in the page's language;  a failure, `problem`
 * - Imports nothing of the server's:  the routes' shapes are here, and the server reads them.
 * - NEVER throws from `signIn()` for a refusal:  it says why (`problem`).
 ****************/
export class SpellSignIn implements PlaceSignIn {
  /** It's a Spell account, named apart from an atmosphere one on the bar. */
  readonly account = "Spell account" as const

  /** Where the server is:  `""`, this page's own. */
  private readonly server: string
  /** How it reaches the server:  `fetch`, or a test's. */
  private readonly fetcher: typeof fetch
  /** Who hears it change. */
  private readonly listeners = new Set<() => void>()
  /** Where it stands. */
  private _status: SignInStatus = "signing in"
  /** Why the last try failed. */
  private _problem: string | undefined
  /** Who's signed in. */
  private signedIn: SignedInAnswer = {}
  /** Their password, as the server last said. */
  private password: PasswordState | undefined
  /** Why setting a password last failed. */
  private _passwordProblem: string | undefined
  /** Was a password just saved? */
  private _passwordSaved = false
  /** What the server said of signing in with an atmosphere account:  left out, it doesn't. */
  private atProto: SignInMeAnswer["atProto"]
  /** Why coming back from an atmosphere account's host didn't sign in. */
  private _refused: AtProtoRefusal | undefined
  /** The host's abuse contact, as the server said it. */
  private _abuseContact: string | undefined
  /** The request this page waits on, and where its email went. */
  private waitingOn: { request: string; email: string } | undefined
  /** Stops asking after it. */
  private stopWaiting: (() => void) | undefined
  /** This page, as the place calls it. */
  private readonly page = `page-${crypto.randomUUID()}`
  /** Done once it's asked who's signed in already. */
  readonly ready: Promise<void>

  constructor({ server = "", fetcher = globalThis.fetch?.bind(globalThis) }: SpellSignInProps = {}) {
    this.server = server
    this.fetcher = fetcher
    this.ready = this.lookUp()
  }

  /** Where it stands. */
  get status(): SignInStatus {
    return this._status
  }

  /** Why the last try failed, in words for people. */
  get problem(): string | undefined {
    return this._problem
  }

  /** Where to report abuse:  the host's abuse contact, once the server's said it (epic `atmosphere` P6). */
  get abuseContact(): string | undefined {
    return this._abuseContact
  }

  /** Does the server sign people in with a Bluesky (atmosphere) account? */
  get offersAtProto(): boolean {
    return !!this.atProto
  }

  /** The handle of the Bluesky account linked to the one signed in;  `undefined` for none. */
  get linkedHandle(): string | undefined {
    return this.atProto?.linked
  }

  /** Why the last trip to an atmosphere account's host didn't sign in:  for the bar to say in the page's language. */
  get refused(): AtProtoRefusal | undefined {
    return this._refused
  }

  /** Does the one signed in have a password? */
  get hasPassword(): boolean {
    return !!this.password?.set
  }

  /** Does changing it take the current one? */
  get currentPasswordNeeded(): boolean {
    return !!this.password?.currentNeeded
  }

  /** Why setting a password last failed, in words for people. */
  get passwordProblem(): string | undefined {
    return this._passwordProblem
  }

  /** Was a password just saved? */
  get passwordSaved(): boolean {
    return this._passwordSaved
  }

  /** Where the code went, while waiting for one. */
  get sentTo(): string | undefined {
    return this.waitingOn?.email
  }

  /** Who's signed in, as a place names people:  `undefined` for nobody. */
  get person(): PersonHere | undefined {
    const { person } = this.signedIn
    return person ? { id: person, name: person, page: this.page } : undefined
  }

  /** Email `email` a link and a code, and wait for either.  NEVER throws:  a refusal is `problem`. */
  async signIn(email: string): Promise<void> {
    this.stopAsking()
    this._refused = undefined
    this.changeTo("signing in")
    try {
      const { request } = await this.ask<SignInAskAnswer>("ask", { email })
      this.waitingOn = { request, email }
      this.changeTo("waiting for a code")
      this.stopWaiting = every(SIGN_IN_WAIT_SECONDS, () => void this.askAfter(request))
    } catch (error) {
      this.changeTo("signed out", (error as Error).message)
    }
  }

  /** Sign in with a password.  NEVER throws:  a refusal is `problem`. */
  async signInWithPassword(email: string, password: string): Promise<void> {
    this.stopAsking()
    this._refused = undefined
    this.changeTo("signing in")
    try {
      this.signedInAs(await this.ask<Required<SignedInAnswer>>("password", { email, password }))
    } catch (error) {
      this.changeTo("signed out", (error as Error).message)
    }
  }

  /**
   * Set or change the password of whoever's signed in.  `current`:  the password now, unless a sign-in just now will do.
   * - NEVER throws:  a refusal is `passwordProblem`;  saved, `passwordSaved`.
   */
  async setPassword({ password, current }: { password: string; current?: string }): Promise<void> {
    this._passwordProblem = undefined
    this._passwordSaved = false
    try {
      const answer = await this.ask<{ password: PasswordState }>("password/change", {
        password,
        ...(current && { current })
      })
      this.password = answer.password
      this._passwordSaved = true
    } catch (error) {
      this._passwordProblem = (error as Error).message
    }
    this.changeTo(this._status, this._problem)
  }

  /**
   * Sign in with a Bluesky (atmosphere) account linked to a Spell account:  the page leaves for its host.
   * - `who`:  a handle, as typed;  left out, Bluesky's own host, which asks
   * - NEVER throws:  a refusal before it leaves is `problem`
   */
  signInAtProto(who?: string): Promise<void> {
    return this.goToAtProto("sign in", who)
  }

  /** Link a Bluesky account to the Spell account signed in:  the page leaves for its host.  NEVER throws, as `signInAtProto()`. */
  linkAtProto(who?: string): Promise<void> {
    return this.goToAtProto("link", who)
  }

  /**
   * Type the code the email carried.
   * - A wrong one says so, and it keeps waiting.
   * - NEVER throws.
   */
  async enterCode(code: string): Promise<void> {
    const waiting = this.waitingOn
    if (!waiting) return
    try {
      const answer = await this.ask<Required<SignedInAnswer>>("code", { email: waiting.email, code: code.trim() })
      this.signedInAs(answer)
    } catch (error) {
      this.changeTo("waiting for a code", (error as Error).message)
    }
  }

  /** Sign out, here and on the server.  NEVER throws. */
  async signOut(): Promise<void> {
    this.stopAsking()
    await this.ask("out", {}).catch((ignored) =>
      console.error("SpellSignIn.signOut():  the server didn't hear", ignored)
    )
    this.signedIn = {}
    this.password = undefined
    this._passwordProblem = undefined
    this._passwordSaved = false
    noteSignedIn(undefined)
    this.changeTo("signed out")
  }

  /** Hear it change.  Returns what stops it. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * The ONE sign-in this page has to the server at `at`'s origin, made the first time:
   * every place it serves on the page signs in together.
   * - STATIC:  it's the page's, not any one place's.
   */
  static for(at: string): SpellSignIn {
    const server = new URL(at, globalThis.location?.href ?? "http://localhost/").origin
    const here = globalThis.location?.origin
    let signIn = SpellSignIn.byServer.get(server)
    if (!signIn) SpellSignIn.byServer.set(server, (signIn = new SpellSignIn(server === here ? {} : { server })))
    return signIn
  }

  /** Each server's sign-in on this page, by its origin:  `for()`'s.  STATIC as `for()` is. */
  private static readonly byServer = new Map<string, SpellSignIn>()

  ////////////////
  // ## Asking the server
  ////////////////

  /** Who's signed in already, as the page opens.  NEVER throws:  a server with no sign-in is nobody. */
  private async lookUp(): Promise<void> {
    const failed = this.cameBack()
    try {
      const { abuseContact, atProto, password, ...answer } = await this.ask<SignInMeAnswer>("me")
      this._abuseContact = abuseContact
      this.atProto = atProto
      this.password = password
      if (answer.person) return this.signedInAs(answer, failed)
    } catch (ignored) {
      // a server with no sign-in:  nobody is, and signing in says why
    }
    this.changeTo("signed out", failed)
  }

  /** To the atmosphere account's host, to sign in or link:  `location` goes there. */
  private async goToAtProto(mode: AtProtoAsk["mode"], who?: string): Promise<void> {
    this.stopAsking()
    this._refused = undefined
    try {
      const back = globalThis.location?.href ?? "/"
      const { url } = await this.ask<AtProtoAskAnswer>("atproto", {
        mode,
        back,
        ...(who?.trim() && { who: who.trim() })
      })
      globalThis.location.assign(url)
    } catch (error) {
      this.changeTo(this._status, (error as Error).message)
    }
  }

  /**
   * How a trip to an atmosphere account's host went, from this page's address;  taken out of it.
   * - SIDE EFFECT:  sets `refused`;  replaces the address, as it was without them.
   * - Returns a failure's words, for `problem`.  NEVER throws.
   */
  private cameBack(): string | undefined {
    try {
      const url = new URL(globalThis.location.href)
      const outcome = url.searchParams.get(BACK_OUTCOME) as AtProtoOutcome | null
      if (!outcome) return undefined
      const why = url.searchParams.get(BACK_WHY) ?? undefined
      url.searchParams.delete(BACK_OUTCOME)
      url.searchParams.delete(BACK_WHY)
      globalThis.history?.replaceState(globalThis.history.state, "", `${url.pathname}${url.search}${url.hash}`)
      if (outcome === "not linked" || outcome === "taken down" || outcome === "linked elsewhere") {
        this._refused = outcome
      }
      return outcome === "failed" ? (why ?? outcome) : undefined
    } catch (ignored) {
      // no page, or no address:  nothing came back
      return undefined
    }
  }

  /** Ask after the request this page waits on:  the link opened elsewhere signs this page in too. */
  private async askAfter(request: string): Promise<void> {
    try {
      const answer = await this.ask<SignInWaitAnswer>("waiting", { request })
      if (answer.status === "signed in") this.signedInAs(answer)
    } catch (error) {
      // run out, or used:  ask again
      this.stopAsking()
      this.changeTo("signed out", (error as Error).message)
    }
  }

  /** Signed in as `answer` says;  `problem`, a failure that came back with the page (linking). */
  private signedInAs(answer: SignedInAnswer, problem?: string): void {
    this.stopAsking()
    this.signedIn = answer
    noteSignedIn(this.person)
    this.changeTo("signed in", problem)
    if (!this.password) void this.learnPassword()
  }

  /** Where the password of whoever just signed in stands:  so Set or Change shows right.  NEVER throws. */
  private async learnPassword(): Promise<void> {
    try {
      const { password } = await this.ask<SignInMeAnswer>("me")
      if (!password) return
      this.password = password
      this.changeTo(this._status, this._problem)
    } catch (ignored) {
      // offered as Set until the page asks again
    }
  }

  /**
   * `POST` (or with no body, `GET`) `<prefix>/<what>`, and its JSON.
   * - throws an `Error` with the server's own words (`{ error }`) for anything but a 2xx
   */
  private async ask<T>(what: string, body?: object): Promise<T> {
    const response = await this.fetcher(`${this.server}${SIGN_IN_PREFIX}/${what}`, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    })
    const answer = (await response.json().catch(() => ({}))) as T & { error?: string }
    if (!response.ok) throw new Error(answer.error ?? `the sign-in server answered ${response.status}`)
    return answer
  }

  /** Stop waiting on a request. */
  private stopAsking(): void {
    this.stopWaiting?.()
    this.stopWaiting = undefined
    this.waitingOn = undefined
  }

  /** Now `status`, for `problem`:  everyone's told. */
  private changeTo(status: SignInStatus, problem?: string): void {
    this._status = status
    this._problem = problem
    for (const listener of [...this.listeners]) listener()
  }
}

/** Constructor props of a `SpellSignIn`. */
export type SpellSignInProps = {
  /** Where the sign-in server is:  its origin, `http://127.0.0.1:4747`;  default this page's own. */
  server?: string
  /** How it reaches the server:  default `fetch`. */
  fetcher?: typeof fetch
}
