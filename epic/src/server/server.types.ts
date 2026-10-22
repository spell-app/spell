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
 * Its port:  `SPELL_EPIC_PORT`, else 4848.
 * - the machine's server keeps it:  taken, it doesn't start, never on another port (epic `epic-engine` I69:
 *   every restart moved open pages to a dead address);  `EpicServer.claimPort()`
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

/**
 * EPIC UI, the elements' docs set (epic `epic-workflow` P10):  the engine's `src/docs/`, served at `/components/epics/`
 * by both page servers, not by an engine route:
 * - spell-app's (its root `package.json`'s `"pageServer"` `"componentSets"`, `componentSets()` in `spell-kit/server/page`;
 *   its `dir` `spell-epic/src/docs`)
 * - the epic server, the same way (`EpicServer`'s `epicUiMounts()`, epic `epic-eject` I21)
 * - `name`:  what prose calls it
 * - `path`:  its pages' PAGE PATHS start with it, as served (`components/epics/epic-item.html`:  `pages.js`
 *   `pagePath()`, `pageAt()`)
 * - `dir`:  its folder, from the engine's checkout
 * - its pages take comments, in inbox files beside them:  the tools find them there (`PageInboxes.inboxFiles()`;
 *   epic `epic-engine` P2, T3)
 */
export const EPIC_UI = { name: "Epic UI", path: "components/epics", dir: "src/docs" } as const

/**
 * Code colours (highlight.js) for every docs page, from the engine instead of cdnjs (epic `airplane` P1).
 * - `cdn`:  the tag older pages still carry, a plain blocking `<script>`:  a hanging network (plane wifi asking to
 *   pay first) held the page's own scripts up behind it, and the page showed raw markup for tens of seconds
 * - `local`:  the same file (11.9.0), at the engine's assets route
 * - who swaps the one for the other:  the epic server as it serves a page (`EpicServer`'s `localHighlight()`),
 *   `epic airplane` / `epic pages offline --fix` in the files (`offline.ts`);  spell-app's page server has its own
 *   swap (its `page-server` package)
 * - the engine's own since epic `epic-engine` P8 (r8):  it was spell-app's `HIGHLIGHT_JS` in `spell-kit/server/page`
 */
export const HIGHLIGHT_JS = {
  cdn: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
  local: `${ENGINE_ROUTES.assets.prefix}highlight.min.js`
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
 * - the server's overlay for pages not migrated (`legacyEnginePath()`):  a worktree of spell-app from before epic
 *   `epic-eject`;  the asset-route migrations that rewrote the rest went in epic `repo-split` (Q45)
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

/**
 * Where a repo's APP says how it stands (`RepoApp`, epic `epic-engine` I49):  `/api/app/<repo>`, `AppStatus` as JSON.
 * - the App tab's "Starting ..." page polls it
 */
export const APP_API = "/api/app"

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

/**
 * How a repo's app stands (`RepoApp.status()`, `/api/app/<repo>`):
 * - `declared`:  its config names one (`EpicApp`)
 * - `up`:  it answers at `url`
 * - `starting`:  its start command runs, or ran, and it doesn't answer yet;  `since`:  when it began
 * - `canStart`:  its config names a start command
 * - `failed`:  why the start failed (it exited with an error, or the app didn't answer in time), or why the config
 *   won't read
 * - `log`:  where the start command's output goes
 */
export type AppStatus = {
  repo: string
  declared: boolean
  up: boolean
  url?: string
  starting: boolean
  canStart?: boolean
  since?: string
  failed?: string
  log: string
}
