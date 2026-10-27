/**
 * Shows an `.html` doc (docs pages, epic pages, details pages) rendered:
 * in one of the right side bar's doc views (`DocView`), or in VS Code's Simple Browser beside the editor
 * (setting `spellEpic.docPreview.location`).
 * spell-epic's own copy (epic `epic-eject` P7), from the spell language extension's, which it replaces.
 * - Which view:  `docs` (the "Epic Docs" tab, the default) or `review` (the "Review" tab:  `/epic review`).
 *   `review` is ALWAYS the side bar's "Review" tab:  the setting moves only `docs`.
 * - Opened by URI:  `vscode://spell-app.spell-epic/doc-preview?file=<absolute path>[&view=review]`.
 *   - what spell-epic's `src/tools/pages.js` `openInVSCode()` opens (`epic open`, `epic phase`)
 * - Or `?url=<http://127.0.0.1:port/...>`:  a page some local server already serves, shown as is.
 *   - loopback URLs only
 *   - with a `file` too, the file is the fallback when the URL isn't loopback
 * - Simple Browser loads only http(s).  For a `file`, the server that serves it, first found of:
 *   1. the EPIC SERVER, spell-epic's one per machine (`epic hub`),
 *      when it runs and the file is in a registered repo's content (`RepoList.urlPathFor()`):
 *      every repo's pages on one port, from any window
 *   2. the MAIN checkout's page server, for a worktree's file, when it serves worktrees (`SRV.mainServerUrl()`)
 *   3. the file's page server (`spell server`, a `.spell-server.json` at its root):  in a kit, the kit's, for a file of
 *      any repo in it (`pageServerRoot()`, epic `repo-split` P16);  else its checkout's
 *   4. else a server of our own, in-process, on `127.0.0.1`, one per root, for as long as the extension runs:
 *      the same `spell/server` `WebServer`, with live reload and the engine's routes, but no route modules
 *   - NEVER starts a page server itself:  a GUI VS Code may have no `node` / `yarn` on its PATH.
 *     The scripts that open docs start one first (`epic hub ensure`, `pages.js` `ensurePageServer()`).
 * - Served from the ROOT, not the doc's folder:  docs link to source files all over the repo.
 * - Or by `WindowBridge`'s `show-doc`:  a session asks ITS window (not the focused one) to show the doc.
 * - ONE place per view (its side bar tab, or Simple Browser's one tab).
 *   Simple Browser loads the doc afresh on each open (a `?t=` stamp);
 *   a side bar view loads only ANOTHER page, the same one isn't reloaded (`DocView.show()`).
 */
import { existsSync } from "fs"
import { dirname, join, resolve, sep } from "path"
import * as vscode from "vscode"

// Import directly:  through the `SRV` barrel, the Linker's HTML parser (~700 KB) lands in this bundle (I58)
import { mainServerUrl } from "spell/server/mainServer"
import { componentSetAddressOf, pageServerRoot } from "spell/server/page/settings"
import { PidFile } from "spell/server/PidFile"
import { WebServer } from "spell/server/WebServer"

import { RepoList } from "spell-epic/server/RepoList"
import { ENGINE_ROUTES, PID_FILE } from "spell-epic/server/server.types"

import { DocView, docsIndex, type DocViewName } from "./DocView"
import { PREVIEW_PATH, isLoopback, stamped } from "./docUrls"

/****************
 * ### `DocPreview`
 * The URI handler, and the local servers it starts.
 ****************/
export class DocPreview {
  /** Our own server for each git root without a page server, once listening. */
  static readonly servers = new Map<string, Promise<WebServer>>()

  /**
   * Set up the URI handler -- call once, first thing in `activate()`.
   * - SIDE EFFECT:  servers close when the extension deactivates.
   */
  static register(context: vscode.ExtensionContext): void {
    DocView.register(context)
    DocView.home = () => DocPreview.homeUrl()
    DocView.showFile = (file, view) => DocPreview.show(file, undefined, view)
    context.subscriptions.push(
      vscode.window.registerUriHandler({
        handleUri: (uri) => {
          if (uri.path !== PREVIEW_PATH) return
          const query = new URLSearchParams(uri.query)
          const url = query.get("url")
          const view = query.get("view") === "review" ? "review" : "docs"
          if (url && isLoopback(url)) return void DocPreview.showUrl(url, view)
          const file = query.get("file")
          if (file) void DocPreview.show(resolve(file), undefined, view)
        }
      }),
      { dispose: () => DocPreview.servers.forEach((server) => void server.then((each) => each.close())) }
    )
  }

  /**
   * The home page:  the default repo's on the epic server, when it runs;  else the window's first folder's.
   * - `undefined`:  neither has one
   */
  static async homeUrl(): Promise<string | undefined> {
    const hub = await DocPreview.epicServer()
    if (hub) return `${hub.base}/pages/index.html`
    const index = docsIndex()
    return index && existsSync(index) ? DocPreview.urlOf(index) : undefined
  }

  /**
   * Show `file` in doc view `view`, from the server that serves it;  at id `hash` on it, if given.
   * - `query`:  the page's query, without its `?` (`test=1`:  a test run, `epic test`);  another query is another page,
   *   so the view loads it (`DocView.show()`)
   */
  static async show(file: string, hash?: string, view: DocViewName = "docs", query?: string): Promise<void> {
    if (!existsSync(file)) {
      void vscode.window.showErrorMessage(`Spell Epic:  no file '${file}'.`)
      return
    }
    const url = new URL(await DocPreview.urlOf(file))
    if (query) url.search = query
    if (hash) url.hash = hash
    await DocPreview.showUrl(url.href, view)
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
    const inRoot = componentSetAddressOf(root, file) ?? file.slice(root.length).split(sep).map(encodeURIComponent).join("/")
    const running = await new PidFile(root).status()
    const base = running?.base ?? (await DocPreview.serverFor(root)).url
    return `${base}${inRoot}`
  }

  /**
   * The epic server, when it runs:  its info and `base` URL, from its pid file in spell-epic's home folder
   * (`~/.spell-epic/server.json`);  `undefined`:  not running.
   * - NEVER throws
   */
  static async epicServer(): Promise<{ base: string } | undefined> {
    try {
      return await new PidFile(RepoList.homeFolder(), PID_FILE).status()
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
   * Show `url`, stamped (`?t=`):
   * - in the right side bar's doc view `view`, where the page already in view isn't reloaded (`DocView.show()`)
   * - or, for `docs`, in Simple Browser beside the editor (`spellEpic.docPreview.location`), afresh
   */
  static async showUrl(url: string, view: DocViewName = "docs"): Promise<void> {
    const fresh = stamped(url)
    const location = vscode.workspace.getConfiguration("spellEpic").get<string>("docPreview.location")
    if (view === "review" || location !== "beside") return DocView.of(view).show(fresh)
    await vscode.commands.executeCommand("simpleBrowser.api.open", vscode.Uri.parse(fresh), {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true
    })
  }
}

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
