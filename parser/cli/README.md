# `spell-lang/cli` -- the language's `spell` commands

The commands spell-lang adds to `spell`, the kit's command line:  compile, check and run spell projects from a
terminal.

```sh
spell compile @spell/examples/solitaire    # compile a project;  --stdout prints it instead
spell lint .                               # its errors, one per line as path:line:col
spell run @spell/test/fizzbuzz             # compile and run it;  --target ts | py
spell test                                 # each `to test ...`, ✓ or ✗
spell watch                                # recompile on every save
spell format --check                       # tidy .spell files' whitespace
spell describe Card.spell Card color       # what the Type Explorer shows, as text
spell explain repeat                       # what a word means to spell
spell parse "print 1 + 2"                  # how spell reads a line
spell repl                                 # spell parse, a line at a time
spell speedtest if --against HEAD          # time the parser's rule tests
```

- `spell help <command>` has each one's flags.
- How to name a project (`@here`, an address, a folder, a file):  after each project command's help.
- Each command's longer notes and caveats:  [spell-app's cli/README.md](../../spell-app/cli/README.md),
  where their work is today.

## Files

| Path | What |
| --- | --- |
| [commands.ts](commands.ts) | the list the kit's `spell` loads:  each command's name, arguments, flags and help |
| [src/cli.types.ts](src/cli.types.ts) | `LanguageCommands`, the `"language"` hook's shape;  each command's flags |
| [src/index.ts](src/index.ts) | `spell-lang/cli`:  the types, for spell-app |

## The `"language"` hook

The commands are spell-lang's;  their WORK is spell-app's, for now.
- Each command asks for the `"language"` hook (`CLI.needHook()`), then calls its own function on it:
  `compile(projects, options)`, `lint(...)` ...
- spell-app provides it (its `cli/hooks.ts`):  a `CliSession` per command, which loads projects the app's way:
  - by address (`@spell/examples/solitaire`, `owen@spell`), from spaces' folders on disk
  - groups, `@here`, and the "which project?" prompt
  - the build folder, under spell-app's `build/`
  - questions about them through the editor's language service, so the command line sees what an editor does
- Without spell-app:  "the language commands find projects the app's way for now ... Clone spell-app" (exit 2).

## Deferred

Moving each command's work down here, as the epic page's analysis of every command sorted them (epic `repo-split`
P13, M1).
- What every project command needs first:
  - a loader that reads a project FOLDER by itself, as spell's tests already do (`parseSpellProject()`)
  - spell-app's hooks for what's the app's:  addresses and groups, the build folder, the editor pages after
    `compile` and `lint`, opening a UI project in a browser for `run`
- Then, command by command:
  - `parse`, `repl`:  the parser alone;  only a project argument (`--in`) needs the loader
  - `explain`:  the language service, from spell-app's `lsp`
  - `describe`:  the Type Explorer's builder (`ScopeExplorer`), from spell-app's `lsp`
  - `format`:  the language service's formatting;  its frozen-projects check names spell-lang's own `tests/spaces/`
  - `test`, `watch`:  the loader;  `watch`'s compile step as `compile`'s
  - `speedtest`:  finds spell by its package, not through spaces
  - `compile`, `lint`, `run`:  the loader, plus spell-app's hooks above
- And the progress lists and screens they draw (Ink, today spell-app's `cli/src/ui/`).
