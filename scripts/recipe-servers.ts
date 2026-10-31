/**
 * The recipe box demo's servers, on one port, until you stop them (epics `data` P4, P5):
 * - `yarn tsx scripts/recipe-servers.ts [<folder>]`, at the kit's root
 * - `http://127.0.0.1:4791/recipes`, with versions in a field;  `http://127.0.0.1:4791/graphql`
 * - `http://127.0.0.1:4791/api/places/recipes`:  a folder of files, as a place, behind a `PlaceServer`
 *   - the folder:  `<folder>`, else `spell-recipe-box` in the system's temporary folder, kept between runs
 *   - edit `recipes/r-1.json` there, and the page follows
 * - The demo's page is `/guides/data/experiments/recipe-box/recipe-box.html`, on the page server.
 */
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { JsonChunks } from "spell/util/places"
import { SRV } from "spell/server"
import { ChunkFiles, FolderPlace, PlaceServer } from "spell/server/places"
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
new PlaceServer({ places: { [COLLECTION]: place } }).route(router, new DemoGuard().allowPort(PORT))

const server = createServer(SRV.toListener(router.handle))
await SRV.listenPreferred(server, { port: PORT, fallback: false })
console.log(`the recipe servers are on http://127.0.0.1:${PORT}:  /recipes, /graphql and /api/places/recipes.`)
console.log(`the folder is ${folder}:  edit a file in recipes/, and the page follows.  Ctrl-C stops them.`)
