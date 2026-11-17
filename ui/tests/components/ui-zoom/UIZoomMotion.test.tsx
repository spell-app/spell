import { afterEach, describe, expect, onTestFinished, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { E } from "spell/ui/core"

import "spell/ui/components/ui-zoom"
import { ImageZoom } from "spell/ui/components/ui-zoom"
import { png, page, theZoom } from "./ZoomPage"

afterEach(() => document.querySelectorAll("main, body > ui-zoom").forEach((element) => element.remove()))

/**
 * Every move of a zoom's figure or picture from now on, each HELD at its start until the test lets it go.
 * - So a test sees each move however slow the machine is:  a 320ms grow, polled for, could be over before the first
 *   look under load (epic `epic-engine` I326).
 * - Only the figure's and its picture's:  the modal's own moves run as usual.
 */
function holdZoomMoves(): Animation[] {
  const started: Animation[] = []
  const animate = Element.prototype.animate
  const spy = vi.spyOn(Element.prototype, "animate").mockImplementation(function (this: Element, ...args) {
    const animation = animate.apply(this, args)
    if (this.closest("figure")) {
      animation.pause()
      started.push(animation)
    }
    return animation
  })
  onTestFinished(() => spy.mockRestore())
  return started
}

/** Let every held move run to its end. */
function finishAll(moves: Animation[]) {
  for (const move of moves.splice(0)) move.finish()
}

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

/** `zoom` opened, its grow let go and done. */
async function opened(moves: Animation[]): Promise<{ zoom: E.DOMElement; second: string }> {
  const { zoom, second } = await twoPictures()
  await vi.waitFor(() => expect(moves.length).toBeGreaterThan(0))
  finishAll(moves)
  await vi.waitFor(() => expect(moving(zoom)).toHaveLength(0))
  return { zoom, second }
}

// epic `repo-split` (Owen, 2026-10-28):  the animations spell.app's page had, as the component's own
describe("<ui-zoom>:  motion", () => {
  test("it grows out of the picture on opening, and shrinks back before it closes", async () => {
    const moves = holdZoomMoves()
    const { zoom } = await twoPictures()
    await vi.waitFor(() => expect(moving(zoom).length).toBeGreaterThan(0))
    finishAll(moves)
    await vi.waitFor(() => expect(moving(zoom)).toHaveLength(0))
    // its close button (a key press can close the dialog natively, with no say for the zoom)
    zoom.shadowRoot!.querySelector("ui-modal")!.shadowRoot!.querySelector<HTMLElement>('[part~="close"]')!.click()
    // still up while it shrinks:  the picture's `src` goes once it has
    await vi.waitFor(() => expect(moving(zoom).length).toBeGreaterThan(0))
    expect(zoom.hasAttribute("src")).toBe(true)
    finishAll(moves)
    await vi.waitFor(() => expect(zoom.hasAttribute("src")).toBe(false))
  })

  test("paging slides the next picture in while a copy of the shown one slides out", async () => {
    const moves = holdZoomMoves()
    const { zoom, second } = await opened(moves)
    await userEvent.keyboard("{ArrowDown}")
    await vi.waitFor(() => expect(zoom.shadowRoot!.querySelectorAll("figure")).toHaveLength(2))
    await vi.waitFor(() => expect(moving(zoom).length).toBeGreaterThanOrEqual(2))
    expect(zoom.getAttribute("src")).toBe(second)
    finishAll(moves)
    await vi.waitFor(() => expect(zoom.shadowRoot!.querySelectorAll("figure")).toHaveLength(1))
  })

  test("the bounce at the end moves the figure", async () => {
    const moves = holdZoomMoves()
    const { zoom } = await opened(moves)
    await userEvent.keyboard("{ArrowUp}")
    await vi.waitFor(() => expect(moves.length).toBeGreaterThan(0))
    // halfway through, the figure is furthest away
    const bounce = moves[0]!
    bounce.currentTime = Number(bounce.effect!.getComputedTiming().duration) / 2
    const figure = zoom.shadowRoot!.querySelector("figure")!
    expect(getComputedStyle(figure).transform).not.toBe("none")
    finishAll(moves)
  })
})
