/**
 * How long to wait before asking a server again:  `claudeRunners` and `RateQueue` both ask here (epic `data` P7).
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
