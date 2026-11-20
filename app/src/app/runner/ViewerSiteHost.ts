import type { SiteHost } from "spell/parser/core/core.types"
import { SiteThemes } from "./SiteThemes"

/****************
 * ### `ViewerSiteHost`
 * A running site's host in a page's `<spell-viewer>` (`SpellAppRunner`):  its theme, and nothing else of the page's.
 * - The site keeps its address itself, as with no host:  it starts at `/`, and a page going to another changes nothing
 *   outside it.  The page's own URL stays the page's.
 * - Its theme, `galaxy guide is a site with theme "harbor"`, as the editor's Run gives it (`SiteThemes`):  one of
 *   Spell UI's, or the project's own, beside its Spell.
 * - One per run:  a run that keeps its things keeps its host too, so a restart stays on the page it showed.
 ****************/
export class ViewerSiteHost implements SiteHost {
  /** The address the site last went to:  `/` to start. */
  private here = "/"

  /** The address to show now:  where the site last went. */
  address(): string {
    return this.here
  }

  /** Go to `address`:  only remembered, for a run that keeps its things. */
  go(address: string): void {
    this.here = address
  }

  /** Nothing outside the site changes its address. */
  listen(): void {}

  /** Theme `name`'s look for the site alone (`SiteThemes.tokens()`). */
  themeTokens(name: string, projectFolder?: string): Promise<string> {
    return SiteThemes.tokens(name, projectFolder)
  }
}
