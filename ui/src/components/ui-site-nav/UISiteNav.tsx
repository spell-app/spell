import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
// Import directly:  in `core`'s util barrel it cost every page 1.9 kB (as `NavPreferences` says)
import { PrefStore } from "spell/util/persist/PrefStore"
import { siteNavVocabulary } from "./UISiteNav.en"

import siteNavCSS from "./UISiteNav.css?inline"

/****************
 * ### `DOMSiteNavElement`
 * The DOM element of `<ui-site-nav>`:  its script API, `revealCurrent()`.
 * Its component (`UISiteNav`) carries it out.
 ****************/
export class DOMSiteNavElement extends E.DOMElement<UISiteNav> {
  /** Scroll the page shown's row into sight, in whatever scrolls the nav (never the page itself). */
  revealCurrent() {
    this.component?.revealCurrent()
  }
}

/****************
 * ### `UISiteNav`
 * The component behind `<ui-site-nav>`:  a site's side navigation (epic `mockup` P3).
 * Its pages, from `pages`, are a `<ui-tree>`, nested as the site nests them;  the page shown is selected.
 *
 *     <nav part="nav" aria-label="Site">
 *       <ui-tree part="tree">
 *         <ui-tree-item label="Films" value="/films" selected>     (a page)
 *           <ui-tree-item label="Film" value="/films/1"/>          (a page under it)
 *         </ui-tree-item>
 *         <ui-tree-item label="Help" group>...</ui-tree-item>      (no `href`:  it only holds pages)
 *       </ui-tree>
 *     </nav>
 *
 * - Picking a page (a click, Enter or Space on its row) goes there:  `ui-navigating`, cancelable, then the browser's
 *   address.
 *   A site that shows its pages without loading another (a Spell site in Run) cancels it and shows the page itself.
 *   - The tree's own selecting is always cancelled:  what's selected is `current`, which the page sets.
 * - Which pages are open:  the ones the person opened, and every page the shown one is under.
 *   - With `remember`, kept for each person across visits (`PrefStore`, `ui-site-nav:<remember>`);
 *     without it, for as long as the page is open.
 * - The tree's keys walk it:  up and down, right opens, left closes (`<ui-tree>`'s).
 * - Plain data in, no fetching:  whatever draws the site hands it its pages, a Spell site's from its site file
 *   (`static pages`), a docs site's from its own data.
 * - Its rows are `<ui-tree-item>`s in its shadow DOM, so the tree's look and keys are the same as anywhere.
 *   - `appearance="nav"`:  the docs site's look (the tree's `appearance="nav"`), and a page's `band`, `count` and
 *     `badge` with it (epic `mockup` P5:  `<ui-docs-nav>` draws its list with it).
 * - A page with an `href` is a real link (its title an `<a>`):  a middle click or Command-click opens it in a new tab,
 *   as a link does;  a plain click is the tree's pick.
 * - A page with `starred` gets a star at its row's end:  a click sends `ui-starred`, and selects nothing.
 * - A page's `open`, when it says one, wins:  the page that hands the nav its pages decides (a search opens what
 *   matches);  the nav's `ui-opening` / `ui-closing` tell it what the person did.
 ****************/
export class UISiteNav extends E.UIComponent<typeof siteNavVocabulary> {
  @E.proto static vocabulary = siteNavVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { "site-nav": siteNavCSS },
    DOMElement: DOMSiteNavElement,
    delegatesFocus: false
  }

  ////////////////
  // ## Pages
  ////////////////

  /** `pages`, the well-formed ones:  each with a `title`, and its pages checked the same way. */
  @E.derived
  get sitePages(): readonly SiteNavPage[] {
    return UISiteNav.wellFormed(this.pages)
  }

  /** Which page is shown, as `current` says it, else the browser's address. */
  get currentKey(): string {
    return this.current ?? (isServer ? "" : location.pathname)
  }

  /** Is `page` the one shown:  its `id`, its `href`, or its `href`'s path is `currentKey`? */
  isCurrent(page: SiteNavPage): boolean {
    const key = this.currentKey
    if (!key) return false
    if (page.id === key || page.href === key) return true
    return !!page.href && !isServer && UISiteNav.pathOf(page.href) === UISiteNav.pathOf(key)
  }

  /** The keys of every page the shown one is under:  they start open. */
  @E.derived
  get currentPath(): ReadonlySet<string> {
    const path = new Set<string>()
    const walk = (pages: readonly SiteNavPage[], above: readonly string[]): boolean =>
      pages.some((page) => {
        if (!this.isCurrent(page)) return walk(page.pages ?? [], [...above, UISiteNav.keyOf(page)])
        for (const key of above) path.add(key)
        return true
      })
    walk(this.sitePages, [])
    return path
  }

  ////////////////
  // ## Open pages
  ////////////////

  /** Pages the person opened (`true`) or closed (`false`), by key:  over `currentPath`'s. */
  @E.state accessor openedByPerson: ReadonlyMap<string, boolean> = new Map()

  /** Is `page` open:  as its `open` says, else as the person left it, else open when the shown page is under it. */
  isOpen(page: SiteNavPage): boolean {
    if (page.open !== undefined) return page.open
    const key = UISiteNav.keyOf(page)
    return this.openedByPerson.get(key) ?? this.currentPath.has(key)
  }

  /** It connected:  the pages this person left open, when it `remember`s. */
  onConnect() {
    super.onConnect()
    const key = this.preferenceKey
    if (!key) return
    const kept = PrefStore.getAt(key)
    if (kept && typeof kept === "object" && !Array.isArray(kept)) {
      const entries = Object.entries(kept).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
      this.openedByPerson = new Map(entries)
    }
  }

  /** Where it keeps the open pages:  `ui-site-nav:<remember>`, or nowhere. */
  private get preferenceKey(): string | undefined {
    return this.remember ? `${PREF_STORE}:${this.remember}` : undefined
  }

  /**
   * A row is opening or closing:  the nav's own `ui-opening` / `ui-closing` say which page (the row's are kept in), and
   * cancelling it keeps the row as it was;  else remembered, and kept so.
   */
  private onOpening(event: CustomEvent<{ open: boolean; originalEvent?: Event }>, isOpening: boolean) {
    event.stopPropagation()
    const key = (event.target as HTMLElement).getAttribute(DATA_KEY)
    const page = this.pageForKey(key)
    if (key === null || !page) return
    const detail = { page, open: isOpening, originalEvent: event.detail.originalEvent }
    if (!this.send(isOpening ? "ui-opening" : "ui-closing", detail)) {
      event.preventDefault()
      return
    }
    const next = new Map(this.openedByPerson).set(key, isOpening)
    this.openedByPerson = next
    const preferenceKey = this.preferenceKey
    if (preferenceKey) PrefStore.setAt(preferenceKey, Object.fromEntries(next))
  }

  ////////////////
  // ## Going to a page
  ////////////////

  /**
   * A row was picked:  the tree's own selecting is cancelled (`current` says what's selected), and a page with an
   * `href` is gone to, unless `ui-navigating` is cancelled.
   */
  private onSelecting(event: CustomEvent<{ item: HTMLElement; originalEvent?: Event }>) {
    event.preventDefault()
    const page = this.pageForKey(event.detail.item.getAttribute(DATA_KEY))
    if (!page?.href) return
    const { originalEvent } = event.detail
    // a middle or modified click on its link:  the browser opens it, as with any link
    if (UISiteNav.isOpenElsewhere(originalEvent)) return
    originalEvent?.preventDefault()
    const href = page.href
    if (!this.send("ui-navigating", { href, page, originalEvent })) return
    location.assign(href)
  }

  /** `event` is a click the browser opens elsewhere:  a middle click, or one with Command, Control, Shift or Alt. */
  private static isOpenElsewhere(event: Event | undefined): boolean {
    if (!(event instanceof MouseEvent)) return false
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  }

  /** A page's star was clicked:  `ui-starred`, saying what the person asked for;  nothing is selected. */
  private onStar(page: SiteNavPage, event: MouseEvent) {
    event.stopPropagation()
    this.send("ui-starred", { page, starred: !page.starred, originalEvent: event })
  }

  /** The page shown's row, while drawn. */
  get currentItem(): HTMLElement | undefined {
    return this.box?.querySelector<HTMLElement>(`[${DATA_CURRENT}]`) ?? undefined
  }

  /** Scroll the page shown's row into sight.  Script API. */
  revealCurrent() {
    const item = this.currentItem
    if (item) E.scrollIntoSight(item)
  }

  /** The navigation box, while drawn. */
  private box: HTMLElement | undefined

  /** The page whose key is `key`, anywhere in the tree. */
  private pageForKey(key: string | null): SiteNavPage | undefined {
    if (key === null) return undefined
    const find = (pages: readonly SiteNavPage[]): SiteNavPage | undefined => {
      for (const page of pages) {
        if (UISiteNav.keyOf(page) === key) return page
        const found = find(page.pages ?? [])
        if (found) return found
      }
      return undefined
    }
    return find(this.sitePages)
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <nav
        part={this.partForName("nav")}
        aria-label={this.label ?? this.translationForKey("label")}
        ref={(element: HTMLElement) => (this.box = element)}
      >
        <ui-tree
          part={this.partForName("tree")}
          appearance={this.appearance}
          label={this.label ?? this.translationForKey("label")}
          on-ui-selecting={(event: CustomEvent<{ item: HTMLElement }>) => this.onSelecting(event)}
          on-ui-opening={(event: CustomEvent<{ open: boolean }>) => this.onOpening(event, true)}
          on-ui-closing={(event: CustomEvent<{ open: boolean }>) => this.onOpening(event, false)}
        >
          <For each={this.sitePages}>{(page) => this.row(page)}</For>
        </ui-tree>
      </nav>
    )
  }

  /** One page's row, and its pages' rows inside it. */
  private row(page: SiteNavPage): JSX.Element {
    const key = UISiteNav.keyOf(page)
    const isCurrent = () => this.isCurrent(page)
    return (
      <ui-tree-item
        data-page={key}
        data-current={isCurrent() ? "" : undefined}
        label={page.title}
        value={page.href ?? key}
        icon={page.icon}
        band={page.band}
        count={page.count === undefined ? undefined : String(page.count)}
        badge={page.badge}
        group={page.href ? undefined : ""}
        selected={isCurrent() ? "" : undefined}
        open={page.pages?.length && this.isOpen(page) ? "" : undefined}
        aria-current={isCurrent() ? "page" : undefined}
      >
        <Show when={page.href}>
          {(href) => (
            <a slot="label" class="link" href={href()} tabindex="-1">
              {page.title}
            </a>
          )}
        </Show>
        <Show when={page.starred !== undefined}>{this.star(page)}</Show>
        <Show when={page.pages?.length}>
          <For each={page.pages}>{(below) => this.row(below)}</For>
        </Show>
      </ui-tree-item>
    )
  }

  /** A page's star, at its row's end:  a toggle, pressed while it's starred. */
  private star(page: SiteNavPage): JSX.Element {
    const label = this.translationForKey(page.starred ? "unstar" : "star", { title: page.title })
    return (
      <ui-button
        slot="actions"
        class="star"
        data-star={UISiteNav.keyOf(page)}
        toggle=""
        selected={page.starred ? "" : undefined}
        icon={page.starred ? STAR : STAR_OUTLINE}
        size="mini"
        appearance="tertiary"
        aria-label={label}
        title={label}
        onClick={(event: MouseEvent) => this.onStar(page, event)}
      />
    )
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** What `page` is known by, to open, find and remember it:  its `id`, else its `href`, else its `title`. */
  static keyOf(page: SiteNavPage): string {
    return page.id ?? page.href ?? page.title
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

  /** The pages in `value` that are pages:  objects with a text `title`;  anything else is left out. */
  private static wellFormed(value: unknown): readonly SiteNavPage[] {
    if (!Array.isArray(value)) return []
    return value.flatMap((each): SiteNavPage[] => {
      if (!each || typeof each !== "object" || typeof (each as SiteNavPage).title !== "string") return []
      const page = each as SiteNavPage
      return [page.pages ? { ...page, pages: UISiteNav.wellFormed(page.pages) } : page]
    })
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UISiteNav extends E.AttributeValues<typeof siteNavVocabulary> {}

/** One page of a site, as `<ui-site-nav pages>` takes it. */
export type SiteNavPage = {
  /** what the navigation calls it:  `Films` */
  title: string
  /** where it is:  `/films`;  none, a page that only holds pages */
  href?: string
  /** what `current` may call it, when its `href` isn't enough:  `film-page` */
  id?: string
  /** an icon before its title */
  icon?: string
  /** the pages under it */
  pages?: readonly SiteNavPage[]
  /** a heading band over its pages (`heading`), or a lighter one inside one (`subheading`):  with `appearance="nav"` */
  band?: "heading" | "subheading"
  /** a number in a small round label after its title:  how many pages it holds */
  count?: number | string
  /** a word in a small label after its title:  `Planned` */
  badge?: string
  /** a star at its row's end, pressed while `true`;  none without it */
  starred?: boolean
  /** open or closed, whatever the person did:  the page handing in the pages decides */
  open?: boolean
}

/** The store `remember` keeps the open pages in:  `ui-site-nav:<remember>`. */
const PREF_STORE = "ui-site-nav"

/** The attribute a row keeps its page's key in (`data-page`, as the row writes it). */
const DATA_KEY = "data-page"

/** The attribute on the page shown's row. */
const DATA_CURRENT = "data-current"

/** A star's icons:  starred, and not. */
const STAR = "star"
const STAR_OUTLINE = "star outline"
