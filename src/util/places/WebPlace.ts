import { Api } from "spell/util/Api"
import { ApiError, type ApiRequest } from "spell/util/fetching"

import {
  PlaceError,
  type PlaceCapabilities,
  type PlaceContext,
  type PlaceErrorKind,
  type PlaceRow
} from "./places.types"

/** The header a change's id goes in, unless the place says otherwise:  a server that remembers them makes it once. */
export const CHANGE_ID_HEADER = "Idempotency-Key"

/** The answers that mean "ask again later", though a server sent them:  so they count as no answer, and it resends. */
const TRY_AGAIN_STATUSES = new Set([408, 425, 429])

/** The answers that mean the thing isn't there. */
const GONE_STATUSES = new Set([404, 410])

/****************
 * ### `WebPlace`
 * What every place that reaches a server over HTTP shares:  `RestPlace` and `GraphPlace` are mappings on top.
 * - Requests through `Api`:  real aborts, and `keepalive` when the page is going away.
 * - A server's answer becomes what the engine needs to know (`PendingChanges`):
 *   - not found:  `PlaceError` `"not found"`
 *   - any other 4xx:  `PlaceError` `"refused"`, or what a subclass says it means (`errorKindFor()`)
 *   - a 5xx, a 408, a 425, a 429, or nothing at all:  thrown as it is, so it counts as no answer, and a change resends
 * - A KEY is named, never written (epic `data`, Q11):
 *   - `keyNamed` says a place needs one, by name.
 *   - In a browser nothing can hold it, so every request refuses, saying so:  the program reaches it through `RemotePlace`.
 *   - On a server side, `keyFrom` finds it by that name (`PlaceKeys`, in `spell/server/places`), and it goes on each request.
 *   - There's no `headers` setting, so there's nowhere to write one.
 * - Knows nothing of paths or queries.
 ****************/
export abstract class WebPlace {
  /** The address everything's under. */
  protected readonly url: string
  /** The name of the key it needs, if it does. */
  protected readonly keyNamed: string | undefined
  /** Finds that key, on a server side. */
  private readonly keyFrom: WebPlaceProps["keyFrom"]
  /** Puts that key on a request. */
  private readonly sendKey: (headers: Headers, key: string) => void
  /** The header a change's id goes in:  `false` for none. */
  private readonly changeIdHeader: string | false
  /** Sends the requests. */
  private readonly api = new Api()

  constructor({ url, keyNamed, keyFrom, sendKey = sendAsBearer, changeIdHeader = CHANGE_ID_HEADER }: WebPlaceProps) {
    this.url = url.replace(/\/+$/, "")
    this.keyNamed = keyNamed
    this.keyFrom = keyFrom
    this.sendKey = sendKey
    this.changeIdHeader = changeIdHeader
  }

  /** What it says it can do:  see each subclass. */
  abstract describe(): PlaceCapabilities

  /**
   * Send `request`:  the OK response, body unread.
   * - `changeId`:  goes in its header, so a server that remembers them makes the change once.
   * - throws `PlaceError` for an answer that means something -- see the class;  anything else, for no answer
   */
  protected async answerTo(
    request: ApiRequest,
    { signal, keepalive }: PlaceContext,
    changeId?: string
  ): Promise<Response> {
    const key = await this.keyOrRefusal()
    const headers = new Headers(request.headers)
    if (key !== undefined) this.sendKey(headers, key)
    if (changeId !== undefined && this.changeIdHeader) headers.set(this.changeIdHeader, changeId)
    try {
      return await this.api.request<Response>({
        ...request,
        headers,
        responseType: "response",
        ...(signal && { signal }),
        ...(keepalive && { keepalive })
      })
    } catch (error) {
      if (!(error instanceof ApiError) || !this.isAnAnswer(error.status)) throw error
      const kind = this.errorKindFor(error.status!)
      const message = await this.messageOf(error)
      throw new PlaceError(message, { cause: { kind, ...(kind === "refused" && { whyNot: "place" }) } })
    }
  }

  /** What to say of a failure that means something.  A subclass that knows why says that. */
  protected messageOf(error: ApiError): Promise<string> | string {
    return error.message
  }

  /** What a server's answer of `status`, a 4xx, means.  A subclass says more. */
  protected errorKindFor(status: number): PlaceErrorKind {
    return GONE_STATUSES.has(status) ? "not found" : "refused"
  }

  /** Is this status an answer about the request, rather than the server having no answer yet?  A subclass says more. */
  protected isAnAnswer(status: number | undefined): boolean {
    return status !== undefined && status >= 400 && status < 500 && !TRY_AGAIN_STATUSES.has(status)
  }

  /** The key it needs, if it needs one.  - throws `PlaceError` `"refused"` when nothing here holds it */
  private async keyOrRefusal(): Promise<string | undefined> {
    if (this.keyNamed === undefined) return undefined
    const key = await this.keyFrom?.(this.keyNamed)
    if (key !== undefined) return key
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
   * Finds a key by its name:  only ever handed in on a server side (`PlaceKeys`).  Left out:  a place with `keyNamed` refuses.
   * - It can wait, for a key that's a token made from another (`GoogleToken`).
   */
  keyFrom?: (name: string) => string | undefined | Promise<string | undefined>
  /** How the key goes on a request;  default `Authorization: Bearer <key>`. */
  sendKey?: (headers: Headers, key: string) => void
  /** The header a change's id goes in;  default `CHANGE_ID_HEADER`;  `false`:  send none. */
  changeIdHeader?: string | false
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

/** `row`, with each field named as `names` says:  a field it doesn't name keeps its name. */
export function renamed(row: PlaceRow, names: Readonly<Record<string, string>>): PlaceRow {
  return Object.fromEntries(Object.entries(row).map(([field, value]) => [names[field] ?? field, value]))
}

/** Which way round `names` is:  `{ a: "b" }` => `{ b: "a" }`. */
export function turnedRound(names: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(names).map(([ours, theirs]) => [theirs, ours]))
}

/** The usual way a key goes on a request. */
function sendAsBearer(headers: Headers, key: string): void {
  headers.set("Authorization", `Bearer ${key}`)
}
