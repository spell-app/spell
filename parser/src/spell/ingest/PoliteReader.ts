import { backoffFor, rateLimitLeft, rateLimitResetAt, retryAfter } from "spell/util/retrying"
import { clockTime } from "spell/util/time"
import { after } from "spell/util/timing"
import { addressWithoutKey, keyHidden, putKeyOn, type KeyGoes } from "spell/places/keyGoes"
import { ROOM_TOKEN_PROTOCOL, type RoomAnswer, type RoomAsk } from "spell/places/RoomCopy"

import { IngestStopped, type ReaderSession } from "./ingest.types"

/** Says who's asking, so a server's owner can see and say no. */
export const READER_NAME = "spell-place-ingest (+https://github.com/spell-app/spell)"

/**
 * The page it asks as, in an `Origin` header:  a server says whether a page may read it only when a page asks
 * (Open Library's `access-control-allow-origin: *` comes only then).
 */
export const READER_ORIGIN = "https://example.com"

/** The most requests one look makes, in all. */
const MOST_REQUESTS = 60

/** The most bytes it reads of one answer. */
const MOST_BYTES_AN_ANSWER = 2_000_000

/** The most bytes one look reads, in all. */
const MOST_BYTES = 12_000_000

/** How long it waits between requests. */
const GAP_MS = 250

/** How long it gives one request. */
const TIMEOUT_MS = 20_000

/** The longest it waits when told to wait. */
const LONGEST_WAIT_MS = 15_000

/** How many times it asks again, when told to wait. */
const MOST_RETRIES = 2

/** The headers worth keeping:  limits, versions, who may read it, how it pages.  Never a cookie. */
const KEPT_HEADERS =
  /^(?:(?:x-)?rate-?limit.*|retry-after|(?:x-)?api-version|.*-version|allow|access-control-allow-.*|content-type|etag|link|cache-control|server)$/i

/** The most redirects one request of a signed-in session follows. */
const MOST_REDIRECTS = 5

/** A GraphQL request's body that only reads. */
const ONLY_READS = /^\s*(?:query\b|\{)/

/** What a place server calls a read:  its other requests write (epic `data` T71). */
const PLACE_SERVER_READS = /\/(?:list|getMany)$/

/** How long it waits for a room to say what it holds. */
const ROOM_TIMEOUT_MS = 20_000

/** Makes a websocket:  the platform's, or a test's. */
export type MakesSocket = new (url: string, protocols?: string | string[]) => WebSocket

/** What one request answered. */
export type ReadAnswer = {
  /** Its status. */
  status: number
  /** Its text, cut at the most it reads, with any key taken out. */
  text: string
  /** Its headers. */
  headers: Headers
  /** It was longer than the most it reads. */
  isCut: boolean
  /** Where it answered from, after any redirect:  swapi's `/people` answers from `/people/`. */
  url: string
  /** Its bytes, cut as `text` is, for a file that isn't text (an Excel workbook):  only when `read()` asks for them. */
  bytes?: Uint8Array
}

/**
 * Reads a source the polite way:  everything `spell place ingest` sends goes through here.
 * - Asks the way a well-behaved page would:
 *   - names itself
 *   - asks as a page would (`READER_ORIGIN`), so a server says whether pages may read it
 *   - leaves a gap between requests
 *   - waits when told to (a 429 or a 503), as long as `Retry-After` says
 * - Minds a rate limit its answers name (GitHub's `x-ratelimit-remaining`, `x-ratelimit-reset`):
 *   with none left, it waits for the reset, if that's soon, and else stops, saying when it is.
 * - Stops at a size:  so many requests, so many bytes an answer, so many in all.
 * - NEVER sends a write, but through `tryWrite()`, when the person said it may (`--try-writes`):
 *   - `fetch` refuses anything but a `GET`, a `HEAD`, a GraphQL query, or a place server's own reads where it reads one
 *     (`readPlaceServer()`), whoever asks
 *   - so a read through the Spell can't write either
 * - The key goes on each request, where its server wants it (`keyGoes`, epic `data` T73),
 *   and its value is taken out of whatever comes back, should a server say it again:  its text, its headers, where it landed.
 * - A signed-in session goes the same way (epic `mockup` P12):  its cookies only to their own host, and its values
 *   taken out of what comes back.
 *   - It asks as itself, not as another page, which a signed-in server may refuse.
 *   - It follows redirects itself, so a cookie never follows one elsewhere:
 *     sent to sign in, or a 401, and it stops, saying the session has ended.
 * - Plain web APIs, no node:  `fetch` is handed in.
 */
export class PoliteReader {
  /** What really reaches the source. */
  private readonly send: typeof globalThis.fetch
  /** Waits. */
  private readonly sleep: (msec: number) => Promise<void>
  /** The key's value. */
  private readonly key: string | undefined
  /** Where that key goes on a request:  left out, `Authorization: Bearer`. */
  private readonly keyGoes: KeyGoes | undefined
  /** The signed-in session. */
  private readonly session: ReaderSession | undefined
  /** How many requests so far. */
  private requests = 0
  /** How many bytes so far. */
  private bytes = 0
  /** When the last one went. */
  private lastAt = 0
  /** It reads a place server, whose reads are `POST`s:  it asks as itself, not as a page (`readPlaceServer()`). */
  private readsPlaceServer = false
  /** Opens a room. */
  private readonly Socket: MakesSocket | undefined
  /** How many requests its rate limit last said were left. */
  private limitLeft: number | undefined
  /** When its rate limit last said it resets, in msec since 1970. */
  private limitResetAt: number | undefined

  constructor({
    fetch,
    key,
    keyGoes,
    session,
    Socket = globalThis.WebSocket,
    sleep = (msec) => after(msec / 1000)
  }: {
    fetch: typeof globalThis.fetch
    key?: string
    keyGoes?: KeyGoes
    session?: ReaderSession
    Socket?: MakesSocket
    sleep?: (msec: number) => Promise<void>
  }) {
    this.send = fetch
    this.key = key
    this.keyGoes = keyGoes
    this.session = session
    this.Socket = Socket
    this.sleep = sleep
  }

  /** Is there still room to ask, within what one look may? */
  get hasRoom(): boolean {
    return this.requests < MOST_REQUESTS && this.bytes < MOST_BYTES
  }

  /**
   * SIDE EFFECT:  from now on it may `POST` a place server's reads, and only those (epic `data` T71):
   * a data folder, a file or an Airtable, behind a `PlaceServer`.
   * - It names no page it asks from:  a place server takes a token, and refuses a page from elsewhere.
   */
  readPlaceServer(): void {
    this.readsPlaceServer = true
  }

  /** The look's done, and a read through the Spell starts:  it gets as much again. */
  startAgain(): void {
    this.requests = 0
    this.bytes = 0
  }

  /**
   * `GET` this address, or `POST` this GraphQL query.
   * - NEVER throws for an answer, whatever its status;  throws what `fetch` threw, for none;  `IngestStopped` past the limits
   */
  async read(
    url: string,
    { query, accept, bytes }: { query?: string; accept?: string; bytes?: boolean } = {}
  ): Promise<ReadAnswer> {
    const init: RequestInit = query
      ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) }
      : { headers: accept ? { accept } : {} }
    return this.answerTo(url, init, "only reads", bytes ? "bytes too" : "text")
  }

  /**
   * A `fetch` for a program to run on:  the same manners, the same limits, and it can't write.
   * - An answer that isn't text (an Excel workbook) is handed on as its bytes;  text has the key taken out, as `read()`'s.
   * - throws `IngestStopped` for a write, and past the limits
   */
  readonly fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : `${input instanceof URL ? input.href : input}`
    const method = init?.method ?? (input instanceof Request ? input.method : "GET")
    const answer = await this.answerTo(url, { ...init, method }, "only reads", "bytes too")
    const { status, text, headers, isCut, bytes } = answer
    if (isCut) throw new IngestStopped(`${url} answered with more than ${MOST_BYTES_AN_ANSWER} bytes:  it's left out`)
    if (status === 204 || status === 304) return new Response(null, { status, headers })
    return new Response(bytes && !isText(bytes) ? new Uint8Array(bytes) : text, { status, headers })
  }

  /**
   * Ask a place server for rows, as a `RemotePlace` does:  `POST <address>/list` (epic `data` T71).
   * - NEVER throws for an answer, whatever its status;  as `read()` otherwise
   */
  async askPlaceServer(address: string, collection: string): Promise<ReadAnswer> {
    this.readPlaceServer()
    const body = JSON.stringify({ collection, query: {} })
    return this.answerTo(`${address}/list`, { method: "POST", headers: { "content-type": "application/json" }, body })
  }

  /**
   * Every row a room holds, by collection:  it asks the room's referee for its whole copy, says nothing else, and leaves
   * (epic `data` T71).
   * - It doesn't say who's here, so nobody in the room sees it come.
   * - The key, when there is one, is its server's run token, as the socket's sub-protocol (`ROOM_TOKEN_PROTOCOL`).
   * - throws `IngestStopped` for no answer in time, a socket that can't open, and past the limits
   */
  async roomRows(url: string): Promise<Record<string, Array<Record<string, unknown>>>> {
    const { Socket } = this
    if (!Socket) throw new IngestStopped("nothing here can open a room:  this needs a platform with websockets")
    if (!this.hasRoom)
      throw new IngestStopped(`stopped reading at its limit, ${MOST_REQUESTS} requests or ${MOST_BYTES} bytes`)
    await this.waitForGap()
    this.requests++
    const stopped = () => new IngestStopped(`${url} didn't let it in, or didn't say what it holds`)
    return new Promise((resolve, reject) => {
      const socket = new Socket(url, this.key === undefined ? [] : [`${ROOM_TOKEN_PROTOCOL}${this.key}`])
      const done = (finish: () => void) => {
        clearTimeout(timer)
        socket.close()
        finish()
      }
      const timer = setTimeout(() => done(() => reject(stopped())), ROOM_TIMEOUT_MS)
      socket.onerror = () => done(() => reject(stopped()))
      socket.onopen = () => socket.send(JSON.stringify({ kind: "catch-up" } satisfies RoomAsk))
      socket.onmessage = ({ data }) => {
        const answer = JSON.parse(`${data as string}`) as RoomAnswer
        if (answer.kind === "snapshot") done(() => resolve(answer.rows))
      }
    })
  }

  /**
   * Send one write, only because the person said it may (`--try-writes`;  epic `data` P30):
   * to a server that keeps nothing, as JSONPlaceholder keeps nothing, or one they don't mind writing to.
   * - NEVER through `fetch`:  a read through the Spell still can't write.
   * - NEVER throws for an answer, whatever its status;  as `read()` otherwise
   */
  async tryWrite(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ReadAnswer> {
    const sent =
      body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
    return this.answerTo(url, { method, ...sent }, "may write")
  }

  /**
   * Ask, with manners, as the class says.
   * - `writes`:  only `tryWrite()` says it may.
   * - `body`:  its bytes too, only when asked:  the key is taken out of its text alone.
   */
  private async answerTo(
    url: string,
    init: RequestInit,
    writes: "only reads" | "may write" = "only reads",
    body: "text" | "bytes too" = "text"
  ): Promise<ReadAnswer> {
    const method = (init.method ?? "GET").toUpperCase()
    const isPlaceServerRead = this.readsPlaceServer && method === "POST" && PLACE_SERVER_READS.test(pathOf(url))
    if (writes === "only reads" && !isPlaceServerRead) refuseWrite(url, method, init.body)
    const headers = new Headers(init.headers)
    headers.set("user-agent", READER_NAME)
    // a browser sets its own, and won't let a page:  so only where it can
    if (!headers.has("origin") && !this.session && !this.readsPlaceServer) headers.set("origin", READER_ORIGIN)
    const asked = this.key === undefined ? url : putKeyOn(url, headers, this.key, this.keyGoes)
    for (let attempt = 1; ; attempt++) {
      if (!this.hasRoom)
        throw new IngestStopped(`stopped reading at its limit, ${MOST_REQUESTS} requests or ${MOST_BYTES} bytes`)
      await this.waitForLimit(url)
      await this.waitForGap()
      this.requests++
      const { response, landedAt } = await this.sent(asked, init, headers)
      this.noteLimit(response.headers)
      const isTooMany = response.status === 429 || response.status === 503
      if (isTooMany && response.headers.has("retry-after") && attempt <= MOST_RETRIES) {
        await this.sleep(retryAfter(response, LONGEST_WAIT_MS) ?? backoffFor(attempt))
        continue
      }
      // GitHub says a limit used up with a 403:  the next time round waits for its reset, or stops
      if ((isTooMany || response.status === 403) && this.limitLeft === 0 && attempt <= MOST_RETRIES) continue
      if (isTooMany && attempt <= MOST_RETRIES) {
        await this.sleep(backoffFor(attempt))
        continue
      }
      const { bytes, isCut } = await this.bytesOf(response)
      const landed = addressWithoutKey(landedAt ?? (response.url || url), this.keyGoes)
      const text = this.withoutKey(new TextDecoder().decode(bytes))
      return {
        status: response.status,
        text,
        headers: this.headersWithoutKey(response.headers),
        isCut,
        url: landed,
        ...(body === "bytes too" && { bytes })
      }
    }
  }

  /**
   * Send one request;  with a session, its cookies, following redirects itself (see the class).
   * - `landedAt`:  where a session's request ended up.
   * - throws `IngestStopped` when the session has ended
   */
  private async sent(
    url: string,
    init: RequestInit,
    headers: Headers
  ): Promise<{ response: Response; landedAt?: string }> {
    const signal = () => AbortSignal.timeout(TIMEOUT_MS)
    const session = this.session
    if (!session) return { response: await this.send(url, { ...init, headers, signal: signal() }) }
    let at = url
    for (let redirects = 0; ; redirects++) {
      const asked = new Headers(headers)
      const cookie = session.cookieFor(at)
      if (cookie) asked.set("cookie", cookie)
      const response = await this.send(at, { ...init, headers: asked, redirect: "manual", signal: signal() })
      if (response.status === 401) throw sessionEnded(session)
      const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : undefined
      if (!location) return { response, landedAt: at }
      const next = new URL(location, at).href
      if (session.sentToSignIn(at, next)) throw sessionEnded(session)
      if (redirects >= MOST_REDIRECTS)
        throw new IngestStopped(`${new URL(at).host} redirected more than ${MOST_REDIRECTS} times`)
      await response.body?.cancel()
      await this.waitForGap()
      this.requests++
      at = next
    }
  }

  /** SIDE EFFECT:  what an answer says of its rate limit is noted. */
  private noteLimit(headers: Headers): void {
    const left = rateLimitLeft(headers)
    if (left === undefined) return
    this.limitLeft = left
    this.limitResetAt = rateLimitResetAt(headers)
  }

  /**
   * With no requests left of its rate limit, wait for it to reset.
   * - throws `IngestStopped` when that's longer than it waits:  saying when, and that a key may give more
   */
  private async waitForLimit(url: string): Promise<void> {
    if (this.limitLeft !== 0) return
    const wait = (this.limitResetAt ?? 0) - Date.now()
    if (wait <= LONGEST_WAIT_MS) {
      if (wait > 0) await this.sleep(wait)
      this.limitLeft = undefined
      return
    }
    const at = clockTime(new Date(this.limitResetAt!))
    const more = this.key === undefined ? ";  a key may give more:  --key-secret <NAME>" : ""
    throw new IngestStopped(
      `${new URL(url).host} says its rate limit is used up for now:  it can be asked again at ${at}${more}`
    )
  }

  /** Leave a gap since the last request. */
  private async waitForGap(): Promise<void> {
    const since = Date.now() - this.lastAt
    if (since < GAP_MS) await this.sleep(GAP_MS - since)
    this.lastAt = Date.now()
  }

  /** An answer's bytes, up to the most it reads:  it stops reading there. */
  private async bytesOf(response: Response): Promise<{ bytes: Uint8Array; isCut: boolean }> {
    const reader = response.body?.getReader()
    if (!reader) return { bytes: new Uint8Array(), isCut: false }
    const chunks: Uint8Array[] = []
    let read = 0
    let isCut = false
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      read += value.length
      this.bytes += value.length
      chunks.push(value)
      if (read > MOST_BYTES_AN_ANSWER) {
        await reader.cancel()
        isCut = true
        break
      }
    }
    const bytes = new Uint8Array(read)
    let at = 0
    for (const chunk of chunks) {
      bytes.set(chunk, at)
      at += chunk.length
    }
    return { bytes: isCut ? bytes.slice(0, MOST_BYTES_AN_ANSWER) : bytes, isCut }
  }

  /** `headers`, with the key's value taken out:  a next page's `Link` can say a key that went in the address. */
  private headersWithoutKey(headers: Headers): Headers {
    if (this.key === undefined) return headers
    return new Headers([...headers.entries()].map(([name, value]) => [name, keyHidden(value, this.key)]))
  }

  /** `text`, with the key's value and the session's taken out. */
  private withoutKey(text: string): string {
    let clean = keyHidden(text, this.key)
    for (const secret of this.session?.secrets ?? []) {
      const inJson = JSON.stringify(secret).slice(1, -1)
      clean = clean.replaceAll(secret, "[its session]").replaceAll(inJson, "[its session]")
    }
    return clean
  }
}

/** What stops a read when `session` has ended, and how to go on. */
export function sessionEnded({ place }: Pick<ReaderSession, "place">): IngestStopped {
  return new IngestStopped(`the session for ${place} has ended:  sign in again, spell place sign-in ${place}`)
}

/** An address without its query. */
function pathOf(url: string): string {
  return url.replace(/[?#].*$/, "")
}

/** Are `bytes` text, UTF-8 throughout? */
function isText(bytes: Uint8Array): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

/**
 * Throws unless this request only reads.
 * - Nothing that writes goes out but what `tryWrite()` sends:  see `PoliteReader`.
 */
function refuseWrite(url: string, method: string, body: unknown): void {
  if (method === "GET" || method === "HEAD") return
  if (method === "POST" && typeof body === "string") {
    if (ONLY_READS.test(queryIn(body))) return
  }
  throw new IngestStopped(`spell place ingest never sends a write, and something asked for a ${method} of ${url}`)
}

/** The GraphQL query in a request's body:  empty for anything else. */
function queryIn(body: string): string {
  try {
    const { query } = JSON.parse(body) as { query?: unknown }
    return typeof query === "string" ? query : ""
  } catch {
    return ""
  }
}

/** The headers of `headers` worth keeping. */
export function keptHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries([...headers.entries()].filter(([name]) => KEPT_HEADERS.test(name)))
}
