# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others)
working with code in `ui/src/cli/`, in Spell UI's folder of the kit:  Spell UI's `spell` commands.

**READ [Spell UI's AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST.**
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- Spell UI's commands for the `spell` command, which is the kit's ([the kit's src/cli/](../../../src/cli/AGENTS.md)):
  - `spell icon [query...]`:  find Spell UI's icons;  `--open` shows them in a browser
  - `spell ssr <pages...>`:  `ui-*` pages as plain HTML, through Spell UI's static render
  - `spell pack create | add | build | check`:  component packs, on the kit's pack tooling
  - `spell design build | bundle | check | pull | changed | pushed | state`:  Spell's claude.ai design system
  - They were spell-app's until epic `repo-split` P13, and are named as Owen named them then.
    - Before:  `spell icons`, `spell static`, `spell dev pack`, `spell dev design`
- How the kit finds them:  the folder manifest's `"spell": { "commands": "./src/cli/commands.ts" }`
  ([package.json](../../package.json)).
  - [commands.ts](commands.ts) adds each command to the `spell` program it's handed (commander), and nothing more.
  - It MUST load fast:  `spell help` loads every folder's list.
    So each action imports its work when it runs:  `(await import("spell/ui/cli/iconCommand")).iconCommand(...)`.
  - The kit's `spell commands` check reads its TEXT:  keep each name a literal at its `.command("...")` call,
    and each group (`pack`, `design`) a `const`.
- The code:  this folder, imported as `spell/ui/cli/<file>` (epic `repo-split` P14).
  - Node code:  Spell UI's node settings type-check it (`tsconfig.node.json`).
  - Each command's work is `(args, options) => Promise<exitCode>`, run through the kit's `CLI.runCommand()`.
    A `CLI.CliError` prints its message, anything else its stack.
  - Output through `CLI.out()` / `CLI.err()`;  colour through node's `styleText()`, no chalk.
  - [cli.types.ts](cli.types.ts):  the options and reports, types only.
  - [renderStatic.ts](runner/renderStatic.ts):  `spell ssr`'s CHILD process, which renders on Vite.
    It never imports `spell/cli`:  it needs only Spell UI.
- Where they work:
  - `spell pack` and `spell design`:  the nearest kit from the current folder up,
    so in an epic's worktree they work on the worktree's files (`CLI.findCheckout(CLI.KIT_MARKER)`).
  - `spell design`'s tools are scripts of other folders and repos, RUN, never imported (`CLI.runTool()`):
    - Spell UI's own [design-build.ts](../../scripts/design-build.ts)
    - spell-brand's `design-bundle` / `design-check` (beside the kit)
    - the `epic/` folder's [design.js](../../../epic/src/tools/design.js)
- `spell pack create <name>` makes `spell-<name>/` in the kit, a pack that is a repo of its own,
  laid out as spell-brand is.
  - From [templates/](templates/README.md);  the commands page gets the new repo's scripts.
  - It adds `spell-<name>` to the kit's `workspaces`, after its folders (`parser`, `ui`, `epic`, `app`):
    so the next `yarn install` takes it in, and it's one of `kitFolders()`, which `spell pack` searches too.
  - It refuses a name of one of the kit's folders:  `ui`, `spell-ui`'s, or `epics`, `epic/`'s pack.
  - It never touches the kit's `repos.json5`, the repos BESIDE the kit;  it says what to do next.
- NEVER imports `epic/` or `app/`:  they're above Spell UI (the lint's `spell/no-upward-import`).
  - Nor `parser/`, though it's below:  Spell UI uses nothing of Spell's language
    ([Spell UI's AGENTS.md](../../AGENTS.md), "Layout", "Nothing of spell").

## Tests

As WWOD §20, plus:

- In [tests/cli/](../../tests/cli/), run by Spell UI's `ssr` project, in node (`vitest.config.ts`, `TOOL_TESTS`).
- `ssrCommand.test.ts` and `packBuild.test.ts` run the REAL `spell`, as separate processes:
  the kit's [spell.mjs](../../../bin/spell.mjs).
  - Every folder's command list loads (and every installed repo's), so a broken one elsewhere fails them too.
- The pack tests make throwaway kits from [fixtures/kit/](../../tests/cli/fixtures/kit/README.md), and point
  `SPELL_SHARED_DIR` at them:  never the real commands page.
