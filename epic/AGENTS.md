# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in spell-epic.

- spell-epic is the epic tooling, lifted out of spell-app (epic `epic-eject` P6).
  [The README](README.md) says what it is, how it's laid out and how it's installed.
- The house style is Spell's, WWOD:  **READ it FIRST**, from the kit around this repo:
  [WWOD](../agents/wwod/WWOD.md).
  - No `agents/` link at the root (epic `epic-eject` I23):  Claude Code reads a plugin's root `agents/` as agent types.
- spell-epic is a child repo of the kit `spell-kit`, and a workspace of its ONE install (`yarn install` in the kit;
  epic `epic-engine` P10):  the other repos' packages (`@spell-app/ui`, `spell-kit/server` ...) are `workspace:*`
  dependencies, imported by their package names (WWOD §4), never by a path into a sibling repo.
  - `tsc` reads their built declarations (`dist-types/`):  `yarn ts` builds them first (`spell-types --below`).
  - A tool finding one on disk asks Node's resolver ([packageDir.ts](src/tools/packageDir.ts)).
  - Their source runs here with their own `$/` names through `spell-kit/toolchain/aliases` (`bin/epic`, the
    `tsx` scripts).
- spell-epic is ONE package, `@spell-app/epics` (epic `epic-eject` J14), laid out as a plain JS repo:
  - `src/`:  the code (`$/epics`), the elements and the docs tools included;  its rules:  [src/AGENTS.md](src/AGENTS.md)
  - `tests/`:  its tests, at the same paths as the code (`tests/command/X.test.ts` for `src/command/X.ts`)
  - `scripts/`:  dev-only scripts;  `vscode/`:  the extension, its own yarn project
  - the plugin's parts at the root:  `.claude-plugin/`, `skills/`, `hooks/`, `bin/epic`
- [src/AGENTS.md](src/AGENTS.md) was written inside spell-app, as `packages/epics/AGENTS.md`:
  its links to spell-app's files (`../ui/...`, `../../agents/...`) mean what are now spell-ui's (`../spell-ui/`) and the
  content folder's (`../spell.epics/agents/`).
- Its Solid code follows Spell's Solid 2 rules:  [solid-2.md](../spell.epics/guides/solid/solid-2.md), IN FULL first.
- Skills:  the plugin's, a `SKILL.md` per skill in [the skills folder](skills/).
  - They link each other by relative path (`../isolate/SKILL.md`).
  - They reach the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
- Hooks:  [hooks.json](hooks/hooks.json) and the scripts beside it.
  - Every hook exits 0 whatever happens.
  - Except the worktree hook:  its failure is Claude Code's answer.
- Removing a worktree stops its page and vite servers FIRST (`CheckoutServers`, epic `epic-engine` I53):
  - `epic worktree remove <name>`, never a bare `git worktree remove`, in the skills and anything new
  - the worktree hook and `epic worktree move` do it themselves;  the session-start hook stops the rest, hourly
- The epic server ([EpicServer.ts](src/server/EpicServer.ts)) opens each repo's APP at `/editor/` (the top bar's App
  tab):  the repo declares it in its `.epic/config.json5`'s `"app"` ([RepoApp.ts](src/server/RepoApp.ts));  the
  server starts it in the background when it's down, never restarts it, and never serves it itself.
- Checks, from the root:  `yarn ts`, `yarn test`, `yarn lint`, `yarn plugin:validate`;  over every repo:  the kit's
  `yarn ts` / `yarn test` / `yarn lint`.
