import { For, Match, Show, Switch } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import type { SiteNavPage } from "spell/ui/components/ui-site-nav"
import { SiteData } from "spell/ui/docs-components/SiteData"
import { SiteDataLoad } from "spell/ui/docs-components/SiteDataLoad"
import type { DOMDocsSearchElement } from "spell/ui/docs-components/ui-docs-search/UIDocsSearch"
import { docsNavVocabulary } from "./UIDocsNav.en"
import { NavIndex } from "./NavIndex"
import { NavPreferences } from "./NavPreferences"
import {
  DATA,
  DEFAULT_VIEW,
  FOUNDATION_PAGES,
  ICONS,
  INDEX_PAGE,
  NavGroups,
  NavViews,
  TOP_PAGES,
  type DocsNavText,
  type DocsNavVocabulary,
  type NavGroup,
  type NavPage,
  type NavRow,
  type NavView
} from "./UIDocsNav.types"

import navCSS from "./UIDocsNav.css?inline"

/****************
 * ### `DOMDocsNavElement`
 * The DOM element of `<ui-docs-nav>`:
 * it adds the script API (`focusSearch()`, `revealCurrent()`, `favorites`, `listed`),
 * for the page template that puts the nav in a `<ui-sidebar>` / `<ui-flyout>`.
 * Its component (`UIDocsNav`) carries it out.
 * - None of these members is named like an attribute:  `DOMElement` refuses a member that is.
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMDocsNavElement extends E.DOMElement<UIDocsNav> {
  /**
   * Focus the search field (`<ui-docs-search>`'s `summon()`:  what `/` and Cmd / Ctrl+K do),
   * opening the drawer the nav is in first, if it's closed.
   */
  focusSearch() {
    this.component?.focusSearch()
  }

  /**
   * Scroll the current page's item into view, inside the nav's scroll container (never the page).
   * - A flyout calls it once open:  a hidden nav can't measure.
   */
  revealCurrent() {
    this.component?.revealCurrent()
  }

  /** The starred tags, A-Z;  `[]` before the component exists. */
  get favorites(): string[] {
    return this.component?.favoriteTags ?? []
  }

  /** Resolves once the component list has loaded and rendered;  also on a load error, which it then shows. */
  get listed(): Promise<void> {
    return this.component?.listed ?? this.ready.then(() => this.component?.listed)
  }
}

/****************
 * ### `UIDocsNav`
 * The component behind `<ui-docs-nav>`:  the docs site's left sidebar.
 * A docked PANEL in the Spell brand's look (the design system's "Color Set Chooser" panel, its `.sp-nav` rows),
 * with OUR organization (the Astro site's component browser).
 *
 * - Its shadow DOM:  `<div class="ui [size] nav" part="nav">` (the panel) holding
 *   - `<div class="masthead" part="header">`:  the `header` slot (a logo),
 *     then the site search `<ui-docs-search>` beside the A-Z / Topics `<ui-buttons>`,
 *     and a visually hidden live status
 *   - `<nav part="menu">` (the landmark, the panel's scroll box) of GROUPS,
 *     each a heading band (`<h2><button aria-expanded>`) over a fold:
 *     - Get started (the intro pages)
 *     - Favourites
 *     - Components (A-Z rows, or a lighter `<h3>` band per TOPIC, each folding its rows)
 *     - Foundation
 *     - then the `footer` slot
 * - A row is `<li>`:  a native link `<a>` (an icon, or a status badge),
 *   plus, for a component, its star (a `toggle` `<ui-button>`).
 *   The links are native:  ~100 rows needn't be ~100 more widgets.
 * - Folding:  every group stays rendered (its fold goes `inert` when shut).
 *   - A topic renders its rows only while open, and while its fold eases shut
 *     (`closingTopics`, ended by the fold's `transitionend`).
 *   - The motion is the sheet's, only under `prefers-reduced-motion: no-preference`;
 *     a topic opened after `:state(settled)` eases open too.
 * - Data:  `SiteData` (`components.json5`), fetched once;  `NavIndex` makes the rows and topics.
 *   - Docs-only tags are never listed.
 *   - Links are `base` + the data's `href`.
 * - Search:  the field is `<ui-docs-search>`, the SITE's search
 *   (its results card jumps anywhere:  sections, components, attributes, pages).
 *   Its text also FILTERS this list (its `ui-input`, every keystroke):
 *   - it hides what doesn't match
 *   - Favourites, Components and every topic with a match open (a band closes one for this query)
 *   - clearing it restores the viewer's folds
 *   - the Components band's count shows the matches, and a polite live region says them
 *   - the card covers the list while it shows:  Enter jumps through the card, never the list.
 * - Remembered per viewer (`NavPreferences`, wrapped `localStorage`):
 *   favourites, the view, the open topics, the folded groups.
 *   - On load, Topics opens the current page's first topic if no open topic holds it (not remembered).
 * - The current page (`current`, by default the page's file name) is `aria-current="page"`,
 *   and scrolled into view inside the panel once the list has rendered (`revealCurrent()`).
 * - Events:
 *   - `ui-navigating`:  a plain click on a link, cancelable (the search field fires its own)
 *   - `ui-changed` (`{ view }`)
 *   - `ui-starred`
 * - `/` and Cmd / Ctrl+K focus the search field:  `<ui-docs-search>`'s shortcuts.
 * - A doc-only element (`src/docs-components/`):  its shadow DOM is built of other families' widgets,
 *   which its barrel imports.
 ****************/
export class UIDocsNav extends E.UIComponent<DocsNavVocabulary> {
  @E.proto static vocabulary = docsNavVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "docs-nav": navCSS },
    DOMElement: DOMDocsNavElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    this.listed = new Promise((resolve) => (this.resolveListed = resolve))
  }

  ////////////////
  // ## The list
  ////////////////

  /** The site's data, loading as the nav is made:  `value` once it's in, `error` if it didn't come. */
  readonly data = new SiteDataLoad()

  /** The list, once the data has loaded:  built once from it. */
  @E.derived
  get navIndex(): NavIndex | undefined {
    const data = this.data.value
    return data && new NavIndex(data)
  }

  /** Why the data didn't load, if it didn't:  its message. */
  get loadError(): string | undefined {
    return this.data.error?.message
  }

  /** The data has loaded, or failed to:  the list (or its error) renders.  `:state(listed)`. */
  @E.cssState("listed")
  get isListed(): boolean {
    return !!(this.navIndex || this.loadError)
  }

  /**
   * The list's widgets are ready and the current page revealed:  from now on a topic eases open;  `:state(settled)`.
   */
  @E.cssState("settled")
  @E.state
  accessor isSettled = false

  /** Resolves once the list (or its error) has rendered;  see `DOMDocsNavElement.listed`. */
  readonly listed: Promise<void>

  /** Resolves `listed`. */
  private resolveListed!: () => void

  /** SIDE EFFECT:  once the list (or the error) has rendered, scroll to the current page and resolve `listed`. */
  @E.onChange("isListed")
  protected onListedChanged(isListed: boolean) {
    if (isListed) E.afterSolidUpdate(() => void this.onListRendered())
  }

  /** The list (or its error) has rendered:  wait for its widgets, reveal the current page, resolve `listed`. */
  private async onListRendered() {
    const widgets = [...(this.box?.querySelectorAll("*") ?? [])].filter(
      (element): element is E.DOMElement => READY in element
    )
    await Promise.all(widgets.map((widget) => widget.ready))
    this.revealCurrent()
    this.resolveListed()
    this.isSettled = true
  }

  ////////////////
  // ## The current page
  ////////////////

  /** The page shown:  `current`, else the page's file name. */
  get currentPage(): string {
    return this.current || (isServer ? INDEX_PAGE : NavIndex.page())
  }

  /** Prefix of every link:  `base`, else the site root from `SiteData`. */
  get linkBase(): string {
    return this.base ?? (isServer ? "" : SiteData.root())
  }

  /**
   * The page the list marks:  the current page, unless it's a sub-tag shown on its family's page (it has no page of
   * its own, so its row isn't the page shown).
   */
  get markedPage(): string {
    const page = this.currentPage
    const row = this.navIndex?.row(page)
    return row && !row.page ? "" : page
  }

  /** The current page's row, when it's a component's page. */
  get currentRow(): NavRow | undefined {
    const row = this.navIndex?.row(this.currentPage)
    return row?.page ? row : undefined
  }

  /** `path` (relative to the site root) against `linkBase`. */
  private href(path: string): string {
    return this.linkBase + path
  }

  /**
   * Scroll the current page's row into view, inside the panel's list (never the page itself).
   * - Script API (`DOMDocsNavElement`).
   * - The row in the main list:  its copy in Favourites isn't the current page's (its key is another).
   */
  revealCurrent() {
    this.siteNav?.revealCurrent()
  }

  ////////////////
  // ## Search
  ////////////////

  /** The search text, normalized (`NavIndex.normalize()`). */
  @E.state accessor searchQuery = ""

  /** The search field, while rendered. */
  private search: DOMDocsSearchElement | undefined

  /** A search is typed.  `:state(searching)`. */
  @E.cssState("searching")
  get isSearching(): boolean {
    return !!this.searchQuery
  }

  /** Tags matching the search (every tag without one). */
  @E.derived
  get matchingTags(): ReadonlySet<string> {
    return this.navIndex?.matching(this.searchQuery) ?? new Set<string>()
  }

  /** A search matches nothing.  `:state(empty)`. */
  @E.cssState("empty")
  get hasNoMatches(): boolean {
    return this.isSearching && !this.matchingTags.size
  }

  /** The live status:  how many match, while searching. */
  private get statusText(): string {
    if (!this.isSearching) return ""
    const count = this.matchingTags.size
    return count === 1 ? this.translationForKey("matchOne") : this.translationForKey("matchMany", { count })
  }

  /** Show the search field (opening the drawer the nav is in, if it's hidden there) and focus it.  Script API. */
  focusSearch() {
    void this.search?.summon()
  }

  /** The search box changed (every keystroke). */
  private onSearch(event: CustomEvent<{ value?: string }>) {
    if (event.target !== this.search) return
    const query = NavIndex.normalize(event.detail.value ?? "")
    if (query === this.searchQuery) return
    this.searchQuery = query
    this.topicsClosedForSearch = new Set()
    this.groupsClosedForSearch = new Set()
  }

  ////////////////
  // ## Favourites
  ////////////////

  /** Starred tags, as stored:  unknown ones are dropped by `favorites`. */
  @E.state accessor starredTags: ReadonlySet<string> = new Set(isServer ? [] : NavPreferences.favorites())

  /** Starred tags the list knows. */
  @E.derived
  get favorites(): ReadonlySet<string> {
    const index = this.navIndex
    const starred = this.starredTags
    return index ? new Set([...starred].filter((tag) => index.row(tag))) : starred
  }

  /** Favourites that match, A-Z. */
  @E.derived
  get favoriteRows(): NavRow[] {
    const favorites = this.favorites
    const matching = this.matchingTags
    return (this.navIndex?.rows ?? []).filter((row) => favorites.has(row.tag) && matching.has(row.tag))
  }

  /** The starred tags, A-Z.  Untracked:  script API (`DOMDocsNavElement.favorites`). */
  @E.untracked
  get favoriteTags(): string[] {
    const favorites = this.favorites
    return (this.navIndex?.rows ?? []).filter((row) => favorites.has(row.tag)).map((row) => row.tag)
  }

  /**
   * Star or un-star `tag`;  remembered, `ui-starred`.
   * - Stored tags this site doesn't list stay stored:  every site on this bundle shares the key (`STORAGE_KEYS`), so
   *   starring an `<epic-*>` element on Epic UI's pages keeps the viewer's Spell UI favourites.
   */
  private toggleFavorite({ tag, event }: { tag: string; event: Event }) {
    const favorites = new Set(this.favorites)
    const isFavorite = !favorites.has(tag)
    if (isFavorite) favorites.add(tag)
    else favorites.delete(tag)
    this.starredTags = favorites
    const rows = this.navIndex?.rows ?? []
    const list = rows.filter((row) => favorites.has(row.tag)).map((row) => row.tag)
    const elsewhere = NavPreferences.favorites().filter((stored) => !this.navIndex?.row(stored))
    NavPreferences.setFavorites([...list, ...elsewhere])
    this.send("ui-starred", { tag, favorite: isFavorite, favorites: list, originalEvent: event })
  }

  ////////////////
  // ## The view (A-Z / Topics)
  ////////////////

  /** `view`:  the DOM element's when set, else the remembered one. */
  @E.controlled("view") accessor view: NavView = (isServer ? undefined : NavPreferences.view()) ?? DEFAULT_VIEW

  /** Every matching row, A-Z. */
  @E.derived
  get azRows(): NavRow[] {
    const matching = this.matchingTags
    return (this.navIndex?.rows ?? []).filter((row) => matching.has(row.tag))
  }

  /** Switch the view, as the viewer did with `event`;  remembered.  No `view` (not a `NavView`):  nothing. */
  private switchView(view: NavView | undefined, event: Event) {
    if (!view || view === this.view) return
    const isApplied = this.requestChange("view", view, () => this.send("ui-changed", { view, originalEvent: event }))
    if (isApplied) NavPreferences.setView(view)
  }

  /**
   * A view button flipped itself (`toggle`):  the pressed one stays pressed.
   * - Re-set during the event, so the button's own flip doesn't stand (`requestChange()`):
   *   clicking the pressed button would otherwise un-press it while the view stays.
   */
  @E.untracked
  private onToggle(event: Event) {
    const button = event.target as HTMLElement & { selected?: boolean }
    const view = button.getAttribute(DATA.view)
    if (view) button.selected = view === this.view
  }

  ////////////////
  // ## Topics
  ////////////////

  /** Topic ids the viewer opened (no search typed). */
  @E.state accessor openTopics: ReadonlySet<string> = new Set(isServer ? [] : NavPreferences.openTopics())

  /** Topic ids the viewer closed during THIS search;  emptied when the query changes. */
  @E.state accessor topicsClosedForSearch: ReadonlySet<string> = new Set()

  /** The viewer closed the topic opened for the current page:  don't open it again. */
  @E.state accessor autoTopicWasClosed = false

  /** The topic Topics opens for the current page:  its first, unless an open topic already holds it. */
  get autoTopic(): string | undefined {
    const row = this.currentRow
    if (!row || this.autoTopicWasClosed) return undefined
    const open = this.openTopics
    return row.topics.some((topic) => open.has(topic)) ? undefined : row.topics[0]
  }

  /** Is `topic` open now:  every matching topic while searching (unless closed for it), else the viewer's. */
  private topicIsOpen(topic: string): boolean {
    if (this.isSearching) return !this.topicsClosedForSearch.has(topic)
    return this.openTopics.has(topic) || this.autoTopic === topic
  }

  /** Open or close `topic`;  remembered unless searching. */
  private toggleTopic(topic: string) {
    const isOpen = this.topicIsOpen(topic)
    if (this.isSearching) {
      this.topicsClosedForSearch = UIDocsNav.copyWith(this.topicsClosedForSearch, topic, isOpen ? "add" : "delete")
      return
    }
    const topics = UIDocsNav.copyWith(this.openTopics, topic, isOpen ? "delete" : "add")
    if (isOpen && topic === this.autoTopic) this.autoTopicWasClosed = true
    this.openTopics = topics
    NavPreferences.setOpenTopics(topics)
  }

  ////////////////
  // ## Groups
  ////////////////

  /** Groups the viewer folded away (no search typed). */
  @E.state accessor closedGroups: ReadonlySet<NavGroup> = new Set(isServer ? [] : NavPreferences.closedGroups())

  /** Groups the viewer folded during THIS search;  emptied when the query changes. */
  @E.state accessor groupsClosedForSearch: ReadonlySet<NavGroup> = new Set()

  /**
   * Is `group` open now:  unless the viewer folded it.
   * - While searching, the groups a search filters (Favourites, Components) open, unless folded for this search.
   */
  private groupIsOpen(group: NavGroup): boolean {
    if (this.isSearching && SEARCHED.has(group)) return !this.groupsClosedForSearch.has(group)
    return !this.closedGroups.has(group)
  }

  /** Fold or unfold `group`;  remembered, unless it's one a search opened.  No `group`:  nothing. */
  private toggleGroup(group: NavGroup | undefined) {
    if (!group) return
    // an open group joins the closed ones;  a closed one leaves them
    const change = this.groupIsOpen(group) ? "add" : "delete"
    if (this.isSearching && SEARCHED.has(group)) {
      this.groupsClosedForSearch = UIDocsNav.copyWith(this.groupsClosedForSearch, group, change)
      return
    }
    const groups = UIDocsNav.copyWith(this.closedGroups, group, change)
    this.closedGroups = groups
    NavPreferences.setClosedGroups(groups)
  }

  ////////////////
  // ## The list, as pages
  ////////////////

  /**
   * The whole list, as `<ui-site-nav>` takes it:  a heading band per group, the topics as subheading bands under
   * Components, each component a page with its status badge and its star.
   * - Every band says whether it's `open`:  the nav decides (a search opens what matches), not the site nav.
   */
  get navPages(): SiteNavPage[] {
    const pages: SiteNavPage[] = []
    const startPages = this.startPages
    if (startPages.length)
      pages.push(
        this.band(
          "start",
          "getStarted",
          startPages.map((page) => this.pagePage(page))
        )
      )
    const favorites = this.favoriteRows
    if (favorites.length) {
      pages.push(
        this.band(
          FAVORITES,
          "favorites",
          favorites.map((row) => this.rowPage(row, FAVORITE_PREFIX))
        )
      )
    }
    const components = this.band("components", "components", this.componentPages)
    if (this.navIndex) components.count = this.matchingTags.size
    pages.push(components)
    const foundationPages = this.foundationPages
    if (foundationPages.length) {
      pages.push(
        this.band(
          "foundation",
          "foundation",
          foundationPages.map((page) => this.pagePage(page))
        )
      )
    }
    return pages
  }

  /** The Components band's pages:  every matching component A-Z, or a subheading band per topic with a match. */
  private get componentPages(): SiteNavPage[] {
    const index = this.navIndex
    if (!index) return []
    if (this.view !== "topics") return this.azRows.map((row) => this.rowPage(row))
    const matching = this.matchingTags
    return index.topics.flatMap((topic) => {
      const rows = topic.rows.filter((row) => matching.has(row.tag))
      if (!rows.length) return []
      return [
        {
          title: topic.title,
          id: TOPIC_PREFIX + topic.id,
          band: "subheading" as const,
          count: rows.length,
          open: this.topicIsOpen(topic.id),
          pages: rows.map((row) => this.rowPage(row))
        }
      ]
    })
  }

  /** A group's heading band:  its title, open as the viewer left it, holding `pages`. */
  private band(group: NavGroup, title: DocsNavText, pages: SiteNavPage[]): SiteNavPage {
    return {
      title: this.groupTitle(group, title),
      id: GROUP_PREFIX + group,
      band: "heading",
      open: this.groupIsOpen(group),
      pages
    }
  }

  /** A component's page:  its name, its link, its status badge, its star;  `prefix` keeps a second copy apart. */
  private rowPage(row: NavRow, prefix = ""): SiteNavPage {
    return {
      title: row.name,
      href: this.href(row.href),
      id: prefix + row.tag,
      badge: row.status ? this.translationForKey(row.status === "planned" ? "planned" : "inProgress") : undefined,
      starred: this.favorites.has(row.tag)
    }
  }

  /** A hand-written page's page:  its icon, its name, its link. */
  private pagePage(page: NavPage): SiteNavPage {
    return {
      title: page.label ?? (page.text ? this.translationForKey(page.text) : page.id),
      href: this.href(page.file),
      id: page.id,
      icon: page.icon
    }
  }

  /** `group`'s band title:  the site's own (`SiteNav.titles`), else the vocabulary's `title`. */
  private groupTitle(group: NavGroup, title: DocsNavText): string {
    const titles = this.navIndex?.nav?.titles
    const own = group === "favorites" ? undefined : titles?.[group]
    return own ?? this.translationForKey(title)
  }

  /**
   * The links above the components:  the site's own (`SiteDataFile.nav`), else Spell UI's (`TOP_PAGES`).
   * - None until the data has loaded (Spell UI's if it fails), so another site never shows Spell UI's for a moment.
   */
  get startPages(): readonly NavPage[] {
    return this.navIndex ? (this.navIndex.nav?.start ?? TOP_PAGES) : this.loadError ? TOP_PAGES : []
  }

  /** The links below the components, as `startPages`:  the site's own, else Spell UI's (`FOUNDATION_PAGES`). */
  get foundationPages(): readonly NavPage[] {
    return this.navIndex ? (this.navIndex.nav?.foundation ?? FOUNDATION_PAGES) : this.loadError ? FOUNDATION_PAGES : []
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Which slots have content:  the header / footer boxes show only then. */
  readonly slots = new E.SlotContent(this.domElement)

  /** The panel, while rendered. */
  private box: HTMLElement | undefined

  /** The site nav that draws the list, while rendered. */
  private siteNav: (HTMLElement & { revealCurrent(): void }) | undefined

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("nav")} ref={(element: HTMLElement) => this.wire(element)}>
        {this.masthead()}
        <div part={this.partForName("menu")} class={MENU}>
          <ui-site-nav
            ref={(element: HTMLElement) => (this.siteNav = element as HTMLElement & { revealCurrent(): void })}
            appearance="nav"
            label={this.attributes["aria-label"] ?? this.translationForKey("navLabel")}
            current={this.markedPage}
            pages={this.navPages}
          />
          {this.notes()}
          <Show when={this.slots.hasContent(this.slotForName("footer"))}>
            <div class={[SLOTTED, FOOTER]}>
              <slot name={this.slotForName("footer")} />
            </div>
          </Show>
        </div>
      </div>
    )
  }

  /** The header band:  the `header` slot, the search box beside the A-Z / Topics switch, the live status. */
  private masthead(): JSX.Element {
    return (
      <div class={MASTHEAD} part={this.partForName("header")}>
        <Show when={this.slots.hasContent(this.slotForName("header"))}>
          <div class={[SLOTTED, UIT.HEADER]}>
            <slot name={this.slotForName("header")} />
          </div>
        </Show>
        <div class={TOOLS}>
          <ui-docs-search
            ref={(element: HTMLElement) => (this.search = element as DOMDocsSearchElement)}
            part={this.partForName("search")}
            base={this.base}
          />
          <ui-buttons
            part={this.partForName("views")}
            size="small"
            icon=""
            aria-label={this.translationForKey("views")}
            appearance="basic"
          >
            <For each={NavViews}>{(view) => this.viewButton(view)}</For>
          </ui-buttons>
        </div>
        <span class={UIT.VISUALLY_HIDDEN} role="status">
          {this.statusText}
        </span>
      </div>
    )
  }

  /** Under the list:  loading, the load error, or "no matches". */
  private notes(): JSX.Element {
    return (
      <Switch>
        <Match when={this.loadError}>
          <ui-message class={PROBLEM} size="small" state="negative" heading={this.translationForKey("loadError")}>
            {this.loadError}
          </ui-message>
        </Match>
        <Match when={!this.navIndex}>
          <p class={NOTE}>{this.translationForKey("loading")}</p>
        </Match>
        <Match when={this.hasNoMatches}>
          <p class={[NOTE, EMPTY]}>{this.translationForKey("noMatches")}</p>
        </Match>
      </Switch>
    )
  }

  /** One button of the A-Z / Topics switch:  a `toggle`, so it says `aria-pressed`. */
  private viewButton(view: NavView): JSX.Element {
    const label = this.translationForKey(view)
    return (
      <ui-button
        data-nav-view={view}
        toggle=""
        selected={this.view === view ? "" : undefined}
        icon={ICONS[view]}
        aria-label={label}
        title={label}
      />
    )
  }

  ////////////////
  // ## Events
  ////////////////

  /** Listeners on the panel:  the view switch, the search box, and the site nav's picks, folds and stars. */
  private wire(box: HTMLElement) {
    this.box = box
    box.addEventListener("click", (event) => this.onClick(event))
    box.addEventListener("ui-typed", (event) => this.onSearch(event as CustomEvent<{ value?: string }>))
    box.addEventListener("ui-selected", (event) => this.onToggle(event))
    box.addEventListener("ui-deselected", (event) => this.onToggle(event))
    box.addEventListener("ui-navigating", (event) => this.onNavigating(event as SiteNavEvent))
    box.addEventListener("ui-opening", (event) => this.onFolding(event as SiteNavEvent))
    box.addEventListener("ui-closing", (event) => this.onFolding(event as SiteNavEvent))
    box.addEventListener("ui-starred", (event) => this.onStarred(event as SiteNavEvent))
  }

  /** A click on a view button (by `data-nav-view`). */
  private onClick(event: MouseEvent) {
    const button = event
      .composedPath()
      .find((target): target is Element => target instanceof Element && target.hasAttribute(DATA.view))
    const view = button?.getAttribute(DATA.view)
    if (view)
      this.switchView(
        NavViews.find((each) => each === view),
        event
      )
  }

  /**
   * The site nav is going to a page:  the nav's own `ui-navigating` (`page` its tag or id) goes out in its place;
   * cancelled, the browser stays.
   */
  private onNavigating(event: SiteNavEvent) {
    if (event.target !== this.siteNav) return
    event.stopPropagation()
    const { href, page, originalEvent } = event.detail
    if (!this.send("ui-navigating", { href: href ?? "", page: UIDocsNav.tagOf(page), originalEvent })) {
      event.preventDefault()
    }
  }

  /** A band of the site nav is opening or closing:  a group's or a topic's, so this nav's to remember. */
  private onFolding(event: SiteNavEvent) {
    if (event.target !== this.siteNav) return
    event.stopPropagation()
    const id = event.detail.page.id ?? ""
    if (id.startsWith(GROUP_PREFIX)) this.toggleGroup(NavGroups.find((group) => GROUP_PREFIX + group === id))
    else if (id.startsWith(TOPIC_PREFIX)) this.toggleTopic(id.slice(TOPIC_PREFIX.length))
  }

  /** A component's star was clicked, in its row or in Favourites. */
  private onStarred(event: SiteNavEvent) {
    if (event.target !== this.siteNav) return
    event.stopPropagation()
    this.toggleFavorite({ tag: UIDocsNav.tagOf(event.detail.page), event: event.detail.originalEvent ?? event })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** A copy of `set` with `item` added or deleted:  a new value for a `@state` set, which never changes in place. */
  private static copyWith<T extends string>(set: ReadonlySet<T>, item: T, change: "add" | "delete"): Set<T> {
    const next = new Set(set)
    if (change === "add") next.add(item)
    else next.delete(item)
    return next
  }

  /** A component's tag from its page in the site nav:  its id, without the Favourites copy's prefix. */
  private static tagOf(page: SiteNavPage): string {
    const id = page.id ?? ""
    return id.startsWith(FAVORITE_PREFIX) ? id.slice(FAVORITE_PREFIX.length) : id
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIDocsNav extends E.AttributeValues<DocsNavVocabulary> {}

/** What the site nav's `ui-navigating`, `ui-opening`, `ui-closing` and `ui-starred` carry. */
type SiteNavEvent = CustomEvent<{ page: SiteNavPage; href?: string; originalEvent?: Event }>

/** The Favourites group. */
const FAVORITES: NavGroup = "favorites"

/** Groups a search filters:  they open while searching. */
const SEARCHED: ReadonlySet<NavGroup> = new Set([FAVORITES, "components"])

/** A group's band's page id:  + the `NavGroup`. */
const GROUP_PREFIX = "group:"

/** A topic's band's page id:  + the topic's id. */
const TOPIC_PREFIX = "topic:"

/** A Favourites row's page id:  + its tag, apart from its row in Components. */
const FAVORITE_PREFIX = "favorite:"

/** Class word of the scrolling list. */
const MENU = "menu"

/** Class word of the header band. */
const MASTHEAD = "masthead"

/** Class word of a box round a slot (with `header` / `footer`). */
const SLOTTED = "slotted"

/** Class word of the footer slot's box. */
const FOOTER = "footer"

/** Class word of the box holding the search field and the view switch. */
const TOOLS = "tools"

/** Class word of a note in the list (loading, no matches). */
const NOTE = "note"

/** Class word of the "no matches" note. */
const EMPTY = "empty"

/** Class word of the load error's message. */
const PROBLEM = "problem"

/** What every `ui-*` DOM element has, and plain elements don't:  its `ready` promise. */
const READY = "ready"
