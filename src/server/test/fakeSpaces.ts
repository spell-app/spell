/**
 * A fake of an AT Protocol Spaces host, answering as Bluesky's Spaces alpha does (epic `atmosphere` P11):
 * for trying `AtProtoSpace` and `AtProtoSpacePlace` with no real account.
 * - What it fakes, as the proposal (0016) and the alpha's lexicons (atproto PR 5187) have it:
 *   - `createSpace` with a member space's or a personal space's policy, `getSpace`, `updateSpace`, `deleteSpace`
 *   - the member list:  `putMember`, `removeMember`, `listMembers`, for the authority only
 *   - each account's own records:  `putRecord`, `deleteRecord`, `clearRecords`;  read by OAuth (its own) or a credential
 *   - `getDelegationToken`, then `getSpaceCredential`:  real ES256 JWTs, bound to the asker's key (`cnf.kid`)
 *   - every read with a credential checks its HTTP Message Signature, and its audience;  `getRecord` answers a MAC
 *     agreed with the asker's `key_share`, by the author's `#atproto_kem` key
 *   - the writer set:  `listRepos`, `removeWriter`;  a write is tracked for the authority, a member who writes, or
 *     anyone under `publicWrite`
 *   - blobs (P12):  uploaded the account's usual way (`com.atproto.repo.uploadBlob`), into no space;
 *     `getBlob` and `listBlobs` answer only the blobs a record of that account's IN THAT SPACE points to
 *     (`BlobNotFound` for any other, as the alpha's code does:  it never says whether one exists);
 *     a record pointing to a blob its account never uploaded is refused `BlobNotFound`;
 *     a blob no record of its account's points to any more, in any space, is deleted at once
 *   - `putRecord` takes no `swapRecord`, as the alpha's lexicon has none:  the last write wins
 * - Its answers' shapes and refusals:  `SpaceNotFound`, `NotSpaceOwner`, `UserNotAuthorized`, `SpaceDeleted`,
 *   `UnsupportedPolicy`, `AuthMissing` ...
 * - One more server is the rest of the network:  the directory of accounts (their documents, with both keys) and handles.
 * - Signing in:  `createSession` with an app password hands out the DID as the token, as `FakeAtmosphere`'s does.
 * - What it does NOT fake:  write notifications, `listRepoOps`, `getRepo`, apps (`allowedApps`), revoking;
 *   nor a blob's size limit, nor a never-used upload expiring.
 *   A credential stays good until it ends, as the real one's does without `notifyCredentialRevoked`.
 * - It shares `SpaceCredential`'s byte helpers:  a mistake made the same on both sides passes here;  the real trial
 *   (`tests/server/spacesTrial.test.ts`) is what proves them.
 * - Node only;  a test helper.
 *   - REFACTOR:  its small HTTP helpers (`send()`, `bodyOf()`, the preflight) copy `fakeAtmosphere`'s;
 *     one shared file once that one's free to change.
 */
import { createHash } from "node:crypto"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

import {
  AUDIENCE_HEADER,
  CREDENTIAL_SCHEME,
  MAC_HEADER,
  WANT_MAC_HEADER,
  base32Of,
  base64urlOf,
  bytesOfBase64,
  concat,
  didKeyFor,
  isSpaceSignatureInput,
  jwtClaimsOf,
  keyShareIn,
  macHeaderFor,
  publicKeyOf,
  recordMacFor,
  sharedSecretFor,
  signatureBaseFor,
  signatureIn,
  text
} from "spell/util/places/SpaceCredential"

/** The policies every host takes. */
const MEMBERSPACE = "com.atproto.memberspace.policy"
const PERSONALSPACE = "com.atproto.personalspace.policy"
const POLICIES = new Set([MEMBERSPACE, PERSONALSPACE, "com.atproto.managedspace.policy"])

/** How long a delegation token is good, and a credential, in seconds. */
const DELEGATION_SECONDS = 60
const CREDENTIAL_SECONDS = 600

/** The P-256 curve. */
const P256 = { name: "ECDSA", namedCurve: "P-256" } as const

/** One account. */
type FakeSpacesAccount = {
  /** Its handle. */
  handle: string
  /** Which host it's on. */
  host: string
  /** Its app password. */
  password?: string
  /** Its signing key (`#atproto`):  delegation tokens, and the credentials of its spaces. */
  signing: CryptoKeyPair
  /** Its MAC key (`#atproto_kem`). */
  kem: CryptoKeyPair
  /** Both, as multibase, for its document. */
  signingKey: string
  kemKey: string
}

/** One space, as its authority's host holds it. */
type FakeSpace = {
  /** Its policy. */
  policy: { $type: string; publicRead?: boolean; publicWrite?: boolean }
  /** Its members:  a read and a write flag each. */
  members: Map<string, { read: boolean; write: boolean }>
  /** The writer set:  each writer's revision. */
  writers: Map<string, { repoRev: string; spaceRev: string }>
  /** Deleted:  it hands out no more credentials. */
  isDeleted: boolean
}

/** One blob, as its account's host keeps it. */
type FakeBlob = { bytes: Uint8Array; mimeType: string }

/** An answer that's bytes, not JSON:  a blob. */
class BytesAnswer {
  constructor(
    readonly bytes: Uint8Array,
    readonly mimeType: string
  ) {}
}

/** The method a blob is uploaded by:  its body is the bytes. */
const UPLOAD_BLOB = "com.atproto.repo.uploadBlob"

/** One record, as its author's host keeps it. */
type FakeSpaceRecord = { cid: string; value: Record<string, unknown> }

/** One request a host was sent. */
export type FakeSpacesAsk = {
  /** The method:  `com.atproto.space.getRecord`. */
  method: string
  /** Signed in as, by OAuth or an app password's session. */
  as?: string
  /** Read with a credential, for this audience. */
  audience?: string
  /** What it was sent. */
  params: Record<string, unknown>
}

/** A thrown answer:  what a real host says. */
class FakeSpacesRefusal extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message: string
  ) {
    super(message)
  }
}
FakeSpacesRefusal.prototype.name = "FakeSpacesRefusal"

/****************
 * ### `FakeSpaces`
 * The Spaces host, and the network around it:  see the top of the file.
 ****************/
export class FakeSpaces {
  /** Every request a host was sent, oldest first. */
  readonly asks: FakeSpacesAsk[] = []
  /** The accounts, by DID. */
  readonly accounts = new Map<string, FakeSpacesAccount>()
  /** The spaces, by URI. */
  readonly spaces = new Map<string, FakeSpace>()
  /** Each account's records, by `<space> <did>`, then `<collection>/<rkey>`. */
  readonly repos = new Map<string, Map<string, FakeSpaceRecord>>()
  /** Each account's blobs, by DID, then CID:  in no space, as the real host keeps them. */
  readonly blobStore = new Map<string, Map<string, FakeBlob>>()

  /** Where the rest of the network is. */
  private networkUrl = ""
  /** Each host's address, by its name. */
  private readonly hostUrls = new Map<string, string>()
  /** Every server it runs. */
  private readonly servers: Server[] = []
  /** Delegation tokens already used:  each is good once. */
  private readonly usedTokens = new Set<string>()
  /** How many revisions there have been. */
  private revisions = 0

  /** Start it, with these hosts.  Call `addAccount()` after. */
  async start(hosts: readonly string[]): Promise<this> {
    this.networkUrl = await this.listening(
      createServer((request, response) => void this.answerNetwork(request, response))
    )
    for (const host of hosts) {
      const server = createServer((request, response) => void this.answerHost(host, request, response))
      this.hostUrls.set(host, await this.listening(server))
    }
    return this
  }

  /** Stop everything. */
  async close(): Promise<void> {
    await Promise.all(
      this.servers.map(
        (server) =>
          new Promise<void>((done) => {
            server.closeAllConnections()
            server.close(() => done())
          })
      )
    )
  }

  /** Where the network is:  what `AtProtoPasswordSignIn` and `AtProtoSpace` are handed. */
  get network() {
    return { directory: this.networkUrl, handles: this.networkUrl }
  }

  /** A host's address. */
  hostUrl(host: string): string {
    return this.hostUrls.get(host)!
  }

  /** A new account on `host`, with keys of its own.  Returns its DID. */
  async addAccount(did: string, { handle, host, password }: { handle: string; host: string; password?: string }) {
    const signing = await crypto.subtle.generateKey(P256, true, ["sign", "verify"])
    const kem = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
    const multibase = async (key: CryptoKey) => (await didKeyFor(key)).replace("did:key:", "")
    this.accounts.set(did, {
      handle,
      host,
      password,
      signing,
      kem,
      signingKey: await multibase(signing.publicKey),
      kemKey: await multibase(kem.publicKey)
    })
    return did
  }

  /** `did`'s records in `space`. */
  recordsOf(space: string, did: string): Map<string, FakeSpaceRecord> {
    return this.repos.get(`${space} ${did}`) ?? new Map()
  }

  /** The requests of `method`, so far. */
  asksOf(method: string): FakeSpacesAsk[] {
    return this.asks.filter((ask) => ask.method === method)
  }

  /** The server's address, once it's listening. */
  private async listening(server: Server): Promise<string> {
    await new Promise<void>((done, fail) => {
      server.once("error", fail)
      server.listen(0, "127.0.0.1", done)
    })
    this.servers.push(server)
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  ////////////////
  // ## The rest of the network
  ////////////////

  /** The directory and handles. */
  private async answerNetwork(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (answerPreflight(request, response)) return
    const url = new URL(request.url ?? "/", "http://fake")
    const did = decodeURIComponent(url.pathname.slice(1))
    if (did.startsWith("did:")) {
      const account = this.accounts.get(did)
      if (!account) return send(response, 404, { message: `DID not registered: ${did}` })
      return send(response, 200, {
        id: did,
        alsoKnownAs: [`at://${account.handle}`],
        verificationMethod: [
          { id: `${did}#atproto`, type: "Multikey", controller: did, publicKeyMultibase: account.signingKey },
          { id: `${did}#atproto_kem`, type: "Multikey", controller: did, publicKeyMultibase: account.kemKey }
        ],
        service: [
          { id: "#atproto_pds", type: "AtprotoPersonalDataServer", serviceEndpoint: this.hostUrls.get(account.host) }
        ]
      })
    }
    if (url.pathname.endsWith("com.atproto.identity.resolveHandle")) {
      const found = [...this.accounts].find(([, account]) => account.handle === url.searchParams.get("handle"))
      if (!found) return send(response, 400, { error: "InvalidRequest", message: "Unable to resolve handle" })
      return send(response, 200, { did: found[0] })
    }
    send(response, 404, { message: "not here" })
  }

  ////////////////
  // ## A host
  ////////////////

  /** What one host says. */
  private async answerHost(host: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (answerPreflight(request, response)) return
    const url = new URL(request.url ?? "/", "http://fake")
    const method = url.pathname.replace("/xrpc/", "")
    const raw = request.method === "POST" ? await bodyOf(request) : Buffer.alloc(0)
    const isUpload = method === UPLOAD_BLOB
    const body = isUpload ? {} : (JSON.parse(raw.toString() || "{}") as Record<string, unknown>)
    const params = { ...Object.fromEntries(url.searchParams), ...body }
    const authorization = request.headers.authorization ?? ""
    const as = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined
    const audience = request.headers[AUDIENCE_HEADER.toLowerCase()] as string | undefined
    this.asks.push({ method, params, ...(as && { as }), ...(audience && { audience }) })
    try {
      const headers: Record<string, string> = {}
      const bytes = isUpload ? new Uint8Array(raw) : undefined
      const answer = await this.run({ host, method, params, as, request, headers, bytes })
      if (answer instanceof BytesAnswer) sendBytes(response, answer, headers)
      else send(response, 200, answer, headers)
    } catch (error) {
      if (!(error instanceof FakeSpacesRefusal)) throw error
      send(response, error.status, { error: error.error, message: error.message })
    }
  }

  /** What `method` answers.  - throws `FakeSpacesRefusal` */
  private async run(ask: HostAsk): Promise<unknown> {
    const { host, method, params } = ask
    switch (method) {
      case "com.atproto.server.describeServer":
        return {
          did: `did:web:${host}`,
          availableUserDomains: [`.${host}`],
          inviteCodeRequired: true,
          spacesAlpha: true
        }
      case "com.atproto.server.createSession":
        return this.sessionFor(host, params)
      case "com.atproto.space.getSpaceCredential":
        return this.credentialFor(params)
      case "com.atproto.space.getRecord":
        return this.getRecord(ask)
      case "com.atproto.space.listRecords":
        return this.listRecords(ask)
      case "com.atproto.space.listRepos":
        return this.listRepos(ask)
      case "com.atproto.space.getBlob":
        return this.getBlob(ask)
      case "com.atproto.space.listBlobs":
        return this.listBlobs(ask)
      default:
    }
    const me = this.signedIn(ask.as)
    const space = `${params.space as string}`
    switch (method) {
      case "com.atproto.space.createSpace":
        return this.createSpace(me, params)
      case "com.atproto.space.getSpace":
        return { uri: space, policy: this.ownedBy(me, space).policy }
      case "com.atproto.space.updateSpace":
        return this.updateSpace(me, space, params)
      case "com.atproto.space.deleteSpace":
        return this.deleteSpace(me, space)
      case "com.atproto.space.listSpaces":
        return { spaces: [...this.spaces.keys()].filter((uri) => authorityOf(uri) === me).map((uri) => ({ uri })) }
      case "com.atproto.memberspace.putMember":
        return this.putMember(me, space, params)
      case "com.atproto.memberspace.removeMember":
        return this.removeMember(me, space, `${params.did as string}`)
      case "com.atproto.memberspace.listMembers":
        return { members: [...this.ownedBy(me, space).members].map(([did, access]) => ({ did, ...access })) }
      case "com.atproto.space.removeWriter":
        this.ownedBy(me, space).writers.delete(`${params.did as string}`)
        return {}
      case "com.atproto.space.getDelegationToken":
        return { token: await this.delegationTokenFor(me, space) }
      case "com.atproto.space.putRecord":
        return this.putRecord(me, params)
      case "com.atproto.space.deleteRecord":
        return this.deleteRecord(me, params)
      case "com.atproto.space.clearRecords": {
        const repo = this.repoOf(space, this.ownRepo(me, params))
        const dropped = [...repo.values()]
        repo.clear()
        this.dropUnused(me, dropped)
        return {}
      }
      case UPLOAD_BLOB:
        return this.uploadBlob(me, ask)
      default:
        throw new FakeSpacesRefusal(501, "MethodNotImplemented", method)
    }
  }

  /** An app password's session:  its token is the DID.  - throws `AuthenticationRequired` for a wrong one */
  private sessionFor(host: string, { identifier, password }: Record<string, unknown>) {
    const found = [...this.accounts].find(([did, account]) => did === identifier || account.handle === identifier)
    const [did, account] = found ?? []
    if (!did || !account || account.host !== host || !account.password || account.password !== password) {
      throw new FakeSpacesRefusal(401, "AuthenticationRequired", "Invalid identifier or password")
    }
    return { did, handle: account.handle, accessJwt: did, refreshJwt: `refresh-${did}`, active: true }
  }

  /** Who's signed in.  - throws `AuthMissing` for nobody */
  private signedIn(as: string | undefined): string {
    if (!as || !this.accounts.has(as)) throw new FakeSpacesRefusal(401, "AuthMissing", "Authentication Required")
    return as
  }

  /** The space, if `me` is its authority.  - throws `SpaceNotFound`, `NotSpaceOwner` */
  private ownedBy(me: string, uri: string): FakeSpace {
    const space = this.spaceOrDie(uri)
    if (authorityOf(uri) !== me) throw new FakeSpacesRefusal(403, "NotSpaceOwner", "Not the space owner")
    return space
  }

  /** - throws `SpaceNotFound` */
  private spaceOrDie(uri: string): FakeSpace {
    const space = this.spaces.get(uri)
    if (!space || space.isDeleted) throw new FakeSpacesRefusal(400, "SpaceNotFound", `Space not found: ${uri}`)
    return space
  }

  ////////////////
  // ## Spaces and their members
  ////////////////

  /** - throws `SpaceAlreadyExists`, `UnsupportedPolicy` */
  private createSpace(me: string, { spaceType, skey = "self", policy }: Record<string, unknown>) {
    const uri = `at://${me}/space/${spaceType as string}/${skey as string}`
    const asked = policy as FakeSpace["policy"]
    if (!POLICIES.has(asked?.$type)) throw new FakeSpacesRefusal(400, "UnsupportedPolicy", `${asked?.$type}`)
    if (this.spaces.get(uri) && !this.spaces.get(uri)!.isDeleted) {
      throw new FakeSpacesRefusal(400, "SpaceAlreadyExists", `Space already exists: ${uri}`)
    }
    this.spaces.set(uri, { policy: asked, members: new Map(), writers: new Map(), isDeleted: false })
    return { uri }
  }

  /** A new policy, replacing the old;  a new kind of policy drops the member list. */
  private updateSpace(me: string, uri: string, { policy }: Record<string, unknown>) {
    const space = this.ownedBy(me, uri)
    const asked = policy as FakeSpace["policy"]
    if (!POLICIES.has(asked?.$type)) throw new FakeSpacesRefusal(400, "UnsupportedPolicy", `${asked?.$type}`)
    if (asked.$type !== space.policy.$type) space.members.clear()
    space.policy = asked
    return {}
  }

  /** No more credentials;  the authority's own records go, every member's stay. */
  private deleteSpace(me: string, uri: string) {
    this.ownedBy(me, uri).isDeleted = true
    const repo = this.repoOf(uri, me)
    const dropped = [...repo.values()]
    repo.clear()
    this.dropUnused(me, dropped)
    return {}
  }

  /** - throws `PolicyMismatch` for a space with no member list */
  private putMember(me: string, uri: string, { did, read, write }: Record<string, unknown>) {
    const space = this.ownedBy(me, uri)
    if (space.policy.$type !== MEMBERSPACE) throw new FakeSpacesRefusal(400, "PolicyMismatch", "Not a memberspace")
    space.members.set(`${did as string}`, { read: !!read, write: !!write })
    if (!write && !space.policy.publicWrite) space.writers.delete(`${did as string}`)
    return {}
  }

  /** Off the list, and out of the writer set. */
  private removeMember(me: string, uri: string, did: string) {
    const space = this.ownedBy(me, uri)
    space.members.delete(did)
    if (!space.policy.publicWrite) space.writers.delete(did)
    return {}
  }

  ////////////////
  // ## Credentials
  ////////////////

  /** A delegation token:  `me` asks the authority, through this app, for `space`. */
  private delegationTokenFor(me: string, space: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return this.jwt(me, "atproto-space-delegation+jwt", {
      iss: me,
      sub: space,
      aud: `${authorityOf(space)}#atproto_pds`,
      iat: now,
      exp: now + DELEGATION_SECONDS,
      jti: crypto.randomUUID()
    })
  }

  /**
   * A credential for the whole space, bound to the asker's key.
   * - throws:  `SpaceNotFound`, `SpaceDeleted`, `InvalidDelegationToken`, `UserNotAuthorized`
   */
  private async credentialFor({ space: uri, credentialKid, delegationToken }: Record<string, unknown>) {
    const space = this.spaces.get(`${uri as string}`)
    if (!space) throw new FakeSpacesRefusal(400, "SpaceNotFound", `Space not found: ${uri as string}`)
    if (space.isDeleted) throw new FakeSpacesRefusal(400, "SpaceDeleted", `Space was deleted: ${uri as string}`)
    try {
      await publicKeyOf(`${credentialKid as string}`, "ECDSA")
    } catch (ignored) {
      throw new FakeSpacesRefusal(400, "InvalidRequest", "credentialKid must be a P-256 did:key")
    }
    const authority = authorityOf(`${uri as string}`)
    const user = delegationToken ? await this.userOf(`${delegationToken as string}`, `${uri as string}`) : undefined
    const isMember = user && (user === authority || space.members.get(user)?.read)
    if (!space.policy.publicRead && !isMember) {
      throw new FakeSpacesRefusal(403, "UserNotAuthorized", "User is not authorized to read this space")
    }
    const now = Math.floor(Date.now() / 1000)
    const credential = await this.jwt(authority, "atproto-space-credential+jwt", {
      iss: authority,
      sub: uri,
      cnf: { kid: credentialKid },
      iat: now,
      exp: now + CREDENTIAL_SECONDS,
      jti: crypto.randomUUID()
    })
    return { credential }
  }

  /** Who a delegation token is for, checked.  - throws `InvalidDelegationToken` */
  private async userOf(token: string, space: string): Promise<string> {
    const claims = jwtClaimsOf(token) as { iss: string; sub: string; aud: string; exp: number; jti: string }
    const account = this.accounts.get(claims.iss)
    const isGood =
      account &&
      (await verified(account.signing.publicKey, token)) &&
      claims.sub === space &&
      claims.aud === `${authorityOf(space)}#atproto_pds` &&
      claims.exp > Date.now() / 1000 &&
      !this.usedTokens.has(claims.jti)
    if (!isGood) throw new FakeSpacesRefusal(400, "InvalidDelegationToken", "Invalid delegation token")
    this.usedTokens.add(claims.jti)
    return claims.iss
  }

  /**
   * The space a read's credential is good for, checked against `audience`:  its signature, its key's signature over
   * the request, its subject and its end.  `undefined`:  no credential came.
   * - throws `InvalidToken` (401) for one that's no good
   */
  private async credentialSpaceOf({ request }: HostAsk, audience: string): Promise<string | undefined> {
    const authorization = request.headers.authorization ?? ""
    if (!new RegExp(`^${CREDENTIAL_SCHEME} `, "i").test(authorization)) return undefined
    const refuse = (why: string) => new FakeSpacesRefusal(401, "InvalidToken", `Bad space credential:  ${why}`)
    const token = authorization.slice(CREDENTIAL_SCHEME.length + 1)
    const claims = jwtClaimsOf(token) as { iss: string; sub: string; exp: number; cnf?: { kid: string } }
    const authority = this.accounts.get(claims.iss)
    if (!authority || !(await verified(authority.signing.publicKey, token))) throw refuse("its signature")
    if (claims.exp < Date.now() / 1000) throw refuse("it has ended")
    if (!isSpaceSignatureInput(request.headers["signature-input"] as string)) throw refuse("its Signature-Input")
    if (request.headers[AUDIENCE_HEADER.toLowerCase()] !== audience) throw refuse("its audience")
    const signature = signatureIn(request.headers.signature as string)
    const key = await publicKeyOf(claims.cnf?.kid ?? "", "ECDSA")
    const base = text(signatureBaseFor(authorization, audience))
    const isSigned = signature && (await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, base))
    if (!isSigned) throw refuse("its HTTP signature")
    return claims.sub
  }

  /**
   * Who may read `repo` in `space`:  its owner by OAuth, or anyone with a credential for the space.
   * - throws `AuthMissing`, `InvalidToken`
   */
  private async mayRead(ask: HostAsk, space: string, repo: string): Promise<"credential" | "own"> {
    const credentialFor = await this.credentialSpaceOf(ask, repo)
    if (credentialFor !== undefined) {
      if (credentialFor !== space) throw new FakeSpacesRefusal(401, "InvalidToken", "Credential is for another space")
      return "credential"
    }
    if (this.signedIn(ask.as) !== repo) throw new FakeSpacesRefusal(403, "InvalidRequest", "Not your repo")
    return "own"
  }

  ////////////////
  // ## Records
  ////////////////

  /** Write `me`'s own record;  tracked in the writer set when the space says they write. */
  private putRecord(me: string, params: Record<string, unknown>) {
    const { space, collection, rkey, record } = params as Record<string, string> & { record: Record<string, unknown> }
    const repo = this.ownRepo(me, params)
    if (authorityOf(space) === me) this.spaceOrDie(space)
    for (const blob of blobCidsIn(record)) {
      if (!this.blobStore.get(me)?.has(blob))
        throw new FakeSpacesRefusal(400, "BlobNotFound", `Could not find blob: ${blob}`)
    }
    const cid = cidFor(record)
    const records = this.repoOf(space, repo)
    const replaced = records.get(`${collection}/${rkey}`)
    records.set(`${collection}/${rkey}`, { cid, value: structuredClone(record) })
    if (replaced) this.dropUnused(me, [replaced])
    this.noteWrite(space, repo)
    return { uri: `${space}/${repo}/${collection}/${rkey}`, cid, validationStatus: "unknown" }
  }

  /** Remove `me`'s own record. */
  private deleteRecord(me: string, params: Record<string, unknown>) {
    const { space, collection, rkey } = params as Record<string, string>
    const records = this.repoOf(space, this.ownRepo(me, params))
    const removed = records.get(`${collection}/${rkey}`)
    records.delete(`${collection}/${rkey}`)
    if (removed) this.dropUnused(me, [removed])
    this.noteWrite(space, me)
    return {}
  }

  /** The repo written:  only the caller's.  - throws `InvalidRequest` for anyone else's */
  private ownRepo(me: string, { repo }: Record<string, unknown>): string {
    if (repo !== me) throw new FakeSpacesRefusal(403, "InvalidRequest", "Input/repo must be the current account")
    return me
  }

  /** The space hears of a write:  tracked for its authority, a member who writes, or anyone under `publicWrite`. */
  private noteWrite(uri: string, repo: string): void {
    const space = this.spaces.get(uri)
    if (!space || space.isDeleted) return
    const isWriter = authorityOf(uri) === repo || space.members.get(repo)?.write || (space.policy.publicWrite ?? false)
    const rev = `rev-${`${++this.revisions}`.padStart(10, "0")}`
    if (isWriter) space.writers.set(repo, { repoRev: rev, spaceRev: rev })
  }

  /** - throws `RecordNotFound`;  needs a MAC ask when read with a credential */
  private async getRecord(ask: HostAsk) {
    const { space, repo, collection, rkey } = ask.params as Record<string, string>
    const how = await this.mayRead(ask, space, repo)
    const held = this.recordsOf(space, repo).get(`${collection}/${rkey}`)
    const uri = `${space}/${repo}/${collection}/${rkey}`
    if (!held) throw new FakeSpacesRefusal(400, "RecordNotFound", `Could not locate record: ${uri}`)
    if (how === "credential") {
      const share = keyShareIn(ask.request.headers[WANT_MAC_HEADER.toLowerCase()] as string)
      if (!share) throw new FakeSpacesRefusal(400, "InvalidRequest", `${WANT_MAC_HEADER} is required`)
      const author = this.accounts.get(repo)!
      const syncerKey = await publicKeyOf(share, "ECDH")
      const secret = await sharedSecretFor({
        ours: author.kem.privateKey,
        theirs: syncerKey,
        syncerKey,
        authorKey: author.kem.publicKey
      })
      ask.headers[MAC_HEADER] = macHeaderFor("atproto-space-record", await recordMacFor(secret, uri, held.cid))
      ask.headers.Vary = WANT_MAC_HEADER
    }
    return { uri, cid: held.cid, value: held.value }
  }

  /** A repo's records, by key, a page at a time. */
  private async listRecords(ask: HostAsk) {
    const { space, repo, collection, cursor } = ask.params as Record<string, string>
    await this.mayRead(ask, space, repo)
    const limit = Number(ask.params.limit ?? 50)
    const keys = [...this.recordsOf(space, repo).keys()]
      .filter((key) => !collection || key.startsWith(`${collection}/`))
      .sort()
      .filter((key) => cursor === undefined || key > cursor)
    const records = keys.slice(0, limit).map((key) => {
      const { cid, value } = this.recordsOf(space, repo).get(key)!
      const slash = key.lastIndexOf("/")
      return { collection: key.slice(0, slash), rkey: key.slice(slash + 1), cid, value }
    })
    return { records, ...(keys.length > limit && { cursor: keys[limit - 1] }) }
  }

  /** The writer set, read with a credential for the space, its audience the authority. */
  private async listRepos(ask: HostAsk) {
    const uri = `${ask.params.space as string}`
    const space = this.spaceOrDie(uri)
    const credentialFor = await this.credentialSpaceOf(ask, authorityOf(uri))
    if (credentialFor !== uri) throw new FakeSpacesRefusal(401, "AuthMissing", "A space credential is required")
    const repos = [...space.writers].map(([did, { repoRev, spaceRev }]) => ({
      did,
      repoRev,
      spaceRev,
      data: { $bytes: base64urlOf(new Uint8Array(32)) }
    }))
    return { repos }
  }

  ////////////////
  // ## Blobs
  ////////////////

  /** A blob of `me`'s, in no space:  its ref, as a record points to it. */
  private uploadBlob(me: string, { request, bytes = new Uint8Array() }: HostAsk) {
    const mimeType = request.headers["content-type"] ?? "application/octet-stream"
    const cid = blobCidFor(bytes)
    if (!this.blobStore.has(me)) this.blobStore.set(me, new Map())
    this.blobStore.get(me)!.set(cid, { bytes, mimeType })
    return { blob: { $type: "blob", ref: { $link: cid }, mimeType, size: bytes.length } }
  }

  /** - throws `BlobNotFound` for one no record of the repo's in the space points to, held or not */
  private async getBlob(ask: HostAsk) {
    const { space, repo, cid } = ask.params as Record<string, string>
    this.spaceOrDie(space)
    await this.mayRead(ask, space, repo)
    const held = this.blobStore.get(repo)?.get(cid)
    if (!held || !this.blobCidsOf(space, repo).has(cid)) {
      throw new FakeSpacesRefusal(400, "BlobNotFound", "Blob not found")
    }
    return new BytesAnswer(held.bytes, held.mimeType)
  }

  /** The blobs a repo's records in the space point to, by CID, a page at a time. */
  private async listBlobs(ask: HostAsk) {
    const { space, repo, cursor } = ask.params as Record<string, string>
    this.spaceOrDie(space)
    await this.mayRead(ask, space, repo)
    const limit = Number(ask.params.limit ?? 500)
    const cids = [...this.blobCidsOf(space, repo)].sort().filter((cid) => cursor === undefined || cid > cursor)
    const page = cids.slice(0, limit)
    return { cids: page, ...(page.length === limit && { cursor: page.at(-1) }) }
  }

  /** The blobs `did`'s records in `space` point to. */
  private blobCidsOf(space: string, did: string): Set<string> {
    return new Set([...this.recordsOf(space, did).values()].flatMap(({ value }) => blobCidsIn(value)))
  }

  /** Delete each of `did`'s blobs `records` pointed to that no record of theirs, in any space, still does. */
  private dropUnused(did: string, records: readonly FakeSpaceRecord[]): void {
    const store = this.blobStore.get(did)
    if (!store) return
    const stillUsed = new Set(
      [...this.repos]
        .filter(([key]) => key.endsWith(` ${did}`))
        .flatMap(([, held]) => [...held.values()].flatMap(({ value }) => blobCidsIn(value)))
    )
    for (const cid of records.flatMap(({ value }) => blobCidsIn(value))) {
      if (!stillUsed.has(cid)) store.delete(cid)
    }
  }

  /** `did`'s records in `space`, made when first asked for. */
  private repoOf(space: string, did: string): Map<string, FakeSpaceRecord> {
    const key = `${space} ${did}`
    if (!this.repos.has(key)) this.repos.set(key, new Map())
    return this.repos.get(key)!
  }

  /** A JWT signed by `did`'s signing key. */
  private async jwt(did: string, typ: string, claims: Record<string, unknown>): Promise<string> {
    const header = base64urlOf(text(JSON.stringify({ typ, alg: "ES256", kid: "#atproto" })))
    const body = base64urlOf(text(JSON.stringify(claims)))
    const signed = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.accounts.get(did)!.signing.privateKey,
      text(`${header}.${body}`)
    )
    return `${header}.${body}.${base64urlOf(new Uint8Array(signed))}`
  }
}

/** One request, as `run()` handles it. */
type HostAsk = {
  /** Which host. */
  host: string
  /** The method. */
  method: string
  /** Its query and body. */
  params: Record<string, unknown>
  /** Signed in as. */
  as: string | undefined
  /** The request itself, for its headers. */
  request: IncomingMessage
  /** Headers to answer with. */
  headers: Record<string, string>
  /** What an upload sent. */
  bytes?: Uint8Array
}

/** A space's authority. */
function authorityOf(uri: string): string {
  return uri.split("/")[2] ?? ""
}

/** A CID for `value`:  a CIDv1 of its JSON's SHA-256, in the shape a real one has. */
function cidFor(value: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(value)).digest()
  return base32Of(concat(new Uint8Array([0x01, 0x71, 0x12, 0x20]), new Uint8Array(hash)))
}

/** A blob's CID:  a CIDv1, raw, of its SHA-256, as the real host makes one. */
function blobCidFor(bytes: Uint8Array): string {
  const hash = createHash("sha256").update(bytes).digest()
  return base32Of(concat(new Uint8Array([0x01, 0x55, 0x12, 0x20]), new Uint8Array(hash)))
}

/** The CIDs of every blob `value` points to, however deep. */
function blobCidsIn(value: unknown): string[] {
  if (!value || typeof value !== "object") return []
  const { $type, ref } = value as { $type?: unknown; ref?: { $link?: unknown } }
  if ($type === "blob" && typeof ref?.$link === "string") return [ref.$link]
  return Object.values(value).flatMap(blobCidsIn)
}

/** Is `jwt` signed by `key`? */
async function verified(key: CryptoKey, jwt: string): Promise<boolean> {
  const [header, body, signature] = jwt.split(".")
  if (!header || !body || !signature) return false
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    bytesOfBase64(signature),
    text(`${header}.${body}`)
  )
}

/** What a request was sent. */
async function bodyOf(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

/** Answer `value`, from anywhere. */
function send(response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": MAC_HEADER,
    ...headers
  })
  response.end(JSON.stringify(value))
}

/** Answer a blob's bytes, as the real host does:  its own type, never sniffed, never run. */
function sendBytes(response: ServerResponse, { bytes, mimeType }: BytesAnswer, headers: Record<string, string>): void {
  response.writeHead(200, {
    "content-type": mimeType,
    "content-length": `${bytes.length}`,
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "access-control-allow-origin": "*",
    ...headers
  })
  response.end(bytes)
}

/** A browser asking first:  answers whether it was. */
function answerPreflight(request: IncomingMessage, response: ServerResponse): boolean {
  if (request.method !== "OPTIONS") return false
  response.writeHead(204, {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": [
      "authorization",
      "content-type",
      AUDIENCE_HEADER,
      WANT_MAC_HEADER,
      "signature",
      "signature-input"
    ].join(","),
    "access-control-allow-methods": "GET,POST"
  })
  response.end()
  return true
}
