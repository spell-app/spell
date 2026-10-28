/****************
 * ### `ImageZoom`
 * Which images on a page open full size when clicked, and showing one in the page's ONE `<ui-zoom>`.
 * - Every docs page's (epic `epic-engine` I129;  Owen, 2026-10-25:  "Can't click on images in the page to expand so I
 *   can't tell" ... "bring it up in a full-screen modal so I can `escape` to close it"):  the docs runtime listens
 *   on the whole page (`onClick()`, `onPointerOver()`);  a request's thumbnails in `<epic-field>` call `onClick()`
 *   themselves, for a page without the runtime (Epic UI's);  `<ui-image zoom>` calls `show()`
 * - So every plain `<img>` screenshot opens full size, with nothing rewritten:
 *   epic pages, guides, details pages, Markdown
 * - A ZOOMABLE image (`isZoomable()`), in the page's own markup (never inside a shadow root):
 *   - shown at least `MIN_SHOWN` (64px) on its longer side:  never an icon or a tiny image
 *   - and one of:
 *     - shown smaller than its natural size (a screenshot scaled into the column, a thumbnail)
 *     - in a `<figure>`
 *     - in a link to an image (its own file, or a stopgap `<a href="shot.png" target="_blank">` round it)
 *   - NOT inside any other link (it goes where its link goes), a button, a `<ui-zoom>`, or anything marked
 *     `data-no-zoom`
 * - A plain click on one (main button, no modifier key):  its link is never followed (`preventDefault()`);
 *   it shows in `<ui-zoom>` at full size, or as large as fits, its alt text the caption
 *   - with a modifier key:  the link's, as usual (a new tab)
 * - Plain DOM, no Solid and no Spell UI's core:  the docs runtime imports this leaf alone, so the element isn't
 *   bundled there.  It makes the `<ui-zoom>` by its tag, which `<ui-root>` loads like any other.
 * - Stepping (`step()`):  while a zoom shows, the arrow keys go to the next / previous ZOOMABLE on the page
 *   (`zoomables()`:  every `<ui-zoom>` of content, every `<ui-image zoom>` and every zoomable `<img>`, in document
 *   order, wrapping round)
 * - Moved from the epics pack, with `<epic-zoom>` (epic `ui-gaps` P14):  any page can open its screenshots full size.
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
   * The pointer over a zoomable image:  it's marked `data-ui-zoom`, which draws the zoom-in cursor
   * (the docs' sheet, `spell-doc.css`, draws it for a page's images).
   * - SIDE EFFECT:  writes the attribute on the image (light DOM), once;  the live patch keeps it
   */
  static onPointerOver = (event: PointerEvent) => {
    const image = event.target instanceof HTMLImageElement ? event.target : null
    if (!image || image.hasAttribute(ZOOM_MARK) || !ImageZoom.isZoomable(image)) return
    image.setAttribute(ZOOM_MARK, "")
  }

  /**
   * Show `image` full size, in the page's ONE `<ui-zoom>`.
   * - `image` may be in a shadow root:  `<ui-image zoom>` hands its own
   * - SIDE EFFECT:  makes it at the end of `<body>` the first time (`data-spell-added`:  the live patch steps around it)
   */
  static show(image: HTMLImageElement) {
    let zoom = document.querySelector(`body > ${ZOOM_TAG}[${ADDED}]`)
    if (!zoom) {
      zoom = document.createElement(ZOOM_TAG)
      zoom.setAttribute(ADDED, "")
      document.body.append(zoom)
    }
    const root = image.getRootNode()
    ImageZoom.shown = root instanceof ShadowRoot ? root.host : image
    zoom.setAttribute("alt", image.alt)
    zoom.setAttribute("src", image.currentSrc || image.src)
  }

  /** What the page's zoom was last handed:  the image, or the `<ui-image>` whose shadow root holds it. */
  static shown: Element | undefined

  /** Everything on the page that zooms, in document order:  the ONE list the arrow keys step through. */
  static zoomables(): Element[] {
    return [...document.querySelectorAll(ZOOMABLES)].filter((element) =>
      element instanceof HTMLImageElement ? ImageZoom.isZoomable(element) : !element.hasAttribute(ADDED)
    )
  }

  /**
   * Show the zoomable `direction` (1 next, -1 previous) after `from`, wrapping round;  `from` is shut by `shut()`
   * - `from`:  a content `<ui-zoom>`, or `undefined` for the page's own zoom (showing `ImageZoom.shown`)
   * - an image replaces the page zoom's picture in place:  its modal stays open
   */
  static step(direction: 1 | -1, from: Element | undefined, shut: () => void) {
    const list = ImageZoom.zoomables()
    if (list.length < 2) return
    const at = list.indexOf(from ?? ImageZoom.shown!)
    const target =
      list[((((at < 0 ? (direction > 0 ? -1 : 0) : at) + direction) % list.length) + list.length) % list.length]
    if (target.localName === ZOOM_TAG) {
      shut()
      target.shadowRoot?.querySelector<HTMLButtonElement>("button.show")?.click()
      return
    }
    const image = target instanceof HTMLImageElement ? target : target.shadowRoot?.querySelector("img")
    if (!image) return
    ImageZoom.show(image)
    if (from) shut()
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
const ZOOM_TAG = "ui-zoom"

/** What zooms:  content zooms, `<ui-image zoom>`s and plain images (`isZoomable()` picks those). */
const ZOOMABLES = "ui-zoom, ui-image[zoom], img"

/** The attribute that marks a zoomable image under the pointer:  the page's sheet draws its cursor. */
const ZOOM_MARK = "data-ui-zoom"

/** The mark on the zoom `show()` made:  the docs' live patch steps around it, and `show()` finds it again. */
const ADDED = "data-spell-added"

/** What an image is never zoomed inside:  a button, a `<ui-zoom>` of its own, or a block marked so. */
const NO_ZOOM = "[data-no-zoom], button, ui-button, ui-zoom"

/** The least an image is shown at, on its longer side, to zoom:  smaller ones are icons and badges. */
const MIN_SHOWN = 64

/** An address of an image:  a `data:image/` one, or a file by its extension (before any `?` or `#`). */
const IMAGE_ADDRESS = /^data:image\/|\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)/i
