import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { E } from "spell-ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-ui/components/ui-zoom"
import "spell-ui/components/ui-image"
import { ImageZoom } from "spell-ui/components/ui-zoom"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-zoom/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

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
  const zoom = document.querySelector<E.DOMElement>("body > ui-zoom")!
  await zoom.ready
  await zoom.shadowRoot!.querySelector<E.DOMElement>("ui-modal")!.ready
  await ElementFixture.tick()
  return zoom
}

/** `zoom`'s shadow part `name`. */
function part<T extends Element = HTMLElement>(zoom: Element, name: string): T | null {
  return zoom.shadowRoot!.querySelector<T>(`[part~="${name}"]`)
}

afterEach(() => document.querySelectorAll("main, body > ui-zoom").forEach((element) => element.remove()))

// epic `epic-engine` I129 (Owen, 2026-10-25):  "Can't click on images in the page to expand so I can't tell"
describe("ImageZoom:  which images zoom", () => {
  test("a screenshot shown smaller than its size, one in a <figure>, one in a link to an image:  yes", async () => {
    expect(ImageZoom.isZoomable(await page(`<img src="${png(800, 400)}" style="width: 200px">`))).toBe(true)
    expect(ImageZoom.isZoomable(await page(`<figure><img src="${png(100, 80)}"></figure>`))).toBe(true)
    const shot = png(100, 80)
    expect(ImageZoom.isZoomable(await page(`<a href="${shot}" target="_blank"><img src="${shot}"></a>`))).toBe(true)
  })

  test("an icon, an image at its own size, one in a link elsewhere, a button or a <ui-zoom>, `data-no-zoom`:  no", async () => {
    expect(ImageZoom.isZoomable(await page(`<img src="${png(128, 128)}" style="width: 32px">`))).toBe(false)
    expect(ImageZoom.isZoomable(await page(`<img src="${png(300, 200)}">`))).toBe(false)
    expect(
      ImageZoom.isZoomable(await page(`<a href="/guides/x.html"><figure><img src="${png(300, 200)}"></figure></a>`))
    ).toBe(false)
    expect(ImageZoom.isZoomable(await page(`<button><img src="${png(800, 400)}" style="width: 200px"></button>`))).toBe(
      false
    )
    expect(ImageZoom.isZoomable(await page(`<figure data-no-zoom><img src="${png(300, 200)}"></figure>`))).toBe(false)
    expect(
      ImageZoom.isZoomable(await page(`<ui-zoom><img src="${png(800, 400)}" style="width: 200px"></ui-zoom>`))
    ).toBe(false)
  })
})

describe("<ui-zoom src>:  the page's zoom", () => {
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
    const modal = part<E.DOMElement>(zoom, "base")!
    const zoomed = part<HTMLImageElement>(zoom, "image")!
    expect([modal.hasAttribute("visible"), zoomed.src === shot, zoomed.alt]).toEqual([
      true,
      true,
      "Before:  segmented, full size"
    ])
    expect(part(zoom, "caption")!.textContent).toBe("Before:  segmented")
    // nothing of its own in the page
    expect(part(zoom, "view")).toBeNull()
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

  test("a click on the zoomed image closes it too;  the page keeps ONE zoom, beside any of its own", async () => {
    await ElementFixture.render(`<ui-zoom><p>Mine</p></ui-zoom>`)
    const image = await page(`<img src="${png(800, 400)}" alt="" style="width: 200px">`)
    ImageZoom.show(image)
    const zoom = await theZoom()
    // no alt text:  no caption, and a name of its own
    expect([part(zoom, "caption"), zoom.shadowRoot!.querySelector("img")!.alt]).toEqual([null, "Image, full size"])
    part(zoom, "image")!.click()
    await vi.waitFor(() => expect(zoom.hasAttribute("src")).toBe(false))
    ImageZoom.show(image)
    expect(document.querySelectorAll("body > ui-zoom")).toHaveLength(1)
    expect(document.querySelectorAll("ui-zoom")).toHaveLength(2)
  })

  test("the pointer over a zoomable image marks it `data-ui-zoom`, for the zoom-in cursor;  a modifier click is the link's", async () => {
    const image = await page(`<img src="${png(800, 400)}" style="width: 200px">`)
    document.addEventListener("pointerover", ImageZoom.onPointerOver)
    image.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }))
    document.removeEventListener("pointerover", ImageZoom.onPointerOver)
    expect(image.hasAttribute("data-ui-zoom")).toBe(true)
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true })
    Object.defineProperty(event, "target", { value: image })
    expect([ImageZoom.onClick(event), event.defaultPrevented]).toEqual([false, false])
  })
})

describe("<ui-zoom> round content", () => {
  /** A 600px-wide block in a `<ui-zoom attributes>`, in an 800px column. */
  async function wrapped(attributes = "") {
    const column = await ElementFixture.render<HTMLElement>(
      `<div style="width: 800px"><ui-zoom ${attributes}>` +
        `<div class="block" style="width: 600px; height: 400px"><a href="#x">A link inside</a></div></ui-zoom></div>`
    )
    await ElementFixture.settle()
    const zoom = column.querySelector<E.DOMElement>("ui-zoom")!
    return { zoom, block: column.querySelector<HTMLElement>(".block")!, view: part(zoom, "view")! }
  }

  test("shows it at half size by default:  laid out full size, drawn at 50%", async () => {
    const { view, block } = await wrapped()
    expect([view.getBoundingClientRect().width, view.getBoundingClientRect().height]).toEqual([300, 200])
    expect(block.getBoundingClientRect().width).toBe(300)
  })

  test("`shrink`, `max-width`, `max-height`:  its size, and where it's cut off", async () => {
    const third = await wrapped(`shrink="25%"`)
    expect(third.view.getBoundingClientRect().width).toBe(150)
    third.zoom.remove()
    const capped = await wrapped(`shrink="100%" max-width="200px" max-height="100px"`)
    expect([capped.view.getBoundingClientRect().width, capped.view.getBoundingClientRect().height]).toEqual([200, 100])
  })

  test("the content can't be reached while shrunk:  one button over it opens it full size, keeping its room", async () => {
    const { zoom, view, block } = await wrapped()
    const button = part<HTMLButtonElement>(zoom, "button")!
    expect([button.getAttribute("aria-label"), block.closest("[inert]") ?? view.querySelector("[inert]")]).toEqual([
      "Show full size",
      expect.anything()
    ])
    button.click()
    await ElementFixture.settle()
    const modal = part<E.DOMElement>(zoom, "base")!
    await modal.ready
    expect([(zoom as unknown as { open: boolean }).open, modal.hasAttribute("visible")]).toEqual([true, true])
    // full size, in the modal, at the width it had in the page (once the modal's opening animation is done);
    // the view keeps its room in the page
    await vi.waitFor(() => expect(block.getBoundingClientRect().width).toBe(600))
    expect(part(zoom, "content")!.contains(block.assignedSlot)).toBe(true)
    expect(view.getBoundingClientRect().height).toBe(200)
    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(zoom.hasAttribute("open")).toBe(false))
    await ElementFixture.settle()
    expect(block.getBoundingClientRect().width).toBe(300)
  })

  test("`open` from script opens it", async () => {
    const { zoom, block } = await wrapped()
    ;(zoom as unknown as { open: boolean }).open = true
    await ElementFixture.settle()
    expect(part(zoom, "content")!.contains(block.assignedSlot)).toBe(true)
  })

  test.each(Object.entries(EXAMPLES))("example %s is accessible", async (_path, html) => {
    const host = await ElementFixture.render<HTMLElement>(html)
    await ElementFixture.settle()
    await expectAccessible(host)
  })
})

describe("<ui-image zoom>", () => {
  test("is a button that shows it full size, in the page's zoom;  Enter too", async () => {
    const shot = png(120, 60)
    const host = await ElementFixture.render<E.DOMElement>(`<ui-image zoom src="${shot}" alt="The toolbar"></ui-image>`)
    await ElementFixture.settle()
    const image = part<HTMLImageElement>(host, "image")!
    expect([image.getAttribute("role"), image.tabIndex, image.getAttribute("aria-label")]).toEqual([
      "button",
      0,
      "The toolbar:  show full size"
    ])
    image.click()
    await vi.waitFor(() => expect(document.querySelector("body > ui-zoom")?.getAttribute("src") === shot).toBe(true))
    const zoom = await theZoom()
    expect(zoom.getAttribute("alt")).toBe("The toolbar")
    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(part(zoom, "base")!.hasAttribute("visible")).toBe(false))
    await ElementFixture.settle()
    image.focus()
    await userEvent.keyboard("{Enter}")
    await vi.waitFor(() => expect(zoom.getAttribute("src") === shot).toBe(true))
    host.remove()
  })

  test("without `zoom`:  a plain image, no button", async () => {
    const host = await ElementFixture.render<E.DOMElement>(`<ui-image src="${png(10, 10)}" alt=""></ui-image>`)
    await ElementFixture.settle()
    const image = part<HTMLImageElement>(host, "image")!
    expect([image.getAttribute("role"), image.hasAttribute("tabindex")]).toEqual([null, false])
    image.click()
    await ElementFixture.tick()
    expect(document.querySelector("body > ui-zoom")).toBeNull()
  })
})
