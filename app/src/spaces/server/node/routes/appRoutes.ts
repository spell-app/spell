// FIRST:  defines `__PACKAGE_VERSION__`, which vite would, before anything reads it
import "spell/parser/spell/node/packageVersion.node"

import { existsSync, readFileSync } from "fs"
import JSON5 from "json5"
import { createRequire } from "module"
import { basename, dirname, join } from "path"
import { fileURLToPath } from "url"

import { PREF_SAVED_EVENT } from "spell/util"
import { SRV } from "spell/server"
import { checkoutOf } from "spell/server/checkout"
import type { RouteModule } from "spell/server/page"
import { pageServerSettings } from "spell/server/page/settings"
import { AtProtoIdentity, mailerFor, ReadCredentials, SignInCheck, SignIns } from "spell/server/signIn"
import { AuthenticatedPlaces } from "spell/server/places"
import { SP } from "spell/parser/spell"
import environment from "spell/app/spaces/server/node/environment"
import { isSpaceName } from "spell/app/spaces/models/spaceNames"
import { PALETTE_GROUPS_API } from "spell/app/spaces/models/paletteTable"
import { KEEPER_GLANCE_API } from "spell/app/spaces/models/keeperGlance"
import { BUILD_STEP_EVENT } from "spell/app/spaces/models/buildSteps"
import { isSourceCheckout } from "spell/app/spaces/server/node/spellSpacesDir"
import { peopleStore } from "spell/app/spaces/server/node/people/peopleRoutes"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { TERMS_PATH } from "spell/app/spaces/server/node/places/SpaceExport"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { ProjectPlaces } from "spell/app/spaces/server/node/places/ProjectPlaces"
import { onPrefSaved } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { watchProjectPacks } from "spell/app/spaces/server/node/projects/ProjectPack"
import { api, compileCache, projectBuild, spaceFiles } from "./api"
import { spacesDailyRound } from "./DailyRound"
import { APP_DIR, EditorServer } from "./EditorServer"
import { LocalSiteServer } from "./LocalSiteServer"
import { paletteRoutesFor } from "./paletteRoutes"
import { keeperRoutesFor } from "./keeperRoutes"

/**
 * Where the app reads the guides that ship with Spell (epic `epic-engine` P79):  `/api/guides/<path>`, a guide's path
 * inside the package's `guides/` (`/api/guides/guides.json5`, `/api/guides/data/data.html`).
 */
export const GUIDES_API = "/api/guides"

/**
 * The shipped guides' folder:  the INSTALLED `spell` package's `guides/`, found through `spell/package.json`, never a
 * path into another folder (a checkout's is the kit's own `guides/`, an npm install's `node_modules/spell/guides/`).
 */
const GUIDES_DIR = join(dirname(createRequire(import.meta.url).resolve("spell/package.json")), "guides")

/** Spell's terms page:  what it keeps, leaving with a space, deleting, backups, limits (epic `atmosphere` P7, T5). */
const TERMS_FILE = fileURLToPath(new URL("../places/terms.html", import.meta.url))

/**
 * The app on the page server:  a ROUTE MODULE (`spell/server/page`'s `RouteModule`),
 * spell-app's part of the kit's page server settings:  `"pageServer": { "routes": [...] }` in its `package.json`.
 * - What `spell app serve` runs everything on.
 * - It's spaces' (epic `people-and-orgs` P14):  where projects live, and the servers that serve them.
 * - What it serves:
 *   - `/api/...` -- the app's API, `./api` (as `cli.ts` serves it alone, `yarn start:server`);  bodies as JSON5
 *     - a pref saved through it (`/api/prefs/save`) is told to every open page, over the live channel
 *       (`PREF_SAVED_EVENT`):  a theme picked in one place shows in every other at once
 *     - every page it serves is told the prefs are here (`window.SPELL_SERVER.prefs`):
 *       a server without this module (spell-epic's own) has none, and its pages never ask
 *   - `/api/palette-groups` -- the editor palette's groups, as Owen arranged them (`paletteRoutes`, epic `editor` T81):
 *     the palette groups page (`/palette` on the editor) reads and saves them;  mounted before the rest of `/api`,
 *     with its own body parser, behind the same check of where a write comes from
 *   - `/api/keeper/glance` -- this machine's servers at a glance, from the server keeper (`keeperRoutes`, epic `editor`
 *     T185):  the editor's Help › Servers shows whether they're all up, and opens the keeper's Servers page
 *   - `/api/compiles/...` -- the compile cache (`compileCache`, `./api`), capped at the page server's `cacheLimit`
 *   - `/spaces/<project>/<file>` -- a project's file, by its URL (`spaceFiles`, `./api`):  how spell reads every file
 *   - `/api/places/spaces/<address>/...` -- every project data folder, by its address (`SpaceFolders`, epic `atmosphere` P1):
 *     `family cookbook is a data folder at "owen@spell/recipes"`, behind the page server's guard, as the Airtable
 *     routes are
 *   - `/api/places/projects/<project>/<place>/...` -- every project's authenticated places, read for its pages with
 *     the secret added (`ProjectPlaces`, the kit's `AuthenticatedPlaces`)
 *   - `/api/reads/spaces/<address>/...` -- a space's own folder, read direct with a credential for the whole space,
 *     apart from where it's written (`SpaceFolders`, epic `atmosphere` P5)
 *   - `/api/rooms/spaces/<address>/<collection>` -- a space's own folder shared live, a websocket room per collection,
 *     each write as its page's person (`SpaceFolders`, epic `atmosphere` T38)
 *   - `/api/sign-in/...` -- signing in to a Spell account by email, a link and a code
 *     (`SignInCheck`, epic `atmosphere` P3)
 *     - the link's page at `/sign-in/confirm`, and every mail the local catcher caught at `/sign-in/mail`
 *     - its check runs FIRST, for every route after it:  who's signed in on the device is on the request
 *       (`request.person`), which the guard, the project data folders, the prefs and the people routes read
 *     - invite only:  `POST /api/sign-in/invite { email }`, with this run's token, makes an account (`SpellAccounts`)
 *     - mail goes to the local catcher (`environment.signInDir`'s `mail/`) until a mail service is chosen (Q12)
 *     - an account Spell took down can't sign in;  `GET /api/sign-in/me` says the abuse contact
 *       (`environment.abuseContact`, `SPELL_ABUSE_CONTACT`), which the sign-in bar and the link's page show (P6)
 *   - TAKEDOWNS (epic `atmosphere` P6):  what Spell took down (`spell space takedown`, the log in each folder's
 *     `__takedowns.json5`) is refused through both the project data folders and the reads direct
 *   - `/api/exports/spaces/<address>` -- a space downloaded whole, a zip of plain JSON (`SpaceExport`, epic `atmosphere`
 *     P7);  `/terms` -- Spell's terms, among them the promise to hand over a space's keys (T5)
 * - THE DAILY ROUND (`spacesDailyRound()`, epic `atmosphere` P24), while the MAIN checkout's page server runs;
 *   a worktree's server runs none, as every checkout reads the same spell.spaces:
 *   - BACKUPS (epic `atmosphere` P7):  every space, each night, a week kept (`SpaceBackups`);
 *     a missed night is in its log
 *   - each real Space's member list, in step with its org's roles (`MemberLists`):  a term ending on its date
 *   - `/api/guides/...` -- the guides that ship with Spell, from the installed package (`GUIDES_API`, epic
 *     `epic-engine` P79):  the app's Guides page reads them
 *   - `/hello` -- liveness
 *   - `/element/...` -- `<spell-viewer>` / `<spell-editor>`'s bundles, `dist-element/` (`yarn build:element`)
 *     - for the demo page, `/demo/spell-editor.html` on the editor:  vite passes `/element` on to us, as it does `/api`
 *   - `/editor` -- the site header's "Editor":  redirects to the editor, from its record (`EditorServer.recordFile`,
 *     this page server's spaces' own)
 *     - `/editor/<page>`:  that page of the editor, `/editor/palette` => the editor's `/palette`:  how a docs page
 *       links one, whichever port the editor took
 *     - not up yet (vite takes seconds) or not running:  says so
 * - The editor UI (`EditorServer`):  vite's dev server, started once the page server listens and stopped with it.
 *   The page server and the editor are ONE thing to start.
 * - The house-network test site (`LocalSiteServer`, epic `atmosphere` T58):  the cloud and Caddy, from the main
 *   checkout's page server alone, on a Mac set up for it;  it outlives the page server, so a restart leaves it up (T63).
 *   - `SPELL_NO_LOCAL_SITE=1` or a test (`VITEST`):  not started, so a test's server leaves the real ports alone.
 *   - an npm install of `spell` (not a source checkout):  not started either
 * - Writes refuse a foreign `Origin` (another site posting into our projects).
 *   - The API has no token, since the editor calls it from vite's origin, through vite's proxy.
 * - As it starts:  compiles the built-in projects that are out of date (`@spell/examples`, `@spell/library`),
 *   in the background;  stopped with the page server.
 *   - So the demo pages and App UI's live examples find their compiled output in `build/` (`ProjectBuild`, `start()`).
 */
const appRoutes: RouteModule = {
  name: "app",
  setup({ router, guard, web, root, info, live, addPageConfig, addServerReport, onListening, onStop }) {
    // every project data folder;  a space's own read direct, with a credential signed by a key kept beside the
    // sign-ins (epic `atmosphere` P5);  what Spell took down refused on both sides (P6)
    // the ONE mail seam:  sign-in mail and inbox mail (P30) both go through it
    const mailer = mailerFor({ folder: join(environment.signInDir, "mail"), ...environment.mail })
    const folders = new SpaceFolders({
      credentials: new ReadCredentials({ file: join(environment.signInDir, "space-reads.key") }),
      mailer,
      address: () => `http://127.0.0.1:${info.port}`
    })
    // who's signed in, on every request after this:  the ONE sign-in check (epic `atmosphere` P3);
    // an account taken down can't sign in, and the abuse contact is on the sign-in bar (P6);
    // or a linked Bluesky account, its host sending the browser back to this machine's address (P19)
    const signIn = new SignInCheck({
      signIns: new SignIns({ file: join(environment.signInDir, "sessions.json"), minutes: environment.signInMinutes }),
      mailer,
      accounts: new SpellAccounts(peopleStore(), { takedowns: folders.takedowns }),
      abuseContact: environment.abuseContact,
      atProto: new AtProtoIdentity({ address: () => `http://127.0.0.1:${info.port}` })
    })
    router.use(signIn.check)
    signIn.route(router, guard)
    // the person's prefs are answered here (`/api/prefs`, under `api`):  every page keeps its theme in their space
    addPageConfig(() => ({ prefs: true }))
    const checkout = checkoutOf(environment.repoDir)
    const isMainCheckout = !!checkout && checkout.root === checkout.main
    const editor = new EditorServer(root)
    // a checkout's alone:  an npm install of `spell` on a Mac set up for the site would build and swap its cloud
    // from the install's code (epic `repo-split` P26)
    const site =
      !process.env.VITEST && !process.env.SPELL_NO_LOCAL_SITE && isSourceCheckout
        ? new LocalSiteServer({ isMainCheckout, editorPort: () => editor.portPicked })
        : undefined
    // an editor the house network reaches through Caddy listens on this machine alone (epic `atmosphere` P39)
    const thisMachineOnly = site?.editorAddress !== undefined
    onListening(() => editor.start(info.port, guard, { thisMachineOnly }))
    onStop(() => editor.stop())
    projectBuild.start()
    onStop(() => projectBuild.stop())
    // each step of a project made ready to run, as a page asks for it:  every open page hears it, and the one waiting
    // says it in words (the runner's waiting box, the editor's loading screen;  epic `editor` P45)
    onStop(projectBuild.onStep((step) => live.send(BUILD_STEP_EVENT, step)))
    // a person's pref saved (their theme):  every open page hears it, and follows (`ThemePreference`)
    onStop(onPrefSaved((saved) => live.send(PREF_SAVED_EVENT, saved)))
    // a project file changed on disk (another window, an agent, git):  every open page hears it at its address,
    // so the editor shows it at once, with no poll
    onStop(watchSpaceFiles(live))
    // an element of a project's own saved:  its component pack rebuilt, and swapped into every open page using it
    onStop(watchPacks(live))
    // before `/api`'s own routes, whose last answers every path it doesn't know
    // and their live rooms, each write as its page's person (epic `atmosphere` T38)
    folders.route({ router, guard, upgrade: (prefix, handle) => web.upgrade(prefix, handle), signIn })
    onStop(() => folders.close())
    // every project's authenticated places, read for its pages with the secret added:
    // the kit's route module made their routes, and says the secrets that aren't set as the server starts
    AuthenticatedPlaces.for({ router, guard }).addSource(new ProjectPlaces())
    router.get(TERMS_PATH, (_request, reply) => reply.sendFile(TERMS_FILE))
    // the daily round (a copy a night, real Spaces' lists), from the main checkout's server alone:
    // every worktree's reads the same spell.spaces
    if (isMainCheckout) onStop(spacesDailyRound(folders).start())
    if (site) {
      // deliberately not waited for:  the page server's own start mustn't hang on Caddy's
      onListening(() => void site.startWithPageServer().catch((error: unknown) => console.error(error)))
      onStop(() => site.stop())
      addServerReport?.(() => site.report())
    }
    // the compile cache's cap:  the page server's `cacheLimit` setting (epic `language` Q41)
    const { cacheLimit } = pageServerSettings(root)
    if (cacheLimit !== undefined) compileCache.limit = SRV.sizeInBytes(cacheLimit)
    router.use(PALETTE_GROUPS_API, refuseForeignOrigins, paletteRoutesFor())
    // this machine's servers at a glance, the editor's Help › Servers (epic `editor` T185)
    router.use(KEEPER_GLANCE_API, refuseForeignOrigins, keeperRoutesFor())
    // the guides that ship with Spell, read by the app's Guides page (epic `epic-engine` P79):  the installed
    // package's `guides/`, its list `guides.json5` and each page;  before `/api`, whose last answers every path
    router.use(new SRV.StaticHandler({ mounts: [{ prefix: GUIDES_API, dir: GUIDES_DIR }] }).handle)
    router.use("/api", refuseForeignOrigins, SRV.parseBodies({ limit: 10 * 1024 * 1024, parseJson: JSON5.parse }), api)
    router.use("/spaces", spaceFiles)
    router.get("/hello", (_request, reply) => reply.json({ message: "Hello from the API!" }))
    router.use(new SRV.StaticHandler({ mounts: [{ prefix: "/element", dir: ELEMENT_DIR }] }).handle)
    const toEditor = async (request: SRV.Request, reply: SRV.Reply) => {
      const url = await editorUrl(editor.recordFile)
      if (url) return void reply.redirect(new URL(`/${request.params.page ?? ""}`, url).href)
      reply
        .status(503)
        .type("text/html")
        .send(
          `<!doctype html><title>Editor</title><p>The editor isn't up:  it starts with the page server, and takes a few ` +
            `seconds -- reload.  Still not?  See <code>${basename(editor.logFile)}</code>.</p>`
        )
    }
    router.get("/editor", toEditor)
    router.get("/editor/:page*", toEditor)
  }
}

export default appRoutes

/** `yarn build:element`'s output, in the app's build folder:  `app/dist-element/`. */
const ELEMENT_DIR = join(APP_DIR, "dist-element")

/** The running editor's URL, from its record `file`, if it answers. */
async function editorUrl(file: string): Promise<string | undefined> {
  if (!existsSync(file)) return undefined
  try {
    const { url } = JSON.parse(readFileSync(file, "utf8")) as { url: string }
    await fetch(url, { signal: AbortSignal.timeout(1000) })
    return url
  } catch {
    return undefined
  }
}

/**
 * Tell every open page of each change to a project's file, at the address it's read at:
 * `/spaces/<address>` (`SP.SpellUrls.fileUrl()`), e.g. `/spaces/owen@spell/errors/a.spell`.
 * - over the page server's live channel (`spell-server:changed`):
 *   the editor watches its open project's files by it (`editor.watchOpenFile()`)
 * - both of spaces' folders (`environment.spaceFolders`):  the built-ins, and spell.spaces;  and each more spaces
 *   folder (`environment.moreSpaces`)
 * - never spaces' own names (`__data`, `__draft` ...):
 *   a program's rows and a person's drafts aren't a project's files,
 *   and the live rooms and data folders say their own changes
 * - Returns what stops it.
 */
function watchSpaceFiles(live: SRV.LiveReload): () => void {
  const isProjectFile = (path: string) => !path.split("/").some(isSpaceName)
  const folders: Array<[string, string]> = [
    ...Object.entries(environment.spaceFolders),
    // the more spaces folders' too:  their addresses read as spell.spaces' do
    ...environment.moreSpaces.map(({ dir }): [string, string] => ["spaces", dir])
  ]
  const watches = folders.map(
    ([base, dir]) =>
      new SRV.FolderWatch(dir, { only: isProjectFile, keepsAlive: false }, ([inside]) => {
        const place = SP.SpellUrls.placeForFolder(base as SP.SpaceFolderBase, inside!)
        if (place) live.changed(join(dir, inside!), SP.SpellUrls.SPACES + SP.SpellUrls.encodeAddress(place))
      })
  )
  return () => {
    for (const watch of watches) watch.close()
  }
}

/**
 * Rebuild a project's component pack as one of its elements is saved, and tell every open page its script changed
 * :  `watchProjectPacks()` (`ProjectPack.ts`) on the same folders as `watchSpaceFiles()`.
 * - A page using the pack swaps the changed families in, with no reload (Spell UI's `PackHotSwap`:  on the editor's
 *   page, the run page and the component sets' site).
 * - The rebuild:  `ProjectBuild.rebuildPack()`, unminified, one at a time per project.
 * - The page's report:  the pack's script, at its address (`/spaces/<project>/__pack/<name>.pack.js`), over the live
 *   channel, as a rebuilt bundle's is.
 * - A page Spell's dev server serves the pack's SOURCE to (the editor's `yarn start:dev`) never loaded the script:
 *   the dev server's own hot replacement takes the save there, and this report passes it by.
 * - Returns what stops it.
 */
function watchPacks(live: SRV.LiveReload): () => void {
  const folders: Array<[string, string]> = [
    ...Object.entries(environment.spaceFolders),
    ...environment.moreSpaces.map(({ dir }): [string, string] => ["spaces", dir])
  ]
  return watchProjectPacks({
    folders: folders.map(([base, dir]) => ({
      dir,
      projectFor: (inside: string) => {
        if (inside.split("/").some(isSpaceName)) return undefined
        const place = SP.SpellUrls.placeForFolder(base as SP.SpaceFolderBase, inside)
        try {
          const projectId = place && SP.SpellUrls.split(place).projectId
          return projectId
            ? { projectId, folder: SP.SpellLocation.getProjectLocation(projectId).serverPath }
            : undefined
        } catch {
          // no group holds it
          return undefined
        }
      }
    })),
    rebuild: (projectId) => projectBuild.rebuildPack(projectId),
    report: (projectId, pack) =>
      live.changed(pack.files.script, SP.SpellUrls.packUrl(SP.SpellUrls.packModuleFor(projectId, pack.name)))
  })
}

/** Middleware:  403 for a write whose `Origin` isn't this machine (`localhost` / `127.0.0.1`, any port). */
function refuseForeignOrigins(request: SRV.Request, _reply: SRV.Reply, next: SRV.Next): void {
  const origin = request.get("origin")
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    origin &&
    !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
  )
    throw new SRV.HttpError(403, "wrong origin")
  next()
}
