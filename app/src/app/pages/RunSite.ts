import { SP } from "spell/parser/spell"
import type { SiteHost } from "spell/parser/core/core.types"
import { editor } from "spell/app/app/editor"
import { navigate } from "./navigation"
import { SiteWrites } from "./SiteWrites"

/****************
 * ### `RunSite`
 * Where a running SITE's address lives in the editor's Run (epic `mockup` P2):  the editor's own URL.
 * - `/run/@spell/examples/StarWarsSite/films/4` shows the site's `/films/4`:  the part after the project, which
 *   the editor's addresses keep for a page of the running app (`SP.SpellUrls.withoutPage()`).
 * - A page going to another changes the URL (`go()`), so the browser's back and forward work;  the route hears every
 *   change of the URL, and tells the site (`heard()`, from `followRoute()`).
 * - While designing, a site's not found page offers to make the page:  `createPage()`, one step of the editor's
 *   history.
 * - The core's `SiteHost`, handed to each run (`editor.executeCompiledApp()`):  no Solid, as `editor.ts` uses it.
 * - ONE for the page, `runSite`.
 ****************/
export class RunSite implements SiteHost {
  /** The site's address the URL names now:  `/` for none. */
  private here = "/"

  /** What the running site does when the URL changes by itself:  the last run's, replaced by each run. */
  private showAddress?: (address: string) => void

  /** The address to show now, from the site's root:  `/films/4`. */
  address(): string {
    return this.here
  }

  /** Go to `address`, as a page of the site does:  the URL follows, a step the back button takes back. */
  go(address: string): void {
    if (address === this.here) return
    this.here = address
    const { project } = editor
    if (!project) return
    navigate(RunSite.runUrlFor(project.path, address))
  }

  /** Call `showAddress` whenever the URL changes by itself:  each run hands over its site's. */
  listen(showAddress: (address: string) => void): void {
    this.showAddress = showAddress
  }

  /**
   * The URL now names `address` (back, forward, typed in):  the running site shows it.
   * - The same address as now does nothing:  it's the URL following the site's own `go()`.
   */
  heard(address: string): void {
    if (address === this.here) return
    this.here = address
    this.showAddress?.(address)
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
