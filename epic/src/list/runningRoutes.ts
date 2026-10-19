/**
 * The RUNNING epics on the page server:  a ROUTE MODULE (`$/server/page`'s `RouteModule`).
 * - listed in the repo root's `package.json`, `"pageServer": { "routes": [...] }`
 * - the logic:  `RunningEpics`
 * - `GET /api/epics/running` -- every running epic, as JSON (`RunningEpic[]`), never cached
 * - the Epics list page (`epics/index.html`), as it's served (`RunningEpics.render()`):
 *   the running epics' cards added, every card marked again and regrouped
 * - live reload (`RunningEpics.watch()`):
 *   - a worktree's epic page changing reloads its page and the Epics list
 *   - its rebuilt page assets (docs bundle, packs) hot-reload its pages served here
 *   - the watcher closes when the server stops
 * - worktree `<w>`'s files, at `/worktrees/<w>/...`:
 *   the page server's mount, which this module tells it to make (`serveWorktrees()`), in the MAIN checkout only
 *   - the worktrees' folder is the repo's `.epic/config.json5`'s (`EpicConfig`), which the server can't read
 *   - worktrees in the OLD place too, while the file has moved them beside the repo:  the server takes every folder,
 *     the new place first (`EpicConfig.worktreesFolders`;  epic `epic-eject` J28)
 * - the repo's PAGES, its content folder (`EpicConfig.contentOf()`), at `/` after the checkout's own files:
 *   the page server's mount, which this module tells it to make (`serveContent()`, epic `epic-eject` P12), in every
 *   checkout
 *   - so `/epics/...` and `/guides/...` work with no link at the checkout's root
 *   - a page server without `serveContent()` (older code) is left as it was:  the checkout's links serve them
 *   - none for a checkout that holds its own pages (no content folder of its own)
 * - reads only:  nothing here needs the page server's token
 */
import { resolve } from "node:path"

import type { RouteContext, RouteModule } from "$/server/page"

import { EpicConfig } from "$/epics/config/EpicConfig"

import { RunningEpics } from "./RunningEpics"

/** Where the list is answered. */
export const RUNNING_API = "/api/epics/running"

/**
 * A page server's `RouteContext`, with what spell-app's gains in epic `epic-eject` P12 (optional:  an older server
 * lacks it):
 * - `serveContent(dir)`:  serve folder `dir` at `/` after the checkout (and at each worktree's `/worktrees/<w>/`),
 *   live-reload it at `/`, and root page edits and file writes there
 * - `content`:  the content folder it serves at `/`, when it knows it (the epic server:  its default repo's, a demo's
 *   scratch copy too);  none:  `root`'s config says (`EpicConfig.contentOf()`)
 */
export type ContentRouteContext = RouteContext & { serveContent?: (dir: string) => void; content?: string }

const runningRoutes: RouteModule = {
  name: "running epics",
  setup(context: ContentRouteContext) {
    const { root, router, web, live, onStop, serveWorktrees } = context
    const config = EpicConfig.of(root)
    // the main checkout's server shows every worktree;  a worktree's own server shows none
    if (config.main === resolve(root)) serveWorktrees(...config.worktreesFolders)
    const content = EpicConfig.contentOf(root)
    if (content !== resolve(root)) context.serveContent?.(content)
    const epics = new RunningEpics(root)
    router.get(RUNNING_API, (_request, reply) => reply.set("Cache-Control", "no-store").json(epics.list()))
    web.files.html.push((page, served) => (epics.isIndex(served.file) ? epics.render(page) : page))
    epics.watch(live)
    onStop(() => epics.close())
  }
}

export default runningRoutes
