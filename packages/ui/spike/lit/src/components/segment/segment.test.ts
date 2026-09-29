import { describe, expect, it } from "vitest"

import type { AttributeSpec } from "$/vocabulary"
import { segmentsVocabulary, segmentVocabulary } from "$/components/segment/segment.vocabulary.en"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import type { UISegment, UISegments } from "./index"

import "./index"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", { query: "?raw", import: "default", eager: true })

/** Render `html`, wait for its first update. */
async function render<T extends UISegment | UISegments = UISegment>(html: string): Promise<T> {
  const element = Fixture.render<T>(html)
  await element.updateComplete
  return element
}

/** The root `<div>`. */
function root(element: UISegment | UISegments): HTMLElement {
  return element.shadowRoot!.firstElementChild as HTMLElement
}

describe("<ui-segment> classes", () => {
  it("emits every keyOnly attribute's key", async () => {
    const specs: readonly AttributeSpec[] = segmentVocabulary.attributes
    for (const spec of specs.filter((spec) => spec.kind === "keyOnly")) {
      const element = await render(`<ui-segment ${spec.name}></ui-segment>`)
      expect(root(element).className, spec.name).toBe(`ui ${spec.key ?? spec.name} segment`)
    }
  })

  it("orders words as the grammar says", async () => {
    const element = await render(
      `<ui-segment size="small" color="red" raised padded="very" attached="top" text-align="center"></ui-segment>`
    )
    expect(root(element).className).toBe("ui small red raised very padded top attached center aligned segment")
  })

  it("emits keyOrValue attributes bare and with a value", async () => {
    const cases: [string, string][] = [
      ["stacked", "stacked"],
      [`stacked="tall"`, "tall stacked"],
      [`fitted="horizontally"`, "horizontally fitted"],
      [`scrolling="very long"`, "very long scrolling"],
      ["attached", "attached"],
      [`floated="left"`, "left floated"]
    ]
    for (const [attribute, expected] of cases) {
      const element = await render(`<ui-segment ${attribute}></ui-segment>`)
      expect(root(element).className, attribute).toBe(`ui ${expected} segment`)
    }
  })

  it("accepts yes / no booleans and treats medium as the default size", async () => {
    const yes = await render(`<ui-segment raised="yes" size="medium"></ui-segment>`)
    const no = await render(`<ui-segment raised="no"></ui-segment>`)
    expect(root(yes).className).toBe("ui raised segment")
    expect(root(no).className).toBe("ui segment")
  })
})

describe("<ui-segment> states and owner tokens", () => {
  it("sets piled / inverted / loading / disabled states", async () => {
    const element = await render(`<ui-segment piled inverted loading disabled>x</ui-segment>`)
    expect(element.matches(":state(piled):state(inverted):state(loading):state(disabled)")).toBe(true)
    // piled:  the host is the stacking context of the rotated sheets
    expect(getComputedStyle(element).zIndex).toBe("0")
    element.piled = false
    await element.updateComplete
    expect(element.matches(":state(piled)")).toBe(false)
  })

  it("declares --ui-inverted on its root, default included", async () => {
    const plain = await render(`<ui-segment></ui-segment>`)
    expect(getComputedStyle(root(plain)).getPropertyValue("--ui-inverted").trim()).toBe("0")
    const inverted = await render(`<ui-segment inverted></ui-segment>`)
    const style = getComputedStyle(root(inverted))
    expect(style.getPropertyValue("--ui-inverted").trim()).toBe("1")
    expect(style.colorScheme).toBe("dark")
  })

  it("is busy and announces loading", async () => {
    const element = await render(`<ui-segment loading>x</ui-segment>`)
    expect(element.internals.ariaBusy).toBe("true")
    expect(root(element).querySelector("[role=status]")!.textContent).toBe("Loading…")
    element.loading = false
    await element.updateComplete
    expect(element.internals.ariaBusy).toBeNull()
    expect(root(element).querySelector("[role=status]")).toBeNull()
  })

  it("makes its content inert while disabled", async () => {
    const element = await render(`<ui-segment disabled><button type="button">Go</button></ui-segment>`)
    const button = element.querySelector("button")!
    button.focus()
    expect(document.activeElement).not.toBe(button)
    element.disabled = false
    await element.updateComplete
    button.focus()
    expect(document.activeElement).toBe(button)
  })

  it("is focusable while scrolling", async () => {
    const element = await render(`<ui-segment scrolling="short">x</ui-segment>`)
    expect(root(element).getAttribute("tabindex")).toBe("0")
  })
})

describe("<ui-segments>", () => {
  it("renders the group root and states", async () => {
    const group = await render<UISegments>(
      `<ui-segments horizontal equal-width piled><ui-segment>A</ui-segment></ui-segments>`
    )
    expect(root(group).className).toBe("ui equal width horizontal piled segments")
    expect(root(group).getAttribute("part")).toBe("group")
    expect(group.matches(":state(piled)")).toBe(true)
    expect(segmentsVocabulary.attributes.some((spec) => spec.name === "equal-width")).toBe(true)
  })
})

describe("<ui-segment> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("passes axe on %s", async (path) => {
    const container = Fixture.render(EXAMPLES[path]!)
    const elements = [...container.querySelectorAll<UISegment>("ui-segment, ui-segments")]
    await Promise.all(elements.map((element) => element.updateComplete))
    await expectAccessible(container, AXE_OPTIONS)
  })
})

/**
 * NOTE: `color-contrast` is off, as for every component (see `REPORT.md`).  So is `heading-order`:  the
 * examples put Fomantic's `<h1>` ... `<h6>` demos under `<h4>` section titles, in the originals too.
 */
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false }, "heading-order": { enabled: false } } }
