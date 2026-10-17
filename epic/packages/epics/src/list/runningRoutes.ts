/**
 * The RUNNING epics on the page server:  a ROUTE MODULE (`$/server/page`'s `RouteModule`).
 * - listed in the repo root's `package.json`, `"pageServer": { "routes": [...] }`
 * - the logic:  `RunningEpics`
 * - `GET /api/epics/running` -- every running epic, as JSON (`RunningEpic[]`), never cached
 * - the Epics list page (`epics/index.html`), as it's served (`RunningEpics.render()`):
 *   the running epics' cards added, every card marked again and regrouped
 * - live reload:  a worktree's epic page changing reloads its page and the Epics list (`RunningEpics.watch()`);
 *   its rebuilt page assets (docs bundle, packs) hot-reload its pages served here;
 *   the watcher closes when the server stops
 * - worktree `<w>`'s files, at `/worktrees/<w>/...`:  the page server's mount, which this module tells it to make
 *   (`serveWorktrees()`), in the MAIN checkout only:  the worktrees' folder is the repo's `.epic/config.json5`'s
 *   (`EpicConfig`), which the server can't read
 *   - worktrees in the OLD place too, while the file has moved them beside the repo (`serveOldPlaces()`)
 * - reads only:  nothing here needs the page server's token
 */
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"

import type { SRV } from "$/server"
import type { RouteModule } from "$/server/page"

import { EpicConfig } from "$/epics/config/EpicConfig"

import { RunningEpics } from "./RunningEpics"

/** Where the list is answered. */
export const RUNNING_API = "/api/epics/running"

/** Where an old place's worktrees are mounted, `<prefix><n>/<w>/...`:  laid over `/worktrees/<w>/`, never linked. */
export const OLD_PLACE_PREFIX = "/_epic/worktrees-"

const runningRoutes: RouteModule = {
  name: "running epics",
  setup({ root, router, web, live, onStop, serveWorktrees }) {
    const config = EpicConfig.of(root)
    // the main checkout's server shows every worktree;  a worktree's own server shows none
    if (config.main === resolve(root)) {
      const [place, ...old] = config.worktreesFolders
      serveWorktrees(place!)
      serveOldPlaces(web.files, place!, old)
    }
    const epics = new RunningEpics(root)
    router.get(RUNNING_API, (_request, reply) => reply.set("Cache-Control", "no-store").json(epics.list()))
    web.files.html.push((page, served) => (served.file === epics.index ? epics.render(page) : page))
    epics.watch(live)
    onStop(() => epics.close())
  }
}

export default runningRoutes

/**
 * Serve the worktrees left in each of the `old` places at the same URLs, `/worktrees/<w>/...`, as the new `place`'s:
 * each old folder mounted at a prefix of its own (`OLD_PLACE_PREFIX`), and laid over `/worktrees/<w>/` for a `<w>`
 * the new place doesn't have.
 * - why not a second `serveWorktrees()`:  the page server has ONE folder for `/worktrees/`, and a second mount at the
 *   same prefix is never reached.  Its badge and `SPELL_SERVER.worktrees` name the new place only
 * - side effect:  mounts and overlays on the page server's static files
 */
export function serveOldPlaces(files: SRV.StaticHandler, place: string, old: string[]): void {
  old.forEach((dir, at) => {
    const prefix = `${OLD_PLACE_PREFIX}${at + 1}/`
    files.mount({ prefix, dir })
    files.overlays.push((path) => {
      const match = /^\/worktrees\/([^/]+)(\/.*)?$/.exec(path)
      if (!match) return undefined
      const [, name, rest = "/"] = match
      if (existsSync(join(place, name!)) || !existsSync(join(dir, name!))) return undefined
      return `${prefix}${name}${rest}`
    })
  })
}
