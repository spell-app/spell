/****************
 * ### `SpellUIGuide`
 * Where the Spell UI site (a Spell guide, `@spell/guides/SpellUI`) is, and the address of each of its pages:
 * the ONE place that spells it out (epic `editor` P43).
 * - The page server shows the site at `/components/ui/`, in a `<spell-viewer>` whose site follows the page's address:
 *   `/components/ui/button/api` is the Button's API page.
 * - Everyone linking a guide page asks here:  the editor's Inspector, the theme bench's address, `spell ui icon`,
 *   the components README's writer, the page server's link mender.
 * - It also takes the names Spell UI's old components pages went by (`ui-grid.html#ui-column`, `icons.html?q=star`),
 *   so a link written for them still lands on the right page.
 * - A leaf of `spell/ui/util`, the bottom of `ui`:  no imports, so a component (the theme menu), a docs widget,
 *   the editor and a node tool (`spell ui icon`) all import it by file.
 *   - Not in the barrel:  it'd land in `core`, which no page needs it in.
 * - STATIC and instance-free on purpose:  there's one site.
 ****************/
export class SpellUIGuide {
  /** The site's address on the page server, `/components/ui`:  each page's address goes after it. */
  static readonly address = "/components/ui"

  /** The site's project:  `@spell/guides/SpellUI`, in the app's spaces. */
  static readonly project = "@spell/guides/SpellUI"

  /**
   * The page server's address of `page`, a site address (`/button/api`), a tag (`ui-button`), or an old components
   * page's name (`ui-button.html`, `ui-grid.html#ui-column`, `icons.html?q=star`):
   * `/components/ui/button/api`, `/components/ui/button`, `/components/ui/grid#ui-column`, `/components/ui/icons?q=star`.
   * - Its `?query` and `#section` stay as they are:  a section the Spell page doesn't have lands at its top.
   * - The site's home for `""`, `/`, `index.html`.
   */
  static addressOf(page: string): string {
    const [, path = "", rest = ""] = /^([^?#]*)(.*)$/.exec(page) ?? []
    return `${SpellUIGuide.address}${SpellUIGuide.siteAddressOf(path)}${rest}`
  }

  /**
   * The site's own address (from its root) of `path`, a site address, a tag or an old components page's name,
   * with no `?query` or `#section`:  `ui-breadcrumbs.html` => `/breadcrumb`.
   */
  static siteAddressOf(path: string): string {
    if (path.startsWith("/")) return path.replace(/\/+$/, "") || "/"
    const name = path.replace(/\.html$/, "")
    if (!name || name === "index") return "/"
    return `/${RENAMED[name] ?? name.replace(/^ui-/, "")}`
  }

  /**
   * The site's address of a Spell UI site link written for an old components page, `/components/ui/ui-button.html`:
   * the link it is now, `/components/ui/button`;  `undefined` for any other path (one of the site's pictures,
   * its data, a page already on the Spell UI site).
   * - What the page server's link mender asks (`Linker.mendedPath()`).
   */
  static mendedPath(path: string): string | undefined {
    const match = /^\/components\/ui\/([^/?#]+\.html)([?#].*)?$/.exec(path)
    return match ? SpellUIGuide.addressOf(`${match[1]}${match[2] ?? ""}`) : undefined
  }
}

/**
 * The old components pages whose Spell page isn't their name without `ui-`:
 * the Spell UI site names them by what they show (`SpellUI.spell`).
 */
const RENAMED: Readonly<Record<string, string>> = {
  "ui-ad": "advertisement",
  "ui-breadcrumbs": "breadcrumb",
  "ui-header": "content-parts",
  "ui-toc": "table-of-contents",
  // `/components` is the component index;  the `<ui-components>` element has its own page
  "ui-components": "ui-components"
}
