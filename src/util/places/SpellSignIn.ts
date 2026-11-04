import { every } from "spell/util/timing"

import { noteSignedIn } from "./people"
import type { PersonHere, PlaceSignIn, SignInStatus } from "./places.types"

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

/**
 * What `GET /api/sign-in/me` answers in full:  who's signed in, and where to report abuse (epic `atmosphere` P6).
 * - `abuseContact`:  the host's abuse address, which the sign-in bar shows;  left out by a server that has none.
 */
export type SignInMeAnswer = SignedInAnswer & {
  /** The host's abuse contact:  `abuse@...`. */
  abuseContact?: string
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
 * - Signed in, the server keeps it in a cookie:  every request to the same server carries it, so it needs no token.
 * - Who's signed in is this page's person too (`noteSignedIn()`):  a room on the page says so.
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

  /** Type the code the email carried.  A wrong one says so, and it keeps waiting.  NEVER throws. */
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
    try {
      const { abuseContact, ...answer } = await this.ask<SignInMeAnswer>("me")
      this._abuseContact = abuseContact
      if (answer.person) return this.signedInAs(answer)
    } catch (ignored) {
      // a server with no sign-in:  nobody is, and signing in says why
    }
    this.changeTo("signed out")
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

  /** Signed in as `answer` says. */
  private signedInAs(answer: SignedInAnswer): void {
    this.stopAsking()
    this.signedIn = answer
    noteSignedIn(this.person)
    this.changeTo("signed in")
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
