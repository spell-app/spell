/**
 * The kit's own `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):  the repo
 * tools every checkout has, whatever else is installed.
 * - `spell server ...`:  this checkout's page server (`src/server/page/cli.ts`), and `start all` / `stop all`:  every
 *   web server of the checkout;  `start | stop | restart | status <server>` in a main checkout ask the server keeper
 * - `spell keeper start | ensure | add | status | local`:  Spell's server keeper (`spell/server/keeper`, epic `editor`
 *   P48)
 * - `spell bundle [names...]` / `spell bundle check`:  the bundles the page server serves, built on demand
 * - `spell commands [list|check]`:  every command against the commands page
 * - `spell wwod [check]`:  WWOD's citations and paths;  `spell wwod init`:  a project picks which of the rules its
 *   agents read (epic `repo-split` T66)
 * - `spell local [status | on [checkout] | off]`:  run your own checkout in a project that installs `spell` from npm,
 *   for you alone (epic `repo-split` T70;  `.spell/kit.json5`)
 * - `spell deps [check]`:  the lockfile's advisories and deprecated packages, before a push
 * - `spell names [check]`:  the names on this machine's private list, in what a push or a publish would send
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
 * - `spell rename branches [--dry-run]`:  an epic's old child-repo branches carried into the merged folders, rewritten
 *   as P20's history was (`tools/one-repo/one-repo.ts --step carry-on`)
 * - `spell runbook start | status | reset | list | check`:  a file of steps walked in the terminal, its commands run,
 *   its values asked for, where you got to remembered (epic `epic-engine` P78)
 * - `spell epic <args>`:  the epic tool (`epic`), wherever it is:  `npx spell@next epic init` sets a repo up for epics
 *   (epic `epic-friend` P13;  `runSpellEpic()`)
 * - `spell pony`:  a pony, which proves `spell` runs with nothing else installed
 * - `spell help`:  the program's own (`addHelp()`), not this list's
 * - Loads fast:  each action imports its command's file when it runs.
 * - NOTE: `spell commands` reads this file's TEXT, for each `spell.command(...)` and `<group>.command(...)` call:
 *   keep each command's name a literal at its call.
 */
import type { Command } from "commander"
import { join } from "node:path"

import { CLI } from "spell/cli"
import type { KeeperOptions } from "spell/cli/commands/keeperCommand"

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
    .description(
      "start the page server in the background if it isn't running, and print where it is (JSON) -- " +
        "<server>:  editor, or one the keeper keeps;  in a main checkout, through the server keeper"
    )
    .argument(
      "[server]",
      "all:  every web server of the checkout -- page server, the app's editor, Spell UI's site;  " +
        "page-server (default), editor, or a name spell keeper add registered"
    )
    .action((which: string | undefined) =>
      which === "all"
        ? CLI.runCommand(async () => (await serverCommand()).startAll())
        : isNamedServer(which)
          ? CLI.runCommand(async () => (await serverCommand()).serverByName("start", which!))
          : pageServer("start", PAGE_SERVER_WORDS)
    )

  passThrough(server.command("stop"))
    .description(
      "stop the page server -- all:  and the app's editor with it, even one left running;  " +
        "in a main checkout, through the server keeper, which leaves it stopped until a start"
    )
    .argument("[server]", "local / page-server (default), all, editor, or a name spell keeper add registered")
    // a flag first (`stop --spaces spaces`, a project's page server) names no server
    .action((which: string | undefined) =>
      which === "all"
        ? CLI.runCommand(async () => (await serverCommand()).stopServers(which))
        : isNamedServer(which)
          ? CLI.runCommand(async () => (await serverCommand()).serverByName("stop", which!))
          : pageServer("stop", PAGE_SERVER_WORDS)
    )

  passThrough(server.command("restart"))
    .description("restart a server on its code now -- in a main checkout, through the server keeper")
    .argument("[server]", "page-server (default), editor, or a name spell keeper add registered")
    .action((which: string | undefined) =>
      CLI.runCommand(async () =>
        (await serverCommand()).serverByName("restart", isNamedServer(which) ? which! : "page-server")
      )
    )

  passThrough(server.command("status"))
    .description(
      "the running page server's details (JSON), or exit 1 when it isn't running -- " +
        "<server>:  its line, as the server keeper last saw it"
    )
    .argument("[server]", "page-server (default:  its details), editor, or a name spell keeper add registered")
    .action((which: string | undefined) =>
      which && !which.startsWith("-")
        ? CLI.runCommand(async () => (await serverCommand()).serverStatus(which))
        : pageServer("status")
    )

  passThrough(server.command("url"))
    .description("start the page server if needed, then print the web address that serves <file>")
    .argument("<file>", "a file of this checkout, or of the epic folder")
    .action(() => pageServer("url"))

  passThrough(server.command("certificate"))
    .description(
      "make the page server's HTTPS certificate, and have this computer trust it (asks for the password once)"
    )
    .option("--check", "only say what's missing;  exit 1 until it's ready")
    .option("--undo", "remove it:  the page server goes back to plain HTTP at its next start")
    .action(() => pageServer("certificate"))

  passThrough(server.command("prune"))
    .description("stop the page and Vite servers whose checkout is gone, on any checkout")
    .option("--dry-run", "only list them")
    .action(() => pageServer("prune"))

  ////////////////
  // ## The server keeper
  ////////////////

  const keeper = spell
    .command("keeper")
    .description(
      "Spell's server keeper:  ONE program per Mac that keeps every main checkout's page server and editor up, " +
        "and the servers registered with it"
    )
    .addHelpText("after", KEEPER_HELP)

  keeper
    .command("start")
    .description("run it in the background (its log ~/.spell/keeper.log), taking over from the keeper in charge")
    .option("--here", "run this checkout's code, not the main checkout's (to try a branch)")
    .option("--port <n>", "its port (default 4949, else any free one)")
    .action((options: KeeperOptions) => keeperCommand("start", undefined, options))

  keeper
    .command("ensure")
    .description("start it only if no keeper is running;  every spell command runs this, in the background")
    .option("--take-over", "only Spell's own keeper counts:  take over from the epic hub's")
    .option("--quiet", "print nothing")
    .option("--here", "run this checkout's code, not the main checkout's (to try a branch)")
    .action((options: KeeperOptions) => keeperCommand("ensure", undefined, options))

  keeper
    .command("add")
    .description("register a server for it to watch (a proxy server, say), or --checkout alone:  a checkout to keep")
    .argument("[name]", "the server's name, as its card and spell server start <name> say it")
    .option("--check <url|port>", "how it's checked:  a URL that answers, or a port something listens on")
    .option("--start <command>", "the shell command that starts it;  none:  only watched")
    .option("--checkout <dir>", "the checkout it belongs to (default:  this one's main);  alone:  keep that checkout")
    .option("--what <words>", "what it's for, a few words")
    .action((name: string | undefined, options: KeeperOptions) => keeperCommand("add", name, options))

  keeper
    .command("status")
    .description("the keeper running, and every server as its last look saw it -- exits 1 when none runs")
    .option("--json", "print it as JSON")
    .action((options: KeeperOptions) => keeperCommand("status", undefined, options))

  keeper
    .command("local")
    .description("run it in this terminal, until Ctrl-C:  what start runs in the background")
    .option("--port <n>", "its port (default 4949, else any free one)")
    .action(async (options: KeeperOptions) => (await keeperWork()).runKeeperHere(options))

  ////////////////
  // ## Bundles
  ////////////////

  const bundle = spell
    .command("bundle")
    .description(
      "build the bundles the page server serves (Spell UI's site ...), and the generated files its pages need " +
        "(the root catalog, the epics pack, the docs bundle)"
    )
    .argument("[names...]", "the bundles to build;  none:  every one")
    .option(
      "--stale",
      "only those whose sources changed since their last build;  the committed ones only in a worktree"
    )
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
      "WWOD, the agents' rules:  check every citation and repo path in WWOD, AGENTS.md, CLAUDE.md and skills;  " +
        "init:  pick which of them a project's agents read"
    )
    .argument("[verb]", "check (default), init")
    .argument("[files...]", "check:  more files to check, beyond the default set")
    .option("--json", "print the report (init:  its changes) as JSON")
    .option("--wwod", "init:  WWOD, the house style (the default)")
    .option("--no-wwod", "init:  leave WWOD out")
    .option("--solid", "init:  the Solid 2 rules")
    .option("--no-solid", "init:  leave the Solid 2 rules out")
    .option("--code-is-the-spec", "init:  WWOD §21, the code is the spec (off unless asked for)")
    .option("--no-code-is-the-spec", "init:  leave §21 out")
    .option("-y, --yes", "init:  ask nothing:  the flags, else what the project has, else the defaults")
    .option(
      "--here",
      "init:  in a workspace, write in the nearest folder with a package.json, not the workspace's root"
    )
    .option("--dry-run", "init:  say what would change, and write nothing")
    .action((verb: string | undefined, files: string[], options: CLI.WwodOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/wwodCommand")).wwodCommand(verb, files, options))
    )

  spell
    .command("local")
    .description(
      "run your own Spell checkout in this project instead of npm's spell, for you alone:  " +
        "on writes the project's .spell/kit.json5, never committed, and switches spell and epic on your PATH, " +
        "Claude Code's epic plugin and skills, and VS Code's extension;  off puts them back"
    )
    .argument("[verb]", "status (default):  which Spell runs here, and why;  on [checkout];  off")
    .argument("[checkout]", "on:  your checkout of Spell (default:  the one this spell runs from, else ~/www/spell)")
    .option("--json", "print what it found (and did) as JSON")
    .option("--stop", "on:  also stop Spell's servers running another copy, and start the epic server from yours")
    .action((verb: string | undefined, checkout: string | undefined, options: CLI.LocalOptions) =>
      CLI.runCommand(async () =>
        (await import("spell/cli/commands/localCommand")).localCommand(verb, checkout, options)
      )
    )

  spell
    .command("deps")
    .description(
      "the dependencies:  fail on a deprecated package or a critical or high advisory not on the known-open list"
    )
    .argument("[verb]", "check (default)")
    .option("--json", "print the report as JSON")
    .action((verb: string | undefined, options: CLI.DepsOptions) =>
      CLI.runCommand(async () => (await import("spell/cli/commands/depsCommand")).depsCommand(verb, options))
    )

  spell
    .command("names")
    .description(
      "the names on your private list (~/.spell/private-names):  fail when what's about to leave this machine " +
        "holds one -- its files, commit messages, branch names and pictures;  every push runs it"
    )
    .argument("[verb]", "check (default)")
    .argument("[revisions...]", "what to check (default HEAD):  each one's files, and its commits not on a remote yet")
    .option("--push <remote>", "check what a push to <remote> sends, as git's pre-push hook hands it on stdin")
    .option("--json", "print the report as JSON")
    .action((verb: string | undefined, revisions: string[], options: CLI.NamesOptions) =>
      CLI.runCommand(async () =>
        (await import("spell/cli/commands/namesCommand")).namesCommand(verb, revisions, options)
      )
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
    .option("--save", "save a snapshot in the coherence epic's details/scores/ (the epic repo)")
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
  // ## Runbooks
  ////////////////

  const runbook = spell
    .command("runbook")
    .description(
      "a runbook:  a file of steps it walks you through in the terminal, running the commands itself, " +
        "asking for values (a secret one hidden) and remembering where you got to"
    )
    .addHelpText("after", RUNBOOK_HELP)

  runbook
    .command("start")
    .description("walk it from the first step not done:  Enter when a step is done, s to skip, q to stop")
    .argument("<runbook>", "its name (netbox-demo), or its file")
    .action((name: string) => runbookCommand("start", [name]))

  runbook
    .command("status")
    .description("each step, done or not, and when the walk started and expires")
    .argument("<runbook>", "its name, or its file")
    .action((name: string) => runbookCommand("status", [name]))

  runbook
    .command("reset")
    .description("forget how far you got, so the next start begins at step 1")
    .argument("<runbook>", "its name, or its file")
    .action((name: string) => runbookCommand("reset", [name]))

  runbook
    .command("list")
    .description("every runbook found:  the kit's and its folders' runbooks/, and each epic's")
    .action(() => runbookCommand("list", []))

  runbook
    .command("check")
    .description("read each runbook and say its mistakes, each with its line -- exits 1 on a mistake")
    .argument("[runbooks...]", "their names or files;  none:  every one found")
    .action((names: string[]) => runbookCommand("check", names))

  ////////////////
  // ## Epics
  ////////////////

  spell
    .command("epic")
    .description("the epic tool, epic, with its own verbs -- spell epic init sets a repo up for epics")
    .argument("[args...]", "epic's verb and what it takes, as epic takes them:  init, whoami, help ...")
    .allowUnknownOption()
    .helpOption(false)
    .action(() => CLI.runCommand(() => CLI.runSpellEpic(CLI.rawArgsAfter("epic"))))

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

/** `spell runbook`'s verbs, its work loaded when one runs. */
function runbookCommand(verb: string, names: string[]): Promise<never> {
  return CLI.runCommand(async () => (await import("spell/cli/commands/runbookCommand")).runbookCommand(verb, names))
}

/** After `spell runbook --help`'s verbs. */
const RUNBOOK_HELP = `
A runbook is a Markdown file, <name>.runbook.md, in a runbooks/ folder:  each ## heading a step.
A step with an sh block runs it;  with an ask block, asks for a value (\`\`\`ask NAME secret hides it);
with neither, it's done by hand.  How far you got:  ~/.spell/runbooks/.  Secrets:  ~/.spell/secrets/.`

/** `spell keeper`'s verbs, its work loaded when one runs. */
function keeperCommand(verb: string, name: string | undefined, options: KeeperOptions): Promise<never> {
  return CLI.runCommand(async () => (await keeperWork()).keeperCommand(verb, name, options))
}

/** `keeperCommand.ts`, loaded when a `spell keeper` verb runs. */
function keeperWork() {
  return import("spell/cli/commands/keeperCommand")
}

/** After `spell keeper --help`'s verbs. */
const KEEPER_HELP = `
It keeps each main checkout in ~/.spell/keeper.json5 (a main checkout's spell server start adds it), its
worktrees' page servers on demand, and the servers spell keeper add registers.  Asked through spell server
start | stop | restart | status <server>.  Its record:  ~/.spell/server-keeper.json.`

/** The page server's own names, as `spell server start | stop` take them:  handed on as no word at all. */
const PAGE_SERVER_WORDS = ["local", "page-server", "page"]

/** whether `which` names a server other than the page server:  not a flag, not one of its names */
function isNamedServer(which: string | undefined): boolean {
  return Boolean(which) && !which!.startsWith("-") && !PAGE_SERVER_WORDS.includes(which!)
}

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
