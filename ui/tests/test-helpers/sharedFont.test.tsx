import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui"

/**
 * The shared `font`'s case words on every element, not only `<ui-text>` (epic `language` I18):
 * `all-caps` and `title-caps` reach the box that draws the words, whatever element that is
 * (a `<button>` doesn't inherit its case from the element, by the browser's own style sheet).
 */

/** Render `html`;  returns its first element's box named `part`. */
async function partOf(html: string, part: string): Promise<HTMLElement> {
  const host = await ElementFixture.render<DOMElement>(html)
  return host.shadowRoot!.querySelector<HTMLElement>(`[part~=${part}]`)!
}

describe("the shared `font`'s case on every element", () => {
  it.each([
    ["<ui-header>", `<ui-header font="title-caps">two words</ui-header>`, "header"],
    ["<ui-button>", `<ui-button font="title-caps">two words</ui-button>`, "button"],
    ["<ui-label>", `<ui-label font="title-caps">two words</ui-label>`, "label"],
    ["<ui-text>", `<ui-text font="title-caps">two words</ui-text>`, "text"]
  ])("%s:  `title-caps` capitalizes each word", async (_, html, part) => {
    expect(getComputedStyle(await partOf(html, part)).textTransform).toBe("capitalize")
  })

  it.each([
    ["<ui-header>", `<ui-header font="all-caps">two words</ui-header>`, "header"],
    ["<ui-button>", `<ui-button font="all-caps">two words</ui-button>`, "button"],
    ["<ui-label>", `<ui-label font="all-caps">two words</ui-label>`, "label"]
  ])("%s:  `all-caps` makes every letter a capital", async (_, html, part) => {
    expect(getComputedStyle(await partOf(html, part)).textTransform).toBe("uppercase")
  })
})

/*
 * The shared `font`'s weight, `shadow`, and the `poster` size (epic `language` P35, I63):
 * a poster's title or a logo, in heavy letters, a hard shadow behind them.
 */

describe("the shared `font`'s weight and `shadow` on every element", () => {
  it.each([
    ["<ui-header>", `<ui-header font="heavy">two words</ui-header>`, "header"],
    ["<ui-button>", `<ui-button font="heavy">two words</ui-button>`, "button"],
    ["<ui-label>", `<ui-label font="heavy">two words</ui-label>`, "label"],
    ["<ui-text>", `<ui-text font="heavy">two words</ui-text>`, "text"]
  ])("%s:  `heavy` is weight 900", async (_, html, part) => {
    expect(getComputedStyle(await partOf(html, part)).fontWeight).toBe("900")
  })

  it("`<ui-button>`:  `bold` beats the button's own semibold", async () => {
    const button = await partOf(`<ui-button font="bold">two words</ui-button>`, "button")
    expect(getComputedStyle(button).fontWeight).toBe("700")
  })

  it.each([
    ["<ui-header>", `<ui-header shadow="yellow">two words</ui-header>`, "header"],
    ["<ui-button>", `<ui-button shadow="yellow">two words</ui-button>`, "button"]
  ])("%s:  `shadow` draws a hard shadow down and to the right", async (_, html, part) => {
    const shadow = getComputedStyle(await partOf(html, part)).textShadow
    // `<colour> <x> <y> 0px`:  both offsets positive, no blur
    expect(shadow).toMatch(/^(rgb|oklch|color)\(.+\) \d+(\.\d+)?px \d+(\.\d+)?px 0px$/)
  })

  it.each([
    ["<ui-header>", `<ui-header size="poster">Bulbasaur</ui-header>`, "header", [2.4, 4]],
    ["<ui-button>", `<ui-button size="poster">PokéSpell</ui-button>`, "button", [2, 3.2]]
  ])('%s:  `size="poster"` grows with the window, between its floor and ceiling', async (_, html, part, range) => {
    const box = await partOf(html, part)
    // in ems of the text around it:  the element's own font size
    const text = Number.parseFloat(getComputedStyle((box.getRootNode() as ShadowRoot).host).fontSize)
    const size = Number.parseFloat(getComputedStyle(box).fontSize) / text
    const [floor, ceiling] = range as [number, number]
    expect(size >= floor - 0.01 && size <= ceiling + 0.01).toBe(true)
  })
})
