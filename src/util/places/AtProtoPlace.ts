import { LoadOnce } from "spell/util/LoadOnce"
import { ReconnectingSocket } from "spell/util/ReconnectingSocket"

import { AtProtoSignIn, type AtProtoAccess } from "./AtProtoSignIn"
import {
  PlaceError,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type PersonHere,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceErrorKind,
  type PlaceEvent,
  type PlacePerson,
  type PlaceRow,
  type SelectingContext,
  type WatchTarget,
  type WriteAnswer,
  type WriteQuestion
} from "./places.types"

/** The field a row's id is in. */
const ID_FIELD = "id"

/** The field a row says who wrote it in:  from which account it came, so it can't be claimed.  Never kept in the record. */
export const OWNER_FIELD = "owner"

/** Where a record says what kind it is. */
const TYPE_FIELD = "$type"

/** The most a host answers with at once. */
const MOST_IN_A_PAGE = 100

/** The most accounts one read looks through:  each costs at least one request, and anyone can add themselves. */
export const MOST_ACCOUNTS = 100

/** The most changes one `applyWrites` holds:  the host's own limit, `Too many writes`. */
const MOST_WRITES = 200

/** The corner of each account a program's records go in, when its line names none. */
export const DEFAULT_CORNER = "app.spell.data"

/** What a host allows one account:  5,000 points an hour at 3 for a new record, so about this many. */
const NEW_RECORDS_AN_HOUR = 1666

/** What a record key can hold. */
const RECORD_KEY = /^[A-Za-z0-9._:~-]{1,512}$/

/** A live change, as the stream sends it. */
const COMMIT_EVENT = /#commit$/

/** What the stream speaks. */
const STREAM_PROTOCOLS = ["xrpc.v1.json"]

/** How the stream is reached, from the top of its server. */
const STREAM_PATH = "/xrpc/network.bsky.jetstream.subscribeEvents"

/** The answers that mean "ask again later", though a server sent them:  so they count as no answer, and it resends. */
const TRY_AGAIN_STATUSES = new Set([408, 425, 429])

/** The errors that mean the session's over. */
const SESSION_OVER = new Set(["ExpiredToken", "InvalidToken", "AuthMissing", "invalid_token"])

/** The errors that mean the thing isn't there. */
const NOT_THERE = new Set(["RecordNotFound", "RepoNotFound", "RepoDeactivated", "RepoTakendown", "RepoSuspended"])

/** What every atmosphere account reaches, by default:  the real network. */
const REAL_NETWORK: AtProtoNetwork = {
  directory: "https://plc.directory",
  relay: "https://relay1.us-east.bsky.network",
  stream: "wss://jetstream.us-east.bsky.network",
  handles: "https://public.api.bsky.app"
}

/** What's reached for each part of the network. */
export type AtProtoNetwork = {
  /** Where a `did:plc` account's document is. */
  directory: string
  /** What knows which accounts hold a collection:  a relay. */
  relay: string
  /** The public change stream:  Jetstream.  `""`:  none, so a program asks again instead. */
  stream: string
  /** What says whose a handle is. */
  handles: string
}

/** What a page may set, so a program reaches a network of its own:  a test's, or a local one. */
export type AtProtoPageSettings = Partial<AtProtoNetwork> & {
  /** Who's signed in, in place of the real sign-in. */
  signIn?: AtProtoAccess
}

/** What a page has set. */
function pageSettings(): AtProtoPageSettings {
  return (globalThis as { SPELL_ATMOSPHERE?: AtProtoPageSettings }).SPELL_ATMOSPHERE ?? {}
}

/** The one real sign-in of this page:  every place on it shares one person. */
let pageSignIn: AtProtoSignIn | undefined

/** What one kept record holds. */
type KnownRecord = {
  /** The account it's in. */
  did: string
  /** Its key there. */
  rkey: string
  /** Its version there. */
  cid: string
  /** The record itself, as it's kept. */
  value: Record<string, unknown>
  /** Where in the account's history it was changed, when the stream said:  so an older event can't undo it. */
  rev?: string
}

/** One answer of `listRecords`. */
type RecordsAnswer = {
  /** Where to carry on from. */
  cursor?: string
  /** Its records. */
  records: { uri: string; cid: string; value: Record<string, unknown> }[]
}

/** What the stream sends about one record. */
type CommitEvent = {
  /** What kind of event. */
  $type: string
  /** The account. */
  did: string
  /** Where the stream stands:  what to carry on from. */
  seq?: number
  /** Where the account's history stands. */
  rev?: string
  /** What happened. */
  operation: "create" | "update" | "delete"
  /** The collection, its full name. */
  collection: string
  /** The record's key. */
  rkey: string
  /** Its new version:  none for a delete. */
  cid?: string
  /** The record:  none for a delete. */
  record?: Record<string, unknown>
}

/****************
 * ### `AtProtoPlace`
 * An atmosphere account as a place, on AT Protocol (epic `data` P16):  no referee, your own records, and everyone's put together.
 *
 * ```ts
 * new AtProtoPlace({ kind: "atmosphere account", accounts: ["did:plc:abc123"], collections: { recipes: "com.example.recipe" } })
 * new AtProtoPlace({ kind: "personal atmosphere account", corner: "com.example.cookbook" })
 * ```
 *
 * - WHO: one account (`"atmosphere account"`), or each person's own (`"personal atmosphere account"`):
 *   - the person signed in, first
 *   - then the accounts named, or with none named, whoever a relay says holds that collection, up to `MOST_ACCOUNTS`:
 *     so anyone can add themselves, which is why a program may name them
 *   - One place across many hosts:  each account's document says which is its.
 * - READING:  a host hands out pages of 100 by key order, and nothing else, so filtering and sorting are the engine's (`PlaceQuery`), up to its ceiling.
 *   - A person's host that's down leaves their records out, and says so (`ListAnswer.notes`), rather than blanking the page.
 *     With one account named, that's the whole read:  it throws.
 * - A ROW is its record's fields, its `id`, and `owner`, the account it came from, which can't be claimed:
 *   a record saying `cook: "Ana"` is only what it says;  `owner` is who wrote it.
 *   - A record's key IS its id, chosen by the browser, the same ids as everywhere else.
 *   - Two accounts may use one key:  the first read keeps it, the person signed in always first, and the other is `<did>/<key>`.
 * - WRITING:  only your own (`whoWrites`), and a change to someone else's is refused, `"owner"`.
 *   - Nobody signed in:  an ordinary failure, so a new change stays pending, and goes once someone is.
 *   - A record is written whole:  what's kept, with the changed fields on top.
 *   - One thing changing:  `putRecord` or `deleteRecord`, checked with `swapRecord`, so your own devices don't overwrite each other.
 *   - Several, all or nothing:  `applyWrites`, which can only check the whole account (`swapCommit`):  so it checks each record first, by
 *     asking, then that nothing's changed since.  That's two requests more, and one for each thing.
 *   - A record holds no decimal numbers:  the protocol doesn't have them.  A change with one is refused, saying so.
 * - LIVE:  the public change stream, Jetstream, which a browser can reach:  plain JSON over a websocket, asked for only these collections.
 *   - One socket, however many watch.  It picks up where it stopped, from its cursor, and an event may come twice.
 *   - It isn't signed, so it's as true as whoever runs it:  a read asks each person's own host.
 *   - A change this page made comes back as `isMine`, known by its version.
 * - WHO'S HERE:  everyone it's seen records from, and you:  NOT who's looking, which nothing here can know.
 *   Their names are their handles, once a handle's own domain says it's theirs;  else their DID.
 * - Knows nothing of Things.  Imports only the sign-in's file, which loads its library when someone signs in.
 ****************/
export class AtProtoPlace implements Place {
  /** Who's signed in. */
  readonly signIn: AtProtoAccess

  /** One account, or each person's own. */
  private readonly kind: AtProtoKind
  /** The accounts named. */
  private readonly accounts: readonly string[]
  /** With no accounts named, does it ask who holds a collection? */
  private readonly findsAccounts: boolean
  /** The part of each account its records go in. */
  private readonly corner: string
  /** A collection's full name, where its lines say. */
  private readonly collections: Readonly<Record<string, string>>
  /** Who's at this page, with nobody signed in. */
  private readonly guest: PlacePerson
  /** What it reaches. */
  private readonly network: AtProtoNetwork

  /** Each account's document, once it's asked for:  failures try again. */
  private readonly documents = new LoadOnce<string, AccountDocument>({ failures: "forgotten" })
  /** Every record it's seen, by collection and id. */
  private readonly known = new Map<string, KnownRecord>()
  /** Each collection, by its full name:  what the stream calls it. */
  private readonly localNames = new Map<string, string>()
  /** The accounts each collection's last read went through, by its full name:  a page's next account comes from this. */
  private readonly walks = new Map<string, readonly string[]>()
  /** The versions this page wrote:  what comes back on the stream is only that. */
  private readonly mine = new Set<string>()
  /** The records this page removed:  the same. */
  private readonly removedHere = new Set<string>()
  /** The records being written now:  the stream can say so before the answer does. */
  private readonly writing = new Set<string>()

  /** Everyone it's seen, by account. */
  private readonly people = new Map<string, PersonHere>()
  /** Someone's listening for who's here:  a name costs requests, so not before that. */
  private wantsNames = false
  /** Who wants to know who's here. */
  private readonly peopleListeners = new Set<(people: readonly PersonHere[]) => void>()
  /** Who wants to know it's worth sending again. */
  private readonly backListeners = new Set<() => void>()

  /** Who's watching. */
  private readonly watchers = new Set<{ target: WatchTarget; onEvent: (event: PlaceEvent) => void }>()
  /** The stream, once something's watching. */
  private socket: ReconnectingSocket | undefined
  /** The collections it's asked for:  a new one means a new socket. */
  private streaming: string | undefined
  /** Where the stream stands:  what it carries on from. */
  private streamAt: number | undefined
  /** It has opened before:  the next opening is coming back. */
  private hasOpened = false

  constructor({
    kind,
    accounts = [],
    findsAccounts = true,
    corner = DEFAULT_CORNER,
    collections = {},
    person,
    signIn,
    network
  }: AtProtoPlaceProps) {
    this.findsAccounts = findsAccounts
    const { signIn: signedIn, ...settings } = pageSettings()
    this.kind = kind
    this.accounts = accounts
    this.corner = corner
    this.collections = collections
    this.guest = person ?? { id: "guest", name: "Guest" }
    this.network = { ...REAL_NETWORK, ...settings, ...network }
    this.signIn = signIn ?? signedIn ?? (pageSignIn ??= new AtProtoSignIn())
    this.signIn.onChange(() => this.signInChanged())
    void this.signIn.ready.then(() => this.signInChanged())
  }

  /** What it can do:  see the class. */
  describe(): PlaceCapabilities {
    return {
      kind: this.kind,
      idOf: ID_FIELD,
      filter: "none",
      sort: "none",
      select: "none",
      page: "cursor",
      write: ["insert", "update", "delete"],
      whoWrites: "only the owner",
      atomic: true,
      versionCheck: true,
      live: this.network.stream ? "push" : "none",
      rateLimit: { requests: NEW_RECORDS_AN_HOUR, perSeconds: 3600, changesPerRequest: MOST_WRITES },
      abort: "hard"
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * One page of `collection`, going from one account to the next.
   * - `page.at`:  `<account>|<where in it>`, for a reader to hand back.
   * - No size:  what one request brings.
   * - throws `PlaceError` `"not found"`, and anything else for no answer, only when it's the one account named;  see the class
   */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    await this.signIn.ready
    const nsid = this.fullName(collection)
    const { size, at } = query.page ?? {}
    const [startAt, startCursor] = at === undefined ? [undefined, undefined] : splitPage(at)
    const accounts = at !== undefined && this.walks.has(nsid) ? this.walks.get(nsid)! : await this.accountsFor(nsid)
    this.walks.set(nsid, accounts)

    const rows: PlaceRow[] = []
    const notes: string[] = accounts.length >= MOST_ACCOUNTS ? [tooManyAccounts(collection)] : []
    let index = startAt === undefined ? 0 : Math.max(accounts.indexOf(startAt), 0)
    let cursor = startCursor
    while (index < accounts.length) {
      const did = accounts[index]!
      const limit = Math.min(MOST_IN_A_PAGE, size === undefined ? MOST_IN_A_PAGE : size - rows.length)
      const answer = await this.recordsOf(did, nsid, limit, cursor, context, notes)
      for (const record of answer.records) rows.push(this.rowFor(collection, did, record))
      cursor = answer.cursor
      if (!cursor) index++
      if (size === undefined || rows.length >= size) break
    }
    const nextPage = index < accounts.length ? `${accounts[index]}|${cursor ?? ""}` : undefined
    this.notePeople(accounts)
    return { rows, handled: {}, ...(nextPage && { nextPage }), ...(notes.length && { notes }) }
  }

  /** The rows with these ids:  each asked of its owner's host.  An id nobody holds is left out. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    await this.signIn.ready
    const found = await Promise.all(ids.map((id) => this.freshRow(collection, id, context)))
    return found.filter((row): row is PlaceRow => row !== undefined)
  }

  /** The version of this thing as this page last saw it:  what a change made now is checked against. */
  versionOf(collection: string, id: string): string | undefined {
    return this.known.get(thingKey(collection, id))?.cid
  }

  /** One page of `did`'s records.  A person's host that's down is a note, unless they're the only account there is. */
  private async recordsOf(
    did: string,
    nsid: string,
    limit: number,
    cursor: string | undefined,
    context: PlaceContext,
    notes: string[]
  ): Promise<RecordsAnswer> {
    try {
      const host = await this.hostOf(did)
      const search = new URLSearchParams({ repo: did, collection: nsid, limit: `${limit}` })
      if (cursor) search.set("cursor", cursor)
      const url = `${host}/xrpc/com.atproto.repo.listRecords?${search}`
      return await this.answerOf<RecordsAnswer>(() => fetch(url, requestOptions(context)))
    } catch (error) {
      if (context.signal?.aborted || this.kind === "atmosphere account") throw error
      notes.push(`Couldn't read ${did}'s records just now, so they're left out:  ${(error as Error).message}`)
      return { records: [] }
    }
  }

  /** The row as its owner's host holds it now.  `undefined`:  it doesn't. */
  private async freshRow(collection: string, id: string, context: PlaceContext): Promise<PlaceRow | undefined> {
    const where = this.whereIs(collection, id)
    if (!where) return undefined
    const { did, rkey } = where
    const nsid = this.fullName(collection)
    const host = await this.hostOf(did)
    const search = new URLSearchParams({ repo: did, collection: nsid, rkey })
    const url = `${host}/xrpc/com.atproto.repo.getRecord?${search}`
    try {
      const record = await this.answerOf<RecordsAnswer["records"][number]>(() => fetch(url, requestOptions(context)))
      return this.rowFor(collection, did, record)
    } catch (error) {
      if (error instanceof PlaceError && error.kind === "not found") return undefined
      throw error
    }
  }

  /**
   * Which accounts a read goes through, the person signed in first.
   * - One account:  that one.
   * - Each person's own:  those named;  with none, whoever a relay says holds the collection, with those heard of since.
   * - A relay that doesn't answer leaves those it knows of:  it's only how strangers are found.
   */
  private async accountsFor(nsid: string): Promise<readonly string[]> {
    if (this.kind === "atmosphere account") return this.accounts
    const others = this.accounts.length || !this.findsAccounts ? this.accounts : await this.accountsHolding(nsid)
    return [...new Set([...(this.signIn.did ? [this.signIn.did] : []), ...others])].slice(0, MOST_ACCOUNTS)
  }

  /** Whoever a relay says holds `nsid`, and whoever's been heard of.  NEVER throws. */
  private async accountsHolding(nsid: string): Promise<string[]> {
    const search = new URLSearchParams({ collection: nsid, limit: `${MOST_ACCOUNTS}` })
    const url = `${this.network.relay}/xrpc/com.atproto.sync.listReposByCollection?${search}`
    let found: string[] = []
    try {
      const { repos } = await this.answerOf<{ repos: { did: string }[] }>(() => fetch(url))
      found = repos.map(({ did }) => did)
    } catch (ignored) {
      console.error(`AtProtoPlace:  the relay didn't say who holds ${nsid};  only those already known`, ignored)
    }
    return [...new Set([...found, ...this.people.keys()])]
  }

  ////////////////
  // ## Rows and records
  ////////////////

  /** `record`, of `did`, as a row, and noted. */
  private rowFor(collection: string, did: string, { uri, cid, value }: RecordsAnswer["records"][number]): PlaceRow {
    const rkey = uri.slice(uri.lastIndexOf("/") + 1)
    const id = this.idFor(collection, did, rkey)
    this.noteRecord(collection, id, { did, rkey, cid, value })
    return toRow(id, did, value)
  }

  /** What a thing's called here:  its key, unless someone else's goes by that:  see the class. */
  private idFor(collection: string, did: string, rkey: string): string {
    const holder = this.known.get(thingKey(collection, rkey))
    return !holder || holder.did === did ? rkey : `${did}/${rkey}`
  }

  /** Keep what's known of a record. */
  private noteRecord(collection: string, id: string, record: KnownRecord): void {
    this.known.set(thingKey(collection, id), record)
    this.notePeople([record.did])
  }

  /** Whose it is, and its key:  a thing not known is the person signed in's.  `undefined`:  nobody's signed in, and it's not known. */
  private whereIs(collection: string, id: string): { did: string; rkey: string } | undefined {
    const known = this.known.get(thingKey(collection, id))
    if (known) return known
    const slash = id.indexOf("/")
    if (slash >= 0) return { did: id.slice(0, slash), rkey: id.slice(slash + 1) }
    const did = this.kind === "atmosphere account" ? this.accounts[0] : this.signIn.did
    return did ? { did, rkey: id } : undefined
  }

  /** A collection's full name:  what its lines say, or its name under the corner. */
  private fullName(collection: string): string {
    const said = this.collections[collection]
    const nsid = said?.includes(".") ? said : `${this.corner}.${nsidNameOf(said ?? collection)}`
    this.localNames.set(nsid, collection)
    return nsid
  }

  ////////////////
  // ## Writing
  ////////////////

  /** Would it take this write?  Only from the person signed in, on what's theirs. */
  canWrite({ collection, row, identity = this.signIn.did }: WriteQuestion): WriteAnswer {
    const id = row?.[ID_FIELD]
    const owner = id === undefined ? undefined : this.known.get(thingKey(collection, `${id as string}`))?.did
    if (!identity) return { canWrite: false, whyNot: "owner" }
    if (owner !== undefined && owner !== identity) return { canWrite: false, whyNot: "owner" }
    if (this.kind === "atmosphere account" && this.accounts[0] !== identity) {
      return { canWrite: false, whyNot: "owner" }
    }
    return { canWrite: true }
  }

  /**
   * Make these changes, the person signed in's:  each thing's changes in one go.
   * - throws `PlaceError`:
   *   - `"refused"`, `"owner"`:  it's someone else's
   *   - `"refused"`, `"field"`:  it holds something a record can't
   *   - `"out of date"`:  it's moved on since this page saw it
   * - throws an ordinary `Error` with nobody signed in, or a session that's ended, so it stays pending;  and for no answer
   */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    await this.signIn.ready
    if (!changes.length) return { rows: [] }
    const { did } = this.signIn
    if (!did) throw new Error("AtProtoPlace.apply():  nobody's signed in, so this waits until someone is")
    await this.knowWhatsUpdated(changes, context)
    const writes = this.writesFor(changes)
    const uris = writes.map(({ nsid, rkey }) => recordUri(did, nsid, rkey))
    uris.forEach((uri) => this.writing.add(uri))
    try {
      return await (writes.length === 1 ? this.writeOne(did, writes[0]!, context) : this.writeAll(did, writes, context))
    } finally {
      uris.forEach((uri) => this.writing.delete(uri))
    }
  }

  /** `changes`, as one write per thing, in the order they were made.  - throws `PlaceError` as `apply()` says */
  private writesFor(changes: readonly PlaceChange[]): AccountWrite[] {
    const writes = new Map<string, AccountWrite>()
    for (const change of changes) {
      const { collection, id, kind } = change
      if (id === undefined) throw new TypeError("AtProtoPlace.apply():  a change has no id;  this place makes none")
      const key = thingKey(collection, id)
      const known = this.known.get(key)
      this.refuseIfNotTheirs(collection, id, known)
      const write = writes.get(key) ?? {
        collection,
        id,
        nsid: this.fullName(collection),
        rkey: known?.rkey ?? checkedRecordKey(id),
        isRemoved: false,
        value: {},
        ...(known && { value: known.value })
      }
      if (kind === "delete") write.isRemoved = true
      else write.value = { ...write.value, ...checkedFields(change) }
      // the first:  each change after it in a batch follows on from what the batch just wrote
      write.version ??= change.version
      writes.set(key, write)
    }
    return [...writes.values()]
  }

  /**
   * - throws `PlaceError` `"refused"`, `"owner"`, for what's someone else's
   * - Nobody signed in:  no telling, as it may be theirs when they are, so it waits.
   */
  private refuseIfNotTheirs(collection: string, id: string, known: KnownRecord | undefined): void {
    const { did } = this.signIn
    const slash = id.indexOf("/")
    const named = this.kind === "atmosphere account" ? this.accounts[0] : undefined
    const owner = known?.did ?? (slash >= 0 ? id.slice(0, slash) : named)
    if (!did || owner === undefined || owner === did) return
    throw new PlaceError(`"${collection}" ${id} is ${owner}'s, and only they can change it`, {
      cause: { kind: "refused", whyNot: "owner" }
    })
  }

  /**
   * Know each thing `changes` updates:  a record is written whole, so what isn't known has to be read first.
   * - A change kept on this device through a reload gets here before any read.
   * - throws `PlaceError` `"not found"` for one that's gone;  anything else for no answer
   */
  private async knowWhatsUpdated(changes: readonly PlaceChange[], context: PlaceContext): Promise<void> {
    for (const { kind, collection, id } of changes) {
      if (kind !== "update" || id === undefined || this.known.has(thingKey(collection, id))) continue
      if (await this.freshRow(collection, id, context)) continue
      throw new PlaceError(`"${collection}" ${id} isn't there any more`, { cause: { kind: "not found" } })
    }
  }

  /** One thing's write, checked against its version. */
  private async writeOne(did: string, write: AccountWrite, context: PlaceContext): Promise<ApplyAnswer> {
    const { nsid, rkey, version, isRemoved } = write
    const swap = version === undefined ? {} : { swapRecord: version }
    const body = { repo: did, collection: nsid, rkey, ...swap }
    if (isRemoved) {
      await this.signedInAnswer("com.atproto.repo.deleteRecord", body, context)
      this.wroteAway(write)
      return { rows: [] }
    }
    const record = recordOf(write)
    const answer = await this.signedInAnswer<{ cid: string }>(
      "com.atproto.repo.putRecord",
      { ...body, record },
      context
    )
    return { rows: [this.wrote(did, write, record, answer.cid)], version: answer.cid }
  }

  /**
   * Several things' writes, all or nothing:  `applyWrites`.
   * - It can't check one record against its version, only the whole account:  so it notes where the account stands, checks each record,
   *   and then asks that the account hasn't moved since.
   * - So a change to anything else in the account in that moment is out of date too, and the merge sends it again.
   * - A new record already there, from an answer that was lost, is written over:  a removal already gone is dropped.
   */
  private async writeAll(did: string, writes: AccountWrite[], context: PlaceContext): Promise<ApplyAnswer> {
    const host = await this.hostOf(did)
    const commitUrl = `${host}/xrpc/com.atproto.sync.getLatestCommit?${new URLSearchParams({ did })}`
    const { cid: swapCommit } = await this.answerOf<{ cid: string }>(() => fetch(commitUrl, requestOptions(context)))
    const asked: Record<string, unknown>[] = []
    for (const write of writes) {
      const held = await this.heldVersion(host, did, write, context)
      if (write.version !== undefined && held !== write.version) {
        throw new PlaceError(`"${write.collection}" ${write.id} has moved on since this page saw it`, {
          cause: { kind: "out of date" }
        })
      }
      if (write.isRemoved && held === undefined) continue
      asked.push(atomicWrite(write, held !== undefined))
    }
    const { results = [], commit } = await this.signedInAnswer<{
      results?: { cid?: string }[]
      commit?: { cid: string }
    }>("com.atproto.repo.applyWrites", { repo: did, writes: asked, swapCommit }, context)
    let next = 0
    const rows: PlaceRow[] = []
    for (const write of writes) {
      if (write.isRemoved) {
        this.wroteAway(write)
        if (asked.some((one) => one.rkey === write.rkey && one.collection === write.nsid)) next++
        continue
      }
      rows.push(this.wrote(did, write, recordOf(write), results[next++]?.cid ?? ""))
    }
    return { rows, ...(commit && { version: commit.cid }) }
  }

  /** The version `write`'s record is at now.  `undefined`:  it isn't there. */
  private async heldVersion(
    host: string,
    did: string,
    { nsid, rkey }: AccountWrite,
    context: PlaceContext
  ): Promise<string | undefined> {
    const search = new URLSearchParams({ repo: did, collection: nsid, rkey })
    const url = `${host}/xrpc/com.atproto.repo.getRecord?${search}`
    try {
      const { cid } = await this.answerOf<{ cid: string }>(() => fetch(url, requestOptions(context)))
      return cid
    } catch (error) {
      if (error instanceof PlaceError && error.kind === "not found") return undefined
      throw error
    }
  }

  /** `write`'s record is kept, at version `cid`:  its row. */
  private wrote(did: string, { collection, id, rkey }: AccountWrite, record: Record<string, unknown>, cid: string) {
    this.mine.add(cid)
    this.noteRecord(collection, id, { did, rkey, cid, value: record })
    return toRow(id, did, record)
  }

  /** `write`'s record is gone. */
  private wroteAway({ collection, id, nsid, rkey }: AccountWrite): void {
    const known = this.known.get(thingKey(collection, id))
    if (known) this.removedHere.add(recordUri(known.did, nsid, rkey))
    this.known.delete(thingKey(collection, id))
  }

  /** Send `method` as the person signed in. */
  private signedInAnswer<Answer>(method: string, body: unknown, context: PlaceContext): Promise<Answer> {
    return this.answerOf<Answer>(
      () =>
        this.signIn.fetch(`/xrpc/${method}`, {
          ...requestOptions(context),
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }),
      { isSignedIn: true }
    )
  }

  /**
   * What `send()` answers, as JSON.
   * - throws `PlaceError` for an answer that means something:
   *   `InvalidSwap`, `"out of date"`;  what isn't there, `"not found"`;  any other 4xx, `"refused"`
   * - throws an ordinary `Error` for no answer yet (5xx, 408, 425, 429), or a session that's ended, so a change resends;  or whatever `fetch` threw
   * - `isSignedIn`:  sent as the person signed in, so a 401 means that's over.
   */
  private async answerOf<Answer>(
    send: () => Promise<Response>,
    { isSignedIn = false }: { isSignedIn?: boolean } = {}
  ): Promise<Answer> {
    const response = await send()
    const text = await response.text()
    if (response.ok) return (text.trim() ? JSON.parse(text) : {}) as Answer
    const { error = "", message = `${response.status}` } = parsedError(text)
    if (response.status >= 500 || TRY_AGAIN_STATUSES.has(response.status)) throw new Error(`${error} ${message}`.trim())
    if (isSignedIn && (response.status === 401 || SESSION_OVER.has(error))) {
      this.signIn.sessionEnded()
      throw new Error(`AtProtoPlace:  the sign-in has ended:  ${message}`)
    }
    const kind: PlaceErrorKind =
      error === "InvalidSwap"
        ? "out of date"
        : NOT_THERE.has(error) || response.status === 404
          ? "not found"
          : "refused"
    throw new PlaceError(message, { cause: { kind, ...(kind === "refused" && { whyNot: "place" as const }) } })
  }

  ////////////////
  // ## Where each account is
  ////////////////

  /** The host holding `did`'s records.  - throws `PlaceError` `"not found"` for an account with none, and anything else for no answer */
  private async hostOf(did: string): Promise<string> {
    const { service = [] } = await this.documentOf(did)
    const host = service.find(({ id, type }) => id.endsWith("#atproto_pds") && type === "AtprotoPersonalDataServer")
    if (host) return host.serviceEndpoint.replace(/\/+$/, "")
    throw new PlaceError(`${did} has no host:  its document names none`, { cause: { kind: "not found" } })
  }

  /** `did`'s document.  - throws as `hostOf()` says, and `TypeError` for an account of a kind it can't read */
  private documentOf(did: string): Promise<AccountDocument> {
    return this.documents.get(did, async () => {
      const document = await this.answerOf<AccountDocument>(() => fetch(this.documentUrlOf(did)))
      if (document.id !== did)
        throw new TypeError(`AtProtoPlace:  the document asked for as ${did} says ${document.id}`)
      return document
    })
  }

  /** Where `did`'s document is.  - throws `TypeError` for an account of a kind it can't read */
  private documentUrlOf(did: string): string {
    if (did.startsWith("did:plc:")) return `${this.network.directory}/${did}`
    if (!did.startsWith("did:web:")) throw new TypeError(`AtProtoPlace:  "${did}" isn't a did:plc or a did:web`)
    const host = decodeURIComponent(did.slice("did:web:".length))
    return `${host.startsWith("localhost") ? "http" : "https"}://${host}/.well-known/did.json`
  }

  ////////////////
  // ## Who's here
  ////////////////

  /** Who's at this page:  the person signed in, as their account, else who they say they are. */
  currentPerson(): PersonHere {
    const { did } = this.signIn
    if (did) return this.people.get(did) ?? { id: did, name: did, page: did }
    return { ...this.guest, page: this.guest.id }
  }

  /** Everyone it's seen records from, and you, first:  NOT who's looking, which nothing here can know. */
  peopleHere(): readonly PersonHere[] {
    const me = this.currentPerson()
    return [me, ...[...this.people.values()].filter(({ id }) => id !== me.id)]
  }

  /** Hear who's here changing, and who's signed in.  Returns what stops it. */
  onPeopleHere(listener: (people: readonly PersonHere[]) => void): () => void {
    this.peopleListeners.add(listener)
    if (!this.wantsNames) {
      this.wantsNames = true
      for (const did of this.people.keys()) void this.nameOf(did)
    }
    return () => this.peopleListeners.delete(listener)
  }

  /** Hear each time it's worth sending what's waiting.  Returns what stops it. */
  onBack(listener: () => void): () => void {
    this.backListeners.add(listener)
    return () => this.backListeners.delete(listener)
  }

  /** Who's signed in changed, or is known at last. */
  private signInChanged(): void {
    const { did } = this.signIn
    if (did) {
      this.notePeople([did])
      this.backListeners.forEach((listener) => listener())
    }
    this.tellPeople()
  }

  /** These accounts have records here:  each looked up, once. */
  private notePeople(accounts: readonly string[]): void {
    let isNew = false
    for (const did of accounts) {
      if (this.people.has(did)) continue
      isNew = true
      this.people.set(did, { id: did, name: did, page: did })
      if (this.wantsNames || did === this.signIn.did) void this.nameOf(did)
    }
    if (isNew) this.tellPeople()
  }

  /** Find what `did` goes by.  NEVER rejects:  with no answer it goes by its DID. */
  private async nameOf(did: string): Promise<void> {
    try {
      const { alsoKnownAs = [] } = await this.documentOf(did)
      const handle = alsoKnownAs.find((name) => name.startsWith("at://"))?.slice("at://".length)
      if (!handle) return
      // anyone's document can claim any handle:  it counts once the handle says the same
      const url = `${this.network.handles}/xrpc/com.atproto.identity.resolveHandle?${new URLSearchParams({ handle })}`
      const answer = await this.answerOf<{ did: string }>(() => fetch(url))
      if (answer.did !== did) return
      this.people.set(did, { id: did, name: handle, page: did })
      this.tellPeople()
    } catch (ignored) {
      // it goes by its DID:  only a name
    }
  }

  /** Say who's here. */
  private tellPeople(): void {
    const here = this.peopleHere()
    this.peopleListeners.forEach((listener) => listener(here))
  }

  ////////////////
  // ## Watching
  ////////////////

  /** Tell `onEvent` of each change to `target`:  anyone's, the stream's.  With no stream, nothing.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    const watcher = { target, onEvent }
    this.watchers.add(watcher)
    this.followStream()
    return () => {
      this.watchers.delete(watcher)
      this.followStream()
    }
  }

  /** The socket follows what's watched:  none for nothing, and a new one for a new collection. */
  private followStream(): void {
    const { stream } = this.network
    const nsids = [...new Set([...this.watchers].map(({ target }) => this.fullName(target.collection)))].sort()
    const wanted = stream && nsids.length ? nsids.join() : undefined
    if (wanted === this.streaming) return
    this.streaming = wanted
    this.socket?.close()
    this.socket = undefined
    if (!wanted) return
    this.socket = new ReconnectingSocket(() => this.streamAddress(nsids), {
      protocols: STREAM_PROTOCOLS,
      onOpen: () => this.streamOpened(),
      onMessage: (text) => this.heard(text)
    })
  }

  /** The stream's address, for these collections, and the accounts named;  from where it stopped. */
  private streamAddress(nsids: readonly string[]): string {
    const search = new URLSearchParams({ kinds: "commit" })
    for (const nsid of nsids) search.append("collections", nsid)
    for (const did of this.streamAccounts()) search.append("dids", did)
    if (this.streamAt !== undefined) search.set("cursor", `${this.streamAt}`)
    return `${this.network.stream}${STREAM_PATH}?${search}`
  }

  /** The accounts it asks the stream about:  none to hear from anyone. */
  private streamAccounts(): readonly string[] {
    const isOpen = this.kind === "personal atmosphere account" && !this.accounts.length && this.findsAccounts
    if (isOpen) return []
    const did = this.kind === "personal atmosphere account" ? this.signIn.did : undefined
    return [...new Set([...this.accounts, ...(did ? [did] : [])])]
  }

  /** The stream's open.  Coming back:  it may be worth sending what's waiting. */
  private streamOpened(): void {
    if (this.hasOpened) this.backListeners.forEach((listener) => listener())
    this.hasOpened = true
  }

  /** The stream said something.  What can't be read is logged:  a read still asks each host. */
  private heard(text: string): void {
    let event: CommitEvent
    try {
      event = (JSON.parse(text) as { payload: CommitEvent }).payload
    } catch (error) {
      return console.error("AtProtoPlace:  a message from the stream that isn't JSON", error)
    }
    if (!event || !COMMIT_EVENT.test(event.$type)) return
    if (event.seq !== undefined) this.streamAt = event.seq
    const collection = this.localNames.get(event.collection)
    if (collection !== undefined) this.heardChange(collection, event)
  }

  /** A record changed. */
  private heardChange(
    collection: string,
    { did, rkey, cid, rev, record, operation, collection: nsid }: CommitEvent
  ): void {
    const id = this.idFor(collection, did, rkey)
    const key = thingKey(collection, id)
    const known = this.known.get(key)
    const uri = recordUri(did, nsid, rkey)
    const isBeingWritten = this.writing.has(uri)
    // the same one again, or an older one, on picking up where it stopped
    if (known && rev && known.rev && rev <= known.rev) return
    if (operation === "delete" || !record || !cid) {
      const isMine = this.removedHere.delete(uri) || isBeingWritten
      this.known.delete(key)
      const was = known ? toRow(id, did, known.value) : undefined
      this.tell({ collection, id, ...(was && { was }), ...(isMine && { isMine }) })
      return
    }
    const isMine = this.mine.delete(cid) || isBeingWritten
    if (known?.cid === cid && !isMine) return
    this.noteRecord(collection, id, { did, rkey, cid, value: record, ...(rev && { rev }) })
    this.tell({ collection, id, row: toRow(id, did, record), ...(isMine && { isMine }) })
  }

  /** Tell whoever's watching. */
  private tell(event: PlaceEvent): void {
    for (const { target, onEvent } of [...this.watchers]) {
      const isWatched = target.collection === event.collection && (target.id === undefined || target.id === event.id)
      if (isWatched) onEvent(event)
    }
  }
}

/** Which of the two kinds of atmosphere account it is. */
export type AtProtoKind = "atmosphere account" | "personal atmosphere account"

/** Constructor props of an `AtProtoPlace`. */
export type AtProtoPlaceProps = {
  /** One account, or each person's own. */
  kind: AtProtoKind
  /** The one account, or those a shared place is limited to:  their DIDs.  Left out of a personal one:  anyone who holds its collection. */
  accounts?: readonly string[]
  /** With no accounts named:  `false`, and it's only the person signed in's, with no asking who else holds it. */
  findsAccounts?: boolean
  /** The part of each account its records go in, as the start of a collection's name.  Left out:  `DEFAULT_CORNER`. */
  corner?: string
  /** A collection's name there, by its name here:  in full (`com.example.recipe`), or under the corner. */
  collections?: Readonly<Record<string, string>>
  /** Who's at this page with nobody signed in. */
  person?: PlacePerson
  /** Who's signed in.  Left out:  this page's `AtProtoSignIn`. */
  signIn?: AtProtoAccess
  /** What it reaches, over the real network. */
  network?: Partial<AtProtoNetwork>
}

/** What an account's document says. */
type AccountDocument = {
  /** Which account. */
  id: string
  /** What it goes by. */
  alsoKnownAs?: string[]
  /** Where it's served. */
  service?: { id: string; type: string; serviceEndpoint: string }[]
}

/** One thing's changes, as one write. */
type AccountWrite = {
  /** The collection, as it's known here. */
  collection: string
  /** The thing's id, as it's known here. */
  id: string
  /** The collection's full name. */
  nsid: string
  /** Its key. */
  rkey: string
  /** Is it going? */
  isRemoved: boolean
  /** The record's fields. */
  value: Record<string, unknown>
  /** What this page saw it at. */
  version?: string | undefined
}

/** `"<account>|<where in it>"`, read. */
function splitPage(at: string): [string, string | undefined] {
  const bar = at.indexOf("|")
  return bar < 0 ? [at, undefined] : [at.slice(0, bar), at.slice(bar + 1) || undefined]
}

/** What `fetch` is told, of what a place's asked. */
function requestOptions({ signal, keepalive }: PlaceContext): RequestInit {
  return { ...(signal && { signal }), ...(keepalive && { keepalive }) }
}

/** What a host said went wrong.  Not JSON:  nothing. */
function parsedError(text: string): { error?: string; message?: string } {
  try {
    return JSON.parse(text) as { error?: string; message?: string }
  } catch (ignored) {
    return {}
  }
}

/** The note for a read that stopped at `MOST_ACCOUNTS`. */
function tooManyAccounts(collection: string): string {
  return `"${collection}" is held by ${MOST_ACCOUNTS} accounts or more:  this reads only the first ${MOST_ACCOUNTS}.  Name the accounts under the place, to choose`
}

/** What names one record, anywhere. */
function recordUri(did: string, nsid: string, rkey: string): string {
  return `${did}/${nsid}/${rkey}`
}

/** The key one thing is known by. */
function thingKey(collection: string, id: string): string {
  return `${collection}\n${id}`
}

/** A row, from a record:  its own `id` and `owner` are the place's, whatever it says. */
function toRow(id: string, did: string, { [TYPE_FIELD]: _type, ...fields }: Record<string, unknown>): PlaceRow {
  return { ...fields, [ID_FIELD]: id, [OWNER_FIELD]: did }
}

/** The record `write` keeps:  it says what kind it is. */
function recordOf({ nsid, value }: AccountWrite): Record<string, unknown> {
  return { ...value, [TYPE_FIELD]: nsid }
}

/** `write` as one of `applyWrites`'s:  whether its record's there says which. */
function atomicWrite(write: AccountWrite, isThere: boolean): Record<string, unknown> {
  const { nsid: collection, rkey, isRemoved } = write
  const kind = isRemoved ? "delete" : isThere ? "update" : "create"
  return {
    $type: `com.atproto.repo.applyWrites#${kind}`,
    collection,
    rkey,
    ...(!isRemoved && { value: recordOf(write) })
  }
}

/** `id`, as a record key.  - throws `PlaceError` `"refused"` for one that can't be */
function checkedRecordKey(id: string): string {
  if (RECORD_KEY.test(id) && id !== "." && id !== "..") return id
  throw new PlaceError(`"${id}" can't be a record's key:  only letters, digits and . - _ : ~`, {
    cause: { kind: "refused", whyNot: "field" }
  })
}

/**
 * What `change` writes, as a record can hold it:  never its id or its owner, nor a field starting `$`, the protocol's own.
 * - throws `PlaceError` `"refused"` for what it can't
 */
function checkedFields({ fields = {} }: PlaceChange): Record<string, unknown> {
  const { [ID_FIELD]: _id, [OWNER_FIELD]: _owner, ...rest } = fields
  const written = Object.fromEntries(
    Object.entries(rest).filter(([field, value]) => value !== undefined && !field.startsWith("$"))
  )
  for (const [field, value] of Object.entries(written)) refuseIfNotARecordsValue(field, value)
  return written
}

/** - throws `PlaceError` `"refused"`, `"field"`, for a decimal number, anywhere in `value`:  the protocol has none */
function refuseIfNotARecordsValue(field: string, value: unknown): void {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new PlaceError(
      `${field} is ${value}, and an atmosphere account keeps whole numbers only:  round it, or keep it as text`,
      { cause: { kind: "refused", whyNot: "field" } }
    )
  }
  if (value && typeof value === "object") {
    for (const each of Object.values(value)) refuseIfNotARecordsValue(field, each)
  }
}

/** A collection's name, as the last part of an NSID can say it:  letters and digits, `recipe_notes` => `recipeNotes`. */
function nsidNameOf(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+(.)?/g, (_match, next: string | undefined) => (next ?? "").toUpperCase())
    .replace(/^\d+/, "")
}
