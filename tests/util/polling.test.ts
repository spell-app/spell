import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { msUntil, pollWhileVisible } from "spell/util/polling"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("pollWhileVisible()", () => {
  afterEach(() => vi.restoreAllMocks())

  /** The page says it's `state`, and tells whoever's listening. */
  function pageIs(state: DocumentVisibilityState) {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue(state)
    document.dispatchEvent(new Event("visibilitychange"))
  }

  test("looks every `seconds`, the first not at once;  stopping stops it", async () => {
    pageIs("visible")
    const look = vi.fn()
    const stop = pollWhileVisible(1, look)
    expect(look).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    expect(look).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(2000)
    expect(look).toHaveBeenCalledTimes(2)
  })

  test("asks nothing while the page is hidden, and looks as soon as it's back", async () => {
    pageIs("visible")
    const look = vi.fn()
    const stop = pollWhileVisible(1, look)
    pageIs("hidden")
    await vi.advanceTimersByTimeAsync(5000)
    expect(look).not.toHaveBeenCalled()
    pageIs("visible")
    expect(look).toHaveBeenCalledTimes(1)
    stop()
    pageIs("hidden")
    pageIs("visible")
    expect(look).toHaveBeenCalledTimes(1)
  })

  test("a look still waiting skips the next:  a slow server never piles them up", async () => {
    pageIs("visible")
    let finish = () => {}
    const look = vi.fn(() => new Promise<void>((done) => (finish = done)))
    const stop = pollWhileVisible(1, look)
    await vi.advanceTimersByTimeAsync(3000)
    expect(look).toHaveBeenCalledTimes(1)
    finish()
    await vi.advanceTimersByTimeAsync(1000)
    expect(look).toHaveBeenCalledTimes(2)
    stop()
  })

  test("a look that fails is logged, and the next still comes", async () => {
    pageIs("visible")
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const look = vi.fn(() => {
      throw new Error("no")
    })
    const stop = pollWhileVisible(1, look)
    await vi.advanceTimersByTimeAsync(2000)
    expect(look).toHaveBeenCalledTimes(2)
    expect(logged).toHaveBeenCalledTimes(2)
    stop()
  })
})

describe("once a day at a time (`check it once a day at 5am`)", () => {
  afterEach(() => vi.restoreAllMocks())

  /** The page says it's `state`, and tells whoever's listening. */
  function pageIs(state: DocumentVisibilityState) {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue(state)
    document.dispatchEvent(new Event("visibilitychange"))
  }

  const HOUR = 3600 * 1000

  test("msUntil():  today's 5am if it's still to come, else tomorrow's;  never 0", () => {
    const fourAm = new Date(2026, 10, 3, 4, 0).getTime()
    expect(msUntil({ hour: 5, minute: 0 }, fourAm)).toBe(HOUR)
    const fiveAm = new Date(2026, 10, 3, 5, 0).getTime()
    expect(msUntil({ hour: 5, minute: 0 }, fiveAm)).toBe(24 * HOUR)
    expect(msUntil({ hour: 5, minute: 30 }, fourAm)).toBe(1.5 * HOUR)
  })

  test("msUntil() on UTC's clock", () => {
    const now = Date.UTC(2026, 10, 3, 4, 0)
    expect(msUntil({ hour: 5, minute: 0, utc: true }, now)).toBe(HOUR)
  })

  test("looks at 5am, then each day at 5am;  nothing between, nor on showing again", async () => {
    vi.setSystemTime(new Date(2026, 10, 3, 4, 0))
    pageIs("visible")
    const look = vi.fn()
    const stop = pollWhileVisible(86400, look, { at: { hour: 5, minute: 0 } })
    pageIs("hidden")
    pageIs("visible")
    await vi.advanceTimersByTimeAsync(HOUR - 1000)
    expect(look).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(look).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(24 * HOUR)
    expect(look).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(24 * HOUR)
    expect(look).toHaveBeenCalledTimes(2)
  })

  test("a 5am that came while hidden is read as soon as the page shows", async () => {
    vi.setSystemTime(new Date(2026, 10, 3, 4, 0))
    pageIs("visible")
    const look = vi.fn()
    const stop = pollWhileVisible(86400, look, { at: { hour: 5, minute: 0 } })
    pageIs("hidden")
    await vi.advanceTimersByTimeAsync(2 * HOUR)
    expect(look).not.toHaveBeenCalled()
    pageIs("visible")
    expect(look).toHaveBeenCalledTimes(1)
    pageIs("hidden")
    pageIs("visible")
    expect(look).toHaveBeenCalledTimes(1)
    stop()
  })
})
