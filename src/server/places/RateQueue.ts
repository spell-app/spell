import { ApiError } from "spell/util/fetching"
import type { RateLimit } from "spell/util/places/places.types"
import { backoffFor, retryAfter } from "spell/util/retrying"

/** How many times one request is tried, with a limit hit. */
const TRIES = 5

/** The longest it waits at once, on a limit hit:  Google's advice for its own, and fair for any. */
const MOST_WAIT_MS = 64_000

/** Up to this much more, at random, so many waiting don't all come back at once. */
const JITTER_MS = 1000

/** Every queue with a name. */
const QUEUES = new Map<string, RateQueue>()

/****************
 * ### `RateQueue`
 * Requests to a service with a limit, sent in order, never faster than the limit allows (epic `data` P7).
 *
 * ```ts
 * RateQueue.named("sheets reads", { requests: 60, perSeconds: 60 }).run(() => this.send(request), { signal })
 * ```
 *
 * - One queue per NAMED limit:  everything under one limit shares it, however many places.
 * - It spaces out when requests START, over a sliding window;  they don't wait for each other to finish.
 * - A limit hit anyway (a 429, since someone else spends the same limit):
 *   - everything in the queue waits as long as the answer's `retry-after` says, else backing off
 *   - the request goes round again, up to `TRIES` times, then throws that answer's error, which a place counts as no answer
 * - A request whose `signal` aborts leaves the queue, and those behind it move up.
 * - Any other failure is the caller's, thrown as it is.
 * - Knows nothing of places:  only `RateLimit`'s shape.
 ****************/
export class RateQueue {
  /** What it keeps to. */
  private readonly limit: RateLimit
  /** How it tells the time. */
  private readonly clock: RateClock
  /** When each request in the current window started, oldest first. */
  private readonly starts: number[] = []
  /** When the last request in line gets its turn. */
  private lastTurn: Promise<unknown> = Promise.resolve()
  /** Nothing starts before this:  a limit was hit. */
  private pausedUntil = 0

  constructor({ limit, clock = REAL_CLOCK }: RateQueueProps) {
    this.limit = limit
    this.clock = clock
  }

  /** The ONE queue by this name, made as asked if it's the first:  a second asker's `limit` isn't looked at. */
  static named(name: string, limit: RateLimit): RateQueue {
    let queue = QUEUES.get(name)
    if (!queue) QUEUES.set(name, (queue = new RateQueue({ limit })))
    return queue
  }

  /**
   * Run `send` when the limit allows, and again if the limit's hit:  what it answers.
   * - throws what `send` threw;  `signal`'s reason once it aborts
   */
  async run<T>(send: () => Promise<T>, { signal }: { signal?: AbortSignal | undefined } = {}): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      await this.takeTurn(signal)
      try {
        return await send()
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 429 || attempt >= TRIES) throw error
        const wait = retryAfter(error.response!, MOST_WAIT_MS)
        this.pause(wait ?? backoffFor(attempt, { jitterMs: JITTER_MS, mostMs: MOST_WAIT_MS }))
      }
    }
  }

  /** Nothing starts for this long. */
  private pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.clock.now() + ms)
  }

  /** Wait in line, then for room.  One waiter gone doesn't hold up the next. */
  private takeTurn(signal: AbortSignal | undefined): Promise<void> {
    const turn = this.lastTurn.then(() => this.waitForRoom(signal))
    this.lastTurn = turn.catch(() => {})
    return turn
  }

  /** Wait until it can start one, and note that it did.  - throws `signal`'s reason once it aborts */
  private async waitForRoom(signal: AbortSignal | undefined): Promise<void> {
    for (;;) {
      signal?.throwIfAborted()
      const wait = this.msUntilRoom()
      if (wait <= 0) break
      await this.clock.sleep(wait, signal)
    }
    this.starts.push(this.clock.now())
  }

  /** How long until one can start:  0 or less for now. */
  private msUntilRoom(): number {
    const now = this.clock.now()
    const windowMs = this.limit.perSeconds * 1000
    while (this.starts.length && this.starts[0]! <= now - windowMs) this.starts.shift()
    const untilOutOfWindow = this.starts.length < this.limit.requests ? 0 : this.starts[0]! + windowMs - now
    return Math.max(untilOutOfWindow, this.pausedUntil - now)
  }
}

/** Constructor props of a `RateQueue`. */
export type RateQueueProps = {
  /** What it keeps to. */
  limit: RateLimit
  /** How it tells the time:  a test's, in a test. */
  clock?: RateClock
}

/** How a `RateQueue` tells the time. */
export type RateClock = {
  /** Now, in milliseconds. */
  now(): number
  /** Resolves after `ms`.  - throws `signal`'s reason once it aborts */
  sleep(ms: number, signal?: AbortSignal): Promise<void>
}

/** The real time. */
const REAL_CLOCK: RateClock = {
  now: () => Date.now(),
  sleep: (ms, signal) =>
    new Promise((done, failed) => {
      const timer = setTimeout(done, ms)
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          failed(signal.reason)
        },
        { once: true }
      )
    })
}
