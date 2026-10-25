import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { E } from "spell-ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-ui/components/ui-modal"
import "spell-epic/components/epic-zoom"
import { ImageZoom } from "spell-epic/components/epic-zoom/ImageZoom"

/** A `width` x `height` PNG, drawn on a canvas. */
function png(width: number, height: number): string {
  const canvas = document.createElement("canvas")
  Object.assign(canvas, { width, height })
  canvas.getContext("2d")!.fillRect(0, 0, width, height)
  return canvas.toDataURL("image/png")
}

/** `markup` on the page, its first image decoded. */
async function page(markup: string): Promise<HTMLImageElement> {
  const host = document.createElement("main")
  host.innerHTML = markup
  document.body.append(host)
  const image = host.querySelector("img")!
  await image.decode()
  return image
}

/** The page's zoom, once `ImageZoom.show()` made it, drawn. */
async function theZoom(): Promise<E.DOMElement> {
  const zoom = document.querySelector<E.DOMElement>("body > epic-zoom")!
  await zoom.ready
  await zoom.shadowRoot!.querySelector<E.DOMElement>("ui-modal")!.ready
  await ElementFixture.tick()
  return zoom
}

afterEach(() => document.querySelectorAll("main, epic-zoom").forEach((element) => element.remove()))

// epic `epic-engine` I129 (Owen, 2026-10-25):  "Can't click on images in the page to expand so I can't tell"
describe("ImageZoom:  which images zoom", () => {
  test("a screenshot shown smaller than its size, one in a <figure>, one in a link to an image:  yes", async () => {
    expect(ImageZoom.isZoomable(await page(`<img src="${png(800, 400)}" style="width: 200px">`))).toBe(true)
    expect(ImageZoom.isZoomable(await page(`<figure><img src="${png(100, 80)}"></figure>`))).toBe(true)
    const shot = png(100, 80)
    expect(ImageZoom.isZoomable(await page(`<a href="${shot}" target="_blank"><img src="${shot}"></a>`))).toBe(true)
  })

  test("an icon, an image at its own size, one in a link elsewhere or in a button, `data-no-zoom`:  no", async () => {
    expect(ImageZoom.isZoomable(await page(`<img src="${png(128, 128)}" style="width: 32px">`))).toBe(false)
    expect(ImageZoom.isZoomable(await page(`<img src="${png(300, 200)}">`))).toBe(false)
    expect(
      ImageZoom.isZoomable(await page(`<a href="/guides/x.html"><figure><img src="${png(300, 200)}"></figure></a>`))
    ).toBe(false)
    expect(ImageZoom.isZoomable(await page(`<button><img src="${png(800, 400)}" style="width: 200px"></button>`))).toBe(
      false
    )
    expect(ImageZoom.isZoomable(await page(`<figure data-no-zoom><img src="${png(300, 200)}"></figure>`))).toBe(false)
  })
})

describe("<epic-zoom>", () => {
  test("a click on a zoomable image shows it full size, captioned by its alt text, never following its link;  Escape closes it", async () => {
    const shot = png(1600, 900)
    const image = await page(
      `<figure><a href="${shot}" target="_blank"><img src="${shot}" alt="Before:  segmented" style="width: 300px"></a></figure>`
    )
    document.addEventListener("click", ImageZoom.onClick)
    const followed = vi.fn((event: Event) => event.defaultPrevented)
    document.addEventListener("click", followed)
    try {
      image.click()
      expect(followed).toHaveReturnedWith(true)
    } finally {
      document.removeEventListener("click", ImageZoom.onClick)
      document.removeEventListener("click", followed)
    }
    const zoom = await theZoom()
    const modal = zoom.shadowRoot!.querySelector<E.DOMElement>('[part~="base"]')!
    const zoomed = zoom.shadowRoot!.querySelector<HTMLImageElement>('[part~="image"]')!
    expect([modal.hasAttribute("visible"), zoomed.src === shot, zoomed.alt]).toEqual([
      true,
      true,
      "Before:  segmented, full size"
    ])
    expect(zoom.shadowRoot!.querySelector('[part~="caption"]')!.textContent).toBe("Before:  segmented")
    await zoomed.decode()
    // as large as fits the window, never cropped:  its sides within the window, its shape kept
    const box = zoomed.getBoundingClientRect()
    expect([
      box.width <= innerWidth,
      box.height <= innerHeight,
      Math.abs(box.width / box.height - 16 / 9) < 0.02
    ]).toEqual([true, true, true])
    await expectAccessible(zoom)
    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(modal.hasAttribute("visible")).toBe(false))
    expect(zoom.hasAttribute("src")).toBe(false)
  })

  test("a click on the zoomed image closes it too;  the page keeps ONE zoom", async () => {
    const image = await page(`<img src="${png(800, 400)}" alt="" style="width: 200px">`)
    ImageZoom.show(image)
    const zoom = await theZoom()
    // no alt text:  no caption, and a name of its own
    expect([zoom.shadowRoot!.querySelector('[part~="caption"]'), zoom.shadowRoot!.querySelector("img")!.alt]).toEqual([
      null,
      "Image, full size"
    ])
    zoom.shadowRoot!.querySelector<HTMLElement>('[part~="image"]')!.click()
    await vi.waitFor(() => expect(zoom.hasAttribute("src")).toBe(false))
    ImageZoom.show(image)
    expect(document.querySelectorAll("epic-zoom")).toHaveLength(1)
  })

  test("the pointer over a zoomable image marks it, for the zoom-in cursor;  a modifier click is the link's", async () => {
    const image = await page(`<img src="${png(800, 400)}" style="width: 200px">`)
    document.addEventListener("pointerover", ImageZoom.onPointerOver)
    image.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }))
    document.removeEventListener("pointerover", ImageZoom.onPointerOver)
    expect(image.hasAttribute("data-epic-zoom")).toBe(true)
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true })
    Object.defineProperty(event, "target", { value: image })
    expect([ImageZoom.onClick(event), event.defaultPrevented]).toEqual([false, false])
  })
})
