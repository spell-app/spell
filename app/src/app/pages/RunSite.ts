import { waitUntil } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import type { SiteHost } from "spell/parser/core/core.types"
import { editor, type RunningSitePage } from "spell/app/app/editor"
import { navigate } from "./navigation"
import { SiteWrites } from "./SiteWrites"

/****************
 * ### `RunSite`
 * Where a running SITE's address lives in the editor's Run (epic `mockup` P2):  the editor's own URL.
 * - A page alone in its own file is named by that FILE (epic `mockup` I15):
 *   `/run/owen@spell/harbor-new/home.spell` shows harbor-new's Home, at the site's `/`.
 * - Any other page by its ADDRESS, the part after the project:  `/run/@spell/examples/StarWarsSite/films/4` shows the
 *   site's `/films/4` (a page with a value to fill, or one declared in the site file;  `SP.SpellUrls.withoutPage()`).
 *   - An address whose page has a file of its own still works:  the URL turns to the file's, in place (`followUrl()`).
 * - A page going to another changes the URL (`go()`), so the browser's back and forward work;
 *   the route hears every change of the URL, and tells the site (`heard()`, from `followRoute()`).
 * - While designing, a site's not found page offers to make the page:
 *   `createPage()`, one step of the editor's history.
 * - The core's `SiteHost`, handed to each run (`editor.executeCompiledApp()`):  no Solid, as `editor.ts` uses it.
 * - ONE for the page, `runSite`.
 ****************/
export class RunSite implements SiteHost {
  /** The site's address the URL names now:  `/` for none. */
  private here = "/"

  /** A file the URL named before any site of its project ran:  its page's address is looked up when one does. */
  private hereFile?: string

  /** What the running site does when the URL changes by itself:  the last run's, replaced by each run. */
  private showAddress?: (address: string) => void

  /**
   * The address to show now, from the site's root:  `/films/4`.
   * - A site starting asks it:  a file the URL named is looked up now, and the URL names the page its own way
   *   (`followUrl()`).
   */
  address(): string {
    if (this.hereFile && editor.isRunningSite) {
      this.here = this.addressOfFile(this.hereFile) ?? this.here
      this.hereFile = undefined
    }
    this.followUrl()
    return this.here
  }

  /** Go to `address`, as a page of the site does:  the URL follows, a step the back button takes back. */
  go(address: string): void {
    if (address === this.here) return
    this.here = address
    this.hereFile = undefined
    const url = this.urlFor(address)
    if (url) navigate(url)
  }

  /**
   * The editor's Run URL of the running site's `address`:  its page's file when it's alone in one, else the address.
   * - `/` => `/run/owen@spell/harbor-new/home.spell`;  `/films/4` => `/run/@spell/examples/StarWarsSite/films/4`.
   * - `undefined` with no project.
   */
  urlFor(address: string): string | undefined {
    const { project } = editor
    if (!project) return undefined
    const file = this.fileAt(address)
    return file ? new SP.SpellLocation(file.path).runnerUrl : RunSite.runUrlFor(project.path, address)
  }

  /**
   * The file a Run URL names the running site's page at `address` by:  the one file holding that page by itself.
   * - `undefined` for a page with a value to fill (`/films/:film`), one declared in the site file, or one sharing its
   *   file with another page:  those keep their address.
   */
  fileAt(address: string): SP.AnySpellFile | undefined {
    const page = editor.sitePageAt(address)
    if (!page || page.params?.length) return undefined
    const file = RunSite.fileHolding(page)
    return file && this.addressOfFile(file.path) === page.address ? file : undefined
  }

  /**
   * The running site's address of the page file `path` holds:  the first page it declares, with no value to fill.
   * - `undefined` for a file holding none, e.g. the site file, or when no site of the project runs.
   */
  addressOfFile(path: string): string | undefined {
    const file = editor.project?.getFile(path)
    if (!file) return undefined
    return editor.sitePages().find((page) => !page.params?.length && RunSite.fileHolding(page) === file)?.address
  }

  /**
   * The project's file declaring the site's `page`, other than the site file:
   * - a page alone in its file (`"Home" is a page`), by its class
   * - else the file declaring it by its name (`Systems is a page`, whose class is `System`)
   */
  private static fileHolding(page: RunningSitePage): SP.AnySpellFile | undefined {
    const file = editor.project?.fileForPage(page.page) ?? SiteWrites.declaringFile(page.name)
    return file && file !== SiteWrites.siteFile() ? file : undefined
  }

  /**
   * Make the URL name the page shown the way `urlFor()` does, replacing it in the history:
   * an address whose page has a file of its own, or a file that isn't the page shown (the site file, by Run).
   * - Once the route is done with the URL it heard, so a change of URL isn't made inside it.
   * - Only in Run, with the project's site running.
   */
  private followUrl(): void {
    queueMicrotask(() => {
      if (editor.projectPage !== "runner" || !editor.isRunningSite || this.hereFile) return
      const url = this.urlFor(this.here)
      const { pathname, search, hash } = globalThis.location
      if (!url || url === pathname || url === safelyDecoded(pathname)) return
      navigate(`${url}${search}${hash}`, { replace: true })
    })
  }

  /**
   * Page class `className` is about to show:  compile it in, the first time (epic `notebook` P10, Q11).
   * - `false` in Edit with a page open:  the open page shows, not the site's.
   */
  pageNeeded(className: string): Promise<boolean> | boolean | undefined {
    return editor.pageNeeded(className)
  }

  /**
   * Scroll to section `id` of the page being shown, once it's drawn:  the docs site's way of landing on a link's target
   * (`HashLanding`).
   * - Waits for the section:  a page compiled in as it's shown takes a moment.
   * - NEVER throws:  a section that never comes is left alone.
   */
  landOn = (id: string): void => {
    const shown = () => document.querySelector(`.spell-site-page [id="${CSS.escape(id)}"]`)
    void waitUntil(shown, { timeout: SECTION_WAIT })
      .then(async () => {
        const { HashLanding } = await import("spell/ui/components/ui-toc/HashLanding")
        await HashLanding.forDocument(document).landOnHash(`#${id}`)
      })
      .catch(() => undefined)
  }

  /** Call `showAddress` whenever the URL changes by itself:  each run hands over its site's. */
  listen(showAddress: (address: string) => void): void {
    this.showAddress = showAddress
  }

  /**
   * The URL now names `address` (back, forward, typed in):  the running site shows it.
   * - `file`:  the file the URL names instead, `/run/owen@spell/harbor-new/home.spell`:  the address of the page it
   *   holds;  a file holding none (the site file) leaves the page shown as it is.
   *   - Before the project's site runs, it's looked up when the site asks (`address()`).
   * - The same address as now shows nothing new:  it's the URL following the site's own `go()`.
   */
  heard(address: string, file?: string): void {
    // a file of a project whose site isn't running yet, e.g. one just picked
    if (file && !(editor.isRunningSite && editor.project?.getFile(file))) {
      this.hereFile = file
      this.here = "/"
      return
    }
    this.hereFile = undefined
    const next = file ? (this.addressOfFile(file) ?? this.here) : address
    this.followUrl()
    if (next === this.here) return
    this.here = next
    this.showAddress?.(next)
  }

  /**
   * Make a page at `address`, which the site has none for:  declared beside the site and listed in it, as one step
   * of the editor's history (`SiteWrites.addPage()`).
   * - The running site takes the new page as it runs (epic `mockup` J15, A), and shows it, at the same address.
   * - A run that can't take it (`editor.restartNeededBecause`, e.g. an import changed too) starts afresh instead.
   * - NEVER throws:  a project with no site file, or one whose site can't be written to, is said in a notice.
   */
  createPage = (address: string): void => {
    SiteWrites.addPage(address, undefined, () => {
      if (editor.restartNeededBecause)
        return void editor.restartApp().catch((error: unknown) => editor.showError(error))
      this.showAddress?.(this.here)
    })
  }

  /**
   * Theme `name`'s look for the running site alone (epic `mockup` P8):  its tokens as one block of declarations, worn
   * inline by the site's frame, so the editor around it keeps its own theme.
   * - Spell UI's own scoping (`UI.themes.scopedTokens()`), kept to the theme's plain rules:  the light and dark of a
   *   value say it themselves (`light-dark()`), so a scheme's own rules aren't needed.
   * - Its fonts join the page:  a font a shadow root declares isn't loaded, so the theme's `@font-face` rules go in a
   *   sheet of the page's own, once per theme.
   * - NOT the theme's rules on Spell UI's class words (Mockup's uneven corners):  those go on the whole page or
   *   nowhere, and the editor's own page isn't the site's.
   * - Rejects on a theme Spell UI doesn't have.
   */
  themeTokens = async (name: string): Promise<string> => {
    const { UI: SpellUI } = await import("spell/ui")
    await SpellUI.load()
    const [scoped, sheet] = await Promise.all([
      SpellUI.themes.scopedTokens(name, SITE_SCOPE),
      SpellUI.themes.load(name)
    ])
    RunSite.addFontsOf(name, sheet)
    const rules = new CSSStyleSheet()
    rules.replaceSync(scoped)
    return [...rules.cssRules]
      .filter(
        (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === `:root ${SITE_SCOPE}`
      )
      .map((rule) => rule.style.cssText)
      .join("  ")
  }

  /** Theme `name`'s `@font-face` rules, out of its sheet's text, into a sheet of the page's own:  once per theme. */
  private static addFontsOf(name: string, sheetText: string): void {
    if (FONTS_ADDED.has(name)) return
    FONTS_ADDED.add(name)
    const fonts = sheetText.match(FONT_FACE) ?? []
    if (!fonts.length) return
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(fonts.join("\n"))
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
  }

  /** The editor's Run URL of a site's `address`, in project `projectPath`:  `/run/<project>/films/4`. */
  static runUrlFor(projectPath: string, address: string): string {
    const base = new SP.SpellLocation(projectPath).runnerUrl
    return address === "/" ? base : `${base}${address}`
  }

  /**
   * The site's address a Run URL names:  the part after its project, `/run/@spell/examples/StarWarsSite/films/4` =>
   * `/films/4`;  a project's or a file's address names none, `/`.
   * - `tail`:  the route's address, decoded by the router, which says where the project ends.
   * - `pathname`:  the URL as it is, still encoded:  the site's address is taken from it, so an id with a `/` in it
   *   (`https://swapi.py4e.com/api/films/1/`, encoded in its one part) stays one part.
   * - NEVER throws:  an address no group holds names none.
   */
  static siteAddressIn(tail: string, pathname: string): string {
    try {
      if (SP.SpellUrls.withoutPage(tail) === tail) return "/"
      const { projectId, rest } = SP.SpellUrls.split(tail)
      const project = new SP.SpellLocation(projectId).runnerUrl
      // the URL as it is, when it's the route's:  the router may tell of a route before the URL shows it
      const isTheRoute = pathname.startsWith(project) && safelyDecoded(pathname) === `/run/${tail}`
      const raw = isTheRoute ? pathname.slice(project.length) : `/${SP.SpellUrls.encodeAddress(rest)}`
      return raw.length > 1 ? raw : "/"
    } catch {
      return "/"
    }
  }
}

/** How long a link's `#section` waits for its section, in seconds. */
const SECTION_WAIT = 5

/** The selector a site's theme is scoped to, for `UI.themes.scopedTokens()`:  the rules come back on `:root` it. */
const SITE_SCOPE = ".spell-site-frame"

/** A theme sheet's `@font-face` rules, in its CSS text (none nest a brace). */
const FONT_FACE = /@font-face\s*\{[^}]*\}/g

/** The themes whose fonts the page has. */
const FONTS_ADDED = new Set<string>()

/** `path` decoded:  as it is when it won't decode. */
function safelyDecoded(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** The one `RunSite` for the page. */
export const runSite = new RunSite()
