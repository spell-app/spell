import type { PlaceSignIn, SignInStatus } from "./places.types"

/** Where it notes who's signed in, on this device:  so a page with nobody signed in never loads the sign-in library. */
const SIGNED_IN_KEY = "spell-atmosphere-signed-in"

/** What a page coming back from signing in has in its address. */
const COMING_BACK = /[#?&](?:iss|code|error)=/

/** What it asks a person's host to let a program do:  change their records, of any kind (see the class). */
const DEFAULT_SCOPE = "atproto repo:*"

/** What turns a handle into an account, for signing in. */
const DEFAULT_HANDLE_RESOLVER = "https://public.api.bsky.app"

/** The name of the file a host reads to learn who's asking:  at the top of a program's address, or beside its page. */
export const PROGRAM_CLIENT_FILE = "oauth-client-metadata.json"

/**
 * What a place needs of a person's sign-in:  who they are, and requests sent as them.
 * - `AtProtoSignIn` is the real one;  a test hands in its own.
 */
export type AtProtoAccess = PlaceSignIn & {
  /** Resolves once it knows whether someone's signed in:  it may have to load a session.  NEVER rejects. */
  readonly ready: Promise<void>
  /** The account signed in:  its DID. */
  readonly did: string | undefined
  /** Send a request as them, to their own host:  `path` from the top of it, `/xrpc/...`.  - throws when nothing answers */
  fetch(path: string, init?: RequestInit): Promise<Response>
  /** A host said the session's no good any more. */
  sessionEnded(): void
}

/** What of the official library this uses:  so it's a type here, and only loaded when it's asked for. */
type SignInLibrary = typeof import("@atproto/oauth-client-browser")
/** One client of the official library. */
type SignInClient = InstanceType<SignInLibrary["BrowserOAuthClient"]>
/** One session of the official library. */
type SignInSession = NonNullable<Awaited<ReturnType<SignInClient["init"]>>>["session"]

/****************
 * ### `AtProtoSignIn`
 * A person signing in to their own atmosphere account from the browser, with no server of ours (epic `data` P16).
 * - On the official library, `@atproto/oauth-client-browser`:  the protocol needs PKCE, PAR and DPoP together.
 *   - It's about 224 kB, 63 kB zipped, so it's loaded by a dynamic `import()`, and only when someone signs in, or comes back
 *     signed in:  `SIGNED_IN_KEY` notes that on the device.  A program that only reads never loads it.
 * - Signing in leaves the page for the person's own host, and comes back.  What's pending stays on the device, and goes once it's back.
 * - A session lasts at most two weeks, for a program with no server, and less on a local address:  usually a day.
 *   - When it ends, or a host says so, it's `"ended"` rather than `"signed out"`:  what shows says why, and what's pending stays.
 * - WHO the program is, to a host:
 *   - on a local address (`127.0.0.1`, `localhost`):  no file needed, the library's development client
 *   - anywhere else, a file on its own address, which has to be there:  `atProtoClientMetadata()` makes it
 *     - at the top of the address, unless `clientFile` says where
 *     - Spell's cloud answers one for each program, beside its page (`SpellCloud`), so publishing there takes no step
 *     - not there, a sign-in says which address it couldn't read
 * - What it asks for:  `DEFAULT_SCOPE`, to change their records, of every kind, and nothing else about the account.
 *   - The narrower `repo:<collection>` can't name a corner, only each collection in full, and what a program will save isn't known
 *     until it's read.  The wider `transition:generic` adds what a program here never needs.  `scope` says otherwise.
 * - NEVER throws at a page that can't do any of this (no `window`):  it's simply nobody signed in.
 ****************/
export class AtProtoSignIn implements AtProtoAccess {
  /** Where the sign-in stands. */
  status: SignInStatus = "signed out"
  /** Why the last try failed, in the library's words. */
  problem: string | undefined
  /** See `AtProtoAccess`. */
  readonly ready: Promise<void>

  /** Who wants to know. */
  private readonly listeners = new Set<() => void>()
  /** The library's client, once something's asked for it. */
  private client: Promise<SignInClient> | undefined
  /** The session, while someone's signed in. */
  private session: SignInSession | undefined
  /** It's being signed out by asking:  that's no ending. */
  private isSigningOut = false
  /** What turns a handle into an account. */
  private readonly handleResolver: string
  /** What it asks for. */
  private readonly scope: string
  /** Where its client file is on a real address, from the top of it. */
  private readonly clientFile: string

  constructor({
    handleResolver = DEFAULT_HANDLE_RESOLVER,
    scope = DEFAULT_SCOPE,
    clientFile = `/${PROGRAM_CLIENT_FILE}`
  }: AtProtoSignInProps = {}) {
    this.handleResolver = handleResolver
    this.scope = scope
    this.clientFile = clientFile
    this.ready = this.restore()
  }

  /** The account signed in. */
  get did(): string | undefined {
    return this.session?.did
  }

  /** Hear where it stands changing.  Returns what stops it. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Sign in as `who`, a handle or a DID, as typed (`handleFor()`):  the page leaves for the person's host, and comes back signed in.
   * - Resolves only if it doesn't leave, which isn't a sign-in.
   * - throws what the library threw, e.g. for a handle nobody has;  `problem` says the same
   */
  async signIn(who: string): Promise<void> {
    this.set("signing in")
    try {
      const client = await this.clientNow()
      await client.signInRedirect(handleFor(who), { scope: this.scope })
    } catch (error) {
      this.problem = `${(error as Error)?.message ?? error}`
      this.set("signed out")
      throw error
    }
  }

  /** Sign out:  this device forgets the session, and the host ends it.  NEVER throws:  it's signed out here either way. */
  async signOut(): Promise<void> {
    this.isSigningOut = true
    try {
      await this.session?.signOut()
    } catch (ignored) {
      console.error("AtProtoSignIn.signOut():  the host didn't answer;  it's signed out here all the same", ignored)
    }
    this.isSigningOut = false
    this.forget("signed out")
  }

  /** See `AtProtoAccess`.  - throws `TypeError` with nobody signed in */
  fetch(path: string, init?: RequestInit): Promise<Response> {
    if (!this.session) throw new TypeError(`AtProtoSignIn.fetch():  nobody's signed in, so ${path} can't be sent`)
    return this.session.fetchHandler(path, init)
  }

  /** See `AtProtoAccess`. */
  sessionEnded(): void {
    this.forget("ended")
  }

  /** If this page might have someone signed in, find out.  NEVER rejects:  a session that can't be read has ended. */
  private async restore(): Promise<void> {
    const hadSomeone = readSignedIn() !== undefined
    if (!hadSomeone && !isComingBack()) return
    try {
      const client = await this.clientNow()
      const found = await client.init()
      if (!found) return hadSomeone ? this.forget("ended") : undefined
      this.session = found.session
      keepSignedIn(found.session.did)
      this.set("signed in")
    } catch (error) {
      this.problem = `${(error as Error)?.message ?? error}`
      this.forget(hadSomeone ? "ended" : "signed out")
    }
  }

  /** The library's client:  loads the library the first time.  - throws if it can't be loaded */
  private clientNow(): Promise<SignInClient> {
    return (this.client ??= this.makeClient())
  }

  /** Load the library, and make its client. */
  private async makeClient(): Promise<SignInClient> {
    const { BrowserOAuthClient } = await import("@atproto/oauth-client-browser")
    const { handleResolver } = this
    const { location } = globalThis
    const isLocal = isLocalAddress(location)
    const clientId = isLocal ? localClientId(location, this.scope) : `${location.origin}${this.clientFile}`
    try {
      return await BrowserOAuthClient.load({
        clientId,
        handleResolver,
        onSessionDeleted: (did) => {
          if (did === this.did && !this.isSigningOut) this.forget("ended")
        }
      })
    } catch (error) {
      if (isLocal) throw error
      const why = `${(error as Error)?.message ?? error}`
      throw new TypeError(`Signing in here needs the file ${clientId}, and it couldn't be read:  ${why}`, {
        cause: error
      })
    }
  }

  /** Nobody's signed in now, for this reason. */
  private forget(status: SignInStatus): void {
    this.session = undefined
    if (status !== "ended") dropSignedIn()
    this.set(status)
  }

  /** Stands at `status` now. */
  private set(status: SignInStatus): void {
    this.status = status
    if (status !== "signed out") this.problem = undefined
    this.listeners.forEach((listener) => listener())
  }
}

/** Constructor props of an `AtProtoSignIn`. */
export type AtProtoSignInProps = {
  /** What turns a handle into an account:  a server answering `com.atproto.identity.resolveHandle`. */
  handleResolver?: string
  /** What it asks a host to allow.  Left out:  `DEFAULT_SCOPE`. */
  scope?: string
  /**
   * Where its client file is on a real address, from the top of it:  `/apps/@rs/Chat/oauth-client-metadata.json`.
   * - Left out:  `/oauth-client-metadata.json`.
   * - A local address has none, so there it's ignored.
   */
  clientFile?: string
}

/**
 * The handle someone meant, from what they typed in a sign-in box:  `" @ana.bsky.social "` => `"ana.bsky.social"`.
 * - Spaces around it and a leading `@` go.
 * - An `@` in the middle becomes a dot:  `spell-test@bsky.social` => `spell-test.bsky.social`.
 *   - Why:  Spell writes its own accounts as `ana@spell`, so people type a Bluesky handle the same way (Owen, 2026-11-04).
 *   - A handle never holds an `@`, so nothing that was right is changed.
 * - A DID (`did:plc:...`) is left as it is.
 */
export function handleFor(typed: string): string {
  const who = typed.trim().replace(/^@/, "")
  return who.startsWith("did:") ? who : who.replace(/@/g, ".")
}

/**
 * What goes in a program's client file, for a program served from `origin`:  how a host knows who it's being asked by.
 * - A program on a local address needs none.
 * - `redirect`:  the page coming back from signing in, on `origin`.
 * - `file`:  where it's served, from the top of `origin`:  a host checks the file names the address it was read from.
 */
export function atProtoClientMetadata({
  origin,
  redirect,
  name,
  scope = DEFAULT_SCOPE,
  file = `/${PROGRAM_CLIENT_FILE}`
}: {
  /** Where it's served from:  `https`, with no port. */
  origin: string
  /** The page people come back to. */
  redirect: string
  /** What the sign-in page calls it. */
  name: string
  /** What it asks for.  Left out:  `DEFAULT_SCOPE`. */
  scope?: string
  /** Where it's served, from the top of `origin`.  Left out:  `/oauth-client-metadata.json`. */
  file?: string
}) {
  return {
    client_id: `${origin}${file}`,
    client_name: name,
    client_uri: origin,
    application_type: "web",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    redirect_uris: [redirect],
    scope,
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true
  }
}

/**
 * The development client for this page:  `http://localhost`, told to come back here, and what to ask for.
 * - The protocol's own shape:  a host has no file to read for it, and takes it only from a local address.
 * - Coming back goes to `127.0.0.1`:  it allows no other, whatever the page's address says.
 */
function localClientId({ origin, pathname }: Location, scope: string): string {
  const redirect = encodeURIComponent(`${origin.replace("localhost", "127.0.0.1")}${pathname}`)
  return `http://localhost?redirect_uri=${redirect}&scope=${encodeURIComponent(scope)}`
}

/** Is `location` an address a host lets a program use with no file of its own? */
function isLocalAddress(location: Location): boolean {
  return /^(?:127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname)
}

/** Has this page just come back from signing in? */
function isComingBack(): boolean {
  const { location } = globalThis
  return !!location && (COMING_BACK.test(location.hash) || COMING_BACK.test(location.search))
}

/** Who this device last had signed in.  NEVER throws:  a browser that keeps nothing has nobody. */
function readSignedIn(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(SIGNED_IN_KEY) ?? undefined
  } catch (ignored) {
    return undefined
  }
}

/** Note who's signed in.  NEVER throws:  a browser that keeps nothing signs in each visit. */
function keepSignedIn(did: string): void {
  try {
    globalThis.localStorage?.setItem(SIGNED_IN_KEY, did)
  } catch (ignored) {
    // a browser that keeps nothing
  }
}

/** Forget who's signed in.  NEVER throws. */
function dropSignedIn(): void {
  try {
    globalThis.localStorage?.removeItem(SIGNED_IN_KEY)
  } catch (ignored) {
    // a browser that keeps nothing
  }
}
