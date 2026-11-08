import type { SRV } from "spell/server"
import type { AtProtoIdentities } from "spell/server/signIn"

/** Where the fake host's sign-in page is, by default:  nothing answers there;  a test follows its link by hand. */
const FAKE_HOST = "https://host.fake.example/oauth/authorize"

/** Where `route()` answers as the host's sign-in page, on a test's own server. */
export const FAKE_HOST_PAGE = "/fake-atproto/authorize"

/****************
 * ### `FakeAtProtoIdentity`
 * An atmosphere account's host for a test (epic `atmosphere` P19):  `SignInCheck`'s `atProto`, with no host, no
 * sign-in library and no network.
 *
 * ```ts
 * const identity = new FakeAtProtoIdentity({ "ana.bsky.social": "did:plc:ana" })
 * const { url } = await post("/api/sign-in/atproto", { who: "ana.bsky.social", mode: "sign in", back: "/" })
 * await get(identity.backFor(url))       // as the host would send the browser back, signed in as Ana
 * ```
 *
 * - `start()` answers its own page's address, carrying who and the state.
 * - `backFor()` is where the host would send the browser back:  `ATPROTO_BACK_PAGE` with `code` and `state`;
 *   `{ refuse: true }` as a host that said no.
 * - In a browser:  `host` on the test's own server, and `route()` there, so the page's trip there and back is real.
 *   - Who signs in on its page when it was named nobody (Bluesky's own, which asks):  `asks`.
 ****************/
export class FakeAtProtoIdentity implements AtProtoIdentities {
  /** Each account's DID, by its handle. */
  private readonly dids: Record<string, string>
  /** Its sign-in page. */
  private readonly host: string
  /** Who signs in on its page, asked who:  a handle. */
  asks: string | undefined
  /** Which of the server's addresses the last `start()` and `finish()` were at. */
  lastAt: { started?: string; finished?: string } = {}

  constructor(dids: Record<string, string>, { host = FAKE_HOST }: { host?: string } = {}) {
    this.dids = dids
    this.host = host
  }

  /** Answer as the host's sign-in page, at `FAKE_HOST_PAGE`:  straight back, signed in.  For `host` on `router`'s server. */
  route(router: SRV.Router): this {
    router.get(FAKE_HOST_PAGE, (request, reply) => {
      const url = `http://here${request.originalUrl}`
      reply.redirect(this.backFor(url), 303)
    })
    return this
  }

  /** See `AtProtoIdentities`.  - throws for a handle it has no account for */
  async start(who: string, state: string, at?: string): Promise<string> {
    this.lastAt.started = at
    const did = who.startsWith("did:") ? who : (this.dids[who] ?? (who.startsWith("https://") ? "asks" : undefined))
    if (!did) throw new Error(`no account is called ${who}`)
    return `${this.host}?${new URLSearchParams({ who, state })}`
  }

  /** See `AtProtoIdentities`.  - throws for an `error` answer, as a host's refusal */
  async finish(params: URLSearchParams, at?: string): Promise<{ did: string; handle?: string; state: string }> {
    this.lastAt.finished = at
    if (params.get("error")) throw new Error(`the host said no:  ${params.get("error")}`)
    const did = params.get("code")!
    const handle = Object.entries(this.dids).find(([, each]) => each === did)?.[0]
    return { did, state: params.get("state")!, ...(handle && { handle }) }
  }

  /**
   * Where the host would send the browser back to, from `start()`'s `url`:  signed in as who it named.
   * - `as`:  who signs in on the host's page, when `start()` named nobody (Bluesky's own, which asks)
   */
  backFor(url: string, { refuse, as }: { refuse?: boolean; as?: string } = {}): string {
    const asked = new URL(url).searchParams
    const named = asked.get("who")!
    const who = as ?? (named.startsWith("https://") ? this.asks! : named)
    const did = who.startsWith("did:") ? who : this.dids[who]!
    const answer: Record<string, string> = refuse ? { error: "access_denied" } : { code: did }
    return `/api/sign-in/atproto/back?${new URLSearchParams({ ...answer, state: asked.get("state")! })}`
  }
}
