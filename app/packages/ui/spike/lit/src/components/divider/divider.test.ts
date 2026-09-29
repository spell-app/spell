import { describe, expect, it } from "vitest"

import type { AttributeSpec } from "$/vocabulary"
import { dividerVocabulary } from "$/components/divider/divider.vocabulary.en"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import type { UIDivider } from "./index"

import "./index"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", { query: "?raw", import: "default", eager: true })

/** Render `html`, wait for its first update. */
async function render(html: string): Promise<UIDivider> {
  const element = Fixture.render<UIDivider>(html)
  await element.updateComplete
  return element
}

/** The root `<div>`. */
function root(element: UIDivider): HTMLElement {
  return element.shadowRoot!.firstElementChild as HTMLElement
}

describe("<ui-divider>", () => {
  it("emits every keyOnly attribute's key", async () => {
    const specs: readonly AttributeSpec[] = dividerVocabulary.attributes
    for (const spec of specs.filter((spec) => spec.kind === "keyOnly")) {
      const element = await render(`<ui-divider ${spec.name}></ui-divider>`)
      expect(root(element).className, spec.name).toBe(`ui ${spec.key ?? spec.name} divider`)
    }
  })

  it("orders size, colour, keyOnly and alignment words", async () => {
    const element = await render(`<ui-divider size="large" color="blue" horizontal text-align="left">Or</ui-divider>`)
    expect(root(element).className).toBe("ui large blue horizontal left aligned divider")
    const medium = await render(`<ui-divider size="medium" inverted="no"></ui-divider>`)
    expect(root(medium).className).toBe("ui divider")
  })

  it("is a separator with the text slot, vertical with an orientation", async () => {
    const plain = await render(`<ui-divider horizontal>Or</ui-divider>`)
    expect(root(plain).getAttribute("role")).toBe("separator")
    expect(root(plain).getAttribute("part")).toBe("divider")
    expect(root(plain).querySelector("slot")).not.toBeNull()
    const vertical = await render(`<ui-divider vertical>and</ui-divider>`)
    expect(root(vertical).getAttribute("aria-orientation")).toBe("vertical")
  })

  it("renders the icon shorthand before the text", async () => {
    const element = await render(`<ui-divider horizontal icon="tag">Description</ui-divider>`)
    const icon = root(element).firstElementChild!
    expect(icon.className).toBe("icon")
    expect(icon.getAttribute("part")).toBe("icon")
  })

  it("keeps the host's hidden property:  the hidden attribute is property dividerHidden", async () => {
    const element = await render(`<ui-divider hidden></ui-divider>`)
    expect(element.dividerHidden).toBe(true)
    expect(root(element).className).toBe("ui hidden divider")
    expect(root(element).getAttribute("role")).toBe("none")
    // `divider.css`'s `:host([hidden])` overrides the UA's `display: none`:  a hidden divider keeps its spacing
    expect(getComputedStyle(element).display).toBe("contents")
  })

  it.each(Object.keys(EXAMPLES))("passes axe on %s", async (path) => {
    const container = Fixture.render(EXAMPLES[path]!)
    await Promise.all([...container.querySelectorAll<UIDivider>("ui-divider")].map((item) => item.updateComplete))
    await expectAccessible(container, AXE_OPTIONS)
  })
})

/** NOTE: `color-contrast` is off, as for every component (see `REPORT.md`). */
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } }
