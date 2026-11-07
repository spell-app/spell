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
