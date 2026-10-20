# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in spell-epic.

- spell-epic is the epic tooling, lifted out of spell-app (epic `epic-eject` P6).
  [The README](README.md) says what it is, how it's laid out and how it's installed.
- The house style is spell-app's, WWOD:  **READ it FIRST**, from the spell-app checkout spell-epic uses:
  [WWOD](.spell-app/agents/wwod/WWOD.md).
  - `.spell-app` is the root's link to that checkout.
- spell-epic is ONE package, `@spell-app/epics` (epic `epic-eject` J14), laid out as a plain JS repo:
  - `src/`:  the code (`$/epics`), the elements and the docs tools included;  its rules:  [src/AGENTS.md](src/AGENTS.md)
  - `tests/`:  its tests, at the same paths as the code (`tests/command/X.test.ts` for `src/command/X.ts`)
  - `scripts/`:  dev-only scripts;  `vscode/`:  the extension, its own yarn project
  - the plugin's parts at the root:  `.claude-plugin/`, `skills/`, `hooks/`, `bin/epic`
- [src/AGENTS.md](src/AGENTS.md) was written inside spell-app, as `packages/epics/AGENTS.md`:
  its links to spell-app's files (`../ui/...`, `../../agents/...`) mean that checkout's, through `.spell-app`.
- Its Solid code follows spell-app's Solid 2 rules:  [solid-2.md](.spell-app/guides/solid/solid-2.md), IN FULL first.
- Skills:  the plugin's, a `SKILL.md` per skill in [the skills folder](skills/).
  - They link each other by relative path (`../isolate/SKILL.md`).
  - They reach the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
- Hooks:  [hooks.json](hooks/hooks.json) and the scripts beside it.
  - Every hook exits 0 whatever happens.
  - Except the worktree hook:  its failure is Claude Code's answer.
- The epic server ([EpicServer.ts](src/server/EpicServer.ts)) opens each repo's APP at `/editor/` (the top bar's App
  tab):  the repo declares it in its `.epic/config.json5`'s `"app"` ([RepoApp.ts](src/server/RepoApp.ts));  the
  server starts it in the background when it's down, never restarts it, and never serves it itself.
- Checks, from the root:  `yarn ts`, `yarn test`, `yarn lint`, `yarn plugin:validate`.
