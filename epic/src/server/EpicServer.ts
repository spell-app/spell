import { existsSync, mkdirSync, statSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { SRV, type Handler, type ServedFile } from "spell/server"
import {
  componentSets,
  PageEditor,
  pageServerSettings,
  repoSettings,
  SET_ASSETS,
  UNWATCHED,
  withLocalCopies,
  type PageConfig,
  type RouteModule
} from "spell/server/page"
import type { SiteTab } from "spell/server/site/site.types"
import { resolvedFile } from "spell/toolchain/sourceNames"

import { EpicHome } from "spell/epic/config/EpicHome"
import type { ContentRouteContext } from "spell/epic/list/runningRoutes"

import { packageDir } from "spell/epic/tools/packageDir"

import { RepoApp } from "./RepoApp"
import { RepoList } from "./RepoList"
import {
  DEFAULT_EPIC_PORT,
  ENGINE_ROUTES,
  EPIC_UI,
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
 * /components/epics/...   Epic UI, the elements' pages:  spell-epic's src/docs/   (EPIC_UI)
 * /components/epics/_assets/...   their site bundle:  the default repo's settings' Epic UI set's, else Spell UI's
 * /components/<set>/...   every OTHER component set the default repo's checkout names (its package.json's
 *                         "pageServer" "componentSets"):  Spell UI, App UI, the brand's;  its site bundle at _assets/,
 *                         from that checkout (`componentSetMounts()`)
 * /r/<repo>/...           that repo's content folder (its .epic/config.json5's contentFolder), then its main checkout
 * /r/<repo>/components/<set>/...   that repo's component sets, the same way
 * /...                    the DEFAULT repo's content folder and checkout too, so today's URLs keep working
 * /editor/                the default repo's APP (the top bar's App tab):  started if it isn't up, then redirected to
 * /r/<repo>/editor/       each repo's (`RepoApp`;  the path is its config's `app.path`)
 * /api/server             what it serves (EpicServerInfo)
 * /api/app/<repo>         how a repo's app stands (`AppStatus`):  what the "Starting ..." page polls
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
 * - Epic UI, the engine's own component set, at `/components/epics/` as spell-app's page server serves it
 *   (`epicUiMounts()`, epic `epic-eject` I21:  it answered 404 here)
 * - The OTHER component sets, as spell-app's page server serves them (`componentSetMounts()`, epic `epic-engine` I48:
 *   the top bar's Spell/UI and App/UI tabs answered 404 here)
 * - The folders each repo's settings serve at their own addresses (`repoRouteMounts()`, epic `epic-engine` I58:  App
 *   UI's pages load the app's `/element/spell.pack.js`, which answered 404 here)
 * - The sets' SITE BUNDLE (Spell UI's, spell-ui's `site/_assets`) isn't committed:  it builds the default repo's
 *   bundles itself as it starts, with that checkout's own build (`buildBundles()`, epic `epic-engine` P8), so it never
 *   waits for spell-app's page server
 * - The APP (the top bar's App tab, `/editor/`;  epic `epic-engine` I49):  each repo's, as its `.epic/config.json5`'s
 *   `"app"` declares it (`RepoApp`):  redirected to while it answers;  else started (its own command, detached, from
 *   its main checkout) behind a "Starting ..." page that goes there once it does;  none declared:  a page saying so.
 *   spell-app's is the editor its page server starts (spaces' `appRoutes.ts`).
 * - The site header's tabs:  the default repo's settings' (`"siteTabs"`), told every page as its own page server tells
 *   them (`SPELL_SERVER.siteTabs`;  epic `repo-split` I4)
 * - Its pid file and log are in spell-epic's home folder (`~/.spell-epic/server.json`, `server.log`).
 * - Its port:  `DEFAULT_EPIC_PORT` (4848), not spell-app's 4747;  only ever that one (`claimPort()`, epic `epic-engine`
 *   I69)
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

  /** each repo's app, in `repos`' order (`RepoApp`) */
  readonly apps: RepoApp[]

  /** more fields for every page's `window.SPELL_SERVER`, from route modules (`addPageConfig()`) */
  private pageConfigs: PageConfig[] = []

  /** run once listening, from route modules */
  private listenings: (() => unknown)[] = []

  /** run on `stop()`, from route modules */
  private stops: (() => unknown)[] = []

  /** the folder served at `/components/epics/`:  the engine's `src/docs/`, or the one the constructor was given */
  private readonly epicUiDir: string

  /** every component set's folders, at their addresses:  Epic UI's, then the repos' others */
  private readonly setMounts: SRV.Mount[]

  /** the folders each repo's settings serve at their own addresses (`repoRouteMounts()`) */
  private readonly routeMounts: SRV.Mount[]

  /**
   * the site header's tabs every page is told (`SPELL_SERVER.siteTabs`):  the default repo's settings' `"siteTabs"`,
   * as its own page server tells them;  none:  `undefined`, and pages show no tabs (epic `epic-engine` P46)
   */
  private readonly siteTabs?: readonly SiteTab[]

  /**
   * CDN URLs pages load, each with its local copy's URL, as the kit's page server swaps them (`withLocalCopies()`):
   * the engine's own settings' `"localCopies"` (highlight.js, `HIGHLIGHT_JS`), then the default repo's merged ones
   */
  private readonly localCopies: Record<string, string>

  /** the default repo's bundles' build, once `start()` has begun it (`buildBundles()`) */
  private bundles?: BundleBuilder

  /**
   * - `home`:  default the epic home (`EpicHome.folder()`)
   * - `engine`:  default this code's checkout
   * - `repos`:  default the home folder's list
   * - `token`:  the guard's (default random)
   * - `epicUi`:  the folder served at `/components/epics/` (default the engine's `src/docs/`):  a demo check's scratch
   *   copy, so its comments' inboxes never land in the real folder
   */
  constructor({
    home = EpicHome.folder(),
    engine = ENGINE_ROOT,
    repos,
    token,
    epicUi
  }: { home?: string; engine?: string; repos?: Repo[]; token?: string; epicUi?: string } = {}) {
    this.home = resolve(home)
    this.engine = resolve(engine)
    this.epicUiDir = resolve(epicUi ?? join(this.engine, EPIC_UI.dir))
    this.repos = repos ?? new RepoList({ home: this.home }).repos()
    this.defaultRepo = this.repos.find((repo) => repo.isDefault) ?? this.repos[0]
    this.setMounts = [...this.epicUiMounts(), ...this.componentSetMounts()]
    this.routeMounts = this.repoRouteMounts()
    const settings = this.defaultRepo && pageServerSettings(this.defaultRepo.checkout)
    this.siteTabs = settings?.siteTabs
    this.localCopies = { ...repoSettings(this.engine)?.localCopies, ...settings?.localCopies }
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
      html: [(page) => withLocalCopies(page, this.localCopies)],
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
    // each repo's app (the top bar's App tab):  the default's at `/` too
    this.apps = this.repos.map((each) => new RepoApp(each, this.home))
    for (const app of this.apps) {
      app.route(router, app.repo.prefix)
      if (app.repo === this.defaultRepo) app.route(router, "/")
    }
    RepoApp.routeStatus(router, this.apps)
    if (repo) {
      const writable = pageServerSettings(repo.checkout).writable ?? WRITABLE
      new PageEditor({ root: repo.content, writable }).route(router, this.web.guard)
      new SRV.FileOperations({ root: repo.content, writable }).route(router, this.web.guard)
    }
  }

  /**
   * Load the route modules, start watching, listen, write the pid file, then run route modules' `onListening`s.
   * - `port`:  wanted (default `DEFAULT_EPIC_PORT`)
   *   - taken, with a pid file:  throws, stopped again, never on another port (epic `epic-engine` I69):  the machine's
   *     server keeps ONE address, and a second one started beside it (two `ensure()`s at once) exits, writing nothing
   *   - taken, without one (a demo check's own):  any free one
   * - `routes`:  load the route modules (default `true`;  tests turn it off)
   * - `pidFile`:  write `server.json` (default `true`)
   * - `bundles`:  build the default repo's stale bundles in the background (default `true`;  tests turn it off:
   *   `buildBundles()`)
   */
  async start({
    port = DEFAULT_EPIC_PORT,
    routes = true,
    pidFile = true,
    bundles = true
  }: { port?: number; routes?: boolean; pidFile?: boolean; bundles?: boolean } = {}): Promise<this> {
    this.watch()
    if (bundles) await this.buildBundles()
    if (routes && this.defaultRepo) await this.loadRoutes()
    let actual: number
    try {
      ;({ port: actual } = await this.web.listen({ port, fallback: !pidFile }))
    } catch (error) {
      await this.stop()
      if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error
      throw new Error(
        `epic server:  port ${port} is taken, so this one doesn't start (\`epic hub ensure\` says by what)`
      )
    }
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
   * - always on `port`:  `claimPort()` first
   * - runs `bin/epic hub serve` (spell-epic's `tsx` loader is in it), output to `<home>/server.log`
   * - what `epic hub ensure`, `epic hub url` and the openers call
   */
  static async ensure(home = EpicHome.folder(), port = DEFAULT_EPIC_PORT) {
    const folder = resolve(home)
    mkdirSync(folder, { recursive: true })
    const pidFile = new SRV.PidFile(folder, PID_FILE)
    await EpicServer.claimPort(pidFile, port)
    return pidFile.ensure({
      command: [process.execPath, EPIC_BIN, "hub", "serve", "--port", String(port)],
      env: { [HOME_ENV]: folder },
      log: join(folder, LOG_FILE),
      sources: SOURCES
    })
  }

  /**
   * Make `port` the home's epic server's, as `ensure()` begins (epic `epic-engine` I69):  ONE server, on ONE port.
   * - an epic server of THIS home on `port` (it answers `/api/server` so) that the pid file doesn't name:  ADOPTED,
   *   the pid file names it, the one it named is stopped
   *   - how one went unnamed:  two `ensure()`s at once each started one;  the first took `port`, the second took a
   *     free one and wrote the pid file last, and from then on each restart replaced only the second, on yet another
   *     port, while the first kept `port`
   * - the pid file's server on ANOTHER port, or older than the repo list (a repo added or removed since):  stopped,
   *   so a fresh one starts on `port`, serving the new list
   * - `port` held by anything else (another home's epic server, another program):  throws, saying so, rather than
   *   start one elsewhere;  never stops what isn't provably this home's
   * - `pidFile`:  the home's (`<home>/server.json`)
   */
  static async claimPort(pidFile: SRV.PidFile, port: number): Promise<void> {
    let running = await pidFile.status()
    const onPort = await epicServerOn(port)
    if (onPort && onPort.root === pidFile.root && onPort.pid !== running?.pid) {
      await pidFile.stop()
      pidFile.write(onPort)
      running = await pidFile.status()
    }
    const list = new RepoList({ home: pidFile.root }).file
    const listNewer = running && existsSync(list) && statSync(list).mtimeMs > Date.parse(running.started)
    if (running && (running.port !== port || listNewer)) {
      await pidFile.stop()
      running = undefined
    }
    if (running || (await SRV.isFree(port))) return
    const holder = onPort ? `the epic server of ${onPort.root} (pid ${onPort.pid})` : "another program"
    throw new SRV.HttpError(409, `port ${port} is taken, by ${holder}:  stop it, or give another (--port)`)
  }

  ////////////////
  // ## What it serves
  ////////////////

  /**
   * The folders served:  the engine's routes, each repo at `/r/<repo>/`, the default repo at `/`.
   * - the engine's templates at each repo's `/r/<repo>/templates/` too, where its pages' `../templates/` leads
   *   (epic `epic-eject` T11)
   * - each repo's main CHECKOUT under its content, where the content has no such file (epic `epic-engine` I25), as
   *   spell-app's page server lays the two:  a page's links to code (`../../packages/...`, `../../epic/src/...`)
   *   and the data a page draws from the checkout serving it (the spell syntax guide's `spellSyntax.json`, the core
   *   reference page's declarations) resolve here too;  dot files never served
   */
  private mounts(): SRV.Mount[] {
    const engine = Object.values(ENGINE_ROUTES).map((route) => ({
      prefix: route.prefix,
      dir: join(this.engine, route.dir)
    }))
    const templates = join(this.engine, ENGINE_ROUTES.templates.dir)
    const repoTemplates = this.repos.map((repo) => ({ prefix: `${repo.prefix}templates/`, dir: templates }))
    // at one prefix the first folder holding the path answers (`SRV.StaticHandler`):  the content, then the checkout
    const repos = [
      ...repoTemplates,
      ...this.repos.flatMap((repo) => [
        { prefix: repo.prefix, dir: repo.content },
        { prefix: repo.prefix, dir: repo.checkout }
      ])
    ]
    const repo = this.defaultRepo
    const home = repo
      ? [
          { prefix: "/", dir: repo.content },
          { prefix: "/", dir: repo.checkout }
        ]
      : []
    return [...engine, ...this.setMounts, ...this.routeMounts, ...repos, ...home]
  }

  /**
   * The folders each repo's settings serve at their own addresses, as spell-app's page server serves them
   * (`engineRoutes()`, `"engineRoutes"` in the root `package.json`'s `"pageServer"`;  epic `epic-engine` I58):
   * - e.g. spell-app's `"/element/": "app/dist-element"`, the app's element bundles that App UI's pages load
   * - the folder is from the repo's main checkout, as the settings give it (`../ui/docs` is beside it)
   * - `/<route>`:  the default repo's;  `/r/<repo>/<route>`:  each repo's
   * - after the engine's own routes (`ENGINE_ROUTES`) and the sets:  at one prefix the first folder holding the path
   *   answers (`SRV.StaticHandler`), so the engine's `/_epic/assets/` is still this engine's, never a repo's copy
   * - a folder not built yet is no error:  its paths answer 404
   */
  private repoRouteMounts(): SRV.Mount[] {
    return this.repos.flatMap((repo) => {
      const bases = repo === this.defaultRepo ? ["/", repo.prefix] : [repo.prefix]
      return Object.entries(pageServerSettings(repo.checkout).engineRoutes ?? {}).flatMap(([route, folder]) =>
        bases.map((base) => ({
          prefix: `${base}${route.replace(/^\/+|\/+$/g, "")}/`,
          dir: resolve(repo.checkout, folder)
        }))
      )
    })
  }

  /**
   * Every OTHER component set a repo's checkout names, as spell-app's page server serves them
   * (`componentSets()`, `componentSetPath()`;  epic `epic-engine` I48):
   * - the sets:  the ones the repo's MAIN checkout's settings name (its root `package.json`'s `"pageServer"`
   *   `"componentSets"`, `pageServerSettings()`), never a copy:  spell-app's are Spell UI, App UI, the brand's
   *   - each where that checkout has its folder (`dir`):  a repo naming none gets nothing
   *   - NOT Epic UI:  the engine's own (`epicUiMounts()`)
   * - `/components/<set>/...`:  the default repo's;  `/r/<repo>/components/<set>/...`:  each repo's
   * - `<set address>/_assets/...`:  its site bundle (`assets`), from the same checkout:  Spell UI's site bundle, every
   *   set's since epic `epic-engine`;  built, not committed (spell-app's:  `buildBundles()`)
   * - the longer prefix wins (`SRV.StaticHandler`), so `_assets/` is the bundle's, never the set's folder's
   */
  private componentSetMounts(): SRV.Mount[] {
    return this.repos.flatMap((repo) => {
      const bases = repo === this.defaultRepo ? ["/", repo.prefix] : [repo.prefix]
      return componentSets(pageServerSettings(repo.checkout))
        .filter((set) => set.prefix !== `/${EPIC_UI.path}` && existsSync(join(repo.checkout, set.dir)))
        .flatMap((set) =>
          bases.flatMap((base) => {
            const prefix = `${base}${set.prefix.slice(1)}/`
            return [
              { prefix: `${prefix}${SET_ASSETS}/`, dir: join(repo.checkout, set.assets) },
              { prefix, dir: join(repo.checkout, set.dir) }
            ]
          })
        )
    })
  }

  /**
   * Epic UI, the elements' docs set (`EPIC_UI`), as spell-app's page server mounts its component sets
   * (`componentSets()`, `componentSetPath()`):
   * - `/components/epics/...`:  the engine's `src/docs/`, its pages, `__parts/` and `__data/`
   * - `/components/epics/_assets/...`:  the site bundle the DEFAULT repo's settings give Epic UI (`assets`), else
   *   their first set's, from its main checkout;  built as the server starts (`buildBundles()`)
   *   - read from the settings, never named here:  Spell UI's site bundle since epic `epic-engine` (every set's, packs
   *     and all;  spell-app's settings name spell-ui's `site/_assets`)
   *   - a default repo naming no sets (or none registered):  Spell UI's own, `site/_assets/` in the `spell-ui`
   *     workspace (`packageDir()`, epic `epic-engine` P10);  not built there:  no bundle, the pages unstyled
   * - the longer prefix wins (`SRV.StaticHandler`), so `_assets/` is the bundle's, never the docs folder's
   */
  private epicUiMounts(): SRV.Mount[] {
    const prefix = `/${EPIC_UI.path}/`
    const checkout = this.defaultRepo?.checkout
    const sets = checkout ? componentSets(pageServerSettings(checkout)) : []
    const assets = (sets.find((set) => set.prefix === `/${EPIC_UI.path}`) ?? sets[0])?.assets
    const ui = packageDir("spell-ui")
    const dir = checkout && assets ? join(checkout, assets) : ui && join(ui, SPELL_UI_ASSETS)
    return [...(dir ? [{ prefix: `${prefix}${SET_ASSETS}/`, dir }] : []), { prefix, dir: this.epicUiDir }]
  }

  /**
   * Build the default repo's bundles whose sources changed since their last build, in the background, with that
   * checkout's OWN build:  the `BundleBuild` of the kit its install resolves (`spell/server/page`;  `spell bundle
   * --stale`, with its own CLI;  epic `epic-engine` P8, r8), loaded from the checkout, so the build is that
   * checkout's code, not this one's (spell-app's `page-server` held it until epic `repo-split` P16).
   * - the bundles:  that checkout's settings' `"bundles"`, Spell UI's site bundle among them, which every component
   *   set's pages load at `_assets/` (`epicUiMounts()`, `componentSetMounts()`)
   * - so the epic server never waits for spell-app's page server to build it:  only those two build it
   * - a request for a missing file of one waits while it runs (`BundleBuild.wait`):  a set's page opened at once
   *   still gets its bundle;  live reload reloads the pages once it's written (the set mounts are watched)
   * - its output goes to the server's log, `bundles:  ...`;  `stop()` ends it
   * - NEVER throws:  a checkout without the kit or the CLI builds nothing, a failed build leaves the old bundle
   */
  private async buildBundles(): Promise<void> {
    const checkout = this.defaultRepo?.checkout
    if (this.bundles || !checkout) return
    const entry = resolvedFile(PAGE_SERVER, checkout)
    if (!entry) return
    let BundleBuild: BundleBuilderClass
    try {
      ;({ BundleBuild } = (await import(pathToFileURL(entry).href)) as { BundleBuild: BundleBuilderClass })
    } catch (error) {
      console.error(`bundles:  couldn't load ${PAGE_SERVER} from ${checkout}:`, error)
      return
    }
    const build = (this.bundles = new BundleBuild({ root: checkout }))
    this.web.router.use(build.wait)
    build.start()
    this.stops.push(() => build.stop())
  }

  /**
   * What a page served from `served` gets as `window.SPELL_SERVER`, beyond the web server's own:
   * - `file`:  its URL path as LIVE RELOAD reports it, under the prefix it was asked by (`/r/<repo>/...` or `/...`);
   *   a component set's page:  its address (`/components/ui/ui-button.html`), where its folder is watched
   * - `repo`, `base`:  its repo's name and URL prefix (`/` for the default repo's pages at the root)
   * - `root`:  that repo's main checkout
   * - `engine`:  spell-epic's checkout
   * - `edit`, `etag`:  the page editor, for the default repo's pages
   * - `siteTabs`:  the site header's tabs, the default repo's settings' (`siteTabs`), every page's alike:
   *   the header keeps no repo's prefix (`/r/<repo>/`) on its links
   * - and what route modules add (`addPageConfig()`)
   */
  pageConfig(served: ServedFile): Record<string, unknown> {
    const asked = this.repos.find((repo) => served.path.startsWith(repo.prefix))
    const repo = asked ?? this.defaultRepo
    const base = asked ? asked.prefix : "/"
    const inside = repo && relative(repo.content, served.file)
    const set = this.setMounts.find(
      (mount) => served.path.startsWith(mount.prefix) && !relative(mount.dir, served.file).startsWith("..")
    )
    const inSet = set && relative(set.dir, served.file)
    const file = inSet
      ? `${set.prefix}${inSet.split(sep).map(encodeURIComponent).join("/")}`
      : inside && !inside.startsWith("..")
        ? `${base}${inside.split(sep).map(encodeURIComponent).join("/")}`
        : undefined
    return {
      ...(file && { file }),
      ...(repo && { repo: repo.name, root: repo.checkout }),
      base,
      engine: this.engine,
      ...(repo?.isDefault && { edit: PageEditor.PREFIX }),
      etag: SRV.StaticHandler.etagOf(statSync(served.file)),
      ...(this.siteTabs && { siteTabs: this.siteTabs }),
      ...Object.assign({}, ...this.pageConfigs.map((add) => add(served)))
    }
  }

  /**
   * Live reload:
   * - each repo's content at its prefix (the default's at `/` too)
   * - the engine's assets and pack at their routes (and at their old paths, for pages not migrated yet)
   * - the component sets' pages and their site bundles, at their addresses (`epicUiMounts()`, `componentSetMounts()`)
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
    for (const mount of this.setMounts) if (existsSync(mount.dir)) live.watch(mount.dir, { servedAt: mount.prefix })
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
   * - `serveContent()`:  nothing to do:  each repo's content folder is served already, at its prefix (`mounts()`);  the
   *   route modules read and write it there too, from `root`'s config (`EpicConfig.contentOf()`, `pages.js` `CONTENT`:
   *   epic `epic-eject` P12), never through the main checkout's links
   * - `content`:  the default repo's content folder, as served:  a route reading the epic pages reads these
   *   (`GET /api/epics/tests`), so a demo server (`DemoServer`) answers from its copies
   * - tests set a route module up by hand with it, on a server started with `routes: false`
   */
  routeContext(): ContentRouteContext {
    return {
      root: this.defaultRepo?.checkout ?? this.home,
      content: this.defaultRepo?.content,
      router: this.web.router,
      guard: this.web.guard,
      live: this.web.live!,
      web: this.web,
      info: this.info,
      serveWorktrees: (...dirs) => void (this.info.worktrees = dirs[0] && resolve(dirs[0])),
      serveContent: () => undefined,
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

/**
 * The epic server on `port`, as it answers `/api/server` (`EpicServerInfo`), any home's;  `undefined`:  nothing
 * there, or something that isn't an epic server.  NEVER throws.
 */
async function epicServerOn(port: number): Promise<EpicServerInfo | undefined> {
  try {
    const reply = await fetch(`http://127.0.0.1:${port}${SRV.SERVER_API}`, { signal: AbortSignal.timeout(1000) })
    const info = reply.ok ? ((await reply.json()) as Partial<EpicServerInfo>) : undefined
    return info?.epicServer === true ? (info as EpicServerInfo) : undefined
  } catch {
    return undefined
  }
}

/** spell-epic's checkout:  `src/server/` is two folders down. */
const ENGINE_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")

/** spell-epic's `epic` command:  what a background server runs (`hub serve`). */
const EPIC_BIN = join(ENGINE_ROOT, "bin", "epic")

/**
 * The route modules, from spell-epic's checkout, in the order the kit's page server loads them:
 * spell-epic's part of its settings, `"pageServer": { "routes" }` in its `package.json` (epic `repo-split` P16;
 * `pageServerSettings()`), read here, never a second list.
 * - pages Owen answers on, comments, the review loop, new epics and favourites, epic links, the running epics,
 *   agents, side-bar links, airplane mode
 */
export const ROUTE_MODULES: readonly string[] = repoSettings(ENGINE_ROOT)?.routes ?? []

/**
 * Folders whose code, when newer than a running server, makes `ensure()` restart it
 * (`SRV.newestChange()`:  every `.ts` / `.js` / `.mjs` file in them;  `_assets/` and `node_modules/` skipped):
 * - ALL of spell-epic's code, `src/` (epic `epic-eject` I11):  the route modules import far beyond their own folders
 *   (`config/`, `data/`, `links/`, `review/`, the elements' definitions ...), so watching only theirs and this one
 *   missed a change to the rest
 * - the server package's, `spell/server` (the kit's `src/server/`), where Node's resolver finds it (`packageDir()`)
 *   - not the default repo's own kit (`buildBundles()`):  a change there needs a restart
 */
export const SOURCES = [join(ENGINE_ROOT, "src"), ...[packageDir("spell/server")].filter((dir) => dir !== undefined)]

/** The package holding the default repo's own bundle build (`BundleBuild`):  its kit's page server, from its checkout. */
const PAGE_SERVER = "spell/server/page"

/** Spell UI's site bundle, in its package (`spell-ui`):  Epic UI's when the default repo's settings name none. */
const SPELL_UI_ASSETS = "site/_assets"

/** A repo's home page, in its content folder:  where its address (`/`, `/r/<repo>/`) leads. */
const HOME_PAGE = "pages/index.html"

/** Folders page edits may write when a repo's `package.json` names none:  the shared content areas. */
const WRITABLE = ["epics", "guides", "pages", "brand", "sagas"]

/** What the epic server uses of a checkout's `BundleBuild` (`spell/server/page`'s, loaded at run time). */
type BundleBuilder = { readonly wait: Handler; start(): unknown; stop(): void }

/** `BundleBuild` itself:  `new BundleBuild({ root })`. */
type BundleBuilderClass = new (props: { root: string }) => BundleBuilder
