import { describe, expect, test } from "vite-plus/test"

import { backoffFor, retryAfter } from "spell/util/retrying"

/** A reply saying `said` in its `retry-after`. */
const replySaying = (said?: string) => new Response(null, { status: 429, headers: said ? { "retry-after": said } : {} })

describe("retryAfter()", () => {
  test("seconds, as milliseconds, at most `mostMs`", () => {
    expect(retryAfter(replySaying("3"))).toBe(3000)
    expect(retryAfter(replySaying("30"), 10_000)).toBe(10_000)
  })

  test("a date, as how long until then", () => {
    const wait = retryAfter(replySaying(new Date(Date.now() + 60_000).toUTCString()))!
    expect(wait).toBeGreaterThan(50_000)
    expect(wait).toBeLessThanOrEqual(60_000)
  })

  test("nothing usable is `undefined`:  none, zero, a date gone by, or nonsense", () => {
    for (const said of [undefined, "0", "-1", "soon", new Date(0).toUTCString()]) {
      expect(retryAfter(replySaying(said))).toBeUndefined()
    }
  })
})

describe("backoffFor()", () => {
  test("1, 2, then 4 s", () => {
    expect([1, 2, 3].map((attempt) => backoffFor(attempt))).toEqual([1000, 2000, 4000])
  })

  test("`jitterMs` adds up to that much;  `mostMs` is the most, jitter and all", () => {
    const wait = backoffFor(2, { jitterMs: 500 })
    expect(wait).toBeGreaterThanOrEqual(2000)
    expect(wait).toBeLessThan(2500)
    expect(backoffFor(10, { jitterMs: 500, mostMs: 64_000 })).toBe(64_000)
    expect(backoffFor(20, { mostMs: 64_000 })).toBe(64_000)
  })
})
