import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { reloadOutOfSight } from "spell/app/app/reloadOutOfSight"

/** A stand-in for `import.meta.hot`:  `disconnect()` is vite's client losing its server. */
function fakeHot() {
  const listeners: (() => void)[] = []
  return {
    on: (event: string, listener: () => void) => void (event === "vite:ws:disconnect" && listeners.push(listener)),
    disconnect: () => listeners.forEach((listener) => listener())
  }
}

const page = { visibilityState: "hidden" as DocumentVisibilityState }

beforeEach(() => {
  vi.useFakeTimers()
  page.visibilityState = "hidden"
  vi.stubGlobal("document", page)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("reloadOutOfSight()", () => {
  test("out of sight:  reloads as soon as the dev server answers, without waiting for the tab to show", async () => {
    const hot = fakeHot()
    let looks = 0
    const reload = vi.fn()
    reloadOutOfSight(hot, { isUp: async () => ++looks >= 3, reload })
    hot.disconnect()
    await vi.advanceTimersByTimeAsync(1000)
    expect(reload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(reload).toHaveBeenCalledOnce()
    expect(looks).toBe(3)
  })

  test("in sight, or shown before the server's back:  left to vite's own client", async () => {
    const hot = fakeHot()
    const reload = vi.fn()
    let isUp = false
    reloadOutOfSight(hot, { isUp: async () => isUp, reload })

    page.visibilityState = "visible"
    hot.disconnect()
    isUp = true
    await vi.advanceTimersByTimeAsync(3000)
    expect(reload).not.toHaveBeenCalled()

    page.visibilityState = "hidden"
    isUp = false
    hot.disconnect()
    await vi.advanceTimersByTimeAsync(1000)
    page.visibilityState = "visible"
    isUp = true
    await vi.advanceTimersByTimeAsync(3000)
    expect(reload).not.toHaveBeenCalled()
  })

  test("no `import.meta.hot` (a build):  nothing", () => {
    expect(() => reloadOutOfSight(undefined)).not.toThrow()
  })
})
