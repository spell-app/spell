# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in spell-epic.

- spell-epic is the epic tooling, lifted out of spell-app (epic `epic-eject` P6).
  [The README](README.md) says what it is and how it's laid out;  [README-adopting.md](README-adopting.md), how it's
  installed.
- The house style is Spell's, WWOD:  **READ it FIRST**, from the kit around this repo:
  [WWOD](../agents/wwod/WWOD.md).
  - No `agents/` link at the root (epic `epic-eject` I23):  Claude Code reads a plugin's root `agents/` as agent types.
- spell-epic is a child repo of the kit `spell-kit`, and a workspace of its ONE install (`yarn install` in the kit;
  epic `epic-engine` P10):  the other repos' packages (`spell-ui`, `spell-kit/server` ...) are `workspace:*`
  dependencies, imported by their package names (WWOD §4), never by a path into a sibling repo.
  - `tsc` reads their built declarations (`dist-types/`):  `yarn ts` builds them first (`spell-types --below`).
  - A tool finding one on disk asks Node's resolver ([packageDir.ts](src/tools/packageDir.ts), on the kit's
    `spell-kit/toolchain/sourceNames`).
  - Their source runs here as it is, by those names:  `tsx` (`bin/epic`, the `tsx` scripts), Vite and Vitest.
- spell-epic is ONE package, `spell-epic` (epic `epic-eject` J14), laid out as a plain JS repo:
  - `src/`:  the code, the elements and the docs tools included;  its rules:  [src/AGENTS.md](src/AGENTS.md)
  - `tests/`:  its tests, at the same paths as the code (`tests/command/X.test.ts` for `src/command/X.ts`)
  - `scripts/`:  dev-only scripts;  `vscode/`:  the extension, its own yarn project
  - the plugin's parts at the root:  `.claude-plugin/`, `skills/`, `hooks/`, `bin/epic`
- [src/AGENTS.md](src/AGENTS.md) was written inside spell-app, as `packages/epics/AGENTS.md`.
  - Its links lead from where it is now:  the content folder's pages through `../../spell.epics/`,
    the kit's and the other repos' files by their folders (`../../spell-ui/`, `../../agents/`).
  - Some of its prose still speaks from spell-app's checkout, which serves the content folder's pages.
- Its Solid code follows Spell's Solid 2 rules:  [solid-2.md](../spell.epics/guides/solid/solid-2.md), IN FULL first.
- Skills:  the plugin's, a `SKILL.md` per skill in [the skills folder](skills/).
  - They link each other by relative path (`../isolate/SKILL.md`).
  - They reach the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
- Voices:  how a kind of people-facing page is written, one file each in [the voices folder](voices/)
  (epic `readme` P12).
  - `readme` ([readme.md](voices/readme.md)):  READMEs, an epic's guide, reference pages.
  - `code`:  docstrings, comments, `AGENTS.md` files, epic pages:  each repo's own house style (Spell's:  WWOD §6),
    so spell-epic ships no file for it.
  - 🌱 Epic `readme` P13 makes them configurable:  a repo's settings name each voice's file and each kind of page's
    voice, and the skills ask for a voice by name.
  - The skills that write such pages name the voice they use:  the epic skill's "6. Doc Review", `/docs-check`.
  - A repo's own house style adds its specifics on top, and wins where they disagree.
- Hooks:  [hooks.json](hooks/hooks.json) and the scripts beside it.
  - Every hook exits 0 whatever happens.
  - Except the worktree hook:  its failure is Claude Code's answer.
- Removing a worktree stops its page and vite servers FIRST (`CheckoutServers`, epic `epic-engine` I53):
  - `epic worktree remove <name>`, never a bare `git worktree remove`, in the skills and anything new
  - the worktree hook and `epic worktree move` do it themselves;  the session-start hook stops the rest, hourly
- The epic server ([EpicServer.ts](src/server/EpicServer.ts)) opens each repo's APP at `/editor/` (the top bar's App
  tab):  the repo declares it in its `.epic/config.json5`'s `"app"` ([RepoApp.ts](src/server/RepoApp.ts));  the
  server starts it in the background when it's down, never restarts it, and never serves it itself.
- Imports:  "Imports" below.
- Checks, from the root:  `yarn ts`, `yarn test`, `yarn lint`, `yarn plugin:validate`;  over every repo:  the kit's
  `yarn ts` / `yarn test` / `yarn lint`.

## Imports

As WWOD §4, plus these.

- ONE name per file, the same in every repo (epic `repo-split` P14, Q47):  the package name and the file's path under
  `src/`, no extension, inside this repo too.
  - `spell-epic` (the barrel, `EP`), `spell-epic/markup`, `spell-epic/tool/PlanDoc`,
    `spell-epic/components/epic-page`
  - Same-folder peers stay `./PlanItem`;  NEVER a `../` climb, NEVER a `$/` alias.
  - Files outside `src/` (`tests/`, `scripts/`, `hooks/`, the extension's `vscode/`) import `src/` the same way.
    The one file code imports from OUTSIDE `src/` has an explicit `exports` key:  `spell-epic/vscode/src/docUrls.ts`,
    for its test.
- How every tool finds them:  `package.json`'s `exports`, no alias table anywhere.
  - TypeScript:  the `spell-epic-source` condition (`customConditions` in [tsconfig.json](tsconfig.json)) reads the
    source.
  - Vite, Vitest, `tsx`:  `default`, the source, adding the extension themselves.
  - Every folder barrel has an explicit key (`"./markup"`, `"./components/epic-page"` ...):  `tsx`, run from another
    repo through `node_modules` (the kit's page server loads the route modules), finds a file without its
    extension but not a folder's `index`.
  - esbuild (the extension's build, the docs bundle's) finds neither by itself:  the kit's `sourceNames()`
    (`spell-kit/toolchain/sourceNames`) finds our packages' names as their source files.
- PLAIN `node` writes the extension, as it needs it (the `"./*.ts"` key):  `spell-epic/config/EpicConfig.ts`,
  `spell-epic/window.mjs`, `spell-epic/tools/pages.js`.
  - Plain node runs the hooks, the window script, and the docs tools' `.js` scripts (`details.js`, `update.js` ...):
    every file they load, of ours, imports this way, and of the kit's only its explicitly exported files
    (`spell-kit/server/checkout`, `spell-kit/server/DataFile` ...).
- A page's pack modules (`spell-ui.entry.js`'s `packModules`) are keyed by the import names themselves
  (`spell-kit/element`, `spell-ui/core`;  epic `repo-split` P14, Q45):  what a pack's build leaves external.
