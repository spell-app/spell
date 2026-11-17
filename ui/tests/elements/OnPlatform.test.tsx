import { afterAll, describe, expect, it } from "vite-plus/test"
import { cdp, page } from "vite-plus/test/browser"

import { PLATFORMS, PLATFORM_QUERIES } from "spell/util/platform"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import resetCSS from "spell/ui/styles/reset.css?raw"
import "spell/ui/components/ui-label"

/**
 * The shared `only-on-platform` (epic `mockup` T53):  an element shows only on the devices it names.
 * - The device is emulated:  touch on or off (the main pointer with it), and the viewport's size.
 */
describe("only-on-platform", () => {
  /** Turn touch on or off, the main pointer with it, as DevTools' device mode does. */
  async function emulate(device: { touch: boolean; width: number; height: number }) {
    const { touch, width, height } = device
    await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: 5 })
    await page.viewport(width, height)
  }

  const PHONE = { touch: true, width: 390, height: 844 }
  const PHONE_SIDEWAYS = { touch: true, width: 844, height: 390 }
  const TABLET = { touch: true, width: 820, height: 1180 }
  const DESKTOP = { touch: false, width: 1024, height: 768 }

  afterAll(async () => {
    await emulate({ touch: false, width: 414, height: 896 })
  })

  /** Is `element` drawn? */
  const isShown = (element: Element) => getComputedStyle(element).display !== "none"

  it("hides an element on a device its list leaves out, and shows it on the others, live", async () => {
    const label = await ElementFixture.render<DOMElement>(`<ui-label only-on-platform="desktop,tablet">Hi</ui-label>`)
    await emulate(DESKTOP)
    expect(isShown(label)).toBe(true)
    await emulate(TABLET)
    expect(isShown(label)).toBe(true)
    await emulate(PHONE)
    expect(isShown(label)).toBe(false)
    await emulate(PHONE_SIDEWAYS)
    expect(isShown(label)).toBe(false)
    await emulate(DESKTOP)
    expect(isShown(label)).toBe(true)
  })

  it("follows a change to the list, and shows everywhere without one", async () => {
    await emulate(PHONE)
    const label = await ElementFixture.render<DOMElement>(`<ui-label only-on-platform="phone">Hi</ui-label>`)
    expect(isShown(label)).toBe(true)
    label.setAttribute("only-on-platform", "desktop")
    await expect.poll(() => isShown(label)).toBe(false)
    label.removeAttribute("only-on-platform")
    await expect.poll(() => isShown(label)).toBe(true)
    expect(label.matches(":state(only-on-platform)")).toBe(false)
  })

  it("is hidden by reset.css, in PLATFORM_QUERIES' own media queries", () => {
    for (const platform of PLATFORMS) {
      expect(resetCSS).toContain(`@media ${PLATFORM_QUERIES[platform]} {`)
      expect(resetCSS).toContain(`:host(:state(only-on-platform):not(:state(on-${platform})))`)
    }
  })
})
