import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { DraftSaver } from "spell-epic/answers/DraftSaver"
import { ServerLink } from "spell-epic/review/ServerLink"

////////////////
// ## Fakes
////////////////

/** When the fake server stamps a save. */
const SAVED_AT = "2026-10-25T14:04:00"

/** A save call:  every save's `keepalive`, and the next failure. */
function fakeSave() {
  const saves: boolean[] = []
  const server = { failure: undefined as string | undefined }
  const save = vi.fn(async ({ keepalive }: { keepalive: boolean }) => {
    saves.push(keepalive)
    if (server.failure) throw new Error(server.failure)
    return SAVED_AT
  })
  return { saves, server, save }
}

/** A `window` enough for `watch()`:  events, and its document's visibility. */
function fakeWindow() {
  const document = Object.assign(new EventTarget(), { visibilityState: "visible" })
  return Object.assign(new EventTarget(), { document }) as unknown as Window & {
    document: { visibilityState: string }
  }
}

////////////////
// ## Tests
////////////////

describe("DraftSaver", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test("saves ONCE typing stops, `wait` ms after the last change;  says where it stands", async () => {
    const { saves, save } = fakeSave()
    const drafts = new DraftSaver({ save, wait: 500 })
    drafts.changed()
    await vi.advanceTimersByTimeAsync(300)
    drafts.changed()
    expect([drafts.text, saves.length]).toEqual(["not saved yet", 0])
    await vi.advanceTimersByTimeAsync(500)
    expect([drafts.text, saves, drafts.isUnsaved]).toEqual(["saved 14:04", [false], false])
  })

  test("a failed save says why, in red, and tries again every 3s until one goes through", async () => {
    const { saves, server, save } = fakeSave()
    const drafts = new DraftSaver({ save, wait: 500 })
    server.failure = "couldn't reach the page server."
    drafts.changed({ now: true })
    await vi.advanceTimersByTimeAsync(0)
    expect([drafts.isError, drafts.text]).toEqual([
      true,
      "kept in this browser only:  couldn't reach the page server;  trying again every 3s"
    ])
    await vi.advanceTimersByTimeAsync(3000)
    expect([saves.length, drafts.isError]).toEqual([2, true])
    server.failure = undefined
    await vi.advanceTimersByTimeAsync(3000)
    expect([saves.length, drafts.isError, drafts.text]).toEqual([3, false, "saved 14:04"])
  })

  test("sends AT ONCE when the page hides or goes, as a request that outlives it", async () => {
    const { saves, save } = fakeSave()
    const drafts = new DraftSaver({ save, wait: 10_000 })
    const window = fakeWindow()
    const unwatch = drafts.watch(window)
    drafts.changed()
    window.document.visibilityState = "hidden"
    window.document.dispatchEvent(new Event("visibilitychange"))
    await vi.advanceTimersByTimeAsync(0)
    expect(saves).toEqual([true])
    drafts.changed()
    window.dispatchEvent(new Event("pagehide"))
    await vi.advanceTimersByTimeAsync(0)
    expect(saves).toEqual([true, true])
    unwatch()
    // nothing left waiting:  the undo stopped its timers
    await vi.advanceTimersByTimeAsync(20_000)
    expect(saves).toHaveLength(2)
  })

  test("off the page server, saves nothing and says so;  the browser's copy keeps it", async () => {
    const { saves, save } = fakeSave()
    const link = new ServerLink({ page: "/x.html", protocol: "file:", fetch: vi.fn() as unknown as typeof fetch })
    const drafts = new DraftSaver({ save, wait: 500, link, key: "spell-test-draft:/x.html", storage: null })
    drafts.keep({ text: "hi" })
    drafts.changed({ now: true })
    await vi.advanceTimersByTimeAsync(0)
    expect([saves.length, drafts.text, drafts.kept()]).toEqual([
      0,
      "kept in this browser only:  this page isn't on the page server",
      { text: "hi" }
    ])
  })

  test("`done()` while a save is on its way:  it says nothing when it lands, and the browser's copy goes", async () => {
    let finish = (_at: string) => {}
    const save = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)))
    const drafts = new DraftSaver({ save, wait: 500, key: "spell-test-draft:/y.html", storage: null })
    drafts.keep("typed")
    drafts.changed({ now: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(drafts.text).toBe("saving…")
    drafts.done()
    finish(SAVED_AT)
    await vi.advanceTimersByTimeAsync(0)
    expect([drafts.text, drafts.kept()]).toEqual(["", undefined])
  })
})
