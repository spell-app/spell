import { Api } from "spell/util/Api"
import { ApiError, type ApiRequest } from "spell/util/fetching"
import { rateLimitLeft, rateLimitResetAt, retryAfter } from "spell/util/retrying"
import { clockTime } from "spell/util/time"

import type { DeviceCopy, KeptCopy } from "./DeviceCopy"
import { keyHidden, putKeyOn, type KeyGoes } from "./keyGoes"
import {
  PlaceError,
  TooSoonError,
  type PlaceCapabilities,
  type PlaceContext,
  type PlaceErrorKind,
  type WhyNotWritable
} from "./places.types"

/** The header a change's id goes in, unless the place says otherwise:  a server that remembers them makes it once. */
export const CHANGE_ID_HEADER = "Idempotency-Key"

/** The answers that mean "ask again later", though a server sent them:  so they count as no answer, and it resends. */
const TRY_AGAIN_STATUSES = new Set([408, 425, 429])

/** The answers that mean the thing isn't there. */
const GONE_STATUSES = new Set([404, 410])

/** The longest a request waits by itself for a server's limit to pass:  past that, it says when, and isn't sent. */
const LONGEST_WAIT_MS = 15_000

/****************
 * ### `WebPlace`
 * What every place that reaches a server over HTTP shares:  `RestPlace` and `GraphPlace` are mappings on top.
 * - Requests through `Api`:  real aborts, and `keepalive` when the page is going away.
 * - A server's answer becomes what the engine needs to know (`PendingChanges`):
 *   - not found:  `PlaceError` `"not found"`
 *   - any other 4xx:  `PlaceError` `"refused"`, or what a subclass says it means (`errorKindFor()`)
 *   - a 5xx, a 408, a 425, a 429, or nothing at all:  thrown as it is, so it counts as no answer, and a change resends
 *   - so is a 403 whose rate limit says no requests are left, GitHub's way (epic `data` I92):  try later, not refused
 * - It waits out a rate limit (epic `data` T110), told by an answer's `retry-after`, or its limit having none left:
 *   - nothing's sent until then:  a wait of a few seconds is waited for
 *   - a longer one throws `TooSoonError` at once, saying when, and what's drawing the read tries again then
 *   - `waitsOutLimits`:  `false` for a place whose `RateQueue` does this itself
 * - A KEY is named, never written (epic `data`, Q11):
 *   - `keyNamed` says a place needs one, by name;
 *     with `keyIfSet`, it takes one when it's there, and goes without when it isn't, GitHub's way.
 *   - In a browser nothing can hold it, so every request refuses, saying so:  the program reaches it through `RemotePlace`.
 *   - On a server side, `keyFrom` finds it by that name (`PlaceKeys`, in `spell/server/places`), and it goes on each request.
 *   - There's no `headers` setting, so there's nowhere to write one.
 *   - It goes as `Authorization: Bearer`, or where `keyGoes` says (epic `data` T73):  a header of its own, or the address.
 *     What's said of a request hides it (`keyHidden()`), and a copy on this device is kept under the address without it.
 * - With `mostPerSecond`, it keeps to a server's pace (epic `data` P34):
 *   each request waits its turn, the Met Museum's 80 a second (`- it takes up to 80 requests a second`).
 * - With a `deviceCopy`, a read is answered from a copy kept on this device (epic `data` P36):  `answerFromCopy()`.
 * - Knows nothing of paths or queries.
 ****************/
export abstract class WebPlace {
  /** The address everything's under. */
  protected readonly url: string
  /** The name of the key it needs, if it does. */
  protected readonly keyNamed: string | undefined
  /** It goes without its key when nothing here holds it. */
  private readonly keyIfSet: boolean
  /** Finds that key, on a server side. */
  private readonly keyFrom: WebPlaceProps["keyFrom"]
  /** Where that key goes on a request:  left out, `Authorization: Bearer`. */
  private readonly keyGoes: KeyGoes | undefined
  /** The header a change's id goes in:  `false` for none. */
  private readonly changeIdHeader: string | false
  /** Sends the requests. */
  private readonly api = new Api()
  /** The most requests it sends a second:  left out, as many as are asked for. */
  private readonly mostPerSecond: number | undefined
  /** When the next request may go, in ms since 1970, keeping to `mostPerSecond`. */
  private nextTurn = 0
  /** Nothing's sent before this, in ms since 1970:  a server said so, or its rate limit has none left. */
  private askAgainAt = 0
  /** The copy of what it reads, kept on this device:  only when its line says so. */
  private readonly deviceCopy: DeviceCopy | undefined
  /** The addresses being read behind their stale copies:  one request each. */
  private readonly readingBehind = new Set<string>()

  constructor({
    url,
    keyNamed,
    keyIfSet = false,
    keyFrom,
    keyGoes,
    changeIdHeader = CHANGE_ID_HEADER,
    mostPerSecond,
    deviceCopy
  }: WebPlaceProps) {
    this.url = url.replace(/\/+$/, "")
    this.keyNamed = keyNamed
    this.keyIfSet = keyIfSet
    this.keyFrom = keyFrom
    this.keyGoes = keyGoes
    this.changeIdHeader = changeIdHeader
    this.mostPerSecond = mostPerSecond
    this.deviceCopy = deviceCopy
  }

  /** What it says it can do:  see each subclass. */
  abstract describe(): PlaceCapabilities

  /**
   * Send `request`:  the OK response, body unread.
   * - `changeId`:  goes in its header, so a server that remembers them makes the change once.
   * - throws `PlaceError` for an answer that means something -- see the class;  anything else, for no answer
   */
  protected answerTo(request: ApiRequest, context: PlaceContext, changeId?: string): Promise<Response> {
    const isRead = (request.method ?? "GET") === "GET" && changeId === undefined && !context.keepalive
    if (!this.deviceCopy) return this.askServer(request, context, changeId)
    if (isRead) return this.answerFromCopy(request, context)
    return this.askServer(request, context, changeId).then((response) => {
      // what it changed may be in any copy:  the next read of each asks the server
      void this.deviceCopy?.forgetAll()
      return response
    })
  }

  /**
   * A read, answered from the copy kept on this device (`DeviceCopy`):
   * - a fresh copy:  at once, with no request
   * - a stale one:  at once, and read from the server behind it (`readBehind()`)
   * - none, or one a reload passed by (`readFromServerNext()`):  read from the server, waited on, and kept
   * - A write answered discards every copy:  what it changed may be in any of them.
   * - throws as `askServer()`
   */
  private async answerFromCopy(request: ApiRequest, context: PlaceContext): Promise<Response> {
    const copy = this.deviceCopy!
    const address = this.api.addressFor(request)
    const kept = await copy.read(address)
    if (kept && !copy.mustAskServer(kept)) {
      if (!copy.isFresh(kept)) this.readBehind(request, kept)
      return copy.responseOf(kept)
    }
    // past the browser's cache too, which asks with what it holds:  a 304 costs almost nothing
    const response = await this.askServer({ ...request, ...(kept && { cache: "no-cache" }) }, context)
    return copy.kept(address, response)
  }

  /**
   * SIDE EFFECT:  `request` is asked of the server again, behind its stale copy, `kept`:  a new answer is kept,
   * and if it differs, whoever hears the copy (`DeviceCopy.onChanged()`) reads again.
   * - Asked past the browser's cache (`no-cache`):
   *   it asks with the `ETag` it holds, `If-None-Match`, and a 304 comes back as the answer it already had.
   *   - A page can't send one itself:  swapi's CORS refuses the header.
   * - NEVER throws:  a failure leaves the copy as it was, logged.
   */
  private readBehind(request: ApiRequest, kept: KeptCopy): void {
    const copy = this.deviceCopy!
    if (this.readingBehind.has(kept.address)) return
    this.readingBehind.add(kept.address)
    void this.askServer({ ...request, cache: "no-cache" }, {})
      .then(async (response) => {
        const body = await response.text()
        await copy.keep(kept.address, { body, headers: [...response.headers.entries()] })
        if (body !== kept.body) copy.tellChanged()
      })
      .catch((ignored) => console.error(`${this.constructor.name}:  couldn't read ${kept.address} again`, ignored))
      .finally(() => this.readingBehind.delete(kept.address))
  }

  /** `answerTo()`, always of the server. */
  private async askServer(
    request: ApiRequest,
    { signal, keepalive }: PlaceContext,
    changeId?: string
  ): Promise<Response> {
    const key = await this.keyOrRefusal()
    const headers = new Headers(request.headers)
    const url = key === undefined ? request.url : this.urlWithKey(request, headers, key)
    if (changeId !== undefined && this.changeIdHeader) headers.set(this.changeIdHeader, changeId)
    await this.waitOutLimit(signal)
    await this.waitForTurn()
    try {
      const response = await this.api.request<Response>({
        ...request,
        url,
        headers,
        responseType: "response",
        ...(signal && { signal }),
        ...(keepalive && { keepalive })
      })
      this.noteLimit(response)
      return response
    } catch (error) {
      if (error instanceof Error) error.message = keyHidden(error.message, key)
      if (!(error instanceof ApiError)) throw error
      if (error.response) this.noteLimit(error.response)
      if (!this.isAnAnswer(error.status) || isOutOfRequests(error)) throw error
      const kind = this.errorKindFor(error.status!)
      const message = await this.messageOf(error)
      const whyNot = kind === "refused" ? await this.whyNotOf(error) : undefined
      const needs = kind === "refused" ? await this.needsOf(error) : undefined
      throw new PlaceError(message, { cause: { kind, ...(whyNot && { whyNot }), ...(needs && { needs }) } })
    }
  }

  /**
   * `request`'s address, with `key` there if that's where it goes:  its template filled, so nothing's left to fill.
   * - SIDE EFFECT:  `key` is in `headers`, if it goes there.
   */
  private urlWithKey(request: ApiRequest, headers: Headers, key: string): string {
    if (!this.keyGoes || !("inAddress" in this.keyGoes)) {
      putKeyOn(request.url, headers, key, this.keyGoes)
      return request.url
    }
    return putKeyOn(this.api.url(request.url, request.urlData), headers, key, this.keyGoes)
  }

  /** Does it wait out a rate limit itself?  A place whose `RateQueue` already does says no. */
  protected get waitsOutLimits(): boolean {
    return true
  }

  /** SIDE EFFECT:  what `response` says of when to ask next is noted. */
  private noteLimit(response: Response): void {
    if (!this.waitsOutLimits) return
    const askAgainAt = askAgainAtIn(response)
    if (askAgainAt !== undefined) this.askAgainAt = Math.max(this.askAgainAt, askAgainAt)
  }

  /**
   * SIDE EFFECT:  waits out a limit a server named, if that's soon.
   * - throws `TooSoonError` when it isn't, with nothing sent:  saying when
   * - throws `signal`'s reason, when it's aborted while it waits
   */
  private async waitOutLimit(signal: AbortSignal | undefined): Promise<void> {
    const wait = this.askAgainAt - Date.now()
    if (wait <= 0) return
    if (wait > LONGEST_WAIT_MS) {
      const at = clockTime(new Date(this.askAgainAt))
      const message = `${this.constructor.name}:  ${this.url} says to wait:  it'll be asked again at ${at}`
      throw new TooSoonError(message, { cause: { retryAt: this.askAgainAt } })
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, wait)
      signal?.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true })
    })
  }

  /** SIDE EFFECT:  waits until this request's turn, keeping to `mostPerSecond`;  at once without one. */
  private async waitForTurn(): Promise<void> {
    if (!this.mostPerSecond) return
    const now = Date.now()
    const turn = Math.max(now, this.nextTurn)
    this.nextTurn = turn + 1000 / this.mostPerSecond
    if (turn > now) await new Promise((resolve) => setTimeout(resolve, turn - now))
  }

  /** What to say of a failure that means something.  A subclass that knows why says that. */
  protected messageOf(error: ApiError): Promise<string> | string {
    return error.message
  }

  /** Why a refused write wasn't allowed:  a plain server says only no.  A subclass that knows why says that. */
  protected whyNotOf(_error: ApiError): Promise<WhyNotWritable> | WhyNotWritable {
    return "place"
  }

  /** The role a refused write would take (`PlaceErrorCause.needs`):  a plain server never says.  A subclass may. */
  protected needsOf(_error: ApiError): Promise<string | undefined> | string | undefined {
    return undefined
  }

  /** What a server's answer of `status`, a 4xx, means.  A subclass says more. */
  protected errorKindFor(status: number): PlaceErrorKind {
    return GONE_STATUSES.has(status) ? "not found" : "refused"
  }

  /** Is this status an answer about the request, rather than the server having no answer yet?  A subclass says more. */
  protected isAnAnswer(status: number | undefined): boolean {
    return status !== undefined && status >= 400 && status < 500 && !TRY_AGAIN_STATUSES.has(status)
  }

  /**
   * The key it needs, if it needs one.
   * - throws `PlaceError` `"refused"` when nothing here holds it, unless it goes without
   */
  private async keyOrRefusal(): Promise<string | undefined> {
    if (this.keyNamed === undefined) return undefined
    const key = await this.keyFrom?.(this.keyNamed)
    if (key !== undefined || this.keyIfSet) return key
    throw new PlaceError(
      `${this.constructor.name}:  ${this.url} needs the key named "${this.keyNamed}", and a key is never kept in a page;  this place has to go through a server side`,
      { cause: { kind: "refused", whyNot: "place" } }
    )
  }
}

/** Constructor props of a `WebPlace`. */
export type WebPlaceProps = {
  /** The address everything's under, e.g. `https://example.com/api`. */
  url: string
  /** The NAME of the key it needs:  it's never written here.  See `WebPlace`. */
  keyNamed?: string
  /**
   * It takes its key when `keyFrom` finds it, and goes without when it doesn't:  GitHub's 60 requests an hour.
   * - Default `false`.
   */
  keyIfSet?: boolean
  /**
   * Finds a key by its name:  only ever handed in on a server side (`PlaceKeys`).  Left out:  a place with `keyNamed` refuses.
   * - It can wait, for a key that's a token made from another (`GoogleToken`).
   */
  keyFrom?: (name: string) => string | undefined | Promise<string | undefined>
  /** Where the key goes on a request;  default `Authorization: Bearer <key>`.  SEE:  `KeyGoes`. */
  keyGoes?: KeyGoes
  /** The header a change's id goes in;  default `CHANGE_ID_HEADER`;  `false`:  send none. */
  changeIdHeader?: string | false
  /**
   * The most requests it sends a second, a server's pace:  the Met Museum asks for 80 at most.
   * - Left out:  no limit.
   */
  mostPerSecond?: number
  /** A copy of what it reads, kept on this device:  `- keep a copy on this device`.  Left out:  nothing is kept. */
  deviceCopy?: DeviceCopy
}

/**
 * The JSON in `response`:  `undefined` when there's none.
 * - throws `SyntaxError` for JSON that doesn't parse:  that's no answer anyone can use
 */
export async function jsonIn(response: Response): Promise<unknown> {
  const text = await response.text()
  return text.trim() ? (JSON.parse(text) as unknown) : undefined
}

/** What's at the dotted `path` in `value`, e.g. `data.items`.  `undefined` if nothing's there.  No path:  `value`. */
export function valueAt(value: unknown, path: string | undefined): unknown {
  if (path === undefined) return value
  let at = value
  for (const name of path.split(".")) at = (at as Record<string, unknown> | null | undefined)?.[name]
  return at
}

/**
 * When `response` says to ask again, in ms since 1970:  `undefined` when it says nothing about that.
 * - A 429 or a 503's `retry-after`;  else, with no requests left of its rate limit, when that resets.
 */
function askAgainAtIn(response: Response): number | undefined {
  const { status, headers } = response
  const said = status === 429 || status === 503 ? retryAfter(response) : undefined
  if (said !== undefined) return Date.now() + said
  return rateLimitLeft(headers) === 0 ? rateLimitResetAt(headers) : undefined
}

/** Does `error`'s answer say its rate limit has no requests left:  GitHub's 403, `x-ratelimit-remaining: 0`? */
function isOutOfRequests(error: ApiError): boolean {
  const headers = error.response?.headers
  return !!headers && rateLimitLeft(headers) === 0
}
