import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { SendCountdown } from "spell/epic/review/SendCountdown"
import { AUTO_SEND_KEY, COUNTDOWN_MS } from "spell/epic/review/review.types"

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

/** A countdown on fake timers, what it fires counted;  `typing`:  whether a note box holds it. */
function countdownOn(storage = new MapStorage()) {
  const held = { typing: false }
  const countdown = new SendCountdown({ storage: storage as unknown as Storage, isHeld: () => held.typing })
  const fired = vi.fn()
  countdown.onFire(fired)
  return { countdown, fired, storage, held }
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

describe("SendCountdown (epic-engine P20, P53)", () => {
  test("2 minutes by default:  something waiting, 2 minutes left alone, it fires ONCE and stops", () => {
    const { countdown, fired } = countdownOn()
    expect([countdown.choice, countdown.isOn, countdown.isRunning]).toEqual(["2m", true, false])
    countdown.setPending(true)
    expect([countdown.isRunning, countdown.hasRing, countdown.fractionLeft]).toEqual([true, true, 1])
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

  test("5 minutes:  it waits 5 minutes;  chosen while running, the wait starts again at the new length", () => {
    const { countdown, fired } = countdownOn()
    countdown.setPending(true)
    wait(COUNTDOWN_MS - 5000)
    countdown.choose("5m")
    expect(countdown.fractionLeft).toBe(1)
    wait(COUNTDOWN_MS * 2)
    expect(fired).not.toHaveBeenCalled()
    expect(countdown.msLeft).toBe(60_000)
    wait(60_000)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  test("Immediately:  no ring, it fires right after the change, never in the same turn", () => {
    const { countdown, fired } = countdownOn()
    countdown.choose("now")
    countdown.setPending(true)
    expect([countdown.isRunning, countdown.hasRing, fired.mock.calls.length]).toEqual([true, false, 0])
    wait(0)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  test("Off:  never fires;  remembered for every page;  on again with something waiting, it starts", () => {
    const { countdown, fired, storage } = countdownOn()
    countdown.choose("off")
    expect([countdown.isOn, storage.values.get(AUTO_SEND_KEY)]).toEqual([false, "off"])
    countdown.setPending(true)
    wait(COUNTDOWN_MS * 2)
    expect([countdown.isRunning, fired.mock.calls.length]).toEqual([false, 0])
    // another page in this browser reads the same choice
    expect(new SendCountdown({ storage: storage as unknown as Storage }).choice).toBe("off")
    countdown.choose("2m")
    expect([countdown.isOn, countdown.isRunning]).toEqual([true, true])
    wait(COUNTDOWN_MS)
    expect(fired).toHaveBeenCalledTimes(1)
  })

  // J147:  the wand's old keys never turn it off
  test("a NEW key:  P20's countdown keys are ignored, so a browser that turned the wand off starts at 2 minutes", () => {
    const storage = new MapStorage()
    storage.values.set("spell-epics:send-countdown", "off")
    storage.values.set("epic-send-countdown", "off")
    storage.values.set("spell-epics", JSON.stringify({ "send-countdown": "off" }))
    expect(countdownOn(storage).countdown.choice).toBe("2m")
  })

  test("turned off while running:  it stops at once", () => {
    const { countdown, fired } = countdownOn()
    countdown.setPending(true)
    wait(COUNTDOWN_MS - 5000)
    countdown.choose("off")
    wait(COUNTDOWN_MS)
    expect([countdown.isRunning, fired.mock.calls.length]).toEqual([false, 0])
  })

  test("a storage that refuses:  the choice still holds on this page", () => {
    const { countdown } = countdownOn(new MapStorage(true))
    countdown.choose("off")
    expect(countdown.isOn).toBe(false)
  })

  // J144
  test("a note box being typed in holds it full;  leaving the box starts the wait;  Immediately sends then", () => {
    const { countdown, fired, held } = countdownOn()
    countdown.setPending(true)
    held.typing = true
    wait(COUNTDOWN_MS * 3)
    expect([fired.mock.calls.length, countdown.fractionLeft]).toEqual([0, 1])
    held.typing = false
    wait(COUNTDOWN_MS - 1000)
    expect(fired).not.toHaveBeenCalled()
    wait(1000)
    expect(fired).toHaveBeenCalledTimes(1)
    countdown.choose("now")
    held.typing = true
    countdown.setPending(true)
    wait(10_000)
    expect(fired).toHaveBeenCalledTimes(1)
    held.typing = false
    countdown.check()
    expect(fired).toHaveBeenCalledTimes(2)
  })

  // J141
  test("read off the clock:  a hidden page whose timers slept sends on its next tick, or as it shows again", () => {
    const { countdown, fired } = countdownOn()
    countdown.setPending(true)
    // the clock moves 10 minutes, no tick runs (a hidden page's timers held back)
    vi.setSystemTime(Date.now() + COUNTDOWN_MS * 5)
    expect(countdown.fractionLeft).toBe(0)
    countdown.check()
    expect(fired).toHaveBeenCalledTimes(1)
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

  test("watch():  the page shown again checks the clock at once;  a pointer moving is not activity", () => {
    const { countdown, fired } = countdownOn()
    const page = new FakeWindow()
    const unwatch = countdown.watch(page as unknown as Window)
    countdown.setPending(true)
    wait(30_000)
    page.dispatchEvent(new Event("pointermove"))
    expect(countdown.fractionLeft).toBeCloseTo(0.75)
    vi.setSystemTime(Date.now() + COUNTDOWN_MS)
    page.document.dispatchEvent(new Event("visibilitychange"))
    wait(0)
    expect(fired).toHaveBeenCalledTimes(1)
    unwatch()
  })

  test("isTypingIn():  a text box with words, through shadow roots;  empty, or a button, no", () => {
    const box = { localName: "textarea", value: "" }
    const page = { activeElement: { localName: "div", shadowRoot: { activeElement: box } } }
    const typing = () => SendCountdown.isTypingIn(page as unknown as Document)
    expect(typing()).toBe(false)
    box.value = "half a note"
    expect(typing()).toBe(true)
    page.activeElement.shadowRoot.activeElement = { localName: "input", type: "text", value: "x" } as never
    expect(typing()).toBe(true)
    page.activeElement.shadowRoot.activeElement = { localName: "button", value: "x" } as never
    expect(typing()).toBe(false)
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
