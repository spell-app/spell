/**
 * The language's `spell` commands (spell-lang's `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):
 * compile, lint, run, test, watch, format, describe, explain, parse, repl, speedtest;
 * and `spell lang packs check|fix`, for the language packs (epic `spanish` P7).
 * - Their WORK comes through the `"language"` hook (`LanguageCommands`), which spell-app provides today:
 *   every one loads projects the app's way (addresses like `@spell/examples/solitaire`, the editor's language service).
 *   - Without spell-app, each says so and exits 2.
 *   - Moving the work down here, command by command, is epic `repo-split`'s open issue (P13).
 *   - `spell lang packs` is the exception:  it needs no project, so its work is here, `packsCommand.ts`.
 * - Loads fast:  nothing of spell until a command runs.
 * - NOTE: `spell commands` reads this file's TEXT, for each `spell.command(...)` call:
 *   keep each command's name a literal at its call.
 */
import type { Command } from "commander"

import { CLI } from "spell-kit/cli"
import type { LanguageCommand, LanguageCommands } from "spell-lang/cli"

export default function languageCommands(spell: Command): void {
  spell
    .command("compile")
    .description(
      "compile projects to <Project>.spell.js (and each *.editor.html to its <type-editor> module), or print a file's compiled javascript"
    )
    .argument("[projects...]", PROJECTS_ARG)
    .option("--stdout", "print a project's compiled output instead of writing it")
    .option("--target <name>", 'compile to this target too, e.g. ts/solid -- default the project file\'s "targets"')
    .option("--force", "recompile the projects it imports too, even those already compiled")
    .option("--stale", "compile only the projects whose build is missing or older than what it's built from")
    .addHelpText("after", PROJECT_HELP)
    .action((projects: string[], _options, command: Command) => language("compile", projects, command))

  spell
    .command("lint")
    .description(
      "list errors, one per line as path:line:col, exiting 1 if there are any -- " +
        "a project's editor pages (*.editor.html) too, against its types"
    )
    .argument("[projects...]", PROJECTS_ARG)
    .option("--json", "print errors as JSON")
    .option("--fix", "put the editor pages right:  drop gone properties, add new ones, fix controls that don't fit")
    .addHelpText("after", PROJECT_HELP)
    .action((projects: string[], _options, command: Command) => language("lint", projects, command))

  spell
    .command("describe")
    .description("what a file or project declares, as the Type Explorer shows it -- or all about ONE thing in it")
    .argument("[project]", PROJECT_ARG)
    .argument("[name]", 'one thing to describe, e.g. Card, or "test card setup"')
    .argument("[member]", "one of its members, e.g. color")
    .option("--inherited", "list members types inherit, too")
    .option("--compiled", "show the javascript it compiles to, when describing one thing")
    .option("--json", "print the Type Explorer's own data")
    .addHelpText("after", PROJECT_HELP)
    .action((project: string | undefined, name: string | undefined, member: string | undefined, _options, command) =>
      language(
        "describe",
        [project, name, member].filter((it) => it !== undefined),
        command as Command
      )
    )

  spell
    .command("run")
    .description("compile a project and run it -- one that shows a UI opens in your browser, until Ctrl-C")
    .argument("[project]", PROJECT_ARG)
    .option("--browser", "open it in a browser even if it shows no UI")
    .option("--no-browser", "never open a browser:  just skip what needs one")
    .option("--seed <n>", SEED_HELP, Number)
    .option("--target <name>", "run it as `ts` or `py` compiles it -- a Python app that draws is served on Quart")
    .addHelpText("after", PROJECT_HELP)
    .action((project: string | undefined, _options, command: Command) => language("run", listOf(project), command))

  spell
    .command("test")
    .description("run each `to test ...` in projects, reporting ✓ or ✗ -- exits 1 if any fail")
    .argument("[projects...]", PROJECTS_ARG)
    .option("--name <text>", 'only tests whose names contain this, e.g. "deck creation"')
    .option("--watch", "run them again whenever a project changes -- spell watch --test")
    .option("--seed <n>", SEED_HELP, Number)
    .addHelpText("after", PROJECT_HELP)
    .action((projects: string[], _options, command: Command) => language("test", projects, command))

  spell
    .command("watch")
    .description("recompile projects whenever their files change, showing their errors -- until q or Ctrl-C")
    .argument("[projects...]", PROJECTS_ARG)
    .option("--check-only", "re-check instead of recompiling:  writes nothing")
    .option("--test", "run each project's tests after each rebuild with no errors")
    .option("--name <text>", "with --test:  only tests whose names contain this")
    .addHelpText("after", PROJECT_HELP)
    .action((projects: string[], _options, command: Command) => language("watch", projects, command))

  spell
    .command("format")
    .description("tidy the whitespace of .spell files, as VS Code's Format Document does -- never in the test projects")
    .argument("[projects...]", PROJECTS_ARG)
    .option("--check", "write nothing:  list files that would change, exiting 1 if any would")
    .addHelpText("after", PROJECT_HELP)
    .action((projects: string[], _options, command: Command) => language("format", projects, command))

  spell
    .command("speedtest")
    .description("time the parser's rule tests -- --against HEAD to compare with a commit")
    .argument("[module]", "only this module's rules, e.g. if")
    .option("--runs <count>", "runs per side, each a fresh process", (value) => Number(value), 3)
    .option("--against <ref>", "time this git commit too, e.g. HEAD, in a temp worktree")
    .option("--json", "print each side's combined results as JSON")
    .action((module: string | undefined, _options, command: Command) => language("speedtest", listOf(module), command))

  spell
    .command("parse")
    .description("how spell reads a line:  its match tree, then the javascript it compiles to")
    .argument("<text>", 'a line of spell, e.g. "print 1 + 2" -- several lines parse as a block')
    .option("--rule <name>", "parse as this rule only, e.g. expression -- default statement, then expression")
    .option("--in <project>", "parse inside this project's scope, e.g. @spell/test/solitaire")
    .option("--json", "print the result as JSON")
    .option("--tree", "print the spell tree -- what it means -- not the match tree;  with --json:  its data")
    .option("--html", "with --tree:  print it as a <ui-tree-diagram> for a docs page")
    .action((text: string, _options, command: Command) => language("parse", [text], command))

  spell
    .command("repl")
    .description("spell parse, a line at a time -- what a line declares, later lines know.  Piped:  reads stdin")
    .argument("[project]", "parse inside this project's scope, e.g. @spell/test/solitaire")
    .action((project: string | undefined, _options, command: Command) => language("repl", listOf(project), command))

  spell
    .command("explain")
    .description("what a word means to spell:  rules it names or starts -- and, --in a project, what it declares")
    .argument("<word>", "e.g. print, repeat -- or, with --in, a type, property or method")
    .option("--in <project>", "look in this project too, e.g. @spell/test/solitaire")
    .option("--json", "print what was found as JSON")
    .action((word: string, _options, command: Command) => language("explain", [word], command))

  // the language's own tools, under `spell lang`:  their work is here, not behind the hook
  const lang = spell.command("lang").description("tools for spell itself:  its language packs")
  const packs = lang
    .command("packs")
    .description("is each language pack complete, against English?  check, or fix with stubs to translate")

  packs
    .command("check")
    .description("list what a language pack lacks, per rule file -- exits 1 if anything")
    .argument("[lang]", "one language, e.g. es -- default every pack but English")
    .option("--json", "print the report as JSON")
    .action((lang: string | undefined, _options, command: Command) =>
      CLI.runCommand(async () => (await import("./packsCommand")).checkPacks(lang, command.optsWithGlobals()))
    )

  packs
    .command("fix")
    .description("write a stub for each missing registration, English copied and marked TODO:  translate")
    .argument("[lang]", "one language, e.g. es -- default every pack but English")
    .option("--ai", "ask claude -p to translate each stub, marked AI draft:  review")
    .action((lang: string | undefined, _options, command: Command) =>
      CLI.runCommand(async () => (await import("./packsCommand")).fixPacks(lang, command.optsWithGlobals()))
    )
}

/**
 * Run language command `name` for `args`, with `command`'s flags and the program's (`--all`, `--verbose`), through
 * the `"language"` hook;  then exit with its code.
 */
function language(name: LanguageCommand, args: string[], command: Command): Promise<never> {
  return CLI.runCommand(async () => {
    const commands = await CLI.needHook<LanguageCommands>("language", `spell ${name}:  ${NO_HOOK}`)
    return commands[name](args, command.optsWithGlobals())
  })
}

/** `value` as a list of one, or none. */
function listOf(value: string | undefined): string[] {
  return value === undefined ? [] : [value]
}

/** What a language command says when no installed repo does its work (`needHook()`). */
const NO_HOOK =
  "the language commands find projects the app's way for now -- addresses, groups, the editor's language service.  " +
  "Clone spell-app:  yarn clone spell-app"

/** How to name projects, after each project command's help. */
const PROJECT_HELP = `
Projects:
  Card.spell, ./path/to/Project        a spell file, or the project in a folder
  @here                                the project in the current folder
  @spell/library/cards, owen@spell/x   one project, by its address
  @spell/test/solitaire/Card.spell    a file in one:  its name has a dot
  @spell/library, owen@spell, @spell   a group, or all of a space's:  pick from their projects, or pass --all
  (none)                               the project here -- or, outside one, asks, completing as you type`

/** Help for a command's project argument(s):  a project, or a lone spell file, which counts as one. */
const PROJECT_ARG = "a spell file, project folder, or a project's address -- default the project here, else asks"
const PROJECTS_ARG = "spell files, project folders, or addresses -- default the project here, else asks"

/** Help for `--seed`, which `spell run` and `spell test` share. */
const SEED_HELP = "start the random numbers from this whole number (1 to 2147483646):  the same deal every run"
