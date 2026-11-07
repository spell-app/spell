# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/server/` (`spell/server`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every folder shares.
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
  - `FileLock` -- `<file>.lock`, so tools writing the same file take turns;
    `runOnce()` skips the work when another run holds it (`"held"`), rather than waiting
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
      - ONLY inside the writable folders, the epic repo ones;  anything else:  403
        - the list:  `"writable"`, in the page server's settings (below)
        - today:
          `epics`, `guides`, `pages`, `brand`
          (not `templates` since epic `epic-eject` T11:  they're spell-epic's, at the engine route `/templates/`)
      - The page editor's writes are held to the same list (`FileOperations.writableFile()`).
      - Those folders are the epic folder's, once the page server serves it (`FileOperations.content`,
        `serveContent()`, below);  else the checkout's.
        - In a checkout that still links them in:  paths are resolved (`fileInside()`), never followed,
          so they stay "inside".
  - `LiveReload` + [liveClient.ts](liveClient.ts) -- live reload over a websocket, and the page-side client.
    - The client:  `/api/server/live.js` (`editPage()`).
    - Its websocket:  `/api/server/live`.
    - [webSocket.ts](webSocket.ts) -- the server's half of one (node built-ins):  accept, send, ping;  and read what a page sends
      (`onText`, for a `Referee`), which live reload doesn't ask for, so its pages stay as they were.
    - NEVER an `EventSource`, or any other request held open:
      each takes one of Chrome's 6 connections per host, and every VS Code window shares them.
    - A PAGE's change comes WITH the page, as a navigation gets it (`StaticHandler.render()`), and its `ETag`
      (epic `epic-engine` P40):  `{ event: "change", data: { path, html, etag } }`, so the page needn't fetch it.
      - the live client hands it on as `spell-server:reloading` (`PageChange`), fetching it only when it came alone
        (a page over `LiveReload.PAGE_LIMIT`, 4 MB, or one at no address the server serves, such as a worktree's
        file under the main server's `../` path)
      - the version the page's OWN save wrote (`saveFile()` / `editPage()` with `shown`, by the `ETag` it got
        back) comes as `own`:  a runtime takes it as its baseline, never patches it in again, and it never reloads
    - HOT RELOAD (epic `epic-workflow` P24):  what a changed file means to a page is `liveAction()`:
      - its own file:  patched in place (the kit's `PagePatch`, run by the docs runtime and Spell UI's site), else
        reloaded
        - its own file is also the file at its ADDRESS:  a component set's page is reported where it's served
          (`/components/ui/ui-button.html`), not as its file in the checkout (P40)
      - a stylesheet it uses:  swapped in place, no reload
        - in VS Code's side-bar views too (spell-epic's Epic Docs and Review):  the live client runs inside their frame,
          with its own socket (the frame is cross-origin to the view)
        - nothing caches a stale one:  every answer is `Cache-Control: no-store`, `_assets/` included,
          so a reload always fetches the stylesheet as it is now
      - a script it loaded, or one beside it:  reloaded, keeping the scroll
        - which:  its `<script src>` tags, and `performance`'s resource entries
          (lazy chunks, `epics.pack.js`, an experiment's `*.bundle.js`)
        - first offered to the page (`spell-server:scripts-reloading`, cancelable, `ScriptsChange`):  a page that runs every
          changed script's new code itself takes it, and doesn't reload (epic `epic-engine` I116:  a rebuilt
          component pack swapped in place by Spell UI's `PackHotSwap`)
          - the swap is ONE short cross-fade (`PagePatch.crossFade()`), held until the re-rendered elements have drawn
          - new observed attributes, and a new version of a family's DOM class, swap in too (`HotDefinitions`, I171)
          - a swap that fails after all asks `SPELL_SERVER.reload()`:  a quiet reload like any other (below)
      - anything else:  `spell-server:changed`, and the page decides
    - A route module may send its own events to every page (`LiveReload.send()`):  the app's sends `pref-saved`
      when a person's pref is saved (their theme, epic `debut` P21), which the live client hands on as
      `spell-server:pref-saved` on `window` (the kit's `PREF_SAVED_EVENT` / `PREF_SAVED_PAGE_EVENT`).
    - Each socket opens with `hello` and the server's `run` (`LiveReload.run`, also `SPELL_SERVER.run`):
      a page from an earlier run (the server restarted) reloads, for the new `/api/server/live.js` and token.
    - Reloads go through `reloadGate()`:  one, 500ms after the last change.
      - QUIET (epic `epic-engine` I172;  Owen, 2026-10-29, of the pill before it:  "why do we have this?"):
        a page in view reloads by itself, held behind its old frame and cross-faded in (below), its scroll and folds
        kept;  in VS Code's views too
        - except while the reader TYPES in a field (`typing()`:  the focus in an input, a textarea or rich text,
          its text changed since it got the focus):  it waits until the field loses the focus, or the page goes out of
          sight;  a field merely clicked into doesn't hold it
        - a comment draft is kept in the browser as it's typed (the docs runtime), so a reload loses none of it
        - a page's own `SPELL_SERVER.reload()` too;  `SPELL_SERVER.reloadNow()` is the one that doesn't wait
        - it replaced I116's "Updated:  reload" pill, which held a page in view on its old code until it went out of
          sight
      - A file rewritten with the same contents (a rebuilt bundle, a `touch`) isn't reported at all (`LiveReload`).
      - Drawn with no flash (epic `epic-engine` I164;  Owen, 2026-10-29:  "use a page transition to redraw without visual
        flash"):  the reload is a replace navigation to the page itself, which Chromium runs a cross-document view
        transition for (never for `location.reload()`), and the new page waits behind the old one until it's ready
        (`holdReveal()`, inline in every served page's `<head>`), then cross-fades in, 150ms
        - ready:  the page says so (`SPELL_SERVER.reveal()`:  the docs runtime once landed and themed), after what it
          asked to wait for (`revealAfter()`:  Spell UI's site, its layout), and its `<ui-root>`s are ready;
          at most 2.5s;  no fade under `prefers-reduced-motion`
        - every other navigation (a link, back) skips the transition:  as before
        - measured on an epic page:  a white frame, ~150ms of bare background, the page at its top, then the place;
          now none of those frames
    - A worktree's pages on the main server (`/worktrees/<w>/`):
      epics' `RunningEpics` reports that worktree's docs assets and packs too.
      - It reports them as `/.claude/worktrees/<w>/...`, the path the live client reads them under (`servedPath()`).
      - The path starts with the worktrees' folder, from the root, which the server tells every page:
        `SPELL_SERVER.worktreesPath`, by `urlPathOf()`.
        So worktrees beside the repo work too (epic `epic-eject` P7).
  - `Guard` -- `Host` check, per-run token, same-origin writes
    - more hosts by a test (`allowHosts()`):  the app's cloud lets in its AT Protocol handles' hosts,
      `ana.rs.spell.space`, for their look-up alone (epic `atmosphere` P16);  hosts only, never origins
    - a device signed in (`request.person`, from `SignInCheck`) needs no token (epic `atmosphere` P3);
      `tokenCheck` wants the token, whoever's signed in
  - `PidFile` -- a background server's `.spell-server.json`, at its root:  status, ensure, stop.
    - `ensure` restarts a server that started before its code last changed.
      So after a merge, the next opener gets the new routes.
      - its code:  the `sources` folders, by `newestChange()`
      - Nothing restarts it by itself:  the next `spell server start` (an opener, `/airplane`),
        or the side bar's "Restart Page Server".  Its open pages then reload (`hello`).
    - `stop` waits for the old PROCESS to end (`SIGTERM`, then `SIGKILL` after 10s), not just for it to stop answering.
      - Why:  it stops answering before it lets go of its port.
        `ensure` started the new one while the old one held the port, so the new one took another port,
        and pages on the old one found the server down (epic `airplane`, 2026-10-10).
  - `Heartbeat` -- how a process WAITING on someone says it's there, one rule for whoever asks (epic `coherence` P28):
    - 90s without a beat, or its process gone, and it's gone (`isLive()`)
    - `hold(file, record)`:  `{ ...record, pid, seen }` written every 30s, the file removed however the process ends;
      `keep(beat, end)`:  a beat kept inside a bigger file (the review inbox's `listening`)
    - who beats:  a command run's wait, `epic ask wait`, `epic inbox wait`, `spell app changes wait`
    - beside it, the ONE process check:  `isProcessAlive(pid)`, `endProcess(pid, wait)` (`PidFile` re-exports them)
    - plain `node` loads it by its own name, `spell/server/Heartbeat`
  - `FolderWatch` -- a folder watched, the ONE way every tool watches files (epic `coherence` P28):
    `new FolderWatch(dir, { ignore, only, quiet }, onChange)`, `close()`
    - skips dot files, `node_modules`, lock files and editors' temp files;  `quiet` reports a burst once, after it
    - who:  live reload's watching half, the bundles' rebuild, the running epics, a command run's answers, the app's
      disk storage, `spell app watch`
  - [mainServer.ts](mainServer.ts) -- `mainServerUrl()`:  a worktree's file on the MAIN checkout's page server.
    - A component set's page at its ADDRESS, `/worktrees/<w>/components/<set>/...` (`componentSetAddressOf()`, in
      `page/settings.ts`;  epic `epic-engine` I136):  by its folder's path it loads none of its `_assets/`.
    - It asks that server for `/api/epics/running` (`RUNNING_EPICS_API`).
    - A file of the epic folder, by its own path (`.../spell.epics/epics/...`, as spell-epic hands them out):
      its path there, `/epics/...` (epic `epic-eject` I20).
      - The epic folder:  the one the server says it serves, `contentFolder` in its `/api/server`.
      - Which main checkout, when the caller names none (the doc preview):
        the one beside the epic repo whose pid file names it (`contentServerOf()`).
  - `FileStorage` -- a browser's `localStorage`, kept in ONE JSON file:  where the kit's `SaveQueue` keeps a server's
    unsent work (epic `atmosphere` P14, Q19 A:  ONE retry queue for the server's writes, mail and alerts)
    - each change written whole, through a temporary file and a rename;  synchronous, as `localStorage` is
  - `DiskCache` -- text kept on disk by key, for ONE version of whatever made it at a time (epic `language` P27)
    - `<folder>/<version>/<key>`:  a new version starts empty;  only the newest `keep` versions' folders stay
    - only the current version takes writes;  over HTTP, `router()`:  `GET /version`, `GET` / `PUT /<version>/<key>`
    - CAPPED (`limit`, 200 MB by default;  epic `language` Q41):  past it, a write drops the entries used least
      recently first, every version's together;  a read marks its entry used (its file's time)
      - the page server's setting `cacheLimit` sets it (below), `sizeInBytes()` reading `"200MB"`, `"1GB"` ...
    - `codeVersion(paths)`:  a version for some code, a hash of its files' text, read again only when one changes
    - `DiskCache.home`:  Spell's caches on this machine, `~/.spell/cache`
    - Today one:  the app's compile cache, `/api/compiles` (spaces' `api.ts`):  it knows nothing of spell projects.
  - `Git` -- running git, for every tool in every repo (epic `coherence` P7, from spell-epic):
    `run()` (never throws), `out()`, `lines()`, `mustRun()` (throws a `GitError`), `mainRoot()`
  - `RealPath` -- comparing paths by where they really are, links followed (`of()`, `same()`, `isIn()`, `from()`;
    from spell-epic, epic `coherence` P7)
    - and `pathInside(folder, path)` beside it, the ONE inside check (epic `coherence` P29):  the path from the
      folder, `/`-separated, or `undefined`;  links NOT followed;  a `..x` folder is inside, a sibling `<folder>-x`
      isn't.  `isInside()` (`safePath.ts`) is its yes / no.
  - `Processes` -- what's running, asked the same way on macOS, Linux and Windows (epic `epic-friend` P15):
    `table()` (pid => parent and command), `parents()`, `folderOf()`, `portsOf()`, `openFiles()`, and `run()` /
    `call()`, which start a bare command name (`code`, `npx`) through the shell on Windows;  `ps` and `lsof`, Linux's
    `/proc`, PowerShell's `Win32_Process`;  never throws, "can't tell" an empty answer;  its parsers pure, for tests
  - `Links` -- a link made the same way everywhere:  `folder()` (a junction on Windows), `file()` (a `LinkError`
    naming Developer Mode on Windows without it)
  - [checkout.ts](checkout.ts) -- `checkoutOf()`:  the git checkout a path is in, and its MAIN checkout.
    - Read from the disk as git finds them (a worktree's `.git` file, git's common dir), with no `git` run.
    - Plain `node` loads it by path (epics' `EpicConfig`, for the hooks), so node built-ins only.
    - [Test helpers](test/checkouts.ts) that fake one:  `fakeMainCheckout()`, `fakeWorktree()`.
  - [proxy.ts](proxy.ts) -- `proxyTo()` / `proxyUpgrade()`:  HTTP and websockets to another local server
  - `WebServer` -- all of the above on node's HTTP server
  - [serveRoutes.ts](serveRoutes.ts) -- `serveRoutes()`, `folderRoute()`:  a small loopback server for a command's
    page (spell-app's `spell run`), each path answered with text, a file, or 404 (epic `coherence` P25)
  - [untilInterrupted.ts](untilInterrupted.ts) -- run until `Ctrl-C`
  - `CommandRun`, in [runs/](runs/CommandRun.ts) -- a command asking Owen on a page (epic `epic-engine` P23):
    its rows in the epic folder's `pages/runs/<id>/`, waiting for his Send, his answers read back
    - its files' shapes:  [runs.types.ts](runs/runs.types.ts), the contract with spell-epic's page and routes
    - it names no element and no big folder;  `show()` runs `epic` as a program, when there is one
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
    - util's generic small helpers, by file for the same reason:  `spell/util/string` (slugs, escaping),
      `spell/util/time` (a run's stamp)
    - the toolchain's format settings
  - So anything node-side may import it:
    ui's tools and site, spaces' node server, cli, app, epics, goals, the VS Code extension.
- It's GENERIC (epic `repo-split` P4):  its code names nothing inside `app/` or `epic/`.
  - What the page server serves beyond the checkout comes from its settings (below):
    the component sets, the engine routes, the page scripts, the route modules, the site header's tabs.
  - Each folder's part of what it serves is that folder's own settings (below), never code here.
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
    - THE PAGE SERVER'S SETTINGS (epic `repo-split` P16):  every folder's own PART, merged.
      - Each big folder declares its part in its folder manifest, `"pageServer"`,
        as it declares its `"spell": { "commands" }`:
        - `ui/`:  its component set and its site bundle
        - `epic/`:  its route modules, engine routes, watched folders, Epic UI, `localCopies`
        - `app/`:  the app's route module, App UI, `pageScripts`
      - A project beside the kit declares its part the same way, in its own `package.json`:
        spell-brand, its set, engine routes, watched folders, bundle.
      - The epic repo's part:  `page-server.json5` at the epic folder's root
        (`CONTENT_SETTINGS`;  the folder `contentFolderOf()` names):  the site's tabs, the writable folders, `gone`.
      - The kit's own part (its `package.json`'s `"pageServer"`):  two route modules:  the recipe box demo's servers' start and stop
        (`spell/server/test/recipeServersRoutes`, epic `data` I21);  it registers nothing where the demo's script isn't there.
        And `spell/server/places/airtableRoutes` (epic `data` P19), which registers nothing without a base and key in its environment.
      - `pageServerSettings(root)` merges them (`settingsParts()`):
        the kit's, the epic repo's, each big folder's (the kit's `workspaces`, lowest first:  `kitFolders()`),
        each peer `repos.json5` names that's there (`peerRepos()`:  spell-brand, beside the MAIN checkout;  the ONE
        reader of the kit's peers, each one's name and folder, epic `coherence` P29),
        then each project the checkout's git-ignored `page-server.local.json5` names (`localProjects()`).
        - names no folder:  the lists are the kit's data
        - every path in a part is from ITS folder;
          merged, from `root` (`docs` in ui's part is `ui/docs` from the kit)
        - lists end to end;  maps (`componentSets`, `engineRoutes`, `localCopies`) entry by entry, a later part winning
        - outside a kit:  `root`'s own `package.json` alone (the tests' scratch checkouts)
      - `componentSets()` and `engineRoutes()` read their two lists out of them;  `repoSettings()` reads one part.
      - route modules, watched folders, writable folders, bundles, page scripts, component sets, engine routes,
        local copies, what's gone, the site header's tabs, the caches' cap
    - THE CACHES' CAP (`"cacheLimit"`, epic `language` Q41):  the most the server's caches on disk may take, every
      version's entries together, e.g. `"200MB"`, `"1GB"`, `"512KB"` (`SRV.sizeInBytes()`);  200 MB by default
      - the kit's part says `"200MB"`;  a later part's wins, so the epic repo's `page-server.json5` may change it
      - past it, a write drops the entries used least recently first (`SRV.DiskCache`)
      - today one cache:  the app's compile cache, `~/.spell/cache/compiles` (its route module sets the cap as it starts)
      - Plain `node` loads `settings.ts` and `page.types.ts` by path (spell-epic's tools):
        node built-ins, `json5`, `spell/server/contentFolder`, `spell/server/kitFolders`, `spell/util/node/findUp`
        and type imports only,
        and `./settings.ts` with its extension.
    - LOCAL COPIES (`"localCopies"`):  a CDN URL pages load, and the URL this server serves the same file at.
      Every page it serves gets the local one (`withLocalCopies()`), so pages load offline.
      - Today spell-epic's:  highlight.js from cdnjs, its copy at `/_epic/assets/highlight.min.js` (epic `airplane` P1).
    - GONE (`"gone"`):  URL prefixes answered "not found" though the epic folder holds them.
      Today the epic repo's `/ui` (Spell UI's old docs, now `/components/ui/`).
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
        [runningRoutes.ts](../../epic/src/list/runningRoutes.ts) (spell-epic's), which also answers
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
      - e.g. epics' airplane mode ([airplaneRoutes.ts](../../epic/src/tools/airplaneRoutes.ts)),
        whose switch, `AirplaneMode`, moved to epics in `epic-eject` P4;
        and who is at the keyboard, `person` ([personRoutes.ts](../../epic/src/tools/personRoutes.ts), epic
        `epic-friend` P1);  and that the person's prefs are answered at `/api/prefs`, `prefs` (the app's
        [appRoutes.ts](../../app/src/spaces/server/node/routes/appRoutes.ts)):  a server without it never gets asked
        (Spell UI's `ThemePreference`, epic `epic-engine` I186)
    - Tests set a route module up by hand with `server.routeContext()`.
    - Every call is under `/api/`, one prefix per package that answers it.
      The old paths answer "not found" (no redirects, Q30 of `people-and-orgs`).
    - It may use deps (`parse5`).
    - It serves the repo at `/`.
      - And the Epic folder after it (`serveContent(dir)`, epic `epic-eject` P12):
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
      - What moved out of it, still in the epic repo for older checkouts (`/ui/`):  `"gone"`, "not found".
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
        - with that worktree's own site bundle (epic `epic-engine` r35):
          - a page there that loads a set's address by its root path (`/components/ui/_assets/site.js`)
            has it laid under the worktree's address as it's served (`withWorktreeLoads()`)
          - a relative load (`_assets/site.js`, every page's) resolves there already
        - NOT the engine's:  `/_epic/assets/` and the epics pack (`/_epic/pack/`) are ONE copy, this checkout's,
          under every address;  a worktree changing the engine sees it on its own server
      - `<prefix>` redirects to `<prefix>/`:  the one redirect left.
      - Live reload watches each set's folder and its bundle, reporting their changes at the set's address.
      - Settings that name no sets:  no sets served.
    - The bundles it serves are NOT committed:  it builds the stale ones as it starts
      (`BundleBuild`, in [page/](page/BundleBuild.ts):  `spell bundle --stale`, as a child;  spell-app's until P16).
      - and again whenever their sources change while it runs (`BundleBuild.watch()`), once quiet 3s:  a merge into
        the checkout never leaves pages on an old bundle (epic `epic-engine`, 2026-10-25)
      - A request for a MISSING file of one waits while that runs (`BUNDLE_WAIT_MS`).
      - A worktree's too, seen through this server (`worktreeBuildFor()`, r35):  built by the worktree's own `spell`
        at the first request at its address, a page of any kind (an epic page too, since epic `epic-engine` P54), then
        watched;  while it builds, requests at its sets' addresses wait, pages too
      - And the COMMITTED generated files a page needs (epic `epic-engine` P54;  Owen, r45:  "can we make
        `<ui-root>` signal the page server ... so it can auto-regenerate?"):  Spell UI's root catalog (`ui-root`),
        the epics pack (`epics-pack`), spell-epic's docs bundle (`epic-docs`), `BUNDLES` entries marked `committed`,
        first in their folders' `"bundles"`, so what's built from them builds after
        - rebuilt only in a WORKTREE (Q61):  the main checkout writes nothing, and logs what to run
          (`ui-root is stale (its check failed):  run yarn gen:root in ui/`)
        - the watch regenerates the catalog a few seconds after a component gains an attribute, and live reload
          brings the pages back
        - the backstop:  a page that still finds its catalog stale tells the server once (`SPELL_SERVER.reportStale()`,
          from Spell UI's `<ui-root>` on a `StaleCatalogError`), `POST /api/server/stale` with the write token;  the
          page's checkout's bundles are checked again, one run however many pages ask (`BundleBuild.checkAgain()`)
    - Spell projects' compiled output (`build/`, never committed) is built the same way,
      but by the app's route module, not here.
      - [ProjectBuild](../../app/src/spaces/server/node/routes/ProjectBuild.ts), in spaces' routes,
        runs `spell compile --stale --all @spell/examples @spell/library` as the page server starts.
      - The page server knows nothing of spell projects.
  - `spell/server/site/...` -- browser code:
    - the PAGE PATCHER, `PagePatch` (epic `epic-engine` P40):  the ONE way an edited page shows in place, for every
      page runtime (spell-epic's docs runtime, Spell UI's site), each with its rules over one shared set
      - a planner over ANY keyed tree (`PatchTree`:  the DOM is one;  a Spell notebook's chunks were another, until
        epic `notebook` P3 had the program draw the page), its steps a
        list (`PatchStep`:  text, attribute, replace, remove, insert, move), their nodes named by place
        (`#p-x/section[2]/p[3]/text()[1]`);  a runner that applies them to the live DOM
      - `redraw()`:  a page's patch as ONE short cross-fade (`crossFade()`, a same-document view transition) when it
        changes what's on screen;  straight in when it's off screen, motion is reduced or a field has the focus
        (epic `epic-engine` I164);  a part's body swapped in goes through `crossFade()` too
      - plain DOM, no imports:  any page's bundle takes it;  its class docstring has the rules
    - the site header every page shows
      - its TABS are data (`SiteTab`, epic `repo-split` I4):  it names no site's parts
        - the settings' `"siteTabs"`, in the header's order, told every page as `SPELL_SERVER.siteTabs`;  none:  no tabs
          (the bundles' fallback tabs, for a page opened from disk, went in epic `epic-engine` P46, with its `root`)
        - each:  its label and home;  `ownTab`;  what lights it (`litTab()`):
          component sets by id (`sets`), path patterns (`paths`), docs area folders (`areas`)
        - the epic repo's part (`page-server.json5`)
        - a tab whose home is a component set's address, none of whose `sets` is served, is left out:
          no App/UI tab without spell-app
      - its `theme` SLOT:  a page's own theme control, at the bar's end, in place of its light / dark button
        (epic `debut` P17, Q30)
        - it names no control:  spell-epic's docs bundle puts Spell UI's `<ui-theme-menu>` there
        - without one, the button flips the scheme, light / dark (`flipScheme()`)
    - Spell's favicon, `favicon.ts`:
      - GENERATED from the hat mark, by `yarn favicon` ([favicon.ts](../../scripts/favicon.ts), in `scripts/`)
      - `WebServer` serves it at the root, after the static files (a folder's own icons win):

        ```
        /favicon.svg  /favicon-32.png  /apple-touch-icon.png  /favicon.ico
        ```

      - `WebServer` imports the leaf, never the browser-only barrel.
    - An epic's state and the Epics page's cards left for `spell/epic/list/` (epic `people-and-orgs` P16).
      - `EpicState`, `EpicCards`
  - `spell/server/places` -- the places that need node (epic `data` P5), for what a browser can't do:
    - `ChunkFiles`:  a folder of files as a place's chunks:  the file half of `ChunkedPlace`, the app's `SpaceStorage` shape
      - versions through `FileOperations`' own conflict check, changes through `LiveReload`'s watching (no raw watcher)
      - its statics (`writeListAndBodies()` ...) are for a tool writing files straight off, in its own lock:  the epic page
        tool's every write, since epic `data` P6 (`PlanDocFiles.writeDoc()`)
    - `FolderPlace`:  a folder as a place, a list file and one file per thing, on any `FolderStorage` (`ChunkFiles`, or the
      app's `DiskStorage` as it stands)
      - the files are the truth:  each read checks each file's version against the list file, and reads only what differs
      - a file that isn't JSON yet answers as it last read
      - a thing's version is made from its content (`contentVersion()`, epic `atmosphere` P1):
        a save that changes nothing moves nothing;  each file's own stamp is kept beside it in the list (`stamps`)
      - `whoWrites: "only the owner"`:  each thing is its maker's (`owner`, from `PlaceContext.identity`)
        - someone else's is refused, `"owner"`, unless `mayChangeAnyRow()` says yes
        - for a program's own project data folder
      - `whoWrites: "its members"` (epic `atmosphere` P4):
        every thing is the space's, written as its own id (`owner` is `@family`)
        - a member whose role writes changes any of it;  anyone else is refused, `"role"` ("your role can't write")
        - who's a member is handed in (`space.memberOf()`):  the app's `SpaceMembers`
        - and, handed one, a write check by KIND of thing (`space.changeOrDie()`, epic `atmosphere` P23):  asked of
          each change a member makes, its kind (`thingKindOf()`:  a post, a row, a file, an app), made, changed or
          removed, and who wrote it last;  it knows nothing of roles
        - and, handed one, a SIGN-UP check (`space.signUpOrDie()`, epic `atmosphere` P27):  asked first, of every write;
          a sign-up makes things, and changes only its own, from someone who doesn't write the space (the app's
          `SpaceSheets`)
        - ONE WRITE AT A TIME (P27):  each write checked and made before the next is checked, so a check that counts (a
          sheet's last place) holds for two at once
        - and read by its members only (P5, T15):  anyone else's read is refused, `"role"`
        - unless its settings say otherwise (`space.settings()`, P7, Q13):
          - `publicRead`:  anyone reads
          - `publicWrite`:  anyone signed in adds things, and changes only the ones whose `by` is them;
            anyone else's is refused, `"owner"`
      - LIMITS (epic `atmosphere` P7, `limits`, `bytesInUse()`):
        a thing's file and the whole folder, each at most so many bytes
        - a save past either is refused, `"over the ceiling"` (413), saying how big, and the page keeps it
      - either way, who wrote each thing last is `by`;  its own `operations` answer `call()` (the app's member list)
      - told of each write once it's on the disk (`onWritten`, epic `atmosphere` P14):  the app copies a space's writes
        into its real AT Protocol Space this way
      - for what keeps more than things in the folder (epic `atmosphere` P15):  `roomForOrDie()`, the space's limit asked
        of more bytes;  `everyThingKept()`, every thing taken down or not, for its own keeping and never a reader
      - TAKEN DOWN (epic `atmosphere` P6):  what its host says is down
        - `takenDown`, a `TakenDown`, asked afresh for each request, for who's asking
        - the whole folder down:  it refuses every read, write and operation
        - a thing down:  left out of every read, and a change to it refused
        - a watcher hears it removed, and back when it's restored
      - `takenDown.ts`:  the shape, and the ONE refusal, `takenDownError()`
        - its `whyNot` is `"taken down"`, and it names the abuse contact
        - `PlaceServer` answers it 451 (`TAKEN_DOWN_STATUS`)
    - `FolderFiles`:  a space's FILES on its folder (epic `atmosphere` P15), the kit's `SpaceFiles` (a real Space's is
      `AtProtoSpaceFiles`, in `spell/places`)
      - each file its bytes and ONE record naming it, as a Space keeps one:  the record a thing in `__files`
        (`FILES_COLLECTION`), its id the name's key (`fileKeyFor()`);  the bytes by their hash (`contentHash()`), in a
        `FileBytes` the host hands in (the app's:  the space's `__blobs/`)
      - every check is the folder's:  members, roles, public settings, takedowns, the space's limit (its bytes counted
        through `roomForOrDie()`, not a second count)
      - several at once:  bytes first, then ONE `apply()` of their records;  refused, the new bytes go again
      - bytes go once no record points to them, a taken-down one's included (`everyThingKept()`)
      - nobody sees a hash:  a reader gets a name, a type and a size
    - `FilePlace`:  one JSON5 file as a place, its comments kept
    - `PlaceServer`:  any place over HTTP, on the `Router`, behind `Guard`, reads too;  `RemotePlace` is its browser half
      - holds keys (`PlaceKeys`), and scrubs them from every answer
      - or opens a place by its name, as it's first asked for (`open`, epic `atmosphere` P1):
        - a name may then be an address, `/`s and all
        - who's asking (`identityOf`) reaches the place as `PlaceContext.identity`
        - the app's `SpaceFolders` serves every project data folder this way, at `/api/places/spaces/<address>/`
      - who's asking, by default:  whoever's signed in, `request.person` (`SignInCheck`, epic `atmosphere` P3);
        a device signed in needs no run token
      - a place read direct (epic `atmosphere` P5):  `POST <name>/credential` hands who's asking a credential to read it,
        as a cookie, and answers where (`credentialFor`, `{ readsAt }`)
    - `DirectReads`:  a space's files read straight, apart from the server that writes them (epic `atmosphere` P5, Q6 C)
      - a plain `GET` of its list file and each thing's, as `JsonChunks` lays them out, so `WebChunks` reads them
      - with a credential for the WHOLE space, in a cookie only that space's read address gets
        (`HttpOnly`, `SameSite=Strict`)
        - none good:  401
        - someone who's no reader now (`mayRead`, the member list):  403
      - a space ANYONE reads (`publicRead`, epic `atmosphere` P7):  no credential needed (`mayRead(space, undefined)`)
      - never a `__` name, a dot file or a folder of its own
      - opens no place, writes nothing:  reads work while nothing's written
        - its host may bring the files into step first (`onRead`):  the app's watches a space while pages read it (T17)
      - the app's `SpaceFolders` serves every space's own folder this way, at `/api/reads/spaces/<address>/`
      - THROUGH TO A REAL HOST (epic `atmosphere` P14, `hostOf`):  a space kept in a real AT Protocol Space is read
        there, at `<prefix>/<address>/__host/xrpc/<method>`
        - a pass-through that keeps nothing:  each reader's own Space credential goes on to the host, which decides
        - only a Space's reading calls, only to the host that space names:  never an open proxy
      - taken down (epic `atmosphere` P6, `takenDown`):
        - the whole space, or the reader's own account:  451
        - a thing:  left out of its list file as it's served, and its own file answered 451
        - the disk stays as it is
    - `Referee`:  ONE per shared space, on any place as its store, over the kit's websocket (epic `data` P8);  `LiveRoomPlace` is its browser half
      - each step gets the next number, and goes to everyone;  a `changeId` it has seen isn't made again
      - the last to arrive wins a field;  what it replaced unseen goes with it, so the loser is told
      - each batch is written to the store before it's numbered, so a store's "no" is a "no"
      - behind `Guard` (epic `atmosphere` P3):
        - signed in (its `signIn`, the server's `SignInCheck`):  its cookie rides with the socket, from any machine
        - not signed in:  this machine only, with this run's token as the socket's sub-protocol
          (`ROOM_TOKEN_PROTOCOL`), never in its address
      - named actions re-run on it (`actions`):  a server side says which;  the compiler sends none there yet, as a program's code is in the browser
      - each write reaches its store as its page's person (`identityOf`, else whoever's signed in;  epic `atmosphere` T38),
        so a store with rules of its own checks it:  a space's `FolderPlace`, its members, roles, takedowns and limits
      - who's here:  each page says who it is as it opens, and a page joining or leaving is told to everyone (`peopleHere`);  never numbered or logged
    - `GoogleSheetPlace`:  a Google Sheet as a place, read and written, its tabs the collections (epic `data` P7)
      - a whole `apply()` is one read and one `spreadsheets:batchUpdate`, all or none;  values, never formulas
      - no versions in Sheets:  the last save wins a cell.  Its class docstring has the known race
      - `GoogleToken`:  a service account's key file makes a token, an hour at a time;  both go in `PlaceKeys`, to be scrubbed
      - read only, from a browser, with no key:  `SheetPlace`, on the sheet's CSV address
      - its tests run against `spell/server/test/sheetsStub`, a fair stub checked against Google's docs
    - `CsvPlace`:  a CSV file as a place that takes writes (epic `data` P14)
      - each save compares new rows with old (`CsvFile`), so only the lines that changed change, byte for byte
      - read, changed and written under the file's `FileLock`, synchronously, all at once:  two writers both stand
      - a row's version is a hash of its cells (`contentVersion()`, shared with `FolderPlace`;  its hash, `contentHash()`,
        is the ONE sha1 for a space's files' bytes and the app's drafts too):
        so only a change to that row is refused, and the engine merges it per field
      - with no id column it only adds;  `call(CSV_SAVE_ROWS, ...)` compares a whole list by each row's text
      - half saved, not UTF-8, or a blank or repeated id:  it refuses a write, and says so
      - a program says it with no new word:  a sheet whose address is a place server's (`isPlaceServerAddress()`)
    - `ExcelPlace`:  an Excel workbook (`.xlsx`) as a place that takes writes, each sheet a collection (epic `data` P38)
      - the same rules as `CsvPlace`'s:  a row's version a hash of its cells, a stale one refused, no id column adds only
      - the rows are `Workbook`'s, in `spell/places`;  SheetJS is loaded before the file's lock, so what's under it is
        synchronous
      - a save keeps the other sheets, unknown columns, formulas and widths, not cell colours and fonts:
        its answer says so (`ApplyAnswer.notes`)
      - `ChunkFiles.writeChanged()` writes it, as bytes, all at once
    - `AirtablePlace`:  an Airtable base as a place, each table a collection (epic `data` P19)
      - its key on the server side;  a program's lines come with each request (`Place.withLines()`), so the program stays the one source of them
      - one read, however many tabs, for a window (`checkedEvery`);  `watch()` shares it, on one `every()`
      - an id column and an upsert, so a new row sent twice is one row;  with none, Airtable makes the id, and a line warns of doubling
      - no version check:  the last save wins a field.  A `Referee` can sit in front, and each of its steps then waits for Airtable
      - `airtableRoutes.ts`:  a route module:  with `AIRTABLE_BASE` and `AIRTABLE_KEY` in its environment, the page server serves that one base at `/api/places/<base>`
      - its tests run against `spell/server/test/airtableStub`, a fair stub, whose guesses say so
    - `SpacesHost`:  Spell's own AT Protocol Spaces host, both sides, as Bluesky's alpha answers (epic `atmosphere` P13, Q14 B)
      - why:  a member's own host has to run Spaces (T35), and an ordinary Bluesky account's doesn't yet
      - spaces, member lists, records, delegation tokens and credentials (real ES256 JWTs), signed reads, MACs, the
        writer set;  and a directory of its accounts (their documents, both keys) and handles, on a port of its own
      - blobs (P12):  uploaded into no space, read through a space only while a record there points to one, deleted
        once none does;  `putRecord` takes no `swapRecord`, as the alpha's lexicon has none
      - THROWAWAY:  kept in memory;  `spell space org host start` runs one on this machine with two accounts
      - an app password's session is a random token, good while it runs
      - it shares `SpaceCredential`'s byte helpers, so only the trial on Bluesky's alpha proves those
    - `RateQueue`:  requests under a service's named limit, in order, waiting as a 429 says, or as `RateLimit.waitAfterHitSeconds` says
    - It imports the kit's places by file (`spell/places/places.types` ...), and nothing in `spell/server` imports it.
  - `spell/server/signIn` -- signing in to a Spell account by email, a link and a code (epic `atmosphere` P3)
    - `SignInCheck`:  the ONE sign-in check of a server
      - `check`, first:  puts who's signed in on every request, `request.person`
        - from the `spell-session` cookie:  `HttpOnly`, `SameSite=Strict`
      - `route()`:  its routes under `/api/sign-in/`, and two pages
        - the routes:  `me`, `ask`, `code`, `waiting`, `link`, `confirm`, `out`, `invite`, `mail`;  `atproto` (below)
      - the link's page, `/sign-in/confirm` ([confirm.html](signIn/confirm.html)):
        where the request came from (browser, system, this machine or this network), then one button
        - where it came from:  `askerOf()`, by `addressOf()`, which takes `X-Forwarded-For`'s last address only when the
          request's socket is this machine (a tunnel, epic `atmosphere` T41), never otherwise
      - the mail catcher's list, `/sign-in/mail` ([mail.html](signIn/mail.html))
      - invite only:  an email with no account is refused;  `invite` wants this run's token (`Guard.tokenCheck`)
      - on a server people reach from outside (epic `atmosphere` P8, the app's `SpellCloud`):
        - `address`:  how its mails' links start
        - `caughtMail: "hidden"`:  the mail catcher's list is never served
        - `Guard.allowAddress()` lets its host in
      - an account Spell took down (`SignInAccounts.isTakenDown()`, epic `atmosphere` P6):
        refused 451, naming the abuse contact (`abuseContact`)
        - `GET me` answers that contact too, for the sign-in bar and the link's page
    - `SignIns`:  the rules, no HTTP
      - a request is good once, for 20 minutes (`SignInsProps.minutes`), nothing done:  its code (5 wrong tries) or its link
      - a link confirmed on another device signs both in
      - a device stays signed in for 30 days, only its token's hash kept, in a file
    - `MailCatcher`:  the local mail catcher, a file per mail, behind the ONE mail seam (`Mailer`);
      a real sender waits on the epic's Q12
    - `ReadCredentials`:  credentials to read a whole space straight from its files (epic `atmosphere` P5)
      - signed by this server's key, kept in a file, so a restart keeps them good
      - good 30 days;  `DirectReads` checks them
    - `cookiesOf()`:  the ONE reader of a request's cookies, every one of a name (each space's credential has its own path)
    - OR A LINKED BLUESKY (atmosphere) ACCOUNT, given `atProto` (epic `atmosphere` P19, Q26 A):
      - `AtProtoIdentity`:  who someone is, asked of their own host by the server, on AT Protocol's server sign-in
        library (`@atproto/oauth-client-node`, loaded the first time someone signs in)
        - it asks only who they are (`atproto`), never the right to write;  what the host hands back is let go at once
        - on this machine, the protocol's development client (no file);  on an `https` address, its client file at
          `/api/sign-in/atproto/client.json`
        - a host sends the browser back to `127.0.0.1`, never `localhost`:  a page at `localhost` comes back signed in
          at `127.0.0.1`
      - the routes:  `POST atproto { who, mode, back }` (where to send the browser), `GET atproto/back` (the host
        sends it back here;  then on to `back`, how it went in its address, `?spell-sign-in=...`)
      - `mode: "link"`:  the Spell account signed in is linked to it, its DID kept, the handle only for show;
        the account signed in rides in the pending sign-in, as the `SameSite=Strict` cookie doesn't come back with the
        host's redirect
      - `mode: "sign in"`:  the account linked to that DID gets the same session the emailed code makes
        (`SignIns.signInLinked()`);  none:  `"not linked"`, invite only still;  taken down:  `"taken down"`
      - `back` must be this server's own page:  never sent on somewhere else, signed in
      - its seam, `AtProtoIdentities`;  a test's, `spell/server/test/FakeAtProtoIdentity`
    - It knows no people:  the accounts are handed in (`SignInAccounts`, the app's `SpellAccounts`).
    - Its page half is `SpellSignIn`, in `spell/places`.
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
  - every local link a ROOT PATH, as the page server serves it (`/spell-ui/x.ts`, `/guides/x.html`;  epic `epic-engine`
    P46, `rootLinks()`):  the same text from any folder, a part or a template;  a link to the page's own folder stays
    relative, and so does a load below it (`_assets/`, `parts/`);  a link a move broke goes to its one new home
  - `check()` verifies them, and refuses a relative one (`relative:  ../x.ts -- write /spell-ui/x.ts`)
  - a worktree's page lays its root links under its address as they're clicked:  the live client's `worktreeHref()`,
    the rule the site header's tabs follow too
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
  - A COMMITTED one (`committed`, epic `epic-engine` P54):  a generated file the repo commits, the root catalog, the
    epics pack, spell-epic's docs bundle
    - built by `--stale` only in a worktree (`buildsWhenStale`);  named (`spell bundle ui-root`), anywhere
    - its record in the install's git-ignored cache, `node_modules/.cache/spell-bundles/`, never beside it
    - the main checkout tells by its `check` command (`yarn pack:check`);  a worktree by its record, or that check
      when it has none
    - what its build writes beside other sources (`generated`) is no bundle's source, so no build makes another stale
  - `build()`:  runs its package's script, then records the hash in its output folder (`.bundle.json`).
  - Its command line:  `spell bundle [<name>...] [--stale]` / `check`.
  - The page server runs `build --stale` when it starts:  `BundleBuild`, in `page/`.
  - Why (Owen, 2026-10-07):  their chunk names carry content hashes,
    so every Spell UI change deleted and re-added most of their files, in every diff and merge.
  - A new bundle:
    - a `BUNDLES` entry
    - its output folder in its folder's part of the settings (above)
    - and in the `.gitignore` of the folder that builds it (`/site/_assets/`, in `ui/`'s)
- JSON5 written with its comments kept moved to util, `spell/util/node/json5` (epic `repo-split` P1):
  its users (ui's tools, app, brand, spaces, spell-epic) need util, not the assembler.
  - `DataFile` writes through it.
- Grow it by capability:  one class per file, its types in [server.types.ts](server.types.ts).
- Node only:  node's file system and child processes, `git`, oxfmt and linkedom.
  - NEVER make it import the `epic/` folder's code:  `epic/` imports this.
  - `DataFile` (`SRV.DataFile`, or `spell/server/DataFile` alone):  the tooling's JSON5 data files,
    here since epic `epic-eject` I5, so the CLI reads the commands page's data without the engine.
  - `contentFolderOf()` (`SRV.contentFolderOf()`, or `spell/server/contentFolder` alone, epic `epic-eject` P12):
    the repo's epic folder, `contentFolder` in the main checkout's `.epic/config.json5`,
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
      - in the epic folder (`contentFolderOf()`), laid under the checkout:
        its folders the checkout has none of are found there (`Linker`'s `content`)
    - the epic engine's code, docs tools included:  the kit's `epic/src/` (epic `repo-split` P20),
      else an older checkout's `spell-epic/src/`
- The docs tools are JavaScript:  [doc-links.js](../../epic/src/tools/doc-links.js) imports the kit's server.
  - So it runs under `tsx`:  `docLinksRun()`, in the docs tools' [pages.js](../../epic/src/tools/pages.js).

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
- `spell/server/test/sheetsStub`:  a stub of Google's Sheets API and its token endpoint, for `GoogleSheetPlace`'s tests.
- `spell/server/test/airtableStub`:  a stub of Airtable's API, for `AirtablePlace`'s tests and the recipe box demo:  checks the token, the limit and batches of 10.
- `spell/server/test/fakeAtmosphere`:  a fake of AT Protocol's network (epic `data` P16)
  - hosts on their own ports, a directory, a relay and a Jetstream
  - for `AtProtoPlace`'s tests, a program's and the recipe box demo's
  - an account given a `password` signs in by `createSession`, as `AtProtoPasswordSignIn` does (epic `atmosphere` P9)
- `spell/server/test/FakeSignIn`:  someone signed in on that fake network, in node or a page.
- `spell/server/test/FakeAtProtoIdentity`:  a Bluesky account's host for `SignInCheck`'s `atProto` (epic `atmosphere`
  P19):  no network;  `route()` on a test's own server makes a browser's trip there and back real.
- `spell/server/test/fakeSpaces`:  `FakeSpaces`, Spell's own Spaces host (`SpacesHost`, above) under a test's name
  (epic `atmosphere` P11, P13);  for `AtProtoSpace`'s tests
- `spell/server/test/recipeServers`:  a fair fake of a web server and a GraphQL server over one box of recipes, for the
  places' tests and the recipe box demo (`scripts/recipe-servers.ts`;  epic `data` P4, P5).
  Never `fetch`, which resolves `..` before sending.
  - `spell/server/test/RecipeFile`:  that box as a CSV file, on `CsvPlace`;  `spell/server/test/recipeDemo`:  the demo's two sources, a CSV file
    and a folder, each with several ways in.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `SRV` ~== `spell/server`
- Every file by its package name and path under `src/` (epic `repo-split` P14), the kit's own included:
  `spell/server`, `/page`, `/site`, `/site/site.types`, `/test/serve`.
  - Twelve that plain `node` loads have entries of their own in the kit's `exports`, each pointing at its `.ts`:
    `/checkout`, `/Git`, `/RealPath`, `/Processes`, `/Links`, `/FileLock`, `/Heartbeat`, `/open`, `/page/settings`,
    `/page/prune`, `/DataFile`, `/contentFolder` (node's modules, `json5`, type imports and each other only).
    - Those import their peers WITH `.ts` (`./Git.ts`, `./server.types.ts`), and `server.types.ts` stays strip-safe:
      no `enum`, no parameter property.
    - Twelve, not one barrel:  spell-epic's hooks and `.mjs` scripts load them before a worktree's install, and the
      `spell` command loads `RealPath` and `Git` by file to stay clear of linkedom.
