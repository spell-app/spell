import { onTestFinished, describe, expect, test } from "vite-plus/test"
import { createRoot, createSignal, flush, For, Show } from "solid-js"
import { Dynamic, render, type JSX } from "@solidjs/web"

import {
  DOMElement as DOMElementClass,
  ElementDefinition,
  UIComponent,
  type ComponentVocabulary,
  type DOMElement,
  type UIComponentClass
} from "spell/element"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

/**
 * `DOMElement`, "Disposed with its drawing" (epic `solid-2-final` I34):
 * an element Solid draws is disposed once the drawing that made it is let go and it's off the page;
 * kept, moved or made outside any drawing, it lives until `dispose()`.
 */

/** How many test tags `defineElement()` has made:  each test defines its own. */
let tagCount = 0

/** Define a test element (a fresh tag) whose `render()` returns `draw()`;  returns the tag. */
function defineElement(draw: () => JSX.Element = () => <span>drawn</span>): string {
  const { tag, define } = testElement(draw)
  define()
  return tag
}

/** A test element (a fresh tag) whose `render()` returns `draw()`, not defined yet:  its tag and its `define()`. */
function testElement(draw: () => JSX.Element = () => <span>drawn</span>) {
  const tag = `x-disposal-${++tagCount}`
  const vocabulary = {
    tag,
    noun: "disposal",
    attributes: [],
    events: [],
    slots: [],
    parts: [],
    states: [],
    texts: []
  } satisfies ComponentVocabulary
  /** The test element's component. */
  class TestElement extends UIComponent {
    render(): JSX.Element {
      return draw()
    }
  }
  Object.defineProperty(TestElement.prototype, "vocabulary", { value: vocabulary })
  const define = () => (TestElement as unknown as UIComponentClass & typeof UIComponent).define()
  /** Define it early, as a root does from its catalog:  its elements are pending until `define()`. */
  const defineEarly = () =>
    DOMElementClass.defineEarly(tag, {
      attributes: DOMElementClass.observedAttributesFor(new ElementDefinition(vocabulary, {})),
      isAFormControl: false
    })
  return { tag, define, defineEarly }
}

/** A fresh container on the page, removed after the test. */
function container(): HTMLElement {
  const element = document.createElement("div")
  document.body.append(element)
  onTestFinished(() => element.remove())
  return element
}

/** `element`, with a flag that turns true when it's disposed. */
function watched(element: Element): { element: DOMElement; isDisposed: () => boolean } {
  let isDisposed = false
  const domElement = element as DOMElement
  domElement.addReleaseCallback(() => (isDisposed = true))
  return { element: domElement, isDisposed: () => isDisposed }
}

describe("DOMElement:  disposed with its drawing", () => {
  test("a `<Show>` branch left takes its element off the page and disposes it", async () => {
    const tag = defineElement()
    const [shown, setShown] = createSignal(true)
    const root = container()
    onTestFinished(render(() => <Show when={shown()}>{<Dynamic component={tag} />}</Show>, root))
    await ElementFixture.settle(root)
    const { element, isDisposed } = watched(root.querySelector(tag)!)
    setShown(false)
    flush()
    expect({ connected: element.isConnected, disposed: isDisposed(), drawn: element.shadowRoot?.textContent }).toEqual({
      connected: false,
      disposed: true,
      drawn: ""
    })
  })

  test("a `<For>` row taken out is disposed;  the rows moved and kept are not", async () => {
    const tag = defineElement()
    const [rows, setRows] = createSignal(["a", "b", "c"])
    const root = container()
    onTestFinished(render(() => <For each={rows()}>{(row) => <Dynamic component={tag} data-row={row} />}</For>, root))
    await ElementFixture.settle(root)
    const row = (name: string) => watched(root.querySelector(`[data-row="${name}"]`)!)
    const [a, b, c] = [row("a"), row("b"), row("c")]
    setRows(["c", "a"])
    flush()
    expect([a.isDisposed(), b.isDisposed(), c.isDisposed()]).toEqual([false, true, false])
  })

  test("an element its drawing let go while it's elsewhere on the page lives on, until it's taken off", async () => {
    const tag = defineElement()
    const [shown, setShown] = createSignal(true)
    const root = container()
    const elsewhere = container()
    onTestFinished(render(() => <Show when={shown()}>{<Dynamic component={tag} />}</Show>, root))
    await ElementFixture.settle(root)
    const { element, isDisposed } = watched(root.querySelector(tag)!)
    elsewhere.append(element)
    setShown(false)
    flush()
    const whileShown = isDisposed()
    element.remove()
    expect({ whileShown, offThePage: isDisposed() }).toEqual({ whileShown: false, offThePage: true })
  })

  test("an element re-parented within its drawing keeps its component", async () => {
    const tag = defineElement()
    const root = container()
    const elsewhere = container()
    onTestFinished(render(() => <Dynamic component={tag} />, root))
    await ElementFixture.settle(root)
    const { element, isDisposed } = watched(root.querySelector(tag)!)
    const component = element.component
    elsewhere.append(element)
    element.remove()
    root.append(element)
    expect({ disposed: isDisposed(), same: element.component === component }).toEqual({ disposed: false, same: true })
  })

  test("a drawing kept off the page (a kept page) keeps its elements, until its root is let go", async () => {
    const tag = defineElement()
    const root = container()
    const kept = createRoot((dispose) => ({
      element: (<div>{<Dynamic component={tag} />}</div>) as HTMLElement,
      dispose
    }))
    root.append(kept.element)
    await ElementFixture.settle(root)
    const { isDisposed } = watched(kept.element.querySelector(tag)!)
    kept.element.remove()
    const whileKept = isDisposed()
    root.append(kept.element)
    const shownAgain = isDisposed()
    kept.element.remove()
    kept.dispose()
    expect({ whileKept, shownAgain, letGo: isDisposed() }).toEqual({ whileKept: false, shownAgain: false, letGo: true })
  })

  test("disposing a host disposes the elements its shadow root drew", async () => {
    const inner = defineElement()
    const outer = defineElement(() => <Dynamic component={inner} />)
    const host = (await ElementFixture.render(`<${outer}></${outer}>`)) as DOMElement
    await ElementFixture.settle(host)
    const { isDisposed } = watched(host.shadowRoot!.querySelector(inner)!)
    host.dispose()
    expect(isDisposed()).toBe(true)
  })

  test("disposing a host disposes the elements its shadow root made from HTML", async () => {
    const inner = defineElement()
    const outer = defineElement(() => <article innerHTML={`<p><${inner}></${inner}></p>`} />)
    const host = (await ElementFixture.render(`<${outer}></${outer}>`)) as DOMElement
    await ElementFixture.settle(host)
    const { isDisposed } = watched(host.shadowRoot!.querySelector(inner)!)
    host.dispose()
    expect(isDisposed()).toBe(true)
  })

  test("a pending element (its family not loaded) its drawing let go is let go, not set up when the family loads", async () => {
    const { tag, define, defineEarly } = testElement()
    defineEarly()
    const [shown, setShown] = createSignal(true)
    const root = container()
    onTestFinished(
      render(
        () => (
          <>
            <Dynamic component={tag} data-kept="" />
            <Show when={shown()}>{<Dynamic component={tag} />}</Show>
          </>
        ),
        root
      )
    )
    const gone = root.querySelector(`${tag}:not([data-kept])`) as DOMElement
    setShown(false)
    flush()
    define()
    await ElementFixture.settle(root)
    const kept = root.querySelector(tag) as DOMElement
    // the one gone was let go, not set up:  still pending, nothing holds it
    expect({ kept: kept.matches(":state(pending)"), gone: gone.matches(":state(pending)") }).toEqual({
      kept: false,
      gone: true
    })
  })

  test("an element made outside any drawing lives until `dispose()`", async () => {
    const tag = defineElement()
    const root = container()
    const { element, isDisposed } = watched(document.createElement(tag))
    root.append(element)
    await ElementFixture.settle(root)
    element.remove()
    const removed = isDisposed()
    element.dispose()
    expect({ removed, disposed: isDisposed() }).toEqual({ removed: false, disposed: true })
  })
})
