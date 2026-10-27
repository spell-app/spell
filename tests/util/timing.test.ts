import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { afterSolidUpdate, Queued, soon, waitUntil, within } from "spell/util/timing"

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

describe("Queued", () => {
  test("a burst of asks runs the work ONCE, at the moment named;  an ask after it queues it again", async () => {
    const run = vi.fn()
    const queued = new Queued({ when: soon, run })
    queued.ask()
    queued.ask()
    expect(queued.isPending).toBe(true)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(0)
    expect({ runs: run.mock.calls.length, isPending: queued.isPending }).toEqual({ runs: 1, isPending: false })
    queued.ask()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(2)
  })

  test("`cancel()` drops the pending run, even at a moment that can't be cancelled (`afterSolidUpdate`)", async () => {
    const run = vi.fn()
    const queued = new Queued({ when: afterSolidUpdate, run })
    queued.ask()
    queued.cancel()
    await Promise.resolve()
    expect({ runs: run.mock.calls.length, isPending: queued.isPending }).toEqual({ runs: 0, isPending: false })
    queued.ask()
    await Promise.resolve()
    expect(run).toHaveBeenCalledTimes(1)
  })

  test("an ask from inside the work queues the next run", async () => {
    let runs = 0
    const queued: Queued = new Queued({
      when: soon,
      run: () => {
        if (++runs === 1) queued.ask()
      }
    })
    queued.ask()
    // a timer made inside another one waits a millisecond under fake timers
    await vi.advanceTimersByTimeAsync(10)
    expect(runs).toBe(2)
  })
})
