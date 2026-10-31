import { describe, expect, test, vi } from "vite-plus/test"

import { Loadable } from "spell/util/spell/Loadable"

/** A loadable that answers only when the test says so, and notes each load's signal and cancel. */
class HeldLoadable extends Loadable<string> {
  /** Each load so far, oldest first. */
  loads: { signal: AbortSignal; finish: (contents: string) => void; cancel: ReturnType<typeof vi.fn> }[] = []

  getLoader(_params: unknown, signal: AbortSignal): Promise<string> {
    const cancel = vi.fn()
    let finish!: (contents: string) => void
    const promise = new Promise<string>((resolve) => (finish = resolve))
    this.loads.push({ signal, finish, cancel })
    return Object.assign(promise, { cancel })
  }

  getSaver(): Promise<unknown> {
    throw new TypeError("HeldLoadable.getSaver():  it never saves")
  }
}

describe("Loadable.load()'s signal", () => {
  test("a newer load aborts the older one, and calls its `promise.cancel()` too", () => {
    const loadable = new HeldLoadable()
    void loadable.load("older")
    void loadable.load("newer")
    expect(loadable.loads[0]!.signal.aborted).toBe(true)
    expect(loadable.loads[0]!.cancel).toHaveBeenCalledTimes(1)
    expect(loadable.loads[1]!.signal.aborted).toBe(false)
  })

  test("unload() aborts what's in flight", () => {
    const loadable = new HeldLoadable()
    void loadable.load()
    loadable.unload()
    expect(loadable.loads[0]!.signal.aborted).toBe(true)
  })

  test("a load that FINISHED is never aborted, by itself or by what comes after", async () => {
    const loadable = new HeldLoadable()
    const loading = loadable.load()
    loadable.loads[0]!.finish("done")
    await loading
    expect(loadable.contents).toBe("done")
    expect(loadable.loads[0]!.signal.aborted).toBe(false)
    loadable.unload()
    expect(loadable.loads[0]!.signal.aborted).toBe(false)
  })

  test("setting `contents` aborts what's in flight, and its late answer changes nothing", async () => {
    const loadable = new HeldLoadable()
    const loading = loadable.load()
    loadable.contents = "set by hand"
    expect(loadable.loads[0]!.signal.aborted).toBe(true)
    loadable.loads[0]!.finish("late")
    await loading
    expect(loadable.contents).toBe("set by hand")
  })
})

describe("Loadable.unload()", () => {
  test("forgets its contents", async () => {
    const loadable = new HeldLoadable()
    loadable.contents = "something"
    loadable.unload()
    expect(loadable.contents).toBeUndefined()
    expect(loadable.isLoaded).toBe(false)
  })
})

describe("Loadable.loadError", () => {
  test("says why the last load failed, until one succeeds", async () => {
    class FailsOnce extends HeldLoadable {
      failed = false
      getLoader() {
        if (this.failed) return Promise.resolve("done")
        this.failed = true
        return Promise.reject(new Error("down"))
      }
    }
    const loadable = new FailsOnce()
    await expect(loadable.load()).rejects.toThrow("down")
    expect(loadable.loadError?.message).toBe("down")
    await loadable.load()
    expect(loadable.loadError).toBeUndefined()
  })
})
