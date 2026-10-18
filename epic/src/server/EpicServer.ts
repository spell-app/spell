import { existsSync, mkdirSync, statSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { SRV, type ServedFile } from "$/server"
import {
  HIGHLIGHT_JS,
  PageEditor,
  pageServerSettings,
  type PageConfig,
  type RouteContext,
  type RouteModule
} from "$/server/page"

import { RepoList } from "./RepoList"
import {
  DEFAULT_EPIC_PORT,
  ENGINE_ROUTES,
  HOME_ENV,
  legacyEnginePath,
  LOG_FILE,
  PID_FILE,
  type EpicServerInfo,
  type Repo
} from "./server.types"

/****************
 * ### `EpicServer`
 * spell-epic's ONE page server per machine (epic `epic-eject` P7):
 * every registered repo's content folder, the engine's assets and pack, and the epic route modules, on one port.
 *
 * ```text
 * /_epic/assets/...       spell-epic's src/tools/_assets/   (spell-ui.js, spell-doc.css, the runtime ...)
 * /_epic/pack/...         spell-epic's src/components/__pack/   (epics.pack.js)
 * /r/<repo>/...           that repo's content folder (its .epic/config.json5's contentFolder)
 * /...                    the DEFAULT repo's content folder too, so today's URLs keep working
 * /api/server             what it serves (EpicServerInfo)
 * /api/...                the epic route modules, for the default repo (below)
 * ```
 *
 * - The repos:  `~/.spell-epic/repos.json5` (`RepoList`), read as it starts.
 *   `ensure()` restarts a server older than that file, so a repo added shows at the next opener.
 * - Pages not migrated to the engine routes yet (`../../packages/epics/tools/_assets/...`) still load THIS engine's
 *   assets:  an overlay serves the old paths from the engine routes (`legacyEnginePath()`).
 * - The ROUTE MODULES are spell-epic's own (`ROUTE_MODULES`), set up ONCE, for the default repo:
 *   `root` is its main checkout, and the docs tools' `ROOT` is too (`EPIC_CHECKOUT`, set before they load).
 *   - Another repo's pages are served and live-reload,
 *     but their calls (`/api/...`) reach the default repo's routes:
 *     several route modules read the checkout once, as they load (`pages.js` `ROOT`),
 *     so one process serves one repo's calls.
 *     TODO:  a call per repo (`/r/<repo>/api/...`), with the test repo (P9).
 *   - Page edits (`/api/pages`, `/api/files`):  the default repo's content folder,
 *     only inside its `writable` folders (its `package.json`'s `"pageServer"`, else `WRITABLE`).
 * - NOT spell-app's page server:  no component sets, no Spell UI site, no app;  spell-app's own server keeps those.
 * - Its pid file and log are in spell-epic's home folder (`~/.spell-epic/server.json`, `server.log`).
 * - Its port:  `DEFAULT_EPIC_PORT` (4848), not spell-app's 4747.
 * - Run it with `epic hub` (`Hub`), never by hand.
 ****************/
export class EpicServer {
  /** spell-epic's home folder:  the repo list, the pid file, the log */
  readonly home: string

  /** spell-epic's checkout:  the assets, the pack and the route modules served */
  readonly engine: string

  /** every repo served, the default one marked */
  readonly repos: Repo[]

  /** the repo served at `/` and whose calls the route modules answer;  `undefined`:  none registered */
  readonly defaultRepo: Repo | undefined

  /** the web server underneath */
  readonly web: SRV.WebServer

  /** `<home>/server.json` */
  readonly pidFile: SRV.PidFile

  /** what `/api/server` answers;  `port` set by `start()` */
  readonly info: EpicServerInfo

  /** more fields for every page's `window.SPELL_SERVER`, from route modules (`addPageConfig()`) */
  private pageConfigs: PageConfig[] = []

  /** run once listening, from route modules */
  private listenings: (() => unknown)[] = []

  /** run on `stop()`, from route modules */
  private stops: (() => unknown)[] = []

  /**
   * - `home`:  default `RepoList.homeFolder()`
   * - `engine`:  default this code's checkout
   * - `repos`:  default the home folder's list
   * - `token`:  the guard's (default random)
   */
  constructor({
    home = RepoList.homeFolder(),
    engine = ENGINE_ROOT,
    repos,
    token
  }: { home?: string; engine?: string; repos?: Repo[]; token?: string } = {}) {
    this.home = resolve(home)
    this.engine = resolve(engine)
    this.repos = repos ?? new RepoList({ home: this.home }).repos()
    this.defaultRepo = this.repos.find((repo) => repo.isDefault) ?? this.repos[0]
    this.pidFile = new SRV.PidFile(this.home, PID_FILE)
    this.info = {
      pid: process.pid,
      port: 0,
      root: this.home,
      started: new Date().toISOString(),
      engine: this.engine,
      repos: this.repos,
      epicServer: true
    }
    this.web = new SRV.WebServer({
      root: this.defaultRepo?.content ?? this.home,
      token,
      live: true,
      mounts: this.mounts(),
      html: [localHighlight],
      configure: (served) => this.pageConfig(served)
    })
    // a page not migrated to the engine routes:  its old asset and pack paths from THIS engine
    this.web.files.overlays.push(legacyEnginePath)
    const router = this.web.router
    router.get(SRV.SERVER_API, (_request, reply) => reply.set("Cache-Control", "no-store").json(this.info))
    // a repo's own address:  its home page, as spell-app's page server's `/`
    for (const repo of this.repos) {
      if (!existsSync(join(repo.content, HOME_PAGE))) continue
      router.get(repo.prefix, (request, reply, next) =>
        request.path.endsWith("/") ? reply.redirect(`${repo.prefix}${HOME_PAGE}`) : next()
      )
      if (repo === this.defaultRepo) router.get("/", (_request, reply) => reply.redirect(`/${HOME_PAGE}`))
    }
    const repo = this.defaultRepo
    if (repo) {
      const writable = pageServerSettings(repo.checkout).writable ?? WRITABLE
      new PageEditor({ root: repo.content, writable }).route(router, this.web.guard)
      new SRV.FileOperations({ root: repo.content, writable }).route(router, this.web.guard)
    }
  }

  /**
   * Load the route modules, start watching, listen, write the pid file, then run route modules' `onListening`s.
   * - `port`:  wanted (default `DEFAULT_EPIC_PORT`);  taken:  any free one
   * - `routes`:  load the route modules (default `true`;  tests turn it off)
   * - `pidFile`:  write `server.json` (default `true`)
   */
  async start({
    port = DEFAULT_EPIC_PORT,
    routes = true,
    pidFile = true
  }: { port?: number; routes?: boolean; pidFile?: boolean } = {}): Promise<this> {
    this.watch()
    if (routes && this.defaultRepo) await this.loadRoutes()
    const { port: actual } = await this.web.listen({ port })
    this.info.port = actual
    if (pidFile) {
      mkdirSync(this.home, { recursive: true })
      this.pidFile.write(this.info)
    }
    for (const start of this.listenings)
      await Promise.resolve(start()).catch((error: unknown) => {
        console.error("epic server:  a route module's onListening failed:", error)
      })
    return this
  }

  /** stop:  route modules' stops, the pid file (if ours), the server */
  async stop(): Promise<void> {
    for (const stop of this.stops) await Promise.resolve(stop()).catch(() => {})
    this.pidFile.removeIfOurs()
    await this.web.close()
  }

  /**
   * The epic server of home folder `home`:  its info, `base` URL, and whether it was `launched`.
   * - started in the background if it isn't running
   * - restarted when it started before its code or the repo list last changed
   * - runs `bin/epic hub serve` (spell-epic's `tsx` loader is in it), output to `<home>/server.log`
   * - what `epic hub ensure`, `epic hub url` and the openers call
   */
  static async ensure(home = RepoList.homeFolder(), port = DEFAULT_EPIC_PORT) {
    const folder = resolve(home)
    mkdirSync(folder, { recursive: true })
    const pidFile = new SRV.PidFile(folder, PID_FILE)
    const running = await pidFile.status()
    const list = new RepoList({ home: folder }).file
    // a repo added or removed since it started:  a fresh one serves the new list
    if (running && existsSync(list) && statSync(list).mtimeMs > Date.parse(running.started)) await pidFile.stop()
    return pidFile.ensure({
      command: [process.execPath, EPIC_BIN, "hub", "serve", "--port", String(port)],
      env: { [HOME_ENV]: folder },
      log: join(folder, LOG_FILE),
      sources: SOURCES
    })
  }

  ////////////////
  // ## What it serves
  ////////////////

  /**
   * The folders served:  the engine's routes, each repo at `/r/<repo>/`, the default repo at `/`.
   * - the engine's templates at each repo's `/r/<repo>/templates/` too, where its pages' `../templates/` leads
   *   (epic `epic-eject` T11)
   */
  private mounts(): SRV.Mount[] {
    const engine = Object.values(ENGINE_ROUTES).map((route) => ({
      prefix: route.prefix,
      dir: join(this.engine, route.dir)
    }))
    const templates = join(this.engine, ENGINE_ROUTES.templates.dir)
    const repoTemplates = this.repos.map((repo) => ({ prefix: `${repo.prefix}templates/`, dir: templates }))
    const repos = [...repoTemplates, ...this.repos.map((repo) => ({ prefix: repo.prefix, dir: repo.content }))]
    const home = this.defaultRepo ? [{ prefix: "/", dir: this.defaultRepo.content }] : []
    return [...engine, ...repos, ...home]
  }

  /**
   * What a page served from `served` gets as `window.SPELL_SERVER`, beyond the web server's own:
   * - `file`:  its URL path as LIVE RELOAD reports it, under the prefix it was asked by (`/r/<repo>/...` or `/...`)
   * - `repo`, `base`:  its repo's name and URL prefix (`/` for the default repo's pages at the root)
   * - `root`:  that repo's main checkout
   * - `engine`:  spell-epic's checkout
   * - `edit`, `etag`:  the page editor, for the default repo's pages
   * - and what route modules add (`addPageConfig()`)
   */
  pageConfig(served: ServedFile): Record<string, unknown> {
    const asked = this.repos.find((repo) => served.path.startsWith(repo.prefix))
    const repo = asked ?? this.defaultRepo
    const base = asked ? asked.prefix : "/"
    const inside = repo && relative(repo.content, served.file)
    const file =
      inside && !inside.startsWith("..") ? `${base}${inside.split(sep).map(encodeURIComponent).join("/")}` : undefined
    return {
      ...(file && { file }),
      ...(repo && { repo: repo.name, root: repo.checkout }),
      base,
      engine: this.engine,
      ...(repo?.isDefault && { edit: PageEditor.PREFIX }),
      etag: SRV.StaticHandler.etagOf(statSync(served.file)),
      ...Object.assign({}, ...this.pageConfigs.map((add) => add(served)))
    }
  }

  /**
   * Live reload:
   * - each repo's content at its prefix (the default's at `/` too)
   * - the engine's assets and pack at their routes (and at their old paths, for pages not migrated yet)
   */
  private watch(): void {
    const live = this.web.live!
    for (const repo of this.repos) {
      if (repo.isDefault) live.watch(repo.content, { ignore: UNWATCHED })
      live.watch(repo.content, { ignore: UNWATCHED, servedAt: repo.prefix })
    }
    for (const route of Object.values(ENGINE_ROUTES)) {
      const dir = join(this.engine, route.dir)
      live.watch(dir, { servedAt: route.prefix })
      // the old paths too (`/src/tools/_assets/`), unless the route IS its folder's path (`/templates/`)
      if (route.prefix !== `/${route.dir}/`) live.watch(dir, { servedAt: `/${route.dir}/` })
    }
    // the templates at each repo's prefix
    for (const repo of this.repos)
      live.watch(join(this.engine, ENGINE_ROUTES.templates.dir), { servedAt: `${repo.prefix}templates/` })
  }

  ////////////////
  // ## Route modules
  ////////////////

  /**
   * Import each of `ROUTE_MODULES` from the engine and run its `setup()`, for the default repo.
   * - a failure is logged, not fatal
   * - SIDE EFFECT:  `EPIC_CHECKOUT` is the default repo's main checkout from here on, unless it was set:
   *   the docs tools read it as they load, as their root (`pages.js` `ROOT`)
   */
  private async loadRoutes(): Promise<void> {
    process.env.EPIC_CHECKOUT ??= this.defaultRepo!.checkout
    for (const path of ROUTE_MODULES) {
      try {
        const module = (await import(pathToFileURL(join(this.engine, path)).href)) as { default: RouteModule }
        await module.default.setup(this.routeContext())
      } catch (error) {
        console.error(`epic server:  route module ${path} failed to load:`, error)
      }
    }
  }

  /**
   * What a route module's `setup()` gets:  the page server's `RouteContext`, for the default repo.
   * - `root`:  the default repo's main checkout
   * - `serveWorktrees()`:  only noted (`info.worktrees`), since there is nothing per worktree to serve:
   *   a repo's pages are its shared content, the same in every worktree, and the engine's assets are this checkout's
   * - tests set a route module up by hand with it, on a server started with `routes: false`
   */
  routeContext(): RouteContext {
    return {
      root: this.defaultRepo?.checkout ?? this.home,
      router: this.web.router,
      guard: this.web.guard,
      live: this.web.live!,
      web: this.web,
      info: this.info,
      serveWorktrees: (...dirs) => void (this.info.worktrees = dirs[0] && resolve(dirs[0])),
      addPageConfig: (add) => void this.pageConfigs.push(add),
      onListening: (start) => this.listenings.push(start),
      onStop: (stop) => this.stops.push(stop)
    }
  }

  /**
   * Where the page at URL path `path` is served from, as `SRV.StaticHandler.resolve()` finds it:
   * its file, or `undefined`.
   */
  fileFor(path: string): string | undefined {
    const found = this.web.files.resolve(path)
    return found && "file" in found ? found.file : undefined
  }
}

/** `html`, its cdnjs highlight.js tag pointing at the engine's copy:  pages load offline (`HIGHLIGHT_JS`). */
export function localHighlight(html: string): string {
  return html.replaceAll(HIGHLIGHT_JS.cdn, `${ENGINE_ROUTES.assets.prefix}highlight.min.js`)
}

/** spell-epic's checkout:  `src/server/` is two folders down. */
const ENGINE_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")

/** spell-epic's `epic` command:  what a background server runs (`hub serve`). */
const EPIC_BIN = join(ENGINE_ROOT, "bin", "epic")

/**
 * The route modules, from spell-epic's checkout, in the order spell-app's page server loads them
 * (its root `package.json`'s `"pageServer"` `"routes"`, the epic ones):
 * pages Owen answers on, comments, the review loop, new epics and favourites, epic links, the running epics,
 * agents, side-bar links, airplane mode.
 */
export const ROUTE_MODULES = [
  "src/tools/detailsRoutes.ts",
  "src/tools/choicesRoutes.ts",
  "src/tools/commentsRoutes.ts",
  "src/tool/reviewRoutes.ts",
  "src/tool/epicRoutes.ts",
  "src/tool/linkRoutes.ts",
  "src/list/runningRoutes.ts",
  "src/tools/agentRoutes.ts",
  "src/tools/showRoutes.ts",
  "src/tools/airplaneRoutes.ts"
] as const

/**
 * Folders whose code, when newer than a running server, makes `ensure()` restart it
 * (`SRV.newestChange()`:  every `.ts` / `.js` / `.mjs` file in them;  `_assets/` and `node_modules/` skipped):
 * - ALL of spell-epic's code, `src/` (epic `epic-eject` I11):  the route modules import far beyond their own folders
 *   (`config/`, `data/`, `links/`, `review/`, the elements' definitions ...), so watching only theirs and this one
 *   missed a change to the rest
 * - the server package's (spell-app's, through `.spell-app`)
 */
export const SOURCES = [join(ENGINE_ROOT, "src"), join(ENGINE_ROOT, ".spell-app", "packages", "server", "src")]

/** A repo's home page, in its content folder:  where its address (`/`, `/r/<repo>/`) leads. */
const HOME_PAGE = "pages/index.html"

/** Folders page edits may write when a repo's `package.json` names none:  the shared content areas. */
const WRITABLE = ["epics", "guides", "pages", "brand", "sagas"]

/**
 * Paths in a content folder live reload never reports, as spell-app's page server skips them:
 * a guide's `scripts/` and `experiments/` (but an experiment's built `*.bundle.js`, which its guide loads).
 */
const UNWATCHED = /(^|\/)scripts\/|(^|\/)experiments\/(?!(.*\/)?[^/]+\.bundle\.js$)/
