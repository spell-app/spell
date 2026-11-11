import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { SRV } from "spell/server"
import { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"
import { respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"

/**
 * The home page's order routes, `SPACES.HOME_ORDER_URL` (epic `mockup` P19):  dragging a card in dev saves its row's
 * new order into the editor's ONE list, `homeOrder.json` in spaces' models.
 * - `GET`:  `{ mayReorder: true }`, so the page turns dragging on.
 * - `POST`, body `SPACES.HomeOrderChange`:  that group's order written;  `{ group, names }` back.
 * - Dev only:  it writes a file of the checkout, which is committed like any other.
 *   - The house-network site refuses both at the editor's address, for this Mac alone (`LocalSiteServer`'s Caddy file);
 *     the cloud serves neither.
 *   - So does any server whose checkout has no list to write (a build without its source).
 * - A bad body is 400:  a group that isn't one of `SPACES.PROJECT_GROUPS`, or names that aren't folder names.
 */

/** The list, in this checkout's source:  `src/spaces/models/homeOrder.json`. */
const HOME_ORDER_FILE = resolve(environment.repoDir, "src", "spaces", "models", "homeOrder.json")

/** A project's folder name:  no slash, no dot first, nothing empty. */
const FOLDER_NAME = /^[^/.][^/]*$/

/** `GET /api/home/order`:  see the file's docs. */
export const request_mayReorder = respondWithJSON(async (): Promise<SPACES.HomeOrderAnswer> => ({ mayReorder: true }))

/** `POST /api/home/order`:  see the file's docs. */
export const request_saveHomeOrder = respondWithJSON(async (request): Promise<SPACES.HomeOrderChange> => {
  const { group, names } = request.body as Partial<SPACES.HomeOrderChange>
  if (!SPACES.PROJECT_GROUPS.some((each) => each.path === group))
    throw new SRV.HttpError(400, `home order:  no group called \`${group}\``)
  if (!Array.isArray(names) || !names.every((name) => typeof name === "string" && FOLDER_NAME.test(name)))
    throw new SRV.HttpError(400, "home order:  `names` must be the group's projects' folder names")
  // read afresh:  the module's copy is the list as the server started
  const saved = JSON.parse(readFileSync(HOME_ORDER_FILE, "utf8")) as Record<string, string[]>
  const order = { ...saved, [group!]: names }
  writeFileSync(HOME_ORDER_FILE, `${JSON.stringify(order, null, 2)}\n`)
  return { group: group!, names }
})
