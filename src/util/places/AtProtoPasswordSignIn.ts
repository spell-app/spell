import type { AtProtoAccess } from "./AtProtoSignIn"
import { REAL_NETWORK, documentUrlFor, hostIn, type AccountDocument, type AtProtoNetwork } from "./AtProtoPlace"
import type { SignInStatus } from "./places.types"

/** How a program with no browser signs in:  an account's handle or DID, and an app password. */
const CREATE_SESSION = "/xrpc/com.atproto.server.createSession"

/** What turns a handle into an account. */
const RESOLVE_HANDLE = "/xrpc/com.atproto.identity.resolveHandle"

/****************
 * ### `AtProtoPasswordSignIn`
 * A program signing in to an atmosphere account by itself, with an APP PASSWORD (epic `atmosphere` P9):
 * no browser, no page leaving.
 *
 * ```ts
 * const signIn = new AtProtoPasswordSignIn({ password: process.env.ATMOSPHERE_APP_PASSWORD! })
 * await signIn.signIn("owen.bsky.social")
 * new AtProtoPlace({ kind: "atmosphere account", accounts: [signIn.did!], signIn })
 * ```
 *
 * - What `epic pages publish` signs in with, to publish a guide.
 *   A page signs in with `AtProtoSignIn` instead, which needs no password and the person's consent.
 * - An app password is one the person makes for one program, in their host's settings
 *   (Bluesky's:  Settings, Privacy and security, App passwords),
 *   so their own password never reaches it, and they can take it back.
 * - Signing in:
 *   - the handle becomes a DID (`resolveHandle`)
 *   - the DID's document names its host
 *   - the host is asked for a session (`createSession`)
 *   - its token then goes with every request, to that host only
 * - A session lasts a couple of hours:  long enough for a command.
 *   When it ends it's `"ended"`, and nothing renews it.
 * - Plain `fetch`, nothing of node:  it runs anywhere.
 *   It keeps the password in memory only, never on disk.
 ****************/
export class AtProtoPasswordSignIn implements AtProtoAccess {
  /** See `AtProtoAccess`. */
  status: SignInStatus = "signed out"
  /** Why the last try failed. */
  problem: string | undefined
  /** See `AtProtoAccess`:  nothing to load. */
  readonly ready = Promise.resolve()
  /** The account signed in:  its DID. */
  did: string | undefined

  /** The app password. */
  private readonly password: string
  /** What it asks about accounts and handles. */
  private readonly network: Pick<AtProtoNetwork, "directory" | "handles">
  /** The host of the account signed in. */
  private host: string | undefined
  /** The session's token. */
  private token: string | undefined
  /** Who wants to know. */
  private readonly listeners = new Set<() => void>()

  constructor({ password, network = {} }: AtProtoPasswordSignInProps) {
    this.password = password
    this.network = { ...REAL_NETWORK, ...network }
  }

  /**
   * Sign in as `who`, a handle (`owen.bsky.social`, `@` or not) or a DID.
   * - throws for a handle nobody has, an account with no host, or a password the host refuses;  `problem` says the same
   */
  async signIn(who: string): Promise<void> {
    this.set("signing in")
    try {
      const did = await this.accountOf(who.trim().replace(/^@/, ""))
      const host = hostIn(did, await this.answerOf<AccountDocument>(fetch(documentUrlFor(did, this.network.directory))))
      const session = await this.answerOf<{ did: string; accessJwt: string }>(
        fetch(`${host}${CREATE_SESSION}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: did, password: this.password })
        })
      )
      Object.assign(this, { did: session.did, host, token: session.accessJwt, problem: undefined })
      this.set("signed in")
    } catch (error) {
      this.problem = (error as Error).message
      this.set("signed out")
      throw error
    }
  }

  /** Forget the session here.  NEVER throws. */
  async signOut(): Promise<void> {
    this.forget()
    this.set("signed out")
  }

  /** See `AtProtoAccess`. */
  sessionEnded(): void {
    this.forget()
    this.set("ended")
  }

  /** See `AtProtoAccess`. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** To the account's own host, as them.  - throws `Error` while nobody's signed in */
  fetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.host || !this.token)
      throw new Error("AtProtoPasswordSignIn.fetch():  nobody's signed in;  signIn() first")
    const headers = { ...(init.headers as Record<string, string>), Authorization: `Bearer ${this.token}` }
    return fetch(`${this.host}${path}`, { ...init, headers })
  }

  /** Whose `who` is:  a DID as it is, a handle asked about. */
  private async accountOf(who: string): Promise<string> {
    if (who.startsWith("did:")) return who
    const search = new URLSearchParams({ handle: who })
    const { did } = await this.answerOf<{ did: string }>(fetch(`${this.network.handles}${RESOLVE_HANDLE}?${search}`))
    return did
  }

  /** What `response` says, as JSON.  - throws `Error` with the host's own message for anything but a yes */
  private async answerOf<Answer>(response: Promise<Response>): Promise<Answer> {
    const answer = await response
    const text = await answer.text()
    if (answer.ok) return JSON.parse(text) as Answer
    let message = `${answer.status}`
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? message
    } catch (ignored) {
      // not JSON:  the status says it
    }
    throw new Error(`AtProtoPasswordSignIn:  ${message}`)
  }

  /** No session any more. */
  private forget(): void {
    this.did = this.host = this.token = undefined
  }

  /** Stands at `status` now. */
  private set(status: SignInStatus): void {
    this.status = status
    this.listeners.forEach((listener) => listener())
  }
}

/** `AtProtoPasswordSignIn`'s settings. */
export type AtProtoPasswordSignInProps = {
  /** The account's app password. */
  password: string
  /** Where accounts and handles are asked about.  Left out:  the real network. */
  network?: Partial<Pick<AtProtoNetwork, "directory" | "handles">>
}
