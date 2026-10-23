import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell-kit/test-helpers/ElementFixture"
import { expectAccessible } from "spell-kit/test-helpers/A11y"

import { SendCountdown } from "spell-epic/review"
import { COUNTDOWN_MS } from "spell-epic/review/review.types"

import "spell-epic/components/epic-send-buttons"

////////////////
// ## Fakes
////////////////

/** A fresh page countdown, on a storage of its own, for each test. */
function adoptCountdown() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  }
  const countdown = new SendCountdown({ storage: storage as unknown as Storage })
  SendCountdown.adopt(countdown)
  return countdown
}

/** `host`'s shadow part `name`. */
function part(host: Element, name: string): HTMLElement | null {
  return host.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)
}

/** Every `epic-send-asked` `host` sends, as its `auto`. */
function asks(host: Element): boolean[] {
  const heard: boolean[] = []
  host.addEventListener("epic-send-asked", (event) => heard.push((event as CustomEvent<{ auto: boolean }>).detail.auto))
  return heard
}

afterEach(() => SendCountdown.adopt(undefined))

////////////////
// ## Tests
////////////////

describe("<epic-send-buttons>", () => {
  test("idle:  a grey group, the plane and the wand (pressed:  countdown on by default);  axe", async () => {
    adoptCountdown()
    const group = await ElementFixture.render(`<epic-send-buttons send-tip="Nothing to send"></epic-send-buttons>`)
    await ElementFixture.settle()
    expect(part(group, "base")!.dataset.state).toBe("idle")
    expect([part(group, "send")!.title, part(group, "send")!.getAttribute("aria-label")]).toEqual([
      "Nothing to send",
      "Nothing to send"
    ])
    expect(part(group, "countdown")!.getAttribute("aria-pressed")).toBe("true")
    expect(part(group, "ring")).toBeNull()
    expect(part(group, "countdown")!.title).toMatch(/^Countdown on:  what you leave unsent goes by itself/)
    await expectAccessible(group)
  })

  test("the plane asks to send (`auto` false);  busy, it asks nothing", async () => {
    adoptCountdown()
    const group = await ElementFixture.render(`<epic-send-buttons state="unsent" count="2"></epic-send-buttons>`)
    await ElementFixture.settle()
    const heard = asks(group)
    expect(part(group, "count")!.textContent).toBe("2")
    part(group, "send")!.click()
    group.setAttribute("busy", "")
    await ElementFixture.settle()
    part(group, "send")!.click()
    expect(heard).toEqual([false])
  })

  describe("the countdown", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] }))
    afterEach(() => vi.useRealTimers())

    test("unsent:  the ring turns blue over 2 minutes, then it asks to send (`auto` true);  sent, it's gone", async () => {
      adoptCountdown()
      const group = await ElementFixture.render(`<epic-send-buttons state="unsent"></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(group)
      expect(part(group, "ring")).not.toBeNull()
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      await ElementFixture.settle()
      const elapsed = part(group, "ring")!.querySelector<SVGCircleElement>(".elapsed")!
      expect(parseFloat(elapsed.style.strokeDasharray)).toBeCloseTo(50, 0)
      expect(part(group, "countdown")!.title).toMatch(/sends by itself in 1:00 unless you keep typing/)
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      expect(heard).toEqual([true])
      group.setAttribute("state", "sent")
      await ElementFixture.settle()
      expect(part(group, "ring")).toBeNull()
    })

    test("a key on the page starts it again;  the wand turns it off:  the plane is filled, and nothing is sent", async () => {
      const countdown = adoptCountdown()
      const unwatch = countdown.watch(window)
      const group = await ElementFixture.render(`<epic-send-buttons state="unsent"></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(group)
      vi.advanceTimersByTime(COUNTDOWN_MS - 1000)
      document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }))
      vi.advanceTimersByTime(COUNTDOWN_MS - 1000)
      expect(heard).toEqual([])
      part(group, "countdown")!.click()
      await ElementFixture.settle()
      expect(part(group, "countdown")!.getAttribute("aria-pressed")).toBe("false")
      expect(part(group, "ring")).toBeNull()
      expect((group as HTMLElement & { matches(s: string): boolean }).matches(":state(waiting)")).toBe(true)
      expect(getComputedStyle(part(group, "send")!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
      vi.advanceTimersByTime(COUNTDOWN_MS * 2)
      expect(heard).toEqual([])
      unwatch()
    })

    test("drawn again (a guide's Send, at each redraw):  the countdown goes on where it was", async () => {
      adoptCountdown()
      const first = await ElementFixture.render(`<epic-send-buttons state="unsent"></epic-send-buttons>`)
      await ElementFixture.settle()
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      first.remove()
      const second = await ElementFixture.render(`<epic-send-buttons state="unsent"></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(second)
      const elapsed = part(second, "ring")!.querySelector<SVGCircleElement>(".elapsed")!
      expect(parseFloat(elapsed.style.strokeDasharray)).toBeCloseTo(50, 0)
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      expect(heard).toEqual([true])
    })
  })
})
