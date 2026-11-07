import { ATPROTO_BACK_PAGE, ATPROTO_CLIENT_FILE, type AtProtoIdentities } from "./signIn.types"

/** What it asks a host for:  who they are, and nothing else -- the narrowest sign-in AT Protocol has. */
const IDENTITY_SCOPE = "atproto"

/** What turns a handle into an account, by default:  Bluesky's public one. */
const DEFAULT_HANDLE_RESOLVER = "https://public.api.bsky.app"

/** How long a sign-in that went to a host may take to come back, ms:  then it's forgotten. */
const PENDING_MS = 20 * 60_000

/** What of the server library this uses:  a type here, so it's loaded only when someone signs in. */
type ServerLibrary = typeof import("@atproto/oauth-client-node")
/** One client of the server library. */
type ServerClient = InstanceType<ServerLibrary["NodeOAuthClient"]>

/****************
 * ### `AtProtoIdentity`
 * Who someone is on the atmosphere, asked of their own host by Spell's server (epic `atmosphere` P19, Q26 A):
 * the real `AtProtoIdentities`, on AT Protocol's server sign-in library, `@atproto/oauth-client-node`.
 *
 * ```ts
 * const identity = new AtProtoIdentity({ address: () => `http://127.0.0.1:${info.port}` })
 * const url = await identity.start("ana.bsky.social", state)    // send the browser there
 * const { did, state } = await identity.finish(params)          // it came back to ATPROTO_BACK_PAGE
 * ```
 *
 * - The server signs them in, not the page:  only the server can trust what it's told.
 *   - A program's own sign-in, to write to its person's account from the page, is `AtProtoSignIn` (`spell/places`).
 * - It asks only who they are (`IDENTITY_SCOPE`), never the right to write.
 *   - What the host hands back to prove it is let go at once, and the host told so:  nothing kept could write.
 * - WHO the server is, to a host:
 *   - on a local address (`127.0.0.1`, `localhost`):  no file, the protocol's development client
 *   - on an `https` one:  its client file, `ATPROTO_CLIENT_FILE`, which `SignInCheck` serves (`clientFile()`)
 * - What's pending (a sign-in gone to a host) is kept in memory:  a restart drops it, and they sign in again.
 * - Node only;  the library is loaded the first time someone signs in.
 ****************/
export class AtProtoIdentity implements AtProtoIdentities {
  /** Where people reach this server, asked when first needed:  a server's port is known only once it listens. */
  private readonly addressNow: () => string
  /** What turns a handle into an account. */
  private readonly handleResolver: string
  /** The library's client, once something's asked for it. */
  private client: Promise<ServerClient> | undefined

  constructor({ address, handleResolver = DEFAULT_HANDLE_RESOLVER }: AtProtoIdentityProps) {
    this.addressNow = typeof address === "string" ? () => address : address
    this.handleResolver = handleResolver
  }

  /** See `AtProtoIdentities`. */
  async start(who: string, state: string): Promise<string> {
    const client = await this.clientNow()
    return `${await client.authorize(who, { scope: IDENTITY_SCOPE, state })}`
  }

  /** See `AtProtoIdentities`. */
  async finish(params: URLSearchParams): Promise<{ did: string; handle?: string; state: string }> {
    const client = await this.clientNow()
    const { session, state } = await client.callback(params)
    const { did } = session
    // nothing kept that could write:  the host's told, and it's forgotten here
    await session
      .signOut()
      .catch((ignored) => console.error("AtProtoIdentity:  the host didn't hear the sign-out", ignored))
    if (!state) throw new TypeError("AtProtoIdentity.finish():  the host sent no state back;  sign in again")
    const handle = await client.identityResolver
      .resolve(did)
      .then(({ handle }) => (handle === "handle.invalid" ? undefined : handle))
      .catch(() => undefined)
    return { did, state, ...(handle && { handle }) }
  }

  /** What goes at `ATPROTO_CLIENT_FILE` on an `https` address:  how a host knows who's asking.  `undefined` locally. */
  clientFile(): object | undefined {
    return isLocal(this.address) ? undefined : this.metadata()
  }

  /** Where people reach this server:  the address its host sends them back to starts with it. */
  private get address(): string {
    return withLoopbackHost(this.addressNow().replace(/\/+$/, ""))
  }

  /** Where the browser comes back to. */
  private get backAddress(): string {
    return `${this.address}${ATPROTO_BACK_PAGE}`
  }

  /** Who the server is, to a host. */
  private metadata() {
    return {
      client_id: `${this.address}${ATPROTO_CLIENT_FILE}`,
      client_name: "Spell",
      client_uri: this.address,
      application_type: "web" as const,
      grant_types: ["authorization_code"] as ["authorization_code"],
      response_types: ["code"] as ["code"],
      redirect_uris: [this.backAddress] as [string],
      scope: IDENTITY_SCOPE,
      token_endpoint_auth_method: "none" as const,
      dpop_bound_access_tokens: true
    }
  }

  /** The library's client:  loads the library the first time.  - throws if it can't be loaded */
  private clientNow(): Promise<ServerClient> {
    return (this.client ??= this.makeClient())
  }

  /** Load the library, and make its client. */
  private async makeClient(): Promise<ServerClient> {
    const { NodeOAuthClient, buildAtprotoLoopbackClientMetadata, requestLocalLock } =
      await import("@atproto/oauth-client-node")
    const clientMetadata = isLocal(this.address)
      ? buildAtprotoLoopbackClientMetadata({ scope: IDENTITY_SCOPE, redirect_uris: [this.backAddress] })
      : this.metadata()
    return new NodeOAuthClient({
      clientMetadata,
      handleResolver: this.handleResolver,
      requestLock: requestLocalLock,
      stateStore: new PendingStore(),
      sessionStore: new PendingStore()
    })
  }
}

/** Constructor props of an `AtProtoIdentity`. */
export type AtProtoIdentityProps = {
  /**
   * Where people reach this server:  `http://127.0.0.1:4747`, or `https://spell.app`;
   * or what says it, asked the first time someone signs in.
   */
  address: string | (() => string)
  /** What turns a handle into an account:  a server answering `com.atproto.identity.resolveHandle`. */
  handleResolver?: string
}

/**
 * What the library keeps for a while, in memory:  a sign-in gone to a host, or a session between coming back and
 * being let go.  Each for `PENDING_MS` at most.
 */
class PendingStore<T> {
  /** Each by its key, with when it goes. */
  private readonly kept = new Map<string, { value: T; ends: number }>()

  async set(key: string, value: T): Promise<void> {
    for (const [each, { ends }] of this.kept) if (ends <= Date.now()) this.kept.delete(each)
    this.kept.set(key, { value, ends: Date.now() + PENDING_MS })
  }

  async get(key: string): Promise<T | undefined> {
    const found = this.kept.get(key)
    return found && found.ends > Date.now() ? found.value : undefined
  }

  async del(key: string): Promise<void> {
    this.kept.delete(key)
  }
}

/** Is `address` this machine's, where a host takes the development client? */
function isLocal(address: string): boolean {
  return /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(address)
}

/** `localhost` as `127.0.0.1`:  a host sends the development client back to no other name. */
function withLoopbackHost(address: string): string {
  return address.replace(/^http:\/\/localhost(?=[:/]|$)/, "http://127.0.0.1")
}
