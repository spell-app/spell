/**
 * Sites (epic `mockup` P2):  what compiled spell calls to move between a site's pages, and what the host hands in.
 * - `go to the film page for this film` => `core.showSitePart("film page", film)`
 * - `show the settings dialog` => `core.showSitePart("settings dialog")`;  `close the settings dialog` =>
 *   `core.closeSitePart("settings dialog")`
 * - `the address of the film page for this film` => `core.siteAddressOf("film page", film)`, for a link
 * - Each goes through the running program's site, `core.RUNTIME.site` (the first one made):  the site itself is
 *   `SiteBase`, under spell's built-in template `site`.
 * - `siteHost`:  where the address lives, set by whatever runs the program (the editor's Run puts it in its URL).
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { core } from "./core"
import { defineCoreModule, type SiteHost } from "./core.types"

/** The running site's half that compiled spell calls:  `SiteBase`'s, without importing it. */
type RunningSite = {
  show(name: string, thing?: unknown): void
  close(name: string): void
  linkTo(name: string, thing?: unknown): string
}

/** `core`'s site methods. */
export const siteMethods = defineCoreModule({
  /**
   * Where a running site's address lives, as the host keeps it:  `undefined` for none, and the site keeps its own.
   * - The editor's Run sets it for each run:  `/run/<project>/films/4` shows `/films/4`, and back and forward work.
   */
  siteHost: undefined as SiteHost | undefined,

  /**
   * Show the site's page `name`, its parameter filled with `thing`, or open its dialog or sidebar of that name:
   * what `go to the film page for this film` and `show the settings dialog` compile to.
   * - throws `TypeError` when the program has no site, or its site no part of that name
   */
  showSitePart(name: string, thing?: unknown): void {
    runningSite("showSitePart").show(name, thing)
  },

  /**
   * Close the site's dialog or sidebar `name`, if it's open:  what `close the review dialog` compiles to.
   * - throws `TypeError` when the program has no site, or its site no dialog or sidebar of that name
   */
  closeSitePart(name: string): void {
    runningSite("closeSitePart").close(name)
  },

  /**
   * The address of the site's page `name`, its parameter filled with `thing`:  what
   * `the address of the film page for this film` compiles to, e.g. for a link, `<a href={...}>`.
   * - The thing goes in the parameter whose property is of its type, else the first.
   * - `""` while the thing is nothing yet (a link still being followed):  see `SiteBase.linkTo()`.
   * - throws `TypeError` when the program has no site, or its site no page of that name
   */
  siteAddressOf(name: string, thing?: unknown): string {
    return runningSite("siteAddressOf").linkTo(name, thing)
  }
})
Object.assign(core, siteMethods)

/** The running program's site;  throws `TypeError`, naming `method`, when it has none. */
function runningSite(method: string): RunningSite {
  const site = core.RUNTIME?.site as RunningSite | undefined
  if (!site) throw new TypeError(`core.${method}():  this program has no site;  make one, \`my site is a site:\``)
  return site
}
