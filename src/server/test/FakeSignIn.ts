import type { AtProtoAccess } from "spell/places/AtProtoSignIn"
import type { SignInStatus } from "spell/places/places.types"

/****************
 * ### `FakeSignIn`
 * Someone signed in on `FakeAtmosphere`, for a test or the recipe box demo:  no sign-in library, no page leaving.
 * - Plain `fetch`, and nothing of node:  it runs in a page too.
 ****************/
export class FakeSignIn implements AtProtoAccess {
  /** See `AtProtoAccess`. */
  status: SignInStatus = "signed out"
  /** See `AtProtoAccess`. */
  did: string | undefined
  /** See `AtProtoAccess`. */
  problem: string | undefined
  /** See `AtProtoAccess`. */
  readonly ready = Promise.resolve()
  /** Who wants to know. */
  private readonly listeners = new Set<() => void>()

  /** `directory`:  where `FakeAtmosphere`'s network is. */
  constructor(private readonly directory: string) {}

  /** Signs in at once, as `who`:  a DID, or a handle it asks about.  - throws for a handle nobody has */
  async signIn(who: string): Promise<void> {
    this.problem = undefined
    try {
      this.did = who.startsWith("did:") ? who : await this.accountCalled(who)
      this.set("signed in")
    } catch (error) {
      this.problem = (error as Error).message
      this.set("signed out")
      throw error
    }
  }

  /** Signs out. */
  async signOut(): Promise<void> {
    this.did = undefined
    this.set("signed out")
  }

  /** See `AtProtoAccess`. */
  sessionEnded(): void {
    this.did = undefined
    this.set("ended")
  }

  /** See `AtProtoAccess`. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** To their own host, as them:  their token's the DID. */
  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const { service } = (await (await fetch(`${this.directory}/${this.did}`)).json()) as {
      service: { serviceEndpoint: string }[]
    }
    const headers = { ...(init.headers as Record<string, string>), Authorization: `Bearer ${this.did}` }
    return fetch(`${service[0]!.serviceEndpoint}${path}`, { ...init, headers })
  }

  /** Whose handle `who` is.  - throws for nobody's */
  private async accountCalled(who: string): Promise<string> {
    const search = new URLSearchParams({ handle: who.replace(/^@/, "") })
    const response = await fetch(`${this.directory}/xrpc/com.atproto.identity.resolveHandle?${search}`)
    if (!response.ok) throw new Error(`Nobody here goes by ${who}`)
    return ((await response.json()) as { did: string }).did
  }

  /** Stands at `status` now. */
  private set(status: SignInStatus): void {
    this.status = status
    this.listeners.forEach((listener) => listener())
  }
}
