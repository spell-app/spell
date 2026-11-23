import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { SitePages, type FollowedSiteNav, type SitePage } from "spell/ui/components/ui-site-nav/SitePages"
import { siteTabsVocabulary } from "./UISiteTabs.en"

import siteTabsCSS from "./UISiteTabs.css?inline"

/****************
 * ### `<ui-site-tabs>`
 * The component behind `<ui-site-tabs>`:  the shown page's family as tabs (epic `notebook` P10).
 * It takes the same `pages` and `current` as `<ui-site-nav>`, and draws a segmented `<ui-toolbar>`:
 *
 *     <ui-toolbar exportparts="menu: tabs" appearance="segmented" align="fluid" equal aria-label="Button">
 *       <ui-item link="/button" selected data-page="/button">Usage</ui-item>
 *       <ui-item link="/button/examples" data-page="/button/examples">Examples</ui-item>
 *     </ui-toolbar>
 *
 * - A FAMILY is a parent page and the pages under it:  the parent's tab first, then one per page under it.
 *   - The shown page, when it has pages under it, is the parent;  else the page it's under is.
 *   - A parent with no `href` only holds pages, so it has no tab:  its pages are the tabs.
 *   - A page whose address has a parameter (`/films/:film`) has no tab, and with one shown, nothing draws.
 *   - Fewer than two tabs:  nothing draws, `:state(empty)`.
 * - A tab says its page's `tab`, else its `title`:  Button's first tab says "Usage" while the side navigation says
 *   "Button".
 * - Each tab is a real link:  a plain click sends `ui-navigating`, then the browser follows the link unless it's
 *   cancelled;  a middle click or Command-click opens a new tab, as any link does.
 * - Which tab is selected is `current`'s, never the click's:  the menu's own selecting is always cancelled.
 * - The row never wraps:  on a phone it scrolls sideways, and the selected tab is scrolled into sight (the row only,
 *   never the page).
 *   - It's `<ui-toolbar>`'s scrolling row, the section tabs' too:  a `‹` / `›` and a fade at each end with more that way
 *     (epic `notebook` I11).
 * - Plain data in, no fetching:  `pages` and `current`, set on it by hand.
 * - `appearance="header"`:  a switch for an app menu's middle, the editor's Run | Edit look (epic `mockup` T55):
 *   the row as wide as its tabs, on the bar's fill, never each an equal share.
 * - Without `pages`, it follows the site navigation it's inside (epic `mockup` T38):
 *   - the nearest box around it with a `<ui-site-nav>` of its own, across shadow roots
 *     (`SitePages.followNavAround()`, which `<ui-site-breadcrumbs>` follows it with too)
 *   - its `pages` and `current` are that navigation's, kept up as they change:  so a page of a Spell site writes
 *     a bare `<site-tabs/>`, and its tabs are the shown page's family
 *   - a tab's click is a link's, which the site follows itself, as any link to one of its pages
 *   - it reads the navigation's attributes, what a Spell site writes:  not its `pages` property set from a script
 ****************/
export class UISiteTabs extends E.UIComponent<typeof siteTabsVocabulary> {
  @E.proto static vocabulary = siteTabsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "site-tabs": siteTabsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The family
  ////////////////

  /** `pages`, else the site navigation's, the well-formed ones:  each with a `title`, its pages checked the same way. */
  @E.derived
  get sitePages(): readonly SiteTabsPage[] {
    return SitePages.wellFormed(this.isFollowing ? this.followed?.pages : this.pages)
  }

  /** Which page is shown:  `current`, else the site navigation's while following it, else the browser's address. */
  get currentKey(): string {
    const current = this.current ?? (this.isFollowing ? this.followed?.current : undefined)
    return current ?? (isServer ? "" : location.pathname)
  }

  ////////////////
  // ## Following the site navigation
  ////////////////

  /** The site navigation's `pages` and `current`, while it's inside one;  `undefined` outside any. */
  @E.state accessor followed: FollowedSiteNav | undefined = undefined

  /** It has no `pages` of its own, so it shows the site navigation's. */
  get isFollowing(): boolean {
    return this.pages === undefined
  }

  /**
   * While connected:  follow the site navigation around it (`SitePages.followNavAround()`).
   * - Nothing around it:  nothing to follow, and it draws only what it's given.
   */
  @E.whileConnected
  protected followSiteNav() {
    const stop = SitePages.followNavAround(this.domElement, (followed) => (this.followed = followed))
    return () => {
      stop?.()
      this.followed = undefined
    }
  }

  /** Is `page` the one shown? */
  isShown(page: SiteTabsPage): boolean {
    return SitePages.isShown(page, this.currentKey)
  }

  /** The shown page's family, its parent first;  empty when it has none, or a parameter in its address. */
  @E.derived
  get family(): readonly SiteTabsPage[] {
    const inPages = (
      pages: readonly SiteTabsPage[],
      parent: SiteTabsPage | undefined
    ): readonly SiteTabsPage[] | undefined => {
      for (const page of pages) {
        if (this.isShown(page)) {
          if (SitePages.hasParameter(page)) return []
          if (page.pages?.length) return [page, ...page.pages]
          return parent?.pages ? [parent, ...parent.pages] : []
        }
        const found = inPages(page.pages ?? [], page)
        if (found) return found
      }
      return undefined
    }
    return inPages(this.sitePages, undefined) ?? []
  }

  /** The tabs to draw:  the family's pages a link can go to, or none when that's fewer than two. */
  @E.derived
  get tabs(): readonly SiteTabsPage[] {
    const tabs = this.family.filter((page) => page.href && !SitePages.hasParameter(page))
    return tabs.length >= MINIMUM_TABS ? tabs : []
  }

  /** No tabs to draw:  `:state(empty)`, which takes no room. */
  @E.cssState("empty")
  get isEmpty(): boolean {
    return !this.tabs.length
  }

  ////////////////
  // ## Going to a page
  ////////////////

  /**
   * A tab was clicked:  the menu's own selecting is cancelled (`current` says what's selected), and a plain click asks
   * `ui-navigating`.
   * - Not cancelled, the browser follows the tab's link.
   */
  private onChoosing(event: CustomEvent<{ item: Element; originalEvent?: Event }>) {
    event.preventDefault()
    event.stopPropagation()
    const page = this.tabForItem(event.detail.item)
    const { originalEvent } = event.detail
    if (!page?.href || SitePages.isOpenElsewhere(originalEvent)) return
    if (!this.send("ui-navigating", { href: page.href, page, originalEvent })) originalEvent?.preventDefault()
  }

  /** The tab `item` draws. */
  private tabForItem(item: Element): SiteTabsPage | undefined {
    const key = item.getAttribute(DATA_KEY)
    return this.tabs.find((page) => SitePages.keyOf(page) === key)
  }

  ////////////////
  // ## The selected tab in sight
  ////////////////

  /** The menu, while drawn. */
  private menu: HTMLElement | undefined

  /** The key of the tab selected now:  what `onSelectedChanged()` follows. */
  get selectedKey(): string | undefined {
    const page = this.tabs.find((tab) => this.isShown(tab))
    return page && SitePages.keyOf(page)
  }

  /** A new tab is selected, or it has just drawn:  scroll it into sight once its row has been laid out. */
  @E.onChange("selectedKey", "isReady")
  protected onSelectedChanged(selectedKey: string | undefined, isReady: boolean) {
    if (selectedKey && isReady) void this.revealSelected()
  }

  /**
   * Scroll the row, and only the row, so the selected tab shows whole.
   * - Waits for the menu and its tabs to draw:  before, there's no box to measure.
   * - NEVER throws.
   */
  private async revealSelected() {
    if (!this.menu) return
    const drawn = [this.menu, ...this.menu.children] as E.DOMElement[]
    await Promise.all(drawn.map((element) => element.ready))
    E.beforeNextPaint(() => {
      const row = this.menu?.shadowRoot?.querySelector<HTMLElement>(MENU_BOX)
      const tab = this.menu?.querySelector(`[${DATA_CURRENT}]`)?.shadowRoot?.querySelector("a")
      if (!row || !tab) return
      const view = row.getBoundingClientRect()
      const box = tab.getBoundingClientRect()
      if (box.left < view.left) row.scrollBy({ left: box.left - view.left, behavior: "instant" })
      else if (box.right > view.right) row.scrollBy({ left: box.right - view.right, behavior: "instant" })
    })
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** `appearance="header"`:  a switch in an app menu's middle, as the editor's Run | Edit. */
  @E.cssState("header")
  get isHeader(): boolean {
    return this.appearance === HEADER
  }

  render(): JSX.Element {
    return (
      <Show when={this.tabs.length}>
        <ui-toolbar
          ref={[
            (element: HTMLElement) => (this.menu = element),
            (element: HTMLElement) =>
              element.addEventListener("ui-choosing", ((event: CustomEvent<{ item: Element }>) =>
                this.onChoosing(event)) as EventListener)
          ]}
          exportparts={`menu: ${this.partForName("tabs")}`}
          appearance={this.isHeader ? HEADER_LOOK : SEGMENTED}
          align={this.isHeader ? undefined : FLUID}
          equal={this.isHeader ? undefined : ""}
          aria-label={this.label ?? this.family[0]?.title}
        >
          <For each={this.tabs} keyed={SitePages.keyOf}>
            {(page) => this.tab(page)}
          </For>
        </ui-toolbar>
      </Show>
    )
  }

  /** One page's tab:  says its `tab`, else its `title`. */
  private tab(page: () => SiteTabsPage): JSX.Element {
    return (
      <ui-item
        data-page={SitePages.keyOf(page())}
        data-current={this.isShown(page()) ? "" : undefined}
        link={page().href}
        selected={this.isShown(page()) ? "" : undefined}
      >
        {page().tab ?? page().title}
      </ui-item>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UISiteTabs extends E.AttributeValues<typeof siteTabsVocabulary> {}

/** One page of a site, as `<ui-site-tabs pages>` takes it:  the same list `<ui-site-nav>` takes. */
export type SiteTabsPage = SitePage & {
  /** what its tab says, when not its `title`:  `Usage` */
  tab?: string
  /** the pages under it */
  pages?: readonly SiteTabsPage[]
}

/** A row of fewer tabs than this draws nothing:  a single tab goes nowhere. */
const MINIMUM_TABS = 2

/** The attribute a tab keeps its page's key in (`data-page`, as the tab writes it). */
const DATA_KEY = "data-page"

/** The attribute on the shown page's tab. */
const DATA_CURRENT = "data-current"

/** The menu's look:  a segmented row of tabs, each an equal share of it. */
const SEGMENTED = "segmented"
const FLUID = "fluid"

/** `appearance="header"`, and the toolbar's look for it:  the editor's Run | Edit switch's (its `<ModeButtons>`). */
const HEADER = "header"
const HEADER_LOOK = "segmented link header"

/** The menu's own box, in its shadow root:  the row that scrolls. */
const MENU_BOX = '[part~="menu"]'
