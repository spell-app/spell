import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { E } from "spell/ui/core"

import "spell/ui/components/ui-zoom"
import { ImageZoom } from "spell/ui/components/ui-zoom"
import { png, page, theZoom } from "./ZoomPage"

afterEach(() => document.querySelectorAll("main, body > ui-zoom").forEach((element) => element.remove()))

/** Two zoomable pictures on the page, the first one showing in the page's zoom. */
async function twoPictures(): Promise<{ zoom: E.DOMElement; first: string; second: string }> {
  const first = png(800, 400)
  const second = png(640, 320)
  await page(
    `<img src="${first}" alt="First" style="width: 200px"><img src="${second}" alt="Last" style="width: 200px">`
  )
  await Promise.all([...document.querySelectorAll("main img")].map((image) => (image as HTMLImageElement).decode()))
  ImageZoom.show(document.querySelector("main img")!)
  return { zoom: await theZoom(), first, second }
}

/** What's moving in `zoom`'s shadow root:  its animations on the figure, the picture or any copy. */
function moving(zoom: Element): Animation[] {
  return [...zoom.shadowRoot!.querySelectorAll("figure, figure img")].flatMap((element) => element.getAnimations())
}

// epic `repo-split` (Owen, 2026-10-28):  the animations spell.app's page had, as the component's own
describe("<ui-zoom>:  motion", () => {
  test("it grows out of the picture on opening, and shrinks back before it closes", async () => {
    const { zoom } = await twoPictures()
    await vi.waitFor(() => expect(moving(zoom).length).toBeGreaterThan(0))
    await vi.waitFor(() => expect(moving(zoom)).toHaveLength(0))
    // its close button (a key press can close the dialog natively, with no say for the zoom)
    zoom.shadowRoot!.querySelector("ui-modal")!.shadowRoot!.querySelector<HTMLElement>('[part~="close"]')!.click()
    // still up while it shrinks:  the picture's `src` goes once it has
    await vi.waitFor(() => {
      expect(moving(zoom).length).toBeGreaterThan(0)
      expect(zoom.hasAttribute("src")).toBe(true)
    })
    await vi.waitFor(() => expect(zoom.hasAttribute("src")).toBe(false))
  })

  test("paging slides the next picture in while a copy of the shown one slides out", async () => {
    const { zoom, second } = await twoPictures()
    await vi.waitFor(() => expect(moving(zoom)).toHaveLength(0))
    await userEvent.keyboard("{ArrowDown}")
    await vi.waitFor(() => expect(zoom.shadowRoot!.querySelectorAll("figure")).toHaveLength(2))
    await vi.waitFor(() => expect(moving(zoom).length).toBeGreaterThanOrEqual(2))
    expect(zoom.getAttribute("src")).toBe(second)
    await vi.waitFor(() => expect(zoom.shadowRoot!.querySelectorAll("figure")).toHaveLength(1))
  })

  test("the bounce at the end moves the figure", async () => {
    const { zoom } = await twoPictures()
    await vi.waitFor(() => expect(moving(zoom)).toHaveLength(0))
    await userEvent.keyboard("{ArrowUp}")
    await vi.waitFor(() => expect(moving(zoom).length).toBeGreaterThan(0))
    const figure = zoom.shadowRoot!.querySelector("figure")!
    await vi.waitFor(() => expect(getComputedStyle(figure).transform).not.toBe("none"))
  })
})
