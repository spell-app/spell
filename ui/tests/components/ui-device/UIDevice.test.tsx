import { describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UI } from "spell/ui/runtime"
import { UIDevice } from "spell/ui/components/ui-device"

import "spell/ui/components/ui-modal"

/** A device element, as its tag's DOM element. */
type DeviceElement = HTMLElement & {
  device: string
  orientation: string
  controls: string
  visible: boolean
  component?: UIDevice
}

/** A device drawn with `attributes`, `width` wide, holding a paragraph and a Done button in its edge. */
async function deviceWith(attributes = "", width = 1600) {
  const device = await ElementFixture.render<DeviceElement>(
    `<ui-device ${attributes} style="width: ${width}px"><p>The app</p><ui-button slot="buttons">Done</ui-button></ui-device>`
  )
  await ShadowTree.settle(device)
  return device
}

/** A part of the device's shadow root, found anywhere in it (a modal's too). */
function part(device: Element, name: string): HTMLElement | null {
  return device.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)
}

/** The screen's size on the page, and the size it holds its content at. */
function screenOf(device: DeviceElement) {
  const screen = part(device, "screen")!
  const display = screen.querySelector<HTMLElement>(".display")!
  return { shown: screen.getBoundingClientRect(), real: { width: display.offsetWidth, height: display.offsetHeight } }
}

/** Let a resize, a reflow and a redraw happen. */
async function frames(device: Element) {
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
  await ShadowTree.settle(device)
}

describe("<ui-device>", () => {
  test("defines its tag", () => {
    expect(UIDevice.describe().tag).toBe("ui-device")
  })

  test("a phone by default, upright:  what it holds laid out at 390 by 844", async () => {
    const device = await deviceWith()
    const { real } = screenOf(device)
    expect(real).toEqual({ width: 390, height: 844 })
    expect(device.matches(":state(phone)")).toBe(true)
    expect(device.matches(":state(landscape)")).toBe(false)
    expect(device.querySelector("p")!.assignedSlot).not.toBeNull()
    await expectAccessible(device)
  })

  test.each([
    ["phone", "portrait", 390, 844],
    ["phone", "landscape", 844, 390],
    ["tablet", "portrait", 820, 1180],
    ["tablet", "landscape", 1180, 820],
    ["desktop", "portrait", 1280, 800],
    ["desktop", "landscape", 1280, 800]
  ])("a %s held %s:  its screen is %i by %i", async (kind, orientation, width, height) => {
    const device = await deviceWith(`device="${kind}" orientation="${orientation}"`)
    expect(screenOf(device).real).toEqual({ width, height })
    expect(device.matches(`:state(${kind})`)).toBe(true)
    expect(device.matches(":state(landscape)")).toBe(kind === "desktop" || orientation === "landscape")
  })

  test("scaled down to fit its width, keeping the screen's shape;  never scaled up", async () => {
    const device = await deviceWith(`device="desktop"`, 700)
    const { shown } = screenOf(device)
    expect(shown.width).toBeLessThan(700)
    expect(shown.width / shown.height).toBeCloseTo(1280 / 800, 1)
    expect(device.component!.scale).toBeLessThan(1)
    const wide = await deviceWith(`device="phone"`, 1600)
    expect(wide.component!.scale).toBeLessThanOrEqual(1)
  })

  test("its bottom edge holds its own buttons, then the page's", async () => {
    const device = await deviceWith()
    const edge = part(device, "buttons")!
    expect(edge.querySelector('[part~="switch"]')).not.toBeNull()
    expect(edge.querySelector('[part~="rotate"]')).not.toBeNull()
    const done = device.querySelector('[slot="buttons"]')!
    expect(done.assignedSlot?.parentElement).toBe(edge)
    // the edge is under the screen
    expect(edge.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      part(device, "screen")!.getBoundingClientRect().bottom
    )
  })

  test.each([
    ["all", true, true],
    ["rotate", false, true],
    ["device", true, false],
    ["none", false, false]
  ])("controls=%s:  the switch %s, Rotate %s", async (controls, hasSwitch, hasRotate) => {
    const device = await deviceWith(`controls="${controls}"`)
    expect(!!part(device, "switch")).toBe(hasSwitch)
    expect(!!part(device, "rotate")).toBe(hasRotate)
  })

  test("a desktop shows no Rotate:  it's always wide", async () => {
    const device = await deviceWith(`device="desktop"`)
    expect(part(device, "rotate")).toBeNull()
    expect(part(device, "switch")).not.toBeNull()
  })

  test("Rotate turns it on its side and back, with `ui-changed`", async () => {
    const device = await deviceWith()
    const changed = vi.fn()
    device.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail))
    part(device, "rotate")!.click()
    await frames(device)
    expect(device.getAttribute("orientation")).toBe("landscape")
    expect(screenOf(device).real).toEqual({ width: 844, height: 390 })
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ device: "phone", orientation: "landscape" }))
    part(device, "rotate")!.click()
    await frames(device)
    expect(device.getAttribute("orientation")).toBe("portrait")
    expect(changed).toHaveBeenCalledTimes(2)
  })

  test("the switch picks another device, with `ui-changed`;  its own one is selected", async () => {
    const device = await deviceWith()
    const changed = vi.fn()
    device.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail))
    const buttons = [...part(device, "switch")!.querySelectorAll("ui-button")]
    expect(buttons.map((button) => button.hasAttribute("selected"))).toEqual([true, false, false])
    ;(buttons[1] as HTMLElement).click()
    await frames(device)
    expect(device.getAttribute("device")).toBe("tablet")
    expect(screenOf(device).real).toEqual({ width: 820, height: 1180 })
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ device: "tablet", orientation: "portrait" }))
    expect(buttons.map((button) => button.hasAttribute("selected"))).toEqual([false, true, false])
  })

  test("a page's own change (an attribute) sends no `ui-changed`", async () => {
    const device = await deviceWith()
    const changed = vi.fn()
    device.addEventListener("ui-changed", changed)
    device.setAttribute("device", "desktop")
    await frames(device)
    expect(screenOf(device).real).toEqual({ width: 1280, height: 800 })
    expect(changed).not.toHaveBeenCalled()
  })
})

describe("<ui-device modal>", () => {
  test("starts hidden, as a modal does;  `visible` shows it in a basic `<ui-modal>`, no box round it", async () => {
    const device = await deviceWith(`modal aria-label="A phone"`)
    expect(device.hidden).toBe(true)
    const modal = part(device, "modal")!
    expect(modal.localName).toBe("ui-modal")
    expect(modal.getAttribute("appearance")).toBe("basic")
    const opened = vi.fn()
    device.addEventListener("ui-opened", opened)
    device.visible = true
    await frames(device)
    const dialog = modal.shadowRoot!.querySelector("dialog")!
    expect(dialog.open).toBe(true)
    expect(getComputedStyle(dialog).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    expect(dialog.getAttribute("aria-label")).toBe("A phone")
    // the device, its screen and its edge, inside the dialog
    expect(part(device, "screen")!.getBoundingClientRect().width).toBeGreaterThan(0)
    await vi.waitFor(() => expect(opened).toHaveBeenCalled())
  })

  test("as a modal, it fits the window", async () => {
    const device = await deviceWith(`modal visible device="tablet"`)
    await frames(device)
    const { shown } = screenOf(device)
    expect(shown.height).toBeLessThan(window.innerHeight)
    expect(shown.width / shown.height).toBeCloseTo(820 / 1180, 1)
  })

  test("written `visible` false:  hidden;  a Cancel button in its edge hides it", async () => {
    const device = await ElementFixture.render<DeviceElement>(
      `<ui-device modal visible><p>App</p><ui-button slot="buttons" class="cancel">Cancel</ui-button></ui-device>`
    )
    await frames(device)
    expect(device.hidden).toBe(false)
    const closed = vi.fn()
    device.addEventListener("ui-closed", closed)
    device.querySelector<HTMLElement>(".cancel")!.click()
    await frames(device)
    expect(device.visible).toBe(false)
    await vi.waitFor(() => expect(closed).toHaveBeenCalled())
    expect(part(device, "modal")!.shadowRoot!.querySelector("dialog")!.open).toBe(false)
  })

  test("Escape closes the modal, and the device follows", async () => {
    const device = await deviceWith(`modal visible`)
    await frames(device)
    // Escape through a keyboard binding rather than `CloseWatcher`, as the modal's own tests press it
    ;(await UI.load()).overlays.useCloseWatcher = false
    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(device.visible).toBe(false))
  })

  test("not a modal:  drawn on the page, no `<ui-modal>`", async () => {
    const device = await deviceWith()
    expect(part(device, "modal")).toBeNull()
    expect(device.hidden).toBe(false)
  })
})

describe('<ui-modal appearance="basic"> round a <ui-device>', () => {
  test("no white box:  the dialog is see-through", async () => {
    const modal = await ElementFixture.render(
      `<ui-modal appearance="basic" visible><ui-device><p>App</p></ui-device></ui-modal>`
    )
    await frames(modal)
    const dialog = modal.shadowRoot!.querySelector("dialog")!
    expect(dialog.open).toBe(true)
    const style = getComputedStyle(dialog)
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)")
    expect(style.boxShadow).toBe("none")
  })
})
