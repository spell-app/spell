/**
 * The recipe box demo's servers, on one port:  what `scripts/recipe-servers.ts` runs, and the recipe box test (epic `data` P11).
 * - TWO sources of recipes, each with several ways in, so a change made one way shows the others:
 *   - one CSV file (`RecipeFile`):
 *     - `/recipes`, with versions in a field
 *     - `/graphql`
 *     - `/recipes.csv`:  the file as it is, for a sheet to read, which a plain address can't write
 *     - `/api/places/recipes-csv`:  the file behind a `PlaceServer`, for a sheet that writes (`CsvPlace`, epic `data` P14)
 *   - one folder of files (`FolderPlace`):
 *     - `/api/places/recipes`:  behind a `PlaceServer`
 *     - `/api/rooms/recipes`:  a room, whose referee keeps its recipes in that same folder
 *       - it hears the place's every change, through the place's own `watch()`, as a step of the room
 * - `atmospherePort`:  a fake of AT Protocol's network too (`FakeAtmosphere`, epic `data` P16):  two hosts, Alice's recipes on one and Bob's on the other.
 * - `routes`:  anything else, by a caller:  a test's page.
 * - Node only;  a test helper, as `recipeServers.ts` is.
 */
import { createServer, type Server } from "node:http"
import { join } from "node:path"

import { JsonChunks, type Place } from "spell/util/places"
import { SRV } from "spell/server"
import { ChunkFiles, FolderPlace, PlaceKeys, PlaceServer, Referee } from "spell/server/places"

import { FakeAtmosphere } from "./fakeAtmosphere"
import { csvHandler, RecipeFile } from "./RecipeFile"
import { bothHandlers, DemoGuard, FIRST_RECIPES } from "./recipeServers"

/** The one collection. */
const COLLECTION = "recipes"

/** The name the CSV file's place server goes by. */
const CSV_PLACE = "recipes-csv"

/** Where its room listens. */
const ROOM_PATH = "/api/rooms/recipes"

/** What a room's recipe holds. */
const ROOM_FIELDS = ["title", "cuisine", "servings", "notes", "place"]

/** What `startRecipeServers()` is told. */
export type RecipeServersProps = {
  /** Where to listen:  `0`, any free port. */
  port: number
  /** Where the folder place, and the room, keep their files. */
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
  /** Where a fake of AT Protocol's network listens, its hosts on the next two ports:  left out, it isn't started. */
  atmospherePort?: number
}

/** What's running. */
export type RecipeServers = {
  /** Where it's listening. */
  url: string
  /** The recipes of the REST and GraphQL servers:  the CSV file. */
  box: RecipeFile
  /** The folder place:  the room's store too. */
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
  fixedPort = false,
  atmospherePort
}: RecipeServersProps): Promise<RecipeServers> {
  // only one back-end of the demo's:  a port in use shouldn't stop the others
  const atmosphere =
    atmospherePort === undefined
      ? undefined
      : await startAtmosphere(atmospherePort).catch((ignored) => {
          console.error(
            `The fake atmosphere can't start on ${atmospherePort}, so ?back-end=atmosphere won't work`,
            ignored
          )
          return undefined
        })
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
  const places = { [COLLECTION]: folderPlace, [CSV_PLACE]: box.place, ...morePlaces }
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
        void atmosphere?.close()
        server.closeAllConnections()
        server.close(() => resolve())
      })
  }
}

/** The demo's fake atmosphere:  Alice and Bob, each with some of the first recipes, on hosts of their own. */
async function startAtmosphere(port: number): Promise<FakeAtmosphere> {
  const atmosphere = await new FakeAtmosphere().start(["one", "two"], { port })
  atmosphere.addAccount(ATMOSPHERE_ALICE, { handle: "alice.test", host: "one" })
  atmosphere.addAccount(ATMOSPHERE_BOB, { handle: "bob.test", host: "two" })
  FIRST_RECIPES.forEach(({ id, name, ...fields }, index) => {
    atmosphere.putRecord(index % 2 ? ATMOSPHERE_BOB : ATMOSPHERE_ALICE, ATMOSPHERE_COLLECTION, id, {
      title: name,
      ...fields
    })
  })
  return atmosphere
}

/** Alice's account, in the demo's fake atmosphere. */
const ATMOSPHERE_ALICE = "did:plc:alice"

/** Bob's. */
const ATMOSPHERE_BOB = "did:plc:bob"

/** What the demo's recipes are kept under. */
const ATMOSPHERE_COLLECTION = "com.example.recipe"
