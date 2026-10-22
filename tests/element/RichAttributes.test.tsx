import { createSignal, flush } from "solid-js"
import { render, type JSX } from "@solidjs/web"
import { onTestFinished, describe, expect, test } from "vite-plus/test"

import { UIComponent, type AttributeSpec, type ComponentVocabulary, type UIComponentClass } from "spell-kit/element"
import { RichAttributes } from "spell-kit/element/RichAttributes"

/**
 * `RichAttributes`:  a function or an object given to a dashed tag's attribute, as Solid hands a plain JSX prop.
 * - `on-<event>={f}` listens;  any other rich value sets the property;  text stays an attribute.
 * - On a defined element (its own `setAttribute()`), and on one whose tag is defined later (the page-wide patch).
 */

/** How many test tags `tagName()` has made:  each test has its own. */
let tagCount = 0

/** A fresh test tag, `x-rich-<n>`, not defined yet. */
function tagName(): string {
  return `x-rich-${++tagCount}`
}

/** Define `tag`:  an element with a `json` attribute `items`, a `string` attribute `label`, and a `ui-change` event. */
function define(tag: string) {
  const attributes: readonly AttributeSpec[] = [
    { name: "items", kind: "json", description: "A list." },
    { name: "label", kind: "string", description: "A label." }
  ]
  const vocabulary = {
    tag,
    noun: "rich",
    attributes,
    events: [{ name: "ui-change", detail: "unknown", description: "It changed." }],
    slots: [],
    parts: [],
    states: [],
    texts: []
  } satisfies ComponentVocabulary
  /** The test element's component. */
  class TestElement extends UIComponent {
    render(): JSX.Element {
      return null
    }
  }
  Object.defineProperty(TestElement.prototype, "vocabulary", { value: vocabulary })
  ;(TestElement as unknown as UIComponentClass & typeof UIComponent).define()
}

/** Render `draw()` into a fresh container on the page;  returns the container, removed after the test. */
function mount(draw: () => JSX.Element): HTMLElement {
  const root = document.createElement("div")
  document.body.append(root)
  const dispose = render(draw, root)
  onTestFinished(() => {
    dispose()
    root.remove()
  })
  flush()
  return root
}

/** The element with tag `tag` in `root`, with its rich members. */
function find(root: HTMLElement, tag: string) {
  return root.querySelector(tag) as HTMLElement & { items?: unknown; label?: string }
}

describe("RichAttributes, plain calls", () => {
  test("a defined element:  `on-*` with a function listens, an object sets the property, text stays an attribute", () => {
    const tag = tagName()
    define(tag)
    const element = document.createElement(tag) as HTMLElement & { items?: unknown; label?: string }
    document.body.append(element)
    onTestFinished(() => element.remove())
    const heard: unknown[] = []
    const items = [1, 2, 3]

    element.setAttribute("on-ui-change", ((event: CustomEvent) => heard.push(event.detail)) as unknown as string)
    element.setAttribute("items", items as unknown as string)
    element.setAttribute("label", "Hello")
    element.dispatchEvent(new CustomEvent("ui-change", { detail: "one" }))

    expect(heard).toEqual(["one"])
    expect(element.items).toBe(items)
    expect(element.getAttribute("items")).toBeNull()
    expect(element.label).toBe("Hello")
    expect(element.getAttribute("on-ui-change")).toBeNull()

    // a new function replaces the old;  removing the attribute drops the listener and clears the property
    element.setAttribute("on-ui-change", ((event: CustomEvent) =>
      heard.push(`new ${event.detail}`)) as unknown as string)
    element.dispatchEvent(new CustomEvent("ui-change", { detail: "two" }))
    element.removeAttribute("on-ui-change")
    element.removeAttribute("items")
    element.dispatchEvent(new CustomEvent("ui-change", { detail: "three" }))
    expect(heard).toEqual(["one", "new two"])
    expect(element.items).toBeUndefined()
  })

  test("an element whose tag is defined LATER keeps its function and object, and gets them as it upgrades", async () => {
    const tag = tagName()
    const element = document.createElement(tag) as HTMLElement & { items?: unknown }
    const heard: unknown[] = []
    const items = { a: 1 }
    element.setAttribute("on-ui-change", ((event: CustomEvent) => heard.push(event.detail)) as unknown as string)
    element.setAttribute("items", items as unknown as string)
    // held, not turned into text
    expect(element.getAttribute("on-ui-change")).toBeNull()
    expect(element.getAttribute("items")).toBeNull()

    document.body.append(element)
    onTestFinished(() => element.remove())
    define(tag)
    await customElements.whenDefined(tag)

    element.dispatchEvent(new CustomEvent("ui-change", { detail: "late" }))
    expect(heard).toEqual(["late"])
    expect(element.items).toEqual(items)
  })

  test("text and numbers on an undefined tag go straight to the browser", () => {
    const element = document.createElement(tagName())
    element.setAttribute("label", "Hi")
    element.setAttribute("count", 3 as unknown as string)
    expect(element.getAttribute("label")).toBe("Hi")
    expect(element.getAttribute("count")).toBe("3")
  })

  test("isRich():  functions and objects, not text, numbers, booleans or null", () => {
    expect([() => 1, {}, [], "a", 1, true, null, undefined].map(RichAttributes.isRich)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false
    ])
  })
})

describe("RichAttributes from Solid JSX", () => {
  test("plain props on a defined element:  on-ui-change, an object, text;  each follows its signal", () => {
    defineOnce(JSX_TAG)
    const heard: string[] = []
    const [items, setItems] = createSignal<unknown[]>([1])
    const [label, setLabel] = createSignal("one")
    const root = mount(() => (
      <x-rich-jsx
        on-ui-change={(event: CustomEvent) => heard.push(event.detail as string)}
        items={items()}
        label={label()}
      />
    ))
    const element = find(root, JSX_TAG)
    element.dispatchEvent(new CustomEvent("ui-change", { detail: "clicked" }))
    expect(heard).toEqual(["clicked"])
    expect(element.items).toEqual([1])
    expect(element.label).toBe("one")

    setItems([1, 2])
    setLabel("two")
    flush()
    expect(element.items).toEqual([1, 2])
    expect(element.label).toBe("two")
  })

  test("an element Solid draws BEFORE its tag is defined gets its function and object as it upgrades", async () => {
    const heard: string[] = []
    const items = [3, 4]
    const root = mount(() => (
      <x-rich-late on-ui-change={(event: CustomEvent) => heard.push(event.detail as string)} items={items} />
    ))
    const element = find(root, LATE_TAG)
    expect(element.getAttribute("items")).toBeNull()

    define(LATE_TAG)
    await customElements.whenDefined(LATE_TAG)
    element.dispatchEvent(new CustomEvent("ui-change", { detail: "late" }))
    expect(heard).toEqual(["late"])
    expect(element.items).toEqual(items)
  })
})

/** The tag the JSX test draws:  written in the JSX, so defined once for the file. */
const JSX_TAG = "x-rich-jsx"

/** The tag the JSX test draws before defining it. */
const LATE_TAG = "x-rich-late"

/** Define `tag` unless it is already. */
function defineOnce(tag: string) {
  if (!customElements.get(tag)) define(tag)
}

/** What the two JSX tags take. */
type RichTestAttributes = {
  "on-ui-change"?: (event: CustomEvent) => void
  items?: unknown
  label?: string
}

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "x-rich-jsx": RichTestAttributes
      "x-rich-late": RichTestAttributes
    }
  }
}
