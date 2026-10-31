import { existsSync, readFileSync } from "node:fs"
import { dirname, join, posix, relative, resolve, sep } from "node:path"

import JSON5 from "json5"

import { checkoutOf } from "spell/server/checkout"
import { contentFolderOf } from "spell/server/contentFolder"
import { kitFolders } from "spell/server/kitFolders"
import type { ComponentSet, EngineRoute, PageServerSettings } from "spell/server/page"

/**
 * The page server's settings for checkout `root`:  every part's `"pageServer"`, merged (epic `repo-split` P16, P20);
 * `{}` without any.
 * - Each part declares ITS OWN settings, in its own `package.json`, the way it declares its `"spell": { "commands" }`:
 *   the route modules, folders, component sets ... it adds to the page server.
 * - Which parts:  in a kit (`root` at or inside a folder holding `REPOS_FILE`), the kit first, then the epic repo's
 *   (`CONTENT_SETTINGS`:  the site's tabs, the writable folders), then each of the kit's folders (its `package.json`'s
 *   `workspaces`, lowest first), then each repo beside it (`REPOS_FILE`'s peers:  spell-brand), then each project
 *   the checkout names (`LOCAL_SETTINGS`), in that order (`settingsParts()`);  outside a kit, `root`'s own.
 * - Every path in a part is relative to ITS folder;  here they come back relative to `root`
 *   (Spell UI's `"docs"` is `ui/docs` from the kit, `../ui/docs` from the app's folder).
 * - How the parts merge (`mergeSettings()`):  the lists end to end, in that order;  the maps (`componentSets`,
 *   `engineRoutes`, `localCopies`) entry by entry, a later part's entry winning.
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
 * - in a kit (`kitOf()`):  the kit's own part, then the epic repo's (`CONTENT_SETTINGS`, in the epic folder
 *   `contentFolderOf()` names), then each of the kit's folders (`kitFolders()`:  `parser/`, `ui/`, `epic/`, `app/`),
 *   then each repo beside the kit `REPOS_FILE` lists as a peer (`peerRepos()`:  spell-brand), then each project the
 *   checkout's own `LOCAL_SETTINGS` names (`localProjects()`:  a tester's)
 *   - names no folder or project of its own:  the lists are the kit's data and the checkout's
 *   - a project that isn't there is left out:  the server runs with whatever is there
 * - outside a kit:  `root`'s own part, when it has one
 * - a folder whose `package.json` has no `"pageServer"`:  no part
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
    ...[...new Set([...kitFolders(kit), ...peerRepos(kit), ...localProjects(kit)])].map((dir) => ({
      dir,
      settings: repoSettings(dir)
    }))
  ]
  return parts.flatMap(({ dir, settings }) => (settings ? [{ dir, settings }] : []))
}

/**
 * The repos beside the kit that `REPOS_FILE` lists as peers, that are there, absolute (epic `repo-split` P20,
 * epic-engine Q48):  `{ name: "spell-brand", path: "../spell-brand", peer: true }`, a project of its own that uses
 * `spell` as any other would.
 * - `path` is from the kit's folder;  a kit WORKTREE (`~/www/spell.worktrees/<epic>/`) has none beside it, so there
 *   it's from the MAIN checkout (`~/www/spell`):  every worktree sees main's spell-brand, `~/www/spell-brand`.
 * - NEVER throws:  an unreadable `REPOS_FILE` lists none
 */
export function peerRepos(kit: string): string[] {
  let repos: unknown
  try {
    repos = (JSON5.parse(readFileSync(join(kit, REPOS_FILE), "utf8")) as { repos?: unknown }).repos
  } catch {
    return []
  }
  if (!Array.isArray(repos)) return []
  const main = checkoutOf(kit)?.main
  return repos.flatMap((repo: { path?: unknown; peer?: unknown }) => {
    if (repo?.peer !== true || typeof repo.path !== "string") return []
    const path = repo.path
    const found = [kit, main]
      .filter((from): from is string => typeof from === "string")
      .map((from) => resolve(from, path))
      .find((dir) => existsSync(join(dir, "package.json")))
    return found ? [found] : []
  })
}

/**
 * The checkout's own file naming more projects whose page server parts it serves, each folder from the kit's:
 * `{ projects: ["../my-project"] }` (epic `repo-split` P20).
 * - For a project of someone else's, trying the epic framework on it:  spell-brand, the kit's own peer, is in
 *   `REPOS_FILE` instead (`peerRepos()`).
 * - Git-ignored, each checkout's own:  where such a project sits is a fact of the machine, not of the branch.
 */
export const LOCAL_SETTINGS = "page-server.local.json5"

/** The projects `LOCAL_SETTINGS` names that are there, absolute;  none without the file. */
export function localProjects(kit: string): string[] {
  let projects: unknown
  try {
    projects = (JSON5.parse(readFileSync(join(kit, LOCAL_SETTINGS), "utf8")) as { projects?: unknown }).projects
  } catch {
    return []
  }
  if (!Array.isArray(projects)) return []
  return projects
    .filter((project): project is string => typeof project === "string")
    .map((project) => resolve(kit, project.replace(/^~(?=\/)/, process.env.HOME ?? "~")))
    .filter((dir) => existsSync(join(dir, "package.json")))
}

/**
 * The epic repo's part of the page server's settings:  a file of its own, at the epic folder's root
 * (epic `repo-split` P16, Owen:  they describe the epic repo, so they live in it)
 * - what's in it:  the site header's tabs (`siteTabs`), the folders the page editor may write (`writable`), what moved
 *   out of it (`gone`)
 * - JSON5, like every data file of the epic repo;  its paths (none today) from the epic folder
 */
export const CONTENT_SETTINGS = "page-server.json5"

/** The epic repo's part, `CONTENT_SETTINGS` in folder `content`;  `undefined` without one, or unreadable. */
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

/** The kit's own file at its root, listing the repos beside it:  what marks a folder as a kit. */
export const REPOS_FILE = "repos.json5"

/**
 * The checkout a page server for folder `from` serves (epic `repo-split` P16):
 * - in a kit:  the kit (`kitOf()`), from any folder of it, a big folder's or the epic folder's alike
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
 * Page `file`'s ADDRESS, when it's in a component set's folder of checkout `root`:  `/components/ui/ui-button.html`
 * for `<root>/ui/docs/ui-button.html`;  `undefined` for any other file.
 * - what every link to a set's page must name:  served from its folder's own path (`/ui/docs/ui-button.html`),
 *   the page loads none of the `_assets/` it finds beside its address, and shows as unstyled text (epic `epic-engine`
 *   I136)
 * - each segment URL-encoded;  a worktree's page is this under `/worktrees/<w>` (`mainServerUrl()`)
 * - `sets`:  `root`'s, from its settings, unless given
 */
export function componentSetAddressOf(
  root: string,
  file: string,
  sets: readonly ComponentSet[] = componentSets(pageServerSettings(root))
): string | undefined {
  const path = relative(resolve(root), resolve(file)).split(sep).join("/")
  const set = sets.find((each) => path.startsWith(`${each.dir}/`))
  if (!set) return undefined
  const inside = path
    .slice(set.dir.length + 1)
    .split("/")
    .map(encodeURIComponent)
    .join("/")
  return `${set.prefix}/${inside}`
}

/**
 * The file component-set ADDRESS `address` names in checkout `root` (`componentSetAddressOf()` turned round):
 * `<root>/ui/docs/ui-button.html` for `/components/ui/ui-button.html`;  `undefined` for any other path.
 * - `address`:  a URL path, encoded or not
 */
export function componentSetFileOf(
  root: string,
  address: string,
  sets: readonly ComponentSet[] = componentSets(pageServerSettings(root))
): string | undefined {
  const set = sets.find((each) => address.startsWith(`${each.prefix}/`))
  if (!set) return undefined
  const inside = address
    .slice(set.prefix.length + 1)
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent)
  return join(resolve(root), set.dir, ...inside)
}

/**
 * The engine routes `settings` name (`"engineRoutes"`), each as a URL prefix and the URL path its folder is served at
 * (`folderUrl()`), both ending `/`:  `"/_epic/pack/": "x/__pack"` => `["/_epic/pack/", "/x/__pack/"]`;
 * `"../epic/src/tools/_assets"` => `"/_beside/epic/src/tools/_assets/"`.
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
 * - e.g. settings read for spell-app's folder (`pageServerSettings()`) name `../ui/docs`:
 *   Spell UI's component set, in the repo beside it, served at `/_beside/ui/docs/`
 *   - a page server of the kit has none:  every repo is inside it (epic `repo-split` P16)
 * - only the folders its settings name (`besideFolders()`), each mounted on its own:  never the parent folder whole
 */
export const BESIDE_PREFIX = "/_beside"

/** A level further up than the checkout's parent, in a `BESIDE_PREFIX` URL (`folderUrl()`). */
const UP = "_up"

/**
 * The URL path a settings folder (relative to the checkout) is served at, no trailing `/`:  inside the checkout its
 * own path (`app/docs` => `/app/docs`), beside it under `BESIDE_PREFIX` (`../ui/docs` => `/_beside/ui/docs`).
 * - the checkout itself:  `""`
 * - further up than the checkout's parent, an `_up/` a level (`../../x` => `/_beside/_up/x`):  each is mounted on its
 *   own, so its URL only has to be unique
 */
export function folderUrl(folder: string): string {
  const path = posix.normalize(folder.replace(/^\/+/, "")).replace(/\/+$/, "")
  if (path === "." || path === "") return ""
  if (path === ".." || !path.startsWith("../")) return path === ".." ? BESIDE_PREFIX : `/${path}`
  // each level further up than the parent is an `_up/` (a project beside the kit, from a kit worktree:
  // `../../spell-brand.worktrees/x` => `/_beside/_up/spell-brand.worktrees/x`;  epic `repo-split` P20)
  let beside = path.slice("../".length)
  let up = ""
  while (beside === ".." || beside.startsWith("../")) {
    up += `${UP}/`
    beside = beside === ".." ? "" : beside.slice("../".length)
  }
  return `${BESIDE_PREFIX}/${up}${beside}`.replace(/\/$/, "")
}

/** Is settings folder `folder` outside the checkout (`../ui/docs`)? */
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
