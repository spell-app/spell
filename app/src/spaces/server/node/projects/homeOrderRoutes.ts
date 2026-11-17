import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { SRV } from "spell/server"
import { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"
import { isSourceCheckout } from "spell/app/spaces/server/node/spellSpacesDir"
import { respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"

/**
 * The home page's order routes, `SPACES.HOME_ORDER_URL` (epic `mockup` P19):  dragging a card, or a section by its
 * header (epic `repo-split` P28), in dev saves the new order into Spell's ONE list, `homeOrder.json` in spaces' models.
 * - `GET`:  `{ mayReorder }`, so the page turns dragging on:  `true` only in Spell's own checkout (`isSourceCheckout`).
 * - `POST`, body `SPACES.HomeOrderChange`:  that group's order, or the sections', written;  `{ group, names }` back.
 * - Spell's own checkout only:  it writes a file of the checkout, which is committed like any other.
 *   - An app that installs Spell has the list in its `node_modules`:  `GET` says no, `POST` is refused (403).
 *   - The house-network site refuses both at the editor's address, for this Mac alone (`LocalSiteServer`'s Caddy file);
 *     the cloud serves neither.
 * - A bad body is 400:
 *   - a group that isn't one of `SPACES.PROJECT_GROUPS`, nor the sections' key:  an org's groups are never saved here
 *   - names that aren't folder names, or, for the sections, a name that isn't one (`SPACES.HOME_SECTIONS`)
 */

/** The list, in this checkout's source:  `src/spaces/models/homeOrder.json`. */
const HOME_ORDER_FILE = resolve(environment.repoDir, "src", "spaces", "models", "homeOrder.json")

/** A project's folder name:  no slash, no dot first, nothing empty. */
const FOLDER_NAME = /^[^/.][^/]*$/

/** `GET /api/home/order`:  see the file's docs. */
export const request_mayReorder = respondWithJSON(async (): Promise<SPACES.HomeOrderAnswer> => ({
  mayReorder: isSourceCheckout
}))

/** `POST /api/home/order`:  see the file's docs. */
export const request_saveHomeOrder = respondWithJSON(async (request): Promise<SPACES.HomeOrderChange> => {
  if (!isSourceCheckout) throw new SRV.HttpError(403, "home order:  only Spell's own checkout keeps its order")
  const { group, names } = request.body as Partial<SPACES.HomeOrderChange>
  const isSections = group === SPACES.HOME_SECTIONS_KEY
  if (!isSections && !SPACES.PROJECT_GROUPS.some((each) => each.path === group))
    throw new SRV.HttpError(400, `home order:  no group called \`${group}\``)
  if (!Array.isArray(names) || !names.every((name) => typeof name === "string" && FOLDER_NAME.test(name)))
    throw new SRV.HttpError(400, "home order:  `names` must be the group's projects' folder names")
  if (isSections && !names.every(SPACES.isHomeSection))
    throw new SRV.HttpError(400, `home order:  the sections are ${SPACES.HOME_SECTIONS.join(", ")}`)
  // read afresh:  the module's copy is the list as the server started
  const saved = JSON.parse(readFileSync(HOME_ORDER_FILE, "utf8")) as Record<string, string[]>
  const order = { ...saved, [group!]: names }
  writeFileSync(HOME_ORDER_FILE, `${JSON.stringify(order, null, 2)}\n`)
  return { group: group!, names }
})
