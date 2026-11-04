import { beforeEach, describe, expect, it, onTestFinished } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { nextFrame } from "spell/ui/util"
import type { StickyDetail } from "spell/ui/components/components.types"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-sticky"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-sticky/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/**
 * A 200px scroll frame:  100px of space, then a 600px parent holding the sticky (40px tall content), then 800px more.
 * - Returns the frame, the DOM element and its box.
 */
async function frame(attributes = `offset="10"`) {
  const scroller = await ElementFixture.render(
    `<div style="height: 200px; overflow: auto">` +
      `<div style="height: 100px"></div>` +
      `<div id="parent" style="height: 600px"><ui-sticky ${attributes}><p style="height: 40px; margin: 0">S</p></ui-sticky></div>` +
      `<div style="height: 800px"></div>` +
      `</div>`
  )
  const host = scroller.querySelector<DOMElement>("ui-sticky")!
  await ElementFixture.settle(host)
  const box = host.shadowRoot!.querySelector<HTMLElement>("[part~=sticky]")!
  return { scroller, host, box }
}

/** Collect `detail`s of `name` events. */
function record(target: EventTarget, name: string) {
  const details: StickyDetail[] = []
  target.addEventListener(name, (event) => details.push((event as CustomEvent<StickyDetail>).detail))
  return details
}

/**
 * Wait until an `IntersectionObserver` report that's coming has come, before checking something did NOT happen.
 * - Why frames, not a timer:  the browser computes intersections while rendering a frame, and reports in a task
 *   right after it;  the second frame starts once that task has run.
 */
async function observerSettled() {
  for (let frame = 0; frame < OBSERVER_FRAMES; frame++) await nextFrame()
}

/** Frames `observerSettled()` waits:  the one that measures, then one after its report. */
const OBSERVER_FRAMES = 2

beforeEach(async () => {
  await UI.load()
})

////////////////
// ## Rendering
////////////////

describe("<ui-sticky> classes and markup", () => {
  it.each([
    ["", "ui sticky"],
    ["pushing", "ui pushing sticky"]
  ])("<ui-sticky %s>", async (attributes, classes) => {
    const host = await ElementFixture.render<DOMElement>(`<ui-sticky ${attributes}>S</ui-sticky>`)
    const box = host.shadowRoot!.querySelector("[part~=sticky]")!
    expect(box.className).toBe(classes)
  })

  it("renders a sentinel, the box around the slot, a bottom sentinel;  the DOM element has no box", async () => {
    const { host, box } = await frame()
    const children = [...host.shadowRoot!.children].filter((child) => child.localName !== "style")
    expect(children.map((child) => child.className)).toEqual(["sentinel", "ui sticky", "bottom sentinel"])
    expect(children[0]!.getAttribute("aria-hidden")).toBe("true")
    expect(box.querySelector("slot")).not.toBeNull()
    expect(getComputedStyle(host).display).toBe("contents")
    expect(getComputedStyle(box).position).toBe("sticky")
    expect(getComputedStyle(box).top).toBe("10px")
    expect(getComputedStyle(box).zIndex).toBe("800")
  })

  it("takes no extra space for the sentinels", async () => {
    const { host } = await frame()
    const parent = host.parentElement!
    expect(parent.scrollHeight).toBe(600)
    const [top, , bottom] = host.shadowRoot!.querySelectorAll<HTMLElement>("div")
    expect(top!.getBoundingClientRect().top).toBeCloseTo(parent.getBoundingClientRect().top, 0)
    expect(bottom!.getBoundingClientRect().top).toBeCloseTo(parent.getBoundingClientRect().top + 40 - 1, 0)
  })
})

////////////////
// ## Sticking
////////////////

describe("<ui-sticky> stuck state", () => {
  it("reports sticking to the top:  :state(stuck), ui-stuck;  and leaving:  ui-unstuck", async () => {
    const { scroller, host, box } = await frame()
    const sticks = record(host, "ui-stuck")
    const unsticks = record(host, "ui-unstuck")
    await nextFrame()
    expect(host.matches(":state(stuck)")).toBe(false)
    scroller.scrollTop = 150
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    expect(sticks).toEqual([{ edge: "top" }])
    expect(box.getBoundingClientRect().top).toBeCloseTo(scroller.getBoundingClientRect().top + 10, 0)
    scroller.scrollTop = 0
    await expect.poll(() => host.matches(":state(stuck)")).toBe(false)
    expect(unsticks).toEqual([{ edge: "top" }])
  })

  it("is bound, not stuck, once the end of its parent pushes it out", async () => {
    const { scroller, host } = await frame()
    scroller.scrollTop = 150
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    const unsticks = record(host, "ui-unstuck")
    scroller.scrollTop = 700
    await expect.poll(() => host.matches(":state(bound)")).toBe(true)
    expect(host.matches(":state(stuck)")).toBe(false)
    expect(unsticks).toEqual([{ edge: "top" }])
  })

  it("follows a changed offset", async () => {
    const { scroller, host, box } = await frame()
    scroller.scrollTop = 150
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    host.setAttribute("offset", "30")
    await expect.poll(() => box.getBoundingClientRect().top - scroller.getBoundingClientRect().top).toBeCloseTo(30, 0)
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
  })

  it("with pushing, sticks to the bottom edge while its place is below the fold", async () => {
    const scroller = await ElementFixture.render(
      `<div style="height: 200px; overflow: auto"><div style="height: 1400px">` +
        `<div style="height: 400px"></div>` +
        `<ui-sticky pushing bottom-offset="5"><p style="height: 40px; margin: 0">S</p></ui-sticky>` +
        `</div></div>`
    )
    const host = scroller.querySelector<DOMElement>("ui-sticky")!
    await ElementFixture.settle(host)
    const box = host.shadowRoot!.querySelector<HTMLElement>("[part~=sticky]")!
    const sticks = record(host, "ui-stuck")
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    expect(box.getBoundingClientRect().bottom).toBeCloseTo(scroller.getBoundingClientRect().bottom - 5, 0)
    expect(sticks.at(-1)).toEqual({ edge: "bottom" })
    const unsticks = record(host, "ui-unstuck")
    scroller.scrollTop = 300
    await expect.poll(() => host.matches(":state(stuck)")).toBe(false)
    expect(unsticks).toEqual([{ edge: "bottom" }])
  })

  it("never sticks to the bottom without pushing", async () => {
    const scroller = await ElementFixture.render(
      `<div style="height: 200px; overflow: auto"><div style="height: 1400px">` +
        `<div style="height: 400px"></div><ui-sticky><p style="height: 40px; margin: 0">S</p></ui-sticky>` +
        `</div></div>`
    )
    const host = scroller.querySelector<DOMElement>("ui-sticky")!
    await ElementFixture.settle(host)
    await observerSettled()
    expect(host.matches(":state(stuck)")).toBe(false)
  })
})

describe("<ui-sticky> reserves its room on the scroll container", () => {
  it("sets scroll-padding-top to its bottom edge while stuck, and removes it once unstuck", async () => {
    const { scroller, host } = await frame()
    expect(scroller.style.scrollPaddingTop).toBe("")
    scroller.scrollTop = 150
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    // offset 10 + 40px of content
    await expect.poll(() => scroller.style.scrollPaddingTop).toBe("50px")
    scroller.scrollTop = 0
    await expect.poll(() => scroller.style.scrollPaddingTop).toBe("")
  })

  it("takes the lowest edge of several stuck stickies", async () => {
    const scroller = await ElementFixture.render(
      `<div style="height: 200px; overflow: auto"><div style="height: 100px"></div><div style="height: 900px">` +
        `<ui-sticky id="a"><p style="height: 30px; margin: 0">A</p></ui-sticky>` +
        `<div style="height: 50px"></div>` +
        `<ui-sticky id="b" offset="30"><p style="height: 20px; margin: 0">B</p></ui-sticky>` +
        `</div><div style="height: 800px"></div></div>`
    )
    const hosts = Array.from(scroller.querySelectorAll<DOMElement>("ui-sticky"))
    for (const host of hosts) await ElementFixture.settle(host)
    scroller.scrollTop = 300
    await expect.poll(() => hosts.every((host) => host.matches(":state(stuck)"))).toBe(true)
    await expect.poll(() => scroller.style.scrollPaddingTop).toBe("50px")
  })

  it("reserves nothing for a box taller than half the visible area (a sticky column)", async () => {
    const { scroller, host } = await frame()
    host.querySelector("p")!.style.height = "120px"
    scroller.scrollTop = 150
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    await observerSettled()
    expect(scroller.style.scrollPaddingTop).toBe("")
  })

  it("reserves nothing for a box narrower than half the visible width (a sidebar)", async () => {
    const { scroller, host } = await frame()
    // the box fills its parent:  a narrow parent is a narrow column
    host.parentElement!.style.width = "40%"
    scroller.scrollTop = 150
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    await observerSettled()
    expect(scroller.style.scrollPaddingTop).toBe("")
  })

  // epic `epic-engine` I189:  the room it reserves covers its own box, so a press on a button in it, focusing it, had
  // the browser scroll the button "into view" between the press and the release, and the click was lost.  A real
  // press is the epic page's check (`epic/src/demo/check-accept-click.mjs`):  Vitest's click scrolls the button into
  // view itself first, by the same padding.
  it("a press on a button in it, stuck, focuses the button itself, without scrolling", async () => {
    const { scroller, host } = await frame()
    host.querySelector("p")!.innerHTML = `<button type="button">B</button>`
    const button = host.querySelector("button")!
    scroller.scrollTop = 150
    await expect.poll(() => scroller.style.scrollPaddingTop).toBe("50px")
    const press = new MouseEvent("mousedown", { bubbles: true, composed: true, cancelable: true, button: 0 })
    button.dispatchEvent(press)
    // the browser's own focus, which scrolls, never runs
    expect(press.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(button)
    expect(scroller.scrollTop).toBe(150)
  })

  it("does so for a <ui-button>, pressed on itself:  its inner button takes the focus", async () => {
    const { scroller, host } = await frame()
    host.querySelector("p")!.innerHTML = `<ui-button>B</ui-button>`
    const button = host.querySelector<DOMElement>("ui-button")!
    await ElementFixture.settle(button)
    scroller.scrollTop = 150
    await expect.poll(() => scroller.style.scrollPaddingTop).toBe("50px")
    // a real press lands on the host:  its inner `<button>` isn't in the event's path
    const press = new MouseEvent("mousedown", { bubbles: true, composed: true, cancelable: true, button: 0 })
    button.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
    expect(button.shadowRoot!.activeElement).toBe(button.shadowRoot!.querySelector("button"))
    expect(scroller.scrollTop).toBe(150)
  })

  it("leaves a press alone while it isn't stuck, and in a text field:  the caret goes where it's pressed", async () => {
    const { scroller, host } = await frame()
    host.querySelector("p")!.innerHTML = `<button type="button">B</button><input value="words" />`
    const press = (target: Element) => {
      const event = new MouseEvent("mousedown", { bubbles: true, composed: true, cancelable: true, button: 0 })
      target.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(press(host.querySelector("button")!)).toBe(false)
    scroller.scrollTop = 150
    await expect.poll(() => scroller.style.scrollPaddingTop).toBe("50px")
    expect(press(host.querySelector("input")!)).toBe(false)
  })

  it("sets scroll-padding-bottom while pushing at the bottom edge", async () => {
    const scroller = await ElementFixture.render(
      `<div style="height: 200px; overflow: auto"><div style="height: 1400px">` +
        `<div style="height: 400px"></div>` +
        `<ui-sticky pushing bottom-offset="5"><p style="height: 40px; margin: 0">S</p></ui-sticky>` +
        `</div></div>`
    )
    const host = scroller.querySelector<DOMElement>("ui-sticky")!
    await ElementFixture.settle(host)
    await expect.poll(() => host.matches(":state(stuck)")).toBe(true)
    await expect.poll(() => scroller.style.scrollPaddingBottom).toBe("45px")
  })
})

////////////////
// ## Tokens
////////////////

describe("<ui-sticky> tokens from outside", () => {
  /** The inner box's z index. */
  function measure(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("[part~=sticky]")!).zIndex
  }

  /** The element under test. */
  const MARKUP = `<ui-sticky>S</ui-sticky>`

  it("takes a token set on the DOM element", async () => {
    const host = await ElementFixture.render(MARKUP.replace("<ui-sticky", `<ui-sticky style="--ui-sticky-z-index: 7"`))
    expect(measure(host)).toBe("7")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-sticky-z-index: 7"><div>${MARKUP}</div></section>`
    )
    expect(measure(wrapper.querySelector("ui-sticky")!)).toBe("7")
  })

  it("takes a token set through `::part(sticky)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(sticky) { --ui-sticky-z-index: 7 }</style>${MARKUP.replace("<ui-sticky", '<ui-sticky class="themed"')}</div>`
    )
    expect(measure(wrapper.querySelector("ui-sticky")!)).toBe("7")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-sticky-z-index", "7")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-sticky-z-index")
    })
    const host = await ElementFixture.render(MARKUP)
    expect(measure(host)).toBe("7")
  })

  it("keeps its defaults when nothing is set", async () => {
    const host = await ElementFixture.render(MARKUP)
    const probe = await ElementFixture.render(`<div style="position: relative; z-index: var(--ui-z-sticky)"></div>`)
    expect(measure(host)).toBe(getComputedStyle(probe).zIndex)
  })

  it("takes its offset from the attribute, whatever the page sets", async () => {
    const host = await ElementFixture.render(`<ui-sticky offset="12" style="--ui-sticky-offset: 40px">S</ui-sticky>`)
    expect(getComputedStyle(host.shadowRoot!.querySelector("[part~=sticky]")!).top).toBe("12px")
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-sticky> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})
