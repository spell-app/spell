import { pollWhileVisible } from "spell/util/polling"
import { ReconnectingSocket } from "spell/util/ReconnectingSocket"
import { after, type CancelablePromise } from "spell/util/timing"

import {
  answerFromCopy,
  RoomCopy,
  ROOM_ID_FIELD,
  type RoomAnswer,
  type RoomAsk,
  type RoomEntry,
  type RoomOverwrite,
  type RoomSnapshot
} from "./RoomCopy"
import {
  PlaceError,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type PlaceRow,
  type ReplacedValue,
  type SelectingContext,
  type WatchTarget
} from "./places.types"

/** What a room does:  nearly nothing of a query, as the engine does that from the copy it hands over. */
const ROOM_CAPABILITIES: PlaceCapabilities = {
  kind: "live room",
  idOf: ROOM_ID_FIELD,
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: ["insert", "update", "delete"],
  atomic: true,
  versionCheck: false,
  edits: true,
  live: "push",
  abort: "soft"
}

/** How long it waits for an answer before calling it no answer, and sending it again, in seconds. */
const ANSWER_SECONDS = 4

/** How often it compares its copy with the referee's, in seconds. */
const CHECK_SECONDS = 15

/** How many heals it remembers, to show. */
const HEALS_KEPT = 20

/** What set off a heal:  see `LiveRoomPlace`. */
export type RoomHealReason = "opening" | "reconnecting" | "a gap in the numbers" | "a failed check" | "a refusal"

/** One heal, as it happened. */
export type RoomHeal = {
  /** What set it off. */
  why: RoomHealReason
  /** How long from noticing to being back in step, ms. */
  ms: number
  /** Whether it took the whole copy, or only what was missed. */
  how: "snapshot" | "entries"
}

/** The socket a room uses, so a test can stand in for it:  `ReconnectingSocket`'s shape. */
export type RoomSocket = {
  /** Send this, if it can.  Answers whether it went. */
  send(text: string): boolean
  /** Stop for good. */
  close(): void
  /** Is it open? */
  readonly isOpen: boolean
}

/** What a socket tells a room. */
export type RoomSocketListeners = {
  /** It opened. */
  onOpen(): void
  /** A message came. */
  onMessage(text: string): void
  /** It closed. */
  onClose(): void
}

/****************
 * ### `LiveRoomPlace`
 * A shared space:  everyone's changes put in one order by one `Referee` (`spell/server/places`), over a websocket (epic `data` P8).
 *
 * ```ts
 * const room = new LiveRoomPlace({ url: "/api/rooms/recipes" })
 * places.add("recipes", room)
 * places.heal.follow({ placeName: "recipes", collection: "recipes" })
 * ```
 *
 * - The screen is always the referee's copy (`RoomCopy`), with my pending changes replayed on top:  so my own change never
 *   flickers, and no special case says so.
 * - ONE heal routine:  ask what I missed, replace what's wrong, replay.  Five things set it off:
 *   - opening, and reconnecting
 *   - a gap in the numbers:  I missed something
 *   - a periodic checksum, and coming back to the tab (`pollWhileVisible()`):  that catches bugs too, not only lost messages
 *   - a refusal
 * - Nothing else has to be right for that to stay right, so a bug heals as a lost message does.
 * - Heals say what changed the way anything does:  `watch()`, so `PlaceHeal.follow()` is all that listens.
 * - No answer (`apply()` timed out, or there's no socket) is an ordinary failure:  `PendingChanges` sends it again with the
 *   same `changeId`, which the referee makes once.  The answer no is a `PlaceError`.
 * - A change's `version` says what this page had seen (`versionOf()`).  It never refuses a change:  it's how the referee can
 *   say what was overwritten, so the loser is told (`lost`), and a change made while offline can say so too (`overwrote`).
 * - TRUSTS everyone in the room:  there are no per-person rules yet.  Whoever's in can change anything.
 * - `can`:  nothing it does needs saying, but tests and programs may override.
 * - Connects at its first use.  `close()` stops it, and what's changed meanwhile stays pending until `connect()`.
 ****************/
export class LiveRoomPlace implements Place {
  /** Names this page to the referee:  so it knows its own changes coming back. */
  readonly clientId = newId("p")
  /** The last heals, oldest first:  for showing, and for measuring. */
  readonly heals: RoomHeal[] = []

  /** What it can do. */
  private readonly capabilities: PlaceCapabilities
  /** Where the referee is. */
  private readonly address: string | URL
  /** Makes the socket. */
  private readonly connectTo: LiveRoomPlaceProps["socket"]
  /** How long it waits for an answer, in seconds. */
  private readonly answerSeconds: number
  /** How often it checks its copy, in seconds. */
  private readonly checkSeconds: number
  /** The socket, once it's connected. */
  private socket: RoomSocket | undefined
  /** Stops the checks. */
  private stopChecks: (() => void) | undefined
  /** The referee's rows, as far as this page has heard. */
  private readonly copy = new RoomCopy()
  /** The last step it took in. */
  private seq = 0
  /** Which run of the referee that's from:  the numbers start again when it restarts. */
  private run: string | undefined
  /** It has the referee's copy:  what a read waits for. */
  private hasCopy = false
  /** Reads waiting for the first copy. */
  private readonly waitingForCopy = new Set<{ resolve: () => void; reject: (error: Error) => void }>()
  /** Batches sent and not yet answered, by each `changeId` in them:  a batch sent again may be answered by any. */
  private readonly waiting = new Map<string, WaitingAnswer>()
  /** A catch-up on its way:  noticing again doesn't ask again. */
  private healing: { why: RoomHealReason; since: number } | undefined
  /** When it last compared its copy with the referee's. */
  private checkSentAt = 0
  /** Which step it had caught up to once this connection opened:  a change made from before that was made offline. */
  private seqOnConnecting = 0
  /** Who's watching. */
  private readonly watchers = new Set<{ target: WatchTarget; onEvent: (event: PlaceEvent) => void }>()
  /** Who wants to know the connection's back, or gone. */
  private readonly backListeners = new Set<() => void>()
  /** Who wants to know the connection changed. */
  private readonly connectionListeners = new Set<(isConnected: boolean) => void>()
  /** It was told to stop:  a write waits for `connect()`. */
  private wasClosed = false
  /** It has opened before:  the next opening is a reconnect. */
  private hasOpened = false

  constructor({
    url,
    token,
    can,
    socket,
    answerSeconds = ANSWER_SECONDS,
    checkSeconds = CHECK_SECONDS
  }: LiveRoomPlaceProps) {
    this.capabilities = { ...ROOM_CAPABILITIES, ...can }
    this.address = addressWithToken(url, token ?? pageToken())
    this.connectTo = socket
    this.answerSeconds = answerSeconds
    this.checkSeconds = checkSeconds
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return this.capabilities
  }

  ////////////////
  // ## The connection
  ////////////////

  /**
   * Open the connection, if it isn't.  The first read, write or watch does this by itself;  after `close()`, only this does.
   * - SIDE EFFECT:  starts the checks.
   */
  connect(): this {
    this.wasClosed = false
    if (this.socket) return this
    const listeners: RoomSocketListeners = {
      onOpen: () => this.opened(),
      onMessage: (text) => this.heard(text),
      onClose: () => this.tellConnection()
    }
    this.socket = this.connectTo
      ? this.connectTo(listeners)
      : new ReconnectingSocket(this.address, { ...listeners, firstWait: 250 })
    this.stopChecks = pollWhileVisible(this.checkSeconds, () => this.check())
    return this
  }

  /** Stop:  the connection closes, and nothing tries again until `connect()`.  What's waiting fails, as no answer. */
  close(): void {
    this.wasClosed = true
    this.stopChecks?.()
    this.stopChecks = undefined
    this.socket?.close()
    this.socket = undefined
    this.tellConnection()
  }

  /** Is it connected to its referee right now? */
  get isConnected(): boolean {
    return !!this.socket?.isOpen
  }

  /** Hear the connection go or come back.  Returns what stops it. */
  onConnection(listener: (isConnected: boolean) => void): () => void {
    this.connectionListeners.add(listener)
    return () => this.connectionListeners.delete(listener)
  }

  /** Hear each time the connection comes back:  what's waiting can go now.  Returns what stops it. */
  onBack(listener: () => void): () => void {
    this.backListeners.add(listener)
    return () => this.backListeners.delete(listener)
  }

  /** Connect, unless it was told to stop. */
  private startIfNew(): void {
    if (!this.wasClosed) this.connect()
  }

  /** The socket's open:  get back in step, then send what's waiting. */
  private opened(): void {
    const why = this.hasOpened ? "reconnecting" : "opening"
    this.hasOpened = true
    this.healing = undefined
    this.heal(why)
    this.tellConnection()
    this.backListeners.forEach((listener) => listener())
  }

  /** Say where the connection stands. */
  private tellConnection(): void {
    const { isConnected } = this
    this.connectionListeners.forEach((listener) => listener(isConnected))
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * The rows of `collection`, from this page's copy of the referee's:  the engine does the rest of the query.
   * - The first read waits for that copy;  no answer in time throws, as any place with no answer does.
   * - Later reads answer at once, what it last heard, with the connection up or not.
   */
  async list(collection: string, _query: ListQuery, { signal }: PlaceContext): Promise<ListAnswer> {
    await this.copyReady(signal)
    return { rows: this.copy.rowsOf(collection), handled: {}, version: `${this.seq}` }
  }

  /** The rows of `collection` with these ids. */
  async getMany(collection: string, ids: readonly string[], { signal }: SelectingContext): Promise<PlaceRow[]> {
    await this.copyReady(signal)
    return ids.flatMap((id): PlaceRow[] => {
      const row = this.copy.rowFor(collection, id)
      return row ? [row] : []
    })
  }

  /** The row as this page's copy holds it now. */
  rowKnown(collection: string, id: string): PlaceRow | undefined {
    return this.copy.rowFor(collection, id)
  }

  /** What this page has seen:  a change made now says so.  Never makes a change "out of date":  see the class. */
  versionOf(_collection: string, _id: string): string | undefined {
    return this.hasCopy ? `${this.seq}` : undefined
  }

  /** Once the first copy's here.  - throws an ordinary `Error` for no answer, or what `signal` aborted with */
  private copyReady(signal: AbortSignal | undefined): Promise<void> {
    this.startIfNew()
    if (this.hasCopy) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const waiter = { resolve: () => done(), reject: (error: Error) => done(error) }
      const onAbort = () => done(signal!.reason as Error)
      const timer = after(this.answerSeconds, () => done(this.noAnswer()))
      const done = (error?: Error) => {
        timer.cancel()
        signal?.removeEventListener("abort", onAbort)
        this.waitingForCopy.delete(waiter)
        if (error) reject(error)
        else resolve()
      }
      this.waitingForCopy.add(waiter)
      signal?.addEventListener("abort", onAbort, { once: true })
    })
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, all or none, and answer with each row as it's now kept.
   * - throws `PlaceError` when the referee says no, and an ordinary `Error` for no answer in time:  it goes again, with
   *   the same `changeId`s
   */
  apply(changes: readonly PlaceChange[], _context: PlaceContext): Promise<ApplyAnswer> {
    this.startIfNew()
    if (!changes.length) return Promise.resolve({ rows: [] })
    const stamped = changes.map((change) => (change.changeId ? change : { ...change, changeId: newId("c") }))
    const message: RoomAsk = { kind: "changes", from: this.clientId, changes: stamped }
    const keys = stamped.map(({ changeId }) => changeId!)
    return this.askAndWait(keys, message, () => answerFromCopy(this.copy, stamped))
  }

  /**
   * Run the referee's action called `name`:  it reads what's there now and writes, in the one order.
   * - throws `PlaceError` for a refusal:  someone got there first
   */
  call(name: string, input: unknown, _context: SelectingContext): Promise<unknown> {
    this.startIfNew()
    const callId = newId("c")
    const message: RoomAsk = { kind: "call", from: this.clientId, callId, name, input }
    return this.askAndWait([callId], message, (result) => result)
  }

  /** Send `message` and wait for its answer, whoever brings it. */
  private askAndWait<T>(keys: readonly string[], message: RoomAsk, answerWith: (result: unknown) => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiting: WaitingAnswer = {
        text: JSON.stringify(message),
        resolve: (result) => this.finish(keys, waiting, () => resolve(answerWith(result))),
        reject: (error) => this.finish(keys, waiting, () => reject(error)),
        timer: after(this.answerSeconds, () => waiting.reject(this.noAnswer()))
      }
      keys.forEach((key) => this.waiting.set(key, waiting))
      this.socket?.send(waiting.text)
    })
  }

  /** `waiting` has its answer:  stop waiting, and give it. */
  private finish(keys: readonly string[], waiting: WaitingAnswer, give: () => void): void {
    waiting.timer.cancel()
    keys.forEach((key) => this.waiting.delete(key))
    give()
  }

  /** The error for no answer:  an ordinary one, so it's sent again. */
  private noAnswer(): Error {
    return new Error(this.isConnected ? "the room didn't answer in time" : "not connected to the room")
  }

  /** Send again everything still waiting:  it's made once, however often it's sent. */
  private resendWaiting(): void {
    for (const { text } of new Set(this.waiting.values())) this.socket?.send(text)
  }

  ////////////////
  // ## Watching
  ////////////////

  /** Tell `onEvent` of each change to `target` this page didn't make:  someone else's, or a heal's.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    this.startIfNew()
    const watcher = { target, onEvent }
    this.watchers.add(watcher)
    return () => this.watchers.delete(watcher)
  }

  /** Tell whoever's watching. */
  private tell(event: PlaceEvent): void {
    for (const { target, onEvent } of [...this.watchers]) {
      const isWatched = target.collection === event.collection && (target.id === undefined || target.id === event.id)
      if (isWatched) onEvent(event)
    }
  }

  ////////////////
  // ## Hearing the referee
  ////////////////

  /** A message came.  One that can't be read is logged, and the next check heals whatever it held. */
  private heard(text: string): void {
    let answer: RoomAnswer
    try {
      answer = JSON.parse(text) as RoomAnswer
    } catch (error) {
      return console.error("LiveRoomPlace:  a message that isn't JSON;  the next check heals what it held", error)
    }
    switch (answer.kind) {
      case "snapshot":
        return this.tookSnapshot(answer)
      case "entries":
        return this.tookEntries(answer.run, answer.entries)
      case "entry":
        return this.tookEntry(answer.run, answer.entry)
      case "seen":
        return this.tookSeen(answer)
      case "called":
        return this.waiting.get(answer.callId)?.resolve(answer.result)
      case "refused":
        return this.tookRefusal(answer)
      case "no answer":
        return this.tookNoAnswer(answer)
      default:
        /* "at" */ return this.tookWhereItStands(answer)
    }
  }

  /** One more step.  Out of step (a gap, another run):  it isn't taken in, and a heal fetches what's missing. */
  private tookEntry(run: string, entry: RoomEntry): void {
    if (run !== this.run) return this.heal("a gap in the numbers")
    if (entry.seq <= this.seq) return void this.settleOwn(entry)
    if (entry.seq !== this.seq + 1) return this.heal("a gap in the numbers")
    this.takeIn(entry)
  }

  /** What was missed, each in turn, as if it had come. */
  private tookEntries(run: string, entries: RoomEntry[]): void {
    if (run !== this.run) return this.healAll("a gap in the numbers")
    for (const entry of entries) {
      if (entry.seq <= this.seq) this.settleOwn(entry)
      else if (entry.seq === this.seq + 1) this.takeIn(entry)
      else return this.healAll("a gap in the numbers")
    }
    this.healed("entries")
  }

  /** Take `entry` in:  change the copy, answer what it answers, and tell what someone else changed. */
  private takeIn(entry: RoomEntry): void {
    const isMine = entry.from === this.clientId
    const before = new Map(
      entry.changes.map(({ collection, id }) => [`${collection}\n${id}`, this.copy.rowFor(collection, id!)])
    )
    try {
      this.copy.commit(this.copy.plan(entry.changes))
    } catch (error) {
      // the referee made it from what it holds, so what's different is here:  the whole copy, then
      console.error("LiveRoomPlace:  a change that can't be made on this copy;  healing", error)
      return this.healAll("a gap in the numbers")
    }
    this.seq = entry.seq
    const wasAwaited = this.settleOwn(entry)
    const replaced = this.replacedBy(entry, isMine)
    const told = new Set<string>()
    for (const { collection, id, changeId } of entry.changes) {
      const key = `${collection}\n${id}`
      if (told.has(key)) continue
      told.add(key)
      const said = replaced.get(key)
      // what's being answered shows through its answer;  but not what an action of mine made on the referee, with no id of
      // mine, nor a change of mine whose answer was given up on before this came
      if (isMine && wasAwaited && changeId !== undefined && !said) continue
      const row = this.copy.rowFor(collection, id!)
      const was = before.get(key)
      this.tell({
        collection,
        id: id!,
        ...(row && { row }),
        ...(!row && was && { was }),
        ...said
      })
    }
  }

  /** What `entry` replaced that this page should hear of, by thing. */
  private replacedBy(entry: RoomEntry, isMine: boolean): Map<string, Pick<PlaceEvent, "lost" | "overwrote">> {
    const said = new Map<string, Pick<PlaceEvent, "lost" | "overwrote">>()
    const add = (over: RoomOverwrite, side: "lost" | "overwrote", value: ReplacedValue) => {
      const key = `${over.collection}\n${over.id}`
      const ofThing = said.get(key) ?? {}
      said.set(key, { ...ofThing, [side]: [...(ofThing[side] ?? []), value] })
    }
    for (const over of entry.overwrote ?? []) {
      const { field, value } = over
      const now = this.copy.rowFor(over.collection, over.id)?.[field]
      if (over.from === this.clientId && !isMine) add(over, "lost", { field, mine: value, theirs: now })
      if (isMine && this.wasMadeOffline(entry, over)) add(over, "overwrote", { field, mine: now, theirs: value })
    }
    return said
  }

  /** Was this change of mine made before this connection opened? */
  private wasMadeOffline({ changes }: RoomEntry, { collection, id }: RoomOverwrite): boolean {
    const change = changes.find((one) => one.collection === collection && one.id === id)
    return change?.version !== undefined && Number(change.version) < this.seqOnConnecting
  }

  /** If `entry` is what something here is waiting for, that's its answer.  Answers whether it was. */
  private settleOwn({ from, changes }: RoomEntry): boolean {
    if (from !== this.clientId) return false
    let wasAwaited = false
    for (const { changeId } of changes) {
      const waiting = changeId === undefined ? undefined : this.waiting.get(changeId)
      if (!waiting) continue
      wasAwaited = true
      waiting.resolve(undefined)
    }
    return wasAwaited
  }

  /** It's all here already:  the answer's yes.  What's missing of it comes as a gap would. */
  private tookSeen({ changeIds, seq, result }: Extract<RoomAnswer, { kind: "seen" }>): void {
    for (const changeId of changeIds) this.waiting.get(changeId)?.resolve(result)
    if (seq > this.seq) this.heal("a gap in the numbers")
  }

  /** The referee says no:  that's a `PlaceError`.  And something's off, so heal. */
  private tookRefusal({ changeIds, errorKind, message }: Extract<RoomAnswer, { kind: "refused" }>): void {
    const error = new PlaceError(message, { cause: { kind: errorKind } })
    for (const changeId of changeIds) this.waiting.get(changeId)?.reject(error)
    this.heal("a refusal")
  }

  /** It couldn't be made just now:  it goes again. */
  private tookNoAnswer({ changeIds, message }: Extract<RoomAnswer, { kind: "no answer" }>): void {
    for (const changeId of changeIds) this.waiting.get(changeId)?.reject(new Error(message))
  }

  /** Where the room stands:  behind it, or a run of the referee I don't know, and it's time to heal. */
  private tookWhereItStands({ run, seq }: Extract<RoomAnswer, { kind: "at" }>): void {
    if (run !== this.run) this.healAll("a failed check")
    else if (seq > this.seq) this.heal("a failed check")
  }

  ////////////////
  // ## Healing
  ////////////////

  /** Compare with the referee:  the periodic check, and on coming back to the tab. */
  private check(): void {
    if (!this.hasCopy) return this.heal("opening")
    this.checkSentAt = Date.now()
    this.send({
      kind: "check",
      ...(this.run !== undefined && { run: this.run }),
      seq: this.seq,
      checksum: this.copy.checksum
    })
  }

  /** Ask for what's been missed, unless that's being asked. */
  private heal(why: RoomHealReason): void {
    // an answer that never came doesn't hold up the next try
    if (this.healing && Date.now() - this.healing.since < this.answerSeconds * 1000) return
    this.startHeal(why)
    this.send({
      kind: "catch-up",
      ...(this.run !== undefined && this.hasCopy && { run: this.run, since: this.seq })
    })
  }

  /** Ask for everything:  what's here can't be trusted. */
  private healAll(why: RoomHealReason): void {
    this.startHeal(why)
    this.send({ kind: "catch-up" })
  }

  /** Note the time, for how long it took. */
  private startHeal(why: RoomHealReason): void {
    this.healing = { why, since: Date.now() }
  }

  /** Everything's replaced:  whatever differs is told, as if it had happened.  Removed things are told with what they held. */
  private tookSnapshot({ run, seq, rows }: Extract<RoomAnswer, { kind: "snapshot" }>): void {
    this.healing ??= { why: "a failed check", since: this.checkSentAt }
    const incoming = new RoomCopy(rows)
    const changed = this.differences(incoming, rows)
    this.copy.replaceWith(rows)
    this.seq = seq
    this.run = run
    const isFirst = !this.hasCopy
    this.hasCopy = true
    if (!isFirst) changed.forEach((event) => this.tell(event))
    if (isFirst) this.waitingForCopy.forEach(({ resolve }) => resolve())
    this.healed("snapshot")
  }

  /** What's different in `incoming` from what's here. */
  private differences(incoming: RoomCopy, rows: RoomSnapshot): PlaceEvent[] {
    const events: PlaceEvent[] = []
    for (const collection of new Set([...this.copy.collectionNames, ...Object.keys(rows)])) {
      const before = new Map(this.copy.rowsOf(collection).map((row) => [`${row[ROOM_ID_FIELD] as string}`, row]))
      for (const row of incoming.rowsOf(collection)) {
        const id = `${row[ROOM_ID_FIELD] as string}`
        if (JSON.stringify(before.get(id)) !== JSON.stringify(row)) events.push({ collection, id, row })
        before.delete(id)
      }
      for (const [id, was] of before) events.push({ collection, id, was })
    }
    return events
  }

  /** Back in step:  note how long it took, and send again what's still waiting. */
  private healed(how: RoomHeal["how"]): void {
    if (this.healing) {
      const { why, since } = this.healing
      if (why === "reconnecting" || why === "opening") this.seqOnConnecting = this.seq
      this.heals.push({ why, ms: Date.now() - since, how })
      if (this.heals.length > HEALS_KEPT) this.heals.shift()
    }
    this.healing = undefined
    this.resendWaiting()
  }

  /** Send `message`, if it can:  a heal that can't go comes again as the socket opens. */
  private send(message: RoomAsk): void {
    this.socket?.send(JSON.stringify(message))
  }
}

/** Constructor props of a `LiveRoomPlace`. */
export type LiveRoomPlaceProps = {
  /** Where its referee listens:  `Referee`'s `path`, on the server that holds it. */
  url: string | URL
  /** The token it wants, when it isn't this page's own server's. */
  token?: string
  /** What it does, over a plain room's. */
  can?: Partial<PlaceCapabilities>
  /** Makes its socket, for a test:  default a `ReconnectingSocket`. */
  socket?: (listeners: RoomSocketListeners) => RoomSocket
  /** How long it waits for an answer, in seconds. */
  answerSeconds?: number
  /** How often it compares its copy with the referee's, in seconds. */
  checkSeconds?: number
}

/** A batch waiting for its answer. */
type WaitingAnswer = {
  /** What was sent. */
  text: string
  /** Its answer's yes. */
  resolve: (result: unknown) => void
  /** Its answer's no, or there's none. */
  reject: (error: Error) => void
  /** When to stop waiting. */
  timer: CancelablePromise<unknown>
}

/**
 * `url`, with the token in it:  a page can't set a header on a websocket, so it rides in the address.
 * - The referee reads it there, for the same check as any request (`Guard`).
 */
function addressWithToken(url: string | URL, token: string | undefined): string | URL {
  if (token === undefined) return url
  const base = typeof location === "undefined" ? "http://localhost" : location.href
  const address = new URL(url, base)
  address.searchParams.set("token", token)
  return address
}

/** The write token of the server that served this page. */
function pageToken(): string | undefined {
  return (globalThis as { SPELL_SERVER?: { token?: string } }).SPELL_SERVER?.token
}

/** A new id, unique across browsers:  `crypto`'s, as `randomUUID()` needs a secure page. */
function newId(prefix: string): string {
  const [high, low] = crypto.getRandomValues(new Uint32Array(2))
  return `${prefix}-${high!.toString(36)}${low!.toString(36)}`
}
