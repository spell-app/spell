/**
 * The kit's own `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):  the repo
 * tools every checkout has, whatever else is installed.
 * - `spell server ...`:  this checkout's page server (`src/server/page/cli.ts`), and `start all` / `stop all`:  every
 *   web server of the checkout
 * - `spell bundle [names...]` / `spell bundle check`:  the bundles the page server serves, built on demand
 * - `spell commands [list|check]`:  every command against the commands page
 * - `spell wwod [check]`:  WWOD's citations and paths
 * - `spell readme check | test | pictures [pages...]`:  every repo's README pages, checked, their examples run
 *   (epic `readme` P16), or their `html example` blocks pictured (epic `ui-gaps` P14)
 * - `spell map install | status | build | query | explain | uses`:  a map of every repo's code, and one of the
 *   docs, asked through graphify (epic `coherence` P1)
 * - `spell coherence score [--json] [--save] [--compare <snapshot | last>] [--at <revision>]`:  how coherent the
 *   code is, from the catalog's searches (epic `coherence` P15)
 * - `spell publish [--dry-run] [--tag <tag>]`:  the npm packages (`spell`, `spell-ui`, `spell-epic`), built, packed and
 *   checked, then published under the tag `next` unless told otherwise (epic `repo-split` P19, P22)
 * - `spell rename imports [--dry-run] [repos...]`:  the import rename of epic `repo-split` P20 (`spell-ui/x` =>
 *   `spell/ui/x` ...), kept for branches open when it landed
 * - `spell rename spellml [--dry-run] [checkouts...]`:  Spell's markup files, `.spellx` => `.spellml` (epic
 *   `repo-split` P21):  moved with `git mv`, and every mention but the record's;  kept for branches open when it landed
 * - `spell rename branches [--dry-run]`:  an epic's old child-repo branches carried into the merged folders, rewritten
 *   as P20's history was (`tools/one-repo/one-repo.ts --step carry-on`)
 * - `spell pony`:  a pony, which proves `spell` runs with nothing else installed
 * - `spell help`:  the program's own (`addHelp()`), not this list's
 * - Loads fast:  each action imports its command's file when it runs.
 * - NOTE: `spell commands` reads this file's TEXT, for each `spell.command(...)` and `<group>.command(...)` call:
 *   keep each command's name a literal at its call.
 */
import type { Command } from "commander"
import { join } from "node:path"

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
    .description("every repo's README pages:  check their links and words, run their examples, picture their markup")

  readme
    .command("check")
    .description("links, anchors, captions and words of every README (yarn readme:check) -- exits 1 on a finding")
    .argument("[pages...]", "only these pages, from the kit's root (parser/README.md)")
    .action((pages: string[]) => CLI.runCommand(() => CLI.runTool(README_CHECK, pages)))

  readme
    .command("test")
    .description("run every example a README prints with its Output fold, and compare -- exits 1 when one differs")
    .argument("[pages...]", "only these pages, from the kit's root (parser/README.md)")
    .option("--list", "only list the examples, without running them")
    .action((pages: string[], options: { list?: boolean }) =>
      CLI.runCommand(() => CLI.runTool(README_TEST, [...pages, ...(options.list ? ["--list"] : [])]))
    )

  readme
    .command("pictures")
    .description("take the pictures of every README's `html example` blocks, headlessly, where missing or stale")
    .argument("[pages...]", "only these pages, from the kit's root (ui/README.md)")
    .option("--all", "take every picture again, not only the stale and missing ones")
    .option("--base <url>", "the page server to draw them with (default:  this checkout's own, else localhost:4747)")
    .action((pages: string[], options: { all?: boolean; base?: string }) =>
      CLI.runCommand(() =>
        CLI.runTool(README_PICTURES, [
          ...pages,
          ...(options.all ? ["--all"] : []),
          ...(options.base ? ["--base", options.base] : [])
        ])
      )
    )

  ////////////////
  // ## The maps
  ////////////////

  const map = spell
    .command("map")
    .description("a map of every repo's code, and one of the docs:  what already does this?  which pages say X?")
    .addHelpText("after", MAP_HELP)

  map
    .command("install")
    .description("install graphify, which maps the code, with uv -- optional:  nothing else needs it")
    .action(() => mapCommand("install"))

  map
    .command("status")
    .description("whether graphify is installed, and how old each map is")
    .option("--json", "print it as JSON")
    .action((options: CLI.MapOptions) => mapCommand("status", [], options))

  map
    .command("build")
    .description("build the maps:  the code map with graphify, the docs map by itself")
    .argument("[which]", "code or docs;  none:  both")
    .option("--json", "print what each map holds as JSON")
    .action((which: string | undefined, options: CLI.MapOptions) => mapCommand("build", which ? [which] : [], options))

  map
    .command("query")
    .description('ask a map a question in words, graphify\'s own:  spell map query "tokenizer subclasses"')
    .argument("<words...>", "the question")
    .option("--docs", "ask the docs map")
    .option("--budget <tokens>", "the answer, at most this many tokens (default 2000)")
    .action((words: string[], options: CLI.MapOptions) => mapCommand("query", words, options))

  map
    .command("explain")
    .description("a thing, and everything linked to it:  spell map explain PrefStore")
    .argument("<name...>", "its name, as the map labels it:  PrefStore, readJSON5File()")
    .option("--docs", "ask the docs map:  the pages and sections that name it")
    .action((words: string[], options: CLI.MapOptions) => mapCommand("explain", words, options))

  map
    .command("uses")
    .description('what uses a thing:  spell map uses "readJSON5File()"')
    .argument("<name...>", "its name, as the map labels it")
    .option("--docs", "ask the docs map")
    .action((words: string[], options: CLI.MapOptions) => mapCommand("uses", words, options))

  ////////////////
  // ## Coherence
  ////////////////

  const coherence = spell
    .command("coherence")
    .description("how coherent the code is:  each catalog mechanism's copies left and users, scored 0-100")

  coherence
    .command("score")
    .description("score the code:  copies, users and score per mechanism, the words' counts, each repo's tests")
    .option("--json", "print the snapshot, or the comparison, as JSON")
    .option("--save", "save a snapshot in the coherence epic's details/scores/ (the shared content)")
    .option("--compare <snapshot>", "compare with a saved snapshot:  its name, or last")
    .option("--at <revision>", 'the code as it was:  "main@{2026-10-25 14:00}" (each repo\'s), a kit commit, a time')
    .action((options: CLI.CoherenceOptions) =>
      CLI.runCommand(async () =>
        (await import("spell/cli/commands/coherenceCommand")).coherenceCommand("score", options)
      )
    )

  ////////////////
  // ## Publishing
  ////////////////

  spell
    .command("publish")
    .description("build, pack and check spell, spell-ui and spell-epic, try them in a scratch project, then publish")
    .option("--dry-run", "stop before publishing:  build, pack, check, scratch install")
    .option("--no-scratch", "skip the scratch install (it needs the network)")
    .option("--json", "print the packed packages and every check as JSON")
    .option("--tag <tag>", "the npm dist-tag to publish under;  only `--tag latest` moves latest", CLI.PUBLISH_TAG)
    .action((options: CLI.PublishOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/publishCommand")).publishCommand(options))
    )

  ////////////////
  // ## Renames kept for open branches
  ////////////////

  const rename = spell
    .command("rename")
    .description("the renames a branch open when they landed reruns over its own lines before merging main")

  rename
    .command("imports")
    .description("spell-ui/x => spell/ui/x (and parser, epic, app), their source conditions and folder paths (P20)")
    .argument("[repos...]", "the checkouts to rename in;  none:  this kit, its old child repos and its peers")
    .option("--dry-run", "only report what it would change")
    .option("--json", "print each repo's report as JSON")
    .action((repos: string[], options: CLI.RenameOptions) =>
      CLI.runCommand(async () => {
        const { renameImportsCommand } = await import("spell/cli/commands/renameImports")
        renameImportsCommand(CLI.findCheckout(CLI.KIT_MARKER), { ...options, repos })
        return CLI.EXIT.OK
      })
    )

  rename
    .command("spellml")
    .description("Spell's markup files, .spellx => .spellml:  each file moved with git mv, and each mention (P21)")
    .argument("[checkouts...]", "the checkouts to rename in;  none:  this kit")
    .option("--dry-run", "only report what it would change")
    .option("--json", "print each checkout's report as JSON")
    .action((checkouts: string[], options: CLI.RenameOptions) =>
      CLI.runCommand(async () => {
        const { renameSpellmlCommand } = await import("spell/cli/commands/renameSpellml")
        renameSpellmlCommand(CLI.findCheckout(CLI.KIT_MARKER), { ...options, checkouts })
        return CLI.EXIT.OK
      })
    )

  rename
    .command("branches")
    .description("an epic's old child-repo branches (ui/ ...) carried into the merged folders, after P20 is on main")
    .option("--dry-run", "only list the branches it would carry on")
    .action((options: CLI.RenameOptions) =>
      CLI.runCommand(() => {
        const kit = CLI.findCheckout(CLI.KIT_MARKER)
        const args = [join(kit, "tools", "one-repo", "one-repo.ts"), "--step", "carry-on"]
        return CLI.runChild(process.execPath, options.dryRun ? [...args, "--dry-run"] : args, { cwd: kit })
      })
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

/** The README examples' pictures (`spell readme pictures`;  epic `ui-gaps` P14). */
const README_PICTURES: CLI.ToolSpec = { tool: "tools/readme-pictures.ts", cwd: "." }

/** `serverCommand.ts`, loaded when a `spell server` verb runs. */
function serverCommand() {
  return import("spell/cli/commands/serverCommand")
}

/** `command`, taking the page server's own flags (`--root <dir>` ...) as they're typed:  handed on verbatim. */
function passThrough(command: Command): Command {
  return command.allowUnknownOption().allowExcessArguments()
}

/** `spell map`'s verbs, run with the words and flags they were given. */
function mapCommand(verb: string, words: string[] = [], options: CLI.MapOptions = {}): Promise<never> {
  return CLI.runCommand(async () => (await import("spell/cli/commands/mapCommand")).mapCommand(verb, words, options))
}

/** After `spell map --help`'s verbs. */
const MAP_HELP = `
The maps are in the kit's graphify-out/ (git-ignored):  code.json, docs.json.
A map older than the newest commit is rebuilt before it's asked.`

/** After `spell server --help`'s verbs. */
const SERVER_HELP = `
Flags the page server takes, after any verb:  --root <dir> (the checkout), --port <n>, --spaces <dir>.
spell app serve starts it too, and opens the editor on it.`
