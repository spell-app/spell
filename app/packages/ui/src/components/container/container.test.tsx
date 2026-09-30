import { describe, expect, it } from "vitest"

import { expectAccessible } from "$test/a11y"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"

import "$/components/container"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/container/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

describe("<ui-container>", () => {
  it.each([
    ["", "ui container"],
    ["text", "ui text container"],
    ['text="no"', "ui container"],
    ['fluid="yes"', "ui fluid container"],
    ["wide", "ui wide container"],
    ['grid relaxed="very"', "ui grid very relaxed container"],
    ["grid relaxed", "ui grid relaxed container"],
    ['text-align="justified"', "ui justified container"],
    ['text-align="center"', "ui center aligned container"],
    ['scrolling="very short" resizable', "ui resizable very short scrolling container"]
  ])("<ui-container %s>", async (attributes, classes) => {
    const host = await ElementFixture.render<UIHost>(`<ui-container ${attributes}><p>x</p></ui-container>`)
    const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    expect(root.className).toBe(classes)
    expect(root.localName).toBe("div")
    expect(root.querySelector("slot")).not.toBeNull()
  })

  it("centres a fixed width on wide pages", async () => {
    const host = await ElementFixture.render<UIHost>(`<ui-container><p>x</p></ui-container>`)
    const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    const style = getComputedStyle(root)
    expect(style.marginLeft).toBe(style.marginRight)
  })
})

describe("<ui-container> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root, { rules: { "color-contrast": { enabled: false } } })
  })
})
