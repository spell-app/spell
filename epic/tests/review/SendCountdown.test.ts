import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { SendCountdown } from "spell/epic/review/SendCountdown"
import { COUNTDOWN_KEY, COUNTDOWN_MS } from "spell/epic/review/review.types"

////////////////
// ## Fakes
////////////////

/** A `Storage` on a `Map`;  `refuses`:  every write throws, as blocked site data does. */
class MapStorage {
  readonly values = new Map<string, string>()
  constructor(private readonly refuses = false) {}
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.refuses) throw new Error("blocked")
    this.values.set(key, value)
  }
}

/** A countdown on fake timers, what it fires counted. */
function countdownOn(storage = new MapStorage()) {
  const countdown = new SendCountdown({ storage: storage as unknown as Storage })
  const fired = vi.fn()
  countdown.onFire(fired)
  return { countdown, fired, storage }
}

/** `ms` gone by. */
function wait(ms: number) {
  vi.advanceTimersByTime(ms)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

////////////////
// ## Tests
////////////////

describe("SendCountdown (epic-engine P20)", () => {
  test("on by default:  something waiting, 2 minutes left alone, it fires ONCE and stops", () => {
    const { countdown, fired } = countdownOn()
    expect([countdown.isOnHere, countdown.isRunning]).toEqual([true, false])
    countdown.setPending(true)
    expect([countdown.isRunning, countdown.fractionLeft]).toEqual([true, 1])
    wait(COUNTDOWN_MS / 2)
    expect(countdown.fractionLeft).toBeCloseTo(0.5)
    expect(countdown.msLeft).toBe(COUNTDOWN_MS / 2)
    expect(fired).not.toHaveBeenCalled()
    wait(COUNTDOWN_MS / 2)
    expect(fired).toHaveBeenCalledTimes(1)
    expect(countdown.isRunning).toBe(false)
    wait(COUNTDOWN_MS * 3)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  test("every key, click or scroll starts it again from the top", () => {
    const { countdown, fired } = countdownOn()
    countdown.setPending(true)
    for (let minute = 0; minute < 5; minute++) {
      wait(COUNTDOWN_MS - 1000)
      countdown.activity()
      expect(countdown.fractionLeft).toBe(1)
    }
    expect(fired).not.toHaveBeenCalled()
    wait(COUNTDOWN_MS)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  test("nothing waiting:  no countdown, and activity starts none;  sent meanwhile, it stops", () => {
    const { countdown, fired } = countdownOn()
    countdown.activity()
    wait(COUNTDOWN_MS * 2)
    expect([countdown.isRunning, fired.mock.calls.length]).toEqual([false, 0])
    countdown.setPending(true)
    wait(COUNTDOWN_MS / 2)
    countdown.setPending(false)
    wait(COUNTDOWN_MS)
    expect([countdown.isRunning, fired.mock.calls.length]).toEqual([false, 0])
  })

  test("off:  never fires;  remembered for every page;  on again with something waiting, it starts", () => {
    const { countdown, fired, storage } = countdownOn()
    countdown.toggle()
    expect([countdown.isOnHere, storage.values.get(COUNTDOWN_KEY)]).toEqual([false, "off"])
    countdown.setPending(true)
    wait(COUNTDOWN_MS * 2)
    expect([countdown.isRunning, fired.mock.calls.length]).toEqual([false, 0])
    // another page in this browser reads the same mode
    expect(new SendCountdown({ storage: storage as unknown as Storage }).isOn).toBe(false)
    countdown.toggle()
    expect([countdown.isOnHere, countdown.isRunning]).toEqual([true, true])
    wait(COUNTDOWN_MS)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  test("turned off while running:  it stops at once", () => {
    const { countdown, fired } = countdownOn()
    countdown.setPending(true)
    wait(COUNTDOWN_MS - 5000)
    countdown.toggle(false)
    wait(COUNTDOWN_MS)
    expect([countdown.isRunning, fired.mock.calls.length]).toEqual([false, 0])
  })

  test("a storage that refuses:  the mode still holds on this page", () => {
    const { countdown } = countdownOn(new MapStorage(true))
    countdown.toggle(false)
    expect(countdown.isOnHere).toBe(false)
  })

  test("a send that failed (still waiting):  the next start is a fresh 2 minutes, never a loop", () => {
    const { countdown, fired } = countdownOn()
    countdown.setPending(true)
    wait(COUNTDOWN_MS)
    expect(fired).toHaveBeenCalledTimes(1)
    // the Send says again that something waits
    countdown.setPending(true)
    wait(COUNTDOWN_MS - 1000)
    expect(fired).toHaveBeenCalledTimes(1)
    wait(1000)
    expect(fired).toHaveBeenCalledTimes(2)
  })

  test("subscribers hear each tick, so the ring drains;  watch() hears activity in the page and its frames", () => {
    const { countdown } = countdownOn()
    const heard = vi.fn()
    countdown.subscribe(heard)
    countdown.setPending(true)
    wait(3000)
    expect(heard.mock.calls.length).toBeGreaterThanOrEqual(4)
    const page = new FakeWindow()
    const frame = new FakeWindow()
    page.document.frames.push({ localName: "iframe", contentWindow: frame } as unknown as HTMLIFrameElement)
    const unwatch = countdown.watch(page as unknown as Window)
    wait(30_000)
    frame.dispatchEvent(new Event("keydown"))
    expect(countdown.fractionLeft).toBe(1)
    wait(30_000)
    page.dispatchEvent(new Event("wheel"))
    expect(countdown.fractionLeft).toBe(1)
    unwatch()
    wait(30_000)
    page.dispatchEvent(new Event("pointerdown"))
    expect(countdown.fractionLeft).toBeCloseTo(0.75)
  })
})

/** A window with a document holding `frames`, enough for `watch()`. */
class FakeWindow extends EventTarget {
  readonly document = Object.assign(new EventTarget(), {
    frames: [] as HTMLIFrameElement[],
    querySelectorAll(this: { frames: HTMLIFrameElement[] }) {
      return this.frames
    }
  })
}
