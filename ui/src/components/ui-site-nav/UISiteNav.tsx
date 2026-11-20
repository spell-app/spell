import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, type UIT } from "spell/ui/core"
// Import directly:  in `core`'s util barrel it cost every page 1.9 kB (as `NavPreferences` says)
import { PrefStore } from "spell/util/persist/PrefStore"
import { SitePages } from "./SitePages"
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
 * - A page's rows are kept by its key across new `pages`, so a row keeps its focus, and its rows ease open and shut.
 * - A page with `slot` shows what the page puts in `<ui-site-nav>`'s slot of that name inside it, after its pages,
 *   and can open though it has none yet (a "Loading..." under a band).
 * - A page with `copyOf` is a second copy of another (a favourite):  marked as shown whenever that page is;
 *   `revealCurrent()` still goes to the original.
 * - A page with `band="group"` is a quiet label over its pages, with no arrow (epic `mockup` T34):  a Spell site's
 *   groups.
 *   - It opens by itself while the page shown is under it, and stays open:  more than one can be open at once.
 *   - A click (or Enter) on it opens it and goes to its first page;  on one that's open, and doesn't hold the page shown,
 *     it closes it.
 * - A page with no `icon`, beside pages with one, keeps an icon's room, so its title lines up with theirs.
 * - A group's `icon` shows before its label, and its pages are a step in from it (epic `mockup` I20).
 * - Beside a bar (`--ui-site-nav-bar-height`, which `<ui-page-layout>` sets to its menu's height):  its first row's
 *   middle on the bar's, so the first page's icon lines up with the drawer's button (epic `mockup` I35).
 * - `groups="headings"`:  a group is a small heading over its pages, no well, always open, a click on it doing nothing;
 *   its pages in line with the rest, and a page's own pages beside a guide line (a console's
 *   sidebar).  Its `icon` isn't drawn:  a heading has none, and collapsed it's a thin line.
 * - Its `start` slot shows above its pages (a logo, a picker), its `end` slot at its foot, pushed to the bottom of the
 *   box it fills (a row of buttons):  each drawn only while something's in it.
 * - `collapsed`:  only the icons, each row's title its tooltip (`:state(collapsed)`), all in one column, no step in;
 *   a page with no icon shows its title's first letter, as `<ui-menu>`'s icons-only look does,
 *   and a group with no icon is a thin line.
 *   - `groups="headings"`:  a heading is a gap, no line (a console's icon rail).
 *   - Its `collapsed-start` and `collapsed-end` slots, when they have content, show in place of `start` and `end`
 *     (I41):  the rail's own head and foot, a logo square, buttons stacked, so the rail is as narrow as its icons.
 ****************/
export class UISiteNav extends E.UIComponent<typeof siteNavVocabulary> {
  @E.proto static vocabulary = siteNavVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { "site-nav": siteNavCSS },
    DOMElement: DOMSiteNavElement,
    delegatesFocus: false,
    cssStates: ["collapsed"]
  }

  ////////////////
  // ## Pages
  ////////////////

  /** `pages`, the well-formed ones:  each with a `title`, and its pages checked the same way. */
  @E.derived
  get sitePages(): readonly SiteNavPage[] {
    return SitePages.wellFormed(this.pages)
  }

  /** Which page is shown, as `current` says it, else the browser's address. */
  get currentKey(): string {
    return this.current ?? (isServer ? "" : location.pathname)
  }

  /** Is `page` the one shown:  its `id`, its `href`, or its `href`'s path is `currentKey`? */
  isCurrent(page: SiteNavPage): boolean {
    return SitePages.isShown(page, this.currentKey)
  }

  /** Is `page` marked as the one shown:  it is, or it's a copy (`copyOf`) of the one that is? */
  isMarked(page: SiteNavPage): boolean {
    return this.isCurrent(page) || (!!page.copyOf && page.copyOf === this.currentKey)
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

  /** `groups="headings"`:  its groups are headings, always open (`isOpen()`), a click on one doing nothing. */
  @E.cssState("headings")
  get groupsAreHeadings(): boolean {
    return this.groups === HEADINGS
  }

  /** Which of its slots have content:  `start` and `end` are drawn only while they do. */
  readonly slots = new E.SlotContent(this.domElement)

  /** Pages the person opened (`true`) or closed (`false`), by key:  over `currentPath`'s. */
  @E.state accessor openedByPerson: ReadonlyMap<string, boolean> = new Map()

  /**
   * Is `page` open:  as its `open` says, else as the person left it, else open when the shown page is under it.
   * - A group (`band="group"`) is always open while the shown page is under it:  it opens by itself.
   */
  isOpen(page: SiteNavPage): boolean {
    if (page.open !== undefined) return page.open
    if (page.band === GROUP && this.groupsAreHeadings) return true
    const key = UISiteNav.keyOf(page)
    if (page.band === GROUP && this.currentPath.has(key)) return true
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
    // a heading stays open, and goes nowhere
    if (page.band === GROUP && this.groupsAreHeadings) {
      event.preventDefault()
      return
    }
    const { originalEvent } = event.detail
    // a group holding the page shown stays open:  a click on it goes to its first page instead
    if (page.band === GROUP && !isOpening && this.currentPath.has(key)) {
      event.preventDefault()
      if (UISiteNav.isPick(originalEvent)) this.goToFirstPage(page, originalEvent)
      return
    }
    const detail = { page, open: isOpening, originalEvent }
    if (!this.send(isOpening ? "ui-opening" : "ui-closing", detail)) {
      event.preventDefault()
      return
    }
    const next = new Map(this.openedByPerson).set(key, isOpening)
    this.openedByPerson = next
    const preferenceKey = this.preferenceKey
    if (preferenceKey) PrefStore.setAt(preferenceKey, Object.fromEntries(next))
    if (page.band === GROUP && isOpening && UISiteNav.isPick(originalEvent)) this.goToFirstPage(page, originalEvent)
  }

  /**
   * Was `originalEvent` a pick:  a click, Enter or Space, not the tree's arrow keys walking it?
   * - A group opened by the arrow keys only opens:  the keys walk the tree without leaving the page.
   */
  private static isPick(originalEvent: Event | undefined): boolean {
    return !(originalEvent instanceof KeyboardEvent && originalEvent.key.startsWith("Arrow"))
  }

  ////////////////
  // ## Going to a page
  ////////////////

  /**
   * A row was picked:  the tree's own selecting is cancelled (`current` says what's selected), and a page with an
   * `href` is gone to, unless `ui-navigating` is cancelled.
   */
  private onSelecting(event: CustomEvent<{ item: HTMLElement | UIT.TreeItemData; originalEvent?: Event }>) {
    event.preventDefault()
    // its rows are `<ui-tree-item>`s, never `items` data:  so always an element
    const item = event.detail.item as HTMLElement
    const page = this.pageForKey(item.getAttribute(DATA_KEY))
    if (!page?.href) return
    const { originalEvent } = event.detail
    // a middle or modified click on its link:  the browser opens it, as with any link
    if (SitePages.isOpenElsewhere(originalEvent)) return
    originalEvent?.preventDefault()
    this.goTo(page as SiteNavPage & { href: string }, originalEvent)
  }

  /** Go to `page`:  `ui-navigating`, then the browser's address, unless it's cancelled. */
  private goTo(page: SiteNavPage & { href: string }, originalEvent: Event | undefined) {
    const { href } = page
    if (!this.send("ui-navigating", { href, page, originalEvent })) return
    location.assign(href)
  }

  /** Go to the first page under `group` that has an `href`, at any depth;  none, nothing. */
  private goToFirstPage(group: SiteNavPage, originalEvent: Event | undefined) {
    const first = SitePages.allOf(group.pages ?? []).find((page): page is SiteNavPage & { href: string } => !!page.href)
    if (first) this.goTo(first, originalEvent)
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
      <>
        {this.drawSlotBox(START)}
        {this.drawNav()}
        {this.drawSlotBox(END)}
      </>
    )
  }

  /**
   * The box round slot `name`, `start` or `end`, drawn only while something's in it.
   * - `collapsed`, its `collapsed-` slot instead while that has content (the icon rail's own head and foot).
   */
  private drawSlotBox(name: typeof START | typeof END): JSX.Element {
    const shown = () => {
      const collapsedSlot = this.slotForName(name === START ? COLLAPSED_START : COLLAPSED_END)
      return this.collapsed && this.slots.hasContent(collapsedSlot) ? collapsedSlot : this.slotForName(name)
    }
    return (
      <Show when={this.slots.hasContent(shown())}>
        <div class={name} part={this.partForName(name)}>
          <slot name={shown()} />
        </div>
      </Show>
    )
  }

  /** The navigation landmark, round the tree of pages. */
  private drawNav(): JSX.Element {
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
          on-ui-selecting={(event: CustomEvent<{ item: HTMLElement | UIT.TreeItemData }>) => this.onSelecting(event)}
          on-ui-opening={(event: CustomEvent<{ open: boolean }>) => this.onOpening(event, true)}
          on-ui-closing={(event: CustomEvent<{ open: boolean }>) => this.onOpening(event, false)}
        >
          <For each={this.sitePages} keyed={UISiteNav.keyOf}>
            {(page) => this.row(page, () => this.sitePages)}
          </For>
        </ui-tree>
      </nav>
    )
  }

  /** One page's row, and its pages' rows inside it;  `siblings`, the pages beside it, itself among them. */
  private row(page: () => SiteNavPage, siblings: () => readonly SiteNavPage[]): JSX.Element {
    const isMarked = () => this.isMarked(page())
    /**
     * It has no icon, but a page beside it has:  an icon's room, or (`collapsed`) its first letter, stands in.
     * - A group with no icon keeps the room beside groups with one, so the labels line up;
     *   `collapsed`, it's a thin line instead (epic `mockup` I20).
     */
    /** Its icon:  none for a heading (`groups="headings"`). */
    const icon = () => (page().band === GROUP && this.groupsAreHeadings ? undefined : page().icon)
    const showsLetter = () => {
      const { band } = page()
      if (icon()) return false
      const besideIcons = siblings().some((each) => !!each.icon)
      if (band === GROUP) return !this.collapsed && besideIcons && !this.groupsAreHeadings
      return !band && (this.collapsed || besideIcons)
    }
    return (
      <ui-tree-item
        data-page={UISiteNav.keyOf(page())}
        data-current={this.isCurrent(page()) ? "" : undefined}
        label={page().title}
        value={page().href ?? UISiteNav.keyOf(page())}
        icon={icon()}
        band={page().band}
        count={page().count === undefined ? undefined : String(page().count)}
        badge={page().badge}
        group={page().href ? undefined : ""}
        expandable={page().slot ? "" : undefined}
        selected={isMarked() ? "" : undefined}
        open={(page().pages?.length || page().slot) && this.isOpen(page()) ? "" : undefined}
        aria-current={isMarked() ? "page" : undefined}
        title={this.collapsed ? page().title : undefined}
      >
        <Show when={showsLetter()}>
          <span slot="icon" class="letter" aria-hidden="true">
            {LETTER_OR_DIGIT.exec(page().title)?.[0].toLocaleUpperCase()}
          </span>
        </Show>
        <Show when={page().href}>
          {(href) => (
            <a slot="label" class="link" href={href()} tabindex="-1">
              {page().title}
            </a>
          )}
        </Show>
        <Show when={page().starred !== undefined}>{this.star(page)}</Show>
        <Show when={page().pages?.length}>
          <For each={page().pages} keyed={UISiteNav.keyOf}>
            {(below) => this.row(below, () => page().pages ?? [])}
          </For>
        </Show>
        <Show when={page().slot}>{(name) => <slot name={name()} />}</Show>
      </ui-tree-item>
    )
  }

  /** A page's star, at its row's end:  a toggle, pressed while it's starred. */
  private star(page: () => SiteNavPage): JSX.Element {
    const label = () => this.translationForKey(page().starred ? "unstar" : "star", { title: page().title })
    return (
      <ui-button
        slot="actions"
        class="star"
        data-star={UISiteNav.keyOf(page())}
        toggle=""
        selected={page().starred ? "" : undefined}
        icon={page().starred ? STAR : STAR_OUTLINE}
        size="mini"
        appearance="tertiary"
        aria-label={label()}
        title={label()}
        onClick={(event: MouseEvent) => this.onStar(page(), event)}
      />
    )
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** What `page` is known by, to open, find and remember it (`SitePages.keyOf()`). */
  static keyOf(page: SiteNavPage): string {
    return SitePages.keyOf(page)
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
  /**
   * a band over its pages, with `appearance="nav"`:
   * - `heading`:  a tinted heading band, with an arrow
   * - `subheading`:  a lighter one inside one
   * - `group`:  a group's quiet label, no arrow, open while the page shown is under it;  a click goes to its first page
   */
  band?: "heading" | "subheading" | "group"
  /** a number in a small round label after its title:  how many pages it holds */
  count?: number | string
  /** a word in a small label after its title:  `Planned` */
  badge?: string
  /** a star at its row's end, pressed while `true`;  none without it */
  starred?: boolean
  /** open or closed, whatever the person did:  the page handing in the pages decides */
  open?: boolean
  /** the slot of `<ui-site-nav>` whose content shows inside it, after its pages:  a note under a band */
  slot?: string
  /** the `id` of the page this is a second copy of:  marked as shown whenever that page is */
  copyOf?: string
}

/** The store `remember` keeps the open pages in:  `ui-site-nav:<remember>`. */
const PREF_STORE = "ui-site-nav"

/** The attribute a row keeps its page's key in (`data-page`, as the row writes it). */
const DATA_KEY = "data-page"

/** The attribute on the page shown's row. */
const DATA_CURRENT = "data-current"

/** The `band` of a group's quiet label over its pages:  a Spell site's `group`. */
const GROUP = "group"

/** What stands for a page with no icon, while `collapsed`:  its title's first letter or digit (`<ui-item>`'s too). */
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/** `groups="headings"`:  its groups drawn as headings. */
const HEADINGS = "headings"

/** Its slots, and the boxes round them:  above its pages, and at its foot. */
const START = "start"
const END = "end"

/** The slots shown in their place while `collapsed`, when they have content. */
const COLLAPSED_START = "collapsed-start"
const COLLAPSED_END = "collapsed-end"

/** A star's icons:  starred, and not. */
const STAR = "star"
const STAR_OUTLINE = "star outline"
