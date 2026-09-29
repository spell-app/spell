import { describe, expect, it } from "vitest"

import type { AttributeSpec } from "$/vocabulary"
import { containerVocabulary } from "$/components/container/container.vocabulary.en"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import type { UIContainer } from "./index"

import "./index"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", { query: "?raw", import: "default", eager: true })

/** Render `html`, wait for its first update. */
async function render(html: string): Promise<UIContainer> {
  const element = Fixture.render<UIContainer>(html)
  await element.updateComplete
  return element
}

/** The root `<div>`. */
function root(element: UIContainer): HTMLElement {
  return element.shadowRoot!.firstElementChild as HTMLElement
}

describe("<ui-container>", () => {
  it("emits every keyOnly attribute's key", async () => {
    const specs: readonly AttributeSpec[] = containerVocabulary.attributes
    for (const spec of specs.filter((spec) => spec.kind === "keyOnly")) {
      const element = await render(`<ui-container ${spec.name}></ui-container>`)
      expect(root(element).className, spec.name).toBe(`ui ${spec.key ?? spec.name} container`)
    }
  })

  it("emits keyOrValue and alignment words, with yes / no booleans", async () => {
    const cases: [string, string][] = [
      [`grid relaxed="very"`, "ui grid very relaxed container"],
      [`scrolling="very short" resizable`, "ui resizable very short scrolling container"],
      [`text-align="justified" text="yes"`, "ui text justified container"],
      [`fluid="no"`, "ui container"]
    ]
    for (const [attributes, expected] of cases) {
      const element = await render(`<ui-container ${attributes}></ui-container>`)
      expect(root(element).className, attributes).toBe(expected)
    }
  })

  it("renders the part and slot, focusable only while scrolling", async () => {
    const plain = await render(`<ui-container>Text</ui-container>`)
    expect(root(plain).getAttribute("part")).toBe("container")
    expect(root(plain).querySelector("slot")).not.toBeNull()
    expect(root(plain).hasAttribute("tabindex")).toBe(false)
    const scrolling = await render(`<ui-container scrolling>Text</ui-container>`)
    expect(root(scrolling).getAttribute("tabindex")).toBe("0")
  })

  it.each(Object.keys(EXAMPLES))("passes axe on %s", async (path) => {
    const container = Fixture.render(EXAMPLES[path]!)
    await Promise.all([...container.querySelectorAll<UIContainer>("ui-container")].map((item) => item.updateComplete))
    await expectAccessible(container, AXE_OPTIONS)
  })
})

/** NOTE: `color-contrast` is off, as for every component (see `REPORT.md`). */
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } }
