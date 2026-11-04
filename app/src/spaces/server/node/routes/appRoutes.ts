// FIRST:  defines `__PACKAGE_VERSION__`, which vite would, before anything reads it
import "spell/parser/spell/node/packageVersion.node"

import { existsSync, readFileSync } from "fs"
import JSON5 from "json5"
import { join } from "path"

import { PREF_SAVED_EVENT } from "spell/util"
import { SRV } from "spell/server"
import type { RouteModule } from "spell/server/page"
import { MailCatcher, ReadCredentials, SignInCheck, SignIns } from "spell/server/signIn"
import environment from "spell/app/spaces/server/node/environment"
import { peopleStore } from "spell/app/spaces/server/node/people/peopleRoutes"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { onPrefSaved } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { api, projectBuild, spaceFiles } from "./api"
import { APP_DIR, EDITOR_FILE, EditorServer } from "./EditorServer"

/**
 * The app on the page server:  a ROUTE MODULE (`spell/server/page`'s `RouteModule`),
 * spell-app's part of the kit's page server settings:  `"pageServer": { "routes": [...] }` in its `package.json`.
 * - What `spell app serve` runs everything on.
 * - It's spaces' (epic `people-and-orgs` P14):  where projects live, and the servers that serve them.
 * - What it serves:
 *   - `/api/...` -- the app's API, `./api` (as `cli.ts` serves it alone, `yarn start:server`);  bodies as JSON5
 *     - a pref saved through it (`/api/prefs/save`) is told to every open page, over the live channel
 *       (`PREF_SAVED_EVENT`):  a theme picked in one place shows in every other at once
 *     - every page it serves is told the prefs are here (`window.SPELL_SERVER.prefs`):  a server without this
 *       module (spell-epic's own) has none, and its pages never ask
 *   - `/spaces/<project>/<file>` -- a project's file, by its URL (`spaceFiles`, `./api`):  how spell reads every file
 *   - `/api/places/spaces/<address>/...` -- every project data folder, by its address (`SpaceFolders`, epic `atmosphere` P1):
 *     `family cookbook is a data folder at "owen@spell/recipes"`, behind the page server's guard, as the Airtable
 *     routes are
 *   - `/api/reads/spaces/<address>/...` -- a space's own folder, read direct with a credential for the whole space,
 *     apart from where it's written (`SpaceFolders`, epic `atmosphere` P5)
 *   - `/api/sign-in/...` -- signing in to a Spell account by email, a link and a code (`SignInCheck`, epic `atmosphere`
 *     P3), with the link's page at `/sign-in/confirm`, and every mail the local catcher caught at `/sign-in/mail`
 *     - its check runs FIRST, for every route after it:  who's signed in on the device is on the request
 *       (`request.person`), which the guard, the project data folders, the prefs and the people routes read
 *     - invite only:  `POST /api/sign-in/invite { email }`, with this run's token, makes an account (`SpellAccounts`)
 *     - mail goes to the local catcher (`environment.signInDir`'s `mail/`) until a mail service is chosen (Q12)
 *     - an account Spell took down can't sign in;  `GET /api/sign-in/me` says the abuse contact
 *       (`environment.abuseContact`, `SPELL_ABUSE_CONTACT`), which the sign-in bar and the link's page show (P6)
 *   - TAKEDOWNS (epic `atmosphere` P6):  what Spell took down (`spell app takedown`, the log in each folder's
 *     `__takedowns.json5`) is refused through both the project data folders and the reads direct
 *   - `/hello` -- liveness
 *   - `/element/...` -- `<spell-viewer>` / `<spell-editor>`'s bundles, `dist-element/` (`yarn build:element`)
 *     - for the demo pages, `/demo/spell-viewer.html` on the editor:  vite passes `/element` on to us, as it does `/api`
 *   - `/editor` -- the site header's "Editor":  redirects to the editor, from its record (`EDITOR_FILE`)
 *     - not up yet (vite takes seconds) or not running:  says so
 * - The editor UI (`EditorServer`):  vite's dev server, started once the page server listens and stopped with it.
 *   The page server and the editor are ONE thing to start.
 * - Writes refuse a foreign `Origin` (another site posting into our projects).
 *   - The API has no token, since the editor calls it from vite's origin, through vite's proxy.
 * - As it starts:  compiles the built-in projects that are out of date (`@spell/examples`, `@spell/library`),
 *   in the background;  stopped with the page server.
 *   - So the demo pages and App UI's live examples find their compiled output in `build/` (`ProjectBuild`, `start()`).
 */
const appRoutes: RouteModule = {
  name: "app",
  setup({ router, guard, root, info, live, addPageConfig, onListening, onStop }) {
    // every project data folder;  a space's own read direct, with a credential signed by a key kept beside the
    // sign-ins (epic `atmosphere` P5);  what Spell took down refused on both sides (P6)
    const folders = new SpaceFolders({
      credentials: new ReadCredentials({ file: join(environment.signInDir, "space-reads.key") })
    })
    // who's signed in, on every request after this:  the ONE sign-in check (epic `atmosphere` P3);  an account taken
    // down can't sign in, and the abuse contact is on the sign-in bar (P6)
    const signIn = new SignInCheck({
      signIns: new SignIns({ file: join(environment.signInDir, "sessions.json") }),
      mailer: new MailCatcher({ folder: join(environment.signInDir, "mail") }),
      accounts: new SpellAccounts(peopleStore(), { takedowns: folders.takedowns }),
      abuseContact: environment.abuseContact
    })
    router.use(signIn.check)
    signIn.route(router, guard)
    // the person's prefs are answered here (`/api/prefs`, under `api`):  every page keeps its theme in their space
    addPageConfig(() => ({ prefs: true }))
    const editor = new EditorServer(root)
    onListening(() => editor.start(info.port))
    onStop(() => editor.stop())
    projectBuild.start()
    onStop(() => projectBuild.stop())
    // a person's pref saved (their theme):  every open page hears it, and follows (`ThemePreference`)
    onStop(onPrefSaved((saved) => live.send(PREF_SAVED_EVENT, saved)))
    // before `/api`'s own routes, whose last answers every path it doesn't know
    folders.route({ router, guard })
    onStop(() => folders.close())
    router.use("/api", refuseForeignOrigins, SRV.parseBodies({ limit: 10 * 1024 * 1024, parseJson: JSON5.parse }), api)
    router.use("/spaces", spaceFiles)
    router.get("/hello", (_request, reply) => reply.json({ message: "Hello from the API!" }))
    router.use(new SRV.StaticHandler({ mounts: [{ prefix: "/element", dir: ELEMENT_DIR }] }).handle)
    router.get("/editor", async (_request, reply) => {
      const url = await editorUrl(root)
      if (url) return void reply.redirect(url)
      reply
        .status(503)
        .type("text/html")
        .send(
          `<!doctype html><title>Editor</title><p>The editor isn't up:  it starts with the page server, and takes a few ` +
            `seconds -- reload.  Still not?  See <code>.spell-server.editor.log</code>.</p>`
        )
    })
  }
}

export default appRoutes

/** `yarn build:element`'s output, in the app's build folder:  `app/dist-element/`. */
const ELEMENT_DIR = join(APP_DIR, "dist-element")

/** The running editor's URL, from `EDITOR_FILE`, if it answers. */
async function editorUrl(root: string): Promise<string | undefined> {
  const file = join(root, EDITOR_FILE)
  if (!existsSync(file)) return undefined
  try {
    const { url } = JSON.parse(readFileSync(file, "utf8")) as { url: string }
    await fetch(url, { signal: AbortSignal.timeout(1000) })
    return url
  } catch {
    return undefined
  }
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
