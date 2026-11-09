import { isServer } from "@solidjs/web"

/****************
 * ### `SitePages`
 * What `<ui-site-nav>` and `<ui-site-tabs>` share about a site's list of pages:
 * which pages are well-formed, what each is known by, and whether a page is the one shown.
 * - Plain data, no element:  each family imports this file, and neither draws the other.
 ****************/
export class SitePages {
  /** What `page` is known by, to open, find and remember it:  its `id`, else its `href`, else its `title`. */
  static keyOf(page: SitePage): string {
    return page.id ?? page.href ?? page.title
  }

  /** Is `page` the one `key` names:  its `id`, its `href`, or its `href`'s path? */
  static isShown(page: SitePage, key: string): boolean {
    if (!key) return false
    if (page.id === key || page.href === key) return true
    return !!page.href && !isServer && SitePages.pathOf(page.href) === SitePages.pathOf(key)
  }

  /** The pages in `value` that are pages:  objects with a text `title`;  anything else is left out. */
  static wellFormed<Page extends SitePage>(value: unknown): readonly Page[] {
    if (!Array.isArray(value)) return []
    return value.flatMap((each): Page[] => {
      if (!each || typeof each !== "object" || typeof (each as SitePage).title !== "string") return []
      const page = each as Page
      return [page.pages ? { ...page, pages: SitePages.wellFormed<Page>(page.pages) } : page]
    })
  }

  /** `event` is a click the browser opens elsewhere:  a middle click, or one with Command, Control, Shift or Alt. */
  static isOpenElsewhere(event: Event | undefined): boolean {
    if (!(event instanceof MouseEvent)) return false
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  }

  /**
   * `href`'s path and hash, against the page's address:  `films/1` on `/guide/` => `/guide/films/1`.
   * - With its hash:  else every hash link (`#/films`) on one page would be the page shown.
   */
  private static pathOf(href: string): string {
    try {
      const url = new URL(href, location.href)
      return url.pathname + url.hash
    } catch {
      return href
    }
  }
}

/** What every site's page has, whichever element draws it:  each adds its own fields (`SiteNavPage`, `SiteTabsPage`). */
export type SitePage = {
  /** what the navigation calls it:  `Films` */
  title: string
  /** where it is:  `/films`;  none, a page that only holds pages */
  href?: string
  /** what `current` may call it, when its `href` isn't enough:  `film-page` */
  id?: string
  /** the pages under it */
  pages?: readonly SitePage[]
}
