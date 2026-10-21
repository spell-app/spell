# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `cli/` (`spell-kit/cli`).

**READ the kit's [AGENTS.md](../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- The `spell` command's base:  `$/cli` (`CLI`), `spell-kit/cli` from another repo.
  - It reads the command line, prints help, and finds every installed repo's commands.
  - Each repo adds its own commands;  the kit adds a few of its own.
  - It was spell-app's `cli/` until epic `repo-split` P13 (decisions Q33, Q42).
  - [README-cli.md](../README-cli.md), "How a command is built", says how it works, and how to add a command.
- What's in it:
  - [bin/spell.mjs](bin/spell.mjs) -- starts it:  `tsx`, then the run-time alias hook, then [main.ts](src/main.ts)
  - [main.ts](src/main.ts) -- the process entry:  every repo's commands, then the command line.
    NOT in the barrel:  importing it runs the command line.
  - [program.ts](src/program.ts) -- `spellProgram()`, `addRepoCommands()` (the clash rule), `addHelp()`
  - [repos.ts](src/repos.ts) -- `spellRepos()`, `commandLists()`, `hook()` / `needHook()`
  - [run.ts](src/run.ts) -- `runCommand()`, `rawArgsAfter()`, `out()` / `err()`, `relativePath()`
  - [tools.ts](src/tools.ts) -- `runTool()`, `runChild()`, `epicBin()` / `runEpic()`
  - [findCheckout.ts](src/findCheckout.ts) -- `findCheckout()`, `KIT_ROOT`, `KIT_MARKER`
  - [cli.types.ts](src/cli.types.ts) -- `EXIT`, `CliError`, the flags' types, `CommandList`, `HookList`, `SpellRepo`
- The kit's own commands:  [commands.ts](commands.ts) is their list, [src/commands/](src/commands/) their work.

  ```
  server  bundle  commands  wwod  pony        (help is the program's own)
  ```

- The barrel MUST stay lean:  node built-ins, commander and chalk.
  - Every repo's command list imports it, and `spell help` loads them all.
  - So it never exports a command's work:  [commands.ts](commands.ts) imports each one's file when it runs.
- Every repo's commands run in ONE process, under `tsx` with [tsconfig.json](tsconfig.json):
  `tsx` takes one tsconfig for every file.
  - So its settings are what every repo's commands need:  `jsx: react-jsx` for spell-app's Ink screens,
    `target: ES2020` so spell-lang's standard decorators are lowered.
- ONE `CliError` class for every repo:  spell-app's `CLI.CliError` re-exports this one.
  `runCommand()` knows a mistake from a crash by it.
- Where a command works:  the checkout the current folder is in, found by a file only it has
  (`findCheckout(marker)`), else the kit `spell` runs from.
  - Why:  `spell` is linked to the MAIN checkout, but in an epic's worktree the files are the worktree's.
- `spell commands` reads each repo's command list as TEXT ([commandsCommand.ts](src/commands/commandsCommand.ts)).
  - A command:  `spell.command("name")`.
  - A group:  `const server = spell.command("server")`, then `server.command("start")`.
  - So keep each command's name a literal at its call, and each group a `const`.
- NEVER imports a child repo:  every arrow points down.
  It finds them by their `package.json` (`"spell": { "commands", "hooks" }`), and imports their files by path.

## Imports

As WWOD §4, plus:

- This folder by `$/cli`;  another folder of the kit by its entry, as the kit's AGENTS.md says:
  `spell-kit/server`, `spell-kit/assembler`, `spell-kit/util/node/json5`.
  - Those are read as DECLARATIONS when the kit's declarations build (`spell-types`):  the toolchain's
    `Declarations.selfPaths()` points each at them, or `tsc` would read the other folder's source (TS5055).
- `cli` uses `server`, `assembler` and util's json5.  Nothing else in the kit imports it.

## Tests

As WWOD §20, plus:

- In the kit's [tests/cli/](../tests/cli/), at the same paths as the code.
- [spell.test.ts](../tests/cli/src/spell.test.ts) runs the REAL `spell` ([bin/spell.mjs](bin/spell.mjs)) as separate
  processes:
  - every installed repo's command list loads, so a broken one in another repo fails it too
  - `spell server` against a made-up checkout, whose page server command line reports what it was handed
- [program.test.ts](../tests/cli/src/program.test.ts):  the clash rule, on made-up repos (two repos both naming
  `check`).
- [repos.test.ts](../tests/cli/src/repos.test.ts):  finding repos and hooks in a made-up kit.
- The other repos' commands are tested in their repos:  spell-lang's, Spell UI's, spell-app's (its end-to-end runs
  of every language command, through the kit's bin).
