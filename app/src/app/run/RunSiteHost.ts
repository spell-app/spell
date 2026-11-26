import type { SiteHost, SiteParts, TabIcon } from "spell/parser/core/core.types"
import { requiredParamsOf, filledPattern } from "spell/util/addressPattern"
import { SiteThemes } from "spell/app/app/runner/SiteThemes"
import { fetchJSON } from "spell/app/app/runner/fetchFresh"
import type { TabIcons } from "./TabIcons"

/****************
 * ### `RunSiteHost`
 * A running site's host whose address is the page's own:  the run page (`/run/<project>`), and a `<spell-viewer>`
 * given a `base` (the Spell UI site at `/components/ui/`, epic `editor` P43).
 * - `/run/@spell/examples/StarWarsSite/films/4` shows the site's `/films/4`;  the base itself, its `/`.
 * - A page alone in its own FILE is named by that file too, as the editor's Run names it (`RunSite`, epic `mockup` I15):
 *   `/run/owen@spell/dashboard/home.spell` shows the page `home.spell` declares, at its address (`opened`).
 *   - So the address the editor's Run puts in the browser opens the same page when it's reloaded, or bookmarked:
 *     a reload goes to the run page, never the editor.
 *   - Which page a file declares, from the project's declarations (`OpenedFile.of()`), read before the site starts;
 *     the page's address, from the running site's pages as it starts (`address(site)`).
 *   - A file that declares no page (the site file) shows the site's `/`, as the editor's Run does.
 *   - The page's address stays as it was opened, until the site goes to another.
 * - A page the site goes to is a new address in the browser's history, so Back and Forward step through its pages;
 *   a page's tab changed on it too (`go()`'s `keepScroll`), where it's scrolled to kept.
 * - The dialog or sidebar open is in the hash, `#confirm-order/1042`, a step in the history (`partOpened()`):
 *   closing it takes it out, Back closes it, and a page opened at it, or gone back to, opens it (`landOnHash()`).
 * - A link's `#section`, and one the page was opened or went back to, is landed on once it's drawn (`landOn()`),
 *   looked for in `root`:  where the site draws, a `<spell-viewer>`'s shadow root;  the document by default.
 * - Its theme as `<spell-viewer>`'s and the editor's Run give it (`SiteThemes`).
 * - The app's icon on the browser tab, while it runs (`showIcon()`, epic `editor` P50):  only when handed `tabIcons`,
 *   the run page's;  a `<spell-viewer>` leaves the tab of the page it's on alone.
 * - The editor's own is `RunSite` (`spell/app/app/pages/RunSite`), which knows the editor's files and selection;
 *   this one knows only the address, so the run page loads no parser.
 ****************/
export class RunSiteHost implements SiteHost {
  /** The site's address on the page, still encoded, no `/` at its end:  `/run/@spell/examples/StarWarsSite`. */
  readonly base: string

  /** Where the site draws, where a link's section is looked for. */
  private readonly root: ParentNode

  /** The file the page was opened at, and the pages it declares:  `undefined` when it was opened at an address. */
  private readonly opened?: OpenedFile

  /** The site running, once it asked for its address:  its pages say where a file's page is. */
  private site?: SiteParts

  /** What shows the app's icon on the browser tab:  the run page's;  none, the tab is left alone. */
  private readonly tabIcons?: TabIcons

  constructor(base: string, root: ParentNode = document, opened?: OpenedFile, { tabIcons }: RunSiteHostOptions = {}) {
    this.base = base.replace(/\/+$/, "")
    this.root = root
    this.opened = opened
    this.tabIcons = tabIcons
  }

  /** The running app's icon on the browser tab;  `undefined`, the page's own (`TabIcons`). */
  showIcon(icon: TabIcon | undefined): void {
    this.tabIcons?.show(icon)
  }

  /**
   * The site's address the page's URL names:  what follows the base, `/` for none.
   * - A file's (`/home.spell`):  the address of the page it declares, alone, with no value to fill;  `/` for none.
   * - `site`:  the site asking, as it starts;  remembered, for Back and Forward to the file's address.
   */
  address(site?: SiteParts): string {
    if (site) this.site = site
    const { pathname } = location
    const rest = pathname.startsWith(this.base) ? pathname.slice(this.base.length) : ""
    if (this.opened && safelyDecoded(rest) === this.opened.path) return this.addressOfFile(this.opened) ?? "/"
    return rest.length > 1 ? rest : "/"
  }

  /** The running site's address of the first page `file` declares with no value to fill:  `undefined` for none. */
  private addressOfFile(file: OpenedFile): string | undefined {
    const pages = this.site?.allPages() ?? []
    const entry = pages.find((each) => !requiredParamsOf(each.address).length && file.pages.includes(each.page))
    return entry && filledPattern(entry.address)
  }

  /**
   * Go to `address`:  a new entry in the page's history, unless it's there already;  the new page starts at its top,
   * as a page loaded does (a link's `#section` is landed on after, `landOn()`).
   * - `keepScroll`:  the same page, a tab of it picked:  it stays where it's scrolled to.
   */
  go(address: string, { keepScroll = false }: { keepScroll?: boolean } = {}): void {
    const url = address === "/" ? this.base || "/" : `${this.base}${address}`
    if (url === location.pathname && !location.hash) return
    history.pushState(null, "", url)
    if (!keepScroll) scrollTo(0, 0)
  }

  /** A dialog or sidebar opened:  its `hash` in the page's address, a step in the history. */
  partOpened(hash: string): void {
    RunSiteHost.pushPart(hash)
  }

  /** The dialog or sidebar open closed:  its hash out of the page's address (`dropPart()`). */
  partClosed(): void {
    RunSiteHost.dropPart()
  }

  /**
   * Put a dialog's or sidebar's `hash` in the page's address, a step in the history:  the ONE way, for this host and
   * the editor's Run (`RunSite`).
   */
  static pushPart(hash: string): void {
    if (location.hash === `#${hash}`) return
    const { pathname, search } = location
    history.pushState({ [PART]: hash }, "", `${pathname}${search}#${hash}`)
  }

  /**
   * Take the hash of the dialog or sidebar that closed out of the page's address:  Back, when opening it was the step
   * before (`pushPart()`), so the history keeps no step for it;  else the address replaced.
   */
  static dropPart(): void {
    const { pathname, search, hash } = location
    if (!hash) return
    const opened = (history.state as Record<string, unknown> | null)?.[PART]
    if (typeof opened === "string" && hash === `#${opened}`) history.back()
    else history.replaceState(null, "", `${pathname}${search}`)
  }

  /**
   * Show the page's address again on Back and Forward, and land on its `#section`, if it names one, once that page
   * is shown.
   * - Each run listens again:  only the last one's `showAddress` is called, through ONE listener on the window.
   * - Called as the site starts:  so a `#section` the page was opened at is landed on too.
   */
  listen(showAddress: (address: string) => Promise<void> | void): void {
    if (!this.showAddress)
      addEventListener("popstate", () => {
        void Promise.resolve(this.showAddress?.(this.address())).then(() => this.landOnHash())
      })
    this.showAddress = showAddress
    this.landOnHash()
  }

  /** What the last run's `listen()` asked us to call. */
  private showAddress?: (address: string) => Promise<void> | void

  /** Scroll to section `id` of the page shown, once it's drawn (`RunSiteHost.landOnSection()`, in `root`). */
  landOn = (id: string): void => RunSiteHost.landOnSection(this.root, id)

  /**
   * Open the dialog or sidebar the page's address's hash names, `#confirm-order/1042`, else land on the section it
   * names, if any;  with none, the dialog or sidebar open closes (`SiteParts.showPart()`).
   */
  private landOnHash(): void {
    const hash = location.hash.slice(1)
    const opened = this.site?.showPart?.(hash) ?? Promise.resolve(false)
    void opened.then((named) => {
      if (!named && hash && location.hash.slice(1) === hash) this.landOn(safelyDecoded(hash))
    })
  }

  /** Theme `name`'s look for the site alone (`SiteThemes.tokens()`). */
  themeTokens(name: string, projectFolder?: string): Promise<string> {
    return SiteThemes.tokens(name, projectFolder)
  }

  /**
   * Scroll to section `id` of the site drawn in `root`, once it's drawn, as the browser's own jump to a `#section`
   * does:  the ONE landing of a site's link to a section, for this host and the editor's Run (`RunSite`).
   * - `scrollIntoView()` scrolls whatever box holds the section, the window or a pane of the editor;
   *   the section's `scroll-margin-top` keeps it below a bar stuck at the top.
   * - The page's address then names the section too, so it can be shared or reloaded.
   * - Looks first on the next frame, once the page just shown has replaced the one left;
   *   then waits for the section:  a page draws a moment after it's shown.
   * - Lands once more when late layout has moved it, unless the reader has scrolled since.
   * - NOT Spell UI's `HashLanding`:  `<spell-viewer>`'s bundle takes Spell UI only from the page's shared files
   *   (`sharedFiles()`), and they don't hold it;  and it scrolls only the window, which the editor's Run doesn't.
   * - NEVER throws:  a section that never comes, or one the page doesn't have, is left alone.
   */
  static landOnSection(root: ParentNode, id: string): void {
    let tries = 0
    const look = () => {
      const section = elementWithId(root, id)
      if (!section) {
        if (++tries < SECTION_TRIES) setTimeout(look, SECTION_PAUSE)
        return
      }
      section.scrollIntoView({ block: "start" })
      const landedAt = scrollTopAround(section)
      setTimeout(
        () => scrollTopAround(section) === landedAt && section.scrollIntoView({ block: "start" }),
        SETTLE_PAUSE
      )
      const { pathname, search, hash } = location
      if (hash !== `#${id}`) history.replaceState(history.state, "", `${pathname}${search}#${id}`)
    }
    requestAnimationFrame(look)
  }
}

/** Where `partOpened()` marks the step it adds to the history, by the hash it wrote. */
const PART = "spellSitePart"

/****************
 * ### `OpenedFile`
 * A project's file the run page was opened at, `/run/owen@spell/dashboard/home.spell`, and the pages it declares:
 * what `RunSiteHost` shows for it.
 ****************/
export type OpenedFile = {
  /** The file, from the project's folder:  `/home.spell`. */
  path: string
  /** The classes of the pages it declares, in its order:  `["HomeScreen"]`. */
  pages: string[]
}

export const OpenedFile = {
  /**
   * The file `rest` names, the part of the run page's address after its project, and the pages it declares, read from
   * the project's declarations at `declarationsUrl`:  `undefined` when `rest` names no Spell file (`/films/4`).
   * - NEVER throws:  declarations that can't be read declare no page, so the file shows the site's `/`.
   */
  async of(rest: string, declarationsUrl: string): Promise<OpenedFile | undefined> {
    const path = `/${rest.replace(/^\/+/, "")}`
    if (!SPELL_FILE.test(path)) return undefined
    const declarations = await fetchJSON<DeclaredStatements>(declarationsUrl)
    return { path, pages: OpenedFile.pagesIn(declarations, path) }
  },

  /**
   * The classes of the pages file `path` declares, in `declarations` (a project's `<project>.declarations.json5`):
   * each type it defines whose super type is a page.
   */
  pagesIn(declarations: DeclaredStatements | undefined, path: string): string[] {
    return (declarations?.statements ?? [])
      .filter((statement) => statement.superType === "Page" && statement.defined?.startsWith(`${path}:`))
      .flatMap((statement) => (statement.type ? [statement.type] : []))
  }
}

/** What else a `RunSiteHost` may be handed. */
export type RunSiteHostOptions = {
  /** What shows the running app's icon on the browser tab:  the run page's;  none, the tab is left alone. */
  tabIcons?: TabIcons
}

/** What `OpenedFile` reads of a project's declarations:  each statement's type, its super type and where it is. */
export type DeclaredStatements = {
  statements?: { type?: string; superType?: string; defined?: string }[]
}

/** A Spell file's path:  its last part ends `.spell`. */
const SPELL_FILE = /\.spell$/

/** How many times a link's section is looked for, `SECTION_PAUSE` apart:  five seconds. */
const SECTION_TRIES = 50

/** How long between looks for a link's section, in milliseconds. */
const SECTION_PAUSE = 100

/** How long after landing on a section it lands once more, in milliseconds:  as Spell UI's `HashLanding` settles. */
const SETTLE_PAUSE = 1500

/**
 * How far the boxes holding `element` are scrolled, the window's included:  one number that changes when the reader
 * scrolls whichever one holds it.
 */
function scrollTopAround(element: Element): number {
  let total = scrollY
  for (let box = element.parentElement ?? hostOf(element); box; box = box.parentElement ?? hostOf(box))
    total += box.scrollTop
  return total
}

/** The shadow host of `element`'s root, if it's in a shadow root. */
function hostOf(element: Element): Element | null {
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

/**
 * The element with `id` in `root`, looking inside every shadow root too:  a page's sections are drawn in its views'
 * own shadow roots.
 */
function elementWithId(root: ParentNode, id: string): Element | undefined {
  const found = root.querySelector(`[id="${CSS.escape(id)}"]`)
  if (found) return found
  for (const element of root.querySelectorAll("*")) {
    const inside = element.shadowRoot && elementWithId(element.shadowRoot, id)
    if (inside) return inside
  }
  return undefined
}

/** `text` decoded:  as it is when it won't decode. */
function safelyDecoded(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}
