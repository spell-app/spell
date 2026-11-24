/**
 * What the editor passes on to the PAGE server, by path prefix:  ONE list for both ways the editor is served.
 * - in a checkout, vite's dev server proxies them (`pageServerProxy()`, in the app's build folder's `vite.shared.ts`)
 * - in an npm install of `spell`, the built editor's own small server does (`EditorServer`'s `serveBuilt()`;
 *   epic `repo-split` P26)
 * - NEVER imports anything:  vite's configs load it.
 */

/**
 * The prefixes, first match wins:  `/api/places` before `/api`.
 * - `/api/places`:  every project data folder, the page server's write token added (`TOKEN_PREFIXES`)
 * - `/api/rooms`:  a space's live rooms, websockets, the token added too:  a page in the editor joins one as this
 *   machine's person, with no sign-in, as it writes a data folder (epic `mockup` T48, Checkers)
 * - `/api`:  the app's API, and its websockets (live rooms, live reload)
 * - `/spaces`:  a project's files, by their URL (`/spaces/<project>/<file>`, `SP.SpellUrls`)
 * - `/element`:  `<spell-viewer>` / `<spell-editor>`'s bundles, for the demo pages
 * - `/components`:  Spell UI's component pages and their images, which a notebook links and shows
 *   (`@spell/guides/SpellUI/Avatar/Usage.spell`, epic `notebook` P10)
 * - `/epics`, `/_epic`:  the epic pages and their engine's files:  the theme editor previews one
 *   (`<ThemeEditorPage>`, epic `debut` P24)
 */
export const PAGE_SERVER_PREFIXES = [
  "/api/places",
  "/api/rooms",
  "/api",
  "/spaces",
  "/element",
  "/components",
  "/epics",
  "/_epic"
] as const

/** The prefixes whose requests carry the page server's write token (`SERVER_TOKEN_HEADER`). */
export const TOKEN_PREFIXES: readonly string[] = ["/api/places", "/api/rooms"]

/** The prefixes whose websockets are passed on too. */
export const WEBSOCKET_PREFIXES: readonly string[] = ["/api/rooms", "/api"]

/** The header the page server's guard reads its write token from (`SRV.Guard`). */
export const SERVER_TOKEN_HEADER = "x-server-token"

/**
 * Which of the editor's pages a browser opening `pathname` gets (epic `solid-2-final` P12):
 * - `run.html`, the run page, for `/run/<project>...`:  the project running alone, with no editor in the page
 * - `index.html`, the editor, for every other address
 * - The built editor's server (`EditorServer.builtServer()`) and the dev server (`runPageInDev()`, the app's
 *   `vite.config.ts`) both ask it, so they send the same page for an address.
 * - Inside the editor, a switch to Run asks no server:  the editor's page stays, live edits and all.
 */
export function editorPageFor(pathname: string): EditorPage {
  return RUN_ADDRESS.test(pathname) ? "run.html" : "index.html"
}

/** One of the editor's pages, a file at its build's root. */
export type EditorPage = "index.html" | "run.html"

/** A run page's address:  `/run/`, then a project's. */
const RUN_ADDRESS = /^\/run\/[^/]/
