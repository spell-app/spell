import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { LoadOnce } from "spell/util/LoadOnce"

afterEach(() => {
  vi.restoreAllMocks()
})

/** A load that fails the first time and succeeds after:  `load.mock.calls.length` counts the starts. */
function flaky() {
  return vi.fn().mockRejectedValueOnce(new Error("no")).mockResolvedValue("yes")
}

describe("LoadOnce.get()", () => {
  test("starts each key's load ONCE, and hands every caller the same promise", async () => {
    const loads = new LoadOnce<string, string>()
    const load = vi.fn(async () => "a")
    const first = loads.get("a", load)
    expect(loads.get("a", load)).toBe(first)
    expect(await first).toBe("a")
    expect(load).toHaveBeenCalledOnce()
    expect([...loads.keys()]).toEqual(["a"])
  })

  test("`fresh` starts a new load, kept in place of the old", async () => {
    const loads = new LoadOnce<string, number>()
    let count = 0
    const load = async () => ++count
    await loads.get("a", load)
    expect(await loads.get("a", load, { fresh: true })).toBe(2)
    expect(await loads.get("a", load)).toBe(2)
  })

  test("`kept`, the default:  a failure is the answer for good", async () => {
    const loads = new LoadOnce<string, string>()
    const load = flaky()
    await expect(loads.get("a", load)).rejects.toThrow("no")
    await expect(loads.get("a", load)).rejects.toThrow("no")
    expect(load).toHaveBeenCalledOnce()
  })

  test("`forgotten`:  the next caller tries again after a failure", async () => {
    const loads = new LoadOnce<string, string>({ failures: "forgotten" })
    const load = flaky()
    await expect(loads.get("a", load)).rejects.toThrow("no")
    expect(loads.has("a")).toBe(false)
    expect(await loads.get("a", load)).toBe("yes")
    expect(load).toHaveBeenCalledTimes(2)
  })

  test("`forgotten offline`:  forgotten ONLY while the browser says it's offline", async () => {
    const loads = new LoadOnce<string, string>({ failures: "forgotten offline" })
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const offlineLoad = flaky()
    await expect(loads.get("a", offlineLoad)).rejects.toThrow("no")
    expect(await loads.get("a", offlineLoad)).toBe("yes")

    online.mockReturnValue(true)
    const onlineLoad = flaky()
    await expect(loads.get("b", onlineLoad)).rejects.toThrow("no")
    await expect(loads.get("b", onlineLoad)).rejects.toThrow("no")
    expect(onlineLoad).toHaveBeenCalledOnce()
  })

  test("a load that THROWS is a rejection, never a throw", async () => {
    const loads = new LoadOnce<string, string>({ failures: "forgotten" })
    const thrown = () => {
      throw new Error("sync")
    }
    await expect(loads.get("a", thrown)).rejects.toThrow("sync")
  })
})

describe("LoadOnce.set() / forget()", () => {
  test("`set()` makes a value the answer;  `forget()` drops one key, or every key", async () => {
    const loads = new LoadOnce<string, string>()
    const load = vi.fn(async () => "loaded")
    loads.set("a", "saved")
    expect(await loads.get("a", load)).toBe("saved")
    await loads.get("b", load)
    loads.forget("a")
    expect([...loads.keys()]).toEqual(["b"])
    loads.forget()
    expect(loads.has("b")).toBe(false)
    expect(load).toHaveBeenCalledOnce()
  })
})

describe("LoadOnce.abortable()", () => {
  test("ends one wait early, and the shared load carries on", async () => {
    const loads = new LoadOnce<string, string>()
    let finish!: (value: string) => void
    const shared = loads.get("a", () => new Promise((resolve) => (finish = resolve)))
    const controller = new AbortController()
    const waiting = LoadOnce.abortable(shared, controller.signal)
    controller.abort()
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" })
    finish("done")
    expect(await shared).toBe("done")
  })

  test("the promise's own answer or failure, while it isn't aborted", async () => {
    const { signal } = new AbortController()
    expect(await LoadOnce.abortable(Promise.resolve("yes"), signal)).toBe("yes")
    await expect(LoadOnce.abortable(Promise.reject(new Error("no")), signal)).rejects.toThrow("no")
  })

  test("a signal aborted already:  at once", async () => {
    const signal = AbortSignal.abort()
    await expect(LoadOnce.abortable(new Promise(() => {}), signal)).rejects.toMatchObject({ name: "AbortError" })
  })
})

describe("LoadOnce.valueOf()", () => {
  test("the value once its load is in;  nothing before, or after a failure", async () => {
    const loads = new LoadOnce<string, string>()
    const loading = loads.get("a", async () => "loaded")
    expect(loads.valueOf("a")).toBeUndefined()
    await loading
    expect(loads.valueOf("a")).toBe("loaded")
    await loads.get("b", async () => Promise.reject(new Error("no"))).catch(() => undefined)
    expect(loads.valueOf("b")).toBeUndefined()
    loads.set("c", "saved")
    expect(loads.valueOf("c")).toBe("saved")
    loads.forget()
    expect(loads.valueOf("a")).toBeUndefined()
  })
})

describe("LoadOnce.ahead()", () => {
  /** A button on the page, its hover delay 20ms. */
  function button() {
    const element = document.createElement("button")
    element.style.setProperty("--ui-hover-delay", "20ms")
    document.body.append(element)
    return element
  }

  test("starts once the pointer has rested for the hover delay, and only once", async () => {
    const element = button()
    const start = vi.fn()
    LoadOnce.ahead(element, start)
    element.dispatchEvent(new PointerEvent("pointerenter"))
    expect(start).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(start).toHaveBeenCalledOnce()
    element.dispatchEvent(new PointerEvent("pointerdown"))
    expect(start).toHaveBeenCalledOnce()
    element.remove()
  })

  test("the pointer leaving first cancels it;  focus or a press starts it at once", async () => {
    const element = button()
    const start = vi.fn()
    LoadOnce.ahead(element, start)
    element.dispatchEvent(new PointerEvent("pointerenter"))
    element.dispatchEvent(new PointerEvent("pointerleave"))
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(start).not.toHaveBeenCalled()
    element.focus()
    expect(start).toHaveBeenCalledOnce()

    const pressed = vi.fn()
    LoadOnce.ahead(element, pressed)
    element.dispatchEvent(new PointerEvent("pointerdown"))
    expect(pressed).toHaveBeenCalledOnce()
    element.remove()
  })

  test("under Save-Data, only a press starts it", async () => {
    vi.spyOn(LoadOnce, "isSavingData").mockReturnValue(true)
    const element = button()
    const start = vi.fn()
    const stop = LoadOnce.ahead(element, start)
    element.dispatchEvent(new PointerEvent("pointerenter"))
    element.focus()
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(start).not.toHaveBeenCalled()
    element.dispatchEvent(new PointerEvent("pointerdown"))
    expect(start).toHaveBeenCalledOnce()
    stop()
    element.remove()
  })
})

describe("LoadOnce.atIdle()", () => {
  test("starts once the browser is idle;  undone first, never", async () => {
    const start = vi.fn()
    LoadOnce.atIdle(start, { timeout: 50 })
    const cancelled = vi.fn()
    LoadOnce.atIdle(cancelled, { timeout: 50 })()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(start).toHaveBeenCalledOnce()
    expect(cancelled).not.toHaveBeenCalled()
  })

  test("under Save-Data, a load ahead is skipped;  one that must happen (`ahead: false`) still runs", async () => {
    vi.spyOn(LoadOnce, "isSavingData").mockReturnValue(true)
    const skipped = vi.fn()
    const needed = vi.fn()
    LoadOnce.atIdle(skipped, { timeout: 20 })
    LoadOnce.atIdle(needed, { timeout: 20, ahead: false })
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(skipped).not.toHaveBeenCalled()
    expect(needed).toHaveBeenCalledOnce()
  })
})
