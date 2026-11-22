import type { SiteHost } from "spell/parser/core/core.types"
import { SiteThemes } from "spell/app/app/runner/SiteThemes"

/****************
 * ### `RunSiteHost`
 * A running site's host on the run page (`/run/<project>`):  the page's own address is the site's.
 * - `/run/@spell/examples/StarWarsSite/films/4` shows the site's `/films/4`;  the project's own address, its `/`.
 * - A page the site goes to is a new address in the browser's history, so Back and Forward step through its pages.
 * - Its theme as `<spell-viewer>`'s and the editor's Run give it (`SiteThemes`).
 * - The editor's own is `RunSite` (`spell/app/app/pages/RunSite`), which knows the editor's files and selection;
 *   this one knows only the address, so the run page loads no parser.
 ****************/
export class RunSiteHost implements SiteHost {
  /** The project's address on the run page, still encoded:  `/run/@spell/examples/StarWarsSite`. */
  readonly base: string

  constructor(base: string) {
    this.base = base
  }

  /** The site's address the page's URL names:  what follows the project's, `/` for none. */
  address(): string {
    const { pathname } = location
    const rest = pathname.startsWith(this.base) ? pathname.slice(this.base.length) : ""
    return rest.length > 1 ? rest : "/"
  }

  /** Go to `address`:  a new entry in the page's history, unless it's there already. */
  go(address: string): void {
    const url = address === "/" ? this.base : `${this.base}${address}`
    if (url !== location.pathname) history.pushState(null, "", url)
  }

  /**
   * Show the page's address again on Back and Forward.
   * - Each run listens again:  only the last one's `showAddress` is called, through ONE listener on the window.
   */
  listen(showAddress: (address: string) => void): void {
    if (!this.showAddress) addEventListener("popstate", () => this.showAddress?.(this.address()))
    this.showAddress = showAddress
  }

  /** What the last run's `listen()` asked us to call. */
  private showAddress?: (address: string) => void

  /** Theme `name`'s look for the site alone (`SiteThemes.tokens()`). */
  themeTokens(name: string, projectFolder?: string): Promise<string> {
    return SiteThemes.tokens(name, projectFolder)
  }
}
