import { UI } from "spell/ui/core"
import type { TabIcon } from "spell/parser/core/core.types"

/****************
 * ### `TabIcons`
 * The browser tab's icon, while a running app says one (epic `editor` P50):  `its icon is "rocket"`.
 * - What the run page's host and the editor's Run do for `SiteHost.showIcon()`:  ONE for a page.
 * - An icon's name is drawn small, in its colour, as a picture of its own (an SVG `data:` address):
 *   the icon from the page's Spell UI icons (`UI.icons`, Font Awesome's by default), its colour one of Spell UI's
 *   (`green`, read from its token) or any CSS colour.
 * - A picture, a file of the project, is shown as it is, once it's loaded:  one that won't load leaves the icon as it
 *   was, said on the console.
 * - `show(undefined)` puts the page's own icons back, as they were before the first:  Spell's hat.
 * - Every `<link rel="icon">` of the page shows it, so the browser can't pick another size of the old one.
 * - Plain DOM, no Solid:  the run page loads no editor, and this stays out of the way of both.
 ****************/
export class TabIcons {
  /** Each icon link of the page, and its address before we first changed it:  `undefined` until we do. */
  private originals?: Array<{ link: HTMLLinkElement; href: string; type: string | null }>

  /** Which `show()` is the latest:  a slower one before it (a picture still loading) never wins. */
  private asked = 0

  constructor(private readonly document: Document) {}

  /**
   * Show `icon` as the tab's;  `undefined`:  the page's own back.
   * - NEVER throws:  an icon that can't be drawn, or a picture that won't load, leaves the tab as it was.
   */
  show(icon: TabIcon | undefined): void {
    const ask = ++this.asked
    if (!icon) return this.restore()
    this.addressFor(icon).then(
      (address) => {
        if (ask === this.asked && address) this.put(address)
      },
      (error: unknown) => console.warn(`TabIcons:  can't show the tab's icon ${JSON.stringify(icon)}`, error)
    )
  }

  /** The address the tab's icon links:  an icon's name drawn as an SVG, or the picture's, once it's loaded. */
  private async addressFor(icon: TabIcon): Promise<string | undefined> {
    if (icon.address !== undefined) return this.loaded(icon.address)
    await UI.load()
    const template = await UI.icons.get(icon.name)
    if (!template) {
      console.warn(`TabIcons:  there's no icon named "${icon.name}";  the tab keeps its icon`)
      return undefined
    }
    return this.drawn(template, icon.color)
  }

  /** `address`, once a picture there has loaded;  `undefined` (said on the console) when it won't. */
  private loaded(address: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const picture = new Image()
      picture.onload = () => resolve(address)
      picture.onerror = () => {
        console.warn(`TabIcons:  the icon "${address}" didn't load;  the tab keeps its icon`)
        resolve(undefined)
      }
      picture.src = address
    })
  }

  /** `template`, an icon's `<svg>`, filled with `color`, as a `data:` address. */
  private drawn(template: SVGSVGElement, color: string | undefined): string {
    const svg = template.cloneNode(true) as SVGSVGElement
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    // both:  an icon's paths are filled with `currentColor` (Font Awesome's), or inherit its `fill`
    const painted = color ? this.colorOf(color) : "black"
    svg.setAttribute("fill", painted)
    svg.setAttribute("color", painted)
    svg.removeAttribute("class")
    return `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
  }

  /**
   * `color` as the page paints it:  Spell UI's colour of that name (`--ui-green`), else the CSS colour itself.
   * - Read off a box of our own for a moment, so a name the page doesn't know is just the text colour.
   */
  private colorOf(color: string): string {
    const probe = this.document.createElement("span")
    probe.style.color = COLOR_NAME.test(color) ? `var(--ui-${color.trim().replace(/\s+/g, "-")}, ${color})` : color
    this.document.body.append(probe)
    const painted = getComputedStyle(probe).color
    probe.remove()
    return painted || color
  }

  /** Every icon link of the page shows `address`:  their old addresses kept the first time. */
  private put(address: string): void {
    this.originals ??= this.iconLinks().map((link) => ({ link, href: link.href, type: link.getAttribute("type") }))
    if (!this.originals.length) {
      const link = this.document.createElement("link")
      link.rel = "icon"
      this.document.head.append(link)
      this.originals.push({ link, href: "", type: null })
    }
    const type = address.startsWith("data:image/svg+xml") ? "image/svg+xml" : undefined
    for (const { link } of this.originals) {
      link.href = address
      if (type) link.type = type
      else link.removeAttribute("type")
    }
  }

  /** The page's own icons back, as they were before we first changed them. */
  private restore(): void {
    for (const { link, href, type } of this.originals ?? []) {
      if (!href) link.remove()
      else link.href = href
      if (type === null) link.removeAttribute("type")
      else link.setAttribute("type", type)
    }
    this.originals = undefined
  }

  /** The page's `<link rel="icon">`s, `apple-touch-icon` left alone. */
  private iconLinks(): HTMLLinkElement[] {
    return [...this.document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')]
  }
}

/** A colour's name, one Spell UI may have a token for:  `green`, `light grey`;  not `#2a2`, nor `rgb(...)`. */
const COLOR_NAME = /^\s*[a-z]+(\s+[a-z]+)*\s*$/i
