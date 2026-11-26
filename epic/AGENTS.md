# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in `epic/`, the epic tooling:
a folder of the kit `spell`.

- It's the epic tooling, a Claude Code plugin, lifted out of spell-app (epic `epic-eject` P6).
  [The README](README.md) says what it is and how it's laid out;  [README-epics.md](../README-epics.md), at the kit's
  root, how it's installed in another repo, and shared by a team.
- The house style is Spell's, WWOD:  **READ it FIRST**, from the kit:  [WWOD](../agents/wwod/WWOD.md).
  - No `agents/` link at the folder's root (epic `epic-eject` I23):  Claude Code reads a plugin's root `agents/` as
    agent types.
- A folder of the kit's ONE repo and ONE package, `spell`, at `~/www/spell/epic/` (epic `repo-split` P20).
  - It was a repo of its own, spell-epic, until then, and was merged in with its history.
  - The one repo, install, `yarn.lock` and CI workflow are the kit's:
    [the kit's AGENTS.md](../AGENTS.md), "The kit" and "CI".
- Its [package.json](package.json) is a FOLDER MANIFEST, not a package:
  a private workspace of the kit's install, still named `spell-epic`.
  - It holds the folder's scripts, its settings (`"pageServer"`, `"spellPack"`, `"spellPublish"`), its `epic` bin,
    its one `spell` command (`"spell": { "commands" }`:  `spell voice check`, [src/cli/commands.ts](src/cli/commands.ts))
    and its dependencies.
  - No `exports`:  the kit's [package.json](../package.json) holds every folder's names ("Imports", below).
- It stands on the kit's `src/` and on Spell UI (`ui/`), by their import names (WWOD §4), never by a path into
  another folder.
  - TypeScript reads their source, as it reads this folder's:  `yarn ts` builds no declarations first.
  - A tool finding one on disk asks Node's resolver ([packageDir.ts](src/tools/packageDir.ts), on the kit's
    `spell/toolchain/sourceNames`).
  - The engine finding its OWN files asks `EngineFiles` ([EngineFiles.mjs](src/config/EngineFiles.mjs)):
    its code is `epic/src/` in a checkout and `dist/epic/` in an npm install (epic `epic-engine` I246);
    never a path worked out from `import.meta` by counting folders.
  - Their source runs here as it is, by those names:  `tsx` (`bin/epic`, the `tsx` scripts), Vite and Vitest.
  - Only `app/` sits above it (the lint's `spell/no-upward-import`).
- Laid out as a plain JS project (epic `epic-eject` J14):
  - `src/`:  the code, the elements and the docs tools included;  its rules:  [src/AGENTS.md](src/AGENTS.md)
  - `tests/`:  its tests, at the same paths as the code (`tests/command/X.test.ts` for `src/command/X.ts`)
  - `vscode/`:  the extension, its own yarn project (no `scripts/` since epic `editor` P44:  its one, Epic UI's data, went)
  - the plugin's parts at the folder's root:  `.claude-plugin/`, `skills/`, `hooks/`, `bin/epic`
- [src/AGENTS.md](src/AGENTS.md) was written inside spell-app, as `packages/epics/AGENTS.md`.
  - Its links lead from where it is now:  the epic folder's pages through `../../spell.epics/`,
    the kit's and the other folders' files by their paths (`../../ui/`, `../../agents/`).
  - Some of its prose still speaks from spell-app's checkout, which serves the epic folder's pages.
- Its Solid code follows Spell's Solid 2 rules:  [solid-2.md](../agents/solid/solid-2.md), IN FULL first.
- Skills:  the plugin's, a `SKILL.md` per skill in [the skills folder](skills/).
  - They link each other by relative path (`../isolate/SKILL.md`).
  - They reach the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
  - ONE copy for Claude Code AND Codex (epic `epic-friend` P12, J29):  the Codex manifest
    ([.codex-plugin/plugin.json](.codex-plugin/plugin.json)) names this same folder, and `epic plugin install --codex`
    links each skill into `~/.agents/skills/`.
    - A step that names a Claude-only tool (the question modal, `Agent`, `EnterWorktree`, `SendMessage`, plan mode,
      a background Bash ...) keeps a one-line `In Codex:` way within 10 lines of it;  the long form is the epic
      skill's [guide.md](skills/epic/guide.md), `claude-only-tools`.
    - A Claude-only skill (`bg`, `bedtime`, `comment`, `session`, `title`) says `In Codex:  Claude Code only` first,
      and has `agents/openai.yaml` turning off `policy.allow_implicit_invocation`.
    - `epic skills check` (`SkillsCheck`) fails either rule, and a description past Codex's list;  its test runs it.
- Voices:  how a kind of people-facing page is written, one file each in [the voices folder](voices/)
  (epic `readme` P12).
  - `readme` ([readme.md](voices/readme.md)):  READMEs, an epic's guide, reference pages.
  - `novice` ([novice.md](voices/novice.md)):  pages for people who don't program (yet), and the significant text a
    product shows them (dialogs, notices, errors, empty states, onboarding, help:  WWOD §6).
  - `blog` ([blog.md](voices/blog.md)):  essays and posts, an argument a reader finishes.
  - `brand` ([brand.md](voices/brand.md)):  product pages:  a home page, a feature page, a launch page.
  - The last three are named by no kind of page yet (`"pageVoices"`):  ask for one by name, `epic voice blog`
    (epic `readme` P15).
  - `code`:  docstrings, comments, `AGENTS.md` files, epic pages:  each repo's own house style (Spell's:  WWOD §6),
    so the plugin ships no voice for it.
    - `epic init` offers a starter (epic `epic-engine` T97):  [templates/house-style.md](templates/house-style.md),
      copied to the repo's `.epic/house-style.md` and named its `code` voice (`RepoInit.houseStyleStep()`).
  - Configurable (epic `readme` P13):  a repo's `.epic/config.json5` names its own voices (`"voices"`, a name to a
    file) and which voice each kind of page takes (`"pageVoices"`);  a repo whose settings name a top
    (a peer's names the kit) takes the top's.
    The skills ask by name:  `epic voice <name>`, `epic voice --for <kind>` print the file (`EpicConfig.voiceFile()`).
  - `epic voice check [--voice <name>] <file | - | --text "...">` (`VoiceCheck`, epic `epic-engine` T92):  a FRESH
    reader, `claude -p` with Sonnet and nothing of the repo, checks a text against a voice (novice by default):
    comprehensible, concise, clear, no agent speak;  each problem quoted with a rewrite;  exit 0 on a pass, 1 on a fail.
    - Its instructions:  [voices/check/prompt.md](voices/check/prompt.md), a folder so it isn't taken for a voice.
    - `spell voice check` is the same command, under `spell` (epic `epic-engine` J256).
  - The skills that write such pages name the voice they use:  the epic skill's "6. Doc Review", `/docs-check`.
  - A repo's own house style adds its specifics on top, and wins where they disagree.
- Working an epic WITHOUT the skills (Codex, or any agent but Claude Code):  run `epic guide` and follow it
  (epic `epic-friend` P11).
  - It prints the workflow in plain steps, from [the epic skill's guide.md](skills/epic/guide.md):
    find the epic, plan, build each phase, take what the person sends, finish.
  - End EVERY turn with `epic turn end`:  the shared plans committed and synced.
    Codex's hooks run it for you once installed (`epic plugin install --codex`) and trusted (`/hooks`).
  - Wait for the person's next Send with `epic inbox wait <epic>`.
- Hooks:  [hooks.json](hooks/hooks.json) and the scripts beside it;  Codex's, [codex-hooks.json](hooks/codex-hooks.json),
  four of the same scripts, and the Codex manifest beside Claude Code's ([.codex-plugin/](.codex-plugin/plugin.json)).
  - Codex's file passes each script `--codex-plugin`:  started so, a script stands down while Codex's own
    `~/.codex/hooks.json` runs it (`CodexHome.skipPluginHook()`), so they never run twice (J37).
  - The SERVER GUARD (epic `epic-engine` P84, narrowed in P85), `PreToolUse` on Bash in both files:
    [server-guard.mjs](hooks/server-guard.mjs) runs `ServerGuard` ([ServerGuard.ts](src/server/ServerGuard.ts)) on each
    command an agent is about to run, and answers "deny" for a kill that would reach a MAIN checkout's page server,
    editor or hub, or main's editor started by hand (`vite`, `vp dev`, `yarn start`, `yarn start:dev`, `spell app
    serve`), naming `spell server ...` instead;  main's checkouts are those Spell's keeper keeps (`~/.spell/keeper.json5`)
    and the hub serves, hands off is the keeper's (`~/.spell/server-keeper-holds.json`);  `spell server ...`,
    `spell keeper ...`, `epic server(s) ...`, `epic hub stop`, a worktree's servers, reading (`ps`, `lsof`, `curl`) and
    hands off go through;  it fails open
    - the person's `!` commands never reach it:  they're typed into the chat, not a tool call (kept in a transcript
      as `<bash-input>`)
  - Every hook exits 0 whatever happens.
  - Except the worktree hook:  its failure is Claude Code's answer.
  - And the inbox poller, the `asyncRewake` `Stop` hook (`monitors/listen.mjs --hook`, epic `epic-engine` I144):
    it runs in the background and exits 2 with its `📬` line, which is how it wakes the session.
  - The epic hub listens for every session (`InboxHub`, epic `epic-engine` T163):  the poller hears its note while the
    session is idle, the `PostToolUse` hook ([inbox-note.mjs](hooks/inbox-note.mjs)) hands it over at the next tool
    call while it works;  so no session runs `epic inbox wait` in the background.
- Removing a worktree stops its page and vite servers FIRST (`CheckoutServers`, epic `epic-engine` I53):
  - `epic worktree remove <name>`, never a bare `git worktree remove`, in the skills and anything new
  - the worktree hook and `epic worktree move` do it themselves;  the session-start hook stops the rest, hourly
- The SERVER KEEPER is Spell's (epic `editor` P48, [ServerKeeper.ts](../src/server/keeper/ServerKeeper.ts),
  `spell keeper ...`);  the epic hub ran it until epic `epic-engine` P85, and now only feeds it:
  - as the hub starts ([SpellKeeper.ts](src/server/SpellKeeper.ts)):  each repo it serves is put on the keeper's list
    (`~/.spell/keeper.json5`, as `spell keeper add --checkout` would), with the repo's own servers (its
    `.epic/config.json5`'s `servers`:  a name, a URL or port to check, and a `start` command if it wants Start and
    Restart) and the hub itself (checked at `:4848/api/server`, started with `epic hub ensure`, so the keeper brings it
    back);  nothing is written when nothing changed;  then `spell keeper ensure --take-over`, detached
  - every 10 seconds the hub looks:  a repo's settings changed, it registers again;  its own code changed, it hands over
    to a fresh hub on its port
  - the keeper keeps every main page server up on main's code, each worktree's page server stopped after 30 minutes
    unused (never while an `epic turns` command waits or runs there:  `Turns` marks it in use, `SRV.CheckoutUse`,
    I459), main's editor through its page server, and the registered servers watched and started;  it looks every 10
    seconds, and when a session starts (the `SessionStart` hook [server-keeper.mjs](hooks/server-keeper.mjs) runs
    `spell keeper ensure --take-over --quiet`;  `epic hub kick` asks it to look)
  - the ONLY one that starts, stops or restarts a main checkout's page server:  the kit's `PageServer.ensure()`,
    `stop()` and `restart()` ask it (`SRV.KeeperLink`, its record `~/.spell/server-keeper.json`)
    - agents ask it with `spell server start|stop|restart|status <server>`;  `epic servers ...` is another name for it
      ([Servers.ts](src/command/Servers.ts), `--repo <name>` picking the checkout);  the guard above refuses a kill
    - what it starts carries its mark (`SPELL_KEEPER_START`), so main's page server and editor, which refuse an
      agent's start (`SRV.KeeperLink.refusedStart()`), know it was the keeper
  - a stop by hand is held until Start (`~/.spell/server-keeper-holds.json`)
  - the page server's certificate WATCHED (epic `epic-engine` T164):  each look compares its two files
    (`~/.spell/localhost/`, `HttpsSwitch.filesStamp`) with the last;  made, made again or deleted (the tab's card, or
    `spell server certificate` / `--undo` in a terminal), every main page server not held stopped is restarted, so it
    takes HTTPS or drops it with no restart by hand
  - HANDS OFF (T164):  a switch at the top of the Servers tab, kept in the hold file (`handsOff`) until turned off;
    while it's on, the keeper starts, stops and restarts nothing of main's by itself (no keep-alive, no editor restart,
    no repo's own server, no certificate restart) but still looks and reports, the tab's dot saying so;  the person's
    own buttons and Restart all still work;  turned off, it looks at once:  what's down comes back, a certificate
    changed meanwhile is taken up
  - the top bar's Servers tab ([serverRoutes.ts](src/server/serverRoutes.ts), its page
    [servers-page.html](src/tools/servers-page.html)):  `GET /api/servers`, `/api/servers/dot`, `/api/servers/log`, `POST
    /api/servers/<start|stop|restart>`, `POST /api/servers/https` (`{ turn }`), `POST /api/servers/hands-off` (`{ on }`),
    `POST /api/servers/restart-all`, every one passed on to the keeper in charge, on the hub and a checkout's page
    server alike (epic `epic-engine` P85);  beside its `GET /api/servers` answer, what's the epic tooling's own:  what
    just merged into main and what waits (`ServerFacts`, no Claude call), and `keeperPage`, the Spell Servers page's
    address
    - SPELL'S SERVERS PAGE (epic `editor` P49) is the tab's cards since P85:  framed under main's heading, made once,
      as tall as the page inside says, light or dark as the tab is;  main's heading keeps the secure link's lock,
      Show in the editor and Restart all;  below it what merged into main and each active worktree's open work;  the
      tab's own cards (below) only when the answer names no `keeperPage`
    - the page (epic `epic-engine` T162):  nothing folds;  "main" and its servers as cards, what merged into main
      lately, main's commits not on GitHub, then each epic's worktree (`⎇ <name>`):  its servers' cards, what it
      hasn't merged
      - I449:  cards three a row at most, the name the link, page server, editor, hub, then a repo's own;  the
        worktrees newest worked on first (its last commit, or a file changed since), "last commit 3 weeks ago" beside each
      - I451:  each card's address under its name, its state on the right, and under the state its buttons as icons
        (restart, stop;  start when stopped);  one a server can't take drawn disabled, its tooltip saying why (an editor
        goes with its page server);  what merged into main, and each
        worktree's open work, as rows in columns, nothing wrapping, the GitHub line their quiet last row
      - I456:  the state is ONE icon on the right of the name, its words the tooltip ("Running", "Down:  <why>"):  a
        green circle check, a red triangle, a grey circle while stopped, a turning blue notch while starting;  under
        it the buttons, a tight group (compact icon buttons, 4px apart), the state centred over the last;  the name
        never cut at three a row
      - T164, I454, I456:  the SECURE LINK, HTTPS on the page servers (`HttpsSwitch`, on `SRV.LocalCertificate`, none
        of its logic copied), is ONE lock, before main's page server's address, and it IS the switch:  closed while on
        (a click turns it off), open while off, waiting for the password or expired (a click turns it on;  disabled,
        saying why, with no mkcert);  its tooltip says which first, "browsers use HTTP/2";  a worktree's page server on
        its https address shows a plain lock there;  only the page servers have it, the editor and the hub stay plain
        HTTP (a card of its own before I454 read as if every server had it);  Turn on makes the certificate and has
        the Mac ask for the password in its own window (`trustInWindow()`, the person's login keychain:  the hub has
        no terminal for `sudo`);  the restart is the keeper's watch, asked to look just after the answer
      - I455:  a look that fails (the hub handing over, a page server restarting) asks again every 2 seconds, the page
        as it was and a calm "Reconnecting…";  only after 30 seconds the problem;  a down editor's card says what to
        do in plain words, never a log file's name
      - T164:  main's heading has RESTART ALL at its right:  every main page server restarted, its editor with it, one
        stopped by hand too, just after the answer (the call comes through main's page server);  the hands-off switch
        first on the page, a notice under it while it's on;  a card whose server isn't running says "Not running"
        under its name, never its description
      - I465:  a worktree shows its servers' cards only while any of them runs, then every one, a stopped editor's
        too;  nothing running, no cards and no "stopped" line;  only ACTIVE worktrees listed (J369):  a server not
        stopped, a session BUSY on it (mid-turn, not merely open), agents, a turn or a phase under way, never commits
        alone;  none, one calm line
    - VS Code's side bar shows it in a tab of its own, Servers, between Epic Docs and Details
      ([README-vscode.md](README-vscode.md))
- The epic server ([EpicServer.ts](src/server/EpicServer.ts)) opens each repo's APP at `/editor/` (the top bar's App
  tab):  the repo declares it in its `.epic/config.json5`'s `"app"` ([RepoApp.ts](src/server/RepoApp.ts));  the
  server starts it in the background when it's down, never restarts it, and never serves it itself.
- Imports:  "Imports" below.
- Checks, from `epic/`:  `yarn ts`, `yarn test`, `yarn test:integration` (the slow ones, in the test turn), `yarn lint`,
  `yarn plugin:validate`;  over every folder:  the kit's
  `yarn ts` / `yarn test` / `yarn lint`, at its root.

## Imports

As WWOD §4, plus these.

- ONE name per file, the same from every folder (epic `repo-split` P14, Q47;  P20):  `spell/epic/` plus the file's
  path under `src/`, no extension, inside `epic/` too.
  - `spell/epic` (the barrel, `EP`), `spell/epic/markup`, `spell/epic/tool/PlanDoc`,
    `spell/epic/components/epic-page`
  - Same-folder peers stay `./PlanItem`;  NEVER a `../` climb, NEVER a `$/` alias.
  - Files outside `src/` (`tests/`, `hooks/`, the extension's `vscode/`) import `src/` the same way.
    The two files code imports from OUTSIDE `src/` have an explicit key each in the kit's `exports`, for their tests:
    `spell/epic/vscode/src/docUrls.ts`, `spell/epic/vscode/src/ClipboardImage.ts` (epic `epic-friend` P15).
  - Nothing imports by the folder's old name, `spell-epic/...`:  the hooks too say `spell/epic/...`.
- How every tool finds them:  the kit's [package.json](../package.json) `exports`, no alias table anywhere.
  - TypeScript:  the `spell-source` condition (`customConditions` in [tsconfig.json](tsconfig.json)) reads the
    source, this folder's and every other's.
  - Vite, Vitest, `tsx`:  `default`, the source, adding the extension themselves.
  - Every folder barrel has an explicit key (`"./epic/markup"`, `"./epic/components/epic-page"` ...):  `tsx`, run
    through `node_modules/spell` (the kit's page server loads the route modules), finds a file without its
    extension but not a folder's `index`.
  - esbuild (the extension's build, the docs bundle's) finds neither by itself:  the kit's `sourceNames()`
    (`spell/toolchain/sourceNames`) finds our names as their source files.
- PLAIN `node` writes the extension, as it needs it (the `"./epic/*.ts"` key):  `spell/epic/config/EpicConfig.ts`,
  `spell/epic/window.mjs`, `spell/epic/tools/pages.js`.
  - Plain node runs the hooks, the window script, and the docs tools' `.js` scripts (`details.js`, `update.js` ...):
    every file they load, of ours, imports this way, and of the kit's only its explicitly exported files
    (`spell/server/checkout`, `spell/server/DataFile` ...).
- A page's pack modules (`spell-ui.entry.js`'s `packModules`) are keyed by the import names themselves
  (`spell/element`, `spell/ui/core`;  epic `repo-split` P14, Q45):  what a pack's build leaves external.
