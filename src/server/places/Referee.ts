import { randomBytes } from "node:crypto"
import type { IncomingMessage } from "node:http"
import type { Duplex } from "node:stream"

import { every } from "spell/util/timing"
import {
  PlaceError,
  idOfRow,
  type PersonHere,
  type ListQuery,
  type Place,
  type PlaceChange,
  type PlaceEvent,
  type PlaceRow
} from "spell/places/places.types"
import { isListPosition, positionBetween, type ListPosition } from "spell/places/positions"
import {
  FROM_THE_PLACE,
  ROOM_ID_FIELD,
  ROOM_TOKEN_PROTOCOL,
  RoomCopy,
  rowForStore,
  type RoomAction,
  type RoomAnswer,
  type RoomAsk,
  type RoomEntry,
  type RoomOverwrite,
  type RoomPlan
} from "spell/places/RoomCopy"
import { SRV } from "spell/server"

/** How many steps it keeps in its log:  whoever's further behind gets a snapshot. */
const LOG_MOST = 1000

/** How many changes' ids it remembers, so one sent again is made once.  More than the log holds. */
const CHANGES_REMEMBERED = 10_000

/** How many fields' last writers it remembers. */
const FIELDS_REMEMBERED = 10_000

/** How often it pings its sockets, in seconds:  a sleeping laptop or a proxy doesn't drop them. */
const PING_SECONDS = 30

/** The header `Guard` reads the token from. */
const TOKEN_HEADER = "x-server-token"

/** The addresses a local server is reached at. */
const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/

/** The address of a machine asking from here. */
const LOCAL_ASKER = /^(127\.|::1$|::ffff:127\.)/

export type { RoomAction, RoomActionAnswer, RoomActionAsk } from "spell/places/RoomCopy"

/** What a page says it runs:  see `Referee`. */
type ProgramVersion = {
  /** A mark of the program:  the same program, the same mark. */
  version: string
  /** When the page got it, ms. */
  loadedAt: number
}

/** One page in the room. */
export type RoomMember = {
  /** It sent this. */
  receive(text: string): void
  /** It's gone. */
  leave(): void
}

/****************
 * ### `Referee`
 * ONE per shared space:  puts everyone's changes in one order, on any place as its store (epic `data` P8).
 *
 * ```ts
 * const referee = new Referee({ path: "/api/rooms/recipes", place, collections: { recipes: {} }, guard })
 * await referee.open()
 * server.upgrade(referee.path, referee.upgrade)
 * ```
 *
 * - Its browser half is `LiveRoomPlace`.  Both hold a `RoomCopy`, so a change comes out the same on both.
 * - Each step gets the next sequence number, and goes to everyone, the sender too.  A batch is one step, all or none.
 * - The last to arrive wins a field.  What it replaced without having seen goes with it (`overwrote`), so the loser keeps
 *   their words:  NEVER lost silently, even where it can't be helped (J1).
 * - A `changeId` it has seen isn't made again, so a change sent twice is made once:  it answers `seen`.
 * - Parent and position are one field.
 *   - Two with the same position:  the second gets one of its own.
 *   - A move that would put a thing inside itself is refused:  the things would vanish.
 * - The log holds the last `LOG_MOST` steps, deletes among them;  whoever's further behind gets the whole copy, which needs no
 *   markers, so nothing's kept for ever.
 * - THE STORE:  each batch is written before it's numbered, one at a time.
 *   - So a store that refuses is a refusal, and one that fails is "no answer":  the page sends it again.
 *   - A store with a `watch()` is heard:  someone saving a file by hand becomes a step, `FROM_THE_PLACE`.
 *   - It's written whole values:  this is the store's one writer, so nothing's lost by it.
 *   - A store that makes its own ids (an Airtable with no id column):  it keeps the browser's ids in the room, and each one's name in the store.
 * - A named action (`actions`) re-runs here, so "check, then write" holds for two at once.
 *   A page with the same code runs it first, to show what it'll do (`LiveRoomPlace`'s `actions`):  this one's answer settles it.
 * - A ROOM TRUSTS EVERYONE IN IT:  no per-person rules yet.  So who someone says they are is believed,
 *   unless they're signed in:  then they're who their sign-in says (epic `atmosphere` P3).
 * - WHO WRITES (epic `atmosphere` T38):  each write reaches the store as its page's person (`PlaceContext.identity`),
 *   so a store with rules of its own (a space's `FolderPlace`:  members, roles, takedowns, limits) checks it.
 *   - who a page is:  `identityOf` its request, as its server answers that, else whoever's signed in
 *   - nobody (no sign-in, no `identityOf`):  the store gets no identity, and trusts it, as its own server's code
 * - WHO'S HERE (epic `data` P13):  each page says who it is as it opens;  a page joining or leaving is told to everyone.
 *   Never logged or numbered:  it's about now, and a page that comes back simply says so again.
 * - Behind `Guard`:  its own host and origin, and either a sign-in (`signIn`, the server's `SignInCheck`) or this run's token.
 *   - Signed in, the cookie rides with the socket:  from any machine (epic `atmosphere` P3, data's T23).
 *   - Not, this machine only:  the token rides as the socket's sub-protocol (`ROOM_TOKEN_PROTOCOL`), never in its address
 *     (data's J49), and anyone else is refused, and told why.
 * - A PAGE LEFT OPEN ACROSS A NEW VERSION (epic `data` T5):  each page says, as it opens, a mark of the program it runs
 *   (`version`) and when the page got it (`loadedAt`).
 *   - The newest to arrive with another mark is the program now, by `loadedAt`:  the marks needn't be in any order,
 *     and nothing's kept across a restart, as the pages say it again.
 *   - A page running what isn't that is told to reload, and what it sends is "no answer":  kept there, not lost, for after.
 *   - A page that says no version:  never out of date.
 * - NOT `StateMirror` (`spell/parser/core/state`), which it doesn't grow from:  see the docstring there.
 * - Node only.  Knows nothing of what a place is, or of Things.
 ****************/
export class Referee {
  /** Where it listens. */
  readonly path: string
  /** Names this run:  the numbers start again when it restarts, so a page can tell. */
  readonly run = randomBytes(6).toString("hex")

  /** The store. */
  private readonly place: Place
  /** Each collection, and what to read it with. */
  private readonly collections: Readonly<Record<string, ListQuery>>
  /** The guard. */
  private readonly guard: SRV.Guard
  /** Who's signed in on a socket's device. */
  private readonly signIn: RefereeProps["signIn"]
  /** Who a page's request is, as its server answers that. */
  private readonly identityOf: RefereeProps["identityOf"]
  /** Its named actions. */
  private readonly actions: Readonly<Record<string, RoomAction>>
  /** The rows. */
  private readonly copy = new RoomCopy()
  /** The steps it still has. */
  private readonly log: RoomEntry[] = []
  /** The last step. */
  private seq = 0
  /** The pages here, and how to reach each. */
  private readonly members = new Set<(text: string) => void>()
  /** Who each page signed in is, by its sign-in:  what it says of itself is overruled. */
  private readonly signedIn = new Map<(text: string) => void, string>()
  /** Who each page writes as, to the store (`PlaceContext.identity`). */
  private readonly writers = new Map<(text: string) => void, string>()
  /** What each page that said runs, and when it got it. */
  private readonly versions = new Map<(text: string) => void, ProgramVersion>()
  /** The program now:  the newest page's. */
  private newest: ProgramVersion | undefined
  /** Who each page says it is, in the order they came. */
  private readonly people = new Map<(text: string) => void, PersonHere>()
  /** What each change's id made:  oldest first. */
  private readonly made = new Map<string, { seq: number; result?: unknown }>()
  /** Who last wrote each field, and when:  oldest first. */
  private readonly lastWrites = new Map<string, { seq: number; from: string }>()
  /** Each thing's id in a store that makes its own, by the id it's known by here. */
  private readonly storeIds = new Map<string, string>()
  /** The things being written to the store right now:  it telling us of those is only our own write. */
  private readonly writing = new Set<string>()
  /** One thing at a time. */
  private queue: Promise<unknown> = Promise.resolve()
  /** What stops hearing the store. */
  private readonly stops: (() => void)[] = []

  constructor({ path, place, collections, guard, actions = {}, signIn, identityOf }: RefereeProps) {
    this.path = path
    this.signIn = signIn
    this.identityOf = identityOf
    this.place = place
    this.collections = collections
    this.guard = guard
    this.actions = actions
  }

  /** Where it stands. */
  get sequence(): number {
    return this.seq
  }

  /** Who's here now, in the order they came. */
  get peopleHere(): PersonHere[] {
    return [...this.people.values()]
  }

  /** The rows, as it holds them:  for a test, or an action's own reading. */
  get rows(): RoomCopy {
    return this.copy
  }

  /** Read every collection from the store, and hear it from now on.  Call once, before anyone joins.  - throws what the store throws */
  async open(): Promise<this> {
    const snapshot: Record<string, PlaceRow[]> = {}
    for (const [collection, query] of Object.entries(this.collections)) {
      snapshot[collection] = await this.allRows(collection, query)
      if (this.place.watch) {
        this.stops.push(this.place.watch({ collection }, (event) => this.storeChanged(event)))
      }
    }
    this.copy.replaceWith(snapshot)
    return this
  }

  /** Stop hearing the store.  Its sockets are its server's to close. */
  close(): void {
    this.stops.splice(0).forEach((stop) => stop())
  }

  /** Every row of `collection`, page after page. */
  private async allRows(collection: string, query: ListQuery): Promise<PlaceRow[]> {
    const rows: PlaceRow[] = []
    let at: string | undefined
    do {
      const answer = await this.place.list(collection, { ...query, ...(at !== undefined && { page: { at } }) }, {})
      rows.push(...answer.rows)
      at = answer.nextPage
    } while (at !== undefined)
    const { idOf } = this.place.describe()
    return rows.map((row) => (idOf === ROOM_ID_FIELD ? row : { ...row, [ROOM_ID_FIELD]: idOfRow(row, idOf) }))
  }

  ////////////////
  // ## Joining
  ////////////////

  /**
   * The websocket upgrade:  checks who's asking, and they're in.
   * - NOTE:  a page can't set a header on a websocket, so its token rides as its sub-protocol, and is checked as any request's.
   * - Refuses with its reason, and closes:  see the class.
   */
  upgrade: SRV.UpgradeHandler = (raw, socket) => {
    const { refusal, person, identity, protocol } = this.askerOf(raw, socket)
    if (refusal) {
      socket.end(`HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n${refusal}\n`)
      return
    }
    const member = this.join(
      (text) => {
        if (!socket.destroyed) socket.write(SRV.textFrame(text))
      },
      person,
      identity
    )
    const listeners = { onText: (text: string) => member.receive(text), ...(protocol && { protocol }) }
    if (!SRV.acceptWebSocket(raw, socket, listeners)) return member.leave()
    const stopPinging = every(PING_SECONDS, () => {
      if (!socket.destroyed) socket.write(SRV.pingFrame())
    })
    socket.on("close", () => {
      stopPinging()
      member.leave()
    })
  }

  /**
   * Who's asking, and why they can't come in, if they can't.
   * - Signed in (`request.person`, by the server's `SignInCheck`, epic `atmosphere` P3):  their cookie rides with the
   *   socket, so they need no token, and may be on another machine.
   * - Not:  this machine only, with this run's token as the socket's sub-protocol (`ROOM_TOKEN_PROTOCOL`), never in
   *   its address;  `protocol` is what to answer with.
   * - `identity`:  who it writes as (`identityOf`, else `person`);  `identityOf` throwing refuses it, saying why.
   */
  private askerOf(
    raw: IncomingMessage,
    socket: Duplex
  ): { refusal?: string; person?: string; identity?: string; protocol?: string } {
    const offered = `${raw.headers["sec-websocket-protocol"] ?? ""}`.split(",").map((each) => each.trim())
    const protocol = offered.find((each) => each.startsWith(ROOM_TOKEN_PROTOCOL))
    if (protocol) raw.headers[TOKEN_HEADER] = protocol.slice(ROOM_TOKEN_PROTOCOL.length)
    const request = new SRV.Request(raw)
    this.signIn?.putPersonOn(request)
    const { person } = request
    const host = raw.headers.host ?? ""
    const asker = (socket as Duplex & { remoteAddress?: string }).remoteAddress
    const isHere = LOCAL_HOST.test(host) && (asker === undefined || LOCAL_ASKER.test(asker))
    if (!person && !isHere) {
      return { refusal: "This room runs on this machine only, unless you're signed in:  sign in, then come back." }
    }
    let identity: string | undefined
    try {
      this.guard.checkHost(request)
      this.guard.checkWrite(request)
      identity = this.identityOf ? this.identityOf(request) : person
    } catch (error) {
      return { refusal: (error as Error).message }
    }
    return { ...(person && { person }), ...(identity && { identity }), ...(protocol && { protocol }) }
  }

  /**
   * A page is in the room, reached through `send`:  what it says goes to `receive()`.  Sockets and tests come in this way.
   * - `person`:  who it's signed in as;  `identity`:  who it writes to the store as (default `person`)
   */
  join(send: (text: string) => void, person?: string, identity = person): RoomMember {
    this.members.add(send)
    if (person) this.signedIn.set(send, person)
    if (identity) this.writers.set(send, identity)
    return {
      receive: (text) => this.heard(text, send),
      leave: () => {
        this.members.delete(send)
        this.signedIn.delete(send)
        this.writers.delete(send)
        this.versions.delete(send)
        if (this.people.delete(send)) this.tellPeople()
      }
    }
  }

  /** A page says who it is:  everyone's told who's here. */
  private isHere(
    { from, person, version, loadedAt = 0 }: Extract<RoomAsk, { kind: "here" }>,
    send: (text: string) => void
  ): void {
    if (version !== undefined) this.noteVersion(send, { version, loadedAt })
    // a page signed in is who its sign-in says, whatever it claims
    const signedIn = this.signedIn.get(send)
    this.people.set(send, { ...person, ...(signedIn && { id: signedIn, name: signedIn }), page: from })
    this.tellPeople()
  }

  /** A page runs this version:  it may be the program now, and whoever isn't on that one is told to reload. */
  private noteVersion(send: (text: string) => void, version: ProgramVersion): void {
    this.versions.set(send, version)
    if (this.newest && version.loadedAt < this.newest.loadedAt) return void this.tellIfOutOfDate(send)
    this.newest = version
    for (const member of this.versions.keys()) this.tellIfOutOfDate(member)
  }

  /** Tell the page `send` to reload, if it runs an older version. */
  private tellIfOutOfDate(send: (text: string) => void): void {
    if (this.isOutOfDate(send)) send(JSON.stringify({ kind: "reload" } satisfies RoomAnswer))
  }

  /** Does the page `send` run something older than the program now? */
  private isOutOfDate(send: (text: string) => void): boolean {
    const version = this.versions.get(send)
    return !!version && !!this.newest && version.version !== this.newest.version
  }

  /** Tell everyone who's here. */
  private tellPeople(): void {
    const text = JSON.stringify({ kind: "people", people: this.peopleHere } satisfies RoomAnswer)
    for (const send of this.members) send(text)
  }

  ////////////////
  // ## What a page says
  ////////////////

  /** A page said `text`.  What can't be read is logged:  one bad message doesn't end a socket. */
  private heard(text: string, send: (text: string) => void): void {
    let ask: RoomAsk
    try {
      ask = JSON.parse(text) as RoomAsk
    } catch (error) {
      return console.error("Referee:  a message that isn't JSON", error)
    }
    const answer = (message: RoomAnswer) => send(JSON.stringify(message))
    const writer = this.writers.get(send)
    if ((ask.kind === "changes" || ask.kind === "call") && this.isOutOfDate(send)) {
      const changeIds = ask.kind === "call" ? [ask.callId] : ask.changes.flatMap(({ changeId }) => changeId ?? [])
      send(JSON.stringify({ kind: "reload" } satisfies RoomAnswer))
      return answer({ kind: "no answer", changeIds, message: "this page runs an older version:  reload it" })
    }
    switch (ask.kind) {
      case "catch-up":
        return this.catchUp(ask, answer)
      case "check":
        return this.check(ask, answer)
      case "here":
        return this.isHere(ask, send)
      case "changes":
        return void this.inTurn(() => this.makeChanges(ask.changes, ask.from, answer, writer))
      case "call":
        return void this.inTurn(() => this.runAction(ask, answer, writer))
      default:
        console.error("Referee:  a message it doesn't know", ask)
    }
  }

  /** Run `work` after everything before it.  NEVER rejects:  a failure is logged. */
  private inTurn(work: () => Promise<void>): Promise<unknown> {
    this.queue = this.queue.then(work).catch((error: unknown) => console.error("Referee:  a change failed", error))
    return this.queue
  }

  /** Get a page back in step:  what it missed, or everything. */
  private catchUp({ run, since }: Extract<RoomAsk, { kind: "catch-up" }>, answer: (message: RoomAnswer) => void): void {
    const oldest = this.log[0]?.seq ?? this.seq + 1
    if (run !== this.run || since === undefined || since < oldest - 1 || since > this.seq) return this.snapshot(answer)
    answer({ kind: "entries", run: this.run, entries: this.log.filter(({ seq }) => seq > since) })
  }

  /** Is this page in step?  A page at this very step with another checksum isn't:  it gets everything. */
  private check(
    { run, seq, checksum }: Extract<RoomAsk, { kind: "check" }>,
    answer: (message: RoomAnswer) => void
  ): void {
    if (run === this.run && seq === this.seq && checksum !== this.copy.checksum) return this.snapshot(answer)
    answer({ kind: "at", run: this.run, seq: this.seq })
  }

  /** The whole copy. */
  private snapshot(answer: (message: RoomAnswer) => void): void {
    answer({ kind: "snapshot", run: this.run, seq: this.seq, rows: this.copy.snapshot })
  }

  ////////////////
  // ## Making changes
  ////////////////

  /**
   * Make a batch:  all of it, numbered, told to everyone;  or none of it, and the sender's told why.
   * - All of it seen already:  `seen`.  Some of it:  only the rest is made:  what's still unsent joins a batch sent again.
   * - `writer`:  who it's written to the store as
   */
  private async makeChanges(
    changes: PlaceChange[],
    from: string,
    answer: (message: RoomAnswer) => void,
    writer: string | undefined
  ): Promise<void> {
    const changeIds = changes.flatMap(({ changeId }) => changeId ?? [])
    const fresh = changes.filter(({ changeId }) => changeId === undefined || !this.made.has(changeId))
    if (!fresh.length) {
      const seq = Math.max(...changeIds.map((changeId) => this.made.get(changeId)!.seq))
      return answer({ kind: "seen", changeIds, seq })
    }
    try {
      await this.makeStep({
        changes: fresh,
        from,
        writer,
        changeIds: fresh.flatMap(({ changeId }) => changeId ?? [])
      })
    } catch (error) {
      this.answerFailure(error, changeIds, answer)
    }
  }

  /** Run a named action, and make what it says:  its own check is on the row as it is now, in the one order. */
  private async runAction(
    { callId, name, input, from }: Extract<RoomAsk, { kind: "call" }>,
    answer: (message: RoomAnswer) => void,
    writer: string | undefined
  ): Promise<void> {
    const seenAt = this.made.get(callId)
    if (seenAt) return answer({ kind: "seen", changeIds: [callId], seq: seenAt.seq, result: seenAt.result })
    try {
      const action = Object.hasOwn(this.actions, name) ? this.actions[name] : undefined
      if (!action) throw new PlaceError(`This room has no action "${name}"`, { cause: { kind: "not found" } })
      const { changes, result } = await action({
        rows: (collection) => this.copy.rowsOf(collection),
        row: (collection, id) => this.copy.rowFor(collection, id),
        input,
        from
      })
      if (changes.length) await this.makeStep({ changes, from, writer, changeIds: [callId], result })
      else this.remember(callId, { seq: this.seq, result })
      answer({ kind: "called", callId, result })
    } catch (error) {
      this.answerFailure(error, [callId], answer)
    }
  }

  /** Say how `error` ended it:  a no, or no answer. */
  private answerFailure(error: unknown, changeIds: string[], answer: (message: RoomAnswer) => void): void {
    const message = (error as Error).message
    if (error instanceof PlaceError && (error.kind === "refused" || error.kind === "not found")) {
      return answer({ kind: "refused", changeIds, errorKind: error.kind, message })
    }
    console.error("Referee:  it couldn't make a change;  the page sends it again", error)
    answer({ kind: "no answer", changeIds, message })
  }

  /** Settle, store and number one batch, and tell everyone.  - throws what stops it:  nothing's changed */
  private async makeStep({ changes, from, writer, changeIds, result }: RoomStep): Promise<void> {
    const { settled, plan } = this.planned(changes)
    await this.writeToStore(settled, plan, writer)
    const overwrote = this.overwritesBy(settled, from)
    this.copy.commit(plan)
    this.step({ seq: this.seq + 1, from, changes: settled, ...(overwrote.length && { overwrote }) })
    for (const changeId of changeIds)
      this.remember(changeId, { seq: this.seq, ...(result !== undefined && { result }) })
  }

  /**
   * `changes` as they'll be made, and what they'd make, with nothing changed.
   * - throws `PlaceError`:  a change that's nonsense (no id, a position that can't be one) is refused, not tried again
   */
  private planned(changes: PlaceChange[]): { settled: PlaceChange[]; plan: RoomPlan } {
    try {
      const settled = changes.map((change) => this.settled(change))
      const plan = this.copy.plan(settled)
      this.refuseCycles(plan)
      return { settled, plan }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error
      throw new PlaceError(error.message, { cause: { kind: "refused" } })
    }
  }

  /** Number `entry`, keep it, and tell everyone. */
  private step(entry: RoomEntry): void {
    this.seq = entry.seq
    for (const change of entry.changes) this.noteWrites(change, entry)
    this.log.push(entry)
    if (this.log.length > LOG_MOST) this.log.shift()
    const text = JSON.stringify({ kind: "entry", run: this.run, entry } satisfies RoomAnswer)
    for (const send of this.members) send(text)
  }

  /** `change`, each position in it unique among what's there:  the second to pick one gets the next along. */
  private settled(change: PlaceChange): PlaceChange {
    const { fields, collection, id } = change
    if (!fields) return change
    let settled: PlaceChange = change
    for (const [field, value] of Object.entries(fields)) {
      if (!isListPosition(value)) continue
      const beside = this.copy.positionsBeside(collection, field, value.parent, id ?? "").sort()
      if (!beside.includes(value.at)) continue
      const position: ListPosition = {
        ...value,
        at: positionBetween(
          value.at,
          beside.find((at) => at > value.at)
        )
      }
      settled = { ...settled, fields: { ...settled.fields, [field]: position } }
    }
    return settled
  }

  /** A thing can't be put inside itself:  it'd vanish, for everyone.  - throws `PlaceError`, `"refused"` */
  private refuseCycles(plan: RoomPlan): void {
    for (const { collection, id, row } of plan.values()) {
      if (!row) continue
      for (const [field, value] of Object.entries(row)) {
        if (!isListPosition(value)) continue
        const seen = new Set([id])
        for (let parent = value.parent; parent !== null;) {
          if (seen.has(parent)) {
            throw new PlaceError(`"${id}" can't go inside itself`, { cause: { kind: "refused" } })
          }
          seen.add(parent)
          const planned = plan.get(`${collection}\n${parent}`)
          const above: unknown = (planned ? planned.row : this.copy.rowFor(collection, parent))?.[field]
          parent = isListPosition(above) ? above.parent : null
        }
      }
    }
  }

  /** What `changes` replaced without having seen it. */
  private overwritesBy(changes: readonly PlaceChange[], from: string): RoomOverwrite[] {
    const overwrote: RoomOverwrite[] = []
    for (const { kind, collection, id, fields, version } of changes) {
      if (kind !== "update" || version === undefined || !fields) continue
      const row = this.copy.rowFor(collection, id!)
      for (const [field, value] of Object.entries(fields)) {
        const last = this.lastWrites.get(`${collection}\n${id}\n${field}`)
        const isUnseen = last && last.from !== from && last.seq > Number(version)
        if (isUnseen && JSON.stringify(row?.[field]) !== JSON.stringify(value)) {
          overwrote.push({ collection, id: id!, field, value: row?.[field], from: last.from })
        }
      }
    }
    return overwrote
  }

  /** Note who wrote what, for telling whoever writes over it. */
  private noteWrites({ kind, collection, id, fields }: PlaceChange, { seq, from }: RoomEntry): void {
    if (kind === "delete") return
    for (const field of Object.keys(fields ?? {})) {
      const key = `${collection}\n${id}\n${field}`
      this.lastWrites.delete(key)
      this.lastWrites.set(key, { seq, from })
    }
    for (const oldest of this.lastWrites.keys()) {
      if (this.lastWrites.size <= FIELDS_REMEMBERED) break
      this.lastWrites.delete(oldest)
    }
  }

  /** Remember what this change's id made. */
  private remember(changeId: string, made: { seq: number; result?: unknown }): void {
    this.made.set(changeId, made)
    for (const oldest of this.made.keys()) {
      if (this.made.size <= CHANGES_REMEMBERED) break
      this.made.delete(oldest)
    }
  }

  ////////////////
  // ## The store
  ////////////////

  /**
   * Write `changes` to the store, as whole values:  what each thing will hold, as `writer`.
   * - throws what the store throws:  a space's "your role can't write" among it
   */
  private async writeToStore(
    changes: readonly PlaceChange[],
    plan: RoomPlan,
    writer: string | undefined
  ): Promise<void> {
    if (!this.place.apply) {
      throw new PlaceError("This room's store can't be written", { cause: { kind: "refused", whyNot: "place" } })
    }
    const makesIds = this.place.describe().makesIds
    const toStore = changes.map((change) => this.changeForStore(change, plan, makesIds))
    const keys = changes.map(({ collection, id }) => `${collection}\n${id}`)
    keys.forEach((key) => this.writing.add(key))
    try {
      const { rows } = await this.place.apply(toStore, writer === undefined ? {} : { identity: writer })
      if (makesIds) this.noteStoreIds(changes, rows)
    } finally {
      keys.forEach((key) => this.writing.delete(key))
    }
  }

  /** `change`, as the store takes it:  the fields it changed, as they'll be, with no marks of a room's. */
  private changeForStore(
    { kind, collection, id, fields, adds, list }: PlaceChange,
    plan: RoomPlan,
    makesIds?: boolean
  ): PlaceChange {
    const row = plan.get(`${collection}\n${id}`)?.row
    const stored = row && rowForStore(row)
    const storeId = this.storeIds.get(id!) ?? id
    if (kind === "delete") return { kind, collection, id: storeId! }
    if (kind === "insert") {
      const { [ROOM_ID_FIELD]: _id, ...others } = stored ?? {}
      return makesIds ? { kind, collection, fields: others } : { kind, collection, id: id!, fields: stored ?? {} }
    }
    const names = [...Object.keys(fields ?? {}), ...Object.keys(adds ?? {}), ...Object.keys(list ?? {})]
    return { kind, collection, id: storeId!, fields: Object.fromEntries(names.map((name) => [name, stored?.[name]])) }
  }

  /** A store that makes its own ids named these. */
  private noteStoreIds(changes: readonly PlaceChange[], rows: readonly PlaceRow[]): void {
    const { idOf } = this.place.describe()
    const written = changes.filter(({ kind }) => kind !== "delete")
    if (rows.length !== written.length) return
    written.forEach(({ kind, id }, index) => {
      const storeId = idOfRow(rows[index]!, idOf)
      if (kind === "insert" && storeId !== undefined) this.storeIds.set(id!, storeId)
    })
  }

  /**
   * The store says something changed, someone other than here:  it's a step, like any other.
   * - What we wrote ourselves comes back here too:  it's the same as what's held, so nothing happens.
   */
  private storeChanged({ collection, id, row }: PlaceEvent): void {
    void this.inTurn(async () => {
      if (this.writing.has(`${collection}\n${id}`)) return
      const held = this.copy.rowFor(collection, id)
      if (!row) {
        if (held) this.fromStore({ kind: "delete", collection, id })
        return
      }
      const stored = held && rowForStore(held)
      const { [ROOM_ID_FIELD]: _id, ...fields } = row
      const changed = Object.entries(fields).filter(
        ([field, value]) => JSON.stringify(stored?.[field]) !== JSON.stringify(value)
      )
      if (!held) this.fromStore({ kind: "insert", collection, id, fields })
      else if (changed.length) this.fromStore({ kind: "update", collection, id, fields: Object.fromEntries(changed) })
    })
  }

  /** One change the store already holds:  numbered and told, with nothing to write. */
  private fromStore(change: PlaceChange): void {
    this.copy.commit(this.copy.plan([change]))
    this.step({ seq: this.seq + 1, from: FROM_THE_PLACE, changes: [change] })
  }
}

/** Constructor props of a `Referee`. */
export type RefereeProps = {
  /** Where it listens:  `/api/rooms/recipes`. */
  path: string
  /** Its store:  any place. */
  place: Place
  /** Each collection it holds, and what to read it with:  a list of summaries needs telling which fields to read whole. */
  collections: Readonly<Record<string, ListQuery>>
  /** Who may come in:  this run's token, its own host and origin. */
  guard: SRV.Guard
  /** What re-runs on the referee, by name. */
  actions?: Readonly<Record<string, RoomAction>>
  /** The server's sign-in check (`SignInCheck`, `spell/server/signIn`):  who's signed in on a socket's device.  Left out:  nobody is. */
  signIn?: { putPersonOn(request: SRV.Request): void }
  /**
   * Who a page writes to the store as, from its request (its sign-in already on it):  the server's own answer,
   * e.g. a space's `SpaceFolders` (whoever's signed in, else this machine's person).
   * - Left out:  whoever's signed in;  nobody, for a page that isn't.
   * - throws to refuse the page, its message the reason
   */
  identityOf?: (request: SRV.Request) => string | undefined
}

/** One batch to make:  what it changes, who sent it, who it's written as, and what it answers. */
type RoomStep = {
  /** What to change. */
  changes: PlaceChange[]
  /** The page it came from. */
  from: string
  /** Who it's written to the store as. */
  writer: string | undefined
  /** The ids it's remembered by. */
  changeIds: string[]
  /** A named action's result. */
  result?: unknown
}
