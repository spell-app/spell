# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/server/` (`spell/server`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- Serving pages locally, and assembling them, for every package:  `spell/server` (`SRV`).
  - Assembling (below, "Assembling pages"):  merged in here, its names in `SRV`.
    It was the kit's `assembler/` (namespace `AS`) until epic `repo-split` P14 (Q43).
  - Before this package, six servers each had their own mime table, path check, port choice and opener.
    Now they share these.
  - Docs:  [the page server guide](../../spell.epics/guides/server.html):  the library, the page server's flows,
    route modules, safety, why.
- What's in it:
  - [mime.ts](mime.ts) -- ONE content-type table, `typeFor()`
  - [safePath.ts](safePath.ts):
    - `resolveInside()`:  URL path -> file under a root, never outside it
    - `fileInside()`:  the same, for a file that may not be there yet
  - `StaticHandler` -- folders under URL prefixes, with:
    - html / per-extension hooks
    - overlays:  one folder laid over another
    - an `ETag`
  - `Request`, `Reply`, `Router` and [bodies.ts](bodies.ts) -- the part of Express the app's API uses
  - [listener.ts](listener.ts) -- `toListener()`:  a handler as node's `(req, res)`, with the 404 / error answers
  - [ports.ts](ports.ts) -- choosing a port:

    ```ts
    isFree    freePort    listenPreferred
    ```

  - [open.ts](open.ts) -- browser, new window, reused Chrome tab (VS Code's doc preview is spell-epic's own opener)
  - `FileLock` -- `<file>.lock`, so tools writing the same file take turns
  - `FileOperations` -- files and folders saved, created, renamed, duplicated and deleted.
    - each under the `FileLock`
    - a save all at once:  a temp file, then a rename
    - nothing of pages or projects
    - In-process, on absolute paths, checking no list:  `SRV.FileOperations.save(file, contents, { ifMatch })` ...
      - Spaces saves its projects' files this way.
      - The page editor (`/api/pages`) saves through `save()` too.
    - Over HTTP, `/api/files` (`route()`), for pages the server served:
      - `PUT ?path=` (save), `POST /create`, `/rename`, `/duplicate`, `DELETE ?path=`
      - every one needs `Guard`'s strong write check (this run's token, same origin)
      - ONLY inside the writable folders, the shared content ones;  anything else:  403
        - the list:  `"writable"`, in the page server's settings (below)
        - today:
          `epics`, `guides`, `pages`, `brand`
          (not `templates` since epic `epic-eject` T11:  they're spell-epic's, at the engine route `/templates/`)
      - The page editor's writes are held to the same list (`FileOperations.writableFile()`).
      - Those folders are the shared content folder's, once the page server serves it (`FileOperations.content`,
        `serveContent()`, below);  else the checkout's.
        - In a checkout that still links them in:  paths are resolved (`fileInside()`), never followed,
          so they stay "inside".
  - `LiveReload` + [liveClient.ts](liveClient.ts) -- live reload over a websocket, and the page-side client.
    - The client:  `/api/server/live.js` (`editPage()`).
    - Its websocket:  `/api/server/live`.
    - [webSocket.ts](webSocket.ts) -- the server's half of one (node built-ins).
    - NEVER an `EventSource`, or any other request held open:
      each takes one of Chrome's 6 connections per host, and every VS Code window shares them.
    - HOT RELOAD (epic `epic-workflow` P24):  what a changed file means to a page is `liveAction()`:
      - its own file:  patched in place (the docs runtime), else reloaded
      - a stylesheet it uses:  swapped in place, no reload
        - in VS Code's side-bar views too (spell-epic's Epic Docs and Review):  the live client runs inside their frame,
          with its own socket (the frame is cross-origin to the view)
        - nothing caches a stale one:  every answer is `Cache-Control: no-store`, `_assets/` included,
          so a reload always fetches the stylesheet as it is now
      - a script it loaded, or one beside it:  reloaded, keeping the scroll
        - which:  its `<script src>` tags, and `performance`'s resource entries
          (lazy chunks, `epics.pack.js`, an experiment's `*.bundle.js`)
      - anything else:  `spell-server:file`, and the page decides
    - Each socket opens with `hello` and the server's `run` (`LiveReload.run`, also `SPELL_SERVER.run`):
      a page from an earlier run (the server restarted) reloads, for the new `/api/server/live.js` and token.
    - Reloads go through `reloadGate()`:  one, 500ms after the last change.
      - While the reader types in a field, an "Updated:  reload" pill waits;  it reloads once focus leaves the field.
    - A worktree's pages on the main server (`/worktrees/<w>/`):
      epics' `RunningEpics` reports that worktree's docs assets and packs too.
      - It reports them as `/.claude/worktrees/<w>/...`, the path the live client reads them under (`servedPath()`).
      - The path starts with the worktrees' folder, from the root, which the server tells every page:
        `SPELL_SERVER.worktreesPath`, by `urlPathOf()`.
        So worktrees beside the repo work too (epic `epic-eject` P7).
  - `Guard` -- `Host` check, per-run token, same-origin writes
  - `PidFile` -- a background server's `.spell-server.json`, at its root:  status, ensure, stop;
    and `isProcessAlive(pid)`, for whoever needs to know a process still runs (spell-epic's review inbox).
    - `ensure` restarts a server that started before its code last changed.
      So after a merge, the next opener gets the new routes.
      - its code:  the `sources` folders, by `newestChange()`
      - Nothing restarts it by itself:  the next `spell server start` (an opener, `/airplane`),
        or the side bar's "Restart Page Server".  Its open pages then reload (`hello`).
    - `stop` waits for the old PROCESS to end (`SIGTERM`, then `SIGKILL` after 10s), not just for it to stop answering.
      - Why:  it stops answering before it lets go of its port.
        `ensure` started the new one while the old one held the port, so the new one took another port,
        and pages on the old one found the server down (epic `airplane`, 2026-10-10).
  - [mainServer.ts](mainServer.ts) -- `mainServerUrl()`:  a worktree's file on the MAIN checkout's page server.
    - It asks that server for `/api/epics/running` (`RUNNING_EPICS_API`).
    - A file of the shared content folder, by its own path (`.../spell.epics/epics/...`, as spell-epic hands them out):
      its path there, `/epics/...` (epic `epic-eject` I20).
      - The content folder:  the one the server says it serves, `contentFolder` in its `/api/server`.
      - Which main checkout, when the caller names none (the doc preview):
        the one beside the content repo whose pid file names it (`contentServerOf()`).
  - [checkout.ts](checkout.ts) -- `checkoutOf()`:  the git checkout a path is in, and its MAIN checkout.
    - Read from the disk as git finds them (a worktree's `.git` file, git's common dir), with no `git` run.
    - Plain `node` loads it by path (epics' `EpicConfig`, for the hooks), so node built-ins only.
    - [Test helpers](test/checkouts.ts) that fake one:  `fakeMainCheckout()`, `fakeWorktree()`.
  - [proxy.ts](proxy.ts) -- `proxyTo()` / `proxyUpgrade()`:  HTTP and websockets to another local server
  - `WebServer` -- all of the above on node's HTTP server
  - [untilInterrupted.ts](untilInterrupted.ts) -- run until `Ctrl-C`
  - `CommandRun`, in [runs/](runs/CommandRun.ts) -- a command asking Owen on a page (epic `epic-engine` P23):
    its rows in the content folder's `pages/runs/<id>/`, waiting for his Send, his answers read back
    - its files' shapes:  [runs.types.ts](runs/runs.types.ts), the contract with spell-epic's page and routes
    - it names no element and no child repo;  `show()` runs `epic` as a program, when there is one
    - steering (P25):  the command runs on while Owen answers
      - `answersAsTheyCome()`:  each answer as he gives it, on the same watcher and heartbeat as `wait()`
      - `take()`
      - passes as data:  `startPass()` / `updatePass()` (throttled) / `endPass()`
      - `effort`, read fresh before each pass
- It's a LEAF of the kit:
  - its packages:  node, `json5`, linkedom (`Linker`) and oxfmt (`formatHTML()`, loaded when it's first called);
    esbuild comes in as a hook
  - of the kit, only:
    - util's json5
    - util's `persist/`, for the site header's preferences:
      `spell/util/persist`, never the `spell/util` barrel, which would bundle lodash into every page
    - the toolchain's format settings
  - So anything node-side may import it:
    ui's tools and site, spaces' node server, cli, app, epics, goals, the VS Code extension.
- It's GENERIC (epic `repo-split` P4):  its code names nothing of spell-app's or spell-epic's folders.
  - What the page server serves beyond the checkout comes from its settings (below):
    the component sets, the engine routes, the page scripts, the route modules, the site header's tabs.
  - Each repo's part of what it serves is that repo's own settings (below), never code here.
  - It went to spell-server when the repos split (P8), and into the kit with it (P9).
    spell-app's `page-server` (the bundles' build, the highlight.js swap, the `/ui/` bridge) joined it in P16.
- NOT in the barrel, opt-in by path (WWOD §8 › "Barrels"):
  - `spell/server/page/...` -- the page server, the KIT's (one per kit:  the main one, each worktree's):
    - its CLI, `spell server`
      - started from the kit's root ONLY (epic `repo-split` P16):
        from any folder of the kit, `spell server <verb>` finds it (`pageServerRoot()`)
        - `--root` naming any other folder is an error naming the kit (`kitRootOf()`),
          and so is `PageServer.ensure()` given one
      - I62's `--root spell-app`, added by the kit's `spell server` from outside spell-app, is gone
    - page edits:  `PageEditor`, `/api/pages`
    - its info:  `/api/server`
    - THE PAGE SERVER'S SETTINGS (epic `repo-split` P16):  every repo's own PART, merged.
      - Each repo declares its part in its own `package.json`, `"pageServer"`, as it declares its `"spell": { "commands" }`:
        - spell-ui:  its component set and its site bundle
        - spell-brand:  its set, engine routes, watched folders, bundle
        - spell-epic:  its route modules, engine routes, watched folders, Epic UI, `localCopies`
        - spell-app:  the app's route module, App UI, `pageScripts`
      - The content repo's part:  `page-server.json5` at the content folder's root
        (`CONTENT_SETTINGS`;  the folder `contentFolderOf()` names):  the site's tabs, the writable folders, `gone`.
      - The kit's own part (its `package.json`'s `"pageServer"`):  none today.
      - `pageServerSettings(root)` merges them (`settingsParts()`):
        the kit's, the content repo's, then each child repo `repos.json5` lists that's INSTALLED
        (cloned in the kit, else in its `node_modules`), lowest first.
        - names no child repo:  the list is the kit's data, so the server runs with any set of repos installed
        - every path in a part is from ITS repo's folder;
          merged, from `root` (`spell-ui/docs` from the kit, `../spell-ui/docs` read for spell-app's folder)
        - lists end to end;  maps (`componentSets`, `engineRoutes`, `localCopies`) entry by entry, a later repo winning
        - outside a kit:  `root`'s own `package.json` alone (the tests' scratch checkouts)
      - `componentSets()` and `engineRoutes()` read their two lists out of them;  `repoSettings()` reads one part.
      - route modules, watched folders, writable folders, bundles, page scripts, component sets, engine routes,
        local copies, what's gone, the site header's tabs
      - Plain `node` loads `settings.ts` and `page.types.ts` by path (spell-epic's tools):
        node built-ins, `json5`, `spell/server/contentFolder` and type imports only,
        and `./settings.ts` with its extension.
    - LOCAL COPIES (`"localCopies"`):  a CDN URL pages load, and the URL this server serves the same file at.
      Every page it serves gets the local one (`withLocalCopies()`), so pages load offline.
      - Today spell-epic's:  highlight.js from cdnjs, its copy at `/_epic/assets/highlight.min.js` (epic `airplane` P1).
    - GONE (`"gone"`):  URL prefixes answered "not found" though the content folder holds them.
      Today the content repo's `/ui` (Spell UI's old docs, now `/components/ui/`).
    - PAGE SCRIPTS (`"pageScripts"`, epic `repo-split` P2):
      module scripts it adds to every HTML page it serves, before `</body>` (`PageServer.withPageScripts()`).
      - Each says its URL (`src`), the file it is (`file`, from the root) and the pages it skips (`skip`, URL prefixes).
        - Added only while its file exists:  a checkout that hasn't built it serves its pages without it, no 404.
        - `skip` is matched without a worktree's `/worktrees/<w>` prefix.
      - Today one:  the app's `spell-language.js` (`/element/`, `yarn build:element`), skipping the component sets.
        - It registers spell with the page's `UI.code`, so epic pages and guides colour `language="spell"`
          though spell-epic imports nothing of the app (Q23).
        - Not the component sets' pages:  Spell UI's docs show no spell, and App UI loads `<spell-code>` from its pack.
      - The server knows nothing of what they are:  the paths are the settings'.
    - It mounts every worktree's files at `/worktrees/<w>/`, once a route module says where they are:
      `serveWorktrees(dir)` (epic `epic-eject` P4).
      - The running epics' route module does, in the main checkout:
        [runningRoutes.ts](../../spell-epic/src/list/runningRoutes.ts) (spell-epic's), which also answers
        `/api/epics/running`.
      - Why:  the worktrees' folder is in the repo's epic settings (`.epic/config.json5`, read by epics' `EpicConfig`),
        and this package imports no other.
      - It then tells the folder:
        - to `/api/server` and pages:  `worktrees`
        - to pages, its URL path too:  `worktreesPath`
    - It serves the ENGINE ROUTES too (`engineRoutePath()`, epic `epic-eject` P7):
      URL prefixes served from a folder of the checkout,
      under every worktree's address too (`/worktrees/<w>/templates/...`).
      - The list:  the settings' `"engineRoutes"`, each a route and its folder (epic `repo-split` P4).
      - Today spell-epic's (`/_epic/assets/`, `/_epic/pack/` and `/templates/`):
        where spell-epic's one server per machine serves the engine too, and the pages load it from.
      - And spell-brand's:
        - `/_brand/assets/`:  its `assets/`, the logo, fonts and reference images (epic `repo-split` P10)
        - `/packages/brand/_assets/` and `/packages/brand/components/__pack/`:  its `_assets/` and its pack,
          at the paths the Brand tab's pages load them by (`../packages/brand/_assets/...`)
      - A kit without spell-epic answers "not found" there, and loads no epic route module.
      - Live reload reports a change in one at its route.
    - Route modules add to every page's `window.SPELL_SERVER`:  `addPageConfig()`.
      - e.g. epics' airplane mode ([airplaneRoutes.ts](../../spell-epic/src/tools/airplaneRoutes.ts)),
        whose switch, `AirplaneMode`, moved to epics in `epic-eject` P4.
    - Tests set a route module up by hand with `server.routeContext()`.
    - Every call is under `/api/`, one prefix per package that answers it.
      The old paths answer "not found" (no redirects, Q30 of `people-and-orgs`).
    - It may use deps (`parse5`).
    - It serves the repo at `/`.
      - And the SHARED CONTENT folder after it (`serveContent(dir)`, epic `epic-eject` P12):
        epics, guides, pages, sagas, brand ... with no link at the checkout's root.
        - The checkout first:  a path it has is its own.
        - Under every worktree's address too (`/worktrees/<w>/...`), after that worktree's own files:
          a catch-all mount (`Mount.skip`).
        - The running epics' route module calls it, in every checkout:
          the folder is the repo's `.epic/config.json5`'s `contentFolder`, which this package can't read.
          - `RouteContext.serveContent` is optional:
            a server that serves the content itself (spell-epic's `EpicServer`) has none.
        - Live reload watches it whole, reporting each change at `/<path>` and under every worktree's address.
        - A page from it is told its path there (`SPELL_SERVER.file`, `/epics/x/x.plan.html`).
        - `/api/files` and `/api/pages` write in it:  the `"writable"` names are its folders.
        - `/api/server` reports it (`contentFolder`).
        - `spell server url <file>` gives a file of it its path there (`contentPathOf()`).
      - What moved out of it, still in the content repo for older checkouts (`/ui/`):  `"gone"`, "not found".
    - And the COMPONENT SETS:  the docs of each set of elements, in Spell UI's page shape, in its package's `docs/`.
      - The list:  the settings' `"componentSets"`, by id, in the top bar's order
        (`componentSets()`, epic `repo-split` P4;  `ComponentSet`, in [page.types.ts](page/page.types.ts)).
        - Each:  its `name`, its pages' folder (`dir`) and the site bundle laid over it (`assets`).
        - Today four, one per repo's part:  Spell UI, the brand's, Epic UI, App UI (repo order).
      - Since epic `epic-workflow` P10 / P11;  one layout since `people-and-orgs` P18.
      - Each at `/components/<id>/`.  A new set is one more entry in the settings.
      - No dev server:  the pages are static, loading their site bundle.
      - ONE overlay (`componentSetPath()`):
        - `<prefix>/_assets/` is the set's site bundle (`assets`):  today Spell UI's, for every set
          - it loads the component packs a set's pages name (`SitePacks`):  the epics pack, for the comments, on all
          - the other sets had their own build (its `sets/`), until epic `epic-engine`
        - the rest is the set's own folder:  its pages, `__parts/`, `__data/`
      - The same at `/worktrees/<w>/components/<set>/`.
      - `<prefix>` redirects to `<prefix>/`:  the one redirect left.
      - Live reload watches each set's folder and its bundle, reporting their changes at the set's address.
      - Settings that name no sets:  no sets served.
    - The bundles it serves are NOT committed:  it builds the stale ones as it starts
      (`BundleBuild`, in [page/](page/BundleBuild.ts):  `spell bundle --stale`, as a child;  spell-app's until P16).
      - A request for a MISSING file of one waits while that runs (`BUNDLE_WAIT_MS`).
    - Spell projects' compiled output (`build/`, never committed) is built the same way,
      but by the app's route module, not here.
      - [ProjectBuild](../../spell-app/src/spaces/server/node/routes/ProjectBuild.ts), in spaces' routes,
        runs `spell compile --stale --all @spell/examples @spell/library` as the page server starts.
      - The page server knows nothing of spell projects.
  - `spell/server/site/...` -- browser code:
    - the site header every page shows
      - its TABS are data (`SiteTab`, epic `repo-split` I4):  it names no site's parts
        - served:  the settings' `"siteTabs"`, in the header's order, told every page as `SPELL_SERVER.siteTabs`
        - else (`file://`, settings naming none):  what `defineSite({ tabs })`'s caller gave (`SiteHeader.fallbackTabs`)
        - each:  its label and home;  `serverOnly`, `ownTab`;  what lights it (`litTab()`):
          component sets by id (`sets`), path patterns (`paths`), docs area folders (`areas`)
        - the content repo's part (`page-server.json5`);  spell-epic's docs bundle gives the docs' own areas
        - a tab whose home is a component set's address, none of whose `sets` is served, is left out:
          no App/UI tab without spell-app
    - Spell's favicon, `favicon.ts`:
      - GENERATED from the hat mark, by `yarn favicon` ([favicon.ts](../../scripts/favicon.ts), in `scripts/`)
      - `WebServer` serves it at the root, after the static files (a folder's own icons win):

        ```
        /favicon.svg  /favicon-32.png  /apple-touch-icon.png  /favicon.ico
        ```

      - `WebServer` imports the leaf, never the browser-only barrel.
    - An epic's state and the Epics page's cards left for `spell-epic/list/` (epic `people-and-orgs` P16).
      - `EpicState`, `EpicCards`
  - `spell/server/test/...` -- test helpers (`serveHandler`, `ask`)
- Commands:
  - the kit's, at its root (node tests):

    ```sh
    yarn kit:review    yarn kit:ts    yarn kit:lint    yarn kit:format    yarn kit:test
    ```

  - Its tests alone:  `yarn vp test run --project server`, at the kit's root.
  - The tests live in the kit's [tests/server/](../../tests/server/), at the same paths as the code.
    Their helpers are here, in `test/`.
  - `yarn favicon [--hat 0.74]`, at the kit's root, after the hat mark changes (headless Chromium renders the PNGs)

## Assembling pages

The steps between a page's content and its file on disk, for every tool that writes pages.

- Born in epic `epic-components` P7 (Owen, Q15 / I1) as `assembler`, its own package:
  the `epic` tool moved into the epics package, which then could not import the docs package,
  so what both need to write a page lived there.
  - A folder of the kit with its own namespace, `AS`, from P9;  merged into the server in P14 (Q43):
    one package bought nothing.
- `Linker` -- a page's links:
  - `<code>path</code>` references become links
  - every link gets a named target (one per destination)
  - `check()` verifies them
  - It was the docs tools' `doc-links.js`, which is now its command line.
- [`formatHTML()`](format.ts):  formats a page's text in memory, as `vp fmt` would format its file (oxfmt).
  It was the docs tools' `plan-parts.js`'s.
- `Bundle` -- the bundles only the page server serves, BUILT on demand instead of committed.
  - WHICH bundles exist:  the output folders the page server's settings list (`Bundle.specs()`),
    from spell-ui's and spell-brand's parts.
    The page server reads the same list:

    ```json
    "pageServer": { "bundles": [...] }
    ```

  - HOW each is built:  `BUNDLES`, in [server.types.ts](server.types.ts):
    - `ui-site`:  Spell UI's docs site
    - `brand`:  the brand pages
  - `check()`:  stale when never built, its entry missing or rewritten, or its sources' hash changed.
  - `build()`:  runs its package's script, then records the hash in its output folder (`.bundle.json`).
  - Its command line:  `spell bundle [<name>...] [--stale]` / `check`.
  - The page server runs `build --stale` when it starts:  `BundleBuild`, in `page/`.
  - Why (Owen, 2026-10-07):  their chunk names carry content hashes,
    so every Spell UI change deleted and re-added most of their files, in every diff and merge.
  - A new bundle:
    - a `BUNDLES` entry
    - its output folder in its repo's part of the settings (above)
    - and in the `.gitignore` of the repo that builds it (`/site/_assets/`, in spell-ui's)
- JSON5 written with its comments kept moved to util, `spell/util/node/json5` (epic `repo-split` P1):
  its users (ui's tools, app, brand, spaces, spell-epic) need util, not the assembler.
  - `DataFile` writes through it.
- Grow it by capability:  one class per file, its types in [server.types.ts](server.types.ts).
- Node only:  node's file system and child processes, `git`, oxfmt and linkedom.
  - NEVER make it import spell-epic's code:  spell-epic imports this.
  - `DataFile` (`SRV.DataFile`, or `spell/server/DataFile` alone):  the tooling's JSON5 data files,
    here since epic `epic-eject` I5, so the CLI reads the commands page's data without the engine.
  - `contentFolderOf()` (`SRV.contentFolderOf()`, or `spell/server/contentFolder` alone, epic `epic-eject` P12):
    the repo's shared content folder, `contentFolder` in the main checkout's `.epic/config.json5`,
    so a tool finds the content with no link at the checkout's root.
    - The `Linker` lays it under the checkout (`content`), and the CLI reads the commands page's data and the WWOD
      check's shared citers from it.
    - By its own name, like `DataFile`, a command loads no linkedom when it needs only this.
- It knows the checkout's LAYOUT as folder names, never as imports:  `Linker` takes the checkout's root.
  - The folder names:
    - `packages/*/src`, and `packages/*/components` (a component set's elements):
      the old monorepo's spelling, in every page written before the split
      - Under the kit, an old `packages/<name>/` is found through `node_modules`:
        spell-ui, spell-brand, spell-epic, and the folders of spell, spell-parser and spell-app.
      - A folder now in its repo's one `src/` drops the old `src/` (epic `repo-split` P11, P14):
        `packages/server/src/x.ts` is the kit's `src/server/x.ts`.
    - `tests/`, where every package's tests live
    - the shared areas:
      - `pages/`
      - `guides/`
      - `epics/`
      - `templates/`
      - in the shared content folder (`contentFolderOf()`), laid under the checkout:
        its folders the checkout has none of are found there (`Linker`'s `content`)
    - the epic engine's code, docs tools included:  spell-epic's `src/`, through the checkout's `spell-epic` link
- The docs tools are JavaScript:  [doc-links.js](../../spell-epic/src/tools/doc-links.js) imports the kit's server.
  - So it runs under `tsx`:  `docLinksRun()`, in the docs tools' [pages.js](../../spell-epic/src/tools/pages.js).

## Express, on purpose

- `Request` / `Reply` / `Router` keep Express's names and behaviour, so handlers move over unchanged:
  - `params`, `query`, `body` (default `{}`), `originalUrl`, `baseUrl`
  - `status().send()`
  - `send(string)` is `text/html`
  - `sendFile` skips dot files
- ONE deliberate difference:  `:name*` holds the WHOLE rest of the path.
  Express 4 put only the first segment there.

## Imports

- As WWOD §4.
- Tests use `spell/server/test/serve` (`serveHandler`, `ask`):  real HTTP, through node's HTTP client.
  Never `fetch`, which resolves `..` before sending.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `SRV` ~== `spell/server`
- Every file by its package name and path under `src/` (epic `repo-split` P14), the kit's own included:
  `spell/server`, `/page`, `/site`, `/site/site.types`, `/test/serve`.
  - Five that plain `node` loads have entries of their own in the kit's `exports`, each pointing at its `.ts`:
    `/checkout`, `/page/settings`, `/page/prune`, `/DataFile`, `/contentFolder`
    (node's modules, `json5` and type imports only).
