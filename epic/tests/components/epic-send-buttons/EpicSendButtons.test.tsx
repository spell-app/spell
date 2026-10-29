import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { SendCountdown } from "spell/epic/review"
import { COUNTDOWN_MS } from "spell/epic/review/review.types"

import "spell/epic/components/epic-send-buttons"

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

/** Every `epic-send-saving` `host` sends, as its `auto`. */
function asks(host: Element): boolean[] {
  const heard: boolean[] = []
  host.addEventListener("epic-send-saving", (event) =>
    heard.push((event as CustomEvent<{ auto: boolean }>).detail.auto)
  )
  return heard
}

afterEach(() => SendCountdown.adopt(undefined))

////////////////
// ## Tests
////////////////

describe("<epic-send-buttons>", () => {
  test("idle:  a grey group, the plane alone, no ring;  axe", async () => {
    adoptCountdown()
    const group = await ElementFixture.render(
      `<epic-send-buttons send-tip="Nothing to send" countdown></epic-send-buttons>`
    )
    await ElementFixture.settle()
    expect(part(group, "base")!.dataset.state).toBe("idle")
    expect([part(group, "send")!.title, part(group, "send")!.getAttribute("aria-label")]).toEqual([
      "Nothing to send",
      "Nothing to send"
    ])
    expect(group.matches(":state(countdown)")).toBe(true)
    expect(part(group, "ring")).toBeNull()
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

  // J142:  details pages and guides keep a Send you press
  test("without `countdown`:  Send alone, unsent waits filled for a press, the page's countdown never starts", async () => {
    const countdown = adoptCountdown()
    const group = await ElementFixture.render(`<epic-send-buttons state="unsent"></epic-send-buttons>`)
    await ElementFixture.settle()
    expect(part(group, "ring")).toBeNull()
    expect(group.matches(":state(waiting)")).toBe(true)
    expect(countdown.isRunning).toBe(false)
  })

  describe("the countdown (P53)", () => {
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] })
    )
    afterEach(() => vi.useRealTimers())

    test("unsent:  a ring round the PLANE drains over 2 minutes, then it asks to send (`auto` true);  sent, it's gone", async () => {
      adoptCountdown()
      const group = await ElementFixture.render(
        `<epic-send-buttons state="unsent" send-tip="Send 1 mark" countdown></epic-send-buttons>`
      )
      await ElementFixture.settle()
      const heard = asks(group)
      const ring = part(group, "ring")!
      expect(ring).not.toBeNull()
      // round the plane, inside its button:  a press anywhere on it still sends
      expect(part(group, "send")!.contains(ring)).toBe(true)
      expect(group.matches(":state(counting)")).toBe(true)
      // the pill's own outline goes while it counts:  ring and button never one border
      expect(getComputedStyle(part(group, "base")!).borderTopColor).toBe("rgba(0, 0, 0, 0)")
      // set apart from the plane:  wider than its round end
      expect(ring.getBoundingClientRect().width).toBeGreaterThan(part(group, "send")!.getBoundingClientRect().width + 6)
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      await ElementFixture.settle()
      const left = ring.querySelector<SVGCircleElement>(".left")!
      expect(parseFloat(left.style.strokeDasharray)).toBeCloseTo(50, 0)
      expect(getComputedStyle(left).strokeLinecap).toBe("round")
      expect(part(group, "send")!.title).toBe("Send 1 mark · sends by itself in 1:00;  click to send now")
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      expect(heard).toEqual([true])
      group.setAttribute("state", "sent")
      await ElementFixture.settle()
      expect(part(group, "ring")).toBeNull()
    })

    test("a press while it counts sends at once (`auto` false), and the countdown never fires after", async () => {
      adoptCountdown()
      const group = await ElementFixture.render(`<epic-send-buttons state="unsent" countdown></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(group)
      vi.advanceTimersByTime(10_000)
      part(group, "send")!.click()
      group.setAttribute("state", "sent")
      await ElementFixture.settle()
      vi.advanceTimersByTime(COUNTDOWN_MS * 2)
      expect(heard).toEqual([false])
    })

    test("a key on the page starts it again;  Auto Send Off:  the plane is filled, and nothing is sent", async () => {
      const countdown = adoptCountdown()
      const unwatch = countdown.watch(window)
      const group = await ElementFixture.render(`<epic-send-buttons state="unsent" countdown></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(group)
      vi.advanceTimersByTime(COUNTDOWN_MS - 1000)
      document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }))
      vi.advanceTimersByTime(COUNTDOWN_MS - 1000)
      expect(heard).toEqual([])
      countdown.choose("off")
      await ElementFixture.settle()
      expect(part(group, "ring")).toBeNull()
      expect(group.matches(":state(waiting)")).toBe(true)
      expect(getComputedStyle(part(group, "send")!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
      vi.advanceTimersByTime(COUNTDOWN_MS * 2)
      expect(heard).toEqual([])
      unwatch()
    })

    test("Immediately:  no ring, it asks to send right away", async () => {
      const countdown = adoptCountdown()
      countdown.choose("now")
      const group = await ElementFixture.render(`<epic-send-buttons countdown></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(group)
      group.setAttribute("state", "unsent")
      await ElementFixture.settle()
      expect(part(group, "ring")).toBeNull()
      vi.advanceTimersByTime(0)
      expect(heard).toEqual([true])
    })

    test("drawn again:  the countdown goes on where it was", async () => {
      adoptCountdown()
      const first = await ElementFixture.render(`<epic-send-buttons state="unsent" countdown></epic-send-buttons>`)
      await ElementFixture.settle()
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      first.remove()
      const second = await ElementFixture.render(`<epic-send-buttons state="unsent" countdown></epic-send-buttons>`)
      await ElementFixture.settle()
      const heard = asks(second)
      const left = part(second, "ring")!.querySelector<SVGCircleElement>(".left")!
      expect(parseFloat(left.style.strokeDasharray)).toBeCloseTo(50, 0)
      vi.advanceTimersByTime(COUNTDOWN_MS / 2)
      expect(heard).toEqual([true])
    })

    // J143
    test("a stage:  the ring goes round the Accept button's check;  its end asks to send (`auto` true), never Accept", async () => {
      adoptCountdown()
      const group = await ElementFixture.render(
        `<epic-send-buttons state="unsent" accept="Accept Overview" countdown></epic-send-buttons>`
      )
      await ElementFixture.settle()
      const heard = asks(group)
      const ring = part(group, "ring")!
      const check = part(group, "send")!.querySelector("ui-icon")!
      expect(ring.parentElement!.contains(check)).toBe(true)
      expect(ring.getBoundingClientRect().height).toBeLessThan(part(group, "send")!.getBoundingClientRect().height)
      vi.advanceTimersByTime(COUNTDOWN_MS)
      expect(heard).toEqual([true])
    })
  })
})

// epic `epic-engine` P29:  the stage button in the plane's place
describe("<epic-send-buttons accept>", () => {
  test("a check and its words in the plane's place, green, no badge;  a press asks as the plane's;  accepted:  outlined green", async () => {
    adoptCountdown().choose("off")
    const group = await ElementFixture.render(
      `<epic-send-buttons state="unsent" count="2" accept="Accept Overview" send-tip="The Overview is agreed"></epic-send-buttons>`
    )
    await ElementFixture.settle()
    const send = part(group, "send")!
    expect(send.textContent!.trim()).toBe("Accept Overview")
    expect(send.querySelector("ui-icon")!.getAttribute("name")).toBe("circle check")
    expect(part(group, "count")).toBeNull()
    expect(part(group, "base")!.dataset.state).toBe("idle")
    // never the plane's filled blue, the countdown off or not
    expect(getComputedStyle(send).backgroundColor).toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    const heard = asks(group)
    send.click()
    expect(heard).toEqual([false])
    const rule = () => getComputedStyle(part(group, "base")!).borderTopColor
    const grey = rule()
    group.setAttribute("accepted", "")
    await ElementFixture.tick()
    expect(part(group, "base")!.dataset.state).toBe("accepted")
    // the words' green
    expect(rule()).not.toBe(grey)
    expect(rule()).toBe(getComputedStyle(send).color)
    await expectAccessible(group)
  })
})

// Owen, 2026-10-25:  "Maybe try the thicker border if you are waiting on me to accept"
describe("<epic-send-buttons asks>", () => {
  test("waiting on you:  the pill's own border 2px #666, ONE border;  taken:  dotted;  none:  the hairline;  still the plane", async () => {
    adoptCountdown()
    const group = await ElementFixture.render(`<epic-send-buttons state="idle" asks="waiting"></epic-send-buttons>`)
    await ElementFixture.settle()
    const base = part(group, "base")!
    const ring = () => {
      const style = getComputedStyle(base)
      return [style.borderTopStyle, style.borderTopWidth, style.borderTopColor, style.outlineStyle]
    }
    // its own border, no outline beside it (Owen, 2026-10-25:  "there are two borders if you zoom in close")
    expect(ring()).toEqual(["solid", "2px", "rgb(102, 102, 102)", "none"])
    // grown 1px each way, so the round ends inside keep their size
    expect(base.getBoundingClientRect().height).toBe(30)
    expect(part(group, "send")!.querySelector("ui-icon")!.getAttribute("name")).toBe("paper plane")
    group.setAttribute("asks", "taken")
    await ElementFixture.tick()
    expect(ring()).toEqual(["dotted", "2px", "rgb(102, 102, 102)", "none"])
    group.removeAttribute("asks")
    await ElementFixture.tick()
    expect(ring().slice(0, 2)).toEqual(["solid", "1px"])
    expect(base.getBoundingClientRect().height).toBe(28)
    await expectAccessible(group)
  })
})
