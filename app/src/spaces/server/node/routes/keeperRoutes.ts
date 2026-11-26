/**
 * This machine's servers at a glance, for the editor's Help › Servers:  `GET` at `SPACES.KEEPER_GLANCE_API`
 * (epic `editor` T185).
 * - Reads the server keeper's record (`SRV.KeeperLink`), then asks it how its servers stand (`GET /api/servers`):
 *   so the editor never guesses the keeper's port, which is any free one when 4949 is taken.
 * - Answers a `SPACES.KeeperGlance`:
 *   - no keeper running here:  `{}`, and the editor shows no Servers item
 *   - the keeper's Servers page, how many servers it keeps and how many are down
 *   - a keeper that runs but doesn't answer within `ASK_WAIT_MS`:  its page alone
 * - Reads only:  starting, stopping and restarting stay the keeper's, on its own page.
 * - Node only:  the keeper's record is a file in the keeper's home.
 */
import { SRV } from "spell/server"
import { SERVERS_PAGE, type KeptServersAnswer } from "spell/server/keeper/keeper.types"
import type { KeeperGlance } from "spell/app/spaces/models/keeperGlance"

/** The routes for the keeper `link` reads (a test's own record);  mount at `SPACES.KEEPER_GLANCE_API`. */
export function keeperRoutesFor(link = new SRV.KeeperLink()): SRV.Router {
  const api = new SRV.Router()
  api.get("/", async (_request, reply) => {
    reply.noStore().json(await keeperGlance(link))
  })
  return api
}

/**
 * How the servers `link`'s keeper keeps stand, at a glance:  see the file's docs.
 * - NEVER throws:  a keeper that can't be asked leaves its page alone in the answer.
 */
export async function keeperGlance(link = new SRV.KeeperLink()): Promise<KeeperGlance> {
  const keeper = link.running()
  if (!keeper) return {}
  const page = new URL(SERVERS_PAGE, keeper.base).href
  try {
    const response = await fetch(new URL(KEEPER_SERVERS_API, keeper.base), { signal: AbortSignal.timeout(ASK_WAIT_MS) })
    if (!response.ok) return { page }
    const { servers } = (await response.json()) as KeptServersAnswer
    return { page, servers: servers.length, down: servers.filter((server) => server.state === "down").length }
  } catch {
    return { page }
  }
}

/** Where the keeper says how each server stands. */
const KEEPER_SERVERS_API = "/api/servers"

/** How long the keeper has to answer:  it answers from its last look, so at once. */
const ASK_WAIT_MS = 2000
