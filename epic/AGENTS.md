# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in `epic/`, the epic tooling:
a folder of the kit `spell`.

- It's the epic tooling, a Claude Code plugin, lifted out of spell-app (epic `epic-eject` P6).
  [The README](README.md) says what it is and how it's laid out;  [README-adopting.md](README-adopting.md), how it's
  installed.
- The house style is Spell's, WWOD:  **READ it FIRST**, from the kit:  [WWOD](../agents/wwod/WWOD.md).
  - No `agents/` link at the folder's root (epic `epic-eject` I23):  Claude Code reads a plugin's root `agents/` as
    agent types.
- A folder of the kit's ONE repo and ONE package, `spell`, at `~/www/spell/epic/` (epic `repo-split` P20).
  - It was a repo of its own, spell-epic, until then, and was merged in with its history.
  - The one repo, install, `yarn.lock` and CI workflow are the kit's:
    [the kit's AGENTS.md](../AGENTS.md), "The kit" and "CI".
- Its [package.json](package.json) is a FOLDER MANIFEST, not a package:
  a private workspace of the kit's install, still named `spell-epic`.
  - It holds the folder's scripts, its settings (`"pageServer"`, `"spellPack"`, `"spellPublish"`), its `epic` bin
    and its dependencies.
  - No `exports`:  the kit's [package.json](../package.json) holds every folder's names ("Imports", below).
- It stands on the kit's `src/` and on Spell UI (`ui/`), by their import names (WWOD §4), never by a path into
  another folder.
  - TypeScript reads their source, as it reads this folder's:  `yarn ts` builds no declarations first.
  - A tool finding one on disk asks Node's resolver ([packageDir.ts](src/tools/packageDir.ts), on the kit's
    `spell/toolchain/sourceNames`).
  - Their source runs here as it is, by those names:  `tsx` (`bin/epic`, the `tsx` scripts), Vite and Vitest.
  - Only `app/` sits above it (the lint's `spell/no-upward-import`).
- Laid out as a plain JS project (epic `epic-eject` J14):
  - `src/`:  the code, the elements and the docs tools included;  its rules:  [src/AGENTS.md](src/AGENTS.md)
  - `tests/`:  its tests, at the same paths as the code (`tests/command/X.test.ts` for `src/command/X.ts`)
  - `scripts/`:  dev-only scripts;  `vscode/`:  the extension, its own yarn project
  - the plugin's parts at the folder's root:  `.claude-plugin/`, `skills/`, `hooks/`, `bin/epic`
- [src/AGENTS.md](src/AGENTS.md) was written inside spell-app, as `packages/epics/AGENTS.md`.
  - Its links lead from where it is now:  the content folder's pages through `../../spell.epics/`,
    the kit's and the other folders' files by their paths (`../../ui/`, `../../agents/`).
  - Some of its prose still speaks from spell-app's checkout, which serves the content folder's pages.
- Its Solid code follows Spell's Solid 2 rules:  [solid-2.md](../spell.epics/guides/solid/solid-2.md), IN FULL first.
- Skills:  the plugin's, a `SKILL.md` per skill in [the skills folder](skills/).
  - They link each other by relative path (`../isolate/SKILL.md`).
  - They reach the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
- Voices:  how a kind of people-facing page is written, one file each in [the voices folder](voices/)
  (epic `readme` P12).
  - `readme` ([readme.md](voices/readme.md)):  READMEs, an epic's guide, reference pages.
  - `novice` ([novice.md](voices/novice.md)):  pages for people who don't program (yet).
  - `blog` ([blog.md](voices/blog.md)):  essays and posts, an argument a reader finishes.
  - `brand` ([brand.md](voices/brand.md)):  product pages:  a home page, a feature page, a launch page.
  - The last three are named by no kind of page yet (`"pageVoices"`):  ask for one by name, `epic voice blog`
    (epic `readme` P15).
  - `code`:  docstrings, comments, `AGENTS.md` files, epic pages:  each repo's own house style (Spell's:  WWOD §6),
    so the plugin ships no file for it.
  - Configurable (epic `readme` P13):  a repo's `.epic/config.json5` names its own voices (`"voices"`, a name to a
    file) and which voice each kind of page takes (`"pageVoices"`);  a repo whose settings name a top
    (spell-brand's name the kit) takes the top's.
    The skills ask by name:  `epic voice <name>`, `epic voice --for <kind>` print the file (`EpicConfig.voiceFile()`).
  - The skills that write such pages name the voice they use:  the epic skill's "6. Doc Review", `/docs-check`.
  - A repo's own house style adds its specifics on top, and wins where they disagree.
- Hooks:  [hooks.json](hooks/hooks.json) and the scripts beside it.
  - Every hook exits 0 whatever happens.
  - Except the worktree hook:  its failure is Claude Code's answer.
  - And the inbox poller, the `asyncRewake` `Stop` hook (`monitors/listen.mjs --hook`, epic `epic-engine` I144):
    it runs in the background and exits 2 with its `📬` line, which is how it wakes the session.
- Removing a worktree stops its page and vite servers FIRST (`CheckoutServers`, epic `epic-engine` I53):
  - `epic worktree remove <name>`, never a bare `git worktree remove`, in the skills and anything new
  - the worktree hook and `epic worktree move` do it themselves;  the session-start hook stops the rest, hourly
- The epic server ([EpicServer.ts](src/server/EpicServer.ts)) opens each repo's APP at `/editor/` (the top bar's App
  tab):  the repo declares it in its `.epic/config.json5`'s `"app"` ([RepoApp.ts](src/server/RepoApp.ts));  the
  server starts it in the background when it's down, never restarts it, and never serves it itself.
- Imports:  "Imports" below.
- Checks, from `epic/`:  `yarn ts`, `yarn test`, `yarn lint`, `yarn plugin:validate`;  over every folder:  the kit's
  `yarn ts` / `yarn test` / `yarn lint`, at its root.

## Imports

As WWOD §4, plus these.

- ONE name per file, the same from every folder (epic `repo-split` P14, Q47;  P20):  `spell/epic/` plus the file's
  path under `src/`, no extension, inside `epic/` too.
  - `spell/epic` (the barrel, `EP`), `spell/epic/markup`, `spell/epic/tool/PlanDoc`,
    `spell/epic/components/epic-page`
  - Same-folder peers stay `./PlanItem`;  NEVER a `../` climb, NEVER a `$/` alias.
  - Files outside `src/` (`tests/`, `scripts/`, `hooks/`, the extension's `vscode/`) import `src/` the same way.
    The one file code imports from OUTSIDE `src/` has an explicit key in the kit's `exports`:
    `spell/epic/vscode/src/docUrls.ts`, for its test.
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
