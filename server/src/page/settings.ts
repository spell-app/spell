import { existsSync, readFileSync } from "node:fs"
import { join, posix } from "node:path"

import type { ComponentSet, EngineRoute, PageServerSettings } from "$/server/page"

/**
 * The `"pageServer"` field of the `package.json` at `root`;  `{}` without one.
 * - route modules, watched folders, the writable folders, the bundles, page scripts, component sets, engine routes
 * - read fresh on each call:  a server reads it once as it starts, the tools as they need it
 * - NOTE: plain `node` loads this file by path (spell-epic's tools, through `page.types.ts`):
 *   node built-ins and type imports only
 */
export function pageServerSettings(root: string): PageServerSettings {
  const file = join(root, "package.json")
  if (!existsSync(file)) return {}
  return (JSON.parse(readFileSync(file, "utf8")) as { pageServer?: PageServerSettings }).pageServer ?? {}
}

/**
 * Where the component sets are served:  `/components/<set>/` (epic `people-and-orgs` P18, Q25).
 * - One home for every set, so the top bar lists them all from one place.
 * - A repo set's name never has an `@`;  a space's always will, so they can't clash.
 * - Here, not in `page.types.ts` (which re-exports it):  this file loads under plain `node`, without the `$/` aliases.
 */
export const COMPONENTS_PREFIX = "/components"

/**
 * The component sets `settings` name (`"componentSets"`), in their order, each with its address:
 * `/components/<id>` (`COMPONENTS_PREFIX`).
 */
export function componentSets(settings: PageServerSettings): ComponentSet[] {
  return Object.entries(settings.componentSets ?? {}).map(([id, set]) => ({
    name: set.name,
    prefix: `${COMPONENTS_PREFIX}/${id}`,
    dir: set.dir,
    assets: set.assets
  }))
}

/**
 * The engine routes `settings` name (`"engineRoutes"`), each as a URL prefix and the URL path its folder is served at
 * (`folderUrl()`), both ending `/`:  `"/_epic/pack/": "x/__pack"` => `["/_epic/pack/", "/x/__pack/"]`;
 * `"../spell-epic/src/tools/_assets"` => `"/_beside/spell-epic/src/tools/_assets/"`.
 */
export function engineRoutes(settings: PageServerSettings): EngineRoute[] {
  return Object.entries(settings.engineRoutes ?? {}).map(([route, folder]) => [
    withSlash(route),
    withSlash(folderUrl(folder))
  ])
}

/**
 * Where the folders a page server serves from OUTSIDE its checkout are, as URL paths:  `/_beside/<folder>/`, the
 * folder's path from the checkout's PARENT (epic `repo-split` P8).
 * - e.g. spell-app's settings name `../spell-ui/docs` (Spell UI's component set, in the repo beside it, inside the
 *   top repo `spell`):  served at `/_beside/spell-ui/docs/`
 * - only the folders its settings name (`besideFolders()`), each mounted on its own:  never the parent folder whole
 */
export const BESIDE_PREFIX = "/_beside"

/**
 * The URL path a settings folder (relative to the checkout) is served at, no trailing `/`:  inside the checkout its
 * own path (`app/docs` => `/app/docs`), beside it under `BESIDE_PREFIX` (`../spell-ui/docs` => `/_beside/spell-ui/docs`).
 * - the checkout itself:  `""`
 * - throws a `TypeError` for one further up than the checkout's parent (`../../x`)
 */
export function folderUrl(folder: string): string {
  const path = posix.normalize(folder.replace(/^\/+/, "")).replace(/\/+$/, "")
  if (path === "." || path === "") return ""
  if (path === ".." || !path.startsWith("../")) return path === ".." ? BESIDE_PREFIX : `/${path}`
  const beside = path.slice("../".length)
  if (beside === ".." || beside.startsWith("../"))
    throw new TypeError(`folderUrl():  '${folder}' is above the checkout's parent;  only a folder beside it is served`)
  return `${BESIDE_PREFIX}/${beside}`
}

/** Is settings folder `folder` outside the checkout (`../spell-ui/docs`)? */
export function isBeside(folder: string): boolean {
  return folderUrl(folder).startsWith(`${BESIDE_PREFIX}/`)
}

/**
 * The folders `settings` names OUTSIDE the checkout, each once:  the component sets' pages and bundles, the engine
 * routes' folders.  The page server mounts each at its `folderUrl()`.
 */
export function besideFolders(settings: PageServerSettings): string[] {
  const sets = Object.values(settings.componentSets ?? {}).flatMap((set) => [set.dir, set.assets])
  const folders = [...sets, ...Object.values(settings.engineRoutes ?? {})].filter(isBeside)
  return [...new Set(folders.map((folder) => posix.normalize(folder).replace(/\/+$/, "")))]
}

/** `path`, ending `/`. */
function withSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`
}
