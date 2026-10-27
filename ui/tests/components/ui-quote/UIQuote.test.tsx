import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-quote"

/** A `<ui-quote>` with `attributes`, in a paragraph;  its shadow quote. */
async function quote(attributes = "") {
  const wrapper = await ElementFixture.render<HTMLElement>(
    `<p>She said <ui-quote ${attributes}>hello there</ui-quote> and left.</p>`
  )
  await ElementFixture.settle()
  const host = wrapper.querySelector<DOMElement>("ui-quote")!
  return { host, root: host.shadowRoot!.querySelector<HTMLElement>("[part~=quote]")! }
}

describe("<ui-quote>", () => {
  it("is a block quote by default, with a bar on its leading edge", async () => {
    const { root } = await quote(`cite="https://example.com"`)
    expect(root.localName).toBe("blockquote")
    expect(root.getAttribute("cite")).toBe("https://example.com")
    expect(getComputedStyle(root).display).toBe("block")
    expect(parseFloat(getComputedStyle(root).borderInlineStartWidth)).toBeGreaterThan(0)
  })

  it("`inline`:  a `<q>` inside the sentence, with quotation marks", async () => {
    const { host, root } = await quote("inline")
    expect(root.localName).toBe("q")
    expect(host.matches(":state(inline)")).toBe(true)
    expect(getComputedStyle(root, "::before").content).not.toBe("none")
    await expectAccessible(host)
  })
})
