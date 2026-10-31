/**
 * The recipe box demo's servers, on one port, until you stop them (epics `data` P4, P5):
 * - `yarn tsx scripts/recipe-servers.ts [<folder>]`, at the kit's root
 * - `http://127.0.0.1:4791/recipes`, with versions in a field;  `http://127.0.0.1:4791/graphql`
 * - `http://127.0.0.1:4791/api/places/recipes`:  a folder of files, as a place, behind a `PlaceServer`
 *   - the folder:  `<folder>`, else `spell-recipe-box` in the system's temporary folder, kept between runs
 *   - edit `recipes/r-1.json` there, and the page follows
 * - `ws://127.0.0.1:4791/api/rooms/recipes`:  a live room, its referee keeping a folder of its own (`<folder>-room`) (epic `data` P8)
 *   - edit a file in that folder, and every window follows, at once
 * - `http://127.0.0.1:4791/api/places/google-sheet`:  your own Google Sheet, behind the same server, which holds its key (epic `data` P7)
 *   - only with `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_KEY` set:  its id, and a service account's key file, as JSON;
 *     the steps are the epic page's manual test
 *   - its tab has to be called `recipes`
 * - The demo's page is `/guides/data/experiments/recipe-box/recipe-box.html`, on the page server.
 */
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { JsonChunks } from "spell/util/places"
import { SRV } from "spell/server"
import { ChunkFiles, FolderPlace, GoogleSheetPlace, PlaceKeys, PlaceServer, Referee } from "spell/server/places"
import { bothHandlers, DemoGuard, FIRST_RECIPES, RecipeBox } from "spell/server/test/recipeServers"

const PORT = 4791

/** The one collection. */
const COLLECTION = "recipes"

const folder = process.argv[2] ?? join(tmpdir(), "spell-recipe-box")
const format = new JsonChunks({ summaries: { [COLLECTION]: ["title", "cuisine", "servings"] } })
const files = new ChunkFiles({ root: folder })
const place = new FolderPlace({ storage: files, format })
if (!(await place.list(COLLECTION, {}, {})).rows.length) {
  const changes = FIRST_RECIPES.map(({ id, name, ...fields }) => ({
    kind: "insert" as const,
    collection: COLLECTION,
    id,
    fields: { title: name, ...fields }
  }))
  await place.apply(changes, {})
}

const router = new SRV.Router()
router.use(bothHandlers(new RecipeBox()))
// Someone else, in another program:  the file saved behind the page's back, as VS Code would
router.post("/someone-else/folder/:id", SRV.parseBodies(), async (request, reply) => {
  const address = format.bodyAddress(COLLECTION, request.params.id!)
  const thing = JSON.parse((await files.read(address)) ?? "{}") as object
  const { name } = request.body as { name?: string }
  await files.write(address, format.bodyText({ ...thing, title: name }))
  reply.json({ ok: true })
})

const SHEET_KEY = "GOOGLE_SHEETS_KEY"
const spreadsheet = process.env.GOOGLE_SHEET_ID
const keys = new PlaceKeys({ names: [SHEET_KEY] })
const googleSheet = spreadsheet && new GoogleSheetPlace({ spreadsheet, keyNamed: SHEET_KEY, keys, idColumn: "id" })
const places = { [COLLECTION]: place, ...(googleSheet && { "google-sheet": googleSheet }) }
new PlaceServer({ places, keys }).route(router, new DemoGuard().allowPort(PORT))

// The live room:  its own folder, each recipe with its place in the list
const ROOM_PATH = "/api/rooms/recipes"
const ROOM_FIELDS = ["title", "cuisine", "servings", "notes", "place"]
const roomFormat = new JsonChunks({ summaries: { [COLLECTION]: ROOM_FIELDS } })
const roomPlace = new FolderPlace({ storage: new ChunkFiles({ root: `${folder}-room` }), format: roomFormat })
if (!(await roomPlace.list(COLLECTION, {}, {})).rows.length) {
  const changes = FIRST_RECIPES.map(({ id, name, ...fields }, index) => ({
    kind: "insert" as const,
    collection: COLLECTION,
    id,
    fields: { title: name, ...fields, place: { parent: "box", at: `${index + 1}1` } }
  }))
  await roomPlace.apply(changes, {})
}
const referee = new Referee({
  path: ROOM_PATH,
  place: roomPlace,
  collections: { [COLLECTION]: { select: ROOM_FIELDS } },
  guard: new DemoGuard().allowPort(PORT)
})
await referee.open()

const server = createServer(SRV.toListener(router.handle))
server.on("upgrade", (raw, socket, head) => {
  if (new URL(raw.url ?? "/", "http://localhost").pathname === ROOM_PATH) void referee.upgrade(raw, socket, head)
  else socket.destroy()
})
await SRV.listenPreferred(server, { port: PORT, fallback: false })
console.log(
  `the recipe servers are on http://127.0.0.1:${PORT}:  /recipes, /graphql, /api/places/recipes and the live room, ${ROOM_PATH}.`
)
console.log(`the folder is ${folder}:  edit a file in recipes/, and the page follows.  Ctrl-C stops them.`)
if (googleSheet) console.log(`your Google Sheet ${spreadsheet} is on /api/places/google-sheet, its key held here.`)
