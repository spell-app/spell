import { existsSync, readFileSync } from "node:fs"
import { dirname, join, posix, relative, resolve, sep } from "node:path"

import JSON5 from "json5"

import { contentFolderOf } from "spell-kit/server/contentFolder"
import type { ComponentSet, EngineRoute, PageServerSettings } from "spell-kit/server/page"

/**
 * The page server's settings for checkout `root`:  every installed repo's `"pageServer"` part, merged
 * (epic `repo-split` P16);  `{}` without any.
 * - Each repo declares ITS OWN part, in its own `package.json`, the way it declares its `"spell": { "commands" }`:
 *   the route modules, folders, component sets ... it adds to the page server.
 * - Which repos:  in a kit (`root` at or inside a folder holding `REPOS_FILE`), the kit first, then the content repo's
 *   (`CONTENT_SETTINGS`:  the site's tabs, the writable folders), then each child repo its `repos.json5` lists that's
 *   installed, in that order (`settingsParts()`);  outside a kit, `root`'s own.
 * - Every path in a part is relative to ITS repo's folder;  here they come back relative to `root`
 *   (`spell-ui`'s `"docs"` is `spell-ui/docs` from the kit, `../spell-ui/docs` from spell-app).
 * - How the parts merge (`mergeSettings()`):  the lists end to end, in repo order;  the maps (`componentSets`,
 *   `engineRoutes`, `localCopies`) entry by entry, a later repo's entry winning.
 * - Read fresh on each call:  a server reads it once as it starts, the tools as they need it.
 * - NOTE: plain `node` loads this file by path (spell-epic's tools, through `page.types.ts`):
 *   node built-ins, `json5` and type imports only
 */
export function pageServerSettings(root: string): PageServerSettings {
  return mergeSettings(resolve(root), settingsParts(root))
}

/**
 * One repo's part of the page server's settings:  its folder, and its `package.json`'s `"pageServer"`.
 * - `dir`:  absolute;  the part's paths are relative to it
 */
export type SettingsPart = { readonly dir: string; readonly settings: PageServerSettings }

/**
 * The parts of the page server's settings for checkout `root`, in merge order:
 * - in a kit (`kitOf()`):  the kit's own part, then the content repo's (`CONTENT_SETTINGS`, in the content folder
 *   `contentFolderOf()` names), then each child repo's that `REPOS_FILE` lists, lowest first
 *   - a child repo is where it's cloned (`<kit>/<name>/`), else where it's installed (`<kit>/node_modules/<name>/`);
 *     one that's neither is left out:  the server runs with whatever is installed
 *   - names no repo of its own:  the list is the kit's data
 * - outside a kit:  `root`'s own part, when it has one
 * - a repo whose `package.json` has no `"pageServer"`:  no part
 */
export function settingsParts(root: string): SettingsPart[] {
  const kit = kitOf(root)
  if (!kit) {
    const settings = repoSettings(resolve(root))
    return settings ? [{ dir: resolve(root), settings }] : []
  }
  const content = contentFolderOf(kit)
  const parts = [
    { dir: kit, settings: repoSettings(kit) },
    { dir: content ?? kit, settings: content ? contentSettings(content) : undefined },
    ...childRepos(kit).map((dir) => ({ dir, settings: repoSettings(dir) }))
  ]
  return parts.flatMap(({ dir, settings }) => (settings ? [{ dir, settings }] : []))
}

/**
 * The content repo's part of the page server's settings:  a file of its own, at the content folder's root
 * (epic `repo-split` P16, Owen:  they describe the content repo, so they live in it)
 * - what's in it:  the site header's tabs (`siteTabs`), the folders the page editor may write (`writable`), what moved
 *   out of it (`gone`)
 * - JSON5, like every data file of the content repo;  its paths (none today) from the content folder
 */
export const CONTENT_SETTINGS = "page-server.json5"

/** The content repo's part, `CONTENT_SETTINGS` in folder `content`;  `undefined` without one, or unreadable. */
function contentSettings(content: string): PageServerSettings | undefined {
  try {
    return JSON5.parse(readFileSync(join(content, CONTENT_SETTINGS), "utf8")) as PageServerSettings
  } catch {
    return undefined
  }
}

/**
 * The parts `parts`, merged into one, every path relative to `root` (`pageServerSettings()`).
 * - `routes`, `watch`, `bundles`, `pageScripts`' `file`, `componentSets`' `dir` and `assets`, `engineRoutes`' folders:
 *   paths, each from its part's `dir`
 * - `writable`, `gone`, `siteTabs`, `localCopies`:  not paths of a repo (content folders, URLs), kept as they are
 */
export function mergeSettings(root: string, parts: readonly SettingsPart[]): PageServerSettings {
  const merged: PageServerSettings = {}
  for (const { dir, settings } of parts) {
    const path = (each: string) => pathFrom(root, dir, each)
    const add = <K extends ListKey>(key: K, items: PageServerSettings[K]) => {
      if (items?.length) (merged[key] as unknown[]) = [...((merged[key] as unknown[]) ?? []), ...items]
    }
    add("routes", settings.routes?.map(path))
    add("watch", settings.watch?.map(path))
    add("writable", settings.writable)
    add("gone", settings.gone)
    add("bundles", settings.bundles?.map(path))
    add(
      "pageScripts",
      settings.pageScripts?.map((script) => (script.file ? { ...script, file: path(script.file) } : script))
    )
    add("siteTabs", settings.siteTabs)
    if (settings.componentSets) {
      const sets = Object.entries(settings.componentSets).map(([id, set]) => [
        id,
        { ...set, dir: path(set.dir), assets: path(set.assets) }
      ])
      merged.componentSets = { ...merged.componentSets, ...Object.fromEntries(sets) }
    }
    if (settings.engineRoutes) {
      const routes = Object.entries(settings.engineRoutes).map(([route, folder]) => [route, path(folder)])
      merged.engineRoutes = { ...merged.engineRoutes, ...Object.fromEntries(routes) }
    }
    if (settings.localCopies) merged.localCopies = { ...merged.localCopies, ...settings.localCopies }
  }
  return merged
}

/** The settings' lists, which `mergeSettings()` lays end to end. */
type ListKey = "routes" | "watch" | "writable" | "gone" | "bundles" | "pageScripts" | "siteTabs"

/** The kit's own file at its root, listing the child repos, lowest first:  what marks a folder as a kit. */
export const REPOS_FILE = "repos.json5"

/**
 * The checkout a page server for folder `from` serves (epic `repo-split` P16):
 * - in a kit:  the kit (`kitOf()`), from any folder of it, a child repo's or the content folder's alike
 * - else the git checkout `from` is in (`findRoot()`), else `from` itself
 * - So `spell server start | status | stop` mean ONE server from anywhere in the kit.
 */
export function pageServerRoot(from: string): string {
  return kitOf(from) ?? findRoot(from) ?? resolve(from)
}

/**
 * `root`, resolved, when it's a kit's root:  the page server starts from the kit's root ONLY (epic `repo-split` P16).
 * - throws a `TypeError` for any other folder (`--root spell-app`), naming the kit to start it from
 */
export function kitRootOf(root: string): string {
  const resolved = resolve(root)
  if (existsSync(join(resolved, REPOS_FILE))) return resolved
  const kit = kitOf(resolved)
  const fix = kit ? `start it from the kit, ${kit}` : `this folder is in no kit (no ${REPOS_FILE} above it)`
  throw new TypeError(
    `page server:  ${resolved} isn't a kit's root;  the page server starts from the kit's root only:  ${fix} ` +
      `(\`spell server start\`, from any folder of the kit, finds it)`
  )
}

/** The kit `dir` is in:  the nearest folder at or above it holding `REPOS_FILE`;  else `undefined`. */
export function kitOf(dir: string): string | undefined {
  for (let at = resolve(dir); ; at = dirname(at)) {
    if (existsSync(join(at, REPOS_FILE))) return at
    if (dirname(at) === at) return undefined
  }
}

/**
 * The checkout at `root`:  the folder holding `.git` at or above `start`.
 * - a worktree's `.git` is a FILE:  still its root
 */
export function findRoot(start: string): string | undefined {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir
    if (dirname(dir) === dir) return undefined
  }
}

/** The child repos of `kit` that are there, lowest first:  each one `REPOS_FILE` lists, by its folder. */
function childRepos(kit: string): string[] {
  let names: string[]
  try {
    const text = readFileSync(join(kit, REPOS_FILE), "utf8")
    names = (JSON5.parse(text) as { repos?: { name: string }[] }).repos?.map((repo) => repo.name) ?? []
  } catch {
    return []
  }
  return names.flatMap(
    (name) =>
      [join(kit, name), join(kit, "node_modules", name)].find((dir) => existsSync(join(dir, "package.json"))) ?? []
  )
}

/**
 * ONE repo's part of the page server's settings:  the `"pageServer"` field of the `package.json` in `dir`, its paths
 * from `dir`, never merged;  `undefined` without one.
 * - e.g. spell-epic's epic server reads its own route modules from it
 */
export function repoSettings(dir: string): PageServerSettings | undefined {
  const file = join(dir, "package.json")
  if (!existsSync(file)) return undefined
  return (JSON.parse(readFileSync(file, "utf8")) as { pageServer?: PageServerSettings }).pageServer
}

/** Path `path` of the repo at `dir`, from `root`, `/`-separated:  `.` for `root` itself. */
function pathFrom(root: string, dir: string, path: string): string {
  return relative(root, resolve(dir, path)).split(sep).join("/") || "."
}

/**
 * Where the component sets are served:  `/components/<set>/` (epic `people-and-orgs` P18, Q25).
 * - One home for every set, so the top bar lists them all from one place.
 * - A repo set's name never has an `@`;  a space's always will, so they can't clash.
 * - Here, not in `page.types.ts` (which re-exports it):  this file loads under plain `node`:  node's modules and type imports only.
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
 * - e.g. settings read for spell-app's folder (`pageServerSettings()`) name `../spell-ui/docs`:
 *   Spell UI's component set, in the repo beside it, served at `/_beside/spell-ui/docs/`
 *   - a page server of the kit has none:  every repo is inside it (epic `repo-split` P16)
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
