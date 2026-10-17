# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in spell-epic.

- spell-epic is the epic tooling, lifted out of spell-app (epic `epic-eject` P6):  [the README](README.md) says what
  it is, how it's laid out and how it's installed.
- The house style is spell-app's, WWOD:  **READ it FIRST**, from the spell-app checkout spell-epic uses,
  [WWOD](.spell-app/agents/wwod/WWOD.md) (`.spell-app` is the root's link to that checkout).
- The epics package's own rules:  [its AGENTS.md](packages/epics/AGENTS.md).
  - It was written inside spell-app:  its links to spell-app's files (`../../AGENTS.md`, `../ui/...`) mean that
    checkout's, through `.spell-app`.
- Its Solid code follows spell-app's Solid 2 rules:  [solid-2.md](.spell-app/guides/solid/solid-2.md), IN FULL first.
- Skills:  `skills/<name>/SKILL.md`, the plugin's.  They link each other by relative path (`../isolate/SKILL.md`),
  and the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
- Hooks:  `hooks/hooks.json` and the scripts beside it.  Every hook exits 0 whatever happens, except the worktree
  hook, whose failure is Claude Code's answer.
- Checks, from the root:  `yarn ts`, `yarn test`, `yarn lint`, `yarn plugin:validate`.
