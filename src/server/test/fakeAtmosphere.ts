/**
 * A small fake of AT Protocol's network, for trying `AtProtoPlace` with no real account (epic `data` P16).
 * - Each host is a server of its own, on its own port, holding some accounts' records:  `listRecords` in pages of 100, newest
 *   key first as a real host answers (`reverse=true`:  oldest first),
 *   `getRecord`, `putRecord` and `deleteRecord` with `swapRecord`, `applyWrites` with `swapCommit`, `getLatestCommit`.
 * - One more server is the rest of the network:  the directory of accounts, handles, a Jetstream, and the relay's
 *   `listReposByCollection`, in pages, naming the accounts in the order each first held the collection, as the real one does;  and a
 *   Jetstream of the shape the real one has (`xrpc.v1.json`, `collections`, `dids`, `cursor`).
 * - It says no as the real ones were seen to:  `InvalidSwap`, `RecordNotFound` at a 400, `Too many writes`, a decimal number refused.
 * - Signing in is faked:  `Authorization: Bearer <did>`, what `FakeSignIn` sends;  `createSession`, with an app password
 *   `addAccount()` was given, hands out that same token (`AtProtoPasswordSignIn`, epic `atmosphere` P9).  Its protocol is the official library's to get right, and manual test M3's to prove.
 * - Answers any origin, as the real ones do, so a page can use it (`pageScript()`).
 * - Node only;  a test helper:  nothing here is careful about anything but being a fair fake.
 */
import { createHash } from "node:crypto"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import type { Duplex } from "node:stream"

import { acceptWebSocket, textFrame } from "spell/server/webSocket"

/** What Jetstream speaks. */
const STREAM_PROTOCOL = "xrpc.v1.json"

/** The most a host answers with at once. */
const MOST_IN_A_PAGE = 100

/** The most accounts the relay names at once. */
const MOST_HOLDERS_AT_ONCE = 2000

/** The host's own limit on one `applyWrites`. */
const MOST_WRITES = 200

/** One record, as a host keeps it. */
type FakeRecord = { cid: string; value: Record<string, unknown> }

/** One account. */
type FakeAccount = {
  /** Its handle. */
  handle: string
  /** Which host it's on. */
  host: string
  /** The app password it signs in with by `createSession`.  Left out:  none, so that's refused. */
  password?: string
  /** Its records, by collection then key. */
  records: Map<string, Map<string, FakeRecord>>
  /** Where its history stands. */
  commit: string
  /** How many commits it's had:  what its `rev` is made from. */
  commits: number
}

/** One event on the stream. */
type StreamEvent = {
  /** Where the stream stands. */
  seq: number
  /** What it sends. */
  text: string
  /** Its collection. */
  collection: string
  /** Its account. */
  did: string
}

/** One socket listening. */
type Listener = { socket: Duplex; collections: Set<string>; dids: Set<string> }

/** One request a host was sent. */
export type FakeAsk = {
  /** Which host. */
  host: string
  /** The method:  `com.atproto.repo.listRecords`. */
  method: string
  /** The account signed in as, if it was. */
  as?: string
  /** What it was sent. */
  params: Record<string, unknown>
}

/** A thrown answer:  what a real host says. */
class FakeRefusal extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message: string
  ) {
    super(message)
  }
}
FakeRefusal.prototype.name = "FakeRefusal"

/****************
 * ### `FakeAtmosphere`
 * The network:  see the top of the file.
 ****************/
export class FakeAtmosphere {
  /** Every request a host was sent, oldest first. */
  readonly asks: FakeAsk[] = []
  /** The accounts, by DID. */
  readonly accounts = new Map<string, FakeAccount>()
  /** The hosts that don't answer. */
  readonly hostsDown = new Set<string>()
  /** The accounts whose sign-in has run out. */
  readonly sessionsOver = new Set<string>()

  /** Where the rest of the network is. */
  private networkUrl = ""
  /** Each host's address, by its name. */
  private readonly hostUrls = new Map<string, string>()
  /** Every server it runs. */
  private readonly servers: Server[] = []
  /** Every socket listening. */
  private readonly listeners = new Set<Listener>()
  /** Who holds each collection, in the order each first did:  the relay's order. */
  private readonly holders = new Map<string, string[]>()
  /** Every event, for a socket picking up where it stopped. */
  private readonly events: StreamEvent[] = []
  /** How many versions there have been:  no two the same. */
  private versions = 0

  /**
   * Start it, with these hosts.  Call `addAccount()` after.
   * - `port`:  where the network listens, and each host on the ports after it, for a page that has to know.  Left out:  any free ones.
   */
  async start(hosts: readonly string[], { port }: { port?: number } = {}): Promise<this> {
    const network = createServer((request, response) => void this.answerNetwork(request, response))
    network.on("upgrade", (raw, socket) => this.listen(raw, socket))
    this.networkUrl = await this.listening(network, port)
    for (const [index, host] of hosts.entries()) {
      const server = createServer((request, response) => void this.answerHost(host, request, response))
      this.hostUrls.set(host, await this.listening(server, port === undefined ? undefined : port + index + 1))
    }
    return this
  }

  /** Stop everything. */
  async close(): Promise<void> {
    for (const { socket } of this.listeners) socket.destroy()
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

  /** What to hand a place, or a page:  where the network is. */
  get network() {
    return {
      directory: this.networkUrl,
      relay: this.networkUrl,
      handles: this.networkUrl,
      stream: this.networkUrl.replace(/^http/, "ws")
    }
  }

  /** A new account, on `host`.  Returns its DID. */
  addAccount(did: string, { handle, host, password }: { handle: string; host: string; password?: string }): string {
    this.accounts.set(did, { handle, host, password, records: new Map(), commit: "commit-0", commits: 0 })
    return did
  }

  /** Someone changes a record directly on their host:  another device, or another program. */
  putRecord(did: string, collection: string, rkey: string, value: Record<string, unknown>): string {
    return this.write(this.accountOrDie(did), did, [{ collection, rkey, value }])[0]!
  }

  /** Someone removes a record directly on their host. */
  deleteRecord(did: string, collection: string, rkey: string): void {
    this.write(this.accountOrDie(did), did, [{ collection, rkey }])
  }

  /** What's kept. */
  recordsOf(did: string, collection: string): Map<string, FakeRecord> {
    return this.accounts.get(did)?.records.get(collection) ?? new Map()
  }

  /** The requests of `method`, so far. */
  asksOf(method: string): FakeAsk[] {
    return this.asks.filter((ask) => ask.method === method)
  }

  /** Cut every socket:  each comes back by itself. */
  dropSockets(): void {
    for (const { socket } of this.listeners) socket.destroy()
    this.listeners.clear()
  }

  /** A script for a page:  a program there reaches this network, signed in as `did`. */
  pageScript(did: string): string {
    const settings = JSON.stringify(this.network)
    const host = this.hostUrls.get(this.accountOrDie(did).host)
    return `window.SPELL_ATMOSPHERE = { ...${settings}, signIn: (() => {
  const listeners = new Set()
  const signIn = {
    status: "signed in",
    did: ${JSON.stringify(did)},
    ready: Promise.resolve(),
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async signIn() {},
    async signOut() { signIn.did = undefined; signIn.status = "signed out"; listeners.forEach((each) => each()) },
    sessionEnded() { signIn.did = undefined; signIn.status = "ended"; listeners.forEach((each) => each()) },
    fetch(path, init = {}) {
      return fetch(${JSON.stringify(host)} + path, { ...init, headers: { ...init.headers, Authorization: "Bearer " + signIn.did } })
    }
  }
  return signIn
})() }`
  }

  /** The server's address, once it's listening. */
  private async listening(server: Server, port = 0): Promise<string> {
    await new Promise<void>((done, fail) => {
      server.once("error", fail)
      server.listen(port, "127.0.0.1", done)
    })
    this.servers.push(server)
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  /** - throws for an account it hasn't got */
  private accountOrDie(did: string): FakeAccount {
    const account = this.accounts.get(did)
    if (!account) throw new FakeRefusal(400, "RepoNotFound", `Could not find repo: ${did}`)
    return account
  }

  ////////////////
  // ## The rest of the network
  ////////////////

  /** The directory, the relay and handles. */
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
        service: [
          {
            id: "#atproto_pds",
            type: "AtprotoPersonalDataServer",
            serviceEndpoint: this.hostUrls.get(account.host)
          }
        ]
      })
    }
    if (url.pathname.endsWith("com.atproto.sync.listReposByCollection")) {
      return send(response, 200, this.holdersOf(url.searchParams))
    }
    if (url.pathname.endsWith("com.atproto.identity.resolveHandle")) {
      const handle = url.searchParams.get("handle")
      const found = [...this.accounts].find(([, account]) => account.handle === handle)
      if (!found) return send(response, 400, { error: "InvalidRequest", message: "Unable to resolve handle" })
      return send(response, 200, { did: found[0] })
    }
    send(response, 404, { message: "not here" })
  }

  /** One page of who holds a collection, oldest holder first;  its cursor is a place in that list. */
  private holdersOf(searchParams: URLSearchParams) {
    const collection = searchParams.get("collection") ?? ""
    const most = Math.min(Number(searchParams.get("limit") ?? 500), MOST_HOLDERS_AT_ONCE)
    const start = Number(searchParams.get("cursor") ?? 0)
    const holding = (this.holders.get(collection) ?? []).filter((did) => this.recordsOf(did, collection).size)
    const repos = holding.slice(start, start + most).map((did) => ({ did }))
    return { repos, ...(start + most < holding.length && { cursor: `${start + most}` }) }
  }

  /** Someone listens to the stream, from where they say. */
  private listen(raw: IncomingMessage, socket: Duplex): void {
    if (!acceptWebSocket(raw, socket, { protocol: STREAM_PROTOCOL })) return
    const { searchParams } = new URL(raw.url ?? "/", "http://fake")
    const listener = {
      socket,
      collections: new Set(searchParams.getAll("collections")),
      dids: new Set(searchParams.getAll("dids"))
    }
    this.listeners.add(listener)
    socket.on("close", () => this.listeners.delete(listener))
    const cursor = searchParams.get("cursor")
    if (cursor === null) return
    // inclusive, as the real one is:  the last event comes again
    for (const event of this.events)
      if (event.seq >= Number(cursor) && heardBy(listener, event)) sendTo(listener, event)
  }

  /** Tell everyone listening. */
  private announce(did: string, rev: string, collection: string, rkey: string, record?: FakeRecord): void {
    const seq = this.events.length + 1
    const payload = {
      $type: "network.bsky.jetstream.subscribeEvents#commit",
      did,
      seq,
      time: new Date().toISOString(),
      operation: record ? "create" : "delete",
      collection,
      rkey,
      rev,
      ...(record && { cid: record.cid, record: record.value })
    }
    const event = { seq, collection, did, text: JSON.stringify({ $type: "message", payload }) }
    this.events.push(event)
    for (const listener of this.listeners) if (heardBy(listener, event)) sendTo(listener, event)
  }

  ////////////////
  // ## A host
  ////////////////

  /** What one host says. */
  private async answerHost(host: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (answerPreflight(request, response)) return
    if (this.hostsDown.has(host)) return send(response, 503, { error: "Unavailable", message: `${host} is down` })
    const url = new URL(request.url ?? "/", "http://fake")
    const method = url.pathname.replace("/xrpc/", "")
    const body = request.method === "POST" ? await jsonBody(request) : {}
    const params = { ...Object.fromEntries(url.searchParams), ...body }
    const auth = request.headers.authorization?.replace("Bearer ", "")
    this.asks.push({ host, method, params, ...(auth && { as: auth }) })
    try {
      send(response, 200, this.run(method, params, auth, host))
    } catch (error) {
      if (!(error instanceof FakeRefusal)) throw error
      send(response, error.status, { error: error.error, message: error.message })
    }
  }

  /** What `method` answers.  - throws `FakeRefusal` */
  private run(method: string, params: Record<string, unknown>, as: string | undefined, host: string): unknown {
    const repo = `${(params.repo ?? params.did) as string}`
    switch (method) {
      case "com.atproto.repo.describeRepo":
        return { collections: [...this.accountOrDie(repo).records.keys()] }
      case "com.atproto.repo.listRecords":
        return this.listRecords(repo, params)
      case "com.atproto.repo.getRecord":
        return this.getRecord(repo, params)
      case "com.atproto.sync.getLatestCommit":
        return { cid: this.accountOrDie(repo).commit, rev: `rev-${this.accountOrDie(repo).commits}` }
      case "com.atproto.server.createSession":
        return this.sessionFor(host, params)
      default:
    }
    const account = this.signedIn(repo, as)
    switch (method) {
      case "com.atproto.repo.putRecord":
        return this.putAsked(account, repo, params)
      case "com.atproto.repo.deleteRecord":
        return this.deleteAsked(account, repo, params)
      case "com.atproto.repo.applyWrites":
        return this.applyAsked(account, repo, params)
      default:
        throw new FakeRefusal(501, "MethodNotImplemented", method)
    }
  }

  /**
   * One page:  newest key first, as a real host answers;  `reverse=true`, oldest first.  Its cursor is the last key in it.
   * - throws `FakeRefusal` for a limit past the most it allows
   */
  private listRecords(repo: string, { collection, limit, cursor, reverse }: Record<string, unknown>) {
    const most = Number(limit ?? 50)
    if (most < 1 || most > MOST_IN_A_PAGE) throw new FakeRefusal(400, "InvalidRequest", "limit must be 1 to 100")
    const held = this.accountOrDie(repo).records.get(`${collection as string}`) ?? new Map<string, FakeRecord>()
    const isOldestFirst = reverse === "true"
    const after = (key: string) =>
      cursor === undefined || (isOldestFirst ? key > `${cursor as string}` : key < `${cursor as string}`)
    const sorted = [...held.keys()].sort()
    const keys = (isOldestFirst ? sorted : sorted.reverse()).filter(after)
    const records = keys.slice(0, most).map((key) => {
      const { cid, value } = held.get(key)!
      return { uri: `at://${repo}/${collection as string}/${key}`, cid, value }
    })
    return { records, ...(records.length && { cursor: keys[records.length - 1] }) }
  }

  /** One record.  - throws `FakeRefusal` `RecordNotFound`, a 400, as the real one does */
  private getRecord(repo: string, { collection, rkey }: Record<string, unknown>) {
    const held = this.accountOrDie(repo)
      .records.get(`${collection as string}`)
      ?.get(`${rkey as string}`)
    const uri = `at://${repo}/${collection as string}/${rkey as string}`
    if (!held) throw new FakeRefusal(400, "RecordNotFound", `Could not locate record: ${uri}`)
    return { uri, cid: held.cid, value: held.value }
  }

  /**
   * Signing in with an app password, as a program with no browser does:  its token is the DID, as `FakeSignIn`'s.
   * - throws `FakeRefusal` `AuthenticationRequired`, a 401, for a wrong password or an account on another host, as the real one does
   */
  private sessionFor(host: string, { identifier, password }: Record<string, unknown>) {
    const found = [...this.accounts].find(([did, account]) => did === identifier || account.handle === identifier)
    const [did, account] = found ?? []
    if (!did || !account || account.host !== host || !account.password || account.password !== password) {
      throw new FakeRefusal(401, "AuthenticationRequired", "Invalid identifier or password")
    }
    return { did, handle: account.handle, accessJwt: did, refreshJwt: `refresh-${did}`, active: true }
  }

  /** Who's asking has to be who it's for, and still signed in. */
  private signedIn(repo: string, as: string | undefined): FakeAccount {
    if (!as || this.sessionsOver.has(as)) throw new FakeRefusal(401, "ExpiredToken", "Token has expired")
    if (as !== repo) throw new FakeRefusal(403, "InvalidRequest", "Input/repo must be the current account")
    return this.accountOrDie(repo)
  }

  /** - throws `FakeRefusal` `InvalidSwap`, on a `swapRecord` that isn't what's there */
  private putAsked(account: FakeAccount, repo: string, params: Record<string, unknown>) {
    const { collection, rkey, record, swapRecord } = params as { collection: string; rkey: string } & Record<
      string,
      unknown
    >
    this.checkSwap(account, collection, rkey, swapRecord)
    const value = record as Record<string, unknown>
    const [cid] = this.write(account, repo, [{ collection, rkey, value }])
    return {
      uri: `at://${repo}/${collection}/${rkey}`,
      cid,
      commit: { cid: account.commit, rev: `rev-${account.commits}` }
    }
  }

  /** Taking away what isn't there is fine, as the real one has it.  - throws `FakeRefusal` `InvalidSwap` */
  private deleteAsked(account: FakeAccount, repo: string, params: Record<string, unknown>) {
    const { collection, rkey, swapRecord } = params as { collection: string; rkey: string } & Record<string, unknown>
    this.checkSwap(account, collection, rkey, swapRecord)
    if (account.records.get(collection)?.has(rkey)) this.write(account, repo, [{ collection, rkey }])
    return { commit: { cid: account.commit, rev: `rev-${account.commits}` } }
  }

  /** All or nothing.  - throws `FakeRefusal`:  `InvalidSwap` on a `swapCommit` that isn't where the account stands;  too many writes */
  private applyAsked(account: FakeAccount, repo: string, params: Record<string, unknown>) {
    const { writes, swapCommit } = params as { writes: AskedWrite[]; swapCommit?: string }
    if (writes.length > MOST_WRITES) throw new FakeRefusal(400, "InvalidRequest", "Too many writes. Max: 200")
    if (swapCommit !== undefined && swapCommit !== account.commit) {
      throw new FakeRefusal(400, "InvalidSwap", `Commit was at ${account.commit}`)
    }
    for (const { $type, collection, rkey } of writes) {
      const isThere = account.records.get(collection)?.has(rkey) ?? false
      if ($type.endsWith("#create") && isThere) throw new FakeRefusal(400, "InvalidRequest", "Record already exists")
      if (!$type.endsWith("#create") && !isThere) throw new FakeRefusal(400, "InvalidRequest", "Record does not exist")
    }
    const cids = this.write(
      account,
      repo,
      writes.map(({ collection, rkey, value }) => ({ collection, rkey, ...(value && { value }) }))
    )
    return {
      commit: { cid: account.commit, rev: `rev-${account.commits}` },
      results: writes.map(({ $type }, index) => ($type.endsWith("#delete") ? {} : { cid: cids[index] }))
    }
  }

  /** - throws `FakeRefusal` `InvalidSwap`, on a version that isn't what's there */
  private checkSwap(account: FakeAccount, collection: string, rkey: string, swap: unknown): void {
    if (swap === undefined) return
    const held = account.records.get(collection)?.get(rkey)?.cid
    if (held !== swap) throw new FakeRefusal(400, "InvalidSwap", `Record was at ${held ?? "nothing"}`)
  }

  /** Make these writes, as one commit:  a record with no \`value\` goes.  Answers each one's version.  - throws for a decimal number */
  private write(
    account: FakeAccount,
    did: string,
    writes: readonly { collection: string; rkey: string; value?: Record<string, unknown> }[]
  ): (string | undefined)[] {
    for (const { value } of writes)
      if (value && hasDecimal(value)) throw new FakeRefusal(400, "InvalidRequest", "Bad record:  floats aren't allowed")
    account.commits++
    const rev = `rev-${`${account.commits}`.padStart(10, "0")}`
    const cids = writes.map(({ collection, rkey, value }) => {
      let held = account.records.get(collection)
      if (!held) account.records.set(collection, (held = new Map()))
      const holders = this.holders.get(collection) ?? []
      if (!holders.includes(did)) this.holders.set(collection, [...holders, did])
      if (!value) {
        held.delete(rkey)
        this.announce(did, rev, collection, rkey)
        return undefined
      }
      const cid = createHash("sha256")
        .update(`${++this.versions}${JSON.stringify(value)}`)
        .digest("hex")
        .slice(0, 32)
      const record = { cid, value: JSON.parse(JSON.stringify(value)) as Record<string, unknown> }
      held.set(rkey, record)
      this.announce(did, rev, collection, rkey, record)
      return cid
    })
    account.commit = `commit-${account.commits}`
    return cids
  }
}

/** One of `applyWrites`'s. */
type AskedWrite = {
  /** Which kind. */
  $type: string
  /** The collection. */
  collection: string
  /** The key. */
  rkey: string
  /** The record:  none for a delete. */
  value?: Record<string, unknown>
}

/** Is `event` what `listener` asked to hear? */
function heardBy({ collections, dids }: Listener, { collection, did }: StreamEvent): boolean {
  return (!collections.size || collections.has(collection)) && (!dids.size || dids.has(did))
}

/** Send `event` to `listener`. */
function sendTo({ socket }: Listener, { text }: StreamEvent): void {
  socket.write(textFrame(text))
}

/** Does `value` hold a decimal number, anywhere? */
function hasDecimal(value: unknown): boolean {
  if (typeof value === "number") return !Number.isInteger(value)
  return !!value && typeof value === "object" && Object.values(value).some(hasDecimal)
}

/** The JSON a request was sent. */
async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString() || "{}") as Record<string, unknown>
}

/** Answer `value`, from anywhere. */
function send(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" })
  response.end(JSON.stringify(value))
}

/** A browser asking first:  answers whether it was. */
function answerPreflight(request: IncomingMessage, response: ServerResponse): boolean {
  if (request.method !== "OPTIONS") return false
  response.writeHead(204, {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,dpop,content-type",
    "access-control-allow-methods": "GET,POST"
  })
  response.end()
  return true
}
