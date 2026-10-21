# `spell-ui/cli` -- Spell UI's `spell` commands

The commands Spell UI adds to `spell`, the kit's command line.

```sh
spell icon bell                      # Spell UI's icons named or tagged "bell";  --open shows them all
spell ssr docs/index.html            # the page as plain HTML, beside it:  index.static.html + ui.static.css
spell pack create cards              # spell-cards/:  a component pack that is a repo of its own
spell pack add cards cards-tile      # one element in it
spell pack build brand               # a pack's components/__pack/;  spell pack check:  is it current?
spell design build                   # the claude.ai design system's files;  bundle, check, pull ...
```

## The DRY rule (one of each)

If you find yourself writing a second copy of any of these, stop and reuse.

- the `spell` program, its errors and exit codes, running another tool:  the kit's `spell-kit/cli`
- building and checking a pack:  the kit's `ComponentPack` (`spell-kit/element/tools/ComponentPack`)
- the static render:  `tools/StaticRenderer.ts` and `tools/StaticDocument.ts`
- the icon packs:  `$/ui/icons` (`BuiltInPacks`, `IconName`)

## Files

| Path | What |
| --- | --- |
| `commands.ts` | the list the kit's `spell` loads (`package.json`'s `"spell": { "commands" }`):  each command's name, flags and help |
| `src/cli.types.ts` | the commands' options and reports:  types only |
| `src/iconCommand.ts` | `spell icon`:  the list, or the gallery page;  `iconSearch.ts` finds them, `serve.ts` serves the gallery |
| `src/ssrCommand.ts` | `spell ssr`:  which pages, where they go, the shared stylesheets;  renders in `runner/renderStatic.ts` |
| `src/packCommand.ts` | `spell pack`'s four verbs, on `packCreate.ts` (create, add) and `packBuild.ts` (build, check) |
| `src/designCommand.ts` | `spell design`:  each verb's tool, run with its arguments as typed |
| `templates/` | the files `spell pack create` / `add` write from:  see [`templates/README.md`](templates/README.md) |

## Adding a command

1. Read the kit's [commands guide](../../spell.epics/guides/dev/commands/commands.md):  where it belongs, and its name.
2. Its work:  a file in `src/`, `(args, options) => Promise<exitCode>`, throwing `CLI.CliError` for a mistake.
3. Its line in `commands.ts`:  `spell.command("name")`, its arguments, flags and help, and an action that imports
   the file when it runs.
4. Its test in `tests/cli/src/`, then its row on the commands page, and `spell commands check`.

## Deferred

- `serve.ts` has a twin in spell-app (`spell run`'s browser page):  one shared home, the kit's `cli/`, would do for both.
