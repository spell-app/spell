import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UIT } from "spell/ui/core"

import "spell/ui/components/ui-theme-menu"

/** Render `html` and wait for it. */
async function render(html: string) {
  const host = await ElementFixture.render<HTMLElement & { value: string }>(html)
  await ElementFixture.settle()
  return host
}

/** `host`'s swatches:  each one's value and name. */
function swatches(host: Element): HTMLElement[] {
  return [...host.shadowRoot!.querySelectorAll<HTMLElement>("[part~=swatch]")]
}

describe("<ui-hue-swatches>", () => {
  it("draws none first, then every one of Spell UI's colours, each named by its own name;  accessible", async () => {
    const host = await render(`<ui-hue-swatches aria-label="Tint"></ui-hue-swatches>`)
    expect(swatches(host).map((swatch) => swatch.getAttribute("value"))).toEqual(["", ...UIT.ThemeHues])
    expect(
      swatches(host)
        .map((swatch) => swatch.getAttribute("title"))
        .slice(0, 3)
    ).toEqual(["None", "Red", "Orange"])
    expect(swatches(host)[0]!.getAttribute("aria-checked")).toBe("true")
    await expectAccessible(host)
  })

  it("`hues` limits the colours;  `none-label` and `none-colors` name and draw the first", async () => {
    const host = await render(
      `<ui-hue-swatches hues="teal pink" none-label="Theme's own · #7c55e6" none-colors="#7c55e6 #b39cff"></ui-hue-swatches>`
    )
    expect(swatches(host).map((swatch) => swatch.getAttribute("value"))).toEqual(["", "teal", "pink"])
    expect(swatches(host)[0]!.getAttribute("title")).toBe("Theme's own · #7c55e6")
    expect(swatches(host)[0]!.style.getPropertyValue("--_none-dark")).toBe("#b39cff")
  })

  it("a click picks:  `value` moves and `ui-changed` says which;  none sends `undefined`", async () => {
    const host = await render(`<ui-hue-swatches value="teal"></ui-hue-swatches>`)
    const picked: (string | undefined)[] = []
    host.addEventListener("ui-changed", (event) => picked.push((event as CustomEvent<{ value?: string }>).detail.value))
    swatches(host)
      .find((swatch) => swatch.getAttribute("value") === "pink")!
      .click()
    await ElementFixture.settle()
    expect(host.value).toBe("pink")
    swatches(host)[0]!.click()
    expect(picked).toEqual(["pink", undefined])
  })

  it("arrow keys move AND pick, wrapping, as in any radio group", async () => {
    const host = await render(`<ui-hue-swatches hues="red teal"></ui-hue-swatches>`)
    const picked: (string | undefined)[] = []
    host.addEventListener("ui-changed", (event) => picked.push((event as CustomEvent<{ value?: string }>).detail.value))
    const first = swatches(host)[0]!
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(picked).toEqual(["teal"])
  })
})
