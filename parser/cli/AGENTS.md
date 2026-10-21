# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `cli/` of the `spell-lang` package (`spell-lang/cli`).

**READ the repo root's [AGENTS.md](../AGENTS.md) and [WWOD](../agents/wwod/WWOD.md) FIRST:**
the repo's layout, and the house style every package shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- The language's commands for `spell`, the kit's command line ([README-cli.md](../../README-cli.md)):

  ```
  compile  lint  run  test  watch  format  describe  explain  parse  repl  speedtest
  ```

  - `lint` was `spell check`, `speedtest` was `spell speed`;  `spell explore` is gone (Owen's names, epic
    `repo-split` P13).
  - [spell-lang's README](../README.md#the-language-commands), "Deferred", has what each needs to move down here.
- How the kit finds them:  `package.json`'s `"spell": { "commands": "./cli/commands.ts" }`.
  - [commands.ts](commands.ts) adds each command to the `spell` program it's handed (commander):
    its name, arguments, flags and help.
  - It MUST load fast:  `spell help` loads every repo's list.  It imports nothing of spell.
  - The kit's `spell commands` check reads its TEXT:  keep each name a literal at its `spell.command("...")` call.
- Their WORK is NOT here yet:  it comes through the `"language"` hook, which spell-app provides
  (its `cli/hooks.ts`).
  - Why:  every one finds projects the app's way -- addresses like `@spell/examples/solitaire`, groups, the
    editor's language service.
  - Without spell-app, each says "clone spell-app" and exits 2 (`CLI.needHook()`).
- [src/](src/) (`$/cli` here, `spell-lang/cli` from another repo):  TYPES only, today.
  - [cli.types.ts](src/cli.types.ts):  `LanguageCommands`, the hook's shape, and each command's flags
    (`CompileOptions`, `LintOptions` ...).
  - spell-app implements the hook against them:  every arrow points down.
- NEVER imports spell-app:  it's above spell-lang.

## Tests

As WWOD §20, plus:

- In the repo's [tests/cli/](../tests/cli/):  the command list's names and help.
- The commands themselves run end to end in spell-app's tests (its `tests/cli/src/cli.test.ts`):
  their work is spell-app's.
