/**
 * Types of the site header and section editor, and how the header lights its tabs.
 * - Browser code:  no node imports.
 * - GENERIC (epic `repo-split` I4):  it names no site's parts.
 *   The tabs are data (`SiteTab`):  the page server's settings.
 */

/**
 * One TAB of the site header:  a part of the site with its own home page.
 * - DATA, never code in this package:  the header knows no site's parts
 *   - the page server's settings, `"siteTabs"` (`PageServerSettings.siteTabs`),
 *     handed to every page it serves as `SPELL_SERVER.siteTabs`
 *   - none (a server whose settings name none):  no tabs;  nothing opens a page from disk (epic `epic-engine` P46)
 *   - plain JSON, so a setting and a served page can carry it
 * - `name`:  its label, e.g. `Epic/UI`
 * - `path`:  its home page, relative to the site's root (`guides/index.html`), or server-absolute (`/components/ui/`)
 * - `ownTab`:  always opens in its own browser tab (`target`), never in place
 *   - e.g. an app:  a whole program, too big for VS Code's side bar
 *   - a frame that left the page server can't step back (`liveClient.ts`)
 * - what lights it (`litTab()`):
 *   - `sets`:  component sets, by id:  a page at `/components/<id>/` (`componentSet()`)
 *   - `paths`:  more pages, each a pattern (a `RegExp` source) on the page's path, e.g. `^/editor(/|$)`
 *   - `areas`:  docs areas, by folder name:  a page under `<area>/` (`docsArea()`)
 */
export type SiteTab = {
  name: string
  path: string
  ownTab?: boolean
  sets?: string[]
  paths?: string[]
  areas?: string[]
}

/**
 * The home page, relative to the repo root:  a routing page, a card per tab (claude-design P5).
 * - the header's Spell logo goes there;  no tab is lit on it
 * - the page server sends `/` there too (`DOCS_HOME`)
 */
export const SITE_HOME = "pages/index.html"

/**
 * A component set's address, its id caught:  `/components/<id>/`, after a worktree's `/worktrees/<w>`.
 * - MUST match the page server's `COMPONENTS_PREFIX` (`spell/server/page`'s `settings.ts`, node code:  not imported here)
 */
const COMPONENT_SET_ADDRESS = /^(?:\/worktrees\/[^/]+)?\/components\/([^/]+)(?:\/|$)/

/** A worktree's prefix on a page's path, up to the worktree's own folder:  `/worktrees/<w>`, `.../.claude/worktrees/<w>`. */
const WORKTREE_PREFIX = /^.*\/worktrees\/[^/]+(?=\/)/

/**
 * The tab `tabs` light for page path `path` (`location.pathname`:  served, or a `file://` path);  `undefined`:  none.
 * - FIRST the first tab whose `sets` or `paths` take the page
 *   - so a component set's page is never a docs area's,
 *     even in a folder named like one (`x/epics/docs/`)
 * - else the tab whose `areas` hold the page's docs area (`docsArea()`, over every tab's `areas`)
 */
export function litTab(tabs: readonly SiteTab[], path: string): SiteTab | undefined {
  const set = componentSet(path)
  const named = tabs.find(
    (tab) =>
      (set !== undefined && tab.sets?.includes(set)) || tab.paths?.some((pattern) => new RegExp(pattern).test(path))
  )
  if (named) return named
  const area = docsArea(
    path,
    tabs.flatMap((tab) => tab.areas ?? [])
  )
  return area === undefined ? undefined : tabs.find((tab) => tab.areas?.includes(area))
}

/**
 * Which component set page path `path` is in (`location.pathname`), by its served address;
 * `undefined` for anything else.
 * - `/components/<set>/`, a worktree's too (`/worktrees/<w>/components/<set>/`):
 *   the page server's `componentSets` setting, each at `/components/<id>/`
 * - a set's folder on disk (a `file://` page) has no address:  a tab names it in its `paths`
 */
export function componentSet(path: string): string | undefined {
  return COMPONENT_SET_ADDRESS.exec(path)?.[1]
}

/**
 * Which docs area page path `path` is in (`location.pathname`:  served, or a `file://` path);
 * `undefined` for anything else.
 * - `areas`:  the area folders' names (`guides`, `epics` ...)
 * - an area is a folder with a tab of its own (`SiteTab.areas`):  the page server's, or the epic folder's
 * - the area is the FIRST area folder in the path:  `templates/epics/plan.html` is a template, not an epic
 * - a worktree's page, served from the main checkout (`/worktrees/<w>/...`) or opened from disk
 *   (`.claude/worktrees/<w>/...`):  read from inside the worktree,
 *   so a worktree named `goals` isn't the `goals` area
 * - a component set's page (`componentSet()`):  none, it has a tab of its own
 */
export function docsArea(path: string, areas: readonly string[]): string | undefined {
  if (componentSet(path) !== undefined) return undefined
  const folders = path.replace(WORKTREE_PREFIX, "").split("/").slice(0, -1)
  return folders.find((folder) => areas.includes(folder))
}

/**
 * The name of the site header's `PrefStore`:  `spell-site:edit` (per tab) is its `edit`.
 * - The chosen colour scheme, `spell-site:scheme`, is `ColorScheme`'s (`spell/util/persist`).
 */
export const SITE_PREFS = "spell-site"

/** Edit mode on for this tab:  its key in `SITE_PREFS`, kept per tab (`sessionStorage`'s `spell-site:edit`). */
export const EDIT_PREF = "edit"
