import { describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-segment"

/** Glass's dark glass for an inverted segment (`rules/glass.css`). */
const GLASS_INVERTED = "rgba(16, 15, 22, 0.96)"

/** `host`'s drawn box:  the background is its own, not the host's. */
function box(host: Element): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>(".ui.segment")!
}

/** What `value` computes to, as a background, inside `parent`:  the segment's own box, for the colour it wears. */
function probe(value: string, parent: Element = document.body): string {
  const element = parent.appendChild(document.createElement("div"))
  element.style.background = value
  const color = getComputedStyle(element).backgroundColor
  element.remove()
  return color
}

/** The page wears `theme`;  put back after the test. */
async function wear(theme: string) {
  await (await UI.load()).themes.apply(theme)
  onTestFinished(() => UI.themes.apply(undefined))
}

describe("<ui-segment inverted> under a theme's rules", () => {
  it("Glass darkens a plain inverted segment, but a coloured one keeps its colour", async () => {
    await wear("glass")
    const plain = await ElementFixture.render(`<ui-segment inverted>Plain</ui-segment>`)
    const blue = await ElementFixture.render(`<ui-segment color="blue" inverted>Blue</ui-segment>`)
    await ElementFixture.settle()
    await vi.waitFor(() => expect(getComputedStyle(box(plain)).backgroundColor).toBe(GLASS_INVERTED))
    expect(getComputedStyle(box(blue)).backgroundColor).not.toBe(GLASS_INVERTED)
    expect(getComputedStyle(box(blue)).backgroundColor).toBe(probe("var(--ui-color)", box(blue)))
  })

  it("a part of a Glass page wearing another theme's tokens (a site run in the editor):  its blue is that theme's", async () => {
    await wear("glass")
    // what a site's frame wears in the editor (`SiteThemes.tokens()`):  the theme's tokens, scoped to the frame
    const style = document.head.appendChild(document.createElement("style"))
    style.textContent = await UI.themes.scopedTokens("matrix", ".site-frame")
    const frame = document.body.appendChild(Object.assign(document.createElement("div"), { className: "site-frame" }))
    onTestFinished(() => {
      style.remove()
      frame.remove()
    })
    frame.innerHTML = `<ui-segment color="blue" inverted>Floor</ui-segment>`
    await ElementFixture.settle()
    const blue = frame.querySelector("ui-segment")!
    await vi.waitFor(() =>
      expect(getComputedStyle(box(blue)).backgroundColor).toBe(probe("var(--ui-color)", box(blue)))
    )
    expect(getComputedStyle(box(blue)).backgroundColor).not.toBe(GLASS_INVERTED)
  })
})
