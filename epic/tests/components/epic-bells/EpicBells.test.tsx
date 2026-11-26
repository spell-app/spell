/**
 * Tests of `<epic-bells>` (epic `epic-engine` P86):  Bells & Whistles' dialog, its slider and switches, on a stubbed
 * settings route.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { BellSteps, type BellsValues } from "spell/epic/bells"
import { SendCountdown } from "spell/epic/review"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-checkbox"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-modal"
import "spell/ui/components/ui-slider"
import "spell/epic/components/epic-bells"

type BellsElement = E.DOMElement & { show(): void; close(): void; open: boolean }

/** The settings route, over values kept here;  `posts` every POST's body. */
class FakeSettings {
  values: BellsValues = BellSteps.defaults()
  posts: { values: BellsValues }[] = []

  readonly fetch = vi.fn(async (_input: string, init?: RequestInit): Promise<Response> => {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string) as { values: BellsValues }
      this.posts.push(body)
      this.values = body.values
    }
    return new Response(JSON.stringify({ values: this.values, view: {} }), {
      headers: { "content-type": "application/json" }
    })
  })
}

let settings: FakeSettings
let countdown: SendCountdown

beforeEach(() => {
  settings = new FakeSettings()
  vi.stubGlobal("fetch", settings.fetch)
  ;(window as { SPELL_SERVER?: object }).SPELL_SERVER = { token: "token" }
  countdown = new SendCountdown({ storage: null })
  SendCountdown.adopt(countdown)
})

afterEach(() => {
  vi.unstubAllGlobals()
  SendCountdown.adopt(undefined)
})

/** The dialog, opened and its switches read. */
async function open(): Promise<BellsElement> {
  const host = await ElementFixture.render<BellsElement>("<epic-bells></epic-bells>")
  await ElementFixture.settle(host)
  host.show()
  await vi.waitFor(() =>
    expect(rowOf(host, "designReview").querySelector("ui-checkbox")!.hasAttribute("disabled")).toBe(false)
  )
  await ElementFixture.tick()
  return host
}

/** Step `key`'s row. */
function rowOf(host: Element, key: string): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>(`.row[data-step="${key}"]`)!
}

/** Is step `key`'s switch on, as drawn? */
function isOn(host: Element, key: string): boolean {
  return rowOf(host, key).querySelector("ui-checkbox")!.hasAttribute("selected")
}

/** What the slider's label reads. */
function shown(host: Element): string {
  return host.shadowRoot!.querySelector(".burn-shown")!.textContent!.trim()
}

/** Move the slider to stop `index`, as a person would. */
async function moveSlider(host: Element, index: number) {
  const slider = host.shadowRoot!.querySelector("ui-slider")!
  slider.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: index } }))
  await ElementFixture.tick()
}

/** Flip step `key`'s switch, as a person would. */
async function flip(host: Element, key: string, on: boolean) {
  const box = rowOf(host, key).querySelector("ui-checkbox")!
  box.dispatchEvent(new CustomEvent("ui-changed", { detail: { selected: on } }))
  await ElementFixture.tick()
}

describe("<epic-bells>", () => {
  test("a row per step, grouped, each with its title, sentence and cost;  every switch on;  axe", async () => {
    const host = await open()
    const shadow = host.shadowRoot!
    expect(shadow.querySelectorAll(".row")).toHaveLength(BellSteps.STEPS.length)
    expect(shadow.querySelectorAll(".group")).toHaveLength(BellSteps.GROUPS.length)
    const row = rowOf(host, "designReview")
    expect(row.querySelector(".title")!.textContent).toBe("Design review")
    expect(row.querySelector(".sentence")!.textContent).toMatch(/screenshots/)
    expect(row.querySelector(".cost")!.textContent!.trim()).toBe("high")
    expect(BellSteps.STEPS.every((step) => isOn(host, step.key))).toBe(true)
    expect(shown(host)).toBe("High")
    await expectAccessible(shadow.querySelector(".bells")!)
  })

  test("the slider sets the switches at once;  a flip below High shows Custom;  a move clears it", async () => {
    const host = await open()
    await moveSlider(host, 0)
    expect(shown(host)).toBe("Low")
    expect(isOn(host, "designReview")).toBe(false)
    expect(isOn(host, "stopStuckTests")).toBe(true)
    expect(rowOf(host, "designReview").querySelector("ui-checkbox")!.getAttribute("data-tooltip")).toMatch(/slider/)
    await flip(host, "designReview", true)
    expect(shown(host)).toBe("Custom")
    expect(isOn(host, "designReview")).toBe(true)
    await moveSlider(host, 1)
    expect(shown(host)).toBe("Medium")
    expect(isOn(host, "designReview")).toBe(false)
  })

  test("Save posts the values and closes;  opened again, they're read back", async () => {
    const host = await open()
    await flip(host, "speedTest", false)
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.save")!.click()
    await vi.waitFor(() => expect(host.open).toBe(false))
    expect(settings.posts).toHaveLength(1)
    expect(settings.posts[0].values.speedTest).toBe(false)
    host.show()
    await vi.waitFor(() => expect(isOn(host, "speedTest")).toBe(false))
  })

  test("the × and Cancel drop what wasn't saved", async () => {
    const host = await open()
    await flip(host, "speedTest", false)
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.close")!.click()
    await vi.waitFor(() => expect(host.open).toBe(false))
    expect(settings.posts).toHaveLength(0)
    host.show()
    await vi.waitFor(() => expect(isOn(host, "speedTest")).toBe(true))
  })

  test("Auto Send's row is the page's own choice:  off sets it Off, on Save", async () => {
    countdown.choose("5m")
    const host = await open()
    expect(isOn(host, "autoSend")).toBe(true)
    await flip(host, "autoSend", false)
    expect(countdown.choice).toBe("5m")
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.save")!.click()
    await vi.waitFor(() => expect(countdown.choice).toBe("off"))
  })
})
