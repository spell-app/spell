import { describe, expect, test } from "vite-plus/test"

import { waitUntilSync } from "spell/util/node/timing"

/**
 * `waitUntilSync()` (`spell/util/node/timing`, epic `coherence` P27):  `waitUntil()`'s blocking twin, node only.
 */

describe("waitUntilSync()", () => {
  test("true at once:  its value, without waiting", () => {
    const started = Date.now()
    expect(waitUntilSync(() => "ready", { timeout: 5 })).toBe("ready")
    expect(Date.now() - started).toBeLessThan(50)
  })

  test("true later:  looks again every `every` seconds until it is", () => {
    let looks = 0
    expect(waitUntilSync(() => ++looks >= 3 && looks, { timeout: 5, every: 0.01 })).toBe(3)
  })

  test("never true:  `undefined` once the timeout passes, having looked at the deadline", () => {
    let looks = 0
    const started = Date.now()
    expect(waitUntilSync(() => (looks++, false), { timeout: 0.1, every: 0.03 })).toBeUndefined()
    expect(Date.now() - started).toBeGreaterThanOrEqual(95)
    expect(looks).toBeGreaterThanOrEqual(4)
  })

  test("what `read` throws, it throws", () => {
    expect(() =>
      waitUntilSync(
        () => {
          throw new Error("no")
        },
        { timeout: 1 }
      )
    ).toThrow("no")
  })
})
