import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { waitUntil, within } from "spell/util/timing"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("waitUntil()", () => {
  test("looks at once, then every `every` seconds:  the first truthy value", async () => {
    let looks = 0
    const waiting = waitUntil(() => (++looks === 3 ? "up" : undefined), { timeout: 5, every: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    await expect(waiting).resolves.toBe("up")
    expect(looks).toBe(3)
  })

  test("`undefined` once time's up, after one last look AT the deadline", async () => {
    const start = Date.now()
    const looks: number[] = []
    const waiting = waitUntil(() => void looks.push(Date.now() - start), { timeout: 2.5, every: 1 })
    await vi.advanceTimersByTimeAsync(3000)
    await expect(waiting).resolves.toBeUndefined()
    expect(looks).toEqual([0, 1000, 2000, 2500])
  })

  test("an async look is awaited;  what a look throws, it throws", async () => {
    await expect(waitUntil(async () => "ok", { timeout: 1 })).resolves.toBe("ok")
    await expect(
      waitUntil(
        () => {
          throw new Error("no answer")
        },
        { timeout: 1 }
      )
    ).rejects.toThrow("no answer")
  })
})

describe("within()", () => {
  test("the promise's value when it's in time, and no timer left;  its rejection, as is", async () => {
    await expect(within(Promise.resolve(7), 1)).resolves.toBe(7)
    await expect(within(Promise.reject(new Error("bad")), 1)).rejects.toThrow("bad")
    expect(vi.getTimerCount()).toBe(0)
  })

  test("`undefined` when time runs out first", async () => {
    const slow = within(new Promise(() => {}), 1)
    await vi.advanceTimersByTimeAsync(1000)
    await expect(slow).resolves.toBeUndefined()
  })
})
