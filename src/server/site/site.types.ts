/**
 * Types of the site header and section editor, and how the header lights its tabs.
 * - Browser code:  no node imports.
 * - GENERIC (epic `repo-split` I4):  it names no site's parts.
 *   The tabs are data (`SiteTab`):  the page server's settings, or `defineSite()`'s caller.
 */

/**
 * One TAB of the site header:  a part of the site with its own home page.
 * - DATA, never code in this package:  the header knows no site's parts
 *   - served:  the page server's settings, `"siteTabs"` (`PageServerSettings.siteTabs`),
 *     handed to every page it serves as `SPELL_SERVER.siteTabs`
 *   - else (a `file://` page, a server whose settings name none):  what `defineSite()`'s caller passes
 *     (`SiteHeader.fallbackTabs`)
 *   - plain JSON, so a setting and a served page can carry it
 * - `name`:  its label, e.g. `Epic/UI`
 * - `path`:  its home page, relative to the site's root (`guides/index.html`), or server-absolute (`/components/ui/`)
 * - `serverOnly`:  its home exists only when served:  greyed out on a `file://` page
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
  serverOnly?: boolean
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
 * - MUST match the page server's `COMPONENTS_PREFIX` (`spell-kit/server/page`'s `settings.ts`, node code:  not imported here)
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
 * Which component set page path `path` is in (`location.pathname`), by its served address;  `undefined` for anything
 * else.
 * - `/components/<set>/`, a worktree's too (`/worktrees/<w>/components/<set>/`):  the page server's `componentSets`
 *   setting, each at `/components/<id>/`
 * - a set's folder on disk (a `file://` page) has no address:  a tab names it in its `paths`
 */
export function componentSet(path: string): string | undefined {
  return COMPONENT_SET_ADDRESS.exec(path)?.[1]
}

/**
 * Which docs area page path `path` is in (`location.pathname`:  served, or a `file://` path), of `areas`, the area
 * folders' names (`guides`, `epics` ...);  `undefined` for anything else.
 * - an area is a folder with a tab of its own (`SiteTab.areas`):  the page server's, or the shared content folder's
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
 * `localStorage` key of the chosen color scheme:  `light`, `dark`, or absent for the OS's.
 * - ONE key for every doc site, so a switch on one site holds on the others:
 *   Spell UI's `ThemePreference` reads and writes it too, as `DOCS_LOOK_KEYS.scheme`
 *   (`packages/ui/src/docs-components/docs-components.types.ts`)
 * - MUST stay equal:  `ui`'s `UIDocsThemes.test.tsx` pins it
 */
export const SCHEME_KEY = "spell-site:scheme"

/**
 * Keys the scheme lived under before `SCHEME_KEY` (2026-10-04).
 * Read once while `SCHEME_KEY` is absent, copied to it, then removed;  the first valid one wins.
 * - `spell-site:theme`:  this header's
 * - `spell-ui-site:scheme`:  Spell UI's site
 * - MUST equal `DOCS_LEGACY_SCHEME_KEYS` in `ui`'s `docs-components.types.ts`
 */
export const LEGACY_SCHEME_KEYS = ["spell-site:theme", "spell-ui-site:scheme"] as const

/** Media query of the OS's dark scheme:  what an absent `SCHEME_KEY` follows. */
export const DARK_QUERY = "(prefers-color-scheme: dark)"

/** A color scheme a page shows. */
export type SiteScheme = "light" | "dark"

/**
 * Classes on `<html>` that force a scheme:  Spell UI's (`ThemePreference`).
 * - the site header sets them too, and so does a page with its own light / dark switch (Spell App's pill)
 */
export const SCHEME_CLASSES = { light: "ui-light", dark: "ui-dark" } as const satisfies Record<SiteScheme, string>

/**
 * The scheme `classes` (`<html>`'s) force, or `undefined` when neither class is on (the page follows the OS).
 * - Why:  the site header's sun / moon shows what the page SHOWS, also when the page switched it itself.
 */
export function forcedScheme(classes: { contains(token: string): boolean }): SiteScheme | undefined {
  if (classes.contains(SCHEME_CLASSES.dark)) return "dark"
  if (classes.contains(SCHEME_CLASSES.light)) return "light"
  return undefined
}

/** `sessionStorage` key:  edit mode on for this tab. */
export const EDIT_KEY = "spell-site:edit"
