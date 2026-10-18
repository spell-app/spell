/**
 * Types and constants of spell-epic's ONE page server per machine (`EpicServer`, epic `epic-eject` P7):
 * where it keeps its files, the URLs it serves, the repos it serves them for.
 * - Data and pure helpers only:  nothing here starts a server or touches the disk.
 */

////////////////
// ## Where it keeps its files
////////////////

/**
 * spell-epic's folder in the home folder, `~/.spell-epic/`:
 * it holds `repos.json5` (`REPOS_FILE`), the server's pid file and its log.
 * - `SPELL_EPIC_HOME` puts it elsewhere:  tests give a temp folder, so no test touches the real one
 */
export const HOME_FOLDER = ".spell-epic"

/** The env var that moves `HOME_FOLDER` (tests). */
export const HOME_ENV = "SPELL_EPIC_HOME"

/** The registered repos, in `HOME_FOLDER`:  `RepoList`. */
export const REPOS_FILE = "repos.json5"

/** The server's pid file, in `HOME_FOLDER` (`SRV.PidFile`):  where `epic hub ensure` and the extension find it. */
export const PID_FILE = "server.json"

/** The background server's output, in `HOME_FOLDER`. */
export const LOG_FILE = "server.log"

/**
 * The port it asks for first:  `SPELL_EPIC_PORT`, else 4848.
 * - taken:  any free one (the pid file says which)
 * - NOT 4747, spell-app's page server's, so the two run side by side
 */
export const DEFAULT_EPIC_PORT = Number(process.env.SPELL_EPIC_PORT) || 4848

////////////////
// ## The URLs
////////////////

/**
 * Where the ENGINE's own files are served:  spell-epic's checkout, whichever repo the page is in.
 * - `/_epic/assets/...`:  the docs pages' assets (spell-epic's `src/tools/_assets/`):
 *   `spell-ui.js`, `spell-doc.css`, the runtime, `highlight.min.js`, the emoji chunks
 * - `/_epic/pack/...`:  the epics component pack (spell-epic's `src/components/__pack/`), `epics.pack.js`
 * - one prefix, starting `_`, so no content folder's own folder can take it
 * - and the templates, `/templates/...` (spell-epic's `templates/`, epic `epic-eject` T11):  NOT under `/_epic/`,
 *   since every page links the Templates page as a content folder, `../templates/index.html` (the top bar's tab)
 *   - so the content folders can't hold a `templates/` of their own:  a repo's own templates are `repoTemplates`
 *     (`EpicConfig`), elsewhere
 *   - served for each repo too, at `/r/<repo>/templates/` (`EpicServer`)
 */
export const ENGINE_PREFIX = "/_epic"

/** Each engine route:  its URL prefix, and the folder it serves, from the engine's checkout. */
export const ENGINE_ROUTES = {
  assets: { prefix: `${ENGINE_PREFIX}/assets/`, dir: "src/tools/_assets" },
  pack: { prefix: `${ENGINE_PREFIX}/pack/`, dir: "src/components/__pack" },
  templates: { prefix: "/templates/", dir: "templates" }
} as const

/** The epic pack's script, as every page loads it:  `<ui-components source>`. */
export const PACK_URL = `${ENGINE_ROUTES.pack.prefix}epics.pack.js`

/**
 * Where a registered repo's content folder is served:
 * `/r/<repo>/...`, with the same paths inside (`/r/spell-app/epics/seo/seo.plan.html`).
 * - the DEFAULT repo is served at `/` too, so today's URLs keep working (`/epics/seo/seo.plan.html`)
 */
export const REPO_PREFIX = "/r/"

/** Where the default repo's worktrees are served, once its running-epics route module says where they are. */
export const WORKTREES_PREFIX = "/worktrees/"

/**
 * The engine's files as pages linked them before the asset routes, from a checkout's root:
 * the folder, and the route it is now (`engineUrlFor()`).
 * - `packages/epics/tools/_assets/` (since epic `people-and-orgs` P16), and the docs package's before it
 * - `packages/epics/components/__pack/` (since P18), and `packages/epics/pack/` before it
 */
export const LEGACY_ENGINE_PATHS: readonly (readonly [folder: string, route: string])[] = [
  ["packages/epics/tools/_assets/", ENGINE_ROUTES.assets.prefix],
  ["packages/docs/tools/_assets/", ENGINE_ROUTES.assets.prefix],
  ["packages/docs/_assets/", ENGINE_ROUTES.assets.prefix],
  ["packages/epics/components/__pack/", ENGINE_ROUTES.pack.prefix],
  ["packages/epics/pack/", ENGINE_ROUTES.pack.prefix]
]

/**
 * A page's link to one of the engine's files (`href`, `src`, `source`), as its engine route:
 * `../../packages/epics/tools/_assets/spell-ui.js` => `/_epic/assets/spell-ui.js`.
 * - `undefined` for any other link
 * - the link from any depth (`../` any number of times), or from the root (`/packages/...`)
 * - an engine route already:  `undefined` (nothing to change)
 * - what the asset-route migrations write (`EngineAssetRoutes`, `migrate.js`),
 *   and the server's overlay for pages not migrated yet (`legacyEnginePath()`)
 */
export function engineUrlFor(href: string): string | undefined {
  const path = /^(?:\.\.\/)*\/?(?:\.\/)?(.*)$/.exec(href)?.[1] ?? href
  const legacy = LEGACY_ENGINE_PATHS.find(([folder]) => path.startsWith(folder))
  return legacy && `${legacy[1]}${path.slice(legacy[0].length)}`
}

/**
 * The engine route a URL path of the OLD shape serves from;  else `undefined`.
 * - `/packages/epics/tools/_assets/x.js`, `/r/<repo>/packages/...` or `/worktrees/<w>/packages/...`
 *   => `/_epic/assets/x.js`
 * - the server's overlay (`SRV.StaticHandler.overlays`),
 *   so a page not migrated yet still loads THIS engine's assets and pack
 */
export function legacyEnginePath(path: string): string | undefined {
  const match = /^(?:\/r\/[^/]+|\/worktrees\/[^/]+)?\/(packages\/.*)$/.exec(path)
  return match ? engineUrlFor(match[1]!) : undefined
}

/** The URL prefix repo `name` is served at:  `/r/<name>/`. */
export function repoPrefixFor(name: string): string {
  return `${REPO_PREFIX}${encodeURIComponent(name)}/`
}

/** `path`'s segments URI-encoded, `/`-joined:  `epics/a b/x.html` => `epics/a%20b/x.html`. */
export function encodedPath(path: string): string {
  return path.split(/[\\/]/).map(encodeURIComponent).join("/")
}

////////////////
// ## The repos
////////////////

/**
 * A repo name:  what its URL prefix says, `/r/<name>/`.
 * - letters, digits, `.`, `_` and `-`, starting with a letter or digit:  `spell-app`
 */
export const REPO_NAME = /^[a-z0-9][\w.-]*$/i

/** `repos.json5`:  every registered repo, and which one is served at `/`. */
export type RepoListData = {
  /** the repo served at `/` too;  none:  the first */
  default?: string
  /** in the order they were added */
  repos: RepoEntry[]
}

/** One repo, as `repos.json5` keeps it:  its name and main checkout;  the rest is read from its config. */
export type RepoEntry = {
  /** its URL name, `/r/<name>/` */
  name: string
  /** its main checkout, absolute */
  checkout: string
}

/**
 * A registered repo, as the server serves it:  its entry, and where its `.epic/config.json5` says its content is.
 * - `content`:  the content folder, absolute (`EpicConfig.contentFolder`)
 * - `prefix`:  its URL prefix, `/r/<name>/`
 * - `isDefault`:  served at `/` too
 */
export type Repo = RepoEntry & { content: string; prefix: string; isDefault: boolean }

/**
 * What the epic server says of itself, at `/api/server` and in its pid file:
 * the page server's `ServerInfo` (`root` being spell-epic's home folder, where the pid file is), plus what it serves.
 * - `engine`:  spell-epic's checkout, whose assets, pack and route modules it serves
 * - `repos`:  every repo it serves, the default first
 * - `epicServer`:  `true`, so a reader can tell it from a checkout's page server
 */
export type EpicServerInfo = {
  pid: number
  port: number
  root: string
  started: string
  engine: string
  repos: Repo[]
  epicServer: true
  worktrees?: string
}
