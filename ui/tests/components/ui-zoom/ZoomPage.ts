import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

/** A `width` x `height` PNG, drawn on a canvas. */
export function png(width: number, height: number): string {
  const canvas = document.createElement("canvas")
  Object.assign(canvas, { width, height })
  canvas.getContext("2d")!.fillRect(0, 0, width, height)
  return canvas.toDataURL("image/png")
}

/** `markup` on the page, its first image decoded. */
export async function page(markup: string): Promise<HTMLImageElement> {
  const host = document.createElement("main")
  host.innerHTML = markup
  document.body.append(host)
  const image = host.querySelector("img")!
  await image.decode()
  return image
}

/** The page's zoom, once `ImageZoom.show()` made it, drawn. */
export async function theZoom(): Promise<E.DOMElement> {
  const zoom = document.querySelector<E.DOMElement>("body > ui-zoom")!
  await zoom.ready
  await zoom.shadowRoot!.querySelector<E.DOMElement>("ui-modal")!.ready
  await ElementFixture.tick()
  return zoom
}
