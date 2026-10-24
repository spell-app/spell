/**
 * The kit's own `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):  the repo
 * tools every checkout has, whatever else is installed.
 * - `spell server ...`:  this checkout's page server (`src/server/page/cli.ts`), and `start all` / `stop all`:  every
 *   web server of the checkout
 * - `spell bundle [names...]` / `spell bundle check`:  the bundles the page server serves, built on demand
 * - `spell commands [list|check]`:  every command against the commands page
 * - `spell wwod [check]`:  WWOD's citations and paths
 * - `spell readme check | test [pages...]`:  every repo's README pages, checked, or their examples run
 *   (epic `readme` P16)
 * - `spell publish [--dry-run]`:  every repo's npm package, built, packed and checked, then published, lowest first
 *   (epic `repo-split` P19)
 * - `spell pony`:  a pony, which proves `spell` runs with nothing else installed
 * - `spell help`:  the program's own (`addHelp()`), not this list's
 * - Loads fast:  each action imports its command's file when it runs.
 * - NOTE: `spell commands` reads this file's TEXT, for each `spell.command(...)` and `<group>.command(...)` call:
 *   keep each command's name a literal at its call.
 */
import type { Command } from "commander"

import { CLI } from "spell/cli"

export default function kitCommands(spell: Command): void {
  ////////////////
  // ## The page server
  ////////////////

  const server = spell
    .command("server")
    .description("this checkout's page server:  docs, epic pages, the app's /api -- start all:  every web server")
    .addHelpText("after", SERVER_HELP)

  passThrough(server.command("local"))
    .description("run the page server in the foreground, until Ctrl-C")
    .action(() => pageServer("local"))

  passThrough(server.command("start"))
    .description("start the page server in the background if it isn't running, and print where it is (JSON)")
    .argument("[all]", "all:  every web server of the checkout -- page server, the app's editor, Spell UI's site")
    .action((all: string | undefined) =>
      all === "all" ? CLI.runCommand(async () => (await serverCommand()).startAll()) : pageServer("start")
    )

  passThrough(server.command("stop"))
    .description("stop the page server -- all:  and the app's editor with it, even one left running")
    .argument("[which]", "local (default):  the page server;  all:  every web server of the checkout")
    .action((which: string | undefined) =>
      which === "all" || (which && which !== "local")
        ? CLI.runCommand(async () => (await serverCommand()).stopServers(which))
        : pageServer("stop", ["local"])
    )

  passThrough(server.command("status"))
    .description("the running page server's details (JSON), or exit 1 when it isn't running")
    .action(() => pageServer("status"))

  passThrough(server.command("url"))
    .description("start the page server if needed, then print the web address that serves <file>")
    .argument("<file>", "a file of this checkout, or of the shared content folder")
    .action(() => pageServer("url"))

  passThrough(server.command("prune"))
    .description("stop the page and Vite servers whose checkout is gone, on any checkout")
    .option("--dry-run", "only list them")
    .action(() => pageServer("prune"))

  ////////////////
  // ## Bundles
  ////////////////

  const bundle = spell
    .command("bundle")
    .description("build the bundles the page server serves, built on demand, never committed (Spell UI's site ...)")
    .argument("[names...]", "the bundles to build;  none:  every one")
    .option("--stale", "only the bundles whose sources changed since their last build")
    .option("--json", "print the report as JSON")
    .action((names: string[], options: CLI.BundleOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/bundleCommand")).buildBundles(names, options))
    )

  bundle
    .command("check")
    .description("say which bundles are out of date, and why -- exits 1 if any are")
    .argument("[names...]", "the bundles to check;  none:  every one")
    .option("--json", "print the report as JSON")
    .action((names: string[], options: CLI.BundleOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/bundleCommand")).checkBundles(names, options))
    )

  ////////////////
  // ## The repo's own checks
  ////////////////

  spell
    .command("commands")
    .description("every yarn script, spell command and skill, against the commands page -- check exits 1 on a gap")
    .argument("[verb]", "list (default):  each command, ✓ if the page names it;  check:  only the gaps")
    .option("--json", "print every command, and the gaps, as JSON")
    .action((verb: string | undefined, options: CLI.CommandsOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/commandsCommand")).commandsCommand(verb, options))
    )

  spell
    .command("wwod")
    .description(
      "WWOD, the agents' rules:  check every citation and repo path in WWOD, AGENTS.md, CLAUDE.md and skills"
    )
    .argument("[verb]", "check (default)")
    .argument("[files...]", "more files to check, beyond the default set")
    .option("--json", "print the report as JSON")
    .action((verb: string | undefined, files: string[], options: CLI.WwodOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/wwodCommand")).wwodCommand(verb, files, options))
    )

  ////////////////
  // ## The READMEs
  ////////////////

  const readme = spell
    .command("readme")
    .description("every repo's README pages:  check their links and words, or run their examples")

  readme
    .command("check")
    .description("links, anchors, captions and words of every README (yarn readme:check) -- exits 1 on a finding")
    .argument("[pages...]", "only these pages, from the kit's root (spell-parser/README.md)")
    .action((pages: string[]) => CLI.runCommand(() => CLI.runTool(README_CHECK, pages)))

  readme
    .command("test")
    .description("run every example a README prints with its Output fold, and compare -- exits 1 when one differs")
    .argument("[pages...]", "only these pages, from the kit's root (spell-parser/README.md)")
    .option("--list", "only list the examples, without running them")
    .action((pages: string[], options: { list?: boolean }) =>
      CLI.runCommand(() => CLI.runTool(README_TEST, [...pages, ...(options.list ? ["--list"] : [])]))
    )

  ////////////////
  // ## Publishing
  ////////////////

  spell
    .command("publish")
    .description("build, pack and check every repo's npm package, install them in a scratch project, then publish")
    .option("--dry-run", "stop before publishing:  build, pack, check, scratch install")
    .option("--no-scratch", "skip the scratch install (it needs the network)")
    .option("--json", "print the packed packages and every check as JSON")
    .action((options: CLI.PublishOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/publishCommand")).publishCommand(options))
    )

  ////////////////
  // ## And a pony
  ////////////////

  spell
    .command("pony")
    .description("a pony in Spell's wizard hat, saying something -- yours, or one of its own")
    .argument("[words...]", "what the pony says")
    .option("--gallop", "her legs gallop:  in place in a terminal, else one stride's frames")
    .action((words: string[], options: CLI.PonyOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/ponyCommand")).ponyCommand(words, options))
    )
}

/**
 * The page server's own command line (`src/server/page/cli.ts`), for `verb` and everything typed after it, but
 * `skip`'s words (`stop local`:  its default).
 */
function pageServer(verb: string, skip: string[] = []): Promise<never> {
  const args = CLI.rawArgsAfter("server", verb).filter((arg) => !skip.includes(arg))
  return CLI.runCommand(async () => (await serverCommand()).pageServer([verb, ...args]))
}

/** The README check, the kit's glue tool:  node runs it as is, from the kit's root (`spell readme check`). */
const README_CHECK: CLI.ToolSpec = { tool: "tools/readme-check.ts", cwd: "." }

/** The README examples, run (`spell readme test`;  epic `readme` P16). */
const README_TEST: CLI.ToolSpec = { tool: "tools/readme-test.ts", cwd: "." }

/** `serverCommand.ts`, loaded when a `spell server` verb runs. */
function serverCommand() {
  return import("spell/cli/commands/serverCommand")
}

/** `command`, taking the page server's own flags (`--root <dir>` ...) as they're typed:  handed on verbatim. */
function passThrough(command: Command): Command {
  return command.allowUnknownOption().allowExcessArguments()
}

/** After `spell server --help`'s verbs. */
const SERVER_HELP = `
Flags the page server takes, after any verb:  --root <dir> (the checkout), --port <n>, --spaces <dir>.
spell app serve starts it too, and opens the editor on it.`
