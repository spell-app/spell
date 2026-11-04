import { backoffFor, retryAfter } from "spell/util/retrying"
import { after } from "spell/util/timing"

import { IngestStopped } from "./ingest.types"

/** Says who's asking, so a server's owner can see and say no. */
export const READER_NAME = "spell-place-ingest (+https://github.com/spell-app/spell)"

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

/** A GraphQL request's body that only reads. */
const ONLY_READS = /^\s*(?:query\b|\{)/

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
}

/**
 * Reads a source the polite way:  everything `spell place ingest` sends goes through here.
 * - Names itself, leaves a gap between requests, and waits when told to (a 429 or a 503, as long as `Retry-After` says).
 * - Stops at a size:  so many requests, so many bytes an answer, so many in all.
 * - NEVER sends a write:  `fetch` refuses anything but a `GET`, a `HEAD` or a GraphQL query, whoever asks.
 *   So a read through the Spell can't write either.
 * - The key goes on each request, and its value is taken out of whatever comes back, should a server say it again.
 * - Plain web APIs, no node:  `fetch` is handed in.
 */
export class PoliteReader {
  /** What really reaches the source. */
  private readonly send: typeof globalThis.fetch
  /** Waits. */
  private readonly sleep: (msec: number) => Promise<void>
  /** The key's value. */
  private readonly key: string | undefined
  /** How many requests so far. */
  private requests = 0
  /** How many bytes so far. */
  private bytes = 0
  /** When the last one went. */
  private lastAt = 0

  constructor({
    fetch,
    key,
    sleep = (msec) => after(msec / 1000)
  }: {
    fetch: typeof globalThis.fetch
    key?: string
    sleep?: (msec: number) => Promise<void>
  }) {
    this.send = fetch
    this.key = key
    this.sleep = sleep
  }

  /** Is there still room to ask, within what one look may? */
  get hasRoom(): boolean {
    return this.requests < MOST_REQUESTS && this.bytes < MOST_BYTES
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
  async read(url: string, { query, accept }: { query?: string; accept?: string } = {}): Promise<ReadAnswer> {
    const init: RequestInit = query
      ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) }
      : { headers: accept ? { accept } : {} }
    return this.answerTo(url, init)
  }

  /**
   * A `fetch` for a program to run on:  the same manners, the same limits, and it can't write.
   * - throws `IngestStopped` for a write, and past the limits
   */
  readonly fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : `${input instanceof URL ? input.href : input}`
    const method = init?.method ?? (input instanceof Request ? input.method : "GET")
    const { status, text, headers, isCut } = await this.answerTo(url, { ...init, method })
    if (isCut) throw new IngestStopped(`${url} answered with more than ${MOST_BYTES_AN_ANSWER} bytes:  it's left out`)
    return new Response(status === 204 || status === 304 ? null : text, { status, headers })
  }

  /** Ask, with manners.  See the class. */
  private async answerTo(url: string, init: RequestInit): Promise<ReadAnswer> {
    refuseWrite(url, (init.method ?? "GET").toUpperCase(), init.body)
    const headers = new Headers(init.headers)
    headers.set("user-agent", READER_NAME)
    if (this.key !== undefined) headers.set("authorization", `Bearer ${this.key}`)
    for (let attempt = 1; ; attempt++) {
      if (!this.hasRoom)
        throw new IngestStopped(`stopped reading at its limit, ${MOST_REQUESTS} requests or ${MOST_BYTES} bytes`)
      await this.waitForGap()
      this.requests++
      const response = await this.send(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if ((response.status === 429 || response.status === 503) && attempt <= MOST_RETRIES) {
        await this.sleep(retryAfter(response, LONGEST_WAIT_MS) ?? backoffFor(attempt))
        continue
      }
      const { text, isCut } = await this.textOf(response)
      return { status: response.status, text: this.withoutKey(text), headers: response.headers, isCut }
    }
  }

  /** Leave a gap since the last request. */
  private async waitForGap(): Promise<void> {
    const since = Date.now() - this.lastAt
    if (since < GAP_MS) await this.sleep(GAP_MS - since)
    this.lastAt = Date.now()
  }

  /** An answer's text, up to the most it reads:  it stops reading there. */
  private async textOf(response: Response): Promise<{ text: string; isCut: boolean }> {
    const reader = response.body?.getReader()
    if (!reader) return { text: "", isCut: false }
    const decoder = new TextDecoder()
    let text = ""
    let read = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      read += value.length
      this.bytes += value.length
      text += decoder.decode(value, { stream: true })
      if (read > MOST_BYTES_AN_ANSWER) {
        await reader.cancel()
        return { text: text.slice(0, MOST_BYTES_AN_ANSWER), isCut: true }
      }
    }
    return { text: text + decoder.decode(), isCut: false }
  }

  /** `text`, with the key's value taken out. */
  private withoutKey(text: string): string {
    return this.key ? text.replaceAll(this.key, "[its key]") : text
  }
}

/** Throws unless this request only reads.  Nothing that writes ever goes out, whoever asks:  see `PoliteReader`. */
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
