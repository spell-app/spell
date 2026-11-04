import { describe, expect, it } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Fixture } from "spell/test-helpers/Fixture"
import { expectAccessible } from "spell/test-helpers/A11y"
import { FallbackStub, type StubHost } from "spell/ui/test-helpers/FallbackStub"
import { UISides } from "spell/ui/components/ui-sides"
import { SidesFallback } from "spell/ui/components/ui-sides/UISides.fallback"

import "spell/ui"

/** A `<ui-sides>`, as the tests read it. */
type Sides = HTMLElement & { value: unknown }

/** Its number boxes, by side. */
function boxes(host: Element): Record<string, HTMLInputElement> {
  const found: Record<string, HTMLInputElement> = {}
  for (const label of host.shadowRoot!.querySelectorAll("label")) {
    found[[...label.classList].find((word) => word !== "side")!] = label.querySelector("input")!
  }
  return found
}

/** Type `text` into `input`, and leave it (a change). */
async function type(input: HTMLInputElement, text: string) {
  await userEvent.clear(input)
  await userEvent.type(input, text)
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("<ui-sides>", () => {
  it("reads CSS's text, one to four numbers, top right bottom left", async () => {
    const host = await ElementFixture.render<Sides>(`<ui-sides aria-label="Margin" value="10 20"></ui-sides>`)
    const { top, left, right, bottom } = boxes(host)
    expect([top!.value, right!.value, bottom!.value, left!.value]).toEqual(["10", "20", "10", "20"])
    expect(host.shadowRoot!.querySelector(".letter")!.textContent).toBe("T")
    await expectAccessible(host)
  })

  it("gives back text for text:  a change sends `ui-changed` with CSS's text", async () => {
    const host = await ElementFixture.render<Sides>(`<ui-sides aria-label="Margin" value="1 2 3 4"></ui-sides>`)
    const values: unknown[] = []
    host.addEventListener("ui-changed", (event) => values.push((event as CustomEvent).detail.value))
    await type(boxes(host).left!, "9")
    expect(values).toEqual(["1 2 3 9"])
    expect(host.value).toBe("1 2 3 9")
  })

  it("gives back an object for an object, or for JSON text in the attribute;  a side left out is empty", async () => {
    const host = await ElementFixture.render<Sides>(`<ui-sides aria-label="Padding" value='{ "top": 8 }'></ui-sides>`)
    expect(boxes(host).bottom!.value).toBe("")
    await type(boxes(host).bottom!, "4")
    expect(host.value).toEqual({ top: 8, bottom: 4 })
    host.value = { left: 2 }
    await ElementFixture.settle(host)
    expect(boxes(host).left!.value).toBe("2")
  })

  it("shows only the sides `sides` names, in one row", async () => {
    const host = await ElementFixture.render<Sides>(`<ui-sides aria-label="Gap" sides="top bottom"></ui-sides>`)
    expect(Object.keys(boxes(host))).toEqual(["top", "bottom"])
    expect(host.shadowRoot!.querySelector(".ui")!.classList.contains("row")).toBe(true)
  })

  it("submits CSS's text of all four with its form", async () => {
    const form = Fixture.render<HTMLFormElement>(
      `<form><ui-sides name="margin" value='{ "top": 5 }'></ui-sides></form>`
    )
    await ElementFixture.settle(form.querySelector("ui-sides")!)
    expect(new FormData(form).get("margin")).toBe("5 0 0 0")
  })
})

describe("UISides statics", () => {
  it("reads both forms, and keeps the form it was given", () => {
    expect(UISides.lengthsOf("1 2 3")).toEqual({ top: 1, right: 2, bottom: 3, left: 2 })
    expect(UISides.lengthsOf({ top: 1 })).toEqual({ top: 1 })
    expect(UISides.withLength("1 2 3 4", "top", 7)).toBe("7 2 3 4")
    expect(UISides.withLength({ top: 1 }, "left", 3)).toEqual({ top: 1, left: 3 })
    expect(UISides.withLength('{"top": 1}', "top", undefined)).toEqual({})
    expect(UISides.textOf({})).toBeNull()
  })
})

FallbackStub.define(
  "x-fb-sides",
  (host, root, internals) => SidesFallback.render({ domElement: host, root, error: new Error("boom"), internals }),
  true
)

describe("SidesFallback", () => {
  it("draws four named number boxes, CSS's order, and submits their text", async () => {
    const form = Fixture.render<HTMLFormElement>(
      `<form><x-fb-sides name="margin" value="1 2 3 4" aria-label="Margin"></x-fb-sides></form>`
    )
    const host = form.querySelector<StubHost>("x-fb-sides")!
    const inputs = [...FallbackStub.shadow(host).querySelectorAll("input")]
    expect(inputs.map((input) => [input.getAttribute("aria-label"), input.value])).toEqual([
      ["top", "1"],
      ["right", "2"],
      ["bottom", "3"],
      ["left", "4"]
    ])
    expect(new FormData(form).get("margin")).toBe("1 2 3 4")
    await expectAccessible(host, { rules: { "color-contrast": { enabled: false } } })
  })
})
