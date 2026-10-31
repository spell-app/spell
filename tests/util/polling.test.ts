import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { pollWhileVisible } from "spell/util/polling"

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
