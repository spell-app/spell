import h from "@solidjs/h"
import {
  For,
  createEffect,
  createMemo,
  createRoot,
  getOwner,
  onCleanup,
  runWithOwner,
  untrack,
  type Owner
} from "solid-js"

import { PrefStore, schemaOf } from "spell/util"
import { MostRecent } from "spell/util/MostRecent"
import { waitUntil } from "spell/util/timing"
import {
  compilePattern,
  filledPattern,
  optionalParamsOf,
  paramsOf,
  requiredParamsOf,
  type AddressParams
} from "spell/util/addressPattern"

import { core } from "spell/parser/core/core"
import type { SiteHost, SiteLinkEntry, SiteOverlayEntry, SitePageEntry } from "spell/parser/core/core.types"
import { followsEditsOf, isElementThunk, type Drawing } from "spell/parser/core/drawing"
import { drawnWithLook, pageWaitingLoader } from "spell/parser/core/waiting"
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
 *   - A parameter that may be left out, `/settings/:section?`:  `/settings` shows the page with its `section` at its
 *     starting value (`startingValues()`), `/settings/billing` with it `"billing"`.
 * - A TEXT parameter the page changes itself (tabs bound to its `section`) writes the page's address, a step in the
 *   history, the page not drawn again;  Back and Forward set it back the same way (`followParams()`, `sameDrawing()`).
 * - The dialog or sidebar open is in the address's hash, `#confirm-order/1042` (`hashOf()`):  opening one writes
 *   it, closing it takes it out, and an address with it opens it (`showPart()`);  a hash naming none is a section.
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

  /**
   * Its links out, among its pages in its navigation:  `- it has a link to "https://docs.example.com"`.
   * A page's own are in its entry's `links`.
   */
  static links: SiteLinkEntry[] = []

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

  /**
   * Its first page with no parameters it can't do without, to show at `/` when no page is there:  `undefined` for
   * none.
   */
  firstPage(): { entry: SitePageEntry; params: AddressParams } | undefined {
    const entry = this.allPages().find((page) => !needsValues(page))
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
    void this.navigate(this.addressWith(name, thing), param ? { [propertyFor(param)]: thing } : {})
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
    const entry = this.entryNamed(name)
    if (thing == null && entry && needsValues(entry)) return ""
    return this.addressWith(name, thing ?? undefined)
  }

  /**
   * Go to `address`:  through the host when there is one (the editor's Run puts it in its URL), and shown here at once.
   * - `known`:  a parameter's thing, when the program handed it over:  no need to look it up again.
   * - Resolves once its page is shown (`showAddress()`):  a link's `#section` is landed on then, not on the page left.
   * - NEVER rejects.
   */
  navigate(address: string, known: Record<string, unknown> = {}): Promise<void> {
    core.siteHost?.go(address)
    return this.showAddress(address, known)
  }

  /**
   * Show what `address` names, now:  its page, its parameters filled in, else the not found page.
   * - Each parameter fills the page's property of its name, looked up by its type:  a thing of the program, or one in
   *   the place its type is saved in (`core.savedThingWithId()`).
   * - A lookup that fails shows the error page.
   * - A parameter left out (`/settings/:section?` at `/settings`) sets its property back to its starting value.
   * - The page shown at another address that differs only in its text parameters that may be left out, its tabs'
   *   (Back from `/settings/team` to `/settings/api-keys`):  its properties set, the page not drawn again
   *   (`sameDrawing()`).  One that differs in another (`/racks/b16` after `/racks/d16`) is drawn afresh, as before.
   * - The same address again does nothing, unless it showed no page:  a page made for it since shows
   *   (the editor's "Create it", epic `mockup` P4).
   * - NEVER throws:  what goes wrong is shown on the page.
   */
  showAddress(address: string, known: Record<string, unknown> = {}): Promise<void> {
    const shown = this.showAddressNow(address, known)
    this.lastShown = shown
    return shown
  }

  /** The last address asked for, once it's shown:  a part named in its hash opens after (`showPart()`). */
  private lastShown: Promise<void> = Promise.resolve()

  /** `showAddress()`'s work. */
  private async showAddressNow(address: string, known: Record<string, unknown>): Promise<void> {
    const showing = this.getState("showing") as Showing | undefined
    if (address === this.currentAddressHere && showing && showing.kind === "page") return
    this.closeOverlay()
    const before = this.currentAddressHere
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
    const starting = this.startingValues(page, found.entry)
    // the page shown, only its text parameters changed:  set, not drawn again
    if (showing?.kind === "page" && showing.page === page && before !== undefined) {
      if (this.sameDrawing(showing, found.params, starting, address)) return
    }
    // each parameter left out at its starting value
    for (const param of optionalParamsOf(found.entry.address)) {
      if (!(param in found.params)) (page as unknown as Record<string, unknown>)[propertyFor(param)] = starting[param]
    }
    // its parameters' things are read first:  meanwhile its layout, a spinner in the page's room
    if (Object.keys(found.params).some((param) => !(propertyFor(param) in known)))
      this.showNow({ kind: "loading", page, entry: found.entry })
    try {
      for (const [param, id] of Object.entries(found.params)) {
        const property = propertyFor(param)
        const value = property in known ? known[property] : await valueFor(page, property, id)
        // a newer address came while this one waited:  it wins
        if (this.currentAddressHere !== address) return
        ;(page as unknown as Record<string, unknown>)[property] = value
      }
      this.showNow({ kind: "page", page, entry: found.entry, address })
    } catch (error) {
      if (this.currentAddressHere === address) this.showFailure(found.entry.name, error)
    }
  }

  /**
   * The values page `page`'s parameters that may be left out have before any address sets them, by parameter:
   * what the page gives them as it's made (`when creating it`), else nothing.  What a parameter left out goes back to.
   * - Read the first time the page is shown, and kept.
   */
  private startingValues(page: Page, entry: SitePageEntry): Record<string, unknown> {
    let values = this.startingByPage.get(page)
    if (!values) {
      values = {}
      for (const param of optionalParamsOf(entry.address))
        values[param] = (page as unknown as Record<string, unknown>)[propertyFor(param)]
      this.startingByPage.set(page, values)
    }
    return values
  }

  /** Each page's starting values, `startingValues()`. */
  private startingByPage = new WeakMap<Page, Record<string, unknown>>()

  /**
   * Show page `showing` at `address`, whose parameters are `params`, in the same drawing, when only its text
   * parameters that may be left out differ:  each set (a parameter left out to its starting value), the drawing kept under the new address
   * (`KeptPages.move()`).  Answers whether it did;  `false`:  `address` is drawn as any other is.
   */
  private sameDrawing(
    showing: Extract<Showing, { kind: "page" }>,
    params: AddressParams,
    starting: Record<string, unknown>,
    address: string
  ): boolean {
    const { page, entry } = showing
    const record = page as unknown as Record<string, unknown>
    const shownAt = this.pageFor(showing.address)?.params ?? {}
    const changed = paramsOf(entry.address).filter((param) => shownAt[param] !== params[param])
    // a tab's:  a text parameter that may be left out;  another (a rack's `:picked`) is drawn afresh, as before
    const tabs = new Set(optionalParamsOf(entry.address))
    if (!changed.every((param) => tabs.has(param) && isTextParam(page, param))) return false
    for (const param of changed) record[propertyFor(param)] = param in params ? params[param] : starting[param]
    this.moveDrawing(showing.address, address)
    this.showNow({ ...showing, address })
    return true
  }

  /** Keep the drawing at address `from` as the drawing at `to`, in each layout:  shown again, not drawn again. */
  private moveDrawing(from: string, to: string): void {
    for (const kept of this.keptPages) kept.move(from, to)
  }

  /** Each layout's last pages drawn, `KeptPages`:  one per layout drawn. */
  private keptPages = new Set<KeptPages>()

  /**
   * Follow the text parameters of page `showing` as the page changes them (tabs bound to its `section`):  each change
   * writes its address, through the host, a step in the history, the page not drawn again.
   * - A parameter at its starting value, with none after it filled, is left out:  `/settings` for its first tab.
   * - What it followed before is let go:  one page followed at a time.
   */
  private followParams(showing: Extract<Showing, { kind: "page" }>): void {
    this.stopFollowing?.()
    this.stopFollowing = undefined
    const { page, entry } = showing
    const params = paramsOf(entry.address).filter((param) => isTextParam(page, param))
    if (!params.length) return
    const record = page as unknown as Record<string, unknown>
    const starting = this.startingValues(page, entry)
    const optional = new Set(optionalParamsOf(entry.address))
    let pending: ReturnType<typeof setTimeout> | undefined
    createRoot((dispose) => {
      this.stopFollowing = () => {
        clearTimeout(pending)
        dispose()
      }
      createEffect(
        () => params.map((param) => record[propertyFor(param)]),
        () => {
          // written once the event that changed them is over:  a pick that sets a tab and starts its own tab afresh
          // (two listeners, with a microtask checkpoint between them) is ONE step in the history
          clearTimeout(pending)
          pending = setTimeout(() => this.writeParams(page, entry, params, starting, optional))
        }
      )
    })
  }

  /**
   * Write page `page`'s address as its text parameters `params` now are, `followParams()`'s:  through the host, a step
   * in the history, the drawing kept;  nothing when it's its address already, or another page is shown.
   */
  private writeParams(
    page: Page,
    entry: SitePageEntry,
    params: string[],
    starting: Record<string, unknown>,
    optional: Set<string>
  ): void {
    const record = page as unknown as Record<string, unknown>
    const values = params.map((param) => record[propertyFor(param)])
    const current = this.getState<Showing>("showing")
    // another page shown since, or another site the program's now (a new run)
    if (current?.kind !== "page" || current.page !== page || core.RUNTIME?.site !== this) return
    const shownAt = this.pageFor(current.address)?.params ?? {}
    const differs = params.some((param, at) => (shownAt[param] ?? starting[param] ?? "") !== (values[at] ?? ""))
    if (!differs) return
    // left out from the end while at its starting value
    const filled: Record<string, unknown> = { ...shownAt }
    params.forEach((param, at) => (filled[param] = values[at]))
    const names = paramsOf(entry.address)
    for (let at = names.length - 1; at >= 0; at--) {
      const param = names[at]!
      if (!optional.has(param) || (filled[param] !== starting[param] && filled[param] !== "")) break
      filled[param] = undefined
    }
    let address: string
    try {
      address = filledPattern(entry.address, filled as Record<string, string | undefined>)
    } catch {
      return
    }
    if (address === current.address) return
    this.moveDrawing(current.address, address)
    this.setProp("currentAddress", address)
    this.showNow({ ...current, address })
    core.siteHost?.go(address, { keepScroll: true })
  }

  /** Lets go of what `followParams()` follows. */
  private stopFollowing?: () => void

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

  /**
   * Open dialog or sidebar `entry`, its view's first property set to `thing`, if any.
   * - Its name goes in the address's hash, a step in the history (`SiteHost.partOpened()`, `hashOf()`):
   *   `#confirm-order/1042`.  `fromAddress`:  the address named it already, so it isn't written again.
   */
  openOverlay(
    kind: "dialog" | "sidebar",
    entry: SiteOverlayEntry,
    thing?: unknown,
    { fromAddress = false }: { fromAddress?: boolean } = {}
  ): void {
    const view = this.overlayView(entry)
    if (view) {
      const property = thing === undefined ? undefined : firstPropertyOf(view.constructor, thing)
      if (property) (view as Record<string, unknown>)[property] = thing
    }
    this.setState("overlay", { kind, entry, view } satisfies OpenOverlay)
    if (!fromAddress) core.siteHost?.partOpened?.(hashOf(entry.name, idInAddressOf(thing)))
  }

  /** The view dialog or sidebar `entry` draws, made the first time it opens:  `undefined` for one with none. */
  private overlayView(entry: SiteOverlayEntry): object | undefined {
    const View = entry.view ? core.things.classNamed(entry.view) : undefined
    const view = View ? (this.overlayViews.get(entry.name) ?? new (View as new () => object)()) : undefined
    if (view) this.overlayViews.set(entry.name, view)
    return view
  }

  /**
   * Close dialog or sidebar `name`, if it's the one open:
   * what `close the review dialog` compiles to (`core.closeSitePart()`).
   * - Its hash goes from the address (`SiteHost.partClosed()`).
   * - throws `TypeError` for a name that's none of the site's dialogs or sidebars:  a page isn't closed, it's left
   */
  close(name: string): void {
    if (!this.overlayNamed(name))
      throw new TypeError(`SiteBase.close():  ${this.constructor.name} has no dialog or sidebar "${name}";  list it`)
    if (this.getState<OpenOverlay>("overlay")?.entry.name === name) this.closedByPerson()
  }

  /**
   * Close the open dialog or sidebar, if any, leaving the address as it is:  the address changed already (another
   * page, Back).
   */
  closeOverlay(): void {
    this.setState("overlay", undefined)
  }

  /** Close the open dialog or sidebar as the program or the person closes it:  its hash taken out of the address. */
  private closedByPerson(): void {
    if (!this.getState<OpenOverlay>("overlay")) return
    this.closeOverlay()
    core.siteHost?.partClosed?.()
  }

  /**
   * Open the dialog or sidebar address hash `hash` names, `confirm-order/1042` (`hashOf()`), once the page its address
   * names is shown:  the host asks, as a page is opened at an address with a hash, and on Back and Forward.
   * - Its thing, from the id after its name, looked up as a page's parameter is (`valueFor()`), into its view's first
   *   property of a thing's type.
   * - `""`:  none is open;  the one open closes.
   * - Answers whether `hash` names one;  `false`:  it's a `#section` of the page, for the host to land on.
   * - NEVER throws:  a thing that can't be read opens nothing, said on the console.
   */
  async showPart(hash: string): Promise<boolean> {
    // the address the host heard with it is shown first:  showing it closes any dialog open
    await new Promise((resolve) => setTimeout(resolve))
    await this.lastShown
    const [name = "", ...rest] = hash.split("/")
    if (!name) {
      this.closeOverlay()
      return true
    }
    const part = this.partWithHash(name)
    if (!part) return false
    const id = rest.length ? safelyDecoded(rest.join("/")) : undefined
    const open = this.getState<OpenOverlay>("overlay")
    let thing: unknown
    if (id !== undefined) {
      const view = this.overlayView(part.entry)
      const property = view && firstThingPropertyOf(view.constructor)
      try {
        thing = view && property ? await valueFor(view, property, id) : id
      } catch (error) {
        console.warn(`SiteBase:  can't open ${part.entry.name} for "${id}"`, error)
        return true
      }
    }
    if (open?.entry === part.entry && thing === undefined) return true
    this.openOverlay(part.kind, part.entry, thing, { fromAddress: true })
    return true
  }

  /** The dialog or sidebar whose hash is `name`, `confirm-order`, any case:  `undefined` for none. */
  private partWithHash(name: string): { kind: "dialog" | "sidebar"; entry: SiteOverlayEntry } | undefined {
    const wanted = name.toLowerCase()
    const dialog = this.siteClass.dialogs?.find((entry) => hashOf(entry.name) === wanted)
    if (dialog) return { kind: "dialog", entry: dialog }
    const sidebar = this.siteClass.sidebars?.find((entry) => hashOf(entry.name) === wanted)
    return sidebar && { kind: "sidebar", entry: sidebar }
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
    void this.showAddress(host?.address(this) ?? this.currentAddressHere ?? "/")
    host?.listen((address) => this.showAddress(address))
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
   * Ask the host for its theme's look, worn by its frame alone (`SiteHost.themeTokens()`):  one of Spell UI's, or the
   * project's own, in its folder.
   * - NEVER throws:  a theme the host can't give leaves the page's, said on the console.
   */
  private wearTheme(): void {
    const name = this.themeName
    const host = core.siteHost
    if (!name || !host?.themeTokens) return
    host.themeTokens(name, core.projectFolder).then(
      (tokens) => this.setState("themeTokens", tokens),
      (error: unknown) => console.warn(`SiteBase:  can't wear theme "${name}";  it wears the page's`, error)
    )
  }

  /**
   * The page it shows, in its page layout, and an open dialog or sidebar over it (epic `mockup` P3, T39).
   * - Its page layout:  Spell UI's `<ui-page-layout>`, its slots drawn by the layout the page is in
   *   (`layoutNameFor()`):  its app menu, page menu, drawer, side bars and footer;  the page in its middle.
   *   - Its drawer holds the site's navigation, `<ui-site-nav>`, its pages the site's, nested as its lines nest them
   *     (`navPages()`), unless the layout draws its drawer itself:  then a `<site-nav>` in what it draws is the
   *     site's navigation, its pages filled in (`fillNav()`), and what's around it the layout's own (a logo above
   *     it, a row of buttons in its `end` slot).
   *   - A slot the page shown draws itself (`to draw its right sidebar`) is the page's while it's shown.
   * - Drawn ONCE per layout, and kept:  going to a page in the same layout redraws only the page, so nothing around
   *   it flashes;  a page in another layout shows that one, and the first is kept, hidden, as it was left.
   * - Each layout keeps its last 3 pages drawn (`KeptPages`, epic `solid-2-final` P13):  Back is instant.
   *   Kept by ADDRESS:  a page at another address (`/racks/b16` after `/racks/d16`) is drawn afresh, so nothing
   *   its views chose at the last one carries over.
   * - A site with no main layout draws every page in its built-in frame:  the navigation and the page.
   *   A page whose line says `, no layout` is drawn alone.
   *   A page whose line says `, filling the window` makes its layout the window's height (`shownFillsWindow`).
   * - Not `<ui-page>`:  that's a whole window's frame and root, and Run draws the site inside the editor's page.
   * - A link on the page to one of its addresses goes there without leaving the page (`followLink()`).
   * - What waits on its pages looks as its `loading` says:  `"skeleton"`, `"spinner"` (the default), `"none"`, or
   *   a spinner's words (`core.drawLooking()`).
   */
  draw(): Drawing {
    // how what waits looks on every page:  its own `loading` property, `with loading "skeleton"` (`WaitingLook`)
    return drawnWithLook(
      () => (this as unknown as { loading?: unknown }).loading,
      () => this.drawFrame()
    )
  }

  /** Its frame:  the page layouts drawn, and an open dialog or sidebar over them -- see `draw()`. */
  private drawFrame(): Drawing {
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
    const picked = isAPage(showing) ? (showing.page.constructor as { layout?: string | false }).layout : undefined
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

  /**
   * Does the page shown fill the window:  its line says `, filling the window` (`static fillsWindow`).
   * Its layout is then exactly the window's height (`<ui-page-layout page-height="fluid">`),
   * and the page's `height="fluid"` boxes share out what's left under its menus.
   */
  get shownFillsWindow(): boolean {
    const showing = this.getState<Showing>("showing")
    return isAPage(showing) && !!(showing.page.constructor as { fillsWindow?: boolean }).fillsWindow
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
   *   (`layoutsDrawn`);  a page's text parameters are followed (`followParams()`).
   */
  private showNow(showing: Showing): void {
    const name = this.layoutNameFor(showing)
    if (!this.layoutsDrawn.includes(name)) this.setState("layoutsDrawn", [...this.layoutsDrawn, name])
    this.setState("shownLayout", name)
    const was = this.getState<Showing>("showing")
    this.setState("showing", showing)
    if (showing.kind !== "page") {
      this.stopFollowing?.()
      this.stopFollowing = undefined
    } else if (was?.kind !== "page" || was.page !== showing.page || was.entry !== showing.entry)
      this.followParams(showing)
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
    const kept = new KeptPages(getOwner())
    this.keptPages.add(kept)
    onCleanup(() => this.keptPages.delete(kept))
    const page = () => (isShown() ? this.drawShowingIn(kept) : null)
    if (name === JUST_THE_PAGE)
      return h("div", { class: "spell-site-alone", hidden: () => (isShown() ? undefined : "") }, page)
    const layout = name === BUILT_IN_FRAME ? undefined : this.layoutNamed(name)
    return h(
      "ui-page-layout",
      {
        class: "spell-site",
        "data-layout": name || undefined,
        hidden: () => (isShown() ? undefined : ""),
        // the page shown fills the window, its height shared out:  its line says `, filling the window`
        "page-height": () => (isShown() && this.shownFillsWindow ? "fluid" : undefined),
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
        : this.drawSlot(layout, "drawDrawer", "drawer", (drawing) => this.fillNavsIn(drawing)),
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
   * - And when an edit changes the type of who draws it (`followsEditsOf()`):  a part added to the layout's footer
   *   shows at once (epic `editor` P35).
   */
  private drawSlot(layout: PageLayout, slot: LayoutSlot, region: string, drawn?: (drawing: unknown) => void): unknown {
    const drawer = createMemo(() => {
      const showing = this.getState<Showing>("showing")
      const page =
        showing?.kind === "page" && this.shownLayoutName === layout.constructor.name ? showing.page : undefined
      return page && typeof (page as unknown as Record<string, unknown>)[slot] === "function" ? page : layout
    })
    return () => {
      followsEditsOf(drawer())
      const drawing = made((drawer() as unknown as Record<LayoutSlot, () => unknown>)[slot]())
      drawn?.(drawing)
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
      ...this.navValues(),
      // a listener, not an `on-ui-navigating` attribute:  Solid warns about a function on an attribute
      ref: (element: Element) => this.followNav(element)
    })
  }

  /**
   * The live attributes of the site's navigation:  its pages, the one shown, and the pages below it it doesn't list.
   * - JSON text, which the attribute takes:  where Spell UI isn't loaded, a list would be written `[object Object]`.
   */
  private navValues(headings = false): Record<string, () => string | undefined> {
    return {
      pages: () => JSON.stringify(this.navPages({ headings })),
      current: () => this.navCurrent(),
      // the pages it doesn't list, below `current`, for `<ui-site-breadcrumbs>`
      "data-shown": () => JSON.stringify(this.navShownBelow())
    }
  }

  /** Go where `nav` goes:  one of the site's own pages shown here, a link out of the site in a new tab. */
  private followNav(nav: Element): void {
    nav.addEventListener(NAVIGATING, (event) => {
      event.preventDefault()
      const { href } = (event as CustomEvent<{ href: string }>).detail
      // a link out of the site (`- it has a link to ...`):  a new tab, the site left as it is
      if (SiteBase.isOwnAddress(href)) void this.navigate(href)
      else globalThis.open?.(href, "_blank", "noopener")
    })
  }

  /**
   * Each `<ui-site-nav>` a layout's own drawer draws with no `pages` (`<site-nav groups="headings">`):  the site's
   * navigation (`fillNav()`).  A navigation with its own `pages` is left as it is.
   */
  private fillNavsIn(drawing: unknown): void {
    const elements = (Array.isArray(drawing) ? drawing.flat(Infinity) : [drawing]).filter(
      (each): each is Element => typeof Element !== "undefined" && each instanceof Element
    )
    for (const element of elements) {
      const navs = element.localName === SITE_NAV ? [element] : [...element.querySelectorAll(SITE_NAV)]
      for (const nav of navs) if (!nav.hasAttribute("pages")) this.fillNav(nav)
    }
  }

  /**
   * Make `nav`, drawn by a layout, the site's navigation, as `drawNav()` draws it:  its live pages and the one shown,
   * going to a page when one's picked, and kept open as each person leaves it;  its own attributes kept
   * (`groups`, `appearance` ...).
   * - Its effects belong to the drawing of the drawer:  drawn again, they go with it.
   */
  private fillNav(nav: Element): void {
    nav.classList.add("spell-site-nav")
    if (!nav.hasAttribute("appearance")) nav.setAttribute("appearance", "nav")
    if (!nav.hasAttribute("remember")) nav.setAttribute("remember", this.constructor.name)
    for (const [name, value] of Object.entries(this.navValues(nav.getAttribute("groups") === "headings")))
      createEffect(value, (text) => {
        if (text === undefined) nav.removeAttribute(name)
        else nav.setAttribute(name, text)
      })
    this.followNav(nav)
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
   *   One whose parameters may all be left out (`/settings/:section?`) is, at its address without them.
   * - Its links out (`static links`, a page's `links`) among them, each where its line is.
   * - `headings`:  for a navigation whose groups are headings (`<site-nav groups="headings">`, I35), a group of one
   *   page keeps its heading;  else it's that page alone (`underGroups()`).
   */
  navPages({ headings = false }: { headings?: boolean } = {}): SiteNavPage[] {
    const listed = (pages: SitePageEntry[] | undefined, links: SiteLinkEntry[] | undefined): SiteNavPage[] =>
      SiteBase.underGroups(
        SiteBase.withLinks(pages ?? [], links ?? []),
        (entry) => listed(entry.pages, entry.links),
        headings
      )
    return listed(this.siteClass.pages, this.siteClass.links)
  }

  /** `pages` with `links` among them, each after the first `at` pages, in their lines' order. */
  private static withLinks(pages: SitePageEntry[], links: SiteLinkEntry[]): NavEntry[] {
    if (!links.length) return pages
    const entries: NavEntry[] = []
    pages.forEach((page, at) => {
      entries.push(...links.filter((link) => link.at === at), page)
    })
    entries.push(...links.filter((link) => link.at >= pages.length))
    return entries
  }

  /** Is `href` one of the site's own addresses, from its root (`/films`), not a link out of it? */
  private static isOwnAddress(href: string): boolean {
    return href.startsWith("/") && !href.startsWith("//")
  }

  /**
   * `entries` as navigation rows:  those under a `<group>` together, under its name, a quiet label with no arrow
   *   (`band: "group"`, epic `mockup` T34):  it opens by itself while the page shown is in it, and a click on it goes
   *   to its first page;  the rest as themselves.
   * - A group's row shows the icon its line names (`groupIcon`, epic `mockup` I20).
   * - A group with one listed page (`group "Home"` round the Home page and its dialogs) is that page alone,
   *   whatever its name, with no group's header over it (epic `mockup` I35, C2):  the page's own icon, else the group's.
   * - `listed` reads the rows under a page.
   */
  private static underGroups(
    entries: NavEntry[],
    listed: (entry: SitePageEntry) => SiteNavPage[],
    keepsLoneGroups = false
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
      // a group with no page listed (each `, not in the navigation`):  nothing
      else if (!pages.length) {
        // nothing
      }
      // a group of one listed page, whatever its name:  that page alone, no header (I35, C2);  a heading kept over it
      else if (pages.length === 1 && only && !keepsLoneGroups) {
        rows.push({ ...only, ...(!only.icon && groupIcon && { icon: groupIcon }) })
      } else {
        // a group of links out only never holds the page shown, so never opens by itself:  it starts open
        const linksOnly = run.every((entry) => "link" in entry)
        rows.push({
          title: group,
          id: `group:${group}`,
          band: "group",
          ...(groupIcon && { icon: groupIcon }),
          ...(linksOnly && { open: true }),
          pages
        })
      }
      at = end
    }
    return rows
  }

  /**
   * `entries` as navigation rows, each page with its pages:  one with a parameter isn't listed, nor one whose line
   * says `, not in the navigation` (`unlisted`).
   */
  private static navRows(entries: NavEntry[], listed: (entry: SitePageEntry) => SiteNavPage[]): SiteNavPage[] {
    return entries
      .filter((entry) => "link" in entry || (!needsValues(entry) && !entry.unlisted))
      .map((entry) => {
        // a link out:  its address, picked as any row is (the drawer opens it in a new tab)
        if ("link" in entry) {
          return {
            title: entry.title ?? entry.link,
            href: entry.link,
            id: `link:${entry.link}`,
            ...(entry.icon && { icon: entry.icon })
          }
        }
        const pages = listed(entry)
        const page: SiteNavPage = {
          title: entry.title ?? entry.name,
          href: plainAddressOf(entry),
          id: entry.name,
          ...(entry.icon && { icon: entry.icon }),
          ...(entry.tab && { tab: entry.tab }),
          ...(entry.tags && { tags: entry.tags }),
          // the real page it stands for, which `<ui-site-links>` links to (epic `mockup` T55)
          ...(entry.live && { live: entry.live })
        }
        return pages.length ? { ...page, pages } : page
      })
  }

  /**
   * The address its navigation marks as shown:  the page shown, else the nearest page above it the navigation lists
   * (a film's page marks Films);  `""` for the not found and error pages.
   */
  navCurrent(): string {
    const listed = this.shownPath().filter((entry) => !needsValues(entry) && !entry.unlisted)
    const entry = listed.at(-1)
    return entry ? plainAddressOf(entry) : ""
  }

  /**
   * The titles of the pages shown below `navCurrent()`, which the navigation doesn't list, top first:  a film's page,
   * `["Film"]`, below Films.  `<ui-site-breadcrumbs>` ends its trail with them.
   */
  navShownBelow(): string[] {
    const path = this.shownPath()
    let listed = path.length
    while (listed > 0 && (needsValues(path[listed - 1]!) || path[listed - 1]!.unlisted)) listed--
    return path.slice(listed).map((entry) => entry.title ?? entry.name)
  }

  /** The page shown, and the pages above it, from the site's top:  none for the not found and error pages. */
  private shownPath(): SitePageEntry[] {
    const showing = this.getState<Showing>("showing")
    if (!isAPage(showing)) return []
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
   * - An address may end in a `#section`:  the part before it picks the page, and the host lands on the section
   *   (`SiteHost.landOn()`) once that page is shown, as the docs site's links do.
   *   - Not before:  the page being left may have a section of the same id (Button's Usage and Examples both have
   *     "State texts"), and the landing would find that one (epic `editor` I293).
   */
  followLink(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    const link = (event.composedPath() as Element[]).find((element) => element.localName === "a") as
      | HTMLAnchorElement
      | undefined
    const href = link?.getAttribute("href")
    if (!href || !SiteBase.isOwnAddress(href) || link?.target || link?.hasAttribute("download")) return
    event.preventDefault()
    const [address = "", section] = href.split("#")
    const shown = this.navigate(address)
    if (section) void shown.then(() => core.siteHost?.landOn?.(section))
  }

  /**
   * What it shows now, in a layout that keeps the last pages it drew (`kept`):  a page drawn before is shown again as it
   * was left, at once;  anything else as `drawShowing()` draws it.
   */
  private drawShowingIn(kept: KeptPages): unknown {
    const showing = this.getState<Showing>("showing")
    if (showing?.kind === "page" && showing.page.draw !== Thing.prototype.draw) return kept.drawingOf(showing.page, showing.address)
    return made(this.drawShowing())
  }

  /** What it shows now:  its page (a spinner while its parameters are read), the not found page or the error page. */
  private drawShowing(): unknown {
    const showing = this.getState<Showing>("showing")
    if (!showing) return null
    // a page with nothing to draw yet (a new one, a mockup still to lay out) is an empty page, not a broken one
    if (showing.kind === "page") return showing.page.draw === Thing.prototype.draw ? null : core.drawThing(showing.page)
    if (showing.kind === "missing") return this.drawMissing(showing.address)
    if (showing.kind === "waiting") return this.drawWaiting(showing.entry)
    if (showing.kind === "loading") return pageWaitingLoader()
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
        // closed by its x, Escape or a button:  its hash goes;  closed by Back, it's gone already, and nothing more
        "on-ui-closed": () => (_event: Event) => {
          if (this.getState<OpenOverlay>("overlay") === overlay) this.closedByPerson()
        }
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
  live?: string
  band?: "group"
  open?: boolean
  pages?: SiteNavPage[]
}

/** A row of its navigation, before it's drawn:  a page, or a link out of the site. */
type NavEntry = SitePageEntry | SiteLinkEntry

/** The store a site keeps what each person chose in:  `spell-sites:<Site>.<Layout>.drawer` ... */
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

/** The site navigation's tag:  the one SiteBase draws, or a layout's own drawer does (`fillNavsIn()`). */
const SITE_NAV = "ui-site-nav"

/** A page layout's slot drawings, each a method of the layout, or of a page that draws that slot itself. */
type LayoutSlot = "drawDrawer" | "drawAppMenu" | "drawPageMenu" | "drawLeftSidebar" | "drawRightSidebar" | "drawFooter"

/**
 * How a site fills the box Run gives it:  its page layout the whole height of that box, the layouts not shown hidden.
 * - The regions themselves are `<ui-page-layout>`'s:  a slot's wrapper is only a way into it.
 * - A kept page's wrapper (`KeptPages`, `display: contents`) is what `<ui-page-layout page-height="fluid">`'s
 *   `::slotted(*)` column reaches, and a wrapper with no box takes nothing from it:  the same column is given to the
 *   page inside, so a `height="fluid"` grid on it fills the window again, as before pages were kept.
 */
const SITE_CSS = `
/* the whole height of the box its element is drawn in (Run's):  that element, whatever its tag, a column */
:has(> .spell-site-frame) { display: flex; flex-direction: column; min-height: 100% }
.spell-site-frame { flex: 1 0 auto; display: flex; flex-direction: column }
.spell-site, .spell-site-alone { flex: 1 0 auto }
.spell-site[hidden], .spell-site-alone[hidden] { display: none }
.spell-site-slot, .spell-site-page { display: contents }
/* a kept page's wrapper is no box:  a fluid layout's column for its page (\`::slotted(*)\`) reaches the page */
:state(page-fluid) > .spell-site-page > * { flex: 1 1 0; min-block-size: 0; display: flex; flex-direction: column }
/* a page whose whole drawing waits:  its spinner in the middle of the page's room (core's \`pageWaitingLoader()\`) */
.spell-page-waiting { display: flex; align-items: center; justify-content: center; min-height: 50vh; height: 100% }
`

/****************
 * ### `KeptPages`
 * The last pages a layout drew, kept drawn while another is shown (epic `solid-2-final` P13, TLDR 47):
 * so Back to one of them shows it at once, as it was left, scrolled lists, typing and folds and all.
 * - Kept by the ADDRESS it was shown at:  one page at two addresses (`/racks/d16`, `/racks/b16`) is two drawings,
 *   so what its views chose at one (a rack picked in a list, a search typed) never shows at the other.
 *   - The program makes ONE thing of each page class, its parameters set for each address:  kept by the page alone,
 *     the drawing made at the first address came back at the next, its views' own choices with it.
 *   - The page itself is part of the key:  a run's new page at the same address (a live edit) is drawn afresh.
 * - The last `KEPT_PAGES`, newest first (`MostRecent`):  an older one is let go, its drawing disposed, and with it
 *   every read it held (a place's read is left as its draw goes), so memory stays flat however many pages are seen.
 * - A page not shown is out of the page's elements altogether, not hidden:  a table of contents, a search or a
 *   `#section` finds only the page shown.  Its elements live on across the move (a Spell UI element is kept until
 *   it's disposed), and come back as they were.
 * - Each drawing is a root of its own, owned by the layout's drawing:  the layout drawn again, or the site, lets every
 *   one go with it.
 ****************/
class KeptPages {
  /** what owns each page's root:  the layout's drawing */
  private readonly owner: Owner | null
  /** each page drawn, by the address it was shown at:  the page, its element and what lets it go */
  private readonly drawings = new Map<string, { page: Page; element: unknown; dispose: () => void }>()
  /** the addresses drawn, newest first:  the oldest let go */
  private readonly recent = new MostRecent<string>(KEPT_PAGES, { onDropped: (address) => this.letGo(address) })

  constructor(owner: Owner | null) {
    this.owner = owner
  }

  /**
   * `page`'s drawing at `address`:  the one kept, else drawn now, in a root of its own.
   * - One kept at `address` for another page (a new run's) is let go, and this one drawn.
   * - SIDE EFFECT:  it's the newest now;  the page that pushes out is let go.
   */
  drawingOf(page: Page, address: string): unknown {
    let drawn = this.drawings.get(address)
    if (drawn && drawn.page !== page) {
      this.letGo(address)
      drawn = undefined
    }
    if (!drawn) {
      const make = () =>
        createRoot((dispose) => ({
          page,
          element: untrack(() => made(h("div", { class: "spell-site-page" }, () => core.drawThing(page)))),
          dispose
        }))
      drawn = this.owner ? runWithOwner(this.owner, make) : make()
      this.drawings.set(address, drawn)
    }
    this.recent.use(address)
    return drawn.element
  }

  /**
   * Keep the drawing at address `from` as the one at `to`:  the same page, its text parameters changed, shown again
   * as it is (`SiteBase.sameDrawing()`).  One kept at `to` already is let go.
   */
  move(from: string, to: string): void {
    const drawn = this.drawings.get(from)
    if (!drawn || from === to) return
    this.letGo(to)
    this.recent.forget(to)
    this.recent.forget(from)
    this.drawings.delete(from)
    this.drawings.set(to, drawn)
    this.recent.use(to)
  }

  /** Let the drawing at `address` go:  its root disposed, every read it held left. */
  private letGo(address: string): void {
    this.drawings.get(address)?.dispose()
    this.drawings.delete(address)
  }
}

/** How many of the last pages a layout keeps drawn:  Back to any of them is instant. */
const KEPT_PAGES = 3

/** What a site shows:  a page, the not found page for an address, or the error page for a page that failed. */
type Showing =
  /** `address`:  the one it's shown at, its parameters' values in it */
  | { kind: "page"; page: Page; entry: SitePageEntry; address: string }
  | { kind: "missing"; address: string }
  | { kind: "waiting"; entry: SitePageEntry }
  /** a page whose address's parameters are still being read:  its layout, and a spinner where it goes */
  | { kind: "loading"; page: Page; entry: SitePageEntry }
  | { kind: "failed"; name: string; error: unknown }

/** Is `showing` a page, shown or with its parameters still being read:  its layout and its place in the site are its own. */
function isAPage(showing: Showing | undefined): showing is Extract<Showing, { kind: "page" | "loading" }> {
  return showing?.kind === "page" || showing?.kind === "loading"
}

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

/** Is `param` one of `page`'s TEXT parameters:  its property is text, not a thing (`:film`) or a number? */
function isTextParam(page: object, param: string): boolean {
  return schemaOf(page.constructor).typeOf(propertyFor(param)) === "text"
}

/** Does page `entry`'s address need values to fill:  a parameter it can't leave out, `/films/:film`? */
function needsValues(entry: SitePageEntry): boolean {
  return requiredParamsOf(entry.address).length > 0
}

/** Page `entry`'s address with every parameter that may be left out left out:  `/settings/:section?` => `/settings`. */
function plainAddressOf(entry: SitePageEntry): string {
  return needsValues(entry) ? entry.address : filledPattern(entry.address)
}

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

/**
 * The hash a dialog or sidebar is kept in the address by:  its name without its last word, lower case with dashes,
 * then the id of its thing, if any (`idInAddressOf()`), encoded:
 * `confirm order dialog`, `1042` => `confirm-order/1042`;  `settings dialog` => `settings`.
 */
export function hashOf(name: string, id?: string | number): string {
  const words = name.trim().split(/\s+/)
  const named = (words.length > 1 ? words.slice(0, -1) : words).join("-").toLowerCase()
  return id === undefined || id === "" ? named : `${named}/${encodeURIComponent(String(id))}`
}

/** `text` decoded:  as it is when it won't decode. */
function safelyDecoded(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** The first property `View` declares whose type is a thing's (a class's, `Film`):  `undefined` for none. */
function firstThingPropertyOf(View: Function): string | undefined {
  const schema = schemaOf(View)
  const declared: string[] = []
  for (let each: typeof schema | undefined = schema; each; each = each.parent) declared.unshift(...each.declared.keys())
  return declared.find((name) => /^[A-Z]/.test(schema.typeOf(name)))
}

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
