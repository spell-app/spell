import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { watchBuild, WATCH_AFTER_MS, WATCH_EVERY_MS } from "spell/app/app/runner/buildProgress"

describe("watchBuild()", () => {
  let answers: unknown[]
  const asked: string[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    answers = []
    asked.length = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        asked.push(url instanceof Request ? url.url : url.toString())
        const answer = answers.shift()
        if (answer === undefined) return new Response("API routine not defined", { status: 404 })
        return new Response(JSON.stringify(answer), { headers: { "content-type": "application/json" } })
      })
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test("asks nothing at first:  a built project's files come well before", async () => {
    const onProgress = vi.fn()
    const stop = watchBuild("@spell/examples/Solitaire", onProgress)
    await vi.advanceTimersByTimeAsync(WATCH_AFTER_MS - 1)
    stop()
    expect(asked).toEqual([])
    expect(onProgress).toHaveBeenCalledExactlyOnceWith(undefined)
  })

  test("then asks the page server every so often, handing on each answer while it's building", async () => {
    answers = [
      { building: true, seconds: 1, compiled: [] },
      { building: true, seconds: 2, compiled: ["@spell/library/cards"] }
    ]
    const onProgress = vi.fn()
    const stop = watchBuild("@spell/examples/Solitaire", onProgress)
    await vi.advanceTimersByTimeAsync(WATCH_AFTER_MS + WATCH_EVERY_MS)
    expect(asked).toEqual([
      "/api/projects/building/@spell/examples/Solitaire",
      "/api/projects/building/@spell/examples/Solitaire"
    ])
    expect(onProgress.mock.calls.map(([it]) => it)).toEqual([
      { building: true, seconds: 1, compiled: [] },
      { building: true, seconds: 2, compiled: ["@spell/library/cards"] }
    ])
    stop()
    expect(onProgress).toHaveBeenLastCalledWith(undefined)
  })

  test("a server with no such route (a static build):  says nothing", async () => {
    const onProgress = vi.fn()
    const stop = watchBuild("@spell/examples/Solitaire", onProgress)
    await vi.advanceTimersByTimeAsync(WATCH_AFTER_MS)
    expect(onProgress).toHaveBeenCalledExactlyOnceWith(undefined)
    stop()
  })
})
