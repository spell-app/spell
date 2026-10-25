/****************
 * ### `ImageZoom`
 * Which images on a page open full size when clicked, and showing one in the page's `<epic-zoom>`.
 * - Every docs page's (epic `epic-engine` I129;  Owen, 2026-10-25:  "Can't click on images in the page to expand so I
 *   can't tell" ... "bring it up in a full-screen modal so I can `escape` to close it"):  the docs runtime listens
 *   on the whole page (`onClick()`, `onPointerOver()`);  a request's thumbnails in `<epic-field>` call `onClick()`
 *   themselves, for a page without the runtime (Epic UI's)
 * - A ZOOMABLE image (`isZoomable()`), in the page's own markup (never inside a shadow root):
 *   - shown at least `MIN_SHOWN` (64px) on its longer side:  never an icon or a tiny image
 *   - and one of:
 *     - shown smaller than its natural size (a screenshot scaled into the column, a thumbnail)
 *     - in a `<figure>`
 *     - in a link to an image (its own file, or a stopgap `<a href="shot.png" target="_blank">` round it)
 *   - NOT inside any other link (it goes where its link goes), a button, or anything marked `data-no-zoom`
 * - A plain click on one (main button, no modifier key):  its link is never followed (`preventDefault()`);
 *   it shows in `<epic-zoom>` at full size, or as large as fits, its alt text the caption
 *   - with a modifier key:  the link's, as usual (a new tab)
 * - Plain DOM, no Solid and no Spell UI:  the docs runtime imports it, and it sits in no pack module.
 *   It makes the `<epic-zoom>` by its tag, which upgrades once the epics pack has loaded.
 ****************/
export class ImageZoom {
  /** The image a plain click on the page hit, when it's zoomable:  the image itself, or the one alone in a link. */
  static imageFor(event: MouseEvent): HTMLImageElement | undefined {
    if (event.defaultPrevented || event.button !== 0) return undefined
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return undefined
    const target = event.target instanceof Element ? event.target : null
    const image = target?.closest("img") ?? target?.closest("a")?.querySelector("img")
    return image && ImageZoom.isZoomable(image) ? image : undefined
  }

  /** Is `image` one to open full size?  See the class's rule. */
  static isZoomable(image: HTMLImageElement): boolean {
    if (image.closest(NO_ZOOM)) return false
    const link = image.closest("a")
    if (link && !ImageZoom.linksImage(link, image)) return false
    const shown = image.getBoundingClientRect()
    if (Math.max(shown.width, shown.height) < MIN_SHOWN) return false
    const shrunk = image.naturalWidth > shown.width + 1 || image.naturalHeight > shown.height + 1
    return shrunk || !!image.closest("figure") || !!link
  }

  /**
   * A plain click on a zoomable image:  shown full size, its link not followed.
   * - an arrow, so it's handed to `addEventListener()` as it is
   * - true when it took the click
   */
  static onClick = (event: MouseEvent): boolean => {
    const image = ImageZoom.imageFor(event)
    if (!image) return false
    event.preventDefault()
    ImageZoom.show(image)
    return true
  }

  /**
   * The pointer over a zoomable image:  it's marked `data-epic-zoom`, which draws the zoom-in cursor
   * (`spell-doc.css`).
   * - SIDE EFFECT:  writes the attribute on the image (light DOM), once;  the live patch keeps it
   */
  static onPointerOver = (event: PointerEvent) => {
    const image = event.target instanceof HTMLImageElement ? event.target : null
    if (!image || image.hasAttribute(ZOOM_MARK) || !ImageZoom.isZoomable(image)) return
    image.setAttribute(ZOOM_MARK, "")
  }

  /**
   * Show `image` full size, in the page's ONE `<epic-zoom>`.
   * - SIDE EFFECT:  makes it at the end of `<body>` the first time (`data-spell-added`:  the live patch steps around it)
   */
  static show(image: HTMLImageElement) {
    let zoom = document.querySelector(ZOOM_TAG)
    if (!zoom) {
      zoom = document.createElement(ZOOM_TAG)
      zoom.setAttribute("data-spell-added", "")
      document.body.append(zoom)
    }
    zoom.setAttribute("alt", image.alt)
    zoom.setAttribute("src", image.currentSrc || image.src)
  }

  /** Does `link` lead to an image:  `image`'s own file, a `data:image/` address, or a file with an image's extension? */
  private static linksImage(link: HTMLAnchorElement, image: HTMLImageElement): boolean {
    const href = link.href
    if (!href) return true
    if (href === image.src || href === image.currentSrc) return true
    return IMAGE_ADDRESS.test(href)
  }
}

/** The page's zoom. */
const ZOOM_TAG = "epic-zoom"

/** The attribute that marks a zoomable image under the pointer:  `spell-doc.css` draws its cursor. */
const ZOOM_MARK = "data-epic-zoom"

/** What an image is never zoomed inside:  a button, or a block marked so. */
const NO_ZOOM = "[data-no-zoom], button, ui-button"

/** The least an image is shown at, on its longer side, to zoom:  smaller ones are icons and badges. */
const MIN_SHOWN = 64

/** An address of an image:  a `data:image/` one, or a file by its extension (before any `?` or `#`). */
const IMAGE_ADDRESS = /^data:image\/|\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)/i
