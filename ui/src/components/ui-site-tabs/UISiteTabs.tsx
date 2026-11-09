import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { SitePages, type SitePage } from "spell/ui/components/ui-site-nav/SitePages"
import { siteTabsVocabulary } from "./UISiteTabs.en"

import siteTabsCSS from "./UISiteTabs.css?inline"

/****************
 * ### `<ui-site-tabs>`
 * The component behind `<ui-site-tabs>`:  the shown page's family as tabs (epic `notebook` P10).
 * It takes the same `pages` and `current` as `<ui-site-nav>`, and draws a segmented `<ui-menu>`:
 *
 *     <ui-menu exportparts="menu: tabs" appearance="segmented" align="fluid" equal aria-label="Button">
 *       <ui-item link="/button" selected data-page="/button">Usage</ui-item>
 *       <ui-item link="/button/examples" data-page="/button/examples">Examples</ui-item>
 *     </ui-menu>
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
 * - Plain data in, no fetching:  a Spell site's pages come from its site file, whoever draws it hands them in.
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

  /** `pages`, the well-formed ones:  each with a `title`, and its pages checked the same way. */
  @E.derived
  get sitePages(): readonly SiteTabsPage[] {
    return SitePages.wellFormed(this.pages)
  }

  /** Which page is shown, as `current` says it, else the browser's address. */
  get currentKey(): string {
    return this.current ?? (isServer ? "" : location.pathname)
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
          if (UISiteTabs.hasParameter(page)) return []
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
    const tabs = this.family.filter((page) => page.href && !UISiteTabs.hasParameter(page))
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

  render(): JSX.Element {
    return (
      <Show when={this.tabs.length}>
        <ui-menu
          ref={(element: HTMLElement) => (this.menu = element)}
          exportparts={`menu: ${this.partForName("tabs")}`}
          appearance={SEGMENTED}
          align={FLUID}
          equal=""
          aria-label={this.label ?? this.family[0]?.title}
          on-ui-choosing={(event: CustomEvent<{ item: Element }>) => this.onChoosing(event)}
        >
          <For each={this.tabs} keyed={SitePages.keyOf}>
            {(page) => this.tab(page)}
          </For>
        </ui-menu>
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

  ////////////////
  // ## Helpers
  ////////////////

  /** `page`'s address has a parameter in it (`/films/:film`), so a tab can't go there. */
  private static hasParameter(page: SiteTabsPage): boolean {
    return !!page.href && PARAMETER.test(page.href)
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

/** The menu's own box, in its shadow root:  the row that scrolls. */
const MENU_BOX = '[part~="menu"]'

/** A parameter in an address (`/films/:film`), in the kit's ONE address grammar (`spell/util/addressPattern`). */
const PARAMETER = /\/:|\*/
