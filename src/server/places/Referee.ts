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
} from "spell/util/places/places.types"
import { isListPosition, positionBetween, type ListPosition } from "spell/util/places/positions"
import {
  FROM_THE_PLACE,
  ROOM_ID_FIELD,
  RoomCopy,
  rowForStore,
  type RoomAnswer,
  type RoomAsk,
  type RoomEntry,
  type RoomOverwrite,
  type RoomPlan
} from "spell/util/places/RoomCopy"
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

/** What the referee's named actions can see and do. */
export type RoomActionAsk = {
  /** The rows of `collection`, as they are in the one order. */
  rows(collection: string): PlaceRow[]
  /** This row of `collection`. */
  row(collection: string, id: string): PlaceRow | undefined
  /** What it was called with. */
  input: unknown
  /** Who called it. */
  from: string
}

/**
 * A named action:  it runs on the referee, in the one order, and says what to change.
 * - A check that fails throws `PlaceError`, `"refused"`:  the last seat's gone, and that's the answer.
 * - The result goes back as `result`.
 */
export type RoomAction = (ask: RoomActionAsk) => RoomActionAnswer | Promise<RoomActionAnswer>

/** What a named action makes. */
export type RoomActionAnswer = {
  /** What to change. */
  changes: PlaceChange[]
  /** What to answer. */
  result?: unknown
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
 * - Parent and position are one field.  Two with the same position:  the second gets one of its own.
 *   A move that would put a thing inside itself is refused:  the things would vanish.
 * - The log holds the last `LOG_MOST` steps, deletes among them;  whoever's further behind gets the whole copy, which needs no
 *   markers, so nothing's kept for ever.
 * - THE STORE:  each batch is written before it's numbered, one at a time.
 *   - So a store that refuses is a refusal, and one that fails is "no answer":  the page sends it again.
 *   - A store with a `watch()` is heard:  someone saving a file by hand becomes a step, `FROM_THE_PLACE`.
 *   - It's written whole values:  this is the store's one writer, so nothing's lost by it.
 *   - A store that makes its own ids (Airtable):  it keeps the browser's ids in the room, and each one's name in the store.
 * - A named action (`actions`) re-runs here, so "check, then write" holds for two at once.  The compiler's choice of which comes
 *   with the words.
 * - A ROOM TRUSTS EVERYONE IN IT:  no per-person rules yet.  So who someone says they are is believed.
 * - WHO'S HERE (epic `data` P13):  each page says who it is as it opens;  a page joining or leaving is told to everyone.
 *   Never logged or numbered:  it's about now, and a page that comes back simply says so again.
 * - LOCAL ONLY, behind `Guard`:  this run's token, its own host and origin.  A hosted one needs its own sign-in (T23, The Cloud), so
 *   anyone asking from another machine, or at another address, is refused, and told why.
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

  constructor({ path, place, collections, guard, actions = {} }: RefereeProps) {
    this.path = path
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
   * - NOTE:  a page can't set a header on a websocket, so its token rides in the address, and is checked as any request's.
   * - Refuses with its reason, and closes:  see the class.
   */
  upgrade: SRV.UpgradeHandler = (raw, socket) => {
    const refusal = this.refusalFor(raw, socket)
    if (refusal) {
      socket.end(`HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n${refusal}\n`)
      return
    }
    const member = this.join((text) => {
      if (!socket.destroyed) socket.write(SRV.textFrame(text))
    })
    if (!SRV.acceptWebSocket(raw, socket, { onText: (text) => member.receive(text) })) return member.leave()
    const stopPinging = every(PING_SECONDS, () => {
      if (!socket.destroyed) socket.write(SRV.pingFrame())
    })
    socket.on("close", () => {
      stopPinging()
      member.leave()
    })
  }

  /** Why this asker can't come in, if they can't. */
  private refusalFor(raw: IncomingMessage, socket: Duplex): string | undefined {
    const host = raw.headers.host ?? ""
    const asker = (socket as Duplex & { remoteAddress?: string }).remoteAddress
    if (!LOCAL_HOST.test(host) || (asker !== undefined && !LOCAL_ASKER.test(asker))) {
      return "This room runs on this machine only:  a hosted room needs its own sign-in, which doesn't exist yet."
    }
    const token = new URL(raw.url ?? "/", "http://localhost").searchParams.get("token")
    raw.headers[TOKEN_HEADER] = token ?? undefined
    try {
      const request = new SRV.Request(raw)
      this.guard.checkHost(request)
      this.guard.checkWrite(request)
    } catch (error) {
      return (error as Error).message
    }
    return undefined
  }

  /** A page is in the room, reached through `send`:  what it says goes to `receive()`.  Sockets and tests come in this way. */
  join(send: (text: string) => void): RoomMember {
    this.members.add(send)
    return {
      receive: (text) => this.heard(text, send),
      leave: () => {
        this.members.delete(send)
        if (this.people.delete(send)) this.tellPeople()
      }
    }
  }

  /** A page says who it is:  everyone's told who's here. */
  private isHere({ from, person }: Extract<RoomAsk, { kind: "here" }>, send: (text: string) => void): void {
    this.people.set(send, { ...person, page: from })
    this.tellPeople()
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
    switch (ask.kind) {
      case "catch-up":
        return this.catchUp(ask, answer)
      case "check":
        return this.check(ask, answer)
      case "here":
        return this.isHere(ask, send)
      case "changes":
        return void this.inTurn(() => this.makeChanges(ask.changes, ask.from, answer))
      case "call":
        return void this.inTurn(() => this.runAction(ask, answer))
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
   */
  private async makeChanges(
    changes: PlaceChange[],
    from: string,
    answer: (message: RoomAnswer) => void
  ): Promise<void> {
    const changeIds = changes.flatMap(({ changeId }) => changeId ?? [])
    const fresh = changes.filter(({ changeId }) => changeId === undefined || !this.made.has(changeId))
    if (!fresh.length) {
      const seq = Math.max(...changeIds.map((changeId) => this.made.get(changeId)!.seq))
      return answer({ kind: "seen", changeIds, seq })
    }
    try {
      await this.makeStep(
        fresh,
        from,
        fresh.flatMap(({ changeId }) => changeId ?? [])
      )
    } catch (error) {
      this.answerFailure(error, changeIds, answer)
    }
  }

  /** Run a named action, and make what it says:  its own check is on the row as it is now, in the one order. */
  private async runAction(
    { callId, name, input, from }: Extract<RoomAsk, { kind: "call" }>,
    answer: (message: RoomAnswer) => void
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
      if (changes.length) await this.makeStep(changes, from, [callId], result)
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
  private async makeStep(changes: PlaceChange[], from: string, changeIds: string[], result?: unknown): Promise<void> {
    const { settled, plan } = this.planned(changes)
    await this.writeToStore(settled, plan)
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

  /** Write `changes` to the store, as whole values:  what each thing will hold.  - throws what the store throws */
  private async writeToStore(changes: readonly PlaceChange[], plan: RoomPlan): Promise<void> {
    if (!this.place.apply) {
      throw new PlaceError("This room's store can't be written", { cause: { kind: "refused", whyNot: "place" } })
    }
    const makesIds = this.place.describe().makesIds
    const toStore = changes.map((change) => this.changeForStore(change, plan, makesIds))
    const keys = changes.map(({ collection, id }) => `${collection}\n${id}`)
    keys.forEach((key) => this.writing.add(key))
    try {
      const { rows } = await this.place.apply(toStore, {})
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
}
