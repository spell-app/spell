# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this package, `spell-epic`:  spell-epic's `src/`, the whole repo's code
(epic `epic-eject` J14).

**READ the repo root's [AGENTS.md](../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the repo's layout, and the house style every package shares.
Only what's local is below;  a section named like a WWOD rule extends it.

`spell-epic` holds TWO things (Q23 of epic `people-and-orgs`, 2026-10-13):
- the epic pages' elements and tool:  the `<epic-*>` component pack, and `epic` ("Overview", "Rules", "Epic pages")
- EVERY docs page's tooling, not only the epics' ("Layout" onwards):
  `tools/`, the scripts and the `_assets` every page loads
  - That was the old docs package (spell-app's `packages/docs/`) until P16 of `people-and-orgs`.
  - The pages themselves are shared root folders, tracked by no package
    ([spell-app's AGENTS.md](../../spell-app/AGENTS.md), "Shared content").

## Overview

- A COMPONENT PACK:  `<epic-*>` custom elements, written as Spell UI families,
  that a page loads on demand through `<ui-root>`.
  - The page's `<ui-components source>` names the pack's script:

  ```html
  <ui-root>
    <ui-components source="/_epic/pack/epics.pack.js"></ui-components>
    <epic-...> ... </epic-...>
  </ui-root>
  ```

  - EVERY page the docs runtime runs on has the pack, root or not (epic `epic-engine` P3):
    guides, list and details pages, the changelog.
    - The runtime's `loadEpicsPack()` loads it at start, through `ComponentPacks.load()` as a root does:
      one script per page, registered once, by the page's own `source` when it names one.
    - So our tools just create the `<epic-*>` element;  it upgrades once the pack has loaded (async, after the first
      paint):  `customElements.whenDefined()` to wait for it.

- Made by `spell pack create epics --prefix epic-`.
  - Its build and check are the kit's pack tooling, `spell-pack`
    ([ComponentPack.ts](../../src/element-tools/ComponentPack.ts);  Spell UI's `spell-ui-pack` from epic `repo-split` P5
    to P10), which the CLI's `spell pack` calls too:  every pack builds and checks the same way.
- `components/<tag>/` (`spell-epic/components`) -- one folder per element family.
  - Written exactly like a Spell UI family:
    [ui's AGENTS.md](../../spell-ui/AGENTS.md), "Overview" and "Solid authoring".
  - Every file named for its COMPONENT:
    - `<Name>.tsx`:  the component, on [`spell/element`](../../src/element/AGENTS.md)'s `E.UIComponent`
    - `<Name>.en.ts`:  its tag's vocabulary (topics + aka, skeleton text)
    - `<Name>.css`
    - `<Name>.types.ts`:  only what several of its files share
    - its test, `<Name>.test.tsx`, at the same path in the repo's `tests/`:
      `tests/components/<tag>/`
    - `index.ts`:  defines its tags (SIDE EFFECT)
  - No native fallback:  only form controls have one.
  - A new one:  `spell pack add epics <tag>`, the tag starting `epic-`.
  - Every component is a family, as in Spell UI (P10 of epic `spell-element`).
    - No exported function components.
    - The lint rules hold them to it (`yarn lint`).
      They flag a hand-written effect, observer, listener, `untrack()` or timer,
      and an exported function component.
    - Those rules:  [ui's AGENTS.md](../../spell-ui/AGENTS.md), "Solid authoring", "The lint guard".
  - A piece several families draw is a family of its own.
    - It's drawn in their shadow roots, and never written in a doc.
    - Those pieces:  `<epic-review>`, `<epic-new-item>`, `<epic-agents>`, `<epic-thread-message>`.
    - Each family that draws one imports its barrel first,
      so it's defined wherever they are.
    - Unless it can't be a tag.
      The fold button and chevron every fold draws are methods of `Fold`:
      `fold.button()` and `Fold.chevron()`.
      - The button is named by ids in the card's own shadow root.
      - The chevron shows in the first frame.
  - Every element with a TITLE ROW has an `actions` slot in it (epic `epic-workflow` P25):
    `<epic-section>`, `<epic-overview>`, `<epic-phase>`, `<epic-item>`, `<epic-aside>`, `<epic-code>`, `<epic-update>`.
    - What a page puts there (`<ui-button slot="actions">`) sits after the title, before the element's own buttons.
    - The title (Owen, 2026-10-19:  "I don't like the ellipsis in a collapsed issue/etc header -- make it always show
      the full title, wrapped"):
      - ALWAYS in full, as many lines as it needs, folded or open:  no "…", no tooltip
      - Before:  J183 (2026-10-18), "ellipsis when collapsed, wrap when expanded".
      - a phase's plan-changed pen comes after it, on its first line (`FoldPieces.mark`)
      - everything in the row sits on the title's FIRST line, so nothing moves as it folds
        (`--_epic-fold-line` in `EpicFold.css`;  the item's line is one-line cells)
      - collapse-all still shows only while open, before the chevron, as it did:  it moves the buttons before it
      - expand-all (a fold's:  the Overview, a section, a phase;  Owen, 2026-10-20) shows folded or open, just before
        collapse-all:  it opens the block and everything in it, cards too, parts loading as they open (`expandAll()`)
      - CSS and the elements' own drawing only:  the page's markup is unchanged, so no migration step
      - NOT `<ui-section>` on guides:  at phone width a title there still runs on under its buttons,
        fading out (`spell-doc.css`;  Owen, 2026-10-10:  "stay in place and overlap")
      - a DETAILS page's `<ui-section>` titles wrap in full too (epic `epic-engine` I21):  Owen answers there;
        its count and actions go below the title when they don't fit beside it
    - A click on it never folds:  `CONTROLS` in `Fold.tsx` takes the slot and its box (`Fold.actions()`).
    - The slot, its child spec and its part:  [Fold.types.ts](components/epic-item/Fold.types.ts), which each
      vocabulary imports.
    - The docs runtime puts a block's bullhorn there (see "Comments").
    - NOT the cards with a heading band (a reply, a status card, a note ...):  nothing needs it there yet.
- `src/` (`spell-epic`, `EP`) -- code the elements and the node tools share.
  - Its test, [pack.test.ts](../tests/pack.test.ts), runs `spell-pack check` (`yarn pack:check`).
  - `definitions/` -- the ONE description of every element:
    - `Definitions.all`:  each vocabulary as data, plus `children` (the content model)
    - Node-safe:  imports vocabulary files, never a family's barrel.
  - `markup/` -- making, reading and checking a doc's markup, on linkedom or the browser's DOM.
    - `Markup`:  make, read, set, append
    - `MarkupCheck`:  validate a doc
  - `dates/` -- `PlanDates`:  every date an element draws, from whatever form the doc holds.
    - `10/8/26 14:34`;  `10/8/26` for a day
    - NOT the log's (`<epic-event>`).
    - A time alone (`saved 14:42`):  `PlanDates.clock()`.
  - `phases/` -- `PhaseIds`:  a phase's STABLE id and the number people see (epic `epic-workflow` P15).
    - The id is made once from the phase's name, `p-epic-migrate`, and kept through renames and inserts.
    - "P7" is its place in the list, worked out as it's drawn or printed:  never written, never its id.
    - Finding a phase as people name it (`7`, `P7`, its id, name or slug), and an old `#p7` landing on the 7th phase.
  - `comments/` (`spell-epic/comments`) -- `ThreadFacts`:  what a comment's THREAD shows, worked out ONE way for the
    `<epic-thread>` family, the docs runtime's comments and the epic tool's `CommentList` (epic `epic-engine` P3).
    - whose turn, Owen's words Claude hasn't had, its id as Owen sees it (`M3`), the few words it's on, its times,
      where a taken comment went (`takenInto()`)
    - pure, node-safe at import, NOT in the `spell-epic` barrel:  `spell-comments.js` imports it alone, with no Spell UI
  - `review/` -- `ReviewClient`, one per page:  the review inbox's reads and writes (`/api/epics/review/*`).
    - Also token refresh, polling, and note-draft backups (the old page runtime's localStorage keys).
    - It touches no browser global until `forPage()` / `watch()`.
    - Used by:
      - `<epic-review>`:  the review controls drawn by items, sections (Overview parts), phases and the Overview
        - `<epic-item>`, `<epic-section>`, `<epic-phase>`, `<epic-overview>` (keyed `summary`, on its title row:  epic
          `epic-engine` I55;  `<epic-summary>` drew them under its lede before)
      - `<epic-change>` (epic `epic-engine` P30):  a change mark's Accept and Reopen, keyed by its id (`ch3`),
        its own `<epic-review buttons="change">` under its chip
      - `<epic-new-item>`:  the page's toolbar button, and the Todos and Questions sections' New todo / question
      - `<epic-option>`'s Choose pill
      - `<epic-test-run>` (epic `epic-engine` P4):  a test run's answers (`answerTest()`), screenshots (`saveShot()`)
        and the epics left to test (`openTests()`)
      - The controls show while `<epic-page reviewing>` is set.
    - `AgentsClient`, one per page:  the epic's running agents, and Owen's redirects.
      - Served at `/api/epics/agents`, by [agentRoutes.ts](tools/agentRoutes.ts), in the docs tools.
      - `<epic-page>` draws them as its "Agents running" panel:
        `<epic-agents>`, in its shadow root, before its blocks (not a section).
      - Both clients POST and watch through the same code, a `ServerLink` each:
        the token, its one refresh on a 403, the poll and `spell-server:file`.
  - `answers/` (`spell-epic/answers`) -- the pages Claude makes for Owen to answer ON (epic `epic-workflow` P12),
    as their elements keep them.
    - No Solid, no Spell UI:  node-safe at import.
    - `AnswerForm`, one per details page:
      - the questions (`<epic-ask>`) and boxes (`<epic-text-box>`) register while connected
      - it gathers the answer, sends it (`POST /api/docs/details/answer`, through a `ServerLink`),
        reads it back on load, and says where it stands for `<epic-send>`
      - and its DRAFT (P18):  what's typed and not sent
        - kept by id at once (`typed`), in `localStorage` at once, and on the page server as he types, half a second
          later (`POST /api/docs/details/draft`);  a failed save tries again every 3s (epic `epic-engine` P15)
        - put back on load over the answer, and into a part that joins later (an agent's rewrite, patched in place)
        - text whose id leaves the page is KEPT (`kept`):  drawn by the notes box, and sent with the rest
      - each part says the ids it holds, with their titles (`labelsInto()`), so kept text keeps its old title
      - `AnswerDraft`:  the rules, pure (what's laid over what, what's kept, which draft is newest)
    - `RunForm`, one per run page (epic `epic-engine` P23):  a command's review page, `<epic-run>`'s
      - reads the run (`GET /api/runs/<id>`);  each row's answer saved as Owen gives it (`POST .../answer`, half a
        second after typing, a pick or a tick at once;  a failed save tried again every 3s);  Send (`POST .../send`)
      - kept fresh by the run's files changing (`spell-server:file`) and every 30s, for the waiting state
      - see "Run pages"
    - `ChoicesForm`, one per choice page:
      - the rows (`<epic-choice-row>`) register
      - the draft:  in `localStorage` at once, on the page server as he types and as the page goes away, a failed save
        tried again every 3s (epic `epic-engine` P15);  "Do it" (`/api/docs/choices/*`);  bringing both back;
        Copy my answers (`copyText()`);  for `<epic-choices-bar>`
    - the answers' shapes are copies of the docs tools' routes':
      [detailsRoutes.ts](tools/detailsRoutes.ts), [choicesRoutes.ts](tools/choicesRoutes.ts)
    - The elements:
      - `<epic-ask>`, `<epic-text-box>`, `<epic-send>`, `<epic-choice-rows>` / `<epic-choice-row>`, `<epic-choices-bar>`
      - and `<epic-option>`'s answering mode, an option of an `<epic-ask>` (a tick box, a comment box)
      - Their pages:  Epic UI's "Pages Owen answers on".
    - `<epic-text-box>` is written in pages (the notes, a section's comment)
      AND drawn by others in their shadow roots (Other, an option's comment, the feedback).
      - Each family drawing it imports its barrel first.
  - `links/` (`spell-epic/links`) -- pointing at a saga, an epic, a phase or an item (epic `epic-workflow` P15, J32).
    - pure, node-safe at import, NOT in the `spell-epic` barrel (the docs runtime imports it alone)
    - `EpicAddress`:  a short address, or `<epic-link>`'s attributes,
      as the page, the `#id` and the short form a link draws
      - the short address:  `SAGA:/drawable-spell/python-target#T1`, the colon form read too
      - the page:  `sagas/<s>/<s>.saga.html`, `epics/<e>/<e>.plan.html`
      - phases by number or name (`findPhase()`);  the checkout's root URL of a page
    - `PageTargets`:  what one page's DOM holds to land on (ids, titles, phases in order, its `<epic-page saga>`),
      on the browser's DOM or linkedom's
    - used by `<epic-link>`, the docs runtime (`SAGA:/` links rewritten), and the tool's `EpicTargets`
  - `site/` -- `EpicUISite`:  the data of Epic UI, the elements' docs set, in Spell UI's site shapes.
    - the set:  `docs/`, at `/components/epics/` (see "Epic UI, the docs set")
    - `components.json5`, in `__data/`:  one entry per element from `Definitions.all`, plus the side column's own links
      - filed by the groups in the set's hand-kept `pages.json5`
      - a new element:  under Other, `planned` until its page exists
    - `search.json5`, in `__data/`:  every page's sections, for its search
    - written by `yarn site:data` ([its script](../scripts/site-data.ts));  `EpicUISite.test.ts` fails while stale
  - `list/` -- [the Epics list](../../spell.epics/epics/index.html), out of the page server since P16 of `people-and-orgs`:
    - `EpicState`:  an epic's state, the ONE rule every list and page draws it by
    - `EpicCards`:  the list's markup, written alike by `epic pages index` and the page server:
      ONE `<epic-list>` of `<epic-card>`s (epic `epic-engine` P3), which draw, group, sort and filter themselves
      (the `epic-list` family, in `components/`)
      - each card carries its saga (`saga`, `saga-title`, `saga-purpose`;  epic `epic-workflow` P15)
        - the sagas come from the caller (`docs index`)
        - `RunningEpics` takes a running card's saga from a written card naming it
      - `docs index`:  [index.js](tools/index.js)
    - `RunningEpics`:  the running epics, still in their worktrees, on the main checkout's page server
    - [runningRoutes.ts](list/runningRoutes.ts):  its route module
      - `GET /api/epics/running`
      - the list page's running cards, as it's served
    - `EpicState` and `EpicCards` load in plain `node` too (`docs index`):  their headers say what that forbids
  - `config/` -- `EpicConfig` (epic `epic-eject` P4):
    where a repo keeps its epic things, from ONE file, `.epic/config.json5`.
    - the keys:
      - the content folder, the base branch, the worktrees' folder, the install command, the window names,
        whether session folders are linked;  and the repo's app (`app`, epic `epic-engine` I49), which the epic
        server's `/editor/` opens, starting it when it's down (`RepoApp`, in `server/`)
      - each one's default is spell-app's layout before the file existed;  `app`'s:  none
    - the MAIN checkout's file, found through git's common dir (`SRV.checkoutOf()`), so every worktree reads the same
    - `epic config [key] [--json]` prints the values, for the skills (folders absolute)
    - a repo MOVED behind compat links (repo-split's move to `~/www/spell/`;  epic `epic-engine` I59):
      - `main` (and `mainOf()`) is the main checkout's REAL path, whatever spelling it was found by:  an unrepaired
        worktree's `.git` file names the OLD one
      - a configured folder (`contentFolder`, `worktreesFolder`, `windowsFolder`, `engineFolder`) missing beside the
        real main checkout, but there beside an OLD spelling of it, is used from there (its real path), with ONE line
        on stderr per process:  `contentFolder ../spell-app.epics is missing beside <main>;  using <found> -- update
        <main>/.epic/config.json5`
        - the old spellings:  the one `of()` was given, and the one each worktree's `.git` file names (from git's
          `<main>/.git/worktrees/*/gitdir`), so the main checkout finds it too
        - once every worktree is repaired, none is left:  update the file at the move (move-check.md's checklist)
      - `contentOf()` never falls back to the checkout itself silently when the file NAMES a content folder:  it says so
      - `epic window init` drops a worktree window's folder that's gone (the old content folder) and adds the one in
        force (`withContentFolder()`, [window.mjs](./window.mjs))
    - `RealPath` (epic `epic-engine` I59):  every compare of checkout, worktree, content-folder and session paths,
      links followed on BOTH sides
      - `of()`:  the real path;  a missing one, its nearest folder that's there, real, then the rest as given
      - `same()`, `isIn()`, `from()`:  equal, inside, the path inside
      - who:  `EpicConfig` (`main`, `worktreeNameOf()`), `Worktrees` (`named()`, `idle()`, `remove()`,
        `repoSessions()`), `Sessions.live()`'s `inRepo`, `Stock`, `RunningEpics`, `RepoList`, `WorktreeGuard`,
        `SharedMigration`, the window script, the extension's `WindowBridge.indexOf()` (`folderIndex()`)
      - plain `node` loads it by path:  node's own modules only
    - node only, NOT in the `spell-epic` barrel (`spell-epic/config/EpicConfig`)
      - plain `node` loads it by path too, before a worktree's `yarn install`:
        the hooks ([hooks/](../hooks/)) and the window script ([window.mjs](./window.mjs))
      - so it reads its JSON5 itself (comments and trailing commas), not through `DataFile`, which needs `json5`
    - the page server never reads it:  the running epics' route module tells it where the worktrees are
      (`serveWorktrees()`, in the main checkout)
    - worktrees may live beside the repo (epic `epic-eject` P8):
      - `worktreesFolders`:  every place to look, the new one, then the old `.claude/worktrees`
      - `worktreeFolder()`:  finds one in either
      - `newWorktreeFolder()`:  where a new one goes
      - `worktreeOnlyWindow()`:  picks its window's layout
    - `EpicRepo`:  which REPO an epic is worked in, from its page's `worktree` / `repo` (epic `epic-engine` I47)
      - repos share one content folder, so another repo's epic page is found from here too
      - the worktree hook refuses another repo's epic's worktree;  the prompt gate and the session-start guard say
        which window;  `epic worktree path`, `epic window launch|open|close` and `epic list` use that repo's
      - plain `node` loads it (the hooks)
    - `SessionFolders`:  Claude Code's saved-session folders (`~/.claude/projects/<slug>`)
      - and the link that makes a worktree's main's (`linkSessionFolders`)
      - plain `node` loads it too (the worktree hook)
  - `cli/` -- the `epic` COMMAND LINE (epic `repo-split` J114:  every repo's command-line tools in its `cli/`).
    - `EpicProgram`:  the commander tree, every verb on it under its heading, `epic --help`
    - `epicGroups.ts`:  each group's verbs, for their help (`epic ask create --help`)
    - its entry is [epicMain.ts](cli/epicMain.ts), run by [bin/epic](../bin/epic)
      - NEVER imports the kit's `spell` program (`spell/cli`), and loads no spell
    - Owen's names (repo-split P13):  `create`, `lint`, `inbox watch | ignore | wait ... <epic>` (the inbox's verb
      first), `window should-stay`, `window reload`, `summarize`, `status` (taking stock, `stock` before);  an item's
      status card is `update`'s (`epic update seo#J3 underway`, J140);  `add-request`, `overnight` and `plan-doc` gone
    - node only, NOT in the `spell-epic` barrel:  imported by path, `spell-epic/cli/EpicProgram`
    - its tests:  `tests/cli/`
  - `command/` -- what the `epic` command's verbs run (epic `epic-eject` P5).
    - a class per verb group, a method per verb:
      - `Requests`:  `send`, `requests`, `file`, `home`, `merge`
      - `Worktrees` (`worktree`), with `MainMerge` (`worktree merge-main`:  installs the packages when it changed a
        lockfile)
      - `StrayFiles`:  what's uncommitted in a main checkout `epic merge` fast-forwards, and moving it aside into the
        epic home's `ditched/` (epic `epic-engine` I77):  a snapshot or generated output by itself, a few others with
        `--ditch`
      - `Sessions` (`session`), `Parking` (`park`), `Stock` (`status`, taking stock)
      - `Shared` (`shared`), with `SharedMigration` (`shared migrate`)
      - `RepoInit` (`init`):  a repo set up for epics (epic `epic-eject` P9)
    - `CheckoutServers`:  a checkout's web servers (page server, vite) stopped as it goes (epic `epic-engine` I53)
      - `stop()`, BEFORE a removal:  the worktree hook, `epic worktree remove` (`/isolate done`, `/worktrees`' clean-up
        through `Stock`), `epic worktree move`
      - `atSessionStart()`:  the servers whose checkout is gone already, at most once an hour (a stamp in
        `~/.spell-epic`), from the `SessionStart` hook ([server-prune.mjs](../hooks/server-prune.mjs))
      - found by spell-app's own finder, `prune.ts` (`epic server prune`'s):  by process, never a pid file;  never a
        live checkout's
      - plain `node` loads it by path, `prune.ts` too (the server package's entry `spell/server/page/prune`)
    - `CheckoutPatches`:  `epic worktree patch [--all]`, the fixes a repo lists in `"checkoutPatches"` given to every
      checkout at once, the worktrees behind `main` too (epic `epic-engine` P17)
      - a `copy` patch puts `main`'s file where it isn't tracked yet, git-excluded;  a `run` patch runs once per checkout
        (remembered in its git folder, `epic-patches.json`)
      - the session-start hook starts it in the background ([patch-checkout.mjs](../hooks/patch-checkout.mjs)), the
        worktree hook runs it on a reused branch;  plain `node` loads it by path
    - `TranscriptIndex`:  what each saved session's transcript names (its titles, its folders), kept between runs in
      Claude's folder (`spell-epic/transcript-index.json`;  epic `epic-engine` I62)
      - `Sessions.named()` (`epic session find`, `epic worktree status`) reads only the transcripts that changed since:
        the transcripts are 1.6GB, and reading them all took 1.7s of a 2s command, more with every session
      - keyed by each file's size and modified time;  best effort, never throws
    - `WorktreeGuard`:  what the `SessionStart` hook ([worktree-guard.mjs](../hooks/worktree-guard.mjs)) tells
      a worktree's session that starts outside its worktree, or in it unrecorded (epic `epic-eject` I3)
      - plain `node` loads it by path
    - `EpicTools`:  the scripts it passes through (`window`, `server`, the docs tools' groups) and the `epic` tool,
      run in this process
    - `PromptGate`:  the epic rules the `UserPromptSubmit` hook checks a prompt against
      - the hook:  [prompt-gate.mjs](../hooks/prompt-gate.mjs)
    - `PromptAck`:  the "On it:  ..." line that hook shows for a message sent while the session is busy, its summary
      Haiku's (`claude -p`, hooks off);  every prompt logged to `epic-prompts.log` in the checkout's git folder;
      `promptAck` in the config turns it off (epic `epic-engine` P18)
      - plain `node` loads it by path, with `command.types.ts`
    - `Git`:  running git, and finding checkouts:  the main one, the caller's, the one this code is in
    - ONE copy of the code:  every verb runs THIS checkout's code, on the caller's checkout's data.
      - the `epic` on the `PATH` is the main checkout's
      - the caller's checkout:  `Git.nearestCheckout()`
      - the tools get it as `EPIC_CHECKOUT`, which [pages.js](tools/pages.js) and the window script take as their root
    - `epicArgs.ts`:  `epic <verb> <epic>#<id>` turned into the `epic` tool's own order (`planDocArgs()`)
    - this folder NEVER imports the kit's `spell` program, and loads no spell
    - node only, NOT in the `spell-epic` barrel:  imported by path, `spell-epic/command/Worktrees` ...
    - its tests:  `tests/command/`
  - `data/` -- `DataFile`:  the tooling's DATA FILES in the shared folders, as JSON5 (epic `epic-workflow` P21).
    - review inboxes, details pages' answers and drafts, choice pages' rows, running agents, the docs home's lists
      (`home.json5`, `favorites.json5`), the sagas' list, the commands page's data
    - written keeping a comment Owen adds by hand:  spaces' `json5Edited()` (json5-writer)
      - laid out as `JSON.stringify()` would, in JSON5's JSON-compatible part (keys and text in double quotes)
    - read by the `.json5` name first, then the old `.json`;  written as `.json5` only (the old `.json` removed)
      - a checkout on older code keeps reading its files until it merges
      - every file was renamed by the migration step `json5-data-files` (gone since epic `repo-split` Q45)
    - node only, NOT in the `spell-epic` barrel
      - it loads in plain `node` too (the docs tools' `details.js` ...):
        it imports spaces' editor by its relative path
  - `tool/` -- the `epic` tool (`epic`), node only, never bundled into the pack.
    - It reads and writes `<epic-*>` markup only (through `Markup`),
      and refuses a doc still in the old markup.
      - Every live doc was converted at the switch (P12 of epic `epic-components`);  the converter went in epic
        `repo-split` (Q45).
    - Its rules for a doc's DATA (ids, statuses, review marks, prose):  [PLAN-DOC.md](tool/PLAN-DOC.md)
    - `migrations/`:  the named, dated steps that bring an older epic page up to today's markup (`Migrations`)
      - `epic migrate` runs them, by page kind (`MigrateCommands`;  PLAN-DOC.md, "Migrations")
    - its template:  [plan.html](tool/templates/plan.html), in `tool/templates/`
    - SAGA PAGES (epic `epic-workflow` P15):  an epic page of kind "saga", so every verb edits it
      - its file:  `sagas/<id>/<id>.saga.html`, marked `<epic-page kind="saga" saga="<id>">`
      - named `SAGA:/<id>` (`PlanDocFiles.findDoc()`)
      - made by `epic saga page <id> [--force]` (`SagaPage`) from [saga.html](tool/templates/saga.html):
        its Overview (the saga's purpose, Done so far, Ideas not done yet), Epics, Questions, Todos, Log;  one file
      - its Epics:  `<epic-cards saga>`, the epics whose page names the saga, drawn from the page server
        (`GET /api/epics/saga`, `SagaEpics`), asked again as epic pages change
        - as the Epics page's own list and cards (epic `epic-engine` I39):  an `<epic-list no-favorites>` of
          `<epic-card>`s in its shadow root, with each epic's star and last-worked day
      - reviewed as an epic page is:
        - marks and comments in its own inbox beside it (`ReviewInbox.pathFor()`)
        - the review routes and comments routes take it (`SAGA_PAGE`)
        - its Send wakes `/epic review SAGA:/<id>`
    - the page server's review routes ([reviewRoutes.ts](tool/reviewRoutes.ts)) and what they call:
      - `ReviewInbox`:  the inbox file
      - `ReviewStart`:  the pill's start, and WAKING the epic when Send or Do Now finds nobody listening
        (epic `epic-workflow` P16:  its session typed into, or a new session in its window)
    - `InboxMonitor`:  `epic session listen`, ONE look for the plugin's MONITOR (`monitors/monitors.json`), one beside
      every session (epic `epic-engine` P18):  an epic's session listens to its page whenever it's open
      - the epic:  the session's title, else its worktree;  none, it does nothing
      - holds the inbox for the session (`setListening()`, with the monitor's pid:  live while it runs, no heartbeat)
        unless another listener holds it
      - says what's waiting, the `📬` line to print, which files to watch, and when to look again
    - `InboxPoller` (`spell-epic/tool/InboxPoller.mjs`, run by `monitors/listen.mjs`):  the monitor itself (epic
      `epic-engine` P19)
      - plain JavaScript, node's own modules only:  bare node, about 45MB a session;  the look, under `tsx`, about
        150MB, runs for a moment as its own process.  NEVER import TypeScript into it:  node's TypeScript support
        alone adds about 28MB
      - looks at start, a few seconds after a watched file changes, and when the last look said to
      - prints NOTHING while idle (no tokens);  Owen's Send:  the look's `📬` line, once per batch, which wakes the
        session, which takes the work with its own `epic inbox wait`
    - the inboxes, one shape of comment for both (`CommentList`):
      - `ReviewInbox`:  an epic page's marks and comments
      - `GuideInbox`:  a docs page's comments and its Send (epic `epic-workflow` P13)
    - SAGAS (P15):  `Sagas`
      - the shared list in Owen's order, `sagas/sagas.json5`:  node only, loaded by path by the docs index too
      - each guide's saga meta:  `guides()`, `sagaOf()`, `withSaga()`
      - `SagaCommands`:  `epic saga list | set | create | move | title | rename | page`
      - `epicRoutes`' `GET /api/epics/pages` answers the epic's saga too (`<epic-page>`'s meta line)
    - `SeeAlso` (P13):  an epic's See Also, GATHERED from its files, never kept by hand
      - its guide (`<a slot="durable">`), its `details/` pages, every `guides/` page its page and parts link to
      - which epic a docs page belongs to (`ownerOf()`):  where that page's Send hands its comments;
        none:  the standing `feedback` (`epicFor()`, epic `epic-engine` T9)
      - read by:
        - the page server:  `GET /api/epics/pages` (`<epic-page>`'s See Also box), and the docs tools' comments routes
        - `epic inbox wait <name>`:  a guide's Send wakes it
        - the docs tools' `GuideChanges` and `PageInboxes` (the pages no epic owns:  `feedback`'s)
    - `EpicTargets` (P15):  what a link to a saga, an epic, a phase or an item finds in a checkout
      - the page, the id, its title, what's broken (no saga, no page, no id, an epic under a saga it doesn't name)
      - read by:
        - the link check (`epic lint`, the docs tools' `doc-links.js --check`:  `problemsIn()`)
        - the openers (`epic pages link SAGA:/...`)
        - the page server:  [linkRoutes.ts](tool/linkRoutes.ts)
          - `GET /api/epics/target`:  `<epic-link>`'s title and short form
          - the typed `/saga/<saga>[/<epic>]`
    - The old hand-written prose shapes have ONE set of rules, `ProseShapes`:
      a `Net effect` paragraph, a code accordion, an option grid ...
      - `ProseRewrite` turns them into elements,
        for the tool's way in (`IncomingHtml`) and the converter's second pass alike.
- `components/__pack/` -- GENERATED, committed.  NEVER edit.
  - Built by `spell-pack build` (`yarn pack:build`).
  - `pack/` until P18 of `people-and-orgs`:  every pack is built inside its families' folder, `__` marking it as no family.
  - `epics.catalog.ts` -- tag => family folder + skeleton, read from the vocabularies.
    Its second line records the hash of the sources it was built from.
  - `epics.entry.ts` -- the script's entry:
    `SpellUI.registerPack({ name, prefix, catalog, define })`, where `define()` imports every family barrel
  - `epics.pack.js` -- the CLASSIC script (an IIFE) a page loads, minified
    - Solid, the kit's element and Spell UI's shared modules are NOT in it:
      `solid-js`, `@solidjs/web`, `spell/element`, `spell-ui/core`, `spell-ui/forms`.
    - It takes them from the docs bundle's `globalThis.SpellUI.packModules`,
      so a page has ONE Solid and one `UIComponent`.
      - `spell/element` there is Spell UI's core, which carries it.
- `tools/` -- every docs page's tooling:  the scripts, their route modules, and `_assets/` (see "Layout", "Scripts").
  - Plain `node` scripts (`.js`) beside `tsx` ones (`.ts`).
    `tsconfig.json` takes both (`allowJs`).
  - The tools and the rest of `src/` import each other by package name (`spell-epic/tools/pages.js`), as every file
    does ([the repo's AGENTS.md](../AGENTS.md), "Imports").
  - Their tests:  in the repo's `tests/tools/`, run by the `node` project (`yarn test`).

## Rules

- Change an element -- its vocabulary above all, or any file under `components/` or `src/` -- then:
  1. `yarn pack:build` (`spell-pack build`)
  2. in the same change, commit the pack, `components/__pack/`, and the docs data the build writes too, `docs/__data/`
  - `yarn pack:check` exits 1 while either is stale, and the pack's test (`pack.test.ts`) runs it:
    so `yarn test` and `yarn review` fail until you build.
- Elements are written on `spell/element`:  `import { E } from "spell/element"` (`E.UIComponent`, `@E.state` ...).
  - A file that also uses Spell UI's own pieces (`E.IconGlyph`, `E.LoadableBody`, `E.Converters` ...)
    takes `E` from `spell-ui/core` instead:  the same names, and Spell UI's on top (epic `people-and-orgs` P17).
- They import Spell UI's code ONLY from `spell-ui/core` / `spell-ui/forms`, as a Spell UI family does.
  - Solid only from `solid-js` / `@solidjs/web`.
  - The build fails on any other Spell UI, `spell/element` or Solid import, which the page couldn't share:
    a deeper `spell-ui/...` or `spell/element/...`, say.
  - Another shared module:
    add it to Spell UI's `packModules` AND to `PACK_MODULES`, in the kit's
    [packModules.ts](../../src/element-tools/packModules.ts).
- Every tag starts `epic-`:  `<ui-root>` knows the pack's tags by that prefix.
- Every sheet NAME starts `epic-` too:  `elementSetup = { styleSheets: { "epic-item": itemCSS } }`.
  - Spell UI keeps ONE sheet per name for the whole page, and the first class to register a name wins.
  - So a bare `item` drew `<epic-item>` with `<ui-item>`'s sheet, on any page that had both (I9).
  - [The barrel's test](../tests/components/index.test.tsx) checks every class the barrel exports.
- The tooling's data files are JSON5, read and written through `DataFile` (`spell-epic/data/DataFile`, see "Overview"):
  never `JSON.parse()` / `JSON.stringify()` on one, which would refuse or drop Owen's comments.
  - A new one:  `<name>.json5`, its path given to `DataFile`.
  - A browser reader drops comments before `JSON.parse()` (`commands.js`' `parseData()`).
- A change to epic page markup adds its MIGRATION STEP in the SAME commit (epic `epic-workflow` P8).
  - epic page markup:  what the tool writes, or what an element reads
  - the step:  a class in [migrations/](tool/migrations/), last in `Migrations.all`, with its test
  - another page kind's markup:  its step in the docs tools' `STEPS` ([migrate.js](tools/migrate.js))
    - a page's CONTENTS too, where a component replaces markup written by hand (epic `epic-engine` P3, Owen on I26:
      "page controls AND contents"):  `components-not-markup`
  - Then `epic migrate --all --dry-run`, to see what it would change.
  - Once it's on `main`, `epic migrate --all --notify`:  idle epics are migrated, running ones are told.
    - What the receiving session does:  the epic skill's "Migrations".
  - How a step is written:  [PLAN-DOC.md](tool/PLAN-DOC.md), "Migrations".
- Every element has a page in Epic UI, [`docs/`](docs/index.html), served at `/components/epics/`.
  - Change it in the SAME commit as the element, then `yarn site:data` (see "Epic UI, the docs set").
  - Its pages are tracked here, per branch:  a worktree's show at `/worktrees/<w>/components/epics/` until it merges.
- A pack drawn by pages EVERY checkout shows (the shared `epics/`, `guides/` ...):
  those pages load `main`'s pack, through the main checkout's page server.  So:
  - small fixes straight on `main`
  - real changes in a worktree, merged promptly:  until then, those pages show `main`'s elements

## Commands

- `yarn pack:build` ~== `spell-pack build` ~== `spell pack build epics`
  - the catalog, the entry and the script, into `components/__pack/`
  - then Epic UI's data, `docs/__data/` (`yarn site:data`)
- `yarn pack:check` ~== `spell-pack check` ~== `spell pack check epics` -- exits 1 while either is stale
- `yarn site:data [--check]` -- Epic UI's data ([EpicUISite.ts](site/EpicUISite.ts), [its script](../scripts/site-data.ts))
  - rerun after changing an element or a page's sections, and commit `docs/__data/`
- `yarn test` -- `node` (`src/`) and `browser` (`components/`, chromium)
  - the root's `yarn test` runs them as `epics:node` / `epics:browser`
- `yarn ts`, `yarn lint`, `yarn format`, `yarn review`
- the docs tools' own (see "Scripts"):

  ```text
  yarn docs:update | docs:index | docs:new | docs:open | docs:link   ~==  epic pages update | index | new | open | link
  yarn plan-doc,  yarn details
  ```

## Epic UI, the docs set

`docs/`:  the pages of the `<epic-*>` elements, a COMPONENT SET (epic `epic-workflow` P10).
Laid out as every set is since P18 of `people-and-orgs`
([spell-app's AGENTS.md](../../spell-app/AGENTS.md), "COMPONENT SETS").
- Served by the kit's page server, as spell-epic's part of its settings names it (its `package.json`'s `"pageServer"`
  `"componentSets"`, `componentSets()` in [settings.ts](../../src/server/page/settings.ts)), and by the epic server:
  - at `/components/epics/`
  - and at `/worktrees/<w>/components/epics/` for a worktree's
  - The top bar's Epic/UI tab opens it.
  - Its folder's own address (`/packages/epics/docs/...`) is NOT a way in:
    its pages load their site bundle from `_assets/` beside them, which only the set's address has.
- Tracked and versioned with the branch, like code:  an element's page changes in the same commit as the element.
- In Spell UI's page shape:
  - the top bar, a side column of every element by group, the page's contents list, the theme switch
  - The pages load Spell UI's site bundle (`_assets/`, laid over the folder by the page server), every set's since
    epic `epic-engine` (the other sets' own build, its `sets/`, before).
    It loads the epics pack for the live examples.
- ONE flat folder:

  | Path | What |
  | --- | --- |
  | `index.html` | the set's home, The Epic Elements:  how they nest |
  | `<tag>.html` | one page per element, `epic-item.html`;  every page but the home is an element's |
  | `__parts/layout.html` | every page's chrome, written once:  the brand, the side column, the epics pack's `<ui-components>` |
  | `__parts/footer.html` | every page's footer |
  | `__data/pages.json5` | HAND-KEPT:  the side column's groups, the elements with no page, the side column's own links |
  | `__data/components.json5`, `__data/search.json5` | GENERATED, committed:  `yarn site:data` |

- A new page:
  1. copy a page like it, or the shared template once it's been moved on at the merge
     ([the component set docs template](../templates/component-set-docs.html))
  2. `yarn site:data`
  - An element added to the pack shows in the side column by itself (under Other, `planned`) once the data is rebuilt.
- Links are written as from the page's SERVED address (`/components/epics/x.html`):

  ```text
  ../../                             the checkout's root:  spell-app's, which serves the set
  x.html                             a sibling
  ../ui/ui-button.html               a Spell UI page
  ../app/spell-viewer.html              an App UI page
  ../../spell-epic/src/components/   this repo's files, through spell-app's `spell-epic` link
  ../../guides/x.html                a page of the content folder
  /_epic/pack/epics.pack.js          the epics pack, the epic server's engine route (the layout's `<ui-components>`)
  ```

  - The layout and footer are served from `__parts/`:  one level deeper, `../../../` to the root.
  - Before epic `epic-engine` I37 they linked this repo's files at spell-app's old `../../packages/epics/...`.
  - `doc-links.js` checks them that way, from spell-app's checkout (`--root`), through its `spell-epic` link:
    `yarn tsx src/tools/doc-links.js --root <spell-app> --check <spell-app>/spell-epic/src/docs/*.html`.
    - From a worktree:  a `--root` folder shaped like spell-app's, its `spell-epic` the worktree.
- Check a page:  `node src/tools/check-spell.js src/docs/<tag>.html`, from spell-epic's root.
  It loads the page from the page server, at its address.
- Comments (epic `epic-engine` P2, T3):  Owen comments on these pages as on a guide.
  - So he does on App UI's and Brand's, spell-app's sets, which load the same script (see "Comments" below).
  - The bullhorns, the pane, the threads and Send, all of "Comments" below.
  - Each page loads the comments by themselves, after the site's bundle, in its `<head>`:
    `<script defer src="/_epic/assets/spell-comments.js">` (the template has it too).
    - It's the docs runtime's comments ([spell-doc-comments.js](tools/_assets/spell-doc-comments.js)) and its
      toolbar ([spell-doc-toolbar.js](tools/_assets/spell-doc-toolbar.js), epic `epic-engine` T11), and nothing else
      of it:  these pages load Spell UI's site, not the docs bundle.
    - It holds NO Spell UI:  the page's own draws its `<ui-*>` markup, so there's one Spell UI on the page
      (epic `epic-engine` I18:  two handle every event twice).  The build checks it.
    - Its look:  `spell-comments.css` and `spell-toolbar.css`, which it links.
    - The site's router swaps `main` for the next page:  the toolbar and the comments are taken down and wired again
      for it.
  - The masthead is the page header:  the page's bullhorn over its corner, Send under the title.
  - A TOOLBAR (epic `epic-engine` T11;  Owen, 2026-10-20:  "Epic UI pages should have a toolbar"):  a guide's, built
    by the same code (`titledItems()`, `toolbarMenu()`), first in the page's article, under the masthead
    - a button per top-level section (its icon and title, `1. Example` shows `Example`), the section being read
      marked;  the comments' bullhorn at its right, its orange count, each click the next thread waiting on Owen
    - in the site's page bar, `<ui-sticky class="site-sticky-bar">` (`SiteSections`' `PAGE_BAR`):  it sticks at the
      site's top (under the narrow screens' top bar), the section titles stick below it, links land below both
    - the docs pages' ivory band, out to the page column's edges;  marks only when the titles don't fit (390px)
    - the site's "On this page" column stays (1200px and wider):  it lists the nested sections too, and holds the
      site's header and look controls (J:  keep both)
  - Cmd / Ctrl + K, on a page that takes comments:  the docs pages' jump dialog, taking a comment's id (`M3`) or any
    id on the page;  anything else typed goes to the site's SEARCH, words and all (J:  one key for both;  `/` still
    opens the search straight away).  Elsewhere the key stays the search's.
  - Kept in `<page>.inbox.json5` beside a page, git-ignored.
  - No epic owns these pages, so their comments go to the standing epic `feedback` (epic `epic-engine` T9):
    Send says "feedback is listening", or "nobody is listening:  Send wakes feedback".
    `epic comments list` names each by its served path:  `components/epics/epic-item.html#M1`.
  - [check-comments-epic-ui.mjs](demo/check-comments-epic-ui.mjs) checks them in a browser.
- The epic's write-up and how-to guides stay in the shared guides:
  [Epic Pages as Components](../../spell.epics/guides/epic-components/epic-components.html),
  [Reviewing an Epic Page](../../spell.epics/guides/epic-components/review.html),
  [The Epic Tool](../../spell.epics/guides/epic-components/tool.html),
  [Epic Page Colours](../../spell.epics/guides/epic-components/colours.html).

## Layout

The pages live in SHARED root folders;  the tooling lives here, in `tools/`.
- epics `shared-content` and `claude-design` P4
- the tooling was in the docs package's own `tools/` until P16 of `people-and-orgs`
- The pages and epic pages are root folders of every checkout.
  - NOT the templates (epic `epic-eject` T11):  they're spell-epic's own [`templates/`](../templates/), served at
    `/templates/` by both page servers (an engine route), and found by `epic pages template [<name>]`.
    - A repo's own extra templates:  `repoTemplates` in its `.epic/config.json5`, a folder from the checkout's root.
  - They're the shared content repo's, `../spell.epics`, beside the main checkout
    ([spell-app's AGENTS.md](../../spell-app/AGENTS.md), "Shared content").
  - They're NOT tracked by spell-app.
  - Page paths below are from the checkout's root, and so are page URLs (`/guides/solid/solid-2.html`).
  - One copy for every checkout:  an edit shows in every worktree at once, and never conflicts on merge.
  - Committed by itself after every Claude turn (the `Stop` hook):  never `git add` / commit a page by hand.
  - NEVER run git inside a shared folder:  it's the shared repo there.
    Tools run git in the spell-app checkout.
  - Before 2026-10-05 they were all in the docs package's `content/` folder.
    - The old URLs answer "not found":  the page server redirects none (Q30 of `people-and-orgs`).
- `tools/`:  the tooling, tracked here and versioned per branch.
  - the scripts (see "Scripts")
  - their tests:  in the repo's `tests/tools/`, by the same names ([fuss.test.ts](../tests/tools/fuss.test.ts))
  - `_assets/`
  - Run a script from spell-epic's root, or through its `yarn` script:

    ```sh
    node src/tools/check-spell.js guides/x.html
    ```

  - A page argument is a page path, or from an area ([`pageFile()`](tools/pages.js)):
    `solid/solid-2.html` is a guide.

The shared folders:
- They're the repo's CONTENT FOLDER's (`contentFolder` in its `.epic/config.json5`;  `../spell.epics`), read and
  written there, NEVER through a link at a checkout's root (epic `epic-eject` P12):
  - `EpicConfig.contentOf(<checkout>)` ([EpicConfig.ts](config/EpicConfig.ts));  `pages.js` `CONTENT`
  - a page's PATH is from the content folder (`epics/seo/seo.plan.html`:  `pagePath()`), as the page servers serve it
    at `/`;  `pageAt()` turns one back into its file, `inContent()` maps a path through an older checkout's link
  - the kit's page server mounts it at `/` when the running epics' route module says where it is
    (`serveContent()`, `runningRoutes.ts`)
- [pages.js](tools/pages.js) has a constant for each, and `findPages()` walks them.
  - `PAGES`, `GUIDES`, `EPICS`, `TEMPLATES` (the engine's, `templates/...` by `pagePath()`), `REPO_TEMPLATES`
- [The docs' home page](../../spell.epics/pages/index.html):  a routing page (P5 of `claude-design`).
  - One card per area, in the top bar's order, each with its count:
    Guides · Sagas · Epics · Epic/UI · Spell/UI · App · App/UI · Brand · Templates
    - Owen's order (2026-10-11, epic `epic-workflow` J40);  the slashed names are the tabs' labels (J41).
    - Sagas was Goals until P15 of `epic-workflow`:  its tab opens the Sagas list page,
      and lights on the saga pages and the parked goal sets (`goals/`) too.
    - Spell/UI, Epic/UI and App/UI are COMPONENT SETS (each repo's `"pageServer"` `"componentSets"`, merged and read with
      `componentSets()` in `spell/server/page`), in Spell UI's page shape.
      Their cards link the sets' addresses:

      ```text
      spell-ui/docs/          served at  /components/ui/
      spell-epic/src/docs/    served at  /components/epics/
      spell-app/app/docs/     served at  /components/app/
      ```

    - NEVER run `epic pages index` from a branch whose sets' addresses `main` doesn't serve yet:
      it writes the shared home, which `main`'s page server shows too.
  - `epic pages index` writes the cards, between the `areas:start` / `areas:end` markers.
    Edit only outside the markers.
  - NOT `index:start` / `index:end`:  on those, an older checkout's `index.js` would stop on the shared home,
    instead of writing its three lists back into it.
- Each area's LIST PAGE, its top-bar tab's home:
  `index.html` in `epics/`, `guides/`, `sagas/`, `templates/` and `brand/`.
  - A card per page (epics open first).
  - `epic pages index` writes them, between the `index:start` / `index:end` markers.
  - A missing one is made from [`skeleton()`](tools/index.js).
  - The Epics page (epic `airplane` P8, Owen 2026-10-10) sorts its cards into five GROUPS.
    - ELEMENTS since epic `epic-engine` P3 (the `epic-list` family, Epic UI's "The Epics page"):
      - `<epic-list>`:  the groups, their headings and counts, the saga chips, the sort and filters
      - `<epic-card>`:  one epic, drawn from its attributes;  its star
      - `<epic-sort>`:  the sort buttons, which the runtime puts in the page header (`wireEpicSort()`)
      - `docs index` writes the list and its cards ([`epicListHtml()`, `epicCardHtml()`](list/EpicCards.ts)), flat:
        the list places every card itself, from its shadow root (`::slotted()` rules), so it never moves one
      - before P3 the page held hand-made groups (`div.spell-epic-group`) and the docs runtime moved cards between
        them;  `docs index` writes the list anew, so no migration step
    - Each group is a small heading with its count;  cards are alphabetical by title within each.
    - Or newest first:  the page header's sort buttons, A–Z and Date (`<epic-sort>`;  Owen, 2026-10-13).
      - They sort the cards inside each group by title, or by when each was last worked on.
      - Remembered in this browser (`spell-epics-sort`).
    - A group with no card showing isn't drawn (hidden by a saga chip, or by the runtime's state chips).
    - On the page server, the running epics' route module adds the running epics' cards
      ([runningRoutes.ts](list/runningRoutes.ts), `RunningEpics`), and marks every card `running` and `favorite`
      as they are now.
    - The groups:
      - Favorites:  starred, whatever their state.  A starred epic shows only here.
      - Active:  phases left.  In progress, and paused (its mark grey).
      - Planning:  future, or no phases yet
      - Urgent:  every phase done, items waiting on Owen (the `errors` state)
      - Done
    - Each card's state mark:  `<epic-card>` draws it from its facts (`phases`, `updated`, `urgent` ...) as of now,
      by `EpicState`;  a session running for it (`running`) is never paused.
    - Each card's STAR, top right:
      - Yellow when starred (the page's yellow, `--spell-favorite`), else its outline, grey.
        - Owen, 2026-10-10 (`airplane` J22):  "make it yellow".  The brand's gold-brown before.
        - The one yellow that doesn't mean "open".
      - A click stars or unstars it at once:  the card sets its own `favorite`, and its list regroups.
      - Then the card posts it to [epicRoutes.ts](tool/epicRoutes.ts) (`POST /api/epics/favorite`).
        - That writes the ONE shared file, `favorites.json5` in `epics/`:  a JSON list of names.
        - through `SRV.FileOperations.save()`, as every route module's save
        - its answer, every starred epic, stars every card (`epic-favorite`):  another window may have starred one
        - refused:  back as it was, and a toast says why
      - The page server marks every card by it as it serves the page.
      - From `file://` the stars show, disabled, saying why.
    - The day it was last worked on, bottom right, no year (`10/9`).
      - Its `title` is the full date and time.
      - It's the latest of:
        - the epic page's `updated`
        - its last log line (the `log.html` part)
        - its branch's last commit (one `git for-each-ref`)
      - A running epic's card keeps the date `epic pages index` wrote when it's later than its doc's.
    - SAGAS (epic `epic-workflow` P15):  each card names its saga, a small label
      (the saga's title, its purpose the tooltip).
      - Above the groups, a row of SAGA CHIPS, one per saga with epics, in Owen's order (`<epic-list sagas>`),
        then "No saga", each with its count.
        - A saga no epic names gets no chip (epic `epic-engine` P3:  its chip could only show nothing).
      - A click shows only that saga's epics, by the state chips' rule (`StateFilter.nextShown()`).
        - remembered in this browser (`spell-epics-sagas`), for every Epics page
      - The groups count only the cards that show.
      - each card carries its saga in attributes (`saga`, `saga-title`, `saga-purpose`), for the list and the page
        server
    - The runtime's state chips on the section's title filter the cards too (`class="spell-epics"`, each card's
      `data-status`), as on a saga page's lists.
    - The docs' home page's Epics count is by the same groups:
      `2 favorites · 5 active · 2 planning · 17 urgent · 7 done`.
  - The GUIDES page (epic `epic-workflow` P15):  a section per saga, in Owen's order, then "Misc", last.
    - Each is headed by the saga's title linking its saga page (made or not yet), its purpose under it.
    - A guide names its saga in its head, right after its description meta:
      `<meta name="spell-saga" content="<id>">` (`Sagas.withSaga()` writes it, `sagaOf()` reads it).
    - None, or a saga not in the list:  Misc.  `docs index` prints both kinds.
    - `epic saga rename` rewrites the metas.
  - The SAGAS page:  a card per saga, in Owen's order (`sagas/sagas.json5`).
    - its title linking its saga page, its purpose, how many epics and guides name it
    - a note on the parked first sagas (`goals/`)
  - The Templates page also holds the "Writing docs" notes;  the Brand page, its folder's files.
- `guides/`:  every other page.
  - [The changelog](../../spell.epics/guides/changelog.html):  what the repo shipped, newest first.
    - Every `/isolate` and `/epic` adds to it ([spell-app's AGENTS.md](../../spell-app/AGENTS.md), "Changelog").
  - A doc:  `<topic>/<topic>.html`, folder and file in lower-kebab-case, e.g. `solid/solid-2.html`.
    - One-file docs with nothing beside them MAY sit at the top level:  `<name>.html`.
    - `<topic>/experiments/`:  runnable scripts backing the doc's claims (see "Experiments").
    - `<topic>/<topic>.md`:  a distilled version for agents, when agents need the doc's rules (see "Agent rules").
  - `spell-docs/`:  how the pages work, and the spell-ui problems they hit.
    - [spell-docs.md](../../spell.epics/guides/spell-docs/spell-docs.md):  how the pages work
    - [spell-ui-findings.md](../../spell.epics/guides/spell-docs/spell-ui-findings.md):  the problems
- `templates/`:  starting points, one per kind of doc (see "Templates"):  spell-epic's own, not the content folder's.
- `epics/`:  epic pages, one per `/epic` session, each `<name>/<name>.plan.html` (see "Epic pages").
  - `<name>.html` before 2026-10-04.
    - The tools find either ([`planDocIn()`](tools/pages.js)).
    - A worktree cut before keeps the old name until it merges `main`.
    - The old URL answers "not found":  no redirect (Q30 of `people-and-orgs`).
  - A SPLIT doc's bodies are part files, `<id>.html` in its folder's `parts/`:
    the page loads them when opened (see "Epic pages").
    - `.htm` before Q12 of `epic-components`:  read no more.
    - Every page walker skips `parts/` folders, so a part is never taken for a page.
      - `findPages()`, `spell ssr`
- `pages/details/`:  DETAILS PAGES, each `<slug>.html`.
  - A question Claude explains, and Owen answers on the page (`/details`, see "Details pages").
  - Scratch:  ignored by the shared repo's git, swept after 14 days.
  - An epic's go in its folder's `details/`, kept (auto-committed with the shared repo).
  - CHOICE pages live there too (see "Choice pages").
- `brand/`:  the brand pages, and the design system's push record.
  - the pony, from Claude Design;  the rest from P11 of `claude-design`
  - Not in `findPages()`'s areas:  `docs update` doesn't check them.
    - its constant:  `BRAND`, in [pages.js](tools/pages.js)

In `tools/`:
- `_assets/`:  shared page assets.
  - Pages load them from the epic server's ENGINE ROUTE, the same for every repo:  one engine per machine.
    - `/_epic/assets/<file>`, and the pack from `/_epic/pack/`
    - epic `epic-eject` P7;  `spell-epic/server`, `EpicServer`
    - Before P7, from the checkout's root:  `<up>packages/epics/tools/_assets/`.
      - The migration step `engine-asset-routes` moved every page over (gone since epic `repo-split` Q45);
        `engine-asset-paths` (`migrate.js`) moves the saga pages, goal sets and brand page it missed (I63).
    - A page not migrated (a spell-app worktree from before P7) still loads THIS engine's files on the epic server:
      it serves the old paths from the routes (`legacyEnginePath()`).
    - From `file://`, `check-spell.js` answers the routes from the engine's folders (`engineFileFor()`).
  - `spell-doc.css`:  page layout, and what UI doesn't cover.
    It reaches into widgets via UI tokens and `::part()`.
  - `spell-doc-runtime.js`:  page behaviour.
    - the toolbar, sticky headers, scroll-follow, code colors
    - generic:  an epic page's `<epic-*>` elements do their own (see "Epic pages")
    - the comments are their own module, `spell-doc-comments.js`, which it imports (epic `epic-engine` P2, T3);
      so is the toolbar, `spell-doc-toolbar.js` (its menu, items, fitting their titles, the jump key:  T11);
      `spell-doc-helpers.js`, what they share
    - EVERY control it or the comments draw is a Spell UI component, never a raw `<button>` (epic `epic-engine`
      I26;  Owen, 2026-10-19:  "Why are we not using <ui-xxxx> or <epic-xxx> components for these pages?"):
      - an icon button:  `<ui-button circular basic size="mini" icon="..." title aria-label>` (the comments'
        `iconButton()`), its `title` on the inner button too (`titleInside()`)
      - its icon centred BY THE COMPONENT:  no hand-set icon size, offset or `place-items` on it.
        Measured:  within 0.4px of the button's centre, at 1200 and 390px, light and dark.
        The raw `<button>`s it replaced sat 1.3-1.7px off.
      - a look of its own through the component's tokens (`--ui-button-basic-border-width: 0px` for the plain pen,
        trash and ×) or `::part(button)` (Send's dashed ring), never by rebuilding the button
      - on an epic page, the `<epic-*>` element's own controls
      - the page's chrome too (epic `epic-engine` P3), never an HTML string or a `createElement("div")` tree (the
        helpers' `el()` makes elements):
        - the TOOLBAR, every page's:  Spell UI's menu, `<ui-menu class="spell-toolbar" secondary>` of `<ui-item>`
          links (`data-rail`, `selected`), badges `<ui-label>`s;  its bullhorn an item of it (`<ui-item link>`)
        - the jump dialog:  a `<ui-modal>`, its waiting threads a `<ui-menu vertical secondary link>`
        - the state chips and "N hidden · show all":  the epics pack's `<epic-state-filter>` and
          `<epic-hidden-note>`, the same elements an epic page's sections and toolbar draw
        - the one-line head's divider:  the breadcrumb's own (`oneLineHead()`)
        - the header's tools (Send, a page's own, the page's bullhorn):  ONE row, `addHeadTool()` (I38)
      - the COMMENTS (epic `epic-engine` P3):  each thread an `<epic-thread>` in an `<epic-threads>` box, the
        comment pane an `<epic-comment-pane>`, an old page note's head line an `<epic-page-note-head>` (the epics
        pack);  a thread's and a note's fold are their own shadow markup now (J16's two raw buttons)
        - Owen's field in the pane or a thread stays a native `<textarea>` the comments' code makes and slots in:  it
          lives through every redraw, the cursor with it
    - a block's own controls share its ONE ACTIONS ROW (`addBlockAction()`, `.spell-block-actions`), the bullhorn
      first, then a table's expand button:  never a row or corner of their own (see "Comments", WHERE it sits)
  - `spell-comments.css`:  the comments' look on the page, `@import`ed first by `spell-doc.css`:  the bullhorns,
    Send, Owen's field, where a box of threads sits;  the threads and the pane draw themselves (their own sheets).
  - `spell-toolbar.css`:  the toolbar's look and the jump dialog's, `@import`ed by `spell-doc.css` (which keeps where
    a docs page puts the toolbar), linked by `spell-comments.js` (epic `epic-engine` T11)
  - `spell-comments.entry.js` -> `spell-comments.js`:  the toolbar and the comments ALONE, for Epic UI's pages
    (see "Epic UI, the docs set").
    - no Spell UI or Solid in it:  it draws with the page's
    - GENERATED by [bundle-spell-ui.js](tools/bundle-spell-ui.js), with `spell-ui.js`.  NEVER edit `spell-comments.js`.
  - `spell-ui.entry.js` -> `spell-ui.js`:  the ONE classic script a page loads.
    - Solid + spell-ui + the runtime
    - GENERATED by [bundle-spell-ui.js](tools/bundle-spell-ui.js).  NEVER edit `spell-ui.js`.
  - `emoji/`:  UI's emoji name chunks, as classic scripts, `<set>/<letter>.js`.
    - The bundle loads one lazily, on first use of a name.
    - both sets:  `cldr`, `fomantic`
    - GENERATED with `spell-ui.js`:  never edit.
  - No `plan-doc.css` any more (deleted at P14 of epic `epic-components`, 2026-10-08).
    Epic pages style themselves through their `<epic-*>` elements.
  - No page script for details and choice pages since epic `epic-workflow` P12.
    - They're written in the epics pack's elements, which draw and send them (see "Details pages").
    - `details.css`, `details.js` and `syntax-choices.js` are gone.
    - `spell-doc.css` has their pages' few own lines ("Pages Owen answers on").
  - `syntax-choices.css`:  the spell syntax guide's boxes and bar (`spell-syntax.js`).
    - A choice page drew with it before P12.
  - `goals.css`, `goals-live.js`:  the parked goal sets' pages, in the content folder's `goals/`.
    - their look, and their live buttons:  PARKED since 2026-10-11, each says "TODO:  this will ..." (`parked()`)
    - `goals.css` holds every rule the saga pages took from `plan-doc.css`, which they no longer link.
  - `commands.js`:  command reference pages ([the commands template](../templates/commands.html)).
    - It draws their tables from the page's JSON, then loads `spell-ui.js` itself.
    - Built from Spell UI's elements (`<ui-section>`, `<ui-table>`, `<ui-statistic>`), never markup in strings
      (epic `epic-engine` P3).
    - The page loads `commands.js` INSTEAD of the bundle.
  - `spell-syntax.js`, `spell-syntax.css`:  [the spell syntax guide](../../spell.epics/guides/spell-syntax/spell-syntax.html).
    - It draws one table per module of the base spell language, a row per rule class.
      - from spell's generated [spellSyntax.json](../../spell-parser/src/spell/spellSyntax.json) (`yarn spell:gen:syntax`, in spell-parser)
    - Each row:
      - the class's name, opening its source
      - its syntaxes and aliases
      - an example of each syntax in each writer
      - its purpose
    - Every section starts open, with Expand all and Collapse all in the toolbar.
    - Built from elements, never markup in strings.
      - its buttons `<ui-button>`s (epic `epic-engine` P3, J19):  the pencils, resets, wands, Expand all, Collapse all
      - the boxes native `<textarea>`s, a reset made the first time its box changes
    - Its boxes and toolbar are the old choice page's (`syntax-choices.css`, `choicesRoutes.ts`).
      The page names its rows on `<body data-choices-rows>`.
    - Each row's wand adds a comment on it ("Provide more details here"):  see "Comments".
    - Then it loads `spell-ui.js` itself, as `commands.js` does.
  - `core-reference.js`:  [the core reference page](../../spell.epics/guides/targets/core-reference.html), epic `python-target` P29.
    - It draws one table per core file, from two lists:
      - core's [core.declarations.json5](../../spell-parser/src/core/core.declarations.json5)
      - py's [not_ported_yet.json5](../../spell-parser/src/py/core/not_ported_yet.json5)
    - Both are read from the checkout serving the page, so each branch shows its own core.
    - Built from elements, never markup in strings (epic `epic-engine` P3, J19):  light-DOM `<ui-section>`s and
      `<ui-table>`s, as a page writes them;  each file's source link a `<ui-button href>`.
      - The files' sections take the place of `[data-core-modules]`, never go inside it:
        in the placeholder's box they took the reading column's indent twice.
    - Then it loads `spell-ui.js` itself, as `commands.js` does.
- The scripts, `*.js` and `*.ts`:  see "Scripts".
- The goals tooling:  PARKED (epic `epic-workflow` P6), in spell-app's `goals.zip`.
  - Epic `epic-goals` rebuilds it ([goals' AGENTS.md](../../spell.epics/goals/AGENTS.md), in the content folder).

## Writing a page

- Start from a template:

  ```sh
  epic pages create durable|cheatsheet|commands <topic>/<topic>.html --title "Title"
  ```

  - It copies it into `guides/` (and for `commands`, its data as `<topic>.json5`).
  - It fixes the `_assets` paths for the page's depth, and lists it in the index.
- Every page (templates too) starts its `<body>` with the site header, `<spell-site-header root="../..">`.
  - `root` is the path from the page's folder to the REPO root.
  - The template tools (`docs new`, `epic create`, `goals new`) set it.
  - Everything that sticks or lands starts below it:
    `siteHeaderHeight()` in `spell-doc-runtime.js`, and its header's "Landing".
  - The element itself is `spell/server/site`'s `SiteHeader`, bundled into `spell-ui.js`.
  - Its tabs:  the content repo's `page-server.json5` `"siteTabs"` on a served page (epic `repo-split` P16);  from disk, the docs bundle's own
    (`DOCS_TABS` in `spell-ui.entry.js`:  the docs' areas and Epic/UI), epic `repo-split` I4.
- NEVER inline copies of `_assets`:  improve the shared files instead, and every page gets it.
- Pages MUST still open straight from disk (`file://`):  no ES modules, hence the one classic bundle.
  - But the openers (`docs open`, `epic open`) show them from this checkout's PAGE SERVER
    (`spell server`, see [server's AGENTS.md](../../src/server/AGENTS.md)).
    - It adds live reload, edit mode, and the server-only properties (Spell UI, Editor).
  - The exceptions fetch their JSON, so they draw their tables only from the page server:
    a `commands` page, the core reference page and the spell syntax guide.
    - From `file://` each says so, where they'd go.
    - Its `<body data-spell-needs-server>` makes `check-spell.js` load it from the server.
    - Why:  Owen chose a plain JSON file over a JS data file, or tables rendered into the HTML (epic `commands`, D4).
- The MEASURE:  every page is in the WIDE LAYOUT (`spell-doc.css`, "Layout").
  - The default on every page since epic `epic-engine` P2 (Owen, 2026-10-19).
    - Tried first as an opt-in, `<body class="... spell-wide">`, on the spell syntax guide and an epic page
      (epic `epic-workflow`, Owen 2026-10-12).
    - Before it, one centred column held EVERYTHING in `<main>`:  nice for prose, "horrible for tables".
    - Nothing reads `spell-wide` now:  a page on another branch that still says it is drawn the same.
  - The READING COLUMN:  `--spell-measure` wide, centred;  880px, its 16px gutters included.
  - `<main>` runs the window's full width, and each kind of block places itself:
    - BARS (the sticky page header and its toolbar, section titles, the footer, a bottom bar):
      background and rule edge to edge, their contents in the column
    - TABLES (`ui-table`, a bare `table`):  in the column, as prose (Owen, 2026-10-13)
      - an EXPAND button over each one's top right corner runs it the full width, less a 16px gutter
        - in the table's actions row, right of its bullhorn (Owen, 2026-10-19:  "The expand button should be to the
          right of the bullhorn rather than in its own line");  pressed (`active`) while wide, the row moving with
          the table's right edge
        - a `<ui-button circular basic size="mini">`, its icon arrows left right / to line, its tooltip on itself
      - a TWO-COLUMN table (every row two cells:  `VERB | DOES`):  its first column never wraps, the second takes the
        rest (Owen, 2026-10-19:  "Two column table -- left column shouldn't wrap");  too wide then (phone width), it
        scrolls sideways inside its own box, never the page.  `spell-doc.css`, "A TWO-COLUMN table".
      - remembered per table, in this browser (`spell-table-wide:<path>`):
        by the table's id, else the nearest id above it and which table it is under that (`p14#table-1`)
      - the runtime's `wireTableWidths()` measures how far in a table starts,
        so one inside a list item or an epic item's details goes out to the gutter too
      - no button at phone width:  the column is the page already
      - its HEADER ROW sticks under the stuck titles while its rows scroll past (Owen, 2026-10-19:  "make the table
        headers sticky";  epic `epic-engine` r4):  every page's tables, guides, details pages, an epic page's items
        - a `<thead>`, else a first row of `<th>`s alone
        - a COPY of it sticks, the runtime's `wireTableHeads()`:  a `<thead>` can't stick inside the box a table
          scrolls sideways in (every `<ui-table>`, a bare table at phone width)
        - `.spell-table-pin` (`data-spell-added`), a line of no height before the table, held at the line by the
          browser;  shown while the table's own header is under the line, its columns measured to the table's, moved
          sideways with it, wide or not;  it leaves with the table's last row, cut off at the line
        - the line (`tableLine()`):  an epic page's `--epic-stack` and the open item's line;  else the TOP-LEVEL
          section's stack (a nested stuck title joins its row);  a saga page's h2 and h3
        - `tableBoxes()` leaves the copies out:  no expand button on one, and no table key counts one
    - the page's HEAD (breadcrumb, title, toolbar):  one ivory band from the site header down
      - an epic page's header and subtitle too (`EpicPage.css`)
    - everything else, prose and insets (paragraphs, lists, asides, code, messages, cards, comment threads):
      the column, centred
    - a block that should run full width anyway:  `class="spell-full-width"`
    - Spell UI's message, feed and list are `display: contents` (their inner box is the block):
      in `<main>` or a section they get a box of their own, so they sit in the column too
    - a cheatsheet's filter bar is a bar:  edge to edge, its field and toolbar in the column;
      a page of card grids (`ui-cards.spell-grid`) widens the column to 1080px (`--spell-measure`)
  - A bare `<table>` is celled like a `ui-table celled compact`.
    - both draw their cells in `--spell-table-rule`
    - at phone width a bare table scrolls inside its own box
  - An epic page:  `<epic-page>`'s `--epic-inset` becomes the column's inset,
    so its bands run edge to edge and everything in them sits in the column.
    The pack itself doesn't change.
  - `--spell-column-inset`:  from the window's edge to the column, at least 16px.
    Worked out once in px, on `<main>`, so a block at any depth (shadow roots too) inherits the same number.
  - Its rules start `body.spell-doc-page`:  every page in the layout has the class, and it gives them the weight
    they had as `body.spell-wide`'s.
  - Phone width:  a 16px gutter, nothing wider than the window.
  - No page opts out:  none needed the old narrow measure (checked on every page, epic `epic-engine` P2).
- Sections are `<ui-section>` elements.
  - The page skeleton:  [spell-docs.md](../../spell.epics/guides/spell-docs/spell-docs.md), "Page skeleton".
  - Every piece of the markup:  [the ui-section test page](../../spell.epics/guides/spell-docs/ui-section-test.html).
  - The markup, nested for sub-sections:

    ```html
    <ui-section id="..." label="1. Summary" sticky collapsible dividing collapsed>
    ```

    - EVERY one is `sticky collapsible dividing collapsed`:  a rule under every title, and every section folds.
  - They MUST start folded:  every section and sub-section `collapsed`, every code block and aside without `open`.
    - The reader opens what they want (Owen, 2026-10-03:  "default to closed, open on demand").
    - The ONE exception:  the spell syntax guide starts with everything open (Owen, 2026-10-12), a comment in it says so.
    - The runtime remembers the reader's folds per page, and a link to an id unfolds what hides it.
  - its icon:  a `<ui-icon slot="icon" name="...">`, first inside it
  - a title with markup:  a `<span slot="label">`, instead of `label`
  - the old words (`header`, `subhead`, `info`, `ui-open` / `ui-close`, `ui-load`) went in epic `repo-split` P14 (Q45):
    `label`, `hint`, `description`, `ui-opening` / `ui-closing`, `ui-loaded`
  - A sticky page header above them, on EVERY page (the templates have it), so the title stays on screen:
    `<ui-sticky class="spell-h1"><header class="spell-page-head">` around the h1.
    - The runtime draws it on ONE line, as an epic page's (`oneLineHead()`;  Owen, 2026-10-13):
      - a copy of the breadcrumb goes into the h1:  `DOCS / SPELL SYNTAX`
      - the title in the crumbs' type (mono capitals), twice their size and bold
      - the breadcrumb above it hides
      - a lighter ivory than the toolbar under it
      - a "48 min read" chip after the title, its tooltip the word count (`wireReadingTime()`, epic `epic-engine` P14):
        prose at 230 words a minute, code words counted twice, folded sections included;
        none at phone width;  an epic page has none (Owen, 2026-10-24:  "We can ditch the '14 minute read' thing")
    - While a sub-section's title is stuck under its parent's, the two are one row (`wireStuckTrail()`):
      `2. Files on disk › 2.1 The repo`.
  - The OLD markup is for the saga pages only;  the runtime still drives it.
    - It's `section.s2|s3` > `<ui-sticky class="spell-h2|spell-h3">` > `<h2|h3 id>`.
- The runtime builds the page from that markup:
  - NO contents list (Owen, 2026-10-08:  "remove the Contents thing entirely ... it is useless").
    - NEVER hand-write one, or a "Contents" button.
  - The TOOLBAR, the page's one navigation (`buildPageToolbar()`).
    - Epic `airplane` P8, Owen 2026-10-10:
      "Make the floating sidebar in guides a sticky top toolbar like the epic page".
      Before it, a floating right-edge rail.
    - A row of the top-level sections' buttons:  the last row of the sticky page header (`.spell-page-head`).
      So it sticks with it, and the titles stick below it.
    - An ivory band, edge to edge across the window, its buttons in the reading column ("The MEASURE"), square.
      - A rule under it, and none above (Owen, 2026-10-10).
      - The same band as an epic page's.
    - Spell UI's menu (epic `epic-engine` P3):  `<ui-menu class="spell-toolbar" secondary>`, a `<ui-item>` link per
      section, its look through the menu's tokens (`spell-toolbar.css`);  an epic page's is the same element, and
      Epic UI's pages' (`spell-doc-toolbar.js`, epic `epic-engine` T11).
    - Each button:  the section's icon and its title.
      - the current one a deeper ivory (scroll-follow:  the item's `selected`)
      - a red badge counting what needs Owen (a `<ui-label>`)
      - its icon centred by the menu:  measured 0px off (the old `<ui-icon>` cells sat 1.8px left of centre)
      - icons only:  every button the same width
    - Give every top-level section an icon:  without one, the button shows its number.
    - Titles that don't all fit end in `...`.
      - When each would get under 50px, they go:  icons only, the title as the button's tooltip (`fitTitles()`).
      - The row scrolls sideways if even that doesn't fit, never the page.
    - The spell syntax guide adds Expand all and Collapse all at the band's right (`spell-syntax.js`, Owen 2026-10-12):
      appended to the menu, after its items, which scroll under them;  kept when the toolbar is built anew.
    - A page without a sticky page header:  the last row of its filter bar.
      Else a sticky bar of its own, before its first section (`.spell-toolbar-alone`:  the saga pages).
  - An EPIC PAGE (`body.plan-doc`) has its own toolbar (`buildToolbar()`).
    - It's the last row of `<epic-page>`'s sticky toolbar bar (its `toolbar` slot).
    - It sticks right under the h1's row, once the epic's title between them has scrolled away.
    - One button per top-level block:  its icon ONLY, the title its tooltip (Owen, 2026-10-10:  "lose the titles").
      - the current one a deeper ivory
      - every button the same width, badges or not
    - Badges count the block's items waiting on Owen:
      - red:  urgent (`state="attention"`)
      - orange:  Claude replied with options for him to pick (`state="replied"`)
      - both kinds, both badges;  none, none
      - over the icon's top right, a third of a badge on the icon
    - At the row's right, `<epic-page>`'s own tools (see "Overview"):
      the page's state filter, collapse-all, the new item button.
    - Cmd / Ctrl + K asks which item to jump to (`J7`, `q3`, any id), and lands there as a link would.
      - An id that isn't there:  the dialog says so, and stays open (`wireJumpKey()`).
      - A comment's id too, `M3`:  see "Jumping to comments" below.
  - JUMPING TO COMMENTS (epic `epic-workflow` P23;  Owen, 2026-10-10:  "⌘K taking comment ids", "Is there a way to
    jump to comments in replies?"), on every page that takes comments (an epic page's and a guide's alike):
    - a BULLHORN at the right of the toolbar, an orange badge counting the threads waiting on Owen (Claude spoke last)
      - each click lands on the next, in page order, round again after the last:  opened, below the stuck titles
      - hidden while none waits;  `PageComments.drawWaiting()`, its place in `waitingHome()`
    - Cmd / Ctrl + K takes a comment's id (`M3`, `m3` or the old `cm3`) and lands on its thread, opened
      - under its box, the threads waiting on Owen, a line each, "M3 · his first words", that lands there
      - a guide's dialog asks "Jump to which comment?", and takes any other id on the page too
    - [check-comment-jump.mjs](demo/check-comment-jump.mjs) checks both, on stubbed comments
  - Sticky titles:  each top-level section's title sticks below the page header.
    - Nested ones stack below their parents'.
    - The runtime sets the top-level `offset`s.
  - Folding:  folds are remembered per page;  a link's unfold isn't.
    - A live reload for new code puts back EVERY fold as it was, items and a link's unfolds too
      (`keepFoldsForReload()`, `sessionStorage`;  epic `epic-engine` I23).
    - An epic page (`body.plan-doc`) starts EVERY section folded that the reader hasn't opened or closed:
      Owen opens what he wants (2026-10-03).
    - Its `<epic-*>` blocks start folded by themselves.
      - The runtime reopens the ones the reader left open, before they first draw (`restoreEpicFolds()`).
      - It saves their toggles as a section's.
    - Below the last line, a window's worth of empty ground (`--spell-doc-pad-end`, on `.spell-doc-main`):
      so folding near the page's end never leaves the page shorter than where it's scrolled to,
      and what was clicked stays put (Owen, 2026-10-10, `airplane` J10).
  - Counts, on a top-level section holding `[data-status]` items
    (the Epics list page's epic cards, the saga pages' items):
    - `open/all` on its title, its `badge`
      - open:  any status but `done`, `decided` or `canceled`
    - on the toolbar, a RED badge counting only the items that need Owen (state `attention`):
      none when none do (`countItems()`)
    - Nested sections get no count of their own.
    - An epic page's blocks count their own items:  the runtime only reads the count, and its `attention`
      (else the items' `state="attention"`;  see "an epic page" below).
  - Item states (`markItemStates()`, every page):
    the Epics list page's epic cards, and the saga pages' items (`.plan-items`), get their colour from `data-state`.
    - The colour scheme:  [the plan-doc guide](../templates/epics/plan-doc.md), "Colours";
      in CSS, `spell-doc.css`'s `--spell-state-*`.
    - red needs Owen, blue Claude is working on it, yellow open (dark ink), green recent, grey older
    - without one:  an open goals question red, anything else open yellow, done / decided grey
    - The saga pages colour their id chips by it, NOT by kind:  the kind is only the id's letter.
  - Item filter (`wireItemFilters()`):  a top-level section with such items gets a chip per state it has.
    - The chips are the epics pack's `<epic-state-filter>`, an epic page's own (epic `epic-engine` P3);  the line
      under a filtered list its `<epic-hidden-note>`.
    - Each chip shows how many, left of its count.
    - solid while that state shows, outlined while hidden
    - no filter icon (Owen, 2026-10-10)
    - A click (`StateFilter.nextShown()`, in the element:  an epic page's rule too):
      - everything showing:  only that state
      - else a hidden one shows too, and a shown one hides
      - the only one showing:  everything again
    - A filtered list says "N hidden · show all" under it.
      Remembered per page.
  - An EPIC PAGE:  `<epic-page>` markup, drawn by the `epics` pack (see "Overview").
    - Its elements draw themselves, in their shadow roots:
      - the page header (Send and its countdown while reviewed, `<epic-send-buttons>`;  the step label, git), and its
        toolbar's tools
      - the review line, and the nobody-listening pill under it
      - the sections, phases and items, their counts and state filters, commits, item folds
      - every review control on the page's ONE review client
        ([the review client](review/), see "Review inbox")
    - How they look and behave:  "Overview" above, and each element's Epic UI page.
    - The runtime only:
      - lists its folding blocks (`<epic-overview>`, `<epic-section>`, `<epic-phase>`) on the toolbar
        - from each host's `contentsEntry` (label, icon, count), after waiting for them to draw
        - `EPIC_WAIT_MS`, 5s at most:  a pack that won't load doesn't hold up the page
      - remembers their folds
      - lands links inside them (a link to an `<epic-item>` opens it)
    - Running agents (epic `skillz` P3):  `<epic-page>` draws the "Agents running" panel above its first section.
      - It shows while any agent of the epic runs.
      - Each agent has a note box that redirects it (see "Overview").
  - Links to any id in `main` land below the stuck titles.
    They unfold what hides the target, and open its panel.
  - The address follows the section being read (`#id`, replaced, not pushed), so a reload lands there.
  - Served by the page server, an edit to the page's file updates it IN PLACE (`wireLiveUpdate()`).
    - Scroll, folds, open panels and typed text stay.
    - Anything the runtime adds inside `main` must carry `data-spell-added`, so the patch steps around it.
    - Pages with scripts of their own still reload.
      Inert data blocks (`<script type="text/plain">`) don't count.
  - The page's CODE changing hot-reloads it (the live client's `liveAction()`, epic `epic-workflow` P24):
    - a stylesheet it uses (`spell-doc.css` ...):  swapped in place, no reload
    - a script it loaded (`spell-ui.js` and its lazy chunks, the runtime, `epics.pack.js`, an experiment's bundle),
      or the page server restarting (a merge changed its code):  ONE reload, half a second after the last change
    - it keeps its place (epic `epic-engine` I23):
      - the scroll:  the live client saves it;  this runtime lands there, and holds it while the page settles
        (`holdScroll()`), never on the section the address names
      - every fold open before it, items and a link's unfolds too:  this runtime, as the page goes
        (`keepFoldsForReload()`, `sessionStorage`)
      - a half-written note (the review inbox's drafts) and comment drafts (`localStorage`)
    - not while you type in a field:  an "Updated:  reload" pill waits, and it reloads once you leave the field
    - so a merge's new widgets show up by themselves:  VS Code's window needs reloading only when the EXTENSION changes
    - `<body>`'s attributes are patched too.
    - An epic page's `<epic-*>` elements are patched, never replaced, keeping their page state
      (`open` ..., `carryEpicState()`).
      [check-live-epics.mjs](demo/check-live-epics.mjs) checks it.
  - Bodies from files:
    - `<ui-section source>` and `<ui-accordion source>`
    - an epic page's `<epic-*>` blocks and items:  a split epic page's parts (`wireSourceBodies()`)
    - The patch leaves what a host loaded alone.
    - A changed body file (the live client's `spell-server:file`) re-fetches its open host in place.
    - Each body that loads re-runs the outline, the toolbar, counts, item filters and code colors.
    - A link to an id inside an unloaded body loads it first.
      The ids are in its host's `data-part-ids`, or an `<epic-*>` host's `part-ids`.
  - Code colors:  highlight.js (`highlight.min.js`, in `_assets/`), committed so pages load offline.
    - Older pages still name cdnjs:  the page servers swap that tag for the local copy (`HIGHLIGHT_JS` in
      `server.types.ts`;  the epic server's `localHighlight()`, spell-app's in its `src/page-server/`).
- Headings:
  - One `h1`.
  - A numbered top-level `<ui-section>` per major section (`label="2. Read-after-write"`), each with a stable `id`.
    - Other docs link to them, so NEVER change an existing `id`.
  - A nested `<ui-section>` for EVERY distinct sub-item, `h4` for sub-sub-items.
    - A list item with a bold title and several lines of body becomes a section.
    - Long lists of such items are grouped under themed sections.
  - Titles are short labels (they're the toolbar's labels and the address' ids):  the claim goes in the body.
- Text:  SEE:  WWOD §6 › "Writing for people".
- Widgets (see the templates for exact markup):
  - recommendations / warnings:  `<ui-message state="positive|negative|warning|info" header="...">`
  - comparisons:  `<ui-table celled compact striped unstackable>` around a native `<table>`
    - ALWAYS `unstackable`:  never stacked, at any width (epic `epic-engine` I36;  Owen, 2026-10-19, on a table drawn
      at the side bar's width as its header cells, then each row's cells one under another:  "I hate it")
      - too wide for its column, it scrolls sideways in its own box, never the page
      - `spell-doc.css` holds every `<ui-table>` unstacked whatever its markup ("NO table ever STACKS");  a table
        that asks to stack (`stackable`, `stack-by`) still does:  a demo of stacking
        - by Spell UI's public token, `--ui-table-stack-by: none` (epic `epic-engine` I40;  spell-app 3d7061910)
      - the migration step adds the word to a page's tables (`components-not-markup`), and the epic tool's way in
        to what it's handed (`IncomingHtml`)
    - never a bare `<table>`:  the migration step `components-not-markup` wraps one (see "Scripts")
    - number cells:  `class="num right aligned"`
    - verdict cells:  `yes positive` / `no negative` / `meh warning`
  - small badges:  `<ui-label size="mini">`
    - a legend of them:  `<ui-labels class="spell-legend" size="mini">`
  - page top:  `<ui-breadcrumb class="spell-crumbs">`, back to the index
    - meta lines (who it's for, status, how checked):  `<ui-list class="spell-meta">` of `<ui-item icon="...">`
  - headline numbers:  `<ui-statistics class="spell-stats" size="mini">` of `<ui-statistic value label>`
    - 2-4 of them, each also stated with its caveat in the body
  - ordered flows:  `<ui-steps class="spell-steps" ordered>` of `<ui-step header description>`
  - parts side by side:
    `<ui-cards class="spell-flow" stackable>` of `<ui-card><ui-content><ui-header>` + `<ui-description>`
  - for / against:  `<ui-grid class="spell-pros-cons" columns="2" stackable>` of `<ui-column><ui-segment>`
    - with a top-`attached` `<ui-label>`
  - variants of one snippet (before / after, TS / JS):
    `<ui-tabs class="spell-tabs" pointing secondary basic>` of `<ui-tab label>`, each holding its code block
  - a coined term:  `<dfn class="spell-term" tabindex="0">`, followed by `<ui-popup header content>`
  - history of the decision:  `<ui-feed class="spell-history">` of `<ui-event icon>` + `<ui-summary>` + `<ui-date>`
  - sources:  `<ui-items class="spell-sources" divided>` of `<ui-item><ui-content>`
    - with `<ui-header>`, `<ui-meta>`, `<ui-description>`
  - footer:  `<footer class="spell-doc-footer"><ui-divider>` + a `.meta` "last checked" line
  - asides / digressions:  `<ui-accordion class="spell-aside" styled>`
    - with ONE `<ui-title>` / `<ui-content>` pair
    - collapsed (no `open`)
    - never a `<details>` / `<summary>`:  `components-not-markup` turns one into this
  - buttons:  ALWAYS the pill style, with an icon that says what they do:
    `<ui-button circular icon="paper plane">Send</ui-button>`
    - Icon-only buttons are circles (`circular`, no text).
      They MUST have an `aria-label`, and a tooltip.
    - ALWAYS a component (Owen, 2026-10-19):  `<ui-*>`, or `<epic-*>` on an epic page;  NEVER a raw `<button>`, in a
      page or in a control the runtime or a tool draws (see "Layout" › `spell-doc-runtime.js`).
      - Its icon centred by the component:  no CSS of ours sizing or moving the icon.
      - A block's own controls share its one actions row, the bullhorn first (`addBlockAction()`).
  - TOOLTIPS are the browser's own:  a `title` attribute.
    - Never a `<ui-tooltip>`, nor a `<ui-popup>` used as one.
    - Owen's standing rule, 2026-10-10:  a styled one only when he asks for "a ui-tooltip with ...".
    - One still has a `<ui-popup inverted size="mini">` tooltip:  the runtime's heading fold button on the goal sets'
      pages ("Fold / unfold", epic `epic-engine` I32).  Turn it into a `title` when touching that code.
      - `goals-live.js`' own buttons have `title`s since epic `epic-engine` P3.
    - `basic` for quiet tools (sidebars, toolbars);  `primary` for the one main action in a dialog.
  - An icon a page uses must be in `ICONS`, in [bundle-spell-ui.js](tools/bundle-spell-ui.js)
    (then `epic pages update`):  any other name draws nothing.
- Code:
  - ALWAYS folded and colored:

    ```html
    <ui-accordion class="spell-code" styled>
      <ui-title>What it is · N lines</ui-title>
      <ui-content><pre><code class="language-ts">
    ```

    - Never `open`, however short:  see "Sections" above.
  - TypeScript by default, formatted by oxfmt:
    write the snippet to a `.ts` / `.tsx` file, and run `yarn vp fmt <file>`.
  - Valid code only:  no bare JSX statements after other statements.
    Assign them to a `const`.
  - Prefer excerpts pasted from a real, runnable file over hand-typed examples.
- Colours:  WWOD §18 › "Colours and themes through `ui`'s tokens", plus `spell-doc.css`'s own.
  - ONE meaning per colour on every doc page (Q20 of epic `epic-components`, Owen 2026-10-08):
    - red:  needs Owen
    - yellow:  open (dark ink)
    - blue:  do it now / Claude is working on it (every Send)
    - green:  decided or done
    - orange:  ONLY changed-since-you-looked, and warnings
    - violet:  Claude's voice
    - ivory:  Owen's
    - grey:  older
  - And the fill:  grey outline available, dashed pressed but not sent, outline sent, solid done.
  - The table, with examples:  [the plan-doc guide](../templates/epics/plan-doc.md), "Colours".
  - Item states in CSS:  `spell-doc.css`'s `--spell-state-*`.

## Page kinds

Each kind of page has ONE name, written everywhere a person reads it.
- Owen, 2026-10-14, epic `epic-workflow` P14:
  [the page kinds he settled](../../spell.epics/epics/epic-workflow/details/page-kinds.html)
- The older words he may still say:  [spell-app's AGENTS.md](../../spell-app/AGENTS.md), "Words".

| Name | What it's for | Where | Template |
| --- | --- | --- | --- |
| epic page | an epic's plan:  its phases, items and log | `epics/<epic-id>/<epic-id>.plan.html` | [the tool's](tool/templates/plan.html) |
| saga page | a saga (an epic of epics):  what its epics did, ideas not done yet, its epics' cards;  commented on and sent from as an epic page is (epic `epic-workflow` P15) | `sagas/<saga-id>/<saga-id>.saga.html` | [the tool's](tool/templates/saga.html) (`epic saga page <id>`);  the parked goal sets in `goals/`:  none (spell-app's `goals.zip`) |
| details page | one question explained with a picture, answered on the page | `pages/details/`, `epics/<epic-id>/details/` | [details.html](../templates/details.html) |
| review page | several calls to go through at once:  keep, change, talk over | same as details pages | [review.html](../templates/review.html) |
| choice page | a table of names Claude recommends, typed over, then "Do it" | same, with `<slug>.rows.json5` | [syntax-choices.html](../templates/syntax-choices.html) |
| run page | a command's review page:  a COMMAND (not Claude) asks, Owen answers each row, Send, and the command carries on (epic `epic-engine` P23) | `pages/runs/<run-id>/`, served at `/runs/<run-id>/` | [the tool's](tools/templates/run.html), served by [runRoutes.ts](tools/runRoutes.ts), never copied |
| guide | explains a topic;  an epic's own write-up is "the epic's guide" | `guides/` | [durable.html](../templates/durable.html) |
| cheatsheet | an API at a glance, as cards you filter | `guides/` | [cheatsheet.html](../templates/cheatsheet.html) |
| commands page | which command, skill or script does what | `guides/dev/commands/` | [commands.html](../templates/commands.html) |
| components page | one element:  its examples, attributes and look | a component set's `docs/`:  spell-ui's `docs/`, spell-epic's `src/docs/`, spell-app's `app/docs/`, spell-brand's `docs/` | [spell-ui-docs.html](../templates/spell-ui-docs.html) |
| components guide | a component set's pages that aren't one element:  home, getting started, theming, icons | beside its components pages | [component-set-docs.html](../templates/component-set-docs.html) |
| brand page | Claude Design's brand pages, and their Spell UI copies | `brand/` | none:  Claude Design's exports |
| home page | the docs' front page:  a card per area | `pages/index.html` | none:  `epic pages index` writes its cards |
| list page | a card per page of one area:  each top-bar tab's own page | `<area>/index.html` | none:  `epic pages index` writes it |
| changelog | what the repo shipped, newest first | `guides/changelog.html` | none:  its header comment has an entry's markup |
| template | the starting point for one kind of page | `templates/` | -- |

- Not pages, so not named here:  an epic page's part files, inbox files, answer and draft files.
- File names keep their old words (`<epic-id>.plan.html`, `durable.html`, `syntax-choices.html`):
  links and tools depend on them.

## Templates

- spell-epic's own, in its [`templates/`](../templates/) (epic `epic-eject` T11, Q8):  every repo's pages start from them.
  - Served at `/templates/` (and `/r/<repo>/templates/`) by the epic server and the kit's page server alike.
  - `epic pages template <name>` prints one's path;  `epic pages index` writes the Templates list page,
    `templates/index.html`, here.
  - A repo adds its own only if it wants one:  `repoTemplates` (`EpicConfig`), listed beside these, found first.
- [durable.html](../templates/durable.html):  a guide -- design notes, research, references.
  - prose sections, tables, code, callouts
- [commands.html](../templates/commands.html) + `commands.json5`:  a command reference.
  - operations by family, and which CLI / skill / yarn command does each
  - in tables that `commands.js` (in `_assets/`) draws from the JSON;  its header has the JSON's shape
  - hand-written prose around them
  - e.g. [the commands page](../../spell.epics/guides/dev/commands/commands.html)
- [cheatsheet.html](../templates/cheatsheet.html):  an API reference.
  - a grid of cards, filtered by text and by badge (`ui-select[data-spell-filter-badge]`)
  - a card may carry `<ui-meta>` (since when) and `<ui-extra>` (a docs link)
- Epic pages have no template here.
  - The old `plan.html`, in `templates/epics/`, retired at the switch (P12 of `epic-components`).
  - `epic create <name>` copies the tool's own, in `<epic-*>` markup
    ([the tool's plan template](tool/templates/plan.html)).
  - How to write one:  [the epic-page notes](../templates/epics/plan-doc.md).
- [details.html](../templates/details.html):  a details page.
  - NEVER copy by hand:  `epic ask create <slug>`.
  - The tool reads [its OWN copy](tools/templates/details.html) since epic `epic-workflow` P12.
    - tracked with each branch, as the elements it's written in are
    - The shared one becomes a copy of it when the migration step `answer-elements` runs
      (see "Scripts", `migrate.js`).
- [syntax-choices.html](../templates/syntax-choices.html):  a choice page.
  - `syntax-choices.rows.json5` beside it is a small working example.
  - NEVER copy by hand:  `epic choices create <slug> --rows <rows.json5>`.
  - The tool reads [its own copy](tools/templates/syntax-choices.html), as it does details.html's.
- [review.html](../templates/review.html), "Review":  a review page, going through a finished run's calls.
  - one question each (keep, change, talk over), then "Where first?"
  - saved from `ui-docs-rework`'s morning review, as the model
- No `templates/goals/` any more (epic `epic-engine` P2, T1):  the parked goal sets' templates are only in spell-app's
  `goals.zip`, an older copy;  their last versions are in this repo's history, before P2.
- [spell-ui-docs.html](../templates/spell-ui-docs.html):  a components page (one element's),
  for Spell UI's set ([its docs](../../spell-ui/docs/)).
  - Fomantic's docs layout in `<ui-*>` widgets:
    nav, masthead, Examples / Usage / API / Theming tabs, an "On this page" rail.
  - It loads the UI site's bundle, NOT `spell-ui.js`.
  - NEVER copy by hand:  `yarn site:new <tag|page>`, in spell-ui.
  - How to write one:  [PAGES.md](../../spell.epics/epics/spell-ui-pages/PAGES.md).
  - Checked by `yarn site:check` there (`docs update` skips it).
- Every template but the saga pages and `spell-ui-docs.html` is `<ui-section>` markup (see "Writing a page").
  - The saga pages keep the old `section.s2` markup
    until they migrate ([the code-debt log](../../agents/CODE-DEBT.md)).
- A new KIND of doc gets a template here.
  `epic pages index` gives it a card on the Templates list page.

## Epic pages

- `/epic <name>` ([the epic skill](../skills/epic/SKILL.md)) runs a planning session
  against the epic's epic page, `<name>.plan.html` in `epics/<name>/`.
- An epic page is `<epic-*>` markup, drawn by the epics component pack (epic `epic-components`).
  Its code is in `src/` and `components/`, beside the docs tools:
  - the elements, the review client, and the `epic` tool ([the tool's folder](tool/), which `epic` runs):
    "Overview" above
  - what the tool writes, and the rules for a doc's DATA in that markup (ids, phases, items, log, parts):
    [PLAN-DOC.md](tool/PLAN-DOC.md)
  - how to write one (rules, ids, prose, explaining a question, the review loop):
    [the plan-doc guide](../templates/epics/plan-doc.md)
  - Every shared doc is in `<epic-*>` markup since the switch (P12 of `epic-components`, 2026-10-08).
    - A doc still in the OLD `ui-*` markup is refused:  the converter went in epic `repo-split` (Q45).
- Edit through `epic <verb>` wherever a command exists (phase status, items, log).
  It keeps ids, icons and UPDATE markers consistent.
- SPLIT docs (P3 of `claude-design`;  new docs start split):  a skeleton, plus part files, `<id>.html` in `parts/`.
  - The code:
    - `PlanParts`, `spell-epic/tool/PlanParts`
    - `EpicParts`, `spell-epic/tool/EpicParts`, splits and assembles an `<epic-*>` doc
    - the rules:  [PLAN-DOC.md](tool/PLAN-DOC.md), "Parts"
  - The tool reads either shape whole, and writes it back split:  each file once, atomically, only when changed.
    - `split <name>` / `split --done` / `join <name>`
  - A reader of the skeleton alone sees every section, phase status and item line.
    - e.g. `epic pages index`, the main server's epic cards, `ReviewInbox.itemIds()`
    - Anything needing bodies reads the doc through the tool (`PlanDocFiles` `read()`).
  - A split doc needs the page server (`<body data-spell-needs-server>`):  bodies don't load from `file://`.
- What the docs tools (`tools/`) add for epic pages, as for every page:
  - `spell-doc-runtime.js`'s generic parts (see "Writing a page"):
    - the toolbar, which lists an epic page's blocks from their `contentsEntry`
    - folds, landing, live update, bodies from files
    - for the Epics list page and the saga pages:  `countItems()`, item states and `wireItemFilters()`
  - [check-spell.js](tools/check-spell.js), which knows the `<epic-*>` elements (see "Scripts")
  - the forwarders (see "Scripts"):  new code imports `src/tool/` (`spell-epic/tool/...`) instead
    - [plan-doc.js](tools/plan-doc.js), also `yarn plan-doc`
    - `plan-parts.js`, `inbox.js`, `review-backfill.js`
  - the tool, in turn, uses the docs tools' own code rather than a copy:
    - `BlockAnchors.js`, in `PlanAnchors`
    - `pages.js`'s `atDepth()` and `planDocIn()`, in `PlanDocCommands` and `PlanDocFiles`

### Review inbox

- Owen marks an epic page's items ON the page:  approve, todo, Add Details, revisit, pick an option card.
  - The marks wait in its INBOX FILE until a Claude session takes them.
    It's `<name>.inbox.json5`, beside the doc in `epics/<name>/`.
  - Absent until the first mark;  deleted once empty.
  - Git-ignored:  per-machine pending state, never the record.
  - Its shape and methods:  [`ReviewInbox`](tool/ReviewInbox.ts).

    ```text
    setMark()  requestNow()  cancelNow()  markSent()  unsentMarks  sentMarks  takeNow()  takeWork()
    setWorking()  setListening()  touchListening()  liveListener()  clearMarks()  finishMarks()
    clearApplied()  setDraft()  reviewNow()  unsentComments  sentComments  hasUnsent  claimWake()  recordWake()
    ```

  - EVERY write goes through `ReviewInbox.update()` / `updateAsync()`:
    under the file's lock (`SRV.FileLock`), atomic (`updateAsync()` through `SRV.FileOperations.writeAtomic()`).
  - `drafts`:  a note box's text as Owen types it, kept until the mark that uses it.
    - Never sent, counted, or work for a waiting session.
  - `canceled`:  requests Owen called off ("nevermind", `cancelNow()`).
    - `wait` hands them over once:  stop that item's agent.
    - `epic details` refuses a write for one.
    - `inbox done | clear`, or a new request, ends it.
  - One mark per item (or phase, Overview sub-section, the summary:  `summary`).
    - A question's pick with a remark is ONE revisit mark carrying `pick`:
      `{ action: "revisit", when, note, pick }`.
    - It's talked over, never applied by itself.
  - A CHANGE MARK's buttons (`<epic-change id="ch3">`, epic `epic-engine` P30):  Accept or Reopen, under its id
    - `{ action: "accept" }` (no `stage`:  the header's stage button's carries one) or `{ action: "reopen" }`;
      only a change takes them, and a change takes nothing else
    - markable while its host's `to-accept` lists it (the skeleton's), or it's in the page not `accepted`
    - `epic inbox apply` makes Accept `accepted` (the orange goes, the chip stays) and reopens the question for
      Reopen:  [PLAN-DOC.md](tool/PLAN-DOC.md), "Change marks"
  - A new todo or question asked for from the page (epic `airplane` P2):  a mark under its own key, `new1` ...
    - `setNew()`:  `{ action: "new", kind, title, note?, near? }`
    - `epic inbox apply <name>` makes the item.
  - A TEST's answer from Owen's test run (epic `epic-engine` P4):  `{ action: "test", result, note?, shot? }`,
    on a test only
    - `result`:  `passed`, `failed`, `skip`, `notnow` (`TEST_RESULTS`);  `shot`:  his screenshot, `tests/v3-<stamp>.png`
      from the page's folder (`POST shot`, below)
    - sent with Send;  `epic inbox apply <name>` applies it (`PlanDoc.applyMark()`:  passed closes, failed files a
      new issue with the note and screenshot, skip cancels, not now defers):  [PLAN-DOC.md](tool/PLAN-DOC.md), "Items"
    - the run itself is `<epic-page>`'s test mode (`?test=1`), drawn by `<epic-test-run>` (Epic UI's page says how):
      one card per test from its `<epic-field label="Step">` ... (an older test's prose as its Step), the answers
      P / F / S / N, a COMMENT box on every card (the mark's `note`, with any answer;  before one, the inbox's draft;
      `apply` keeps it on the test as Owen's reply), its place in the address (`#v3`), kept there against the runtime's scroll-follow
      (`spell-doc:place`);  `epic test <name>` opens it, `epic test --all` the
      first epic with open tests, the run's last card leading to the next (`GET /api/epics/tests`,
      [epicRoutes.ts](tool/epicRoutes.ts), `EpicTests.waiting()`)
  - `comments`:  Owen's comments on the doc's blocks, and on selected text (P11, see "Comments"):  `M1` ...
    - Written through the comments route.
    - Sent with Send, as marks are (Owen, 2026-10-10:  he keeps Send as the way comments reach Claude).
      - Unsent (`unsentComments`):  waiting for Claude, and Owen's last words on the thread newer than `sent`.
      - A new comment, or his reply on a thread, turns Send blue;  its tooltip counts both ("2 marks, 1 comment").
      - `wait` hands each over once (`takeWork()`'s `sent.comments`), until Owen speaks on its thread again.
    - Waiting until answered (`epic inbox done <name>#M3`).
  - `listening.seen`:  the session's heartbeat (`LISTEN_HEARTBEAT_MS`, 30s, from `wait`).
    - Older than `LISTEN_STALE_MS` (90s), the session is gone:  `liveListener()` returns `null`.
  - `listening.pid`:  the session's MONITOR's process, when the monitor holds it (`InboxMonitor`, epic `epic-engine`
    P19):  live exactly while that process runs, with no heartbeat.
  - `woken`:  the page server's last WAKE of the epic (epic `epic-workflow` P16), `{ at, state, did, message }`.
    - Send (or its countdown) or Do Now with nobody listening wakes it, inside the request:
      `/epic review <epic>` typed into its session, or a new session in its window (`ReviewStart`).
    - Claimed under the inbox's lock (`claimWake()`):  two Sends at once wake once.
    - It stands 10 minutes (`WAKE_COOLDOWN_MS`), or until a session listens (`setListening()` clears it).
    - No wake with several sessions titled for the epic, in airplane mode, or for a Send with nothing new.
- The page reads and writes through ONE `ReviewClient` ([the review client](review/)).
  - It's on the page server's route module, [reviewRoutes.ts](tool/reviewRoutes.ts), at `/api/epics/review/...`.
  - The module is listed in spell-epic's `package.json`'s `pageServer.routes`:  its part of the kit's page server's
    settings, which the epic server reads too (`ROUTE_MODULES`).
  - The routes:
    - `GET inbox?page=`
    - `POST mark { page, id, mark | null }`
    - `POST draft { page, id, action, note }`:  a note box's text as typed
    - `POST now { page, id, action, note? }`:  Add Details, or revisit now, queued on `now`
      - revisit now keeps the item's pick
    - `POST cancel { page, id }`:  "nevermind"
    - `POST send { page, now? }`:  `now: true` is the countdown's send (Review Now's, before epic `epic-engine` P20),
      every revisit waiting asked now too (`reviewNow()`)
    - `send` and `now` answer `wake` too:  what waking the epic did (`WakeResult`), `null` while a session listens
    - `POST start { page }`:  the pill's click, `/epic review <epic>` typed into the epic's session (`StartResult`)
    - `POST new { page, id?, entry | null }`:  a new item from the page;  no `id`:  the next free key
    - `POST shot { page, id, png }`:  a test run's screenshot (a PNG data URL, at most 8 MB, else 413), written
      beside the page in `tests/` (`TestShots`), never over a file;  answers `{ shot }`, its path, which the
      failure's mark carries (epic `epic-engine` P4)
  - A page whose token is stale (its server restarted) takes the new one from the page as served now,
    and retries once (`ReviewClient`).
    So nothing typed is refused for a restart.
  - `page`:  the doc's URL path (`/worktrees/<w>/...` too).
    - only `<name>.plan.html` (else 403)
    - only ids of its items (else 400)
  - Each answer is the whole inbox, but with `listening` `null` once stale (`ReviewInbox.forPage()`).
    - Plus `unsentComments`:  the ids of the comments Send would hand over.
      The page counts them for Send, and keeps no rule of its own for a thread.
  - Writes need the server's token and origin (`SRV.Guard`).
- Unsent:  marks newer than `sent` (the last "send to Claude").
  - Never an immediate one (`details`, revisit `now`).
  - And waiting comments whose last words from Owen are newer than `sent` (`unsentComments`).
- `epic inbox <name> [--json]` prints it:
  - marks by action, with their items' titles, sent or not
  - the `now` queue, agents at work, the session listening
- Claude's side, `epic inbox <verb> <name>[#<id>] ...`
  (the loop, step by step:  [the plan-doc guide](../templates/epics/plan-doc.md), "Review inbox"):
  - `watch` / `ignore`:  a session waits on it, or stopped
  - `wait`:  run in the background;  it stamps the heartbeat while it waits
    - exits 0 with work, which wakes the session:  requests for now, taken;  a send not yet handed over (`handedOver`)
      - a send with only comments too:  it prints them, each with Owen's latest reply
      - a Send on a docs page the epic owns (epic `epic-workflow` P13, see "Comments"):  each comment under its page
    - exits 2 on timeout
  - `epic inbox <name>` lists the comments waiting on the pages the epic owns too (`guides` in its JSON)
  - `apply [ids]`:  the sent approve / pick / todo marks and test answers, into the doc (`PlanDoc.applyMark()`),
    then cleared;  each failed test's new issue listed, for the session to tell Owen with its link
    - A revisit with a pick is left, "to talk over".
  - `<name>#<id> working on|off`
  - `<name>#<id> done`:  keeps a mark Owen changed meanwhile
  - `<name>#<id> clear`
  - These and `apply` stamp the heartbeat too.
  - An agent writes into ONE item with `epic details <name>#<id> --file <html> [--append]`.
    - It's under the doc's lock, so it never races the session's other edits.

## Details pages

- How and when Claude writes one:  `/details` ([the details skill](../skills/details/SKILL.md)).
- The commands ([details.js](tools/details.js)):

  ```sh
  epic ask create | show [--wait] | wait | answer | draft | list | sweep
  ```

  - `show` opens a page in the side bar's "Review" tab (epic `windows-and-review` P6).
  - `draft` prints what Owen typed and hasn't sent (below):  read it before rewriting a page he may have open.
- Written in the epics pack's `<epic-*>` elements (epic `epic-workflow` P12), so a question reads as an epic page's.
  - Each element has its page in Epic UI (`/components/epics/`, "Pages Owen answers on").
  - a question:  a `<ui-section id>` holding an `<epic-ask>`
    - the `<epic-ask>` holds an `<epic-question>`, and an `<epic-choices>` of `<epic-option>`s
    - the section's id is its answer's key
  - the boxes Owen types in:  `<epic-text-box>`es
    - the notes, a section's comment
    - Other and each option's comment are drawn by the question
  - Send:  `<epic-send>`, in the sticky page header
  - what they hold and send:  the page's `AnswerForm` (`spell-epic/answers`)
  - The tools build them as elements, never markup in strings ([answerPages.js](tools/answerPages.js)).
    - the template:  [the tool's own](tools/templates/details.html)
  - Before P12:  `ui-section.spell-question` > `.spell-option`, which a page script (`_assets/details.js`, gone) drew.
    - The migration step `answer-elements` converted every such page once (gone since epic `repo-split` Q45).
- Owen's answer:  the page posts it to the page server's route module (`POST /api/docs/details/answer`).
  - The module:  [detailsRoutes.ts](tools/detailsRoutes.ts).
  - That writes `<slug>.answer.json5`, beside the page (`SRV.FileOperations.save()`).
  - `epic ask wait`, run in the background, exits with it, and so wakes the session.
  - Any of it is an answer:  a pick, Other, a section's comment, the notes.  A page with no questions, only comment
    boxes and notes, sends them all the same (`Sent 10/19/26 22:22`, no "0 of 0 decided").
- WHO HEARS IT (epic `epic-engine` r6):  `<epic-send>` says, after the button.
  - Why:  Owen typed comments on such a page while `epic ask show --wait` waited on it, and saw "nobody is listening"
    (the comments' Send, below, drawn over the page's own).
  - "repo-split is listening" (a green dot):  a session's `epic ask wait` (or `ask show --wait`) waits for the answer.
    - The wait keeps a heartbeat while it waits, gone as it ends:  `~/.spell-epic/asks/<hash>.json5`, one per page
      ([AskListeners.ts](tools/AskListeners.ts)).  In the home folder, not beside the page:  the content repo is
      committed every turn.
    - Stale after 90s, or once its process is gone.
    - The route module answers it (`GET /api/docs/details/listening`, and with the answer's GET and POST);  the page
      asks again every 30s while in view.
  - "nobody is waiting yet":  Send still works.  The answer is saved beside the page, and an orange line under Send
    says so:  "Saved:  nobody is waiting yet;  Claude reads it when it next looks" (the next `ask wait` / `answer`).
    - It wakes no session (a docs page's Send does).
  - A details page takes no bullhorn comments, questions or not (`commentsRoutes.ts`, its `<epic-send>`):  so no
    second Send in its header.
- What he typed and hasn't sent is a DRAFT (epic `epic-workflow` P18).
  - Why:  agents rewrote a page under him twice, and everything he hadn't sent was lost (request r4).
  - `<slug>.draft.json5` beside the page, through the same route module (`POST /api/docs/details/draft`)
    - saved as he types (half a second after each change, one save at a time), and as the page goes away
    - a copy in the browser's `localStorage` too, written at once, for when the page server can't take it
    - a save that fails says so in red, on its own line under Send, and tries again every 3s until one goes through
      (epic `epic-engine` P15):  a page server back on its address takes it, its new token too, with no keystroke
  - It wakes nobody:  `epic ask wait` watches the answer only.  Send deletes it.
  - The page's `AnswerForm` (`spell-epic/answers`) keeps it, by question / option / section id, with each id's title
    (`labels`).
    - It puts it back on load over the answer sent, when it's newer:  Send says "Changes not sent",
      the draft's save shows beside it ("draft from 06:12 put back").
  - An agent's rewrite reloads the page, or patches it in place:
    either way a question that's still there gets back what was typed in it.
  - Text whose id the rewrite removed is KEPT:  a box of its own above the notes, "Kept from before the page changed".
    - drawn by the notes box (`<epic-text-box type="notes">`), each under its old title with a × to drop it
    - sent with the rest (`kept`, `[{ id, label, text }]`)
    - a part slower than the moment the page waits for a rewrite's parts (`DETAILS_SETTLE_MS`, 250ms) takes its text
      back out of the box as it joins (`AnswerForm.takeBack()`, `AnswerDraft.restore()`;  epic `epic-engine` I9):
      never shown twice
    - `epic ask answer` / `wait` print it last, "Kept from before the page changed:"
  - The rules (what's laid over what, what's kept):  `AnswerDraft`, in `spell-epic/answers`.
- `findPages()` skips every `details/` folder:  not in the index, not checked by `docs update`.
- Colours (the scheme:  "Colours" above):
  - recommended:  a violet thumbs-up after an option's title, no word
  - the ticked card framed green
  - Send blue, by the fill rule (grey outline:  nothing to send;  dashed:  changes not sent;  outline:  sent)
  - each question's chip, and its section's toolbar badge:
    - red:  nothing yet
    - green:  picked
    - blue:  Claude has more to do (more details asked, or only Other written)
  - No status label in the meta lines any more (P12):  Send's line says where the answer stands.
    - `Not sent`, `Changes not sent`, `Sent 10/8/26 14:34 · 5 of 17 decided`

## Choice pages

- A table of names (or any syntax) Claude recommends, one row per use site.
  - the columns:  File (opens VS Code at the line) | Purpose | Current | Recommended (a box, pre-filled)
    - The rows' `fileColumn: false` drops File, for rows whose place in the code doesn't matter to the reader
      (a list of commands;  epic `epic-workflow`, CM4).
    - A section's `reorder: true` lets Owen put its rows in ORDER (epic `epic-workflow` P15, the sagas review page).
      - an Order column first, each row's place with move up / move down
      - The order he leaves goes with the draft and "Do it" (`order`, by section id).
      - `answer` prints it against Claude's.
  - Owen types over the ones he'd write differently, then "Do it".
  - For a call made name by name, after a rule is picked (P13's boolean names).
  - How-to:  [the syntax-choices guide](../../spell.epics/guides/syntax-choices.html).
- The commands ([choices.js](tools/choices.js);  the rows' shape is in its comment):

  ```sh
  epic choices create <slug> --rows <rows.json5> | show [--wait] | wait | answer | list
  ```

  - Pages go where details pages do.
  - `<slug>.rows.json5`, beside the page, holds the rows.
  - `new` writes them into the page too, as elements (epic `epic-workflow` P12):
    - a `<ui-section>` per section holding an `<epic-choice-rows>` of `<epic-choice-row>`s
    - an `<epic-choices-bar>` at the end:  feedback, "Do it", the draft (`ChoicesForm`, `spell-epic/answers`)
    - So the page draws from `file://` too;  saving and sending need the page server.
  - Before P12 a page script (`_assets/syntax-choices.js`, gone) fetched the rows and drew them.
    - The migration step `answer-elements` writes such a page's rows in once.
- A DOCS page may take choices too:  one that names its own rows on `<body data-choices-rows="...">`.
  - The spell syntax guide does:  its rows are generated from the code, its boxes keyed `<Class>.<field>` (`IsGtLt.py`).
  - Its draft and answer go beside it, as a choices page's;  its box ids aren't checked against the rows.
  - `epic choices show | wait | answer <page>` take its path;  `list` covers only the `details/` folders.
  - It still takes comments:  only a page with `<slug>.rows.json5` beside it doesn't.
- The page server's route module, [choicesRoutes.ts](tools/choicesRoutes.ts), at `/api/docs/choices/...`
  (each save through `SRV.FileOperations.save()`):
  - the draft:  `<slug>.draft.json5`, never wakes anyone
    - saved as Owen types (half a second after each change), and as the page goes away
    - a copy in the browser's `localStorage` too, written at once;  on load the newest of the two (or the answer)
      comes back
    - a save that fails says so in red on the bar, and tries again every 3s until one goes through (epic `epic-engine`
      P15, r14:  a page server gone lost 76 boxes Owen typed)
    - Copy my answers, on the bar:  what's typed, as the draft's JSON, onto the clipboard, for a page whose server is
      gone for good (a reload there brings back nothing);  saved as the draft file, the page shows it again
  - the answer:  `<slug>.answer.json5`, which `epic choices wait` exits with

## Run pages

- A COMMAND's review page (epic `epic-engine` P23):  a command, not Claude, stops to ask Owen, and carries on with his
  answers.  The first:  the Spanish translator (`spell translate`), with the names it drafted.
- Who does what (every arrow down):
  - the kit's `SRV.CommandRun` (`spell/server/runs/`):  writes the run's folder, `pages/runs/<id>/` in the content
    folder, waits for Send with a heartbeat, reads the answers back;  its files' shapes, the contract with this side:
    `spell/server/runs/runs.types`
    - `run.json5`:  what the command asks (title, columns, rows, progress, status);  only the command writes it
    - `answers.json5`:  what Owen answered, per row, and `sent`;  only the route module writes it
    - `waiting.json5`:  the command's heartbeat while it waits
  - here:  the page's template ([run.html](tools/templates/run.html)), its elements (`<epic-run>`, `<epic-run-row>`),
    and the route module that serves it and takes its answers ([runRoutes.ts](tools/runRoutes.ts))
  - the command (the translator):  calls the kit's class, acts on the answers itself
- The routes:
  - `GET /runs/<id>/`:  the template, titled with the run's title, through the server's page hooks
  - `GET /api/runs/<id>`:  `{ page, answers, waiting }`;  `waiting`:  the run `open` and its heartbeat fresh, from a
    live process (`SRV.CommandRun.isWaiting()`)
  - `POST /api/runs/<id>/answer { rowId, outcome, value, ticked }`, `POST /api/runs/<id>/send`:  `answers.json5`,
    under its lock, all at once;  Send stamps `sent` afresh each time
  - `POST /api/runs/<id>/effort { effort }` (epic `epic-engine` P25):  `answers.json5`'s `effort`, the same way;
    400 for a run that offers none, or an effort not in its `effort.choices`
  - run id `[a-z0-9-]` only, a row of the run only, a known outcome:  else 400;  no such run:  404
- `epic pages open <run folder> [--review]` opens its page (`pages.js` `runPagePath()`):  the kit's
  `CommandRun.show()` runs it.
- Steering (P25):  the command keeps going while Owen answers, and the page shows it live, from `run.json5`:
  - `passes`:  the status card, a line per pass (name, bar and `212 of 380`, calls, time)
  - `effort`:  the picker;  Owen's pick is saved at once, and the command reads it before its next pass
  - `taken`:  a row the command acted on is marked `taken`;  changed after that, an orange note
    ("changed after the run took it"):  the command is handed it again, and may pick it up
  - `status`:  `done`, `stopped` or `timed-out` says how it ended, in the waiting line
  - the page picks a run back up when reopened:  all its state is in the files
- A row left alone has no entry in `answers.json5`:  the command reads it as its proposal.
- No comments, no draft file:  every answer is saved as given.
- `findPages()` never sees the runs:  `pages/runs/` holds no page, only data.

## Comments

- Owen leaves a comment for Claude on any block of a docs page or epic page the page server serves
  (epic `airplane`, P11).
  - The BULLHORN beside each major block:
    - a section (in its title), table, aside, code block, message, cards, steps, top-level list
    - an epic page's Overview as a whole (epic `epic-engine` I55), items, phase fields, summary and Overview prose
    - an epic page's updates (`<epic-update>` blocks), even inside an item or a field:  each has its own bullhorn
      (Owen, 2026-10-11:  "Those items are bullhorn-able")
    - the page header:  the whole page
    - Quiet until hovered, ALWAYS:  it only starts a new comment ("Comment on this item").
    - No count, whatever the block has:  each comment is a thread on the page, right there.
      Owen, 2026-10-10:  "Bullhorn to the far right is unnecessary".
      - Before 2026-10-10 a block with comments showed "📢 N" always, sitting at the end of its thread's header row,
        with an orange dot for news;  its click listed them (`openPicker()`, gone).
      - The toolbar's signals stay as they were.
    - WHERE it sits (epic `epic-workflow` P25;  Owen, 2026-10-17:  "an `actions` slot which puts additional buttons
      in the right spot, to the left of the 'default' buttons like collapse"):
      - a block with a TITLE ROW:  in that row, its `actions` slot, never over a button
        - a docs section:  `<ui-section>`'s own slot (`.at-section`)
        - an epic page's Overview, item, update (with a date), aside and code block (`.at-title`, `TITLE_ROW_BLOCKS`):
          after the title, before the block's own buttons (review pills, Do Now, the date, the fold)
        - every epic element with a title row has the slot:  [Fold.types.ts](components/epic-item/Fold.types.ts)
      - a block with NO title row (a paragraph, a table, a list, a message, cards, a phase's field, the summary):
        first in the block's ACTIONS ROW (`.at-block`;  `addBlockAction()`, epic `epic-engine` I26)
        - a line of no height just before the block, its buttons over the block's top right corner, 2px in
          (`alignBlockActions()` measures where the block's top edge is:  its own margin may lie between)
        - shared:  a table's expand button goes right of the bullhorn, so they never overlap or float apart
      - the page header:  in it (`.at-page`)
    - A corner bullhorn makes room rather than cover what's there (`makeRoom()`;  Owen, 2026-10-10:  "Overlap in
      bullhorn buttons"):  a thread right under a short block, which it would cover, leaves room on its header's right.
      - Before P25 it also moved an item's corner bullhorn left of its review pills, and an update's left of its date
        (`MAKES_ROOM`, gone);  and a CSS rule shortened an aside's or code block's fold button by 34px (28e350907).
    - A click on a comment's highlighted quote opens its thread.
  - Or on SELECTED TEXT:  ⌘ / Ctrl I, or the bullhorn floating beside the selection.
    - The comment keeps the quote, highlighted softly on the page while the comment exists.
  - The box is a small floating PANE (Owen, 2026-10-10), fixed on the screen, for writing a NEW comment:  an
    `<epic-comment-pane>` (the epics pack;  epic `epic-engine` P3).  Once saved and closed, the comment is a THREAD
    (below).
    - just under the selection (or the bullhorn clicked);  above it when there's no room below
    - the page never scrolls for it;  Owen drags it by its header
    - ivory, 8px inside on every side, with no buttons below the text
    - Its header:  the first words of the selected text (else of the block;  its tooltip names the block),
      a floppy, a trash (once the comment is saved) and ×.
    - Its field has no placeholder, only an `aria-label` (Owen, 2026-10-10).
    - It saves itself as Owen types:  the floppy shows saved (its tooltip the time), or turns red.
    - × or Escape (or ⌘ Enter) closes it.  Opening another saves this one first.
    - So does the FOCUS LEAVING it (Owen, 2026-10-10:  "Tabbing out of a bullhorn modal saves it automatically.
      If it's empty, delete it"):  Tab, a click elsewhere on the page.
      - What's typed is saved;  nothing typed saves nothing;  emptied, the comment goes, with no Undo.
      - Another window or tab doesn't count:  the cursor is still in it there.
  - NEVER an empty comment (Owen, 2026-10-10):
    - nothing typed, or only spaces, saves nothing
    - emptied, it goes at once (`delete` while it waits for Claude, else `clear`)
    - the server refuses an `add` or `edit` with no text (white space or zero-width characters only):  400
  - DRAFTS:  what's typed and NOT saved yet is kept in this browser (`localStorage`), to survive a reload.
    - Only while it differs from what the server holds:  under the comment's id once it has one.
    - Leaving the page (`pagehide`) sends what's unsaved at once, as a request that outlives the page.
    - Before 2026-10-10 a saved comment's text stayed as a draft under its BLOCK:  after a reload, that block's
      bullhorn opened with it, and closing the pane saved it again, as a new comment.
      A new comment's draft that copies a comment already on its block is dropped.
  - DELETE:  a trash on every comment's thread, and in the pane's header (Owen, 2026-10-10).
    - Icon only, its tooltip says what it does;  ONE click deletes at once, no dialog.
    - A toast says "Comment deleted", with Undo for 6s (`UNDO_MS`).
      - Undo puts it back as it was:  same block, quote and highlight, text, dates, state, Claude's answers.
      - Its id stays, unless a new comment took it meanwhile (`restore`, below).
      - Before 2026-10-10 the trash took two clicks, the first turning it red:
        Owen clicked once, and thought it broken.
    - `delete` while the comment waits for Claude;  `clear` once Claude has it (a taken one stays in its epic).
  - THREADS (Owen, 2026-10-10:  "the entire comment thread should be in one collapsable/accordion pane").
    EVERY comment shows as one, an `<epic-thread>` (the epics pack;  epic `epic-engine` P3), in the `<epic-threads>`
    box under its block (the runtime's `thread()`, `boxFor()`):
    - ONE element per comment for the visit, given what the server holds at each redraw, moved only when its place
      changes:  Owen's box in it, what's typed and the cursor stay
    - it draws what it's given and says what Owen did (`epic-thread-fold`, `-edit`, `-delete`, `-answer`);  the
      comments' code saves, keeps the box (a `<textarea>`, slotted) and draws it again
    - what it shows is worked out by `ThreadFacts` (`spell-epic/comments`), the comments' code's too
    - A thread is the comment, then its `replies` in order (Claude's answers, Owen's replies), then maybe `done`.
    - WHOSE TURN (`CommentList.turnOf()`, sent by the GET as each comment's `turn`):
      - `owen`:  Claude spoke last.  Also an epic page's comment answered in the doc, with no words on the thread.
      - `claude`:  Owen spoke last, his comment or his reply.  Claude may have taken it, not answered yet.
      - `done`:  Owen closed it.
    - Where (Owen, 2026-10-10:  "show them under the paragraph where they were defined"):
      - right after the smallest paragraph, list item, cell ... holding its quote (`holderOf()`)
      - inside a list item or cell:  at its end
      - else under its block;  a docs section's comes first in its body
    - Folded to its header, except while:
      - it's Owen's turn, or Claude is thinking about it
      - he opened it on this visit, or he's writing in it
      - Before threads, a comment had a card only while it had news Owen hadn't read.
    - Its EDGES (Owen, 2026-10-10:  "same indent as comment box"):
      - under an epic page's item:  its note box's ("Your note:  a question ..."), the item's details' padding
        (`--epic-item-indent` left, 6px right);  so is a thread under a paragraph inside the item
      - else the block's it's under:  a guide's paragraph (its 72ch measure too), table, code ...;  a phase's field
      - Before 2026-10-10:  32px in from the text on each side.
  - A thread's LOOK (the mockup, `comment-thread-mock.html`, a scratch details page, and Owen's notes on it):
    - ALL ivory, whoever spoke last ("Make the entire thing ivory"):
      the pane's `--spell-rail-bg`, outline and corners;  no shadow.
    - ORANGE while it's Owen's turn:  Claude spoke last, and he hasn't answered (✓, a reply, ×) (`unseen()`).
      - Owen, 2026-10-10:  "make the background of the entire bullhorn thread + the last claude reply orange".
        Then, on one that went ivory once looked at:  "I was expecting this to be orange, not ivory".
      - Looking at it no longer clears it:  the SEEN rule below only marks the reply read.
      - Orange is our colour for "changed since you looked".
      - The whole thread's ground:  `--ui-orange` mixed into the ivory, 13% (22% in the dark, where less reads brown).
      - Claude's latest reply (`data-latest`):  a stronger mix, 30% (40% dark), with a faint orange ring.
      - Its outline and header stay as on any thread (before 2026-10-10, only those turned orange).
      - SEEN:  he unfolds it (or opens it from its quote),
        or it's open with half of it (or half the screen) on screen for 1.2s (`SEEN_MS`) while the page is in view.
      - Remembered in this browser, per page, in the store the news-only cards kept before threads:
        `spell-comment-read:<path>`, `{ [comment id]: time of the latest Claude reply seen }`.
        A NEWER reply makes it orange again;  a closed thread never is.
    - Its header:
      - a chevron
      - the bullhorn (a green check circle once done)
      - its id, `M3`:  small and muted, an outline and no fill (epic `epic-workflow` P23)
      - the pane's summary (`ThreadFacts.headline()`):  the quote's first words, else the block's;  its tooltip the full place
      - No date:  each message has its time.
    - Then OWEN'S ANSWER, while it's his turn:  an epic page item's review pills
      ("same semantics/look as pills in item header").
      - The real `<epic-review>`, `buttons="thread"` (`closed`:  Reopen), drawn by the thread in its shadow root:  the
        item line's group, look and colours, but no inbox behind it (a press sends `epic-thread-answer`).
        - Before epic `epic-engine` P3 the docs runtime drew a copy of its markup:  a guide didn't load the pack.
      - ONE grouped pill of 24px square icon buttons, grey outlined, on the page's ground;
        each button its colour under the pointer.
      - Tooltips (Owen, 2026-10-10:  "No tooltip on those same buttons"):
        "That's good:  done", "Reply", "Skip it:  done, nothing more to do".
        - The pointer lands on the titled `<ui-button>` itself (the pack's `Tooltip.css`),
          as the bullhorn's is.
        - See TOOLTIPS, below.
      - Approve's check (green):  "that's good".  The thread is done:  it folds, a check circle in its header.
      - Revisit's history (blue):  reply.  The cursor goes into the reply box at the thread's end.
      - The note box's x (grey):  "skip it".  Done, nothing more to do.
      - A toast says it's done, with Undo (`reopen`).  A closed thread shows Reopen in their place.
    - The pen, while his FIRST words wait and Claude hasn't had them:  they come back in a box to change.
      His pending reply needs none:  it's in the reply box.
    - The trash, always.
    - The MESSAGES:  the colour says who, and a bold "You:" / "Claude:" starts each one's first line.
      - Owen, 2026-10-10:  "Put You in bold, same line, before me and Claude: before yours".
        Earlier he'd dropped a separate name line.
    - Tight:  2px / 6px inside a message, 2px between them.
    - SMALLER than the page's text (Owen, 2026-10-10:  "Make text in comments smaller"):
      the last message 0.9em, as are the reply box and the pane's field.
      - Every message but the LAST smaller still, 0.8em, and quieter.
        - Owen, 2026-10-10:  "Make font smaller for "not current" things -- everything other than last message".
        - The "thinking…" stub and the Done line count as the last.
        - The times keep their size.
      - Owen's:  plain on the ivory, no box, but the same padding as a boxed one ("my text doesn't get bordered").
      - Claude's:  a light violet box (`--ui-violet` mixed light), no side bar.
        - Its outline only a faint violet ring drawn as a shadow, its border clear, so nothing moves.
          Owen, 2026-10-10:  "lighten border around your replies, make it just border-as-shadow".
        - Also "Taken into <epic> · <phase>", and "Answered in the epic page" for an answer with no words here.
          - linked by the phase's stable id, so an insert never moves it (epic `epic-engine` I16, `takenInto()`);
            one taken before:  "<epic> P<n>", at `#p<n>`
      - A green Done line once closed:  a check, "That's good." or "Skipped", the commit Claude named.
        A faint green ring, the same way.
      - While Claude THINKS about it (the comment's `working`):  "Claude: thinking…" last, in Claude's box.
        - its words violet and italic, a turning `circle notch`, its time when he started
        - His answer takes its place.
        - Owen, 2026-10-10:
          "What does it look like when you're thinking?  You could put in a stub and replace that when you've thought".
      - Each one's time in its top right corner, `position: absolute`:
        - The first's carries the day (`10/10 09:12`), the rest only the time, unless the day changed.
        - The full date and time is its tooltip.
        - A hidden copy floats there, so the first line's text stops short of it.
  - The REPLY BOX (`replyBoxFor()`):  last in EVERY open thread, no Revisit needed;  none once done, until Reopen.
    - Owen, 2026-10-10:  "How do I reply?  Probably should have a comment box at the bottom for me".
    - The pane's field (no placeholder, an `aria-label`), its floppy in the corner:
      a line or two, growing with its words.
    - It saves itself as he types (`reply`):  his PENDING reply (the last entry, his, not taken since) changes,
      rather than adding another.
    - Claude's turn:  it still shows, holding his pending reply to change or add to.
      - Once Claude is thinking about it (`working`), his words are read:  the box is empty again, and what he
        types is a new reply after them.
    - FOCUS LEAVING it (Tab, a click elsewhere) saves at once;  emptied, his pending reply goes.
    - Escape or ⌘ Enter saves, and the cursor leaves it.
    - Kept across redraws while he's in it, or it holds words not saved yet, the cursor with it.
      Else it's made again from what the server holds.
    - The pen's box edits his first words while the comment is `new` (`edit`), standing in for the reply box.
      - Focus leaving it, Escape or ⌘ Enter:  saved and closed.
      - Emptied, the comment goes only as the box closes, with Undo:  clearing it to type afresh never loses it.
    - A draft is kept in this browser while it differs from what's saved.
  - Owen's icon buttons outside the pill (the pen, the trash, the pane's ×) are plain:
    no ring, a tint under the pointer.
    - `<ui-button circular basic size="mini">`s, plain through the component's tokens (`.tool` in
      `EpicThread.css` / `EpicCommentPane.css`;  epic `epic-engine` I26)
  - TOOLTIPS:  the browser's own (`title`), a few words each;  the longer wording is the `aria-label`.
    - Owen, 2026-10-10:  "The buttons don't have browser tooltips -- unclear what they do".
    - Each button's:
      - ✓ "That's good:  done"
      - Revisit "Reply"
      - × "Skip it:  done, nothing more to do"
      - Reopen
      - the trash "Delete this comment"
      - the pen "Edit your last words"
      - the pane's × "Close"
    - Why they didn't show in VS Code's side bar:  the pointer was on each button's icon.
      - Electron 38 and up, on macOS, mostly shows a `title`'s tooltip
        only while the pointer is on the titled element ITSELF, not on a child of it.
      - [electron/electron#49843](https://github.com/electron/electron/issues/49843), open;
        VS Code 1.141 runs Electron 43.
    - So every icon inside a comment's buttons takes no pointer, and the pointer lands on the titled button:
      - the pill's, the pen, the trash, the fold, the pane's × and floppy, the bullhorn
      - `pointer-events: none`, in spell-comments.css's "TOOLTIPS that show":  ONE rule for every titled
        `<ui-button>` the runtime draws (`ui-button[title]::part(icon)`);  in the thread and the pane, the pack's
        `Tooltip.css`
      - Keep it so for any new comment button.
    - A plain browser shows them either way.
      Headless Playwright can't show a native tooltip, only check what's under the pointer.
  - Built for reading offline, with no Claude:  only the page server writes them.
- SEND on a docs page (epic `epic-workflow` P13), as on an epic page:
  Owen comments, presses Send, and the session working the epic the page BELONGS to gets them.
  - The page header's right:  a pill, the paper plane, "Send" and how many comments aren't sent yet.
    - blue by the fill rule (grey outline:  nothing waiting;  dashed:  some not sent;  outlined:  sent)
    - then who is listening:  "python-target is listening" (a green dot), "nobody is listening";
      a page no epic owns:  "feedback is listening", "nobody is listening:  Send wakes feedback"
      (or "no epic owns this page" in a repo with no `feedback` epic yet);  each says more in its tooltip
    - The runtime's `drawSend()`.
      It asks again every 30s, since a session that stops leaves only an old heartbeat.
    - Not on an epic page:  its Send is `<epic-page>`'s.
  - Which epic:  `SeeAlso.ownerOf()` ([SeeAlso.ts](tool/SeeAlso.ts)), from the epics' See Also:
    - a page in `epics/<name>/details/`:  epic `<name>`
    - else the epic whose See Also lists it:  its guide's epic first (J88), then an open one,
      then the one updated last (Owen's Q12)
    - none:  the STANDING epic `feedback` (epic `epic-engine` T9, J7;  `SeeAlso.epicFor()`), the inbox for every
      page no epic owns:  guides no epic claims, Epic UI's pages, the list pages, the changelog
      - its `epic inbox wait feedback` hears every such page's Send (`PageInboxes.unowned()`)
      - its old name, `guide-changes`, is read as `feedback` (`epicNamed()`:  `epic` commands, `comments gather
        --epic`, `comments list`)
  - A click:  `POST /api/docs/comments/send`;  the comments waiting are sent (`GuideInbox` `sent`).
  - The epic's `epic inbox wait <name>` wakes on it, and prints each comment under its page.
    - The session answers each with `epic comments working` / `answer` (below), one at a time.
  - Nobody listening:  the Send WAKES the epic, as an epic page's does (P16, `ReviewStart.wakeFor()`).
    - `/epic review` typed into its session, or a new session in its window;  the toast says what it did
    - The comments wait, sent, for that review (its first `wait` takes them), or `/airplane land`.
    - A page no epic owns wakes `feedback`, once its epic page is there (`PageSend`'s `wakes`).
- Where they're kept (git-ignored in the shared repo:  waiting work, per machine):
  - a docs page's:  its INBOX FILE, `<page>.inbox.json5` beside it, with its `sent` and `handedOver`
    - [GuideInbox.ts](tool/GuideInbox.ts), in the `epic` tool since P13:  the tool's `wait` reads it
  - an epic page's:  the epic's review inbox, under `comments` (`ReviewInbox`, see "Review inbox")
  - One shape for both, and every change:  [`CommentList`](tool/CommentList.ts).
  - IDS (epic `epic-workflow` P23):  shown `M1`, `M2` ... ("M" for mark;  Owen, 2026-10-10:  "use `M3` for mark 1")
    - small and muted in each thread's header, before its summary
    - every tool prints `M3`, and takes `M3`, `m3` or the old `cm3` (`CommentList.idOf()`, `label()`)
    - the inbox files KEY them `m1`, `m2` ... too (Owen, 2026-10-17, J178:  "Switch to m3 now";  `cm1` before)
      - an older file's `cm3` is read as `m3`, and written so at its next write (`CommentList.migrate()`)
      - a checkout on older code finds a comment by its key as it is:  until it merges `main`, it misses the
        comments written as `m3`, and its new ones are `cm1` ... again (read as `m` by this code, a clash renumbered)
    - `c1` is a caveat's
- Where a comment is:  its ANCHOR ([BlockAnchors.js](tools/BlockAnchors.js), shared by the runtime and the tools).
  - the block's id, else `<nearest section or plan part id>#<kind>-<n>`
    - e.g. `memory#table-2`, `p3#field-2`, `p3#update-1`
    - An item counts as a container for the updates inside it:  `q3#update-1`.
  - plus an excerpt, to find it again if the page changed
  - a text comment also has its `quote` and `offset`
- The routes:  [commentsRoutes.ts](tools/commentsRoutes.ts)
  - `GET /api/docs/comments?page=` (`takesComments`, every comment)
    - a docs page's `send` too:  `{ epic, owned, listening, sent, unsent, waiting }`
  - `POST /api/docs/comments/send { page }`:  a docs page's Send (an epic page:  400)
  - `POST /api/docs/comments { page, action: add | edit | delete | clear | restore | reply | resolve | reopen, ... }`
    - edit and delete only while `new`;  clear whatever its state
    - add and edit need text:  blank is a 400
    - `restore { id, comment }`:  the trash's Undo, the comment as the GET gave it (`CommentList.restore()`)
    - the thread:
      - `reply { id, text }`:  Owen's reply, as he types (blank empties his pending one;  none pending, a 400)
      - `resolve { id, how: good | skip }`:  "that's good" / "skip it" close it
      - `reopen { id }`
  - The GET adds each comment's `turn`.
    The runtime works it out itself from a server started before threads (`withTurns()`).
  - It carries the comment's `working` too, as the inbox holds it:  any server shows the thinking stub.
  - A page served under `/worktrees/<w>/` redraws on its inbox's change too:  the server announces a shared
    folder's files without that prefix (`inboxPaths`).
  - pages under `guides/`, `pages/`, `epics/` (epic pages too), `sagas/` (saga pages, in their own review inbox)
  - a component set's pages, at its address (`/components/epics/...`), never its `__parts/`
    - their inbox beside each, in the set's tracked `docs/` folder, git-ignored there
    - Epic UI's draw them since epic `epic-engine` P2 (T3):  `spell-comments.js`, the comments alone, beside the
      site's Spell UI (see "Epic UI, the docs set").  Before, the route took their comments, but no page could make one.
    - App UI's and Brand's (spell-app's) too, since epic `epic-engine`'s sets work:  the same line in every page's
      head, and the epics pack in their layout (`<ui-components source="/_epic/pack/epics.pack.js">`), whose
      elements draw the threads and the pane.
    - Spell UI's own too (spell-ui's `docs/`, at `/components/ui/`), the same way.  Its site bundle
      couldn't load a pack until then:  `SitePacks` (`globalThis.SpellUI`'s `registerPack` and `packModules`) was the
      other sets' own build of the site alone;  it's the one bundle now, every set's.
      - Its prose is `<ui-markdown>`'s, in a shadow root:  a text comment there doesn't open (the selection isn't in
        the page's `main`);  the page, each section and a live example's light-DOM text take comments.
    - a page in TABS (a components page's Examples, Usage, API, Theming:  Spell UI's and Brand's element pages):  the
      toolbar lists the shown tab's sections, and follows the tabs (`spell-comments.entry.js`).
  - NOT:
    - an epic page's `parts/`
    - details pages (questions, or comment boxes alone:  their `<epic-send>`;  epic `epic-engine` r6), choice pages,
      run pages
    - `templates/`, the parked goal sets in `goals/` (thoughts), the Brand tab's own pages (`brand/`)
- Claude's side, for docs pages ([comments.ts](tools/comments.ts), [GuideChanges.ts](tools/GuideChanges.ts)):

  ```sh
  epic comments list [--all] [--json]
  epic comments wait [<page>...] [--timeout 8h]
  epic comments answer <page>#<id> --file <html> [--commit <sha>]
  epic comments working <page>#<id> on | off
  epic comments gather [<page>... | --all] [--epic <name>] [--json]
  ```

  - `wait`, run in the background, wakes the session with a comment that starts waiting (on those pages, else any):
    a new one, or Owen's reply on one.  It exits 2 on timeout.
    - e.g. the spell syntax guide's wand, a comment on its row:  "Provide more details here:  `IsGtLt`."
  - `working ... on` as Claude starts on a comment:  its thread shows "Claude: thinking…".
    - It sets the comment's `working`, since when (`CommentList.setWorking()`).
    - `answer` turns it off.
    - Not WAITING meanwhile, and Owen's words before it count as read.
  - WAITING (`CommentList.waiting`):  Claude's turn, not taken since Owen last spoke.
    So Owen's reply on a thread is new work, as a new comment is:  `list` shows it under the comment.
  - `answer` puts Claude's answer on the thread:  Owen's turn.  `--commit`:  the Done line shows it.
  - `list <epic>`:  the comments on the pages that epic owns, and those taken into it.
  - every component set's pages too:  by their served path, `components/epics/epic-item.html#M1`,
    `components/app/Chooser.html#M1`;  their inboxes found in the sets' folders (`PageInboxes.inboxFiles()`, `pages.js`
    `pagePath()` / `pageAt()`, both through `ComponentSetFolders`:  the sets the checkout's settings name
    (`componentSets()`), Epic UI's the engine's `src/docs/` (named or not), the others where the settings put
    them:  spell-app's `app/docs/`, `../spell-brand/docs`).
  - `working` and `answer` stamp the heartbeat of the session listening to the page's epic, if any.
  - `gather` takes every waiting comment (and page note still `new`) into ONE epic, the standing `feedback`
    (`guide-changes` before epic `epic-engine` T9).
    - Only on pages NO epic owns (P13):  an owned page's go to its epic, unless the page is named.
    - `feedback`'s session runs it when a Send wakes it;  `/airplane land` sweeps what was never sent.
    - one phase per page;  an Updated block in the page's phase while it's open
    - a reply rides along under its comment ("Owen replied on the thread")
    - each comment then `taken`
    - `/airplane land` runs it.
- Claude's side, for epic pages:  `epic inbox <name>` lists them, and Owen's replies under them.
  - They reach Claude with the page's SEND, as marks do (see "Review inbox"):
    a send with only comments wakes `wait`, which prints them.
  - `epic inbox working <name>#M3 on | off`:  the thinking stub, as `comments working`.
    With an item's id:  its spinner, as before.
  - Answered like a revisit's note, then:
    - `epic inbox done <name>#M3 [--file <html>] [--commit <sha>]`, or `clear <name>#M3`
    - `done` turns `working` off.
  - `--file`:  the answer on the thread too.  Without it, "Answered in the epic page".

## Page notes

- Before P11 (comments), Owen left notes on docs pages (epic `airplane`, P3).
  - A bubble on each section's title, and a Note pill in the page header:  both gone since.
  - The notes written still show, read only, and `epic notes` still answers them.
- The note is written INTO the page's HTML, so the shared repo commits it with the next turn.
  - The markup:
    - `<spell-notes for="<section id> | page">` groups
    - of `<spell-note id="n3" status="new | answered | done" at>`
    - Claude's `<spell-note-reply by at>` under one
  - The markup, and every edit to it:  [PageNotes.js](tools/PageNotes.js).
  - Plain markup, no element:  the runtime (`spell-doc-runtime.js`, "Page notes") draws each note as a folded card,
    its head line an `<epic-page-note-head>` (the epics pack;  epic `epic-engine` P3).  `spell-doc.css` styles the
    card.
  - An edit splices the page's source, every other byte kept ([`editNotes()`](tools/notesOnDisk.ts)).
    It's formatted after only if the page was formatted.
- Claude's side ([notes.ts](tools/notes.ts)):

  ```sh
  epic notes list [--all] [--json]
  epic notes answer <page>#<id> --file <html>
  epic notes done <page>#<id>
  ```

  - `epic comments gather` takes the `new` ones into `feedback`, with the comments.
- Regenerated pages keep their notes:
  `index.js` puts the groups of the part it rewrites back into their sections (`replaceBetween()`).

## Experiments

- Claims backed by measurement:
  scripts in `<topic>/experiments/`, e.g. `solid/experiments/`, `precedence/experiments/`.
  - Each has a header comment, saying how it was run.
- They live in the shared repo, so they DON'T run in place any more.
  - Node runs them from their real path in the content folder, where there's no `node_modules` to find packages in.
  - To re-measure, copy one into a checkout with packages, and run it there:  spell-epic's root, or another repo's,
    e.g. spell-ui's.
- Tables quote medians of several runs, never a single run.
- Keep the scripts:  they re-measure on upgrades.
- A guide's own LIVE elements, e.g. the custom elements guide's `<ui-counter>`:
  - Their TypeScript source is in its `experiments/`, with an entry file.
  - [bundle-experiment.ts](tools/bundle-experiment.ts) builds them into ONE classic script beside it.
  - The page loads it right after `spell-ui.js`.
  - It's built as a component pack is, so the elements extend the page's own Spell UI:
    - Vite, on Spell UI's `baseConfig()`
    - Solid, `spell/element` and `spell-ui/core`, from the page's `SpellUI.packModules`, by those names
      (epic `repo-split` P14:  an entry still importing by the old alias fails;  import `spell-ui/...`)
  - It may import Spell UI's doc-only families (`spell-ui/docs-components/<family>`), from the checkout's source.
    - Why:  `spell-ui.js` is built from `ui`'s `dist/`, which has none.
  - Rebuild it after editing the elements, or when a doc-only family it imports changes.
  - The script is shared content too, so the last checkout to build it wins.

## Links

- Every reference to a file, folder or external page is a link that opens a NEW TAB.
  - Each destination gets its own named target, so re-clicks reuse that tab.
  - `yarn tsx src/tools/doc-links.js <page>` links `<code>path</code>` references, and targets existing links (idempotent).
    - Paths resolve against the page's folder, its `experiments/`, the repo root, and the Linker's other roots
      (`SRV.Linker`).
  - A name with its path as its tooltip links to that path:  `<code title="path">name</code>`.
    That's how prose names a file (WWOD §6 › "Plain text, plain paths").
  - `yarn tsx src/tools/doc-links.js --check <page>` must pass:
    - every local link resolves
    - one target per destination
    - no nested links
  - The rules themselves live in `spell/server` (`SRV.Linker`):  how a path resolves, which target a link gets.
  - A page in the CONTENT folder links as it's served:  laid under the checkout that serves it (epic `epic-engine` I22).
    - spell-app's pages, and spell-epic's own epics too:  spell-app serves that content, so a code name in an
      epic-engine reply links `../../../spell-epic/src/...` (spell-app's `spell-epic` link), never
      `../../../src/...`, which leads nowhere there
    - which checkout:  `RepoList.linkRootOf()`, the registered repo whose content folder it is;  `PlanDocFiles`'
      linker and `doc-links.js`'s `contentLinker`
    - both told that checkout's SERVED folders (`ServedFolders`, epic `epic-engine` I27):  a link to
      `components/epics/` or `templates/` checks as the folder it serves (`epic lint` called them missing)
    - links to the engine's old places in spell-app (`packages/epics/...`):  fixed once by the migration step
      `engine-links`, gone since epic `repo-split` P14
    - `doc-links.js` is its command line.
    - The `epic` tool links through the same code.
  - Run it under `tsx`, never plain `node`:  it imports `spell/server`.
    - The tools run it through `docLinksRun()`, in [pages.js](tools/pages.js).
- A link to a SAGA, an EPIC, a PHASE or an ITEM is written by what it points at, never by a path
  (epic `epic-workflow` P15):
  - `<epic-link epic="seo" item="J3"></epic-link>`:  draws `seo J3` with J3's title as its tooltip;
    `saga`, `epic`, `item`, `phase` (rules:  [PLAN-DOC.md](tool/PLAN-DOC.md), "Links").
    - It's the epics pack's, which every page the docs runtime runs on loads (see "Overview"):  a guide just writes it.
  - Or a plain link to a SHORT ADDRESS, on any page:  `<a href="SAGA:/drawable-spell/python-target#T1">`.
    - The runtime rewrites it to the page and its `#id` (`wireAddresses()`), in that epic's tab.
    - `doc-links.js` gives it no target and leaves it alone.
  - `doc-links.js --check` fails on a saga, page or id that isn't there, and on an epic under a saga it doesn't name
    (the epics tool's `EpicTargets`:  `Linker`, in `spell/server`, imports no package and skips them).

## Finishing a page

In this order, from spell-epic's root (a page by its path in the checkout it's in):

1. `yarn tsx src/tools/doc-links.js <page>`
2. `yarn vp fmt <page>` (`yarn format` would reformat it anyway)
3. `yarn tsx src/tools/doc-links.js --check <page>`
4. `node src/tools/check-spell.js <page>` must pass, and LOOK at its four screenshots:
   the checks can't see overlap, clipping or bad wrapping
5. `epic pages index`, when the page is new, renamed, or its `<title>` / description changed

## Scripts

- `epic pages update` ([update.js](tools/update.js)):  rebuilds the bundle from the LATEST UI.
  - Then `docs index`, then `doc-links.js --check` and `check-spell.js` on every page.
  - `--skip-ui-build` reuses `../ui/dist`;  `--no-check` skips the browser.
- [bundle-spell-ui.js](tools/bundle-spell-ui.js):  builds UI (`yarn build`), and bundles `spell-ui.js`, in `_assets/`.
  - then `spell-comments.js` beside it (Epic UI's pages' comments);  `--comments`:  only that one, no UI build
  - NOT the claude.ai design system's bundle (`bundle.js` in its `components/`), nor its check:  spell-brand's
    `yarn design:bundle` / `design:check` since epic `repo-split` P10 (Q32), run by `spell design bundle | check`.
- `yarn tsx src/tools/bundle-experiment.ts <entry.ts> [<out.js>]`:  a guide's live elements, as one classic script.
  - See "Experiments".
  - default out:  `<name>.bundle.js`, beside `<name>.entry.ts`
- [design.js](tools/design.js) (`spell design pull | changed | pushed | state`):
  the local half of the `/design` skill.
  - a Claude Design board, as a page
  - the push record:  `design-system.json` in `brand/`, shared
  - the built system it compares:  Spell UI's `build/design-system/`, found as the caller's install finds `spell-ui`
- `epic pages index` ([index.js](tools/index.js)) rewrites:
  - the docs' home page's area cards
  - each area's list page:  `index.html` in `epics/`, `guides/`, `sagas/`, `templates/`, `brand/`
  - it reads the sagas through `Sagas` ([Sagas.ts](tool/Sagas.ts), by path)
- `epic pages create` ([new-page.js](tools/new-page.js)):  a page from a template, at any depth.
- `epic pages open [page] [--vs | --review]` ([open.js](tools/open.js)):  shows a page, by default the index.
  - `page` may be a short address:  `SAGA:/drawable-spell`, `SAGA:/drawable-spell/python-target#T1` (landing on T1)
  - in Chrome, reusing its tab
  - `--vs`:  in VS Code's doc preview, the right side bar's "Epic Docs" tab (`/spell-docs`)
  - `--review`:  its "Review" tab (`/epic review`)
  - Each tab keeps its own page.
    Showing the page a tab already has doesn't reload it:  the page updates itself.
- `epic ask` ([details.js](tools/details.js)):  details pages (see "Details pages").
  - [detailsRoutes.ts](tools/detailsRoutes.ts):  the page server's route module for their answers
- `epic choices` ([choices.js](tools/choices.js)):  choice pages (see "Choice pages").
  - [choicesRoutes.ts](tools/choicesRoutes.ts):  their drafts and answers
- `epic comments list | wait | gather | answer` ([comments.ts](tools/comments.ts)):  comments on docs pages.
  - See "Comments".
  - [commentsRoutes.ts](tools/commentsRoutes.ts):  the pages' bullhorns
- `epic notes list | answer | done` ([notes.ts](tools/notes.ts)):  page notes, from before comments.
  - See "Page notes".
- Forwarders to the `epic` tool (see "Epic pages"):  `plan-doc.js`, `plan-parts.js`, `inbox.js`, `review-backfill.js`.
  - The tool:  `PlanDoc`, `PlanParts`, `ReviewInbox`, `ReviewBackfill`, in [the tool's folder](tool/).
  - For old imports, and callers on older code.
  - The review routes are [reviewRoutes.ts](tool/reviewRoutes.ts).
- `epic agents add | set | done | list | wait | told` ([agents.ts](tools/agents.ts)):
  the running-agents list (epic `skillz`), on [AgentList.ts](tools/AgentList.ts).
  - Every background agent a Claude session started, by name, while it runs.
  - The file:
    - in an epic:  `agents.json5` in the epic's folder (git-ignored in the shared repo)
    - else:  `.spell-agents.json5` at the checkout's root (git-ignored)
    - `--epic <name>`, on any verb, picks the epic
  - Names get a prefix:  the epic's, else the worktree's, else `main`.
    `add aaa` in epic `skillz` is `skillz-aaa`.
  - An entry leaves when its agent finishes (`done`).
    Empty, the file goes.
  - Every write is under the file's lock (`SRV.FileLock`) and atomic, as the review inbox's.
  - REDIRECTS (P3):  an epic page's "Agents running" panel (`<epic-page>`, spell-epic) shows an epic's list,
    with a note box per agent.
    - Owen's note goes through [agentRoutes.ts](tools/agentRoutes.ts), guarded as the review routes are:
      - `GET /api/epics/agents?page=`
      - `POST /api/epics/agents/redirect { page, name, note }`
    - It goes into the entry's `redirects`, untold.
    - Until a session's background `wait` takes it, sends it to the agent, and marks it `told`.
  - The verbs, and an example:  the header of [agents.ts](tools/agents.ts).
- `epic pages link <page> [--hash <id>] [--text "..."] [--review] [--show]` ([link.ts](tools/link.ts)):
  the markdown links Claude gives for a page.
  - side bar first (`--review`:  its "Review" tab), then `• 🌐`, the browser link (Owen, 2026-10-11)
  - `<page>` may be a short address (`SAGA:/drawable-spell/python-target#T1`):  its `--hash`, and its text the short
    form and the item's title (`python-target T1 · ...`)
  - both through [showRoutes.ts](tools/showRoutes.ts) (`GET /api/docs/show`)
- `epic pages fuss <paths...> | --branch [--json]` ([fuss.ts](tools/fuss.ts)):
  the writing checker under `/fussbudget` (epic `skillz`, P7).
  - It lists the misses of WWOD §6 a tool can find, by file and line.
  - kinds:
    - `phrase-split`:  a line ending in a new phrase's first 1-4 words
    - `dense`:  3+ sentences in one paragraph or bullet
    - `jargon`:  a package's banned words (`Fuss.JARGON`)
    - `path-in-prose`:  a file path in a page's or Markdown's running text
    - `code-dense`:  a sentence of 3+ code spans, in a page or Markdown
  - It reads comments and docstrings in code, and Markdown.
    In `.html` pages, everything but `phrase-split`:  the formatter wraps their lines.
  - Exits 1 on any miss.
  - Runs in the caller's folder, so its paths are from there.
- [pages.js](tools/pages.js):  shared by the scripts.
  - the areas:  `EPICS`, `GUIDES`, `PAGES`, `TEMPLATES`, `BRAND`, `GOALS`, `SAGAS`, `HOME`, `LIST_PAGES`
  - `findPages()`
  - `pageFile()`:  a page argument to its file
  - `atDepth()`:  a template at a page's depth
  - `parseArgs()`:  a tool's command line, `--key value` flags and positionals
  - `tidy()` (link targets + oxfmt), `serialize()`
  - `openInChrome()`, `openInVSCode()`
    - epic pages:  the doc preview, through the spell extension's `DocPreview`
    - `{ view: "review" }`:  the "Review" tab
- `tools/check-spell.js <page> [outDir] [--base <url>]`, with Playwright:  writes screenshots.
  - It loads the page from `file://`, or from the page server when the page says `data-spell-needs-server`.
  - `--base <url>`:  from that server, whatever the page (the epic server's `http://127.0.0.1:4848`:  a page as the
    side bar shows it, with its comments and the toolbar's bullhorn)
  - It fails on:
    - console errors
    - an undefined or unrendered `ui-*` or `epic-*` element (an epic page's, the `epics` pack)
    - a toolbar that doesn't list every top-level section (an epic page's:  its `<epic-*>` blocks)
    - a toolbar that isn't on screen at the top, at phone width
    - a page still drawing the old floating rail
    - phone-width overflow, a squeezed content column
    - top-level titles that don't stick (an epic page's largest item section opened first)
    - a section that won't fold / unfold, or forgets its fold on reload
    - an epic page's open `<epic-item>` whose line won't stick under its section's title (Q6, desktop and phone)
- The plan-doc checks are in [the demo folder](demo/), with the review runtime.
  - Each runs Playwright on a COPY of a doc, never a shared one.
  - Their header comments have the details.
  - Every one serves its copies from a page server of its own,
    [DemoServer.ts](demo/DemoServer.ts) (epic `epic-engine` I11):  spell-epic's `EpicServer`, this checkout's code.
    - It WAKES NOBODY:  a Send or Do Now with nobody listening reaches a stubbed wake, never a window or a session.
    - Airplane mode is off for it, whatever the machine's switch says.
  - `node src/demo/check-review-epics.mjs [--doc <name>] [outDir]`, from the root:
    - It clicks through every review flow on `<epic-*>` controls, and reads each back from the inbox:
      Approve, Make Todo, Revisit and its note box, drafts across a reload, Later, Do Now, nevermind,
      Add Details Now, Send, the countdown's send.
    - No control past the window, or over a title, at 280 / 900px, light and dark.
    - It refuses while the copy's inbox file exists.
    - Run it after touching the review controls or `ReviewClient`.
  - `node src/demo/check-live-epics.mjs [epic] [--item <id>] [--bundle <spell-ui.js>]`, from the root:
    - Three live edits (an attribute, a part, a child) must patch the `<epic-*>` elements in place.
    - They must keep the open item, a half-typed note and its focus, and the scroll.
    - Then a CODE change (`spell-ui.js`) must reload the page once, after the note box loses the focus,
      and keep the scroll, every block and item open before, and the note.
    - Run it after touching `liveClient.ts`, the runtime's "Live update", or its landing and folds.
  - `node src/demo/check-header-epics.mjs [--doc <name>]... [outDir]`, from the root:
    - the page header and the review line
    - the Phases section's `open/all` badge (item sections show only their state chips)
    - the state filter
    - each phase's title pen and plan changes (`<epic-update>` blocks, no box)
    - at 280 / 900px, light and dark
  - `node src/demo/check-comment-jump.mjs [--guide <page>] [--doc <epic>] [outDir]`, from the root:
    - comment ids (`M1` ...), the toolbar's bullhorn and its count, Cmd-K on a comment's id and its waiting list,
      on a guide and an epic page (epic `epic-workflow` P23)
    - their comments stubbed in the browser, every POST aborted:  no inbox read or written, nobody woken
    - Run it after touching the comments' runtime, the toolbar or the jump dialog.
  - `node src/demo/check-comments-epic-ui.mjs [--set epics | ui | app | brand] [--checkout <spell-app>] [--page <name>]
    [--swap <name>] [--docs <folder>] [--bundle <spell-ui.js>] [--keep] [--dark] [outDir]`, from the root:
    - `--set ui` / `app` / `brand`:  Spell UI's, App UI's or Brand's pages, from the folder `--checkout`'s settings name (`componentSets()`)
      (default the epic server's default repo's;  a spell-app worktree's, to check its pages before they merge), with that checkout's site
      bundle (Epic UI's too, when `--checkout` is named);  a tabbed page's toolbar too
    - `--set ui`:  three element pages' live examples still draw and answer a click (a dropdown, a modal, a checkbox)
    - `--dark`:  all of it in the dark colour scheme
    - comments on Epic UI's pages (epic `epic-engine` P2):  the bullhorns, a page comment and a text one, their
      threads, Send, the router's swap and back, at 1200 and 390px;  and a guide's still drawn by the docs bundle
    - their toolbar (epic `epic-engine` T11):  a button per section landing it under the band, the bullhorn's count
      and its jumps, Cmd / Ctrl + K on a comment's id and on words (the site's search), the router's swap
    - on a scratch copy of the set's folder unless `--docs`;  nobody woken
    - Run it after touching the comments' code or look, or Epic UI's layout.
  - `node src/demo/check-test-run.mjs [--doc <name>] [outDir]`, from the root (epic `epic-engine` P4):
    - a test run on a scratch copy of an epic page, its To test section replaced by scratch tests (the new shape and
      older prose-only ones):  Start testing, Passed, Failed with a note and a pasted screenshot, Skip, Not now, a
      reload mid-run, the summary and Send results, Esc;  the marks read back from the copy's inbox file
    - a run across every epic (`?test=1&all=1`):  the summary's Next opens the next copy in test mode
    - at 390 and 1200px, light and dark, reduced motion
    - Run it after touching `<epic-test-run>`, the page's test mode, or the test marks' routes.
  - `node src/demo/check-fold-epics.mjs [--doc <name>] [--item <id>] [--guide <path>] [outDir]`, from the root:
    - A fold never moves what was clicked:  the line or title stays put, within 1px, for 1.5s after the click.
    - Items a link landed on (at once, mid window, near the page's end), one opened by a click,
      a phase, a guide's section, and the next item's line clicked after a reply.
    - At 1200 and 390px.
    - Run it after touching the folds, the landing, or `holdWhileFolding()`.
- [migrate.js](tools/migrate.js):  the MIGRATION steps of every page kind but the epic page's (epic `epic-workflow` P8).
  - `epic migrate [<kind>] [--file <page>]` runs it as a child, beside the epic page's own steps
    ([PLAN-DOC.md](tool/PLAN-DOC.md), "Migrations").
  - `KINDS`:  the page kinds, the same list as the `epic` tool's `PAGE_KINDS` (its test checks).
  - `pageKind()`:  a page's kind, from where it lives and what it loads.
  - `STEPS`, oldest first, each named and dated, each page under its lock (`withLocks()`).
    Today:
    - `components-not-markup` ([to-components.js](tools/to-components.js), epic `epic-engine` P3):
      a page's contents in components, not markup written by hand
      - a bare `<table>` in `<ui-table celled compact striped unstackable>`, the table unchanged inside
      - every `<ui-table>` without `unstackable` given it, after its own words;  one that asks to stack (`stackable`,
        `stack-by`) listed (epic `epic-engine` I36)
      - a `<details>` aside as `<ui-accordion class="spell-aside" styled>` (`spell-code` round one code block),
        its id and classes kept, folded
      - LEFT, and listed for a person:  a table with its own class, style or role (which look is a call);  a
        `<details>` that isn't a plain summary and body;  either inside an `<epic-*>` element that reads its
        children;  everything on a page that runs its own script, or styles tables or asides itself
      - not its business:  a page's own buttons (its script wires them), the markup the TOOLS draw (their own code
        becomes elements), a heading outside `<ui-section>` (where its section ends is a call)
      - on 2026-10-19 it had nothing to do in spell-app's content:  every table was in a `<ui-table>` already
    - `engine-asset-paths` (epic `repo-split` I63):  a page loading the engine's files by an old checkout path
      (`<up>packages/epics/tools/_assets/`, the old pack folders) loads them from the engine routes (`/_epic/...`)
      - only what the page LOADS:  `<link href>`, `<script src>`, `<ui-components source>`;  a plain link is kept
      - every kind but the epic page's:  the saga pages count as saga pages here (`goal`), since `epic migrate`
        lists only epics' pages;  the sagas', goal sets' and brand areas are walked too
    - A step's `run(document, { file })` gets the page's path:  for what lies beside it.
    - A step runs on a page only when its `applies()` holds on the page as the steps before left it.
      Notes it returns with nothing changed (what it left, or skipped) are reported all the same.
    - The epic `details` has its epic page in a `details/` folder:  `pageKind()` takes an epic page's path first.
  - The older steps went once every page had run them (epic `repo-split` Q45):  `ui-section`, `answer-elements`,
    `engine-asset-routes` and the data files' renames;  their code is in git history.
  - A change to a page kind's markup adds its step here, in the same commit.
- [doc-links.js](tools/doc-links.js):  see "Links".
  - Text and regexes, not a DOM:  it edits only what it links.
  - Its page arguments are from where it runs:  a guide, from epics' folder, is `../../guides/x.html`.
  - `--root <checkout>`:  links resolve in another checkout (a copy of the pages beside a copy of the code).
  - The linking itself is `spell/server`'s `Linker`.
  - `PlanParts.formatHTML()` is `spell/server`'s `formatHTML()` too.
- A spell-ui problem:  fix it in spell-ui when it's a real `ui` bug (the same change may touch both).
  - Else work around it here.
  - Either way, add it to [spell-ui-findings.md](../../spell.epics/guides/spell-docs/spell-ui-findings.md).

## Agent rules

- When agents need a doc's rules, also write a distilled `.md` beside it:  bullets, `ts` code blocks.
  - Point to it from the top of an `AGENTS.md`, with an "if working with X, READ file" line.
  - The package's `AGENTS.md`, or the root's when other packages need it too.
  - See [solid-2.md](../../spell.epics/guides/solid/solid-2.md), pointed to from the root's.
- A doc's rules are about ITS topic (Solid's mechanics, a tool's flags).
  - House style, how we write any code, goes in WWOD (`agents/wwod/`), not in a distilled doc.
