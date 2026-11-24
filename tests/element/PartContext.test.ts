import { afterEach, describe, expect, it } from "vite-plus/test"

import { PartContext, type DOMElement } from "spell/element"

/**
 * `PartContext.isBarrier()`:  where a part's climb to its owner stops.
 * - A registered component that isn't a part stops it;  a part doesn't.
 * - A see-through one (`SeeThroughElement`, a view's element laying out as its drawing) stops it only while its
 *   component says parts may not pass.
 */
describe("PartContext.isBarrier()", () => {
  afterEach(() => PartContext.reset())

  /** A plain element with tag `tag`, its component `component`, as a defined element has. */
  function elementOf(tag: string, component?: object): Element {
    const element = document.createElement(tag)
    Object.defineProperty(element, "component", { value: component })
    return element as Element & Partial<DOMElement>
  }

  const vocabulary = { noun: "thing" } as Parameters<typeof PartContext.define>[0]["vocabulary"]

  it("stops at a component that isn't a part, never at a part or an element no component defined", () => {
    PartContext.define({ vocabulary, tag: "test-segment", isAPart: false })
    PartContext.define({ vocabulary, tag: "test-header", isAPart: true })
    expect(PartContext.isBarrier(elementOf("test-segment"))).toBe(true)
    expect(PartContext.isBarrier(elementOf("test-header"))).toBe(false)
    expect(PartContext.isBarrier(elementOf("div"))).toBe(false)
  })

  it("a see-through component lets parts climb past it while it says so, and stops them while it doesn't", () => {
    PartContext.define({ vocabulary, tag: "test-view", isAPart: false, isSeeThrough: true })
    let open = true
    const view = elementOf("test-view", { letsPartsThrough: () => open })
    expect(PartContext.isBarrier(view)).toBe(false)
    open = false
    expect(PartContext.isBarrier(view)).toBe(true)
    // not upgraded yet:  no component, a barrier as any component is
    expect(PartContext.isBarrier(elementOf("test-view"))).toBe(true)
  })
})
