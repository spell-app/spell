import { isServer } from "@solidjs/web"

import { E } from "spell/ui/core"

/****************
 * ### `SitePages`
 * What `<ui-site-nav>`, `<ui-site-tabs>` and `<ui-site-breadcrumbs>` share about a site's list of pages:
 * which pages are well-formed, what each is known by, and whether a page is the one shown;
 * and following the site navigation around an element (`followNavAround()`).
 * - No element of its own:  each family imports this file, and none draws another.
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

  /** Every page of `pages`, the ones under each too, in order. */
  static allOf<Page extends SitePage>(pages: readonly Page[]): Page[] {
    return pages.flatMap((page) => [page, ...SitePages.allOf((page.pages ?? []) as readonly Page[])])
  }

  /**
   * The pages of `pages`, at any depth, filed under each of their `tags`:  a page with two tags is in both groups.
   * - Groups come in `order`'s order, then the others as the pages first name them.
   * - A top-level page with pages under it and no tags goes under `untagged`, last:  a new family shows up even before
   *   it's filed.  Any other page with no tags isn't listed.
   */
  static groupedByTag<Page extends SitePage>(
    pages: readonly Page[],
    { order = [], untagged }: { order?: readonly string[]; untagged: string }
  ): SitePageGroup<Page>[] {
    const groups = new Map<string, Page[]>(order.map((tag) => [tag, []]))
    for (const page of SitePages.allOf(pages))
      for (const tag of page.tags ?? []) groups.set(tag, [...(groups.get(tag) ?? []), page])
    const loose = pages.filter((page) => page.pages?.length && !page.tags?.length)
    const filed = [...groups].filter(([, listed]) => listed.length).map(([tag, listed]) => ({ tag, pages: listed }))
    return loose.length ? [...filed, { tag: untagged, pages: loose }] : filed
  }

  /** `page`'s address has a parameter in it (`/films/:film`), so a link can't go there. */
  static hasParameter(page: SitePage): boolean {
    return !!page.href && PARAMETER.test(page.href)
  }

  /** `event` is a click the browser opens elsewhere:  a middle click, or one with Command, Control, Shift or Alt. */
  static isOpenElsewhere(event: Event | undefined): boolean {
    if (!(event instanceof MouseEvent)) return false
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  }

  ////////////////
  // ## Following the site navigation
  ////////////////

  /**
   * Follow the site navigation around `element`:  `read` its `pages` (parsed, not yet checked) and `current` now,
   * and again each time either changes (epic `mockup` T38, T39).
   * - The navigation:  the `<ui-site-nav>` of the nearest box around `element` that has one of its own, across shadow
   *   roots (`navAround()`).
   * - It reads the navigation's attributes, what a Spell site writes:  not its `pages` property set from a script.
   * - Returns how to stop following;  `undefined` with no navigation around it, and `read` isn't called.
   */
  static followNavAround(element: Element, read: (followed: FollowedSiteNav) => void): (() => void) | undefined {
    const nav = SitePages.navAround(element)
    if (!nav) return undefined
    const readNav = () =>
      read({
        pages: SitePages.parsed(nav.getAttribute(PAGES)),
        current: nav.getAttribute(CURRENT) ?? undefined,
        shownBelow: SitePages.titlesIn(SitePages.parsed(nav.getAttribute(SHOWN_BELOW)))
      })
    readNav()
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches the site navigation around it, another element
    const observer = new MutationObserver(readNav)
    observer.observe(nav, { attributes: true, attributeFilter: [PAGES, CURRENT, SHOWN_BELOW] })
    return () => observer.disconnect()
  }

  /** The `<ui-site-nav>` of the nearest box around `element` that has one of its own, across shadow roots. */
  private static navAround(element: Element): Element | undefined {
    const box = E.closestAcrossShadow(element, `:has(> ${SITE_NAV})`)
    return box?.querySelector(`:scope > ${SITE_NAV}`) ?? undefined
  }

  /** The titles in `value`, a list of text:  any else left out. */
  private static titlesIn(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((each): each is string => typeof each === "string") : []
  }

  /** The pages in a navigation's `pages` text;  `undefined` for none, or text that isn't JSON. */
  private static parsed(text: string | null): unknown {
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return undefined
    }
  }

  /**
   * `href`'s path and hash, against the page's address:  `films/1` on `/guide/` => `/guide/films/1`.
   * - With its hash:  else every hash link (`#/films`) on one page would be the page shown.
   * - Another site's address whole:  else a link out to `https://docs.example.com` would be the page shown at `/`
   *   (epic old-console-redo I25).
   */
  private static pathOf(href: string): string {
    try {
      const url = new URL(href, location.href)
      if (url.origin !== location.origin) return url.href
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
  /** what it's filed under, to group and search a site's pages by:  `["Forms", "Inputs"]` */
  tags?: readonly string[]
  /** the pages under it */
  pages?: readonly SitePage[]
}

/** One group of `SitePages.groupedByTag()`. */
export type SitePageGroup<Page extends SitePage = SitePage> = {
  /** what its pages are filed under */
  tag: string
  /** its pages, in the site's order */
  pages: readonly Page[]
}

/** What a family follows of the site navigation around it:  its `pages` (parsed, not yet checked) and `current`. */
export type FollowedSiteNav = {
  /** the navigation's `pages`, parsed from its attribute:  checked by `wellFormed()` before use */
  pages: unknown
  /** the navigation's `current` */
  current: string | undefined
  /**
   * the titles of the pages shown below `current` that it doesn't list (a page with a parameter, `/films/:film`), top
   * first:  a Spell site writes them in its navigation's `data-shown` (epic old-console-redo I29)
   */
  shownBelow?: readonly string[]
}

/** The site navigation's tag, and the two attributes of it that are followed. */
const SITE_NAV = "ui-site-nav"
const PAGES = "pages"
const CURRENT = "current"
const SHOWN_BELOW = "data-shown"

/** A parameter in an address (`/films/:film`), in the kit's ONE address grammar (`spell/util/addressPattern`). */
const PARAMETER = /\/:|\*/
