/**
 * Shows an `.html` doc (docs pages, epic pages, details pages) rendered,
 * in one of the right side bar's three doc views (`DocView`).
 * spell-epic's own copy (epic `epic-eject` P7), from the spell language extension's, which it replaces.
 * - Which view:  the page's kind decides (`docViewFor()`, epic `epic-engine` P59), the ONE rule:
 *   - `details` (the "Details" tab):  details, review and choice pages
 *   - `docs` (the "Epic Docs" tab):  the epic tooling's READMEs, `/_epic/docs/...`
 *   - `review` (the "Review" tab):  everything else -- epic pages, saga pages, guides, the home page, the list pages
 *   - NOT Simple Browser beside the editor:  its setting, `spellEpic.docPreview.location`, went with the first
 *     Epic Docs tab, which it moved (epic `epic-engine` Q73)
 * - Opened by URI:  `vscode://spell-app.spell-epic/doc-preview?file=<absolute path>[&view=review|details|docs]`;
 *   the page's kind decides over `view`
 *   - what spell-epic's `src/tools/pages.js` `openInVSCode()` opens (`epic open`, `epic phase`)
 * - Or `?url=<http://127.0.0.1:port/...>`:  a page some local server already serves, shown as is.
 *   - loopback URLs only
 *   - with a `file` too, the file is the fallback when the URL isn't loopback
 * - The views load only http(s).  For a `file`, the server that serves it, first found of:
 *   1. the EPIC SERVER, spell-epic's one per machine (`epic hub`),
 *      when it runs and the file is in a registered repo's content (`RepoList.urlPathFor()`):
 *      every repo's pages on one port, from any window
 *   2. the MAIN checkout's page server, for a worktree's file, when it serves worktrees (`SRV.mainServerUrl()`)
 *   3. the file's page server (`spell server`, a `.spell-server.json` at its root):  in a kit, the kit's, for a file of
 *      any repo in it (`pageServerRoot()`, epic `repo-split` P16);  else its checkout's
 *   4. none running:  it starts the file's page server (`ensurePageServer()`), as the scripts that open docs do
 *      - e.g. a window opened after a restart, before anything else started one (epic `epic-engine` I192)
 *   5. else, when that can't start (not a kit ...), a server of our own, in-process, on `127.0.0.1`, one per root, for
 *      as long as the extension runs:  the same `spell/server` `WebServer`, with live reload and the engine's routes,
 *      but no route modules and NO epic folder:  `/epics/...` answers "Not found" there
 * - Served from the ROOT, not the doc's folder:  docs link to source files all over the repo.
 * - Or by `WindowBridge`'s `show-doc`:  a session asks ITS window (not the focused one) to show the doc.
 * - ONE place per view, its side bar tab:
 *   a view loads only ANOTHER page, the same one isn't reloaded (`DocView.show()`).
 */
import { existsSync } from "fs"
import { dirname, join, resolve, sep } from "path"
import * as vscode from "vscode"

// Import directly:  through the `SRV` barrel, the Linker's HTML parser (~700 KB) lands in this bundle (I58)
import { mainServerUrl } from "spell/server/mainServer"
import { componentSetAddressOf, pageServerRoot } from "spell/server/page/settings"
import { PidFile } from "spell/server/PidFile"
import { WebServer } from "spell/server/WebServer"

import { EpicHome } from "spell/epic/config/EpicHome"
import { RepoList } from "spell/epic/server/RepoList"
import { ENGINE_ROUTES, PID_FILE } from "spell/epic/server/server.types"

import { DocView, docsIndex, ensurePageServer } from "./DocView"
import {
  EPIC_DOCS_HOME,
  PREVIEW_PATH,
  SERVERS_HOME,
  type DocViewName,
  docViewFor,
  isLoopback,
  stamped
} from "./docUrls"

/****************
 * ### `DocPreview`
 * The URI handler, and the local servers it starts.
 ****************/
export class DocPreview {
  /** Our own server for each git root without a page server, once listening. */
  static readonly servers = new Map<string, Promise<WebServer>>()

  /** The page servers being started now, by root:  several pages asking at once start one. */
  static readonly starting = new Map<string, Promise<string | undefined>>()

  /**
   * Set up the URI handler -- call once, first thing in `activate()`.
   * - SIDE EFFECT:  servers close when the extension deactivates.
   */
  static register(context: vscode.ExtensionContext): void {
    DocView.register(context)
    DocView.home = (view) => DocPreview.homeUrl(view)
    DocView.showFile = (file) => DocPreview.show(file)
    DocView.urlOf = (file) => DocPreview.urlOf(file)
    DocView.showUrl = (url, view) => DocPreview.showUrl(url, view)
    context.subscriptions.push(
      vscode.window.registerUriHandler({
        handleUri: (uri) => {
          if (uri.path !== PREVIEW_PATH) return
          const query = new URLSearchParams(uri.query)
          const url = query.get("url")
          const file = query.get("file")
          if (url && isLoopback(url)) {
            const path = file ? resolve(file) : new URL(url).pathname
            return void DocPreview.showUrl(url, docViewFor(path), file ? resolve(file) : undefined)
          }
          if (file) void DocPreview.show(resolve(file))
        }
      }),
      { dispose: () => DocPreview.servers.forEach((server) => void server.then((each) => each.close())) }
    )
  }

  /**
   * Where view `view` opens:
   * - `review`:  the home page, the default repo's on the epic server when it runs;  else the window's first folder's
   * - `docs`:  the front page for epics (`EPIC_DOCS_HOME`), on that same server, under the same worktree's address
   * - `servers`:  the Servers page (`SERVERS_HOME`), the same way
   * - `undefined`:  neither has one;  always for `details`, which opens on its list
   */
  static async homeUrl(view: DocViewName = "review"): Promise<string | undefined> {
    if (view === "details") return undefined
    const hub = await DocPreview.epicServer()
    const index = docsIndex()
    const home = hub
      ? `${hub.base}/pages/index.html`
      : index && existsSync(index)
        ? await DocPreview.urlOf(index)
        : undefined
    if (!home || view === "review") return home
    const url = new URL(home)
    const worktree = WORKTREE_ADDRESS.exec(url.pathname)?.[0] ?? ""
    return new URL(`${worktree}${view === "servers" ? SERVERS_HOME : EPIC_DOCS_HOME}`, url.origin).href
  }

  /**
   * Show `file` in the doc view its kind says (`docViewFor()`), from the server that serves it;
   * at id `hash` on it, if given.  Resolves to the view it went to.
   * - `query`:  the page's query, without its `?` (`test=1`:  a test run, `epic test`);  another query is another page,
   *   so the view loads it (`DocView.show()`)
   */
  static async show(file: string, hash?: string, query?: string): Promise<DocViewName> {
    const view = docViewFor(file)
    if (!existsSync(file)) {
      void vscode.window.showErrorMessage(`Spell Epic:  no file '${file}'.`)
      return view
    }
    // finding its server can take a while (one restarting, or started now):  the view says so meanwhile, so a click
    // always shows it was heard (epic `epic-engine` I294)
    const saying = setTimeout(() => DocView.of(view).say(FINDING_SERVER), 800)
    const url = new URL(await DocPreview.urlOf(file).finally(() => clearTimeout(saying)))
    if (query) url.search = query
    if (hash) url.hash = hash
    await DocPreview.showUrl(url.href, view, file)
    return view
  }

  /**
   * `file`'s URL:  on the epic server, else the main checkout's page server, else its checkout's, else one of our own
   * (started if need be).  See the file's header.
   */
  static async urlOf(file: string): Promise<string> {
    const hub = await DocPreview.epicServer()
    const path = hub && repoPathOf(file)
    if (hub && path) return `${hub.base}${path}`
    const main = await mainServerUrl(file)
    if (main) return main
    const root = pageServerRoot(dirname(file))
    // a component set's page at its address, where it finds its `_assets/` (epic `epic-engine` I136)
    const inRoot =
      componentSetAddressOf(root, file) ?? file.slice(root.length).split(sep).map(encodeURIComponent).join("/")
    const running = await new PidFile(root).status()
    const base = running?.base ?? (await DocPreview.startedServer(root)) ?? (await DocPreview.serverFor(root)).url
    return `${base}${inRoot}`
  }

  /**
   * The page server of `root`, started now, one try at a time:  its `base` URL;  `undefined`:  it can't start.
   * - it can take a while after a restart:  the window's status bar says so
   */
  static startedServer(root: string): Promise<string | undefined> {
    let starting = DocPreview.starting.get(root)
    if (!starting) {
      starting = Promise.resolve(
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: STARTING_SERVER }, () =>
          ensurePageServer(root)
        )
      ).finally(() => DocPreview.starting.delete(root))
      DocPreview.starting.set(root, starting)
    }
    return starting
  }

  /**
   * The epic server, when it runs:  its info and `base` URL, from its pid file in spell-epic's home folder
   * (`~/.spell-epic/server.json`);  `undefined`:  not running.
   * - NEVER throws
   */
  static async epicServer(): Promise<{ base: string } | undefined> {
    try {
      return await new PidFile(EpicHome.folder(), PID_FILE).status()
    } catch {
      return undefined
    }
  }

  /**
   * Our own server for `root`, started once:  static files with live reload, on a free port.
   * - watches `DOC_FOLDERS` if there, else the whole root
   */
  static serverFor(root: string): Promise<WebServer> {
    let server = DocPreview.servers.get(root)
    if (!server) {
      server = start(root)
      DocPreview.servers.set(root, server)
    }
    return server
  }

  /**
   * Show `url`, stamped (`?t=`), in the right side bar's doc view `view`,
   * where the page already in view isn't reloaded (`DocView.show()`).
   * - `details`:  unless the page there still waits for Owen's answer (`DocView.offer()`);  `file`, the page's file
   */
  static async showUrl(url: string, view: DocViewName = "review", file?: string): Promise<void> {
    const fresh = stamped(url)
    if (view === "details") return DocView.of(view).offer(fresh, file)
    return DocView.of(view).show(fresh)
  }
}

/** A worktree's address on the main checkout's page server, at a path's start:  `/worktrees/<name>`. */
const WORKTREE_ADDRESS = /^\/worktrees\/[^/]+/

/** What a side-bar view says while the page server for a page asked for is being found or started. */
const FINDING_SERVER = "Finding the page server..."

/** What the status bar says while a page server starts. */
const STARTING_SERVER = "Starting the page server"

/**
 * `file`'s URL path on the epic server (`/epics/...` for the default repo, `/r/<repo>/...` for another);
 * `undefined` for a file in no registered repo's content, or a repo list that won't read.
 */
function repoPathOf(file: string): string | undefined {
  try {
    return new RepoList().urlPathFor(file)
  } catch {
    return undefined
  }
}

/** spell-epic's checkout this extension was built from:  set by `build.mjs`. */
declare const ENGINE_ROOT: string

/**
 * Start serving `root`:  see `DocPreview.serverFor()`.
 * - the engine's routes too (`/_epic/assets/`, `/_epic/pack/`), from the spell-epic checkout this extension was built
 *   from:  a migrated page loads its assets there
 */
async function start(root: string): Promise<WebServer> {
  const engine = Object.values(ENGINE_ROUTES).map((route) => ({
    prefix: route.prefix,
    dir: join(ENGINE_ROOT, route.dir)
  }))
  const server = new WebServer({ root, live: true, mounts: [...engine, { prefix: "/", dir: root }] })
  const watched = DOC_FOLDERS.map((dir) => join(root, dir)).filter((dir) => existsSync(dir))
  for (const dir of watched.length ? watched : [root]) server.live!.watch(dir)
  await server.listen()
  return server
}

/** Folders our own server live-reloads, relative to the root:  the docs areas. */
const DOC_FOLDERS = ["epics", "guides", "pages", "templates", "sagas"]
