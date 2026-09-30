import { describe, expect, it } from "vitest"

import { expectAccessible } from "$test/a11y"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"

import "$/components/text"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/text/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one `<ui-text>`;  returns it with its root. */
async function text(html: string) {
  const host = await ElementFixture.render<UIHost>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=text]")!
  return { host, root }
}

describe("<ui-text> classes", () => {
  it.each([
    ["", "ui text"],
    ['size="large"', "ui large text"],
    ['size="medium"', "ui text"],
    ['color="red"', "ui red text"],
    ['state="error"', "ui error text"],
    ['color="red" inverted', "ui red inverted text"],
    ['inverted="no"', "ui text"],
    ['disabled="yes"', "ui disabled text"],
    ['size="huge" color="blue" state="warning" disabled', "ui huge blue warning disabled text"]
  ])("<ui-text %s>", async (attributes, classes) => {
    const { root } = await text(`<ui-text ${attributes}>Words</ui-text>`)
    expect(root.localName).toBe("span")
    expect(root.className).toBe(classes)
    expect(root.querySelector("slot")).not.toBeNull()
  })

  it("follows attribute changes", async () => {
    const { host, root } = await text(`<ui-text color="red">Words</ui-text>`)
    host.setAttribute("color", "green")
    await ElementFixture.tick()
    expect(root.className).toBe("ui green text")
  })
})

describe("<ui-text> states and looks", () => {
  it("sets :state(disabled)", async () => {
    const { host } = await text(`<ui-text disabled>x</ui-text>`)
    expect(host.matches(":state(disabled)")).toBe(true)
    host.removeAttribute("disabled")
    await ElementFixture.tick()
    expect(host.matches(":state(disabled)")).toBe(false)
  })

  it("flows inline:  the host has no box, the span is sized against the surrounding text", async () => {
    const { host, root } = await text(`<ui-text size="huge">x</ui-text>`)
    expect(getComputedStyle(host).display).toBe("contents")
    expect(getComputedStyle(root).display).toBe("inline")
    const surrounding = Number.parseFloat(getComputedStyle(host.parentElement!).fontSize)
    expect(Number.parseFloat(getComputedStyle(root).fontSize)).toBeCloseTo(surrounding * 4, 0)
  })

  it("paints a hue different from uncoloured text", async () => {
    const { root: plain } = await text(`<ui-text>x</ui-text>`)
    const { root: red } = await text(`<ui-text color="red">x</ui-text>`)
    expect(getComputedStyle(red).color).not.toBe(getComputedStyle(plain).color)
  })
})

describe("<ui-text> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})
