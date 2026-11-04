# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `cli/` (`spell/cli`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every folder shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- The `spell` command's base:  `spell/cli` (`CLI`), for the kit and every big folder.
  - It reads the command line, prints help, and finds every folder's commands:
    the kit's, then each folder of its `workspaces` whose `package.json` has a `"spell"` entry (`spellRepos()`).
  - Each big folder adds its own commands;  the kit adds a few of its own.
  - It was spell-app's `cli/` until epic `repo-split` P13 (decisions Q33, Q42).
  - [README/cli.md](../../README/cli.md), "How a command is built", says how it works, and how to add a command.
- What's in it:
  - [the `spell` bin](../../bin/spell.mjs) -- starts it:  `tsx` with the kit's node settings, then [main.ts](main.ts)
  - [main.ts](main.ts) -- the process entry:  every folder's commands, then the command line.
    NOT in the barrel:  importing it runs the command line.
  - [program.ts](program.ts) -- `spellProgram()`, `addRepoCommands()` (the clash rule), `addHelp()`
  - [repos.ts](repos.ts) -- `spellRepos()`, `commandLists()`, `hook()` / `needHook()`
  - [run.ts](run.ts) -- `runCommand()`, `rawArgsAfter()`, `out()` / `err()`, `relativePath()`;
    `ask()`, a question asked only in a real terminal;  `choose()`, a pick-one list there (arrows and Enter, or a
    number key;  no library:  the app's Ink pickers are a folder above);  both draw the question bold yellow
  - [tools.ts](tools.ts) -- `runTool()`, `runChild()`, `epicBin()` / `runEpic()`, `runSpellEpic()` (`spell epic`)
  - [findCheckout.ts](findCheckout.ts) -- `findCheckout()`, `KIT_ROOT`, `KIT_MARKER`
  - [cli.types.ts](cli.types.ts) -- `EXIT`, `CliError`, the flags' types, `CommandList`, `HookList`, `SpellRepo`
- The kit's own commands:  [commands.ts](commands.ts) is their list, [commands/](commands/) their work.

  ```
  server  bundle  commands  wwod  readme  map  coherence  publish  epic  pony  (help is the program's own)
  ```

- `spell publish`'s work is a folder of its own, [publish/](publish/) (`spell/cli/publish`), with its own barrel:
  - it loads esbuild, Solid's compiler, Lightning CSS and Playwright when it runs
  - it names no folder:  each says how it publishes in its folder manifest, `"spellPublish"`
    ([publish.types.ts](publish/publish.types.ts))
- `spell map`'s work is a folder of its own too, [map/](map/) (`spell/cli/map`), with its own barrel
  (epic `coherence` P1):
  - the code map runs graphify, an optional Python install (`Graphify`), in each repo, then merges and links them
    (`CodeMap`);  the docs map is ours, read by structure (`DocsMap`)
  - [README/cli.md](../../README/cli.md), "Asking the map", says how to use it
- `spell coherence score`'s work is a folder of its own too, [coherence/](coherence/) (`spell/cli/coherence`),
  with its own barrel (epic `coherence` P15):
  - it reads the catalog's **Score:** lines (`agents/coherence/`), counts each mechanism's copies with `git grep`
    over every repo's `src/`, and its users from the code map (`CoherenceScore`)
  - its snapshots go to the epic folder (`ScoreSnapshots`)
  - [README/cli.md](../../README/cli.md), "Scoring coherence", says how to use it
- The barrel MUST stay lean:  node built-ins, commander and chalk.
  - Every folder's command list imports it, and `spell help` loads them all.
  - So it never exports a command's work:  [commands.ts](commands.ts) imports each one's file when it runs.
- Every folder's commands run in ONE process,
  under `tsx` with the kit's node settings ([tsconfig.node.json](../../tsconfig.node.json)):
  `tsx` takes one tsconfig for every file.
  - So its settings are what every folder's commands need:  `jsx: react-jsx` for the app's Ink screens,
    `target: ES2020` so the parser's standard decorators are lowered.
  - The bin hands `tsx` [tsconfig.tsx.json](../../tsconfig.tsx.json), which extends them over EVERY folder's files:
    `tsx` applies a tsconfig only to the files it includes, and `tsconfig.node.json` includes only the kit's `src/`
    (epic `repo-split` I69:  the app's screens crashed in a terminal with "React is not defined").
- ONE `CliError` class for every folder:  the app's `CLI.CliError` re-exports this one.
  `runCommand()` knows a mistake from a crash by it.
- Where a command works:  the checkout the current folder is in, found by a file only it has
  (`findCheckout(marker)`), else the kit `spell` runs from.
  - Why:  `spell` is linked to the MAIN checkout, but in an epic's worktree the files are the worktree's.
  - `spell server <verb>` inside a kit:  the KIT's page server, from any folder of it,
    a big folder's and the epic folder's too (`pageServerRoot()`, epic `repo-split` P16).
- `spell commands` reads each folder's command list as TEXT ([commandsCommand.ts](commands/commandsCommand.ts)).
  - A command:  `spell.command("name")`.
  - A group:  `const server = spell.command("server")`, then `server.command("start")`.
  - So keep each command's name a literal at its call, and each group a `const`.
- NEVER imports a big folder:  every arrow points down.
  It finds them by their `package.json` (`"spell": { "commands", "hooks" }`), and imports their files by path.

## Imports

As WWOD §4, plus:

- Every import by the kit's package name, this folder's too, as the kit's AGENTS.md says:
  `spell/cli`, `spell/server`, `spell/util/node/json5`;  same-folder peers `./peer`.
  - The kit's own TypeScript programs read those names as its SOURCE (`spell-source`), never its declarations:
    the kit's AGENTS.md, "Imports across repos".
- `cli` uses `server`, util's json5 and util's generic files, by file (`spell/util/string`, `spell/util/number`).
  Nothing else in the kit imports it.

## Tests

As WWOD §20, plus:

- In the kit's [tests/cli/](../../tests/cli/), at the same paths as the code.
- [spell.test.ts](../../tests/cli/spell.test.ts) runs the REAL `spell` ([its bin](../../bin/spell.mjs)),
  as separate processes:
  - every installed repo's command list loads, so a broken one in another repo fails it too
  - `spell server` against a made-up checkout, whose page server command line reports what it was handed
- [program.test.ts](../../tests/cli/program.test.ts):  the clash rule, on made-up repos
  (two repos both naming `check`).
- [repos.test.ts](../../tests/cli/repos.test.ts):  finding repos and hooks in a made-up kit.
- [publish/](../../tests/cli/publish/):  `PackageBuild` and `PublishedPackage` on a made-up repo.
  - The real five packages and the scratch install:  `spell publish --dry-run`, too slow for a unit test.
- [coherence/](../../tests/cli/coherence/):  the catalog's Score lines read, the counts over a made-up checkout of
  two git repos, the score's sums, a compare's words.
- [map/](../../tests/cli/map/):  imports read and resolved, a made-up checkout's maps merged and linked,
  and a made-up epic folder's docs map;  never graphify itself (`spell map build` runs it).
- The big folders' commands are tested in their folders' `tests/`:  the parser's, Spell UI's, the app's.
  - The app's run every language command end to end, through the kit's bin.
