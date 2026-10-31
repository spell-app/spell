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
