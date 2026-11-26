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
 * - The data is SPELL'S SERVER KEEPER's (`spell/server/keeper`, epic `editor` P48):  the hub and a checkout's page
 *   server alike pass every call on to the keeper in charge, as its record says (`SRV.KeeperLink`;  epic
 *   `epic-engine` P85:  the hub answered them itself before)
 *   - `GET /api/servers`:  the keeper's answer, and beside it what's the epic tooling's own (`ServerFacts`):  what
 *     merged into main, each worktree's open work, what isn't on GitHub, for every repo the hub serves (`RepoList`);
 *     and the address of the Spell Servers page on the keeper's own port (`keeperPage`), which the tab shows for
 *     its cards (epic `editor` P49)
 *   - a POST:  this server's own write check first, then on to the keeper with its token
 *   - no keeper running:  503, saying so;  the dot shows, saying so
 * - ONE copy of the page, the server's own engine's, as the Docs tab's (`docsRoutes`)
 */
import { readFileSync } from "node:fs"

import { SRV, type Handler } from "spell/server"
import type { RouteModule } from "spell/server/page"

import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { withHooks } from "spell/epic/tools/docsRoutes"

import { RepoList } from "./RepoList"
import { ServerFacts } from "./ServerFacts"
import { SERVERS_PAGE, type Repo, type ServersAnswer } from "./server.types"

const serverRoutes: RouteModule = {
  name: "servers",
  setup({ router, web, info }) {
    for (const prefix of ["", "/worktrees/:worktree"]) {
      router.get(`${prefix}${SERVERS_PAGE.slice(0, -1)}`, (request, reply) =>
        request.path.endsWith("/") ? pageHandler(web)(request, reply, () => {}) : reply.redirect(`${request.path}/`)
      )
    }
    // the hub's own repos;  a checkout's page server:  the hub's list, read at each ask
    const repos = (): Repo[] =>
      "epicServer" in info ? (info as unknown as { repos: Repo[] }).repos : new RepoList().repos()
    router.get(SRV.KEEPER_API, async (request, reply) => {
      const response = await askKeeper("GET", request)
      if (!response.ok) return await passOn(reply, response)
      const answer = (await response.json()) as ServersAnswer
      const keeperPage = keeperPageOf(new SRV.KeeperLink().running())
      reply.noStore().json({ ...answer, ...ServerFacts.of(repos()), ...(keeperPage && { keeperPage }) })
    })
    router.get(`${SRV.KEEPER_API}/:what`, async (request, reply) => {
      if (request.params.what === "dot" && !new SRV.KeeperLink().running())
        return void reply.noStore().json({ dot: true, why: NO_KEEPER })
      await passOn(reply, await askKeeper("GET", request))
    })
    router.post(`${SRV.KEEPER_API}/:action`, web.guard.writeCheck, SRV.parseBodies(), async (request, reply) =>
      passOn(reply, await askKeeper("POST", request))
    )
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

/**
 * the same call on the keeper in charge, its token added
 * - throws a 503 `SRV.HttpError` when none runs, or it doesn't answer
 */
async function askKeeper(method: "GET" | "POST", request: SRV.Request): Promise<Response> {
  const keeper = new SRV.KeeperLink().running()
  if (!keeper) throw new SRV.HttpError(503, NO_KEEPER)
  const path = request.originalUrl.replace(/^\/worktrees\/[^/]+/, "")
  try {
    return await fetch(`${keeper.base}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-server-token": keeper.token },
      ...(method === "POST" && { body: JSON.stringify(request.body ?? {}) }),
      signal: AbortSignal.timeout(KEEPER_WAIT_MS)
    })
  } catch {
    throw new SRV.HttpError(503, NO_KEEPER)
  }
}

/** the Spell Servers page on the keeper's own port (`spell/server/keeper`'s `SERVERS_PAGE`);  no keeper:  none */
function keeperPageOf(keeper: SRV.KeeperRecord | undefined): string | undefined {
  return keeper && `${keeper.base}${KEEPER_PAGE}`
}

/** the keeper's answer, as it answered */
async function passOn(reply: SRV.Reply, response: Response): Promise<void> {
  const type = response.headers.get("content-type") ?? "application/json"
  reply
    .noStore()
    .status(response.status)
    .type(type)
    .send(await response.text())
}

/** The page, as a checkout has it (`EngineFiles.path()`). */
const PAGE = "src/tools/servers-page.html"

/** Where the keeper serves the Spell Servers page (epic `editor` P49), which the tab shows for its cards. */
const KEEPER_PAGE = "/servers/"

/** What's said while no keeper runs. */
const NO_KEEPER =
  "The helper that keeps your servers running is turned off.  To turn it on, start a new Claude session, " +
  "or type  spell keeper start  in a terminal."

/** How long a call to the keeper may take:  a start may take two minutes. */
const KEEPER_WAIT_MS = 150_000
