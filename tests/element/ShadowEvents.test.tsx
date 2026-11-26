import { onTestFinished, describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"
import { createSignal, flush, Show } from "solid-js"
import {
  DelegatedEvents,
  Dynamic,
  Portal,
  registerDelegatedContainer,
  render,
  unregisterDelegatedContainer,
  type JSX
} from "@solidjs/web"

import {
  UIComponent,
  type AttributeSpec,
  type ComponentVocabulary,
  type DOMElement,
  type UIComponentClass
} from "spell/element"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

/**
 * `ShadowEvents`:  Solid's event delegation inside each element's shadow root leaves nothing behind on the event.
 * - Page listeners see the platform's retargeted event:  `target` === the host, `composedPath()[0]` the inner node.
 * - Solid handlers OUTSIDE the element (an app's `<x-el onClick>`, an enclosing element's) still run, once.
 * - Tried on tiny test elements;  Spell UI's `ui/tests/test-helpers/events.test.tsx` does the same for real
 *   `ui-*` elements, with typing and focus, and a Solid app elsewhere on the page.
 */

/** What a listener saw:  `target`, `currentTarget`, `composedPath()[0]`, as `name()`s. */
type Seen = { target?: string; currentTarget?: string; path0?: string }

/** Record `event` as `Seen`. */
function see(event: Event): Seen {
  return {
    target: name(event.target),
    currentTarget: name(event.currentTarget),
    path0: name(event.composedPath()[0])
  }
}

/** An element's local name (`"host"` for a custom element), else the node's name (`#document`). */
function name(target: EventTarget | null | undefined): string | undefined {
  if (!target) return undefined
  const local = (target as Element).localName
  if (local?.includes("-")) return "host"
  return local ?? (target as Node).nodeName
}

/** How many test tags `defineElement()` has made:  each test defines its own. */
let tagCount = 0

/** Define a test element `<x-<noun>-<n>>` whose `render()` returns `draw()`;  returns its tag. */
function defineElement(noun: string, draw: () => JSX.Element, attributes: readonly AttributeSpec[] = []): string {
  const tag = `x-${noun}-${++tagCount}`
  const vocabulary = {
    tag,
    noun,
    attributes,
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
  ;(TestElement as unknown as UIComponentClass & typeof UIComponent).define()
  return tag
}

/** Define a field:  an `<input>` with a delegated `onInput`, and a `<button onClick>`;  `log` hears both. */
function defineField(log: string[] = []): string {
  return defineElement("field", () => (
    <>
      <input onInput={() => log.push("input")} />
      <button onClick={() => log.push("click")}>go</button>
    </>
  ))
}

/** A fresh container on the page, removed after the test. */
function container(): HTMLElement {
  const element = document.createElement("div")
  document.body.append(element)
  onTestFinished(() => element.remove())
  return element
}

/**
 * A Solid app rendering `<section onClick><tag onClick /></section>`:
 * a second delegation root, AROUND the element;  returns the element.
 * - Disposed after the test.
 */
function solidApp(tag: string, log: string[]): HTMLElement {
  const root = container()
  const dispose = render(
    () => (
      <section onClick={() => log.push("app section")}>
        <Dynamic component={tag} onClick={(event: Event) => log.push(`app host ${name(event.currentTarget)}`)} />
      </section>
    ),
    root
  )
  onTestFinished(dispose)
  return root.querySelector(tag) as HTMLElement
}

/** Render `<tag>` into a fresh container;  returns it once ready. */
async function mount(tag: string): Promise<DOMElement> {
  return ElementFixture.render<DOMElement>(`<${tag}></${tag}>`)
}

/** The first `selector` match in `host`'s shadow root. */
function inside<T extends Element = HTMLElement>(host: Element, selector: string): T {
  return host.shadowRoot!.querySelector(selector) as T
}

////////////////
// ## Page listeners
////////////////

describe("ShadowEvents page listeners", () => {
  test("a listener on the host sees `target` === host, `currentTarget` === host", async () => {
    const host = await mount(defineField())
    let seen: Seen = {}
    host.addEventListener("click", (event) => (seen = see(event)))
    inside(host, "button").click()
    expect(seen).toEqual({ target: "host", currentTarget: "host", path0: "button" })
  })

  test("listeners for `input`, `keydown`, `focusin` see the host too, not only `click`", async () => {
    const log: string[] = []
    // its own element, not `defineField()`:  other tests compare that one's `log` whole
    const tag = defineElement("typing", () => (
      <input
        onInput={() => log.push("input")}
        onKeyDown={() => log.push("keydown")}
        onFocusIn={() => log.push("focusin")}
      />
    ))
    const host = await mount(tag)
    const types = ["focusin", "keydown", "input"]
    const seen: Record<string, Seen[]> = {}
    for (const type of types) {
      const record = (event: Event) => (seen[type] ??= []).push(see(event))
      host.addEventListener(type, record)
      document.addEventListener(type, record)
      onTestFinished(() => document.removeEventListener(type, record))
    }
    await userEvent.type(inside(host, "input"), "a")
    // Solid's walk really ran for all three:  the component's own handlers fired
    expect(log).toEqual(types)
    for (const type of types) {
      expect(seen[type]![0]).toEqual({ target: "host", currentTarget: "host", path0: "input" })
      expect(seen[type]![1]).toEqual({ target: "host", currentTarget: "#document", path0: "input" })
    }
  })

  test("`stopPropagation()` in the component stops there:  no app handler, no page listener", () => {
    const log: string[] = []
    const tag = defineElement("stopper", () => <button onClick={(event) => event.stopPropagation()}>stop</button>)
    const host = solidApp(tag, log)
    host.addEventListener("click", () => log.push("page"))
    inside(host, "button").click()
    expect(log).toEqual([])
  })

  test("a component's own listener on its render root passes through untouched, and can be removed", async () => {
    const seen: Seen[] = []
    const record = (event: Event) => seen.push(see(event))
    const host = await mount(defineElement("own", () => <button onClick={() => {}}>own</button>))
    const root = host.shadowRoot!
    root.addEventListener("click", record)
    inside(host, "button").click()
    root.removeEventListener("click", record)
    inside(host, "button").click()
    expect(seen).toEqual([{ target: "button", currentTarget: "#document-fragment", path0: "button" }])
  })
})

////////////////
// ## Solid handlers outside the element
////////////////

describe("ShadowEvents Solid handlers outside", () => {
  test("an app's handlers run ONCE for a click inside the element;  page listeners still see the host", () => {
    const log: string[] = []
    const host = solidApp(defineField(log), log)
    const seen: Seen[] = []
    host.addEventListener("click", (event) => seen.push(see(event)))
    const record = (event: Event) => seen.push(see(event))
    document.addEventListener("click", record)
    onTestFinished(() => document.removeEventListener("click", record))
    inside(host, "button").click()
    expect(log).toEqual(["click", "app host host", "app section"])
    expect(seen[0]).toEqual({ target: "host", currentTarget: "host", path0: "button" })
    // NOTE:  `currentTarget` on the document is still wrong here:  the APP's container leaks it (plain Solid)
    expect(seen[1]).toMatchObject({ target: "host", path0: "button" })
  })

  test("handlers above a NESTED element run, with that element as `target`", async () => {
    const log: string[] = []
    const inner = defineField(log)
    const outer = defineElement("outer", () => (
      <div onClick={(event: Event) => log.push(`outer div ${name(event.target)}`)}>
        <Dynamic component={inner} onClick={(event: Event) => log.push(`outer host ${name(event.currentTarget)}`)} />
      </div>
    ))
    const host = await mount(outer)
    inside(inside(host, inner), "button").click()
    expect(log).toEqual(["click", "outer host host", "outer div host"])
  })

  test("slotted light content:  its handler, the component's and the app's each run once", async () => {
    const log: string[] = []
    const tag = defineElement("slotting", () => (
      <button onClick={(event) => log.push(`inner ${name(event.target)}`)} style={{ padding: "8px" }}>
        <slot />
      </button>
    ))
    const root = container()
    const dispose = render(
      () => (
        <main onClick={() => log.push("app main")}>
          <Dynamic component={tag} onClick={() => log.push("app host")}>
            <b onClick={() => log.push("app b")}>Save</b>
          </Dynamic>
        </main>
      ),
      root
    )
    onTestFinished(dispose)
    const host = root.querySelector(tag)!
    const seen: Seen[] = []
    host.addEventListener("click", (event) => seen.push(see(event)))
    await userEvent.click(host.querySelector("b")!)
    expect(log).toEqual(["app b", "inner b", "app host", "app main"])
    expect(seen).toEqual([{ target: "b", currentTarget: "host", path0: "b" }])
  })

  test("a nested element slotted into another:  the outer slot's ancestors run once, `target` = the nested host", async () => {
    const log: string[] = []
    const inner = defineField(log)
    const outer = defineElement("option", () => (
      <div role="option" onClick={(event: Event) => log.push(`option ${name(event.target)}`)}>
        <slot />
      </div>
    ))
    const host = await ElementFixture.render(`<${outer}><${inner}></${inner}></${outer}>`)
    inside(host.querySelector(inner)!, "button").click()
    expect(log).toEqual(["click", "option host"])
  })
})

////////////////
// ## Containers inside a render root
////////////////

describe("ShadowEvents containers inside a render root", () => {
  test("a Solid `render()` into the shadow root:  its handlers, then the component's, then the app's, once each", async () => {
    const log: string[] = []
    const target = document.createElement("div")
    const tag = defineElement("nested-render", () => (
      <section onClick={(event: Event) => log.push(`section ${name(event.target)}`)}>{target}</section>
    ))
    const host = solidApp(tag, log)
    await (host as DOMElement).ready
    const dispose = render(() => <button onClick={() => log.push("nested button")}>go</button>, target)
    onTestFinished(dispose)
    const seen: Seen[] = []
    host.addEventListener("click", (event) => seen.push(see(event)))
    target.querySelector("button")!.click()
    expect(log).toEqual(["nested button", "section button", "app host host", "app section"])
    expect(seen).toEqual([{ target: "host", currentTarget: "host", path0: "button" }])
  })

  test("a `<Portal>` mounted inside the same shadow root:  handlers follow the portal's place in the JSX", async () => {
    const log: string[] = []
    const target = document.createElement("div")
    const tag = defineElement("portal", () => (
      <>
        <aside>{target}</aside>
        <section onClick={() => log.push("section")}>
          <Portal mount={target}>
            <button onClick={() => log.push("portal button")}>go</button>
          </Portal>
        </section>
      </>
    ))
    const host = solidApp(tag, log)
    await (host as DOMElement).ready
    await ElementFixture.tick()
    const seen: Seen[] = []
    host.addEventListener("click", (event) => seen.push(see(event)))
    target.querySelector("button")!.click()
    expect(log).toEqual(["portal button", "section", "app host host", "app section"])
    expect(seen).toEqual([{ target: "host", currentTarget: "host", path0: "button" }])
  })

  test("a `<Portal>` out to the page:  the component's handlers run once, from the portal's place in the JSX", async () => {
    const log: string[] = []
    const target = container()
    const tag = defineElement("portal-out", () => (
      <section onClick={() => log.push("section")}>
        <Portal mount={target}>
          <button onClick={() => log.push("portal button")}>go</button>
        </Portal>
      </section>
    ))
    await mount(tag)
    await ElementFixture.tick()
    target.querySelector("button")!.click()
    expect(log).toEqual(["portal button", "section"])
  })
})

////////////////
// ## Reconnecting
////////////////

describe("ShadowEvents reconnecting", () => {
  test("moving the element keeps ONE working listener", async () => {
    const log: string[] = []
    const host = await mount(defineField(log))
    const parent = host.parentElement!
    host.remove()
    await Promise.resolve()
    parent.append(host)
    inside(host, "button").click()
    expect(log).toEqual(["click"])
  })

  test("`dispose()`, then a fresh render on the next connect:  still ONE working listener", async () => {
    const log: string[] = []
    const host = await mount(defineField(log))
    const parent = host.parentElement!
    host.remove()
    host.dispose()
    parent.append(host)
    await ElementFixture.settle(parent)
    inside(host, "button").click()
    expect(log).toEqual(["click"])
  })
})

////////////////
// ## Only the kinds a root uses
////////////////

/** Every delegated listener added from now to the test's end, by the target it went on:  its kinds. */
function recordListeners(): Map<EventTarget, Set<string>> {
  const added = new Map<EventTarget, Set<string>>()
  const add = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: unknown[]) {
    if (DelegatedEvents.has(type)) {
      let kinds = added.get(this)
      if (!kinds) added.set(this, (kinds = new Set()))
      kinds.add(type)
    }
    return (add as (...args: unknown[]) => void).call(this, type, ...rest)
  } as typeof add
  onTestFinished(() => {
    EventTarget.prototype.addEventListener = add
  })
  return added
}

describe("ShadowEvents only the kinds a root uses", () => {
  test("each shadow root listens only for the kinds a node inside handles;  one with no handler, for none", async () => {
    // `input` and `click` are in use on the page already:  Solid would add both to every new root
    await mount(defineField())
    const added = recordListeners()
    const log: string[] = []
    const plain = await mount(defineElement("plain", () => <span>text</span>))
    const clicker = await mount(defineElement("clicker", () => <button onClick={() => log.push("click")}>go</button>))
    expect(added.get(plain.shadowRoot!)).toBeUndefined()
    expect([...(added.get(clicker.shadowRoot!) ?? [])]).toEqual(["click"])
    inside(clicker, "button").click()
    expect(log).toEqual(["click"])
  })

  test("a handler drawn after the first render still fires, for a kind the root didn't use yet", async () => {
    const log: string[] = []
    const [isShown, setShown] = createSignal(false)
    const host = await mount(
      defineElement("late", () => (
        <section onClick={() => log.push("section")}>
          <Show when={isShown()}>
            <button onDblClick={() => log.push("dblclick")} onClick={() => log.push("button")}>
              go
            </button>
          </Show>
        </section>
      ))
    )
    setShown(true)
    flush()
    const button = inside(host, "button")
    button.click()
    button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
    expect(log).toEqual(["button", "section", "dblclick"])
  })

  test("a root that gains its FIRST handler late hears it, a non-composed event a microtask after the draw included", async () => {
    const log: string[] = []
    const [isShown, setShown] = createSignal(false)
    const host = await mount(
      defineElement("first-late", () => (
        <Show when={isShown()} fallback={<span>none</span>}>
          <input onInput={() => log.push("input")} />
        </Show>
      ))
    )
    setShown(true)
    flush()
    // not composed:  never reaches the document, so only the root's own listener can hear it
    await Promise.resolve()
    inside(host, "input").dispatchEvent(new Event("input", { bubbles: true }))
    expect(log).toEqual(["input"])
  })

  test("a click right after a draw lands, while another node still waits for a root it never joins", async () => {
    // drawn into a container that's on no page:  its button waits for a root for good
    const nowhere = document.createElement("div")
    const disposeNowhere = render(() => <button onClick={() => {}}>never</button>, nowhere)
    onTestFinished(disposeNowhere)
    const log: string[] = []
    const [isShown, setShown] = createSignal(false)
    const host = await mount(
      defineElement("click-at-once", () => (
        <Show when={isShown()}>
          <button onClick={() => log.push("click")}>go</button>
        </Show>
      ))
    )
    setShown(true)
    flush()
    // no microtask in between:  the document's capturing listener finds the button's root first
    inside(host, "button").click()
    expect(log).toEqual(["click"])
  })

  test("a kind first delegated after the root was registered is held, then heard once a node uses it", async () => {
    const log: string[] = []
    const [isShown, setShown] = createSignal(false)
    // spread props delegate their kinds only as they're set:  `touchmove` reaches Solid long after the root
    const handlers = { onTouchMove: () => log.push("touchmove") }
    // recorded from before the root is made:  the bridge keeps the `addEventListener()` it found then
    const added = recordListeners()
    const host = await mount(
      defineElement("late-kind", () => (
        <Show when={isShown()} fallback={<span>none</span>}>
          <button {...handlers}>go</button>
        </Show>
      ))
    )
    added.clear()
    setShown(true)
    flush()
    await Promise.resolve()
    inside(host, "button").dispatchEvent(new Event("touchmove", { bubbles: true, composed: true }))
    expect(log).toEqual(["touchmove"])
    expect([...(added.get(host.shadowRoot!) ?? [])]).toEqual(["touchmove"])
  })

  test("Solid still gives a node its handler as `_$$<kind>`, and adds a container's listener after one shared capture reset", async () => {
    const host = await mount(defineElement("internals", () => <button onClick={() => {}}>go</button>))
    expect(Object.hasOwn(inside(host, "button"), "_$$click")).toBe(true)
    // what `ShadowEvents` tells Solid's listener apart by:  for each kind, a capture listener, then the listener
    const added: { target: EventTarget; type: string; listener: unknown; capture: boolean }[] = []
    const add = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: unknown,
      options?: unknown
    ) {
      if (DelegatedEvents.has(type)) added.push({ target: this, type, listener, capture: options === true })
      return (add as (...args: unknown[]) => void).call(this, type, listener, options)
    } as typeof add
    const [one, other] = [document.createElement("div"), document.createElement("div")]
    try {
      for (const element of [one, other]) {
        expect(registerDelegatedContainer(element)).toBeUndefined()
        onTestFinished(() => unregisterDelegatedContainer(element))
      }
    } finally {
      EventTarget.prototype.addEventListener = add
    }
    const clicks = (target: EventTarget) => added.filter((each) => each.target === target && each.type === "click")
    expect(clicks(one).map((each) => each.capture)).toEqual([true, false])
    expect(clicks(other).map((each) => each.capture)).toEqual([true, false])
    // the reset is one function on every container;  the listener is the container's own
    expect(clicks(one)[0].listener).toBe(clicks(other)[0].listener)
    expect(clicks(one)[1].listener).not.toBe(clicks(other)[1].listener)
  })
})
