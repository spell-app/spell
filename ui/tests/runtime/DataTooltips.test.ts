import { afterEach, beforeAll, describe, expect, it } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { Fixture } from "spell/test-helpers/Fixture"
import { UI } from "spell/ui/core"

/** The shared bubble. */
function bubble() {
  return document.querySelector<HTMLElement>(".ui-tooltip-bubble")!
}

/** Is the bubble showing, in the top layer? */
function isShowing() {
  return Boolean(bubble()?.matches(":popover-open"))
}

/** A frame that would cut off anything positioned inside it, holding one target. */
function framed(attributes: string) {
  const frame = Fixture.render(
    `<div style="position: fixed; left: 200px; top: 300px; width: 60px; height: 40px; overflow: hidden">
      <button aria-label="target" style="width: 50px; height: 24px" data-tooltip="Add users now" ${attributes}>x</button>
    </div>`
  )
  return frame.querySelector("button")!
}

describe("DataTooltips", () => {
  beforeAll(async () => {
    await UI.load()
    document.documentElement.style.setProperty("--ui-tooltip-delay", "0ms")
  })

  afterEach(async () => {
    await userEvent.unhover(document.body)
    await userEvent.keyboard("{Escape}")
  })

  it("stands the CSS tooltip down, and leaves a visible one", () => {
    expect(document.documentElement.hasAttribute("data-ui-top-layer-tooltips")).toBe(true)
    const button = framed("")
    expect(getComputedStyle(button, "::after").display).toBe("none")
    const visible = framed('data-variation="visible"')
    expect(getComputedStyle(visible, "::after").display).not.toBe("none")
  })

  it("shows on hover, in the top layer, outside a frame that would clip it", async () => {
    const button = framed("")
    await userEvent.hover(button)
    await expect.poll(isShowing).toBe(true)
    expect(bubble().textContent).toBe("Add users now")
    const box = bubble().getBoundingClientRect()
    expect(box.width).toBeGreaterThan(60)
    expect(box.bottom).toBeLessThanOrEqual(button.getBoundingClientRect().top)
    await userEvent.unhover(button)
    await expect.poll(isShowing).toBe(false)
  })

  it.each([
    ["top left", "top"],
    ["top center", "top"],
    ["top right", "top"],
    ["bottom left", "bottom"],
    ["bottom center", "bottom"],
    ["bottom right", "bottom"],
    ["left center", "left"],
    ["left top", "left"],
    ["left bottom", "left"],
    ["right center", "right"],
    ["right top", "right"],
    ["right bottom", "right"]
  ])("data-position=%j shows on its side", async (position, side) => {
    const button = framed(`data-position="${position}"`)
    await userEvent.hover(button)
    await expect.poll(isShowing).toBe(true)
    await expect.poll(() => bubble().getAttribute("data-side")).toBe(side)
    expect(bubble().getAttribute("data-position")).toBe(position)
  })

  it("a target cut short by the box around it:  shows at the part that shows, not its whole text", async () => {
    const box = Fixture.render(
      `<div style="position: fixed; left: 100px; top: 300px; width: 80px; overflow: hidden; white-space: pre"><span data-tooltip="A playing card, face up or face down">A playing card, face up or face down</span></div>`
    )
    const target = box.querySelector("span")!
    const seen = box.getBoundingClientRect()
    expect(target.getBoundingClientRect().right).toBeGreaterThan(seen.right + 50)
    await userEvent.hover(box)
    await expect.poll(isShowing).toBe(true)
    const placed = document.querySelector<HTMLElement>(".ui-tooltip-target")!.getBoundingClientRect()
    expect(placed.left).toBeCloseTo(seen.left, 0)
    expect(placed.right).toBeCloseTo(seen.right, 0)
  })

  it("flips to stay in the window, and says so for its arrow", async () => {
    const frame = Fixture.render(
      `<button aria-label="target" style="position: fixed; left: 300px; top: 0; height: 24px" data-tooltip="Near the top">x</button>`
    )
    await userEvent.hover(frame)
    await expect.poll(isShowing).toBe(true)
    await expect.poll(() => bubble().getAttribute("data-side")).toBe("bottom")
    expect(bubble().getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
  })

  it("bottom center by the window's right edge:  slides in, wholly inside, its arrow at the target", async () => {
    const button = Fixture.render(
      `<button aria-label="target" style="position: fixed; right: 4px; top: 0; width: 24px; height: 24px"
        data-tooltip="Theme and light / dark:  Fruity, Light" data-position="bottom center">x</button>`
    )
    await userEvent.hover(button)
    await expect.poll(isShowing).toBe(true)
    // its layout box:  it may still be growing in from 80%
    const { offsetLeft: left, offsetTop: top, offsetWidth: width } = bubble()
    const target = button.getBoundingClientRect()
    expect(left + width).toBeLessThanOrEqual(document.documentElement.clientWidth)
    expect(top).toBeGreaterThanOrEqual(target.bottom)
    const arrowAt = left + Number.parseFloat(bubble().style.getPropertyValue("--ui-tooltip-arrow-at"))
    expect(arrowAt).toBeGreaterThan(target.left)
    expect(arrowAt).toBeLessThan(target.right)
  })

  it("breaks its text where the text does", async () => {
    const button = framed("")
    button.setAttribute("data-tooltip", "One idea\nAnother")
    await userEvent.hover(button)
    await expect.poll(isShowing).toBe(true)
    const lineHeight = Number.parseFloat(getComputedStyle(bubble()).lineHeight)
    expect(bubble().getBoundingClientRect().height).toBeGreaterThan(lineHeight * 2)
  })

  it("shows at the boxes a target draws when it has none of its own (display: contents)", async () => {
    const host = Fixture.render(`<span data-tooltip="Contents" style="display: contents"></span>`)
    const inner = host.attachShadow({ mode: "open" })
    inner.innerHTML = `<button aria-label="target" style="position: fixed; left: 300px; top: 200px; width: 40px">x</button>`
    const button = inner.querySelector("button")!
    await userEvent.hover(button)
    await expect.poll(isShowing).toBe(true)
    const target = button.getBoundingClientRect()
    const box = bubble().getBoundingClientRect()
    expect(box.bottom).toBeLessThanOrEqual(target.top)
    expect(Math.abs(box.left + box.width / 2 - (target.left + target.width / 2))).toBeLessThan(2)
  })

  it("waits out the hover delay, and a focus doesn't", async () => {
    const button = framed("")
    button.style.setProperty("--ui-tooltip-delay", "400ms")
    await userEvent.hover(button)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(isShowing()).toBe(false)
    await userEvent.unhover(button)
    button.focus()
    await userEvent.tab({ shift: true })
    await userEvent.tab()
    expect(button.matches(":focus-visible")).toBe(true)
    expect(isShowing()).toBe(true)
    await userEvent.keyboard("{Escape}")
    expect(isShowing()).toBe(false)
  })

  it("a mouse click doesn't pin it open", async () => {
    const button = framed("")
    await userEvent.click(button)
    await userEvent.unhover(button)
    await expect.poll(isShowing).toBe(false)
  })

  it("finds a target in a shadow root, and shows a changed text as it changes", async () => {
    const host = Fixture.render(`<div></div>`)
    const inner = host.attachShadow({ mode: "open" })
    inner.innerHTML = `<button aria-label="target" data-tooltip="Inside">x</button>`
    const button = inner.querySelector("button")!
    await userEvent.hover(button)
    await expect.poll(isShowing).toBe(true)
    expect(bubble().textContent).toBe("Inside")
    button.setAttribute("data-tooltip", "Changed")
    await expect.poll(() => bubble().textContent).toBe("Changed")
  })

  it("shows on a pointer move onto a target with no `pointerover` before it (Chromium sends none at times)", async () => {
    const host = Fixture.render(`<div><button aria-label="target" data-tooltip="Moved onto">x</button></div>`)
    const button = host.querySelector("button")!
    button.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }))
    await expect.poll(isShowing).toBe(true)
    expect(bubble().textContent).toBe("Moved onto")
    button.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }))
    expect(bubble().textContent).toBe("Moved onto")
  })

  it("takes the colours the target resolves, so a theme around it still shows", async () => {
    const wrapper = Fixture.render(
      `<div><button aria-label="target" data-tooltip="Red" data-variation="red">x</button></div>`
    )
    await userEvent.hover(wrapper.querySelector("button")!)
    await expect.poll(isShowing).toBe(true)
    const red = getComputedStyle(Fixture.render(`<span style="color: var(--ui-red)"></span>`)).color
    expect(getComputedStyle(bubble()).backgroundColor).toBe(red)
  })
})
