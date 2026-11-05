import { DatabasePlace } from "spell/util/persist/DatabasePlace"

/** What one place keeps on a device, unless its line says otherwise:  `- keep a copy on this device`, 50 MB. */
export const DEVICE_COPY_MOST_BYTES = 50_000_000

/** The database copies are kept in:  its own, so clearing preferences leaves them, and the other way round. */
const DATABASE_NAME = "spell-device-copies"

/** The key a place's list of what it keeps is under. */
const INDEX_KEY = "index"

/** The key one answer's copy is under. */
const COPY_KEY = "copy:"

/** How many times a write the browser refused for room is tried again, each after discarding more. */
const ROOM_TRIES = 4

/** A copy's changes told together, so a page of things re-read behind it redraws once:  in ms. */
const CHANGES_TOLD_AFTER = 50

/** `Cache-Control`'s `max-age=N`. */
const MAX_AGE = /(?:^|,)\s*max-age\s*=\s*(\d+)/i

/** `Cache-Control`'s `no-store`:  the server says never to keep it. */
const NO_STORE = /(?:^|,)\s*no-store\b/i

/****************
 * ### `DeviceCopy`
 * A copy, on this device, of every answer one place gives to a read:  its lists, its pages, the things its links reach
 * (epic `data` P36).
 * - Only for a place whose line says so:  `- keep a copy on this device`, `- keep a copy on this device, up to 20 MB`.
 *   Without it, nothing is kept, and every visit reads the server.
 * - Each copy is FRESH until the place's next check time (`freshFor()`):  `check it once a day at 5am`, `every 5 minutes`.
 *   - A server's longer `Cache-Control: max-age` wins;  its `no-store` keeps nothing.
 *   - `WebPlace` answers a fresh copy with no request, and a stale one at once, reading the server behind it.
 * - What it keeps has a size limit, `mostBytes`:  over it, it discards what was READ least recently, not what was
 *   written least recently.  Every read moves a copy's last-read time on.
 *   - The browser refusing room (a quota error) discards the same way, then tries again.
 * - A copy for someone (`person`, a place with a key) is kept under who they are:  `forgetPerson()`, when they sign out.
 * - Kept in the browser's database (`DatabasePlace`, its own, `spell-device-copies`), one store per place, `scope`:
 *   - a list of what's kept, `index`:  each copy's size and times, read once, written as it changes
 *   - each answer's text and headers, under `copy:<address>`
 * - Knows nothing of rows or places:  answers by address, as text.
 ****************/
export class DeviceCopy {
  /** Whose copies these are:  the program and its place, `@owen/star-wars:star_wars`. */
  readonly scope: string
  /** The most it keeps, in bytes. */
  readonly mostBytes: number
  /** How long a copy kept now is fresh for, in ms:  until the place's next check time. */
  private readonly freshFor: () => number
  /** Where it's kept. */
  private readonly store: DeviceCopyStore
  /** The time now, in ms since 1970:  a test's own clock. */
  private readonly now: () => number
  /** Who's at this page, for a place where it matters:  their copies are theirs. */
  private readonly person: (() => string | undefined) | undefined
  /** What's kept, by address:  read from `index` once. */
  private notes = new Map<string, CopyNote>()
  /** Reads `index`:  once. */
  private opening: Promise<void> | undefined
  /** Writes in the order asked, so the last `index` written is the newest. */
  private writing: Promise<void> = Promise.resolve()
  /** Copies kept before this time are read from the server again, waited on:  `readFromServerNext()`. */
  private askServerFrom = 0
  /** Who hears that a copy re-read behind it changed. */
  private readonly changeListeners = new Set<() => void>()
  /** A change is waiting to be told. */
  private changeTold: ReturnType<typeof setTimeout> | undefined

  constructor({
    scope,
    mostBytes = DEVICE_COPY_MOST_BYTES,
    freshFor = () => 0,
    store = DeviceCopy.database,
    now = Date.now,
    person
  }: DeviceCopyProps) {
    this.scope = scope
    this.mostBytes = mostBytes
    this.freshFor = freshFor
    this.store = store
    this.now = now
    this.person = person
  }

  /**
   * The browser's database every copy on the page is kept in, made on first use.
   * - STATIC:  one database for the site, whichever place asks.
   */
  static get database(): DatabasePlace {
    return (DeviceCopy._database ??= new DatabasePlace({ name: DATABASE_NAME }))
  }
  private static _database: DatabasePlace | undefined

  ////////////////
  // ## Reading
  ////////////////

  /**
   * The copy kept of the answer at `address`, if there is one, for whoever's here.
   * - SIDE EFFECT:  its last-read time moves on, so it's the last to be discarded.
   * - NEVER throws:  a copy the browser can't read is no copy.
   */
  async read(address: string): Promise<KeptCopy | undefined> {
    await this.open()
    const note = this.notes.get(address)
    if (!note || note.person !== this.person?.()) return undefined
    const kept = (await this.safely(() => this.store.load(this.scope, COPY_KEY + address))) as KeptAnswer | undefined
    if (!kept) {
      this.notes.delete(address)
      return undefined
    }
    note.lastRead = this.now()
    this.saveIndex()
    return { address, ...kept, ...note }
  }

  /** Is `copy` fresh:  answered with no request? */
  isFresh(copy: KeptCopy): boolean {
    return this.now() < copy.freshUntil
  }

  /** Must `copy` be read from the server, and waited on:  kept before a reload asked for that? */
  mustAskServer(copy: KeptCopy): boolean {
    return copy.keptAt < this.askServerFrom
  }

  /** SIDE EFFECT:  every copy kept until now is read from the server again, waited on:  `reload the films`. */
  readFromServerNext(): void {
    this.askServerFrom = this.now() + 1
  }

  /** `copy` as an answer, as `fetch` would give it. */
  responseOf(copy: KeptAnswer): Response {
    return new Response(copy.body, { status: 200, headers: copy.headers })
  }

  ////////////////
  // ## Keeping
  ////////////////

  /**
   * Keep `response`'s answer as the copy for `address`:  an answer the same as it, for the caller to read.
   * - Kept only when it's OK, has a body, the server didn't say `no-store`, and it fits.
   * - SIDE EFFECT:  reads `response`'s body;  the keeping goes on after this answers.
   * - NEVER throws for keeping:  a copy that can't be kept is logged, and the answer stands.
   */
  async kept(address: string, response: Response): Promise<Response> {
    const body = await response.text()
    const headers = [...response.headers.entries()]
    const answer = new Response(hasNoBody(response.status) ? null : body, { status: response.status, headers })
    if (response.ok && !hasNoBody(response.status)) {
      void this.keep(address, { body, headers }).catch((ignored) => console.error(ignored))
    }
    return answer
  }

  /**
   * Keep `answer` as the copy for `address`, fresh until the place's next check time.
   * - Makes room first, discarding what was read least recently.  An answer bigger than `mostBytes` isn't kept.
   * - The browser refusing room:  discards more, and tries again.
   * - NEVER throws:  see `kept()`.
   */
  async keep(address: string, answer: KeptAnswer): Promise<void> {
    const freshUntil = this.freshUntilFor(answer.headers)
    if (freshUntil === undefined) return
    await this.open()
    const bytes = bytesOf(answer)
    this.notes.delete(address)
    if (bytes > this.mostBytes) {
      this.saveIndex()
      return
    }
    await this.makeRoom(this.mostBytes - bytes)
    const now = this.now()
    const person = this.person?.()
    for (let tries = 0; tries < ROOM_TRIES; tries++) {
      try {
        await this.inTurn(() => this.store.saveOrThrow(this.scope, COPY_KEY + address, answer))
        this.notes.set(address, { bytes, keptAt: now, freshUntil, lastRead: now, ...(person && { person }) })
        this.saveIndex()
        return
      } catch (error) {
        if (!isOutOfRoom(error)) {
          console.error(`DeviceCopy.keep():  the browser wouldn't keep a copy of ${address}:`, error)
          return
        }
        // a quarter of what's kept, the least read first, then try again
        await this.makeRoom(this.bytesKept - Math.max(bytes, this.bytesKept / 4))
      }
    }
    console.error(`DeviceCopy.keep():  the browser has no room for a copy of ${address}, even after discarding`)
  }

  /** How many bytes it keeps now. */
  get bytesKept(): number {
    let bytes = 0
    for (const note of this.notes.values()) bytes += note.bytes
    return bytes
  }

  /** The addresses it keeps, the least recently read first. */
  get addresses(): string[] {
    return this.byLastRead().map(([address]) => address)
  }

  /** Everything kept is settled:  for a test, and before the page reads the database itself. */
  async settled(): Promise<void> {
    await this.open()
    let writing: Promise<void>
    do {
      writing = this.writing
      await writing
    } while (writing !== this.writing)
  }

  ////////////////
  // ## Changes, and forgetting
  ////////////////

  /** Hear that a copy re-read from the server changed:  told once for what changed together.  Returns what stops it. */
  onChanged(listener: () => void): () => void {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  /** A copy re-read behind it changed:  tell who's listening, soon, once for everything changed with it. */
  tellChanged(): void {
    if (this.changeTold !== undefined) return
    this.changeTold = setTimeout(() => {
      this.changeTold = undefined
      for (const listener of this.changeListeners) listener()
    }, CHANGES_TOLD_AFTER)
  }

  /** Discard every copy kept for `person`:  they signed out.  NEVER throws. */
  async forgetPerson(person: string): Promise<void> {
    await this.open()
    const theirs = [...this.notes].filter(([, note]) => note.person === person).map(([address]) => address)
    await this.discard(theirs)
  }

  /** Discard every copy this place keeps.  NEVER throws. */
  async forgetAll(): Promise<void> {
    await this.open()
    this.notes.clear()
    await this.inTurn(() => this.store.removeUnder(this.scope, ""))
  }

  ////////////////
  // ## Inside
  ////////////////

  /** When a copy kept now stops being fresh:  `undefined` when the server says never to keep it (`no-store`). */
  private freshUntilFor(headers: readonly (readonly [string, string])[]): number | undefined {
    const cacheControl = headers.find(([name]) => /^cache-control$/i.test(name))?.[1] ?? ""
    if (NO_STORE.test(cacheControl)) return undefined
    const maxAge = Number(MAX_AGE.exec(cacheControl)?.[1] ?? 0) * 1000
    return this.now() + Math.max(this.freshFor(), maxAge)
  }

  /** Discard what was read least recently, until what's kept is `bytes` at most. */
  private async makeRoom(bytes: number): Promise<void> {
    let kept = this.bytesKept
    const discarding: string[] = []
    for (const [address, note] of this.byLastRead()) {
      if (kept <= bytes) break
      discarding.push(address)
      kept -= note.bytes
    }
    await this.discard(discarding)
  }

  /** Discard the copies at `addresses`. */
  private async discard(addresses: readonly string[]): Promise<void> {
    if (!addresses.length) return
    for (const address of addresses) this.notes.delete(address)
    this.saveIndex()
    await Promise.all(
      addresses.map((address) => this.inTurn(() => this.store.saveOrThrow(this.scope, COPY_KEY + address, undefined)))
    )
  }

  /** What's kept, the least recently read first. */
  private byLastRead(): Array<[string, CopyNote]> {
    return [...this.notes].sort(([, a], [, b]) => a.lastRead - b.lastRead)
  }

  /** Read `index`, once. */
  private open(): Promise<void> {
    return (this.opening ??= this.safely(() => this.store.load(this.scope, INDEX_KEY)).then((index) => {
      if (index && typeof index === "object") this.notes = new Map(Object.entries(index as Record<string, CopyNote>))
    }))
  }

  /** SIDE EFFECT:  `index` is written as it is now, after what's being written. */
  private saveIndex(): void {
    void this.inTurn(() => this.store.saveOrThrow(this.scope, INDEX_KEY, Object.fromEntries(this.notes))).catch(
      (ignored) => console.error("DeviceCopy:  couldn't write what it keeps;  the next change writes it again", ignored)
    )
  }

  /** Run `write` after every write asked before it.  Throws what it throws;  the next still runs. */
  private inTurn(write: () => Promise<void>): Promise<void> {
    const done = this.writing.then(write)
    this.writing = done.catch(() => undefined)
    return done
  }

  /** `read()`'s answer, or `undefined` if it throws:  logged. */
  private async safely(read: () => Promise<unknown>): Promise<unknown> {
    try {
      return await read()
    } catch (ignored) {
      console.error("DeviceCopy:  couldn't read a copy;  reading the server instead", ignored)
      return undefined
    }
  }
}

/** Constructor props of a `DeviceCopy`. */
export type DeviceCopyProps = {
  /** Whose copies these are:  the program and its place, so two programs' places of one name keep apart. */
  scope: string
  /** The most it keeps, in bytes:  default `DEVICE_COPY_MOST_BYTES`, 50 MB. */
  mostBytes?: number
  /** How long a copy kept now is fresh for, in ms:  until the place's next check time.  Default 0:  stale at once. */
  freshFor?: () => number
  /** Where it's kept:  default the browser's database, `DeviceCopy.database`. */
  store?: DeviceCopyStore
  /** The time now, in ms since 1970:  default `Date.now`, a test's own clock. */
  now?: () => number
  /** Who's at this page, for a place with a key or a sign-in:  each copy is theirs alone (`forgetPerson()`). */
  person?: () => string | undefined
}

/**
 * Where copies are kept:  `DatabasePlace`'s shape, values under a store and a key.
 * - `saveOrThrow()` throws when the browser refuses room, so a copy can make room and try again;  `undefined` removes.
 */
export type DeviceCopyStore = {
  /** The value under `store` and `key`, or `undefined`. */
  load(store: string, key: string): Promise<unknown>
  /** Keep `value` under `store` and `key`;  `undefined` removes it.  - throws when the browser refuses */
  saveOrThrow(store: string, key: string, value: unknown): Promise<void>
  /** Remove every value under `store` whose key starts with `prefix`. */
  removeUnder(store: string, prefix: string): Promise<void>
}

/** One answer, as kept:  its text and its headers. */
export type KeptAnswer = {
  /** Its body, as text. */
  body: string
  /** Its headers, as `[name, value]`:  a `Link` header pages, an `ETag` versions. */
  headers: Array<[string, string]>
}

/** What's noted of one copy, in `index`. */
type CopyNote = {
  /** How big it is, its text and headers. */
  bytes: number
  /** When it was kept, in ms since 1970. */
  keptAt: number
  /** When it stops being fresh. */
  freshUntil: number
  /** When it was last read:  the least recently read is discarded first. */
  lastRead: number
  /** Whose it is, on a place with a key or a sign-in. */
  person?: string
}

/** One copy, read:  its answer and what's noted of it. */
export type KeptCopy = KeptAnswer & CopyNote & { address: string }

/** The bytes `answer` takes:  its text and headers, as UTF-8. */
function bytesOf({ body, headers }: KeptAnswer): number {
  const encoder = new TextEncoder()
  let bytes = encoder.encode(body).length
  for (const [name, value] of headers) bytes += name.length + value.length
  return bytes
}

/** Does an answer of `status` carry no body:  `new Response()` refuses one? */
function hasNoBody(status: number): boolean {
  return status === 204 || status === 205 || status === 304
}

/** Is `error` the browser saying it has no room? */
function isOutOfRoom(error: unknown): boolean {
  return error instanceof Error && error.name === "QuotaExceededError"
}
