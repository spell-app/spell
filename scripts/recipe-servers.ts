/**
 * The recipe box demo's servers, on one port, until you stop them (epics `data` P4, P5):
 * - `yarn tsx scripts/recipe-servers.ts [<folder>]`, at the kit's root
 * - ONE CSV file, `<folder>.csv`, three ways in:  edit it in VS Code, and all three follow
 *   - `http://127.0.0.1:4791/recipes`:  REST, with versions in a field
 *   - `http://127.0.0.1:4791/graphql`
 *   - `http://127.0.0.1:4791/recipes.csv`:  the file itself, for a sheet to read
 *   - the first time, a copy of `recipes.csv` beside the demo's pages, so the committed one never changes
 * - ONE folder of files, `<folder>`, two ways in:  edit `recipes/r-1.json` there, and both follow
 *   - `http://127.0.0.1:4791/api/places/recipes`:  as a place, behind a `PlaceServer`
 *   - `ws://127.0.0.1:4791/api/rooms/recipes`:  a live room, its referee keeping its recipes there (epic `data` P8)
 * - `<folder>`:  else `spell-recipe-box` in the system's temporary folder.  Both are kept between runs.
 * - `http://127.0.0.1:4791/api/places/google-sheet`:  your own Google Sheet, behind the same server, which holds its key (epic `data` P7)
 *   - only with `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_KEY` set:  its id, and a service account's key file, as JSON;
 *     the steps are the epic page's manual test
 *   - its tab has to be called `recipes`
 * - The demo's pages are `recipe-box.html` and `all-back-ends.html`, in `/guides/data/experiments/recipe-box/`, on the page server.
 */
import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { contentFolderOf } from "spell/server/contentFolder"
import { GoogleSheetPlace, PlaceKeys } from "spell/server/places"
import { startRecipeServers } from "spell/server/test/recipeDemo"

const PORT = 4791

/** Where its live room listens. */
const ROOM_PATH = "/api/rooms/recipes"

/** Where the demo's committed CSV file is, in the epic repo. */
const COMMITTED_CSV = "guides/data/experiments/recipe-box/recipes.csv"

const folder = process.argv[2] ?? join(tmpdir(), "spell-recipe-box")
const csvFile = `${folder}.csv`
const committedCsv = join(contentFolderOf(process.cwd()) ?? "", COMMITTED_CSV)

const SHEET_KEY = "GOOGLE_SHEETS_KEY"
const spreadsheet = process.env.GOOGLE_SHEET_ID
const keys = new PlaceKeys({ names: [SHEET_KEY] })
const googleSheet = spreadsheet && new GoogleSheetPlace({ spreadsheet, keyNamed: SHEET_KEY, keys, idColumn: "id" })

await startRecipeServers({
  port: PORT,
  fixedPort: true,
  folder,
  csvFile,
  ...(existsSync(committedCsv) && { firstCsv: readFileSync(committedCsv, "utf8") }),
  keys,
  ...(googleSheet && { morePlaces: { "google-sheet": googleSheet } })
})
console.log(`the recipe servers are on http://127.0.0.1:${PORT}.  Ctrl-C stops them.`)
console.log(`the CSV file, behind /recipes, /graphql and /recipes.csv, is ${csvFile}`)
console.log(`the folder, behind /api/places/recipes and the live room, ${ROOM_PATH}, is ${folder}`)
if (googleSheet) console.log(`your Google Sheet ${spreadsheet} is on /api/places/google-sheet, its key held here.`)
