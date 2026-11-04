import { describe, expect, test, vi } from "vite-plus/test"

import { BrowserCopy, SaveQueue } from "spell/util/places/SaveQueue"
import { MemoryStorage } from "spell/util/persist/MemoryStorage"

/**
 * `SaveQueue`, on its own:  what both its users rely on.
 * - The rest of what it does is pinned from above, by `epic`'s `DraftSaver.test.ts`, and `PendingChanges.test.ts`.
 */
describe("SaveQueue", () => {
  test("one save at a time, in order:  a later one never lands before an earlier one", async () => {
    const landed: number[] = []
    let release = () => {}
    let count = 0
    const queue = new SaveQueue({
      wait: 0,
      save: async () => {
        const mine = ++count
        if (mine === 1) await new Promise<void>((resolve) => (release = resolve))
        landed.push(mine)
      }
    })
    queue.changed({ now: true })
    queue.changed({ now: true })
    await vi.waitFor(() => expect(count).toBe(1))
    release()
    await vi.waitFor(() => expect(landed).toEqual([1, 2]))
  })

  test("a failure says so, tries again by itself, and then says saved", async () => {
    let isDown = true
    const queue = new SaveQueue({
      wait: 0,
      retry: 5,
      save: async () => {
        if (isDown) throw new Error("no network.")
      }
    })
    queue.changed({ now: true })
    await vi.waitFor(() => expect(queue.state.kind).toBe("failed"))
    expect(queue.isError).toBe(true)
    expect(queue.text).toBe("kept in this browser only:  no network;  trying again every 0.005s")
    isDown = false
    await vi.waitFor(() => expect(queue.state.kind).toBe("saved"))
    expect(queue.isError).toBe(false)
  })

  test("off the server it saves nothing, and says so", async () => {
    const save = vi.fn(async () => {})
    const queue = new SaveQueue({ wait: 0, save, isOffServer: () => true })
    queue.changed({ now: true })
    await queue.settled
    expect(save).not.toHaveBeenCalled()
    expect(queue.state.kind).toBe("off server")
  })
})

describe("BrowserCopy", () => {
  test("keeps a value under its key, for the next one with that key", () => {
    const storage = new MemoryStorage()
    const copy = new BrowserCopy({ key: "test-store:a", storage: () => storage })
    copy.keep({ typed: "hello" })
    expect(new BrowserCopy({ key: "test-store:a", storage: () => storage }).kept()).toEqual({ typed: "hello" })
    copy.drop()
    expect(copy.kept()).toBeUndefined()
  })

  test("with no key, it keeps nothing and never fails", () => {
    const copy = new BrowserCopy({})
    copy.keep("x")
    expect(copy.kept()).toBeUndefined()
  })
})
