import { describe, expect, test } from "vite-plus/test"
import { createSignal, flush } from "solid-js"
import type { JSX } from "@solidjs/web"

import {
  Disclosure,
  UIComponent,
  controlled,
  type ComponentVocabulary,
  type DOMElement,
  type UIComponentClass
} from "spell/element"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

/**
 * `Disclosure`:  one open / closed state, a guarded request with its cancelable event, then the after-event,
 * `aria-expanded`, and find-in-page opening it.
 */

/** How many test tags `defineFold()` has made:  each test defines its own. */
let tagCount = 0

/** A test fold:  `open` (`@controlled`), a button with `aria-expanded`, and a box hidden until found. */
type FoldComponent = UIComponent & {
  isOpen: boolean
  readonly disclosure: Disclosure
  button?: HTMLButtonElement
  box?: HTMLElement
}

/** Define a fold element, its open state `@controlled("open")`, with the four events;  returns its tag. */
function defineFold(): string {
  const tag = `x-fold-${++tagCount}`
  const vocabulary = {
    tag,
    noun: "fold",
    attributes: [{ name: "open", kind: "boolean", description: "Open." }],
    events: [
      { name: "ui-opening", detail: "{ open: boolean }", cancelable: true, description: "Opening." },
      { name: "ui-closing", detail: "{ open: boolean }", cancelable: true, description: "Closing." },
      { name: "ui-opened", detail: "{ open: boolean }", description: "Opened." },
      { name: "ui-closed", detail: "{ open: boolean }", description: "Closed." }
    ],
    slots: [],
    parts: [],
    states: [],
    texts: []
  } satisfies ComponentVocabulary
  /** The test fold's component. */
  class TestFold extends UIComponent {
    @controlled("open") accessor isOpen = false
    readonly disclosure = new Disclosure({
      component: this,
      member: "isOpen",
      onChange: (open) => this.disclosure.sendAfter(open)
    })
    button?: HTMLButtonElement
    box?: HTMLElement
    render(): JSX.Element {
      return (
        <>
          <button ref={(element) => (this.button = element)} aria-expanded={this.disclosure.ariaExpanded} />
          <div
            ref={[(element: HTMLElement) => (this.box = element), this.disclosure.revealOnMatch]}
            hidden={this.disclosure.hidden}
          >
            words
          </div>
        </>
      )
    }
  }
  Object.defineProperty(TestFold.prototype, "vocabulary", { value: vocabulary })
  ;(TestFold as unknown as UIComponentClass & typeof UIComponent).define()
  return tag
}

/** Render a fresh fold;  returns its component and every event it sent, by name. */
async function renderFold(attributes = "") {
  const tag = defineFold()
  const element = await ElementFixture.render<DOMElement>(`<${tag} ${attributes}></${tag}>`)
  const heard: string[] = []
  // the before-events say when they can't be cancelled;  the after-events never can
  for (const name of ["ui-opening", "ui-closing"])
    element.addEventListener(name, (event) => heard.push(`${name}${event.cancelable ? "" : " (not cancelable)"}`))
  for (const name of ["ui-opened", "ui-closed"]) element.addEventListener(name, () => heard.push(name))
  return { element, fold: element.component as unknown as FoldComponent, heard }
}

describe("Disclosure", () => {
  test("a request sends the cancelable event, changes the member, then the after-event;  aria-expanded follows", async () => {
    const { element, fold, heard } = await renderFold()
    expect(fold.button!.getAttribute("aria-expanded")).toBe("false")
    expect(fold.box!.getAttribute("hidden")).toBe("until-found")

    expect(fold.disclosure.request(true)).toBe(true)
    flush()
    expect(heard).toEqual(["ui-opening", "ui-opened"])
    expect((element as unknown as { open: boolean }).open).toBe(true)
    expect(fold.button!.getAttribute("aria-expanded")).toBe("true")
    expect(fold.box!.hasAttribute("hidden")).toBe(false)

    // already open:  nothing
    expect(fold.disclosure.open()).toBe(false)
    expect(fold.disclosure.toggle()).toBe(true)
    expect(heard).toEqual(["ui-opening", "ui-opened", "ui-closing", "ui-closed"])
    expect(fold.isOpen).toBe(false)
  })

  test("a cancelled ui-opening leaves it closed", async () => {
    const { element, fold, heard } = await renderFold()
    element.addEventListener("ui-opening", (event) => event.preventDefault())
    expect(fold.disclosure.open()).toBe(false)
    flush()
    expect(heard).toEqual(["ui-opening"])
    expect(fold.isOpen).toBe(false)
    expect(fold.button!.getAttribute("aria-expanded")).toBe("false")
  })

  test("the page setting `open` while handling ui-opening wins", async () => {
    const { element, fold } = await renderFold()
    element.addEventListener("ui-opening", () => ((element as unknown as { open: boolean }).open = false))
    expect(fold.disclosure.open()).toBe(false)
    expect(fold.isOpen).toBe(false)
  })

  test("a find-in-page match (beforematch) opens it:  ui-opening, not cancelable", async () => {
    const { fold, heard } = await renderFold()
    fold.box!.dispatchEvent(new Event("beforematch"))
    flush()
    expect(heard).toEqual(["ui-opening (not cancelable)", "ui-opened"])
    expect(fold.isOpen).toBe(true)
    expect(fold.button!.getAttribute("aria-expanded")).toBe("true")
  })

  test("with no component:  its own state, starting as `initial()` says, and no events", () => {
    const [initial, setInitial] = createSignal(false)
    const fold = new Disclosure({ initial })
    expect(fold.isOpen).toBe(false)
    setInitial(true)
    flush()
    // follows `initial()` until a request changes it
    expect(fold.isOpen).toBe(true)
    expect(fold.close()).toBe(true)
    setInitial(false)
    flush()
    expect(fold.isOpen).toBe(false)
    expect(fold.toggle()).toBe(true)
    expect(fold.isOpen).toBe(true)
  })

  test("`kept` holds the state;  `canChange` says no", () => {
    let kept = true
    const fold = new Disclosure({ kept: { isOpen: () => kept, setOpen: (open) => (kept = open) } })
    expect(fold.close()).toBe(true)
    expect(kept).toBe(false)

    const locked = new Disclosure({ canChange: (open) => !open })
    expect(locked.open()).toBe(false)
    expect(locked.isOpen).toBe(false)
  })
})
