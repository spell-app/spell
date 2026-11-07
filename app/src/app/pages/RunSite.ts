import { SP } from "spell/parser/spell"
import type { SiteHost } from "spell/parser/core/core.types"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { navigate } from "./navigation"
import { SiteEdits } from "./SiteEdits"

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
   * of the editor's history, then compiled and run afresh, so the running site shows it.
   * - Its name from the address, `/planets/tatooine` => `tatooine page` (`SiteEdits.pageNameFor()`).
   * - NEVER throws:  a project with no site file, or one whose site can't be written to, is said in a notice.
   */
  createPage = (address: string): void => {
    const file = editor.project?.files.find((each) => SiteEdits.hasSite(each.contents ?? ""))
    if (!file) return editor.showNotice(appTexts.text("siteNoSiteFile"))
    const before = file.contents ?? ""
    let after: string
    try {
      const name = SiteEdits.pageNameFor(address, pageNamesIn(before))
      after = SiteEdits.withPageAdded(before, name, address)
    } catch (error) {
      return editor.showError(error as Error)
    }
    let at = 0
    while (at < before.length && before[at] === after[at]) at++
    let end = 0
    while (end < before.length - at && before.at(-1 - end) === after.at(-1 - end)) end++
    editor.history.change(
      { file, at, before: before.slice(at, before.length - end), after: after.slice(at, after.length - end) },
      { title: appTexts.text("siteCreatePage", { address }), live: () => runAfresh() }
    )
    runAfresh()
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

/** Every page name a site file lists already:  `<page "film page" ...>`, `- it has a film page at ...`. */
function pageNamesIn(text: string): string[] {
  return [...text.matchAll(PAGE_NAMES)].map(([, tagged, written]) => (tagged ?? written ?? "").trim())
}

/** A page a site lists, in either form. */
const PAGE_NAMES = /<page "([^"]+)"|- it has an? (.+?) at "/g

/**
 * Compile now, after the edit, and run it afresh:  a new page is a new type, which a running program can't take as
 * it runs (`LiveEdit`), so the site starts again, at the new page's address.
 */
function runAfresh(): void {
  void editor.restartApp().catch((error: unknown) => editor.showError(error as Error))
}
