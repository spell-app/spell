/**
 * The recipe box demo's servers, on one port, until you stop them (epics `data` P4, P5):
 * - `yarn tsx scripts/recipe-servers.ts [<folder>]`, at the kit's root
 * - ONE CSV file, `<folder>.csv`, three ways in:  edit it in VS Code, and all three follow
 *   - `http://127.0.0.1:4791/recipes`:  REST, with versions in a field
 *   - `http://127.0.0.1:4791/graphql`
 *   - `http://127.0.0.1:4791/recipes.csv`:  the file itself, for a sheet to read, which can't write
 *   - `http://127.0.0.1:4791/api/places/recipes-csv`:  the file behind a `PlaceServer`, for a sheet that writes
 *   - the first time, a copy of `recipes.csv` beside the demo's pages, so the committed one never changes
 * - ONE folder of files, `<folder>`, two ways in:  edit `recipes/r-1.json` there, and both follow
 *   - `http://127.0.0.1:4791/api/places/recipes`:  as a place, behind a `PlaceServer`
 *   - `ws://127.0.0.1:4791/api/rooms/recipes`:  a room, its referee keeping its recipes there (epic `data` P8)
 * - `<folder>`:  else `spell-recipe-box` in the system's temporary folder.  Both are kept between runs.
 * - `http://127.0.0.1:4791/api/places/google-sheet`:  your own Google Sheet, behind the same server, which holds its key (epic `data` P7)
 *   - only with `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_KEY` set:  its id, and a service account's key file, as JSON;
 *     the steps are the epic page's manual test
 *   - its tab has to be called `recipes`
 * - `http://127.0.0.1:4792`:  a fake of AT Protocol's network, its two hosts on 4793 and 4794 (epic `data` P16), for `?back-end=atmosphere`
 * - `http://127.0.0.1:4791/api/places/airtable`:  a stub of Airtable, on 4795 (epic `data` P19), for `?back-end=airtable`;  edit it as if in Airtable's window with `curl`
 *   - your own base instead, with `AIRTABLE_BASE` and `AIRTABLE_KEY` set:  a table `Recipes`, the columns in `AIRTABLE_DEMO_LINES`;  the steps are the epic page's manual test
 * - `RECIPE_SERVERS_PORT`:  another port than 4791, the rest after it:  the demo's page then says `?servers=http://127.0.0.1:<port>`.
 * - The demo's page can start, stop and restart them, through the page server:  `recipeServersRoutes.ts`.
 *   - What it starts ends when the page server does.
 * - The demo's pages are `recipe-box.html` and `all-back-ends.html`, in `/guides/data/experiments/recipe-box/`, on the page server.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { contentFolderOf } from "spell/server/contentFolder"
import { AirtablePlace, GoogleSheetPlace, PlaceKeys } from "spell/server/places"
import { SRV } from "spell/server"
import { AIRTABLE_DEMO_LINES, startRecipeServers } from "spell/server/test/recipeDemo"
import {
  RECIPE_SERVERS_FOLDER,
  RECIPE_SERVERS_PARENT,
  RECIPE_SERVERS_PORT,
  RECIPE_SERVERS_READY
} from "spell/server/test/recipeServersRoutes"

const PORT = Number(process.env.RECIPE_SERVERS_PORT) || RECIPE_SERVERS_PORT

/** How often it looks whether what started it is still there, in ms. */
const PARENT_CHECK_MS = 5_000

/** How far past the port the stub of Airtable listens:  past the fake atmosphere's three. */
const AIRTABLE_STUB_AFTER = 4

/** Where its room listens. */
const ROOM_PATH = "/api/rooms/recipes"

/** Where the demo's committed CSV file is, in the epic repo. */
const COMMITTED_CSV = "guides/data/experiments/recipe-box/recipes.csv"

const folder = process.argv[2] ?? RECIPE_SERVERS_FOLDER
const csvFile = `${folder}.csv`
const committedCsv = join(contentFolderOf(process.cwd()) ?? "", COMMITTED_CSV)

const SHEET_KEY = "GOOGLE_SHEETS_KEY"
const spreadsheet = process.env.GOOGLE_SHEET_ID
const AIRTABLE_KEY = "AIRTABLE_KEY"
const airtableBase = process.env.AIRTABLE_BASE
const keys = new PlaceKeys({ names: [SHEET_KEY, AIRTABLE_KEY] })
const googleSheet = spreadsheet && new GoogleSheetPlace({ spreadsheet, keyNamed: SHEET_KEY, keys, idColumn: "id" })
const airtable =
  airtableBase && new AirtablePlace({ base: airtableBase, keyNamed: AIRTABLE_KEY, keys, ...AIRTABLE_DEMO_LINES })

await startRecipeServers({
  port: PORT,
  fixedPort: true,
  folder,
  csvFile,
  ...(existsSync(committedCsv) && { firstCsv: readFileSync(committedCsv, "utf8") }),
  keys,
  atmospherePort: PORT + 1,
  airtablePort: PORT + AIRTABLE_STUB_AFTER,
  morePlaces: { ...(googleSheet && { "google-sheet": googleSheet }), ...(airtable && { airtable }) }
})
console.log(`the recipe servers are on http://127.0.0.1:${PORT}.  Ctrl-C stops them.`)
console.log(`the CSV file, behind /recipes, /graphql, /recipes.csv and /api/places/recipes-csv, is ${csvFile}`)
console.log(`the folder, behind /api/places/recipes and the room, ${ROOM_PATH}, is ${folder}`)
if (googleSheet) console.log(`your Google Sheet ${spreadsheet} is on /api/places/google-sheet, its key held here.`)
console.log(
  airtable
    ? `your Airtable base ${airtableBase} is on /api/places/airtable, its key held here.`
    : `a stub of Airtable, on port ${PORT + AIRTABLE_STUB_AFTER}, is on /api/places/airtable.`
)
console.log(RECIPE_SERVERS_READY)

// Started by the demo's page, through the page server:  never outlive it
const parent = Number(process.env[RECIPE_SERVERS_PARENT])
if (parent) setInterval(() => SRV.isProcessAlive(parent) || process.exit(), PARENT_CHECK_MS)
