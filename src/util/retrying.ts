/**
 * How long to wait before asking a server again (epic `data` P7, P28):
 * `claudeRunners`, `RateQueue` and the ingest's `PoliteReader` ask here.
 * - A server says how long in `retry-after`, or how many requests are left of its rate limit, and when it resets:
 *   GitHub's `x-ratelimit-remaining` and `x-ratelimit-reset`.
 * - GENERIC, imports nothing, and taken by file (`spell/util/retrying`), in no barrel:  no page pays for it.
 * - It only works out the wait:  who waits, and what they do after, is the caller's.
 */

/**
 * How long a reply's `retry-after` says to wait, in milliseconds:  `undefined` if it says nothing we can use.
 * - It can be a number of seconds, or a date.
 * - `mostMs`:  never longer than this, whatever it says.
 */
export function retryAfter(response: Response, mostMs = Number.POSITIVE_INFINITY): number | undefined {
  const said = response.headers.get("retry-after")
  if (!said) return undefined
  const seconds = Number(said)
  const ms = Number.isNaN(seconds) ? Date.parse(said) - Date.now() : seconds * 1000
  return ms > 0 ? Math.min(ms, mostMs) : undefined
}

/** A number of seconds too big to be a wait:  it's a time, in seconds since 1970, as GitHub's `x-ratelimit-reset` is. */
const SECONDS_SINCE_1970 = 1_000_000_000

/**
 * How many requests a reply's rate limit says are left:  its `x-ratelimit-remaining`, or `ratelimit-remaining`.
 * - `undefined` when it says nothing.
 */
export function rateLimitLeft(headers: Headers): number | undefined {
  const said = headers.get("x-ratelimit-remaining") ?? headers.get("ratelimit-remaining")
  const left = said === null ? Number.NaN : Number(said)
  return Number.isNaN(left) ? undefined : left
}

/**
 * When a reply's rate limit lets you ask again, in milliseconds since 1970:  `undefined` if it says nothing we can use.
 * - Its `x-ratelimit-reset` or `ratelimit-reset`:
 *   GitHub's is a time, in seconds since 1970;  the IETF draft's, seconds from now.
 * - `now`:  a test's clock.
 */
export function rateLimitResetAt(headers: Headers, now = Date.now()): number | undefined {
  const said = Number(headers.get("x-ratelimit-reset") ?? headers.get("ratelimit-reset") ?? Number.NaN)
  if (Number.isNaN(said)) return undefined
  return said > SECONDS_SINCE_1970 ? said * 1000 : now + said * 1000
}

/**
 * How long to wait before asking again, after `attempt` tries:  1, 2, then 4 s, and on.
 * - `jitterMs`:  up to this much more, at random, so many askers don't all come back at once.
 * - `mostMs`:  never longer than this.
 */
export function backoffFor(
  attempt: number,
  { jitterMs = 0, mostMs = Number.POSITIVE_INFINITY }: BackoffProps = {}
): number {
  return Math.min(1000 * 2 ** (attempt - 1) + Math.random() * jitterMs, mostMs)
}

/** How `backoffFor()` shapes its wait. */
export type BackoffProps = {
  /** Up to this much more, at random. */
  jitterMs?: number
  /** Never longer than this. */
  mostMs?: number
}
