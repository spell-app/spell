import { describe, expect, test } from "vite-plus/test"

import { ApiError } from "spell/util/fetching"
import { RateQueue, type RateClock } from "spell/server/places"

/** A clock that only moves when it's slept on:  so a test takes no time, and what it waited is written down. */
function fakeClock() {
  const clock: RateClock & { time: number; slept: number[] } = {
    time: 1000,
    slept: [] as number[],
    now: () => clock.time,
    sleep: (ms: number, signal?: AbortSignal) => {
      signal?.throwIfAborted()
      clock.slept.push(ms)
      clock.time += ms
      return Promise.resolve()
    }
  }
  return clock
}

/** A 429, saying `retryAfter`, if it's given. */
function limitHit(retryAfter?: string): ApiError {
  const response = new Response(null, { status: 429, headers: retryAfter ? { "retry-after": retryAfter } : {} })
  return new ApiError("429", { cause: { response } })
}

describe("RateQueue.run()", () => {
  test("under the limit, nothing waits", async () => {
    const clock = fakeClock()
    const queue = new RateQueue({ limit: { requests: 2, perSeconds: 10 }, clock })
    await Promise.all([queue.run(async () => 1), queue.run(async () => 2)])
    expect(clock.slept).toEqual([])
  })

  test("over the limit, the next waits for the oldest to leave the window, and they start IN ORDER", async () => {
    const clock = fakeClock()
    const queue = new RateQueue({ limit: { requests: 2, perSeconds: 10 }, clock })
    const started: number[] = []
    const asks = [1, 2, 3, 4, 5].map((number) => queue.run(async () => void started.push(number)))
    await Promise.all(asks)
    expect(started).toEqual([1, 2, 3, 4, 5])
    expect(clock.slept).toEqual([10_000, 10_000])
  })

  test("a 429 with a `retry-after`:  EVERYTHING waits that long, then it goes round again", async () => {
    const clock = fakeClock()
    const queue = new RateQueue({ limit: { requests: 100, perSeconds: 1 }, clock })
    let tries = 0
    const answer = await queue.run(async () => {
      if (++tries === 1) throw limitHit("7")
      return "yes"
    })
    expect(answer).toBe("yes")
    expect(clock.slept).toEqual([7000])
    await queue.run(async () => 0)
    expect(clock.slept).toEqual([7000])
  })

  test("a 429 saying nothing:  it backs off, longer each time", async () => {
    const clock = fakeClock()
    const queue = new RateQueue({ limit: { requests: 100, perSeconds: 1 }, clock })
    let tries = 0
    await queue.run(async () => {
      if (++tries < 3) throw limitHit()
      return "yes"
    })
    expect(clock.slept).toHaveLength(2)
    expect(clock.slept[0]).toBeGreaterThanOrEqual(1000)
    expect(clock.slept[1]).toBeGreaterThanOrEqual(2000)
  })

  test("limit hit every time:  it gives up after five tries, with that answer's error", async () => {
    const queue = new RateQueue({ limit: { requests: 100, perSeconds: 1 }, clock: fakeClock() })
    let tries = 0
    await expect(
      queue.run(async () => {
        tries++
        throw limitHit("1")
      })
    ).rejects.toBeInstanceOf(ApiError)
    expect(tries).toBe(5)
  })

  test("any other failure is thrown at once, and doesn't hold up the next", async () => {
    const queue = new RateQueue({ limit: { requests: 100, perSeconds: 1 }, clock: fakeClock() })
    let tries = 0
    await expect(
      queue.run(async () => {
        tries++
        throw new TypeError("no")
      })
    ).rejects.toBeInstanceOf(TypeError)
    expect(tries).toBe(1)
    expect(await queue.run(async () => "next")).toBe("next")
  })

  test("an aborted ask never sends, and the one behind it moves up", async () => {
    const queue = new RateQueue({ limit: { requests: 1, perSeconds: 1 }, clock: fakeClock() })
    const stop = new AbortController()
    stop.abort(new DOMException("gone", "AbortError"))
    let sent = false
    await expect(queue.run(async () => void (sent = true), { signal: stop.signal })).rejects.toThrow("gone")
    expect(sent).toBe(false)
    expect(await queue.run(async () => "next")).toBe("next")
  })

  test("the real clock's sleep ends early on an abort", async () => {
    const queue = new RateQueue({ limit: { requests: 1, perSeconds: 3600 } })
    await queue.run(async () => 0)
    const stop = new AbortController()
    const waiting = queue.run(async () => 1, { signal: stop.signal })
    setTimeout(() => stop.abort(new DOMException("gone", "AbortError")), 5)
    await expect(waiting).rejects.toThrow("gone")
  })
})

describe("RateQueue.named()", () => {
  test("ONE queue per name", () => {
    const limit = { requests: 1, perSeconds: 1 }
    expect(RateQueue.named("a test's", limit)).toBe(RateQueue.named("a test's", limit))
    expect(RateQueue.named("a test's", limit)).not.toBe(RateQueue.named("another test's", limit))
  })
})
