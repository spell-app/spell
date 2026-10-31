/**
 * The recipe box demo's servers, on one port:  what `scripts/recipe-servers.ts` runs, and the recipe box test (epic `data` P11).
 * - TWO sources of recipes, each with several ways in, so a change made one way shows the others:
 *   - one CSV file (`RecipeFile`):
 *     - `/recipes`, with versions in a field
 *     - `/graphql`
 *     - `/recipes.csv`:  the file as it is, for a sheet to read
 *   - one folder of files (`FolderPlace`):
 *     - `/api/places/recipes`:  behind a `PlaceServer`
 *     - `/api/rooms/recipes`:  a live room, whose referee keeps its recipes in that same folder
 *       - it hears the place's every change, through the place's own `watch()`, as a step of the room
 * - `routes`:  anything else, by a caller:  a test's page.
 * - Node only;  a test helper, as `recipeServers.ts` is.
 */
import { createServer, type Server } from "node:http"
import { join } from "node:path"

import { JsonChunks, type Place } from "spell/util/places"
import { SRV } from "spell/server"
import { ChunkFiles, FolderPlace, PlaceKeys, PlaceServer, Referee } from "spell/server/places"

import { csvHandler, RecipeFile } from "./RecipeFile"
import { bothHandlers, DemoGuard, FIRST_RECIPES } from "./recipeServers"

/** The one collection. */
const COLLECTION = "recipes"

/** Where its live room listens. */
const ROOM_PATH = "/api/rooms/recipes"

/** What a room's recipe holds. */
const ROOM_FIELDS = ["title", "cuisine", "servings", "notes", "place"]

/** What `startRecipeServers()` is told. */
export type RecipeServersProps = {
  /** Where to listen:  `0`, any free port. */
  port: number
  /** Where the folder place, and the live room, keep their files. */
  folder: string
  /** The CSV file behind REST, GraphQL and the sheet:  left out, `recipes.csv` in `folder`, which the folder place doesn't read. */
  csvFile?: string
  /** What to make the CSV file with, if it isn't there:  left out, the first recipes. */
  firstCsv?: string
  /** More places behind its place server, by name:  a Google Sheet. */
  morePlaces?: Record<string, Place>
  /** The keys its place server holds. */
  keys?: PlaceKeys
  /** Adds its own routes, first. */
  routes?: (router: SRV.Router) => void
  /** Must it have that port?  A demo says so on its page. */
  fixedPort?: boolean
}

/** What's running. */
export type RecipeServers = {
  /** Where it's listening. */
  url: string
  /** The recipes of the REST and GraphQL servers:  the CSV file. */
  box: RecipeFile
  /** The folder place:  the live room's store too. */
  folderPlace: FolderPlace
  /** Stops it. */
  close(): Promise<void>
}

/** The recipe servers, each source with the first recipes, unless it has some:  both keep theirs between runs. */
export async function startRecipeServers({
  port,
  folder,
  csvFile = join(folder, `${COLLECTION}.csv`),
  firstCsv,
  morePlaces,
  keys = new PlaceKeys({ names: [] }),
  routes,
  fixedPort = false
}: RecipeServersProps): Promise<RecipeServers> {
  const format = new JsonChunks({ summaries: { [COLLECTION]: ["title", "cuisine", "servings"] } })
  const folderPlace = new FolderPlace({ storage: new ChunkFiles({ root: folder }), format })
  if (!(await folderPlace.list(COLLECTION, {}, {})).rows.length) {
    const changes = FIRST_RECIPES.map(({ id, name, ...fields }, index) => ({
      kind: "insert" as const,
      collection: COLLECTION,
      id,
      fields: { title: name, ...fields, place: { parent: "box", at: `${index + 1}1` } }
    }))
    await folderPlace.apply(changes, {})
  }

  const box = new RecipeFile({ file: csvFile, ...(firstCsv !== undefined && { firstText: firstCsv }) })
  const router = new SRV.Router()
  routes?.(router)
  router.use(csvHandler(box))
  router.use(bothHandlers(box))
  const guardFor = (at: number) => new DemoGuard().allowPort(at)
  const server: Server = createServer()
  const places = { [COLLECTION]: folderPlace, ...morePlaces }
  server.on("request", SRV.toListener(router.handle))
  await (fixedPort
    ? SRV.listenPreferred(server, { port, fallback: false })
    : new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve)))
  const { port: at } = server.address() as { port: number }
  new PlaceServer({ places, keys }).route(router, guardFor(at))
  const referee = new Referee({
    path: ROOM_PATH,
    place: folderPlace,
    collections: { [COLLECTION]: { select: ROOM_FIELDS } },
    guard: guardFor(at)
  })
  await referee.open()
  server.on("upgrade", (raw, socket, head) => {
    if (new URL(raw.url ?? "/", "http://localhost").pathname === ROOM_PATH) void referee.upgrade(raw, socket, head)
    else socket.destroy()
  })
  return {
    url: `http://127.0.0.1:${at}`,
    box,
    folderPlace,
    close: () =>
      new Promise((resolve) => {
        referee.close?.()
        server.closeAllConnections()
        server.close(() => resolve())
      })
  }
}
