# `spell-kit/cli` -- the `spell` command's base

`spell` is Spell's command line:  every installed repo's commands, under one name.
- This folder is its base:  reading the command line, help, and finding each repo's commands.
- Each repo adds its own commands;  the kit adds a few of its own (`spell server`, `spell bundle` ...).
- It runs straight from the checkout, through `tsx`:  no build step.
- One namespace, `CLI` (`$/cli` inside the kit, `spell-kit/cli` from another repo).

```sh
spell help                     # every command, grouped by the repo that adds it
spell help server stop         # one command's help, a sub-command's too
spell compile @spell/examples/solitaire     # spell-lang's
spell pack check               # Spell UI's
spell app serve                # spell-app's
spell server start all         # the kit's
```

It was spell-app's `cli/` until epic `repo-split` P13 (decisions Q33 and Q42).

## The DRY rule (one of each)

If you find yourself writing a second copy of any of these, stop and reuse.

- the program, its global flags and its help:  `spellProgram()`, `addHelp()`
- running a command and turning its result into an exit code:  `runCommand()`
- a mistake to tell people about, not a crash:  `CliError`, with `EXIT`'s codes
- the checkout to work on:  `findCheckout()`
- running another program with this terminal attached:  `runChild()`;  a repo's tool script:  `runTool()`;
  spell-epic's `epic`:  `runEpic()`

## Install

```sh
yarn               # once, at the kit's root:  installs every repo's packages
yarn cli:install   # at the kit's root:  links `spell` into the first writable folder on your PATH
spell help
```

- Where it links:  `~/.local/bin`, npm's global bin, `/usr/local/bin`, `/opt/homebrew/bin` -- the first on your
  `PATH` that you can write.
  - Or `SPELL_BIN_DIR=/some/dir yarn cli:install`.
- The link points at this checkout's [bin/spell.mjs](bin/spell.mjs):  edit the source, and the next `spell` runs it.
  - So after epic `repo-split` P13, `~/.local/bin/spell` links `~/www/spell/cli/bin/spell.mjs`
    (spell-app's `cli/bin/spell.mjs` before).
- Only `spell`:  the kit's other bins (`spell-folders`, `spell-pack`, `spell-types`) are for yarn scripts.
- In a repo's yarn scripts, `spell` is the kit's bin:  spell-app's `yarn vscode` is `spell app vscode`.
- `epic` is spell-epic's own command, linked by its README's "Install".

## How a repo adds its commands

A repo names its command list in its `package.json`:

```json
{
  "name": "spell-app",
  "spell": {
    "commands": "./cli/commands.ts",
    "hooks": "./cli/hooks.ts"
  }
}
```

- `commands`:  a file whose default export adds its commands to the program it's handed (a `CommandList`).
  It's commander, as any program:

  ```ts
  export default function appCommands(spell: Command): void {
    const app = spell.command("app").description("the spell app:  a new project, the editor, the VS Code extension")
    app
      .command("create")
      .argument("<name>", "the project's name, e.g. Snake")
      .action((name: string, _options, command: Command) =>
        CLI.runCommand(async () => (await loadApp()).appCommands.create([name], command.optsWithGlobals()))
      )
  }
  ```

- It MUST load fast:  `spell help` loads every repo's list.
  So each action imports its work when it runs (`await import(...)`).
- Every repo keeps its command code in its own `cli/` folder (Q42):

  | Repo | Its commands |
  | --- | --- |
  | the kit | `server`, `bundle`, `commands`, `wwod`, `pony` (and `help`, the program's own) |
  | spell-lang | `compile`, `lint`, `run`, `test`, `watch`, `format`, `describe`, `explain`, `parse`, `repl`, `speedtest` |
  | spell-ui | `icon`, `ssr`, `pack`, `design` |
  | spell-app | `app create \| serve \| vscode`, `projects` |

### Where a command's name goes:  the clash rule

- A name only one repo has goes at the top level:  `spell compile`.
- A name two or more repos have goes under EACH one's short name (its name less `spell-`), and the bare word
  only says where they are (`addRepoCommands()`):

  ```
  $ spell help
  spell-lang:
    lang          spell-lang's commands whose names another repo has too
  spell-app:
    app           ...
  $ spell lang check        # spell-lang's check
  $ spell app check         # spell-app's:  in its own `app` group, since it has one
  $ spell check
  "check" is in 2 repos:  spell lang check, or spell app check
  ```

- `spell help` lists the commands grouped by repo, lowest first:  `spell-kit:`, `spell-lang:`, `spell-ui:`,
  `spell-app:`.
- NOTE:  spell-app's commands are under `app` ON PURPOSE (Owen's names, 2026-10-21), not only on a clash.

### Hooks:  what a repo plugs into a lower repo's commands

- `hooks`:  a file whose default export names a loader for each hook (a `HookList`):

  ```ts
  export default {
    language: async () => (await loadApp()).languageCommands
  } satisfies HookList
  ```

- A command asks for one by name:  `await CLI.needHook<LanguageCommands>("language", "clone spell-app")`.
  - The lowest repo that has it answers;  none:  a `CliError` with the message, exit 2.
  - Only then is the hooks file loaded:  `spell help` never loads one.
- Today's one hook:  `language`, spell-app's.
  It does the work of spell-lang's commands, which still find projects the app's way (see Deferred).

### How `spell` finds the repos

- The kit `spell` runs from, then each child repo its [repos.json5](../repos.json5) lists, lowest first
  (`spellRepos()`).
- Each where it is:  in the kit, at its folder (`spell-lang/`), else installed as a package
  (`node_modules/spell-lang/`).
- Only those whose `package.json` has a `"spell"` entry.
  A repo that isn't cloned is simply not there:  its commands aren't listed.
- `spell --version` prints each one's version, the kit's first.

## The kit's own commands

| Command | What it does |
| --- | --- |
| `spell server local` | Runs this checkout's page server in the foreground, until `Ctrl-C`. |
| `spell server start` | Starts it in the background if it isn't running, and prints where it is (JSON). |
| `spell server start all` | Every web server of the checkout:  the page server, the app's editor, Spell UI's site;  then where each is. |
| `spell server stop [local\|all]` | Stops the page server (`local`, the default);  `all`:  the app's editor too, even one left running. |
| `spell server status` | The running page server's details (JSON);  exit 1 when it isn't running. |
| `spell server url <file>` | Starts the page server if needed, then prints the web address that serves `file`. |
| `spell server prune` | Stops the page and Vite servers whose checkout is gone.  `--dry-run` only lists them. |
| `spell bundle [names...]` | Builds the bundles the page server serves (built on demand, never committed).  `--stale`, `--json`. |
| `spell bundle check [names...]` | Says which bundles are out of date, and why;  exit 1 if any are. |
| `spell commands [list\|check]` | Every yarn script, `spell` command, `epic` verb and skill, against the commands page.  `check` exits 1 on a gap. |
| `spell wwod [check] [files...]` | Checks every WWOD citation and repo path in WWOD, `AGENTS.md`, `CLAUDE.md` and the skills. |
| `spell pony [words...]` | A pony in Spell's wizard hat, saying something.  `--gallop`.  Proves `spell` runs with nothing else installed. |
| `spell help [command...]` | Lists the commands, or shows one's help, a sub-command's too. |

- `spell server`'s verbs (but `start all` and `stop all`) are the page server's own command line,
  [`server/src/page/cli.ts`](../server/src/page/cli.ts), its flags passed as typed:
  `--root <dir>`, `--port <n>`, `--spaces <dir>`.
  - Its checkout:  the one the current folder is in (`--root` says another).
  - The kit's `yarn server` runs `spell server`.
  - `spell server ensure` is gone (Owen, 2026-10-21):  `start` does the same.
    The page server's own command line still takes `ensure`, hidden, for spell-epic's `epic server ensure`.
- `start all` and `stop all` work on the checkout with page server settings
  (`"pageServer"` in its `package.json`):  the nearest one up, else the installed repo that has them,
  spell-app (`serversRoot()`).
  - The editor's row:  only where those settings run spell-app's routes.
  - Spell UI's site's row:  only where they name its component set.
  - `start all` was spell-app's `scripts/serve.mjs` until P13.
- `spell bundle`:  the bundles in the same checkout's page server settings (`"bundles"`);
  the logic is the assembler's `Bundle`.
- `spell commands`:  the nearest KIT from the current folder up, so a worktree checks its own.
  - The page's data, `commands.json5`, is in the shared content folder.
  - It reads each repo's command list as TEXT (`commandNames()`):  `spell.command("x")` is `spell x`;
    `const server = spell.command("server")`, then `server.command("start")`, is `spell server start`.
  - So keep each command's name a literal at its call, and each group a `const`.
- `spell wwod`:  the nearest repo from the current folder up:  each child repo has WWOD through its `agents` link.

## Running a command

- Every command's action ends in `CLI.runCommand(work)`:
  it runs `work`, prints what went wrong, and exits with its code.
  - A `CliError` prints only its message, and exits with its `exitCode` (default `EXIT.USAGE`, 2).
  - Anything else is a crash, and prints its stack (exit 1).
- Exit codes (`EXIT`):
  - `0`:  fine
  - `1`:  the work had errors (a line that doesn't parse, a stale bundle, a failed test)
  - `2`:  the command line is wrong
- An unknown command is commander's:  it says so, with "(spell help lists the commands)", and exits 1.
- Global flags, before or after the command's name:  `--verbose` (a command's own logging, on stderr) and
  `--all` (a group of projects means all of them).
  A command reads them with `command.optsWithGlobals()`.
- Output:  `CLI.out()` on stdout, `CLI.err()` on stderr.
- Another program:
  - `runChild(command, args)`:  this terminal attached;  `Ctrl-C` reaches the child, which stops cleanly,
    and we exit with its code
  - `runTool(spec, args)`:  a repo's tool script, from the nearest checkout that has it, under `tsx` and the
    run-time alias hook when its `ToolSpec` says `tsx`
  - `runEpic(args)`:  spell-epic's `epic`, the nearest checkout's `spell-epic/bin/epic`, else the `PATH`'s
- `rawArgsAfter("design", "build")`:  everything typed after the command's words, flags included,
  for a command that hands them on as they are.

## Files

| Path | What |
| --- | --- |
| [bin/spell.mjs](bin/spell.mjs) | the `spell` bin:  `tsx` with this folder's settings, the alias hook, then `main.ts` |
| [commands.ts](commands.ts) | the kit's own command list (its `package.json`'s `"spell": { "commands" }`) |
| [scripts/install-cli.mjs](scripts/install-cli.mjs) | `yarn cli:install`:  links `spell` onto your `PATH` |
| [src/main.ts](src/main.ts) | the process entry:  every repo's commands, then the command line |
| [src/program.ts](src/program.ts) | `spellProgram()`, `addRepoCommands()` (the clash rule), `addHelp()` |
| [src/repos.ts](src/repos.ts) | `spellRepos()`, `commandLists()`, `hook()`, `needHook()` |
| [src/run.ts](src/run.ts) | `runCommand()`, `rawArgsAfter()`, `out()`, `err()`, `relativePath()` |
| [src/tools.ts](src/tools.ts) | `runTool()`, `runChild()`, `epicBin()`, `runEpic()` |
| [src/findCheckout.ts](src/findCheckout.ts) | `findCheckout()`, `KIT_ROOT`, `KIT_MARKER` |
| [src/cli.types.ts](src/cli.types.ts) | `EXIT`, `CliError`, the flags' types, `CommandList`, `HookList`, `SpellRepo`, `ToolSpec` |
| [src/commands/serverCommand.ts](src/commands/serverCommand.ts) | `spell server`:  the page server's command line, `start all`, `stop` |
| [src/commands/bundleCommand.ts](src/commands/bundleCommand.ts) | `spell bundle`, `spell bundle check` |
| [src/commands/commandsCommand.ts](src/commands/commandsCommand.ts) | `spell commands`:  every command against the commands page |
| [src/commands/wwodCommand.ts](src/commands/wwodCommand.ts) | `spell wwod`;  the check itself is [wwod.ts](src/commands/wwod.ts) |
| [src/commands/ponyCommand.ts](src/commands/ponyCommand.ts) | `spell pony` |
| [tsconfig.json](tsconfig.json) | the settings `tsx` runs EVERY repo's commands under, and this folder's type check |

## Adding a command

1. Read [the commands guide](../spell.epics/guides/dev/commands/commands.md):  where it belongs, and its name.
2. Pick its repo:  the lowest one whose code it needs.
   - It never imports a repo above its own.
   - Something only a higher repo knows comes through a hook (`needHook()`).
3. Its work:  a file in that repo's `cli/src/`, `(args, options) => Promise<exitCode>`, throwing `CLI.CliError` for a
   mistake.
4. Its line in the repo's command list:  `spell.command("name")`, its arguments, flags and help, and an action
   that imports the file when it runs, through `CLI.runCommand()`.
   - A repo with no list yet:  `"spell": { "commands": "./cli/commands.ts" }` in its `package.json`.
5. Its test, then its row on the commands page, and `spell commands check`.

## Deferred

- The language commands' WORK is still spell-app's, behind its `language` hook:
  they find projects by address, through spell-app's projects and its language service.
  - Moving it down to spell-lang, command by command:  epic `repo-split`'s open issue from P13.
- `spell --version` printed the parser's version until P13;  now it prints each repo's.
- `serve.ts` has twins in spell-app (`spell run`'s browser page) and Spell UI (`spell icon --open`):
  one home here would do for both.
- The `epic` command's own renames (`new` to `create`, `check` to `lint` ...) and its move to spell-epic's `cli/`:
  a second step of P13.
