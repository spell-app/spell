/**
 * The editor palette's groups, on the page server:  `GET` and `PUT` at `SPACES.PALETTE_GROUPS_API`
 * (epic `editor` T81;  Spell UI's route module until epic `editor` P42, Q81).
 * - The table is `paletteGroups.json`, in spaces' models (`paletteTable.ts`):  the editor ships with it, so it's
 *   code, in the checkout this server runs (a worktree's server writes the worktree's).
 * - The editor's palette groups page (`<PaletteGroupsPage>`, `/palette`) reads and saves it here, through the
 *   editor's dev server, as the rest of the app's API;  the palette shows the new grouping on its next load.
 * - `GET`:  the table, `SPACES.PaletteTable`
 * - `PUT` `SPACES.PaletteTable`:  writes it whole, formatted as `yarn format` does;  answers `{ ok: true }`
 *   - a body that isn't a table is a 400, naming why:
 *     groups each with a list of tags, a topic or title as text, and an icon's name or none
 *   - who may write:  the app's own route module says, as for the rest of `/api` (`appRoutes`:  this machine's
 *     pages alone)
 * - Node only:  it reads and writes the file, and imports nothing of the components.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { SRV } from "spell/server"
import { PALETTE_GROUPS_API, type PaletteTable } from "spell/app/spaces/models/paletteTable"

/** The table the editor ships with. */
export const PALETTE_TABLE_FILE = fileURLToPath(new URL("../../../models/paletteGroups.json", import.meta.url))

/** Biggest body accepted:  a few hundred tags. */
const MAX_BODY = 64 * 1024

/** The routes for the table in `file`, to mount at `PALETTE_GROUPS_API`:  the shipped one by default;  a test's own. */
export function paletteRoutesFor(file = PALETTE_TABLE_FILE): SRV.Router {
  const api = new SRV.Router()
  api.get("/", (_request, reply) => {
    reply.noStore().json(JSON.parse(readFileSync(file, "utf8")) as PaletteTable)
  })
  api.use(SRV.parseBodies({ limit: MAX_BODY }))
  api.put("/", async (request, reply) => {
    const text = JSON.stringify(paletteTableOrDie(request.body), null, 2)
    // as `yarn format` lays it out, so a save leaves the format check passing
    writeFileSync(file, await SRV.formatHTML(file, text))
    reply.json({ ok: true })
  })
  return api
}

/**
 * `body` as a palette table, only the fields it knows, in order;  `SRV.HttpError(400)` naming what's wrong.
 * - Free rather than on `PaletteGroups`:  that reads every vocabulary through Vite, which node can't.
 */
export function paletteTableOrDie(body: unknown): PaletteTable {
  const die = (problem: string) => {
    throw new SRV.HttpError(400, `PUT ${PALETTE_GROUPS_API}:  ${problem}`)
  }
  const isText = (value: unknown) => typeof value === "string" && value.length > 0
  const isTags = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText)
  const table = body as Partial<PaletteTable> | undefined
  if (!table || !Array.isArray(table.groups)) die("send `{ groups: [...] }`")
  const groups = table!.groups!.map((group, at) => {
    if (!group || !isTags(group.tags)) die(`group ${at + 1} needs \`tags\`, a list of tags`)
    if (group.topic !== undefined && !isText(group.topic)) die(`group ${at + 1}'s \`topic\` isn't text`)
    if (group.title !== undefined && !isText(group.title)) die(`group ${at + 1}'s \`title\` isn't text`)
    if (group.icon !== undefined && !isText(group.icon)) die(`group ${at + 1}'s \`icon\` isn't text`)
    if (group.topic === undefined && group.title === undefined) die(`group ${at + 1} needs a \`topic\` or a \`title\``)
    return {
      ...(group.topic !== undefined && { topic: group.topic }),
      ...(group.title !== undefined && { title: group.title }),
      ...(group.icon !== undefined && { icon: group.icon }),
      tags: group.tags
    }
  })
  if (table!.hidden !== undefined && !isTags(table!.hidden)) die("`hidden` isn't a list of tags")
  return { groups, hidden: table!.hidden ?? [] }
}
