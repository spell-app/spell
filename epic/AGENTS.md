# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in spell-epic.

- spell-epic is the epic tooling, lifted out of spell-app (epic `epic-eject` P6).
  [The README](README.md) says what it is, how it's laid out and how it's installed.
- The house style is spell-app's, WWOD:  **READ it FIRST**, from the spell-app checkout spell-epic uses:
  [WWOD](.spell-app/agents/wwod/WWOD.md).
  - `.spell-app` is the root's link to that checkout.
- The epics package's own rules:  [its AGENTS.md](packages/epics/AGENTS.md).
  - It was written inside spell-app, so its links to spell-app's files mean that checkout's, through `.spell-app`.
  - E.g. `../../AGENTS.md`, `../ui/...`
- Its Solid code follows spell-app's Solid 2 rules:  [solid-2.md](.spell-app/guides/solid/solid-2.md), IN FULL first.
- Skills:  the plugin's, a `SKILL.md` per skill in [the skills folder](skills/).
  - They link each other by relative path (`../isolate/SKILL.md`).
  - They reach the plugin's own files through `${CLAUDE_PLUGIN_ROOT}`.
- Hooks:  [hooks.json](hooks/hooks.json) and the scripts beside it.
  - Every hook exits 0 whatever happens.
  - Except the worktree hook:  its failure is Claude Code's answer.
- Checks, from the root:  `yarn ts`, `yarn test`, `yarn lint`, `yarn plugin:validate`.
