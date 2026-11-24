/**
 * The top bar's SERVERS tab (epic `epic-engine` P82), on every page server:  a ROUTE MODULE (`spell/server/page`'s
 * `RouteModule`), listed in spell-epic's `package.json` `"pageServer": { "routes": [...] }`.  The kit's page server and
 * the epic hub both load it.
 *
 * ```text
 * /_epic/servers/                 the tab's page (`servers-page.html`), under every worktree's address too
 * /api/servers                    every server, what just reached main, what waits (`ServersAnswer`)
 * /api/servers/dot                the tab's red dot:  { dot, why }
 * POST /api/servers/<action>      start, stop or restart one:  { checkout, server }
 * ```
 *
 * - The data is the SERVER KEEPER's, the hub's (`ServerKeeper`):  the hub answers its calls itself, so on the hub this
 *   module serves only the page;  a checkout's page server asks the hub, as its record says (`SRV.KeeperLink`)
 *   - a POST:  this server's own write check first, then on to the hub with the hub's token
 *   - no hub running:  503, saying so;  the dot shows, saying so
 * - ONE copy of the page, the server's own engine's, as the Docs tab's (`docsRoutes`)
 */
import { readFileSync } from "node:fs"

import { SRV, type Handler } from "spell/server"
import type { RouteModule } from "spell/server/page"

import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { withHooks } from "spell/epic/tools/docsRoutes"

import { SERVERS_PAGE } from "./server.types"

const serverRoutes: RouteModule = {
  name: "servers",
  setup({ router, web, info }) {
    for (const prefix of ["", "/worktrees/:worktree"]) {
      router.get(`${prefix}${SERVERS_PAGE.slice(0, -1)}`, (request, reply) =>
        request.path.endsWith("/") ? pageHandler(web)(request, reply, () => {}) : reply.redirect(`${request.path}/`)
      )
    }
    // the hub answers its own calls (`ServerKeeper.route()`)
    if ("epicServer" in info) return
    router.get(SRV.KEEPER_API, askHub("GET"))
    router.get(`${SRV.KEEPER_API}/dot`, async (_request, reply) => {
      const keeper = new SRV.KeeperLink().running()
      if (!keeper) return void reply.noStore().json({ dot: true, why: NO_KEEPER })
      await askHub("GET")(_request, reply, () => {})
    })
    router.post(`${SRV.KEEPER_API}/:action`, web.guard.writeCheck, SRV.parseBodies(), askHub("POST"))
  }
}

export default serverRoutes

/** the tab's page, through the server's page hooks (site header, live reload) */
function pageHandler(web: SRV.WebServer): Handler {
  return (request, reply) => {
    const file = EngineFiles.path(PAGE)
    reply
      .noStore()
      .type("text/html; charset=utf-8")
      .send(withHooks(web, readFileSync(file, "utf8"), file, request))
  }
}

/** the same call on the hub:  its answer, as it answered;  no hub:  503 */
function askHub(method: "GET" | "POST"): Handler {
  return async (request, reply) => {
    const keeper = new SRV.KeeperLink().running()
    if (!keeper) throw new SRV.HttpError(503, NO_KEEPER)
    const path = request.originalUrl.replace(/^\/worktrees\/[^/]+/, "")
    let response: Response
    try {
      response = await fetch(`${keeper.base}${path}`, {
        method,
        headers: { "content-type": "application/json", "x-server-token": keeper.token },
        ...(method === "POST" && { body: JSON.stringify(request.body ?? {}) }),
        signal: AbortSignal.timeout(HUB_WAIT_MS)
      })
    } catch {
      throw new SRV.HttpError(503, NO_KEEPER)
    }
    reply
      .noStore()
      .status(response.status)
      .type("application/json")
      .send(await response.text())
  }
}

/** The page, as a checkout has it (`EngineFiles.path()`). */
const PAGE = "src/tools/servers-page.html"

/** What's said while no hub runs. */
const NO_KEEPER =
  "The helper that keeps your servers running is turned off.  To turn it on, start a new Claude session, " +
  "or type  epic hub start  in a terminal."

/** How long a call to the hub may take:  a start may take two minutes. */
const HUB_WAIT_MS = 150_000
