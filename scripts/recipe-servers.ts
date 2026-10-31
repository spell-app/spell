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
import { tmpdir } from "node:os"
import { join } from "node:path"

import { GoogleSheetPlace, PlaceKeys } from "spell/server/places"
import { startRecipeServers } from "spell/server/test/recipeDemo"

const PORT = 4791

/** Where its live room listens. */
const ROOM_PATH = "/api/rooms/recipes"

const folder = process.argv[2] ?? join(tmpdir(), "spell-recipe-box")

const SHEET_KEY = "GOOGLE_SHEETS_KEY"
const spreadsheet = process.env.GOOGLE_SHEET_ID
const keys = new PlaceKeys({ names: [SHEET_KEY] })
const googleSheet = spreadsheet && new GoogleSheetPlace({ spreadsheet, keyNamed: SHEET_KEY, keys, idColumn: "id" })

await startRecipeServers({
  port: PORT,
  fixedPort: true,
  folder,
  keys,
  ...(googleSheet && { morePlaces: { "google-sheet": googleSheet } })
})
console.log(
  `the recipe servers are on http://127.0.0.1:${PORT}:  /recipes, /graphql, /api/places/recipes and the live room, ${ROOM_PATH}.`
)
console.log(`the folder is ${folder}:  edit a file in recipes/, and the page follows.  Ctrl-C stops them.`)
if (googleSheet) console.log(`your Google Sheet ${spreadsheet} is on /api/places/google-sheet, its key held here.`)
