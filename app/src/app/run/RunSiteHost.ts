import type { SiteHost, SitePageEntry } from "spell/parser/core/core.types"
import { SiteThemes } from "spell/app/app/runner/SiteThemes"
import { fetchJSON } from "spell/app/app/runner/fetchFresh"

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
 * - A page the site goes to is a new address in the browser's history, so Back and Forward step through its pages.
 * - A link's `#section`, and one the page was opened or went back to, is landed on once it's drawn (`landOn()`),
 *   looked for in `root`:  where the site draws, a `<spell-viewer>`'s shadow root;  the document by default.
 * - Its theme as `<spell-viewer>`'s and the editor's Run give it (`SiteThemes`).
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
  private site?: SitePages

  constructor(base: string, root: ParentNode = document, opened?: OpenedFile) {
    this.base = base.replace(/\/+$/, "")
    this.root = root
    this.opened = opened
  }

  /**
   * The site's address the page's URL names:  what follows the base, `/` for none.
   * - A file's (`/home.spell`):  the address of the page it declares, alone, with no value to fill;  `/` for none.
   * - `site`:  the site asking, as it starts;  remembered, for Back and Forward to the file's address.
   */
  address(site?: SitePages): string {
    if (site) this.site = site
    const { pathname } = location
    const rest = pathname.startsWith(this.base) ? pathname.slice(this.base.length) : ""
    if (this.opened && safelyDecoded(rest) === this.opened.path) return this.addressOfFile(this.opened) ?? "/"
    return rest.length > 1 ? rest : "/"
  }

  /** The running site's address of the first page `file` declares with no value to fill:  `undefined` for none. */
  private addressOfFile(file: OpenedFile): string | undefined {
    const pages = this.site?.allPages() ?? []
    return pages.find((entry) => !entry.params?.length && file.pages.includes(entry.page))?.address
  }

  /**
   * Go to `address`:  a new entry in the page's history, unless it's there already;  the new page starts at its top,
   * as a page loaded does (a link's `#section` is landed on after, `landOn()`).
   */
  go(address: string): void {
    const url = address === "/" ? this.base || "/" : `${this.base}${address}`
    if (url === location.pathname) return
    history.pushState(null, "", url)
    scrollTo(0, 0)
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

  /** Land on the section the page's address names, if any. */
  private landOnHash(): void {
    const section = location.hash.slice(1)
    if (section) this.landOn(safelyDecoded(section))
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

/** A running site, as far as its host needs it:  its pages. */
type SitePages = { allPages(): SitePageEntry[] }

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
