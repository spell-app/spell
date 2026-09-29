import { describe, expect, it } from "vitest"

import { expectAccessible } from "$test/a11y"

import { SpikeFixture } from "$spike/SpikeFixture"
import type { UIHost } from "$spike/UIHost"

import "$spike/components/divider"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/demo/examples/divider/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one `<ui-divider>`;  returns it with its root. */
async function divider(html: string) {
  const host = await SpikeFixture.render<UIHost>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=divider]")!
  return { host, root }
}

describe("<ui-divider>", () => {
  it.each([
    ["", "ui divider"],
    ['size="large"', "ui large divider"],
    ['size="medium"', "ui divider"],
    ['color="red"', "ui red divider"],
    ["horizontal", "ui horizontal divider"],
    ['horizontal="no"', "ui divider"],
    ['vertical="yes"', "ui vertical divider"],
    ["fitted clearing section inverted", "ui clearing fitted inverted section divider"],
    ['horizontal text-align="left"', "ui horizontal left aligned divider"]
  ])("<ui-divider %s>", async (attributes, classes) => {
    const { root } = await divider(`<ui-divider ${attributes}>Or</ui-divider>`)
    expect(root.className).toBe(classes)
  })

  it("is a separator, vertical with aria-orientation, around a slot", async () => {
    const { root } = await divider(`<ui-divider vertical>and</ui-divider>`)
    expect(root.getAttribute("role")).toBe("separator")
    expect(root.getAttribute("aria-orientation")).toBe("vertical")
    expect(root.querySelector("slot")).not.toBeNull()
    const { root: plain } = await divider(`<ui-divider></ui-divider>`)
    expect(plain.hasAttribute("aria-orientation")).toBe(false)
  })

  it("renders the `icon` shorthand's box before the text", async () => {
    const { root } = await divider(`<ui-divider horizontal icon="tag">Description</ui-divider>`)
    const box = root.firstElementChild!
    expect(box.className).toBe("icon")
    expect(box.getAttribute("part")).toBe("icon")
    await expect.poll(() => box.querySelector("svg")).not.toBeNull()
  })

  it("keeps the host's hidden property:  the hidden attribute is property dividerHidden", async () => {
    const { host, root } = await divider(`<ui-divider hidden></ui-divider>`)
    expect(root.getAttribute("role")).toBe("none")
    expect(root.className).toBe("ui hidden divider")
    // `divider.css`'s `:host([hidden])` overrides the UA's `display: none`:  a hidden divider keeps its spacing
    expect(getComputedStyle(host).display).toBe("contents")
    expect(typeof host.hidden).toBe("boolean")
    expect((host as unknown as { dividerHidden: unknown }).dividerHidden).toBe(true)
  })
})

describe("<ui-divider> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await SpikeFixture.render(EXAMPLES[path]!)
    await expectAccessible(root, { rules: { "color-contrast": { enabled: false } } })
  })
})
