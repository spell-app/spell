import h from "@solidjs/h"
import { For, createMemo } from "solid-js"

import { PrefStore, schemaOf } from "spell/util"
import { waitUntil } from "spell/util/timing"
import { compilePattern, filledPattern, type AddressParams } from "spell/util/addressPattern"

import { core } from "spell/parser/core/core"
import type { SiteHost, SiteOverlayEntry, SitePageEntry } from "spell/parser/core/core.types"
import { isElementThunk, type Drawing } from "spell/parser/core/drawing"
// Import directly to avoid circular import
import { App } from "./App"
import { Page } from "./Page"
import { PageLayout } from "./PageLayout"
import { Thing } from "./Thing"

/**
 * `SiteBase`:  what a running site DOES, under spell's built-in template `site` (`Site`, compiled from
 * `templates/Site.spell`, extends it):
 * showing the page its address names, and the dialogs and sidebars its pages open (epic `mockup` P2).
 * - Spell can't say this part, so it's written here, by hand:
 *   the template keeps what spell can say, its words in every language (`its current address`).
 * - The site's lines compile to its class's statics (`static pages`, `static dialogs` ...):  this reads them.
 * - An address is matched by the kit's ONE address grammar (`spell/util/addressPattern`), the page server router's:
 *   `/films/:film` shows the film page, its `film` the film the address names.
 * - `/` with no page of its own shows its first page:  where Run starts.
 * - The page shown, its parameters filled in, then drawn inside the site, with an open dialog or sidebar over it.
 * - An address no page has shows the site's NOT FOUND page;  a page that fails to draw or load, its ERROR page:
 *   the program's own when it has one (`- it has a not found page`), else a plain built-in one.
 * - Where the address comes from, and where it goes, is the HOST's (`core.siteHost`):  the editor's Run keeps it in its
 *   own URL, `/run/<project>/films/4`, so back and forward work.  With no host, the site keeps its address itself.
 * - NEVER imports spell or the parser:  it's the core.
 */
export class SiteBase extends App {
  /** Its pages, nested as its lines nest:  `- it has a film page at "/films/:film"`. */
  static pages: SitePageEntry[] = []

  /** Its dialogs:  `- it has a settings dialog`. */
  static dialogs: SiteOverlayEntry[] = []

  /** Its sidebars:  `- it has a person sidebar`. */
  static sidebars: SiteOverlayEntry[] = []

  /** Its own not found page, when it lists one:  `- it has a not found page`. */
  static notFoundPage?: SiteOverlayEntry

  /** Its own error page, when it lists one:  `- it has an error page`. */
  static errorPage?: SiteOverlayEntry

  /** Where it lives, when its line says:  `"owen@spell/galaxy"`, `"cloud"`. */
  static livesAt?: string

  /**
   * The class of its MAIN layout, every page's unless its own line picks another, when the program has one:
   * `main layout is a page layout` => `"MainLayout"` (epic `mockup` T39).
   * - None:  its pages are drawn in its built-in frame, the navigation and the page.
   */
  static mainLayout?: string

  /**
   * SIDE EFFECT:  the running program's first site is its site, `core.RUNTIME.site`:
   * what `go to the film page` goes through (`core.showSitePart()`).
   */
  constructor(props?: Record<string, unknown>) {
    super(props)
    if (core.RUNTIME && !core.RUNTIME.site) core.RUNTIME.site = this
  }

  ////////////////
  // ## Its pages, by address
  ////////////////

  /**
   * The page `address` names, and its parameters:  `/films/4` => the film page entry, `{ film: "4" }`.
   * - Nested pages count:  a page under a page has its own whole address.
   * - The first one listed wins, as a router's first route does.
   * - `undefined` when no page has it;  a parameter that won't decode is no match either.
   */
  pageFor(address: string): { entry: SitePageEntry; params: AddressParams } | undefined {
    for (const { entry, match } of this.matchers()) {
      let params: AddressParams | undefined
      try {
        params = match(address)
      } catch {
        params = undefined
      }
      if (params) return { entry, params }
    }
    return undefined
  }

  /**
   * The address of page `name`, its parameters filled from `values`:
   * `addressOf("film page", { film: aFilm })` => `/films/4`.
   * - A value may be a thing:  its id is what goes in the address (`idInAddressOf()`).
   * - throws `TypeError` for a page the site doesn't have, or a parameter with no value
   */
  addressOf(name: string, values: Readonly<Record<string, unknown>> = {}): string {
    const entry = this.entryNamed(name)
    if (!entry) throw new TypeError(`SiteBase.addressOf():  ${this.constructor.name} has no page "${name}";  list it`)
    const params: Record<string, string | number | undefined> = {}
    for (const param of entry.params ?? []) params[param] = idInAddressOf(values[param] ?? values[propertyFor(param)])
    return filledPattern(entry.address, params)
  }

  /** Every page, nested ones too, in the order the site lists them. */
  allPages(): SitePageEntry[] {
    const all: SitePageEntry[] = []
    const visit = (entries: SitePageEntry[] | undefined) =>
      entries?.forEach((entry) => {
        all.push(entry)
        visit(entry.pages)
      })
    visit(this.siteClass.pages)
    return all
  }

  /** Its first page with no parameters, to show at `/` when no page is there:  `undefined` for none. */
  firstPage(): { entry: SitePageEntry; params: AddressParams } | undefined {
    const entry = this.allPages().find((page) => !page.params?.length)
    return entry && { entry, params: {} }
  }

  /** The page entry named `name`, nested ones too:  `undefined` for none. */
  entryNamed(name: string): SitePageEntry | undefined {
    return this.allPages().find((entry) => entry.name === name)
  }

  /** The dialog or sidebar named `name`, and which it is:  `undefined` for none. */
  overlayNamed(name: string): { kind: "dialog" | "sidebar"; entry: SiteOverlayEntry } | undefined {
    const dialog = this.siteClass.dialogs?.find((entry) => entry.name === name)
    if (dialog) return { kind: "dialog", entry: dialog }
    const sidebar = this.siteClass.sidebars?.find((entry) => entry.name === name)
    return sidebar && { kind: "sidebar", entry: sidebar }
  }

  ////////////////
  // ## Going to a page
  ////////////////

  /**
   * Show page `name`, or open the dialog or sidebar of that name:
   * what `go to the film page for this film` and `show the settings dialog` compile to (`core.showSitePart()`).
   * - `thing`:  what fills the page's parameter, e.g. the film.
   *   It goes in the parameter whose property is of its type, else the first.
   * - A page goes through the host, so the browser's address and its back button follow (`navigate()`).
   * - throws `TypeError` for a name that's none of the site's parts
   */
  show(name: string, thing?: unknown): void {
    const overlay = this.overlayNamed(name)
    if (overlay) return this.openOverlay(overlay.kind, overlay.entry, thing)
    const entry = this.entryNamed(name)
    if (!entry)
      throw new TypeError(`SiteBase.show():  ${this.constructor.name} has no page or part "${name}";  list it`)
    const param = thing === undefined ? undefined : this.paramFor(entry, thing)
    this.navigate(this.addressWith(name, thing), param ? { [propertyFor(param)]: thing } : {})
  }

  /**
   * The address of page `name`, `thing` in the parameter it fills:  what a link to it says.
   * - throws `TypeError` for a page the site doesn't have, or a parameter left with no value
   */
  addressWith(name: string, thing?: unknown): string {
    const entry = this.entryNamed(name)
    const param = entry && thing !== undefined ? this.paramFor(entry, thing) : undefined
    return this.addressOf(name, param ? { [param]: thing } : {})
  }

  /**
   * What a LINK to page `name` says, `thing` in its parameter:
   * what `the address of the film page for this film` compiles to (`core.siteAddressOf()`).
   * - `""` while `thing` is nothing yet, for a page that needs one:  a link followed as the page draws (a person's
   *   home world) has no thing until it's read, and a drawing mustn't fail meanwhile (epic `mockup` P8).
   * - throws `TypeError` for a page the site doesn't have
   */
  linkTo(name: string, thing?: unknown): string {
    if (thing == null && this.entryNamed(name)?.params?.length) return ""
    return this.addressWith(name, thing ?? undefined)
  }

  /**
   * Go to `address`:  through the host when there is one (the editor's Run puts it in its URL), and shown here at once.
   * - `known`:  a parameter's thing, when the program handed it over:  no need to look it up again.
   */
  navigate(address: string, known: Record<string, unknown> = {}): void {
    core.siteHost?.go(address)
    void this.showAddress(address, known)
  }

  /**
   * Show what `address` names, now:  its page, its parameters filled in, else the not found page.
   * - Each parameter fills the page's property of its name, looked up by its type:  a thing of the program, or one in
   *   the place its type is saved in (`core.savedThingWithId()`).
   * - A lookup that fails shows the error page.
   * - The same address again does nothing, unless it showed no page:  a page made for it since shows
   *   (the editor's "Create it", epic `mockup` P4).
   * - NEVER throws:  what goes wrong is shown on the page.
   */
  async showAddress(address: string, known: Record<string, unknown> = {}): Promise<void> {
    const showing = this.getState("showing") as Showing | undefined
    if (address === this.currentAddressHere && showing && showing.kind === "page") return
    this.closeOverlay()
    this.setProp("currentAddress", address)
    // `/` with no page of its own is the site's first page:  where Run starts
    const found = this.pageFor(address) ?? (address === "/" ? this.firstPage() : undefined)
    if (!found) {
      this.showNow({ kind: "missing", address })
      return
    }
    // a page not compiled yet (`SiteHost.pageNeeded()`):  the host brings it in;  false:  this isn't the place to show it
    const needed = core.siteHost?.pageNeeded?.(found.entry.page)
    if (needed !== undefined && !(await needed)) return
    if (this.currentAddressHere !== address) return
    const page = this.pageInstance(found.entry)
    if (!page) {
      this.showNow({ kind: "waiting", entry: found.entry })
      return
    }
    try {
      for (const [param, id] of Object.entries(found.params)) {
        const property = propertyFor(param)
        const value = property in known ? known[property] : await valueFor(page, property, id)
        // a newer address came while this one waited:  it wins
        if (this.currentAddressHere !== address) return
        ;(page as unknown as Record<string, unknown>)[property] = value
      }
      this.showNow({ kind: "page", page, entry: found.entry })
    } catch (error) {
      if (this.currentAddressHere === address) this.showFailure(found.entry.name, error)
    }
  }

  /**
   * Show the error page for page `name`, which failed with `error`:  what a page that throws as it draws comes to
   * (`core.drawingFailed()` asks `pageFailed()` first).
   */
  showFailure(name: string, error: unknown): void {
    this.showNow({ kind: "failed", name, error })
  }

  /**
   * Is `thing` the page this site shows?  Then its failure is the site's to show:  the error page, in its place.
   * - Answers whether it took it, so the stand-in isn't drawn as well.
   * - Shown a moment later:  it's asked from inside a drawing, which mustn't change what it draws while it draws.
   */
  pageFailed(thing: unknown, error: unknown): boolean {
    const showing = this.getState<Showing>("showing")
    if (showing?.kind !== "page" || showing.page !== thing) return false
    queueMicrotask(() => {
      if (this.getState<Showing>("showing") === showing) this.showFailure(showing.entry.name, error)
    })
    return true
  }

  ////////////////
  // ## Dialogs and sidebars
  ////////////////

  /** Open dialog or sidebar `entry`, its view's first property set to `thing`, if any. */
  openOverlay(kind: "dialog" | "sidebar", entry: SiteOverlayEntry, thing?: unknown): void {
    const View = entry.view ? core.things.classNamed(entry.view) : undefined
    const view = View ? (this.overlayViews.get(entry.name) ?? new (View as new () => object)()) : undefined
    if (view) {
      this.overlayViews.set(entry.name, view)
      const property = thing === undefined ? undefined : firstPropertyOf(view.constructor, thing)
      if (property) (view as Record<string, unknown>)[property] = thing
    }
    this.setState("overlay", { kind, entry, view } satisfies OpenOverlay)
  }

  /**
   * Close dialog or sidebar `name`, if it's the one open:
   * what `close the review dialog` compiles to (`core.closeSitePart()`).
   * - throws `TypeError` for a name that's none of the site's dialogs or sidebars:  a page isn't closed, it's left
   */
  close(name: string): void {
    if (!this.overlayNamed(name))
      throw new TypeError(`SiteBase.close():  ${this.constructor.name} has no dialog or sidebar "${name}";  list it`)
    if (this.getState<OpenOverlay>("overlay")?.entry.name === name) this.closeOverlay()
  }

  /** Close the open dialog or sidebar, if any. */
  closeOverlay(): void {
    this.setState("overlay", undefined)
  }

  ////////////////
  // ## Starting and drawing
  ////////////////

  /**
   * Start the site:  show the page its host's address names (`/` with none), then draw it as the program's page.
   * - SIDE EFFECT:  listens to its host, so the browser's back and forward show their page.
   */
  start(): void {
    const host = core.siteHost
    void this.showAddress(host?.address() ?? this.currentAddressHere ?? "/")
    host?.listen((address) => void this.showAddress(address))
    this.wearTheme()
    super.start()
  }

  /**
   * The theme its pages wear:  its own `theme` property, `- its "theme" is "mockup"` (epic `mockup` P8);
   * `undefined`:  the page's.
   */
  get themeName(): string | undefined {
    const theme = (this as unknown as { theme?: unknown }).theme
    return typeof theme === "string" && theme ? theme : undefined
  }

  /**
   * Ask the host for its theme's look, worn by its frame alone (`SiteHost.themeTokens()`).
   * - NEVER throws:  a theme the host can't give leaves the page's, said on the console.
   */
  private wearTheme(): void {
    const name = this.themeName
    const host = core.siteHost
    if (!name || !host?.themeTokens) return
    host.themeTokens(name).then(
      (tokens) => this.setState("themeTokens", tokens),
      (error: unknown) => console.warn(`SiteBase:  can't wear theme "${name}";  it wears the page's`, error)
    )
  }

  /**
   * The page it shows, in its page layout, and an open dialog or sidebar over it (epic `mockup` P3, T39).
   * - Its page layout:  Spell UI's `<ui-page-layout>`, its slots drawn by the layout the page is in
   *   (`layoutNameFor()`):  its app menu, page menu, drawer, side bars and footer;  the page in its middle.
   *   - Its drawer holds the site's navigation, `<ui-site-nav>`, its pages the site's, nested as its lines nest them
   *     (`navPages()`), unless the layout draws its drawer itself.
   *   - A slot the page shown draws itself (`to draw its right sidebar`) is the page's while it's shown.
   * - Drawn ONCE per layout, and kept:  going to a page in the same layout redraws only the page, so nothing around
   *   it flashes;  a page in another layout shows that one, and the first is kept, hidden, as it was left.
   * - A site with no main layout draws every page in its built-in frame:  the navigation and the page.
   *   A page whose line says `, no layout` is drawn alone.
   * - Not `<ui-page>`:  that's a whole window's frame and root, and Run draws the site inside the editor's page.
   * - A link on the page to one of its addresses goes there without leaving the page (`followLink()`).
   */
  draw(): Drawing {
    return h(
      "div",
      {
        class: "spell-site-frame",
        // its theme's tokens, inline:  inherited by every page, dialog and sidebar inside, and nothing outside
        style: () => {
          const tokens = this.getState<string>("themeTokens")
          return tokens ? `${tokens};  ${THEMED_FRAME}` : ""
        },
        "data-theme": () => this.themeName,
        onClick: (event: MouseEvent) => this.followLink(event)
      },
      h("style", {}, SITE_CSS),
      h(For, { each: () => this.layoutsDrawn, children: (name: string) => this.drawLayout(name) }),
      () => made(this.drawOverlay())
    ) as unknown as Drawing
  }

  ////////////////
  // ## Its page layouts
  ////////////////

  /**
   * The name of the layout the page shown is in:  its page layout's class (`MainLayout`), else `BUILT_IN_FRAME` or
   * `JUST_THE_PAGE`.
   * - A page's own line picks one (`static layout`):  a layout's class, or `false` for `, no layout`;
   *   saying nothing, it's in the site's main layout (`static mainLayout`).
   * - The not found and error pages are in the main layout:  so its navigation is there, to get out.
   * - A layout the program doesn't make (yet):  the built-in frame.
   */
  layoutNameFor(showing: Showing | undefined): string {
    const picked =
      showing?.kind === "page" ? (showing.page.constructor as { layout?: string | false }).layout : undefined
    if (picked === false) return JUST_THE_PAGE
    const name = picked ?? this.siteClass.mainLayout
    return name && this.layoutNamed(name) ? name : BUILT_IN_FRAME
  }

  /**
   * The layout the page shown is in:  see `layoutNameFor()`.
   * - Worked out as the page is shown (`showNow()`), never as it's drawn:  finding a layout reads every thing of the
   *   program, and a drawing that read them would draw again each time the page made one.
   */
  get shownLayoutName(): string {
    return this.getState<string>("shownLayout") ?? BUILT_IN_FRAME
  }

  /** Every layout drawn so far, in the order first shown:  each one's drawing is kept, the one shown visible. */
  get layoutsDrawn(): string[] {
    return this.getState<string[]>("layoutsDrawn") ?? []
  }

  /** The program's page layout of class `name`:  the one its file made (`export const mainLayout = new MainLayout()`). */
  private layoutNamed(name: string): PageLayout | undefined {
    return core.things.all().find((thing) => thing instanceof PageLayout && thing.constructor.name === name) as
      | PageLayout
      | undefined
  }

  /**
   * Show `showing`:  its page, the not found page or the error page.
   * - SIDE EFFECT:  the layout it's in is shown (`shownLayoutName`), and drawn from now on if it isn't already
   *   (`layoutsDrawn`).
   */
  private showNow(showing: Showing): void {
    const name = this.layoutNameFor(showing)
    if (!this.layoutsDrawn.includes(name)) this.setState("layoutsDrawn", [...this.layoutsDrawn, name])
    this.setState("shownLayout", name)
    this.setState("showing", showing)
  }

  /**
   * Layout `name`, drawn once:  `<ui-page-layout>`, each of its slots drawn by the layout, or the page shown when it
   * draws that slot itself, and the page in its middle while it's the layout shown.
   * - Hidden while another layout is shown, as it was left.
   * - Its drawer's choice of only its icons (`drawer="compact"`), or of none (`drawer="hidden"`), and its side bars
   *   hidden (`right="hidden"`), are remembered for each person, for each site and layout (`regionState()`,
   *   epic `mockup` T55).
   */
  private drawLayout(name: string): unknown {
    const isShown = () => this.shownLayoutName === name
    const page = () => (isShown() ? made(this.drawShowing()) : null)
    if (name === JUST_THE_PAGE)
      return h("div", { class: "spell-site-alone", hidden: () => (isShown() ? undefined : "") }, page)
    const layout = name === BUILT_IN_FRAME ? undefined : this.layoutNamed(name)
    return h(
      "ui-page-layout",
      {
        class: "spell-site",
        "data-layout": name || undefined,
        hidden: () => (isShown() ? undefined : ""),
        drawer: () => this.regionState(name, DRAWER),
        left: () => this.regionState(name, LEFT),
        right: () => this.regionState(name, RIGHT),
        // a listener, not an `on-ui-toggle` attribute:  Solid warns about a function on an attribute
        ref: (element: Element) =>
          element.addEventListener(TOGGLE, (event) => {
            const { region = DRAWER, newState } = (event as CustomEvent<{ region?: string; newState: string }>).detail
            if (LAYOUT_REGIONS.includes(region as LayoutRegion))
              this.rememberState(name, region as LayoutRegion, newState)
          })
      },
      layout?.drawDrawer === PageLayout.prototype.drawDrawer || !layout
        ? this.drawNav()
        : this.drawSlot(layout, "drawDrawer", "drawer"),
      layout && this.drawSlot(layout, "drawAppMenu", "menu"),
      layout && this.drawSlot(layout, "drawPageMenu", "page-menu"),
      layout && this.drawSlot(layout, "drawLeftSidebar", "left"),
      layout && this.drawSlot(layout, "drawRightSidebar", "right"),
      layout && this.drawSlot(layout, "drawFooter", "footer"),
      page
    )
  }

  /**
   * Slot `slot` of the layout's region `region`:  the page shown's own drawing of it while it has one, else the
   * layout's;  nothing when neither draws anything, so the region takes no room.
   * - Drawn again only when WHO draws it changes (a memo of that), never on every page change:
   *   so a layout's menu is the same element from page to page.
   */
  private drawSlot(layout: PageLayout, slot: LayoutSlot, region: string): unknown {
    const drawer = createMemo(() => {
      const showing = this.getState<Showing>("showing")
      const page =
        showing?.kind === "page" && this.shownLayoutName === layout.constructor.name ? showing.page : undefined
      return page && typeof (page as unknown as Record<string, unknown>)[slot] === "function" ? page : layout
    })
    return () => {
      const drawing = made((drawer() as unknown as Record<LayoutSlot, () => unknown>)[slot]())
      return drawing == null ? null : h("div", { slot: region, class: "spell-site-slot" }, drawing)
    }
  }

  /** The site's navigation, in a layout's drawer:  its pages, the one shown marked;  picking one goes there. */
  private drawNav(): unknown {
    return h("ui-site-nav", {
      slot: "drawer",
      class: "spell-site-nav",
      appearance: "nav",
      remember: this.constructor.name,
      // functions:  `h()` reads a function on a dashed tag as a live value
      // JSON text, which the attribute takes:  where Spell UI isn't loaded, a list would be written `[object Object]`
      pages: () => JSON.stringify(this.navPages()),
      current: () => this.navCurrent(),
      // a listener, not an `on-ui-navigating` attribute:  Solid warns about a function on an attribute
      ref: (element: Element) =>
        element.addEventListener(NAVIGATING, (event) => {
          event.preventDefault()
          this.navigate((event as CustomEvent<{ href: string }>).detail.href)
        })
    })
  }

  /**
   * Does layout `name`'s drawer show only its icons (`drawer="compact"`)?  Its `<ui-site-nav-button>` switches it.
   * - `regionState()`'s, for the drawer.
   */
  isCompact(name: string): boolean {
    return this.regionState(name, DRAWER) === COMPACT
  }

  /**
   * How layout `name`'s region `region` is left, its attribute on `<ui-page-layout>`:  the drawer `compact` or
   * `hidden`, a side bar `hidden`;  `undefined` while it's all there.  Its buttons switch it (`ui-toggle`).
   * - Remembered for each person, for each site and layout, across pages and visits
   *   (`PrefStore`, `spell-sites:<Site>.<Layout>.drawer`, `.right` ...).
   * - A drawer left compact before there were other states:  `.compact`, `true`.
   */
  regionState(name: string, region: LayoutRegion): string | undefined {
    const set = this.getState<string | null>(`${region}:${name}`)
    if (set !== undefined) return set ?? undefined
    const kept = PrefStore.getAt(this.regionKey(name, region))
    if (typeof kept === "string") return kept
    return region === DRAWER && PrefStore.getAt(this.regionKey(name, OLD_COMPACT_KEY)) === true ? COMPACT : undefined
  }

  /**
   * Remember layout `name`'s region `region` as its `ui-toggle` left it:  `newState`, or nothing while it's all there
   * (`full`, `shown`).
   */
  private rememberState(name: string, region: LayoutRegion, newState: string): void {
    const state = ALL_THERE.includes(newState) ? undefined : newState
    this.setState(`${region}:${name}`, state ?? null)
    PrefStore.setAt(this.regionKey(name, region), state)
    if (region === DRAWER) PrefStore.setAt(this.regionKey(name, OLD_COMPACT_KEY), undefined)
  }

  /** Where it remembers layout `name`'s `region`:  `spell-sites:<Site>.<Layout>.<region>`. */
  private regionKey(name: string, region: string): string {
    return `${SITES_PREFS}:${this.constructor.name}.${name || BUILT_IN_KEY}.${region}`
  }

  /**
   * Its pages as its navigation lists them:  each one's title (its name without one), address and tags, its pages under it.
   * - A page with a parameter (`/films/:film`) isn't listed:  it's reached from a page, with a film to show.
   */
  navPages(): SiteNavPage[] {
    const listed = (entries: SitePageEntry[] | undefined): SiteNavPage[] =>
      SiteBase.underGroups(entries ?? [], (group) => listed(group))
    return listed(this.siteClass.pages)
  }

  /**
   * `entries` as navigation rows:  those under a `<group>` together, under its name, a quiet label with no arrow
   *   (`band: "group"`, epic `mockup` T34):  it opens by itself while the page shown is in it, and a click on it goes
   *   to its first page;  the rest as themselves.
   * - A group's row shows the icon its line names (`groupIcon`, epic `mockup` I20).
   * - A group with one listed page (`group "Home"` round the Home page and its dialogs) is that page alone,
   *   whatever its name, with no group's header over it (epic `mockup` I35, C2):  the page's own icon, else the group's.
   * - `listed` reads a run of entries that share a group, or none.
   */
  private static underGroups(
    entries: SitePageEntry[],
    listed: (entries: SitePageEntry[]) => SiteNavPage[]
  ): SiteNavPage[] {
    if (!entries.some((entry) => entry.group)) return SiteBase.navRows(entries, listed)
    const rows: SiteNavPage[] = []
    for (let at = 0; at < entries.length;) {
      const { group, groupIcon } = entries[at]!
      let end = at + 1
      while (end < entries.length && entries[end]!.group === group) end++
      const run = entries.slice(at, end)
      const pages = SiteBase.navRows(run, listed)
      const [only] = pages
      if (!group) rows.push(...pages)
      // a group of one listed page, whatever its name:  that page alone, no header (I35, C2)
      else if (pages.length === 1 && only) {
        rows.push({ ...only, ...(!only.icon && groupIcon && { icon: groupIcon }) })
      } else {
        rows.push({ title: group, id: `group:${group}`, band: "group", ...(groupIcon && { icon: groupIcon }), pages })
      }
      at = end
    }
    return rows
  }

  /** `entries` as navigation rows, each with its pages:  one with a parameter isn't listed. */
  private static navRows(entries: SitePageEntry[], listed: (entries: SitePageEntry[]) => SiteNavPage[]): SiteNavPage[] {
    return entries
      .filter((entry) => !entry.params?.length)
      .map((entry) => {
        const pages = listed(entry.pages ?? [])
        const page: SiteNavPage = {
          title: entry.title ?? entry.name,
          href: entry.address,
          id: entry.name,
          ...(entry.icon && { icon: entry.icon }),
          ...(entry.tab && { tab: entry.tab }),
          ...(entry.tags && { tags: entry.tags })
        }
        return pages.length ? { ...page, pages } : page
      })
  }

  /**
   * The address its navigation marks as shown:  the page shown, else the nearest page above it the navigation lists
   * (a film's page marks Films);  `""` for the not found and error pages.
   */
  navCurrent(): string {
    const listed = this.shownPath().filter((entry) => !entry.params?.length)
    return listed.at(-1)?.address ?? ""
  }

  /** The page shown, and the pages above it, from the site's top:  none for the not found and error pages. */
  private shownPath(): SitePageEntry[] {
    const showing = this.getState<Showing>("showing")
    if (showing?.kind !== "page") return []
    const pathTo = (entries: SitePageEntry[] | undefined, above: SitePageEntry[]): SitePageEntry[] | undefined => {
      for (const entry of entries ?? []) {
        // by name:  a page compiled in as it's shown leaves the site with a new list of the same pages
        if (entry.name === showing.entry.name) return [...above, entry]
        const found = pathTo(entry.pages, [...above, entry])
        if (found) return found
      }
      return undefined
    }
    return pathTo(this.siteClass.pages, []) ?? []
  }

  /**
   * A click on a link to one of its own addresses:  shown here, not loaded as a new page.
   * - A link to download a file, or one with its own `target`, is left to the browser.
   * - An address may end in a `#section`:  the part before it picks the page,
   *   and Spell UI's `HashLanding` lands on the section, as the docs site's links do.
   */
  followLink(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    const link = (event.composedPath() as Element[]).find((element) => element.localName === "a") as
      | HTMLAnchorElement
      | undefined
    const href = link?.getAttribute("href")
    if (!href?.startsWith("/") || href.startsWith("//") || link?.target || link?.hasAttribute("download")) return
    event.preventDefault()
    const [address = "", section] = href.split("#")
    this.navigate(address)
    if (section) core.siteHost?.landOn?.(section)
  }

  /** What it shows now:  its page, the not found page or the error page. */
  private drawShowing(): unknown {
    const showing = this.getState<Showing>("showing")
    if (!showing) return null
    // a page with nothing to draw yet (a new one, a mockup still to lay out) is an empty page, not a broken one
    if (showing.kind === "page") return showing.page.draw === Thing.prototype.draw ? null : core.drawThing(showing.page)
    if (showing.kind === "missing") return this.drawMissing(showing.address)
    if (showing.kind === "waiting") return this.drawWaiting(showing.entry)
    return this.drawFailed(showing.name, showing.error)
  }

  /** A page the site lists that no file declares yet:  its title, and that it's still to make. */
  private drawWaiting(entry: SitePageEntry): unknown {
    return h(
      "div",
      { class: "spell-site-missing" },
      h("h1", null, entry.title ?? entry.name),
      h("p", null, core.message("site-page-waiting"))
    )
  }

  /** The not found page:  the program's own, else a plain one;  while designing, one that offers to make the page. */
  private drawMissing(address: string): unknown {
    const own = this.ownPage(this.siteClass.notFoundPage)
    if (own) return core.drawThing(own)
    const host = core.siteHost
    return h(
      "div",
      { class: "spell-site-missing", role: "alert" },
      h("h1", null, core.message("site-no-such-page")),
      host?.createPage &&
        h(
          "p",
          null,
          core.message("site-create-page"),
          " ",
          h(
            "ui-button",
            { onClick: (_event: MouseEvent) => host.createPage?.(address) },
            core.message("site-create-it")
          )
        )
    )
  }

  /** The error page:  the program's own, else a plain one, saying what went wrong only while designing. */
  private drawFailed(name: string, error: unknown): unknown {
    const own = this.ownPage(this.siteClass.errorPage)
    if (own) return core.drawThing(own)
    const why = error instanceof Error ? error.message : String(error)
    return h(
      "div",
      { class: "spell-site-failed", role: "alert" },
      h("h1", null, core.message("site-page-failed")),
      core.siteHost?.createPage && h("p", null, core.message("site-page-failed-why", { page: name, why }))
    )
  }

  /** The open dialog (`<ui-modal>`) or sidebar (`<ui-flyout>`), drawing its view;  closing it forgets it. */
  private drawOverlay(): unknown {
    const overlay = this.getState<OpenOverlay>("overlay")
    if (!overlay) return null
    const tag = overlay.kind === "dialog" ? "ui-modal" : "ui-flyout"
    return h(
      tag,
      {
        visible: "",
        // its close icon:  a mockup's dialog or sidebar always has a way out (epic `mockup` P8)
        closable: "",
        heading: overlay.view ? undefined : overlay.entry.name,
        ...(overlay.kind === "sidebar" && { position: "right" }),
        // a getter handing over the handler:  `h()` reads any function on a dashed tag as a live value
        "on-ui-closed": () => (_event: Event) => this.closeOverlay()
      },
      // in the box's content part, which pads it as a dialog's or a sidebar's body
      overlay.view ? h("ui-content", {}, core.drawThing(overlay.view)) : null
    )
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Our class, with the statics the site's lines compiled to. */
  private get siteClass(): typeof SiteBase {
    return this.constructor as typeof SiteBase
  }

  /** The address it shows now, as the template's `current address` holds it. */
  private get currentAddressHere(): string | undefined {
    return this.getProp("currentAddress") as string | undefined
  }

  /** Each page's matcher, made once per site class. */
  private matchers(): { entry: SitePageEntry; match: ReturnType<typeof compilePattern> }[] {
    let made = MATCHERS.get(this.siteClass)
    if (!made) {
      made = this.allPages().map((entry) => ({ entry, match: compilePattern(entry.address) }))
      MATCHERS.set(this.siteClass, made)
    }
    return made
  }

  /** The program's page `entry` names:  the one its file made (`export const filmPage = new FilmPage()`). */
  private pageInstance(entry: SitePageEntry): Page | undefined {
    return (core.RUNTIME?.pages ?? []).find((page) => page.constructor.name === entry.page) as Page | undefined
  }

  /** The program's own not found or error page, when the site lists one and the program made it. */
  private ownPage(entry: SiteOverlayEntry | undefined): object | undefined {
    if (!entry?.view) return undefined
    return (core.RUNTIME?.pages ?? []).find((page) => page.constructor.name === entry.view)
  }

  /** The parameter of `entry` that `thing` fills:  the one whose property is of its type, else the first. */
  private paramFor(entry: SitePageEntry, thing: unknown): string | undefined {
    const params = entry.params ?? []
    const page = this.pageInstance(entry)
    const schema = page && schemaOf(page.constructor)
    const ofItsType = params.find((param) => {
      const Class = schema && core.things.classNamed(schema.typeOf(propertyFor(param)))
      return Class && thing instanceof Class
    })
    return ofItsType ?? params[0]
  }

  /** The views of its dialogs and sidebars, made the first time each opens, by name. */
  private overlayViews = new Map<string, object>()
}

////////////////
// ## Types and helpers
////////////////

/** One page as `<ui-site-nav pages>` takes it (Spell UI's `SiteNavPage`:  the core never imports Spell UI). */
type SiteNavPage = {
  title: string
  href?: string
  id: string
  icon?: string
  tab?: string
  tags?: string[]
  band?: "group"
  pages?: SiteNavPage[]
}

/** The store a site keeps what each person chose in:  `spell-sites:<Site>.<Layout>.compact`. */
const SITES_PREFS = "spell-sites"

/** The built-in frame's key in it:  a site with no main layout. */
const BUILT_IN_KEY = "frame"

/** The layout name of the site's built-in frame, for a site with no main layout:  the navigation and the page. */
const BUILT_IN_FRAME = ""

/** The layout name of a page drawn alone, whose line says `, no layout`. */
const JUST_THE_PAGE = "-"

/** `<ui-page-layout drawer>`'s word for a drawer that shows only its icons, and `ui-toggle`'s. */
const COMPACT = "compact"

/** The regions of `<ui-page-layout>` that close, each an attribute of it, and `ui-toggle`'s `region`. */
const DRAWER = "drawer"
const LEFT = "left"
const RIGHT = "right"
const LAYOUT_REGIONS = [DRAWER, LEFT, RIGHT] as const
/** A region of `<ui-page-layout>` that closes. */
export type LayoutRegion = (typeof LAYOUT_REGIONS)[number]

/** `ui-toggle`'s words for a region all there:  nothing to remember. */
const ALL_THERE = ["full", "shown"]

/** Where a drawer left compact was remembered before the other states (`regionState()`). */
const OLD_COMPACT_KEY = "compact"

/** What `<ui-page-layout>` sends when its drawer switches between its icons only and all of it. */
const TOGGLE = "ui-toggle"

/** What `<ui-site-nav>` sends when a page is picked:  cancelled, the site shows it itself. */
const NAVIGATING = "ui-navigating"

/** A page layout's slot drawings, each a method of the layout, or of a page that draws that slot itself. */
type LayoutSlot = "drawDrawer" | "drawAppMenu" | "drawPageMenu" | "drawLeftSidebar" | "drawRightSidebar" | "drawFooter"

/**
 * How a site fills the box Run gives it:  its page layout the whole height of that box, the layouts not shown hidden.
 * - The regions themselves are `<ui-page-layout>`'s:  a slot's wrapper is only a way into it.
 */
const SITE_CSS = `
/* the whole height of the box its element is drawn in (Run's):  that element, whatever its tag, a column */
:has(> .spell-site-frame) { display: flex; flex-direction: column; min-height: 100% }
.spell-site-frame { flex: 1 0 auto; display: flex; flex-direction: column }
.spell-site, .spell-site-alone { flex: 1 0 auto }
.spell-site[hidden], .spell-site-alone[hidden] { display: none }
.spell-site-slot { display: contents }
`

/** What a site shows:  a page, the not found page for an address, or the error page for a page that failed. */
type Showing =
  | { kind: "page"; page: Page; entry: SitePageEntry }
  | { kind: "missing"; address: string }
  | { kind: "waiting"; entry: SitePageEntry }
  | { kind: "failed"; name: string; error: unknown }

/** The dialog or sidebar open over the page, and the view it draws, if it has one. */
type OpenOverlay = { kind: "dialog" | "sidebar"; entry: SiteOverlayEntry; view?: object }

/**
 * `drawing` made now, if it's `h()`'s thunk:  a live part of the site's drawing that changes to nothing takes its
 * element with it.  Handed back as a thunk, the element stayed on the page when the dialog closed.
 */
function made(drawing: unknown): unknown {
  return isElementThunk(drawing) ? drawing() : drawing
}

/**
 * A themed site's own text and page:  its theme's font, colour and background, read from the tokens it wears.
 * - Inherited text was worked out on the page around it, in the page's theme:  so it's said again here.
 */
const THEMED_FRAME =
  "font-family: var(--ui-font-family);  font-size: var(--ui-font-size);  color: var(--ui-text-color);  " +
  "background-color: var(--ui-background)"

/** Each site class's matchers, made once. */
const MATCHERS = new WeakMap<Function, { entry: SitePageEntry; match: ReturnType<typeof compilePattern> }[]>()

/** The property a parameter fills:  `film` => `film`, `person id` / `person_id` => `personId`. */
function propertyFor(param: string): string {
  return param.replace(/[\s_-]+(\p{L})/gu, (_whole, letter: string) => letter.toUpperCase())
}

/**
 * What goes in an address for `value`:  a thing's id, from the place it's kept in when it's saved;
 * anything else as it is.
 * - An id that's a web address, as a web server's often are (`https://swapi.py4e.com/api/films/1/`):
 *   its last part, `1`, so the site's address reads `/films/1`;  `valueFor()` finds the thing again by it.
 */
function idInAddressOf(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value
  if (value === undefined || value === null || typeof value === "function") return undefined
  if (typeof value !== "object") return String(value as boolean | bigint | symbol)
  const id = core.savedIdOf(value) ?? (value as { id?: unknown }).id
  if (typeof id !== "string") return typeof id === "number" ? id : undefined
  return WEB_ADDRESS.test(id) ? lastPartOf(id) : id
}

/** An id that's a web address:  `https://...`. */
const WEB_ADDRESS = /^[a-z][a-z0-9+.-]*:\/\//i

/** The last part of web address `id`'s path:  `https://swapi.py4e.com/api/films/1/` => `1`. */
function lastPartOf(id: string): string {
  return new URL(id).pathname.split("/").filter(Boolean).at(-1) ?? id
}

/** Is `id` the thing an address's `part` names:  the same, or a web address whose last part it is? */
function isNamedBy(id: unknown, part: string): boolean {
  if (typeof id !== "string") return false
  return id === part || (WEB_ADDRESS.test(id) && lastPartOf(id) === part)
}

/**
 * The value page `page`'s property `property` takes from `id`, an address's part, by the property's type:
 * - a type of the program's own:  its thing with that id among the program's things, else read from the place it's
 *   saved in;  an id that's a web address matches by its last part (`idInAddressOf()`)
 * - a number:  the number;  anything else:  the text as it is
 * - throws when the type's place says no
 */
async function valueFor(page: object, property: string, id: string): Promise<unknown> {
  const type = schemaOf(page.constructor).typeOf(property)
  if (type === "number") return Number(id)
  // a class's name is capitalised (`Film`), a built-in type's isn't (`text`):  only a class is waited for
  // a type another project declares is known once the runner hands over that project's classes, which it does just
  // after the program first runs:  a site opened at a film's address asks for the film before then (epic `mockup` P8)
  const isAClass = /^[A-Z]/.test(type)
  const Class = (core.things.classNamed(type) ??
    (isAClass ? await waitUntil(() => core.things.classNamed(type), { timeout: CLASS_WAIT }) : undefined)) as
    | (Function & { savedIn?: unknown })
    | undefined
  if (!Class) return id
  const known = core.things
    .all()
    .find((thing) => thing instanceof Class && isNamedBy(core.savedIdOf(thing) ?? (thing as { id?: unknown }).id, id))
  if (known || !Class.savedIn) return known
  const byId = await core.savedThingWithId(Class as new () => unknown, id).catch(() => undefined)
  if (byId) return byId
  // an id that's only the last part of a web address:  every one of them read, to find it among them
  const { items } = await core.savedThings(Class as new () => unknown)
  return items.find((thing) => isNamedBy(core.savedIdOf(thing) ?? (thing as { id?: unknown }).id, id))
}

/** How long a parameter's lookup waits for its type's class to be known, in seconds:  see `valueFor()`. */
const CLASS_WAIT = 5

/** The first property `View` declares of `thing`'s type, for a dialog or sidebar opened with a thing. */
function firstPropertyOf(View: Function, thing: unknown): string | undefined {
  const schema = schemaOf(View)
  // every prop it declares, its superclasses' first:  not only those made with it (a sidebar's `person` has no value)
  const declared: string[] = []
  for (let each: typeof schema | undefined = schema; each; each = each.parent) declared.unshift(...each.declared.keys())
  return declared.find((name) => {
    const Class = core.things.classNamed(schema.typeOf(name))
    return Class && thing instanceof Class
  })
}

export type { SiteHost }
