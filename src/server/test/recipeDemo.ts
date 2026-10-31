/**
 * The recipe box demo's servers, on one port:  what `scripts/recipe-servers.ts` runs, and the recipe box test (epic `data` P11).
 * - `/recipes`, with versions in a field;  `/graphql`
 * - `/api/places/recipes`:  a folder of files, as a place, behind a `PlaceServer`
 * - `/api/rooms/recipes`:  a live room, its referee keeping a folder of its own (`<folder>-room`)
 * - `routes`:  anything else, by a caller:  a test's page, someone else's button.
 * - Node only;  a test helper, as `recipeServers.ts` is.
 */
import { createServer, type Server } from "node:http"

import { JsonChunks, type Place } from "spell/util/places"
import { SRV } from "spell/server"
import { ChunkFiles, FolderPlace, PlaceKeys, PlaceServer, Referee } from "spell/server/places"

import { bothHandlers, DemoGuard, FIRST_RECIPES, RecipeBox } from "./recipeServers"

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
  /** Where the folder place keeps its files. */
  folder: string
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
  /** The REST and GraphQL servers' recipes. */
  box: RecipeBox
  /** The folder place. */
  folderPlace: FolderPlace
  /** The room's folder place. */
  roomPlace: FolderPlace
  /** Stops it. */
  close(): Promise<void>
}

/** The recipe servers, each with the first recipes.  The folder and the room's folder keep theirs between runs. */
export async function startRecipeServers({
  port,
  folder,
  morePlaces,
  keys = new PlaceKeys({ names: [] }),
  routes,
  fixedPort = false
}: RecipeServersProps): Promise<RecipeServers> {
  const format = new JsonChunks({ summaries: { [COLLECTION]: ["title", "cuisine", "servings"] } })
  const files = new ChunkFiles({ root: folder })
  const folderPlace = new FolderPlace({ storage: files, format })
  if (!(await folderPlace.list(COLLECTION, {}, {})).rows.length) {
    const changes = FIRST_RECIPES.map(({ id, name, ...fields }) => ({
      kind: "insert" as const,
      collection: COLLECTION,
      id,
      fields: { title: name, ...fields }
    }))
    await folderPlace.apply(changes, {})
  }

  const box = new RecipeBox()
  const router = new SRV.Router()
  routes?.(router)
  router.use(bothHandlers(box))
  // Someone else, in another program:  the file saved behind the page's back, as VS Code would
  router.post("/someone-else/folder/:id", SRV.parseBodies(), async (request, reply) => {
    const address = format.bodyAddress(COLLECTION, request.params.id!)
    const thing = JSON.parse((await files.read(address)) ?? "{}") as object
    const { name } = request.body as { name?: string }
    await files.write(address, format.bodyText({ ...thing, title: name }))
    reply.json({ ok: true })
  })
  const guardFor = (at: number) => new DemoGuard().allowPort(at)
  const server: Server = createServer()
  const places = { [COLLECTION]: folderPlace, ...morePlaces }
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
  server.on("request", SRV.toListener(router.handle))
  await (fixedPort
    ? SRV.listenPreferred(server, { port, fallback: false })
    : new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve)))
  const { port: at } = server.address() as { port: number }
  new PlaceServer({ places, keys }).route(router, guardFor(at))
  const referee = new Referee({
    path: ROOM_PATH,
    place: roomPlace,
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
    roomPlace,
    close: () =>
      new Promise((resolve) => {
        referee.close?.()
        server.closeAllConnections()
        server.close(() => resolve())
      })
  }
}
