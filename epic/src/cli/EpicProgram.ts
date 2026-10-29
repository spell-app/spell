import chalk from "chalk"
import { Command, Help, Option } from "commander"

import { suggest } from "spell/util/string"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { EpicCheckout } from "spell/epic/command/EpicCheckout"
import { EpicGuide } from "spell/epic/command/EpicGuide"
import { EXIT, EpicCommandError, flagName } from "spell/epic/command/command.types"
import { EpicTools, type EpicToolName } from "spell/epic/command/EpicTools"
import { Hub } from "spell/epic/command/Hub"
import { LinesOfCode } from "spell/epic/command/LinesOfCode"
import { Parking } from "spell/epic/command/Parking"
import { PersonCommands } from "spell/epic/command/PersonCommands"
import { PluginInstall } from "spell/epic/command/PluginInstall"
import { SkillsCheck } from "spell/epic/command/SkillsCheck"
import { RepoInit } from "spell/epic/command/RepoInit"
import { Repos } from "spell/epic/command/Repos"
import { Requests } from "spell/epic/command/Requests"
import { Sessions } from "spell/epic/command/Sessions"
import { Shared } from "spell/epic/command/Shared"
import { Stock } from "spell/epic/command/Stock"
import { TurnEnd } from "spell/epic/command/TurnEnd"
import { Worktrees } from "spell/epic/command/Worktrees"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicRepo } from "spell/epic/config/EpicRepo"

import { GROUP_VERBS, VERB_FLAGS, type GroupName, type VerbFlags } from "./epicGroups"

/****************
 * ### `EpicProgram`
 * `epic <verb> ...`, the epic tools' own command (epic `epic-workflow` P9):  its commander tree, and `epic --help`.
 * Each verb group registers here, under its own heading, and runs in THIS process.
 *
 * - spell-epic's command line, in its `cli/` folder (epic `repo-split` J114):
 *   this tree, its groups' verbs (`epicGroups.ts`) and its entry (`epicMain.ts`)
 *   - the classes and tools each verb runs stay where they are:  `command/`, `tool/`, `tools/`
 * - The verb groups:
 *   - most verbs edit or read an epic page (`epics/<name>/<name>.plan.html`):
 *     the `epic` tool (`EpicTools.runPlanDoc()`),
 *     after `planDocArgs()` turns Owen's `seo#J3` addressing into the tool's arguments
 *   - `send`, `requests`, `file`, `home`, `merge`:  `Requests`
 *   - `worktree`, `session`, `park`, `shared`, `status`:  `Worktrees`, `Sessions`, `Parking`, `Shared`, `Stock`
 *     (epic `epic-eject` P5:  they were `spell dev worktree` ...)
 *   - `window`, `server` and the docs tools' groups (`ask`, `choices`, `comments`, `notes`, `agents`, `airplane`):
 *     scripts passed through, their arguments verbatim (`EpicTools.run()`)
 *   - `hub`, `repo`:  the machine's one epic server and the repos it serves (`Hub`, `Repos`;  epic `epic-eject` P7)
 *   - `pages`:  the docs pages' tools (spell-app's `spell dev docs` until epic `repo-split` P13;  epic `epic-eject` P9), passed through
 *   - `loc`:  lines of code per repo and folder, and the LOC guide rewritten (`LinesOfCode`, epic `epic-engine` I122)
 *   - `init`:  a repo set up for epics (`RepoInit`, epic `epic-eject` P9)
 *   - `plugin install`:  the epic plugin installed in Claude Code, `epic@spell` (`PluginInstall`, epic `epic-engine` P49);
 *     `--codex`:  for Codex, its hooks, skills and custom agents (epic `epic-friend` P11, P12)
 *   - `guide`, `turn end`:  the workflow for ANY agent, and the step that ends its turn (`EpicGuide`, `TurnEnd`;  epic
 *     `epic-friend` P11)
 *   - `skills check`:  the plugin's skills hold for Claude Code and Codex alike (`SkillsCheck`, epic `epic-friend` P12)
 *   - `config`:  the repo's `.epic/config.json5`, a value or all of them (`config()`)
 * - Help and mistakes:
 *   - each group's verbs are listed (`epicGroups.ts`) for their help, `epic ask create --help`,
 *     and an unknown one is refused
 *   - every verb's help has its usage, what it does, its flags and an example (`epic close --help`)
 *   - every verb's flags are listed (`epicGroups.ts`'s `flags`, `VERB_FLAGS`), and any other `--flag` is refused,
 *     never ignored (`checkFlags()`;  epic `coherence` P20)
 *   - an unknown verb exits 1, listing them;  a usage error exits 2 (`EXIT`), an unknown flag too
 * - ONE copy of the code:  every verb runs THIS checkout's code, whichever checkout calls it.
 *   - the data is the caller's (`EpicCheckout.nearest()`)
 *   - `epic --version` says which code runs
 * - Owen's names (epic `repo-split` P13, his command-names page):  `create`, `lint`, `inbox watch | ignore <epic>`,
 *   `window should-stay`, `window reload`, `ask | choices | saga | pages create`, `summarize`, `status` (taking
 *   stock, `stock` before);  an item's status card is `update`'s (`epic update seo#J3 underway`, J140)
 *   - gone with no stand-in:  the tool in its own order (`epic plan-doc ...`), `add-request` (`file`'s old name),
 *     `overnight`
 * - Its base is the kit's `spell/cli`, every repo's command line's (epic `coherence` P20):  `runCommand()` (a verb's
 *   exit, once its output is out, at most 2s later), `rawArgsAfter()`, `EXIT` and `CliError` (`EpicCommandError`)
 * - Lean:  it loads no spell, and the `epic` tool only when a page verb runs,
 *   so `epic` starts in a fraction of a second.
 *   - its entry is `epicMain.ts`, beside this
 *   - NEVER imports the kit's `spell` PROGRAM (`spell/cli/main`):  the base (`spell/cli`) loads node's modules,
 *     commander, chalk, `json5`, the kit's `RealPath` and util's timing, and no spell
 * - NOTE: `spell commands` reads the `epic.command(...)` calls in this file's TEXT:
 *   keep the receiver named `epic`
 ****************/
export class EpicProgram {
  /** the commander tree:  every verb on it */
  readonly epic: Command

  constructor() {
    const epic = new Command("epic")
      .description(
        "Work with epics:  their pages (epics/<name>/), the pages you answer on, worktrees, sessions, windows, " +
          "agents, airplane mode."
      )
      .usage("<verb> <epic>[#<id>] [arguments]")
      .addHelpText("after", EPIC_HELP)
      // each verb by name alone in the list:  its arguments are its own (`epic <verb> --help`)
      .configureHelp({ subcommandTerm: (verb) => verb.name() })
    this.epic = epic
    // `epic --version`:  which code runs, for "a worktree behind main runs main's code"
    epic.option("-V, --version", "the code this epic runs:  its commit, branch and checkout")
    epic.on("option:version", () => {
      process.stdout.write(`${EpicProgram.version()}\n`)
      process.exit(EXIT.OK)
    })
    // our own `help`, as `spell` has:  `epic help add` ~== `epic add --help`
    epic.helpCommand("help [verb]", "show help -- for one verb, e.g. epic help update")
    // an unknown verb:  say so, with the verbs there are (commander's own message names none)
    epic.on("command:*", ([verb]: string[]) => unknownVerb(epic, `epic ${verb}`))
    this.addRequestVerbs()
    this.addPageVerbs()
    this.addSagaVerbs()
    this.addWorkVerbs()
    this.addWindowVerbs()
    this.addSettingsVerbs()
    this.addToolGroups()
  }

  /**
   * Run the command line (`process.argv`, `epic <verb> ...`).
   * - never resolves:  every verb exits the process with its code (`runVerb()`)
   */
  async parse(): Promise<void> {
    // output piped into e.g. `head`, which closed it:  nothing more to say
    process.stdout.on("error", (error: NodeJS.ErrnoException) => error.code === "EPIPE" && process.exit(EXIT.OK))
    await this.epic.parseAsync()
  }

  ////////////////
  // ## Epic-wide:  requests from other sessions
  ////////////////

  /** `send`, `requests`, `file`, `home`, `merge`:  `Requests`. */
  private addRequestVerbs(): void {
    const epic = this.epic
    epic.commandsGroup("Requests from other sessions:")

    const requests = (verb: Command) => this.verb(verb, (args) => new Requests().run([verb.name(), ...args]))

    requests(epic.command("send"))
      .description("send an epic a request:  your words and screenshots;  no epic:  the tooling home")
      .usage('[<epic>] --text "..." | --file <file> [--images <n>] [--context "..."] [--from <session>] [--json]')
      .addHelpText("after", example('epic send seo --text "the comment box is too narrow" --images 1'))

    requests(epic.command("requests"))
      .description("every request sent to an epic, and where each went")
      .usage("<epic> [--json]")
      .addHelpText("after", example("epic requests seo"))

    requests(epic.command("file"))
      .description(
        "file a request into a phase:  your words and screenshots into its Requests field;  or, with no phase, " +
          'mark where it went:  "dropped:  done in P3"'
      )
      .usage('<epic>#P3 <request id>  |  <epic> <request id> "where it went"')
      .addHelpText("after", FILE_HELP)

    requests(epic.command("home"))
      .description("the tooling home, the epic dev-tooling requests go to;  with an epic, set it")
      .usage("[<epic>]")
      .addHelpText("after", example("epic home epic-workflow"))

    requests(epic.command("merge"))
      .description(
        "a standing epic's phase onto main at once, fast-forward only;  run in the main checkout;  a stray snapshot " +
          "or generated file there is moved aside first, and --ditch moves up to 3 others too, once you say so"
      )
      .usage("<epic> [--ditch]")
      .addHelpText("after", example("epic merge epic-workflow"))
  }

  ////////////////
  // ## Epic page:  making and reading
  ////////////////

  /** The verbs on an epic page:  the `epic` tool's. */
  private addPageVerbs(): void {
    const epic = this.epic
    epic.commandsGroup("Epic page:  making and reading:")

    this.page(
      epic.command("create"),
      "make an epic page from the template;  --future:  an idea for later, not planned yet;  --saga:  the saga it " +
        "serves;  it starts in the Overview stage (--stage <stage>:  another;  epic stage)",
      'epic create seo --title "SEO" --prompt "Make the docs findable"'
    ).usage(
      '<epic> [--title "Title"] [--prompt "text" | --prompt-file <file>] [--future] [--saga <id>] [--stage <stage>]'
    )
    this.page(
      epic.command("stage"),
      "set the page's stage, which decides what it shows:  overview (the Overview, Questions and Todos), phases (the " +
        "Phases and Issues too) or building (everything);  a new epic starts in overview, a page with none reads as building",
      "epic stage seo phases"
    ).usage("<epic> overview | phases | building")
    this.page(
      epic.command("change"),
      'stamp the change marks written by hand (<epic-change item="q13">words</epic-change>:  their id, time, ' +
        "answer and the words they replaced), then list them;  --for:  the item of the marks that name none " +
        "(any epic edit stamps them too)",
      "epic change seo --for q13"
    ).usage("<epic> [--for <item id>]")
    this.page(
      epic.command("list"),
      "every epic:  in progress, future or done, where it runs, items not reviewed",
      "epic list --json"
    ).usage("[--json]")
    this.page(
      epic.command("summary"),
      "an epic's phases, the next one, its open questions, issues, todos and manual tests",
      "epic summary seo"
    ).usage("<epic> [--json]")
    this.page(
      epic.command("summaries"),
      "`summary --json` of each page, by path (worktrees' too), for /epics",
      "epic summaries epics/seo/seo.plan.html"
    ).usage("<file.html>...")
    this.page(
      epic.command("items"),
      "what a review walks:  sections, counts, items, the queue",
      "epic items seo --filter unreviewed"
    ).usage("<epic> [--section issues] [--filter unreviewed | open | reviewed | queued | all] [--json] [--spec <file>]")
    this.page(
      epic.command("docs"),
      "the docs an epic wrote besides its page, and its changelog entry (for /docs-check)",
      "epic docs seo"
    ).usage("<epic> [--json]")
    this.page(
      epic.command("decisions"),
      "what an epic's page settled:  phases' Done and Updated notes, items' answers",
      "epic decisions seo"
    ).usage("<epic> [--json]")
    this.page(
      epic.command("owns"),
      "which open epics own each file (a path from the checkout's root):  their branch changes it, or their page " +
        "names it;  each with its stage, planning or building (for /coherence)",
      "epic owns src/server/LiveReload.ts epic/src/window.mjs"
    ).usage("<path>... [--json]")
    this.page(
      epic.command("open"),
      "show an epic's page in VS Code's side bar:  Epic Docs, or with --review the Review tab",
      "epic open seo --review"
    ).usage("<epic> [--review]")
    this.page(
      epic.command("lint"),
      "ids, #id links, phases, parts;  its links;  then the browser check",
      "epic lint seo --no-browser"
    ).usage("<epic> [--no-browser] [--links]")

    ////////////////
    // ## Epic page:  phases
    ////////////////

    epic.commandsGroup("Epic page:  phases:")

    this.page(
      epic.command("add-phase"),
      "add a phase:  what's wrong (symptom), what changes;  --after 11 makes it P12, --before N makes it PN;  " +
        "the phases after it move down one",
      'epic add-phase seo "Sitemap" --symptom "<p>No sitemap.</p>" --changes "<p>Write one.</p>" --after 11'
    )
      .usage('<epic> "Short Name" --symptom <html> --changes <html> [--goal ...] [--files ...] [--verify ...]')
      .addHelpText(
        "after",
        "\n  Also:  [--estimate 2h] [--after N | --before N]" +
          "\n  Phase numbers are whole:  a new phase renumbers the to-do phases after it, and items, links and" +
          '\n    "P5 · Name" text follow (a started phase in the way:  refused)' +
          "\n  --after 11:  the new P12, right after P11;  --before 4:  the new P4" +
          "\n  neither, with a Doc Review last:  just before it, the Doc Review moving down one;" +
          "\n    a Doc Review under way or done goes back to do, keeping its name"
      )
    this.page(
      epic.command("update"),
      "set a phase's or an item's fields, or the page's flags;  or Claude's status card on an item:  underway " +
        "(spinner on), done, or noted"
    )
      .usage('<epic>#P3 | <epic>#J3 | <epic>  --field <value> ...  |  <epic>#J3 underway | done | noted ["<html>"]')
      .addHelpText("after", UPDATE_HELP)
    this.page(
      epic.command("updated"),
      "a change to a phase's plan no item caused:  an Update block at the end of its description;  an answer's " +
        "change is its change marks alone (--for q3:  nothing written when the phase has marks for every one)",
      'epic updated seo#P3 "<p>Split in two:  the sitemap first.</p>" --summary "split in two"'
    ).usage('<epic>#P3 "<html>" | --file <file> [--summary "..."] [--for <item ids>]')
    this.page(
      epic.command("phase"),
      "set a phase's status;  done:  --done writes what was built, and the time Claude took (took, from the " +
        "transcripts);  took:  that time worked out again, for a phase done before;  planning:  Claude is writing " +
        "its plan, a blue spinner on its page (off:  ends it;  writing --plan ends it by itself)",
      'epic phase seo#P3 done --done "<ul><li>the sitemap, written on build</li></ul>"'
    ).usage(
      "<epic>#P3 todo | active | done [--done <html>] [--no-open]  |  <epic>#P3 took [--dry-run]  |  " +
        "<epic>#P3 planning [off]"
    )
    this.page(
      epic.command("move"),
      "move a to-do phase to another place among the to-do phases:  each numbered by its place, the links and " +
        "text naming them following",
      "epic move seo#P7 P4"
    ).usage("<epic>#P7 <the phase whose place it takes:  P4>")
    this.page(
      epic.command("commit"),
      "list a commit under a phase or an item (replacing its entry there)",
      'epic commit seo#P3 1a2b3c4 "the sitemap, written on build"'
    ).usage('<epic>#P3 | <epic>#J3  <sha> "what it did"')
    this.page(
      epic.command("commits"),
      "every phase and item commit in the page's history, into their lists (phase ... done and merge do it too);  " +
        "remap:  an old repo's commits, on every page, to their new ids",
      "epic commits seo --backfill"
    )
      .usage("<epic> --backfill [--merged <sha,...>]  |  remap <map> [<map> ...] --repo <old repo> [--dry-run]")
      .addHelpText(
        "after",
        "\n  remap:  every epic page's commits of an old repo, over the whole content folder, pointed at their new" +
          "\n    ids in the repo it was merged into (repo-split's P20 · One Repo;  epic-engine's P49)" +
          "\n    epic commits remap tools/one-repo/commit-map-parser.txt --repo spell-parser,spell-lang --dry-run"
      )

    ////////////////
    // ## Epic page:  items
    ////////////////

    epic.commandsGroup("Epic page:  items:")

    this.page(epic.command("add"), "add an item (J judgement, Q question, I issue, T todo, M manual test, D decision)")
      .usage(
        '<epic>#J "Title" [--details <html>] [--options "*Do it | Don\'t"] [--calm]  |  <epic>#T "Title" [--limit]  |  <epic>#M "Title" --step <html> ...'
      )
      .addHelpText("after", ADD_HELP)
    this.page(
      epic.command("calm"),
      "items not urgent (yellow), as the page's id chip does;  --loud:  urgent (red) again",
      "epic calm seo#J3 J4"
    ).usage("<epic>#J3 [J4 ...] [--loud]")
    this.page(
      epic.command("decide"),
      "answer a question:  the answer goes into it;  --option marks the chosen option",
      'epic decide seo#Q3 "Both, the sitemap first" --option A'
    ).usage('<epic>#Q3 "answer" [--details <html>] [--option A]')
    this.page(
      epic.command("choose"),
      "an option you settled in conversation, on ANY item, recorded as the page's pick does:  chosen on its latest " +
        "card set (--set N:  the Nth), the item answered / closed / reviewed, a Noted card;  several letters in a " +
        "pick-any set;  a phase's set or a standing set (s-upgrades) too",
      `epic choose seo#J9 A "Owen, 2026-10-06:  'require the parens';  built"`
    ).usage('<epic>#J9 <letter> [<letter> ...] ["outcome"] [--set N]')
    this.page(
      epic.command("option"),
      "an option set's options (epic-engine P50):  add one (the next letter), edit one in place (its old text kept, " +
        "folded), remove one (kept, folded), or close the set (done);  on an item, a phase or a standing set",
      'epic option add seo#Q4 "Inline the sitemap" "<p>One file fewer.</p>"'
    ).usage(
      'add <epic>#Q4 "Title" ["note"] [--image <png>]  |  edit <epic>#Q4 B [--title "..."] [--note "..."]  |  ' +
        "remove <epic>#Q4 B  |  close <epic>#Q4  [--set N]"
    )
    this.page(epic.command("close"), "close an item:  done", "epic close seo#J3").usage("<epic>#J3")
    this.page(epic.command("reopen"), "open a closed or canceled item again", "epic reopen seo#J3").usage("<epic>#J3")
    this.page(
      epic.command("cancel"),
      "an item made moot by another decision:  struck through",
      'epic cancel seo#J3 "moot:  P4 dropped the page"'
    ).usage('<epic>#J3 ["why"]')
    this.page(
      epic.command("details"),
      "write an agent's details or reply into an item;  --append adds it, --more under it",
      "epic details seo#J3 --file reply.html"
    ).usage("<epic>#J3 --file <reply.html> [--append | --more]  |  <epic>#M3 --step <html> --should <html> ...")
    this.page(
      epic.command("summarize"),
      "condense an item after a lot of back and forth:  the file replaces what it shows;  its text and every reply " +
        "move into its Original Discussion, folded;  your picks and the answer stay",
      "epic summarize seo#J3 --file condensed.html"
    ).usage("<epic>#J3 --file <condensed.html>")
    this.page(
      epic.command("restore"),
      "put earlier text (from git) into an item's Original Discussion",
      'epic restore seo#J3 --file old.html --as-of "2026-10-01 09:00"'
    ).usage('<epic>#J3 --file <old.html> [--as-of "YYYY-MM-DD HH:MM"]')
    this.page(
      epic.command("review"),
      "mark an item reviewed today;  the outcome goes in the log",
      'epic review seo#J3 "kept as it is"'
    ).usage('<epic>#J3 ["outcome"]')
    this.page(epic.command("defer"), "put an item off:  still not reviewed, dated", "epic defer seo#J3").usage(
      "<epic>#J3"
    )
    this.page(
      epic.command("queue"),
      "work a review decided on, waiting to be done",
      'epic queue seo#J3 "rename the flag to --all"'
    ).usage('<epic>#J3 "the work"')
    this.page(epic.command("unqueue"), "off the to-do list:  started, or dropped", "epic unqueue seo#J3").usage(
      "<epic>#J3"
    )

    ////////////////
    // ## Epic page:  the review inbox
    ////////////////

    epic.commandsGroup("Epic page:  the review inbox:")

    this.page(
      epic.command("inbox"),
      "the marks and comments you send from the page, and how a review session takes them"
    )
      .usage(
        '[watch | ignore | wait | apply] <epic>  |  status <epic> "<text>" [--items q3,c2] | --clear  |  ' +
          "working <epic>#J3 on | off  |  done | clear <epic>#J3"
      )
      .addHelpText("after", INBOX_HELP)
    this.page(
      epic.command("test"),
      "your testing:  the page in the Review tab, Start testing pressed (Claude prepares the tests, then the first " +
        "opens);  --all:  every epic's;  --list:  the open tests"
    )
      .usage("<epic>[#M3] [--list [--json]]  |  --all [--list] [--json]")
      .addHelpText("after", TEST_HELP)

    ////////////////
    // ## Epic page:  log and upkeep
    ////////////////

    epic.commandsGroup("Epic page:  log and upkeep:")

    this.page(
      epic.command("log"),
      "a timestamped review line in the page's log;  no text:  print the newest (the page shows only its commits)",
      'epic log seo "P3 started"'
    ).usage('<epic> ["text"]  |  <epic> --last <n>')
    this.page(
      epic.command("prompt"),
      'set the prompt that started the epic ("" removes it)',
      "epic prompt seo --file prompt.md"
    ).usage('<epic> "text" | --file <file>')
    this.page(
      epic.command("bedtime"),
      "a /bedtime run:  start turns bedtime mode on (changes stay green until reviewed), done off",
      'epic bedtime seo start "P3-P6,P9"'
    ).usage('<epic> start "P3-P6,P9" | done "summary"')
    this.page(
      epic.command("backfill"),
      "items you already went through in past sessions:  a dry run unless --apply",
      "epic backfill seo --apply"
    ).usage("<epic> | --all [--apply]")
    this.page(
      epic.command("split"),
      "store a page as a skeleton plus part files;  --done:  every finished epic",
      "epic split seo --dry-run"
    ).usage("<epic> [--dry-run] | --done [--dry-run]")
    this.page(epic.command("join"), "a split page back into one file", "epic join seo").usage("<epic>")
    this.page(
      epic.command("migrate"),
      "bring pages up to today's markup, every step of their kind;  safe to run again",
      "epic migrate --all --dry-run"
    ).usage("[<kind>] [<epic>... | --all] [--file <page>] [--step <name>] [--dry-run] [--notify] [--list]")
  }

  ////////////////
  // ## Sagas
  ////////////////

  /** `saga`:  the sagas' list and each epic's saga, the `epic` tool's. */
  private addSagaVerbs(): void {
    const epic = this.epic
    epic.commandsGroup("Sagas:")

    this.page(epic.command("saga"), "the sagas (epics of epics):  their list in order, and the saga each epic serves")
      .usage(
        'list [--json] | set <epic> <saga> | set <epic> --none | create <id> "Title" --purpose "..." | page <id> | ...'
      )
      .addHelpText("after", SAGA_HELP)
  }

  ////////////////
  // ## Worktrees, sessions, parked work, shared content
  ////////////////

  /** `worktree`, `session`, `park`, `status`, `shared`:  the `command/` folder's classes (epic `epic-eject` P5). */
  private addWorkVerbs(): void {
    const epic = this.epic
    epic.commandsGroup("Worktrees, sessions and parked work:")

    this.group(
      epic.command("worktree"),
      "git worktrees:  the live sessions and where they work, where a name stands, merging main in, patching them",
      (args) => new Worktrees().run(args)
    )
    this.group(
      epic.command("session"),
      "Claude Code sessions:  list, find, open in VS Code, title this one, mark finished ones ✅, digest a transcript",
      (args) => new Sessions().run(args)
    )
    this.group(
      epic.command("park"),
      "parked work:  the PARKED notes, what /wait-for could wait on, waiting for a name to finish",
      (args) => new Parking().run(args)
    )
    // `stock` until Owen's names (epic `repo-split` J140);  an item's status card is `epic update seo#J3 underway`
    this.verb(epic.command("status"), (args) => new Stock().run(args))
      .description("take stock:  worktrees, branches, sessions, parked work, plans -- in process, hung or parked, dead")
      .usage("[--json]")
      .addHelpText("after", example("epic status --json"))

    epic.commandsGroup("Shared content:")

    this.group(
      epic.command("shared"),
      "shared content:  docs pages, sagas and logs in the content folder, a repo beside the checkout, read from there;  " +
        "a checkout links in only the folders its config names (sharedFolders)",
      (args) => new Shared().run(args)
    )

    epic.commandsGroup("Any agent:  the workflow, and each turn's end:")

    this.verb(epic.command("guide"), (args) => new EpicGuide().run(args))
      .description(
        "the epic workflow in plain steps, for any agent (Codex, Claude Code ...):  find, plan, build, review, end " +
          "each turn, finish;  a topic alone, claude-only-tools among them"
      )
      .usage("[<topic>] [--list] [--path] [--root]")
      .addHelpText("after", example("epic guide build"))
    this.group(
      epic.command("turn"),
      "an agent's turn:  end, the shared plans committed and synced, what the end-of-turn hooks run",
      (args) => new TurnEnd().run(args)
    )
    this.group(
      epic.command("skills"),
      "the epic plugin's skills:  check, that each holds for Claude Code and Codex alike (an In Codex: line beside " +
        "each Claude-only step)",
      (args) => new SkillsCheck().run(args)
    )
  }

  ////////////////
  // ## Windows and the page server
  ////////////////

  /**
   * The options `epic window <args>` runs with:  `open`, `launch` and `close` of an epic worked in ANOTHER repo run
   * in THAT repo's checkout (`EpicRepo.elsewhere()`, epic `epic-engine` I47), so `epic window launch epic-engine`
   * typed in spell-app's window opens spell-epic's worktree window, never a spell-app one.
   * - said on stderr;  any other command, or a name that's this repo's or no epic's:  as before (`{}`)
   */
  static windowOptions(args: string[], cwd = process.cwd()): { cwd?: string } {
    const [command, name] = args.filter((arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--"))
    if (!name || !["open", "launch", "close"].includes(command ?? "")) return {}
    const home = EpicRepo.elsewhere(name, cwd)
    if (!home?.checkout) return {}
    process.stderr.write(`epic ${name} is worked in ${home.checkout}:  its window, from there\n`)
    return { cwd: home.checkout }
  }

  /**
   * `epic server <args>` in a repo with no page server of its own (one `epic init` set up):  the machine's epic
   * server (`Hub`), this repo registered with it first, for the verbs that serve (`start`, `ensure`, `url`).
   */
  static hubHere(args: string[], cwd = process.cwd()): Promise<number> {
    const hub = new Hub()
    if (["start", "ensure", "url"].includes(args[0] ?? "")) hub.registerHere(cwd)
    return hub.run(args)
  }

  /** `window`, `server`:  scripts passed through;  `hub`, `repo`:  the machine's epic server (`Hub`, `Repos`). */
  private addWindowVerbs(): void {
    const epic = this.epic
    epic.commandsGroup("Windows and the page server:")

    this.group(
      epic.command("window"),
      "VS Code windows per package and worktree:  open, close, handoff, show, should-stay ...",
      (args) => EpicTools.run("window", args, EpicProgram.windowOptions(args))
    )
    this.group(
      epic.command("server"),
      "this checkout's page server;  start --all:  every web server (page server, editor, Spell UI)",
      (args) =>
        // a repo without its own page server (one `epic init` set up):  the machine's epic server, same verbs,
        // serving this repo from the first time
        !EpicTools.hasPageServer()
          ? EpicProgram.hubHere(args)
          : args[0] === "start" && args.includes("--all")
            ? EpicTools.run("serve", ["server", "start", "all", ...args.slice(1).filter((arg) => arg !== "--all")])
            : EpicTools.run("server", args)
    )
    this.group(
      epic.command("hub"),
      "the machine's ONE epic server:  every registered repo's pages, the engine's assets, the epic routes",
      (args) => new Hub().run(args)
    )
    this.group(
      epic.command("pages"),
      "the docs pages:  the home and list pages (index), a new page, a page's links, opening one, its writing",
      (args) => EpicTools.runPages(args)
    )
    this.verb(epic.command("loc"), (args) => new LinesOfCode().run(args))
      .description(
        "lines of code:  every repo of this checkout, per repo and per folder, code, tests and docs;  rewrites the " +
          "LOC guide (guides/loc/loc.html) and prints its links and the totals"
      )
      .usage("[--print] [--json]")
      .addHelpText("after", LOC_HELP)
    this.group(
      epic.command("repo"),
      "the repos the epic server serves (~/.spell-epic/repos.json5):  add, list, remove, default",
      (args) => new Repos().run(args)
    )
  }

  ////////////////
  // ## The repo's settings
  ////////////////

  /** `config`, `voice`, `init`, `whoami`, `whois`, `plugin`. */
  private addSettingsVerbs(): void {
    const epic = this.epic
    epic.commandsGroup("The repo's settings:")

    this.verb(epic.command("config"), (args) => EpicProgram.config(args))
      .description("where this repo keeps its epic things (.epic/config.json5):  a value, or all of them")
      .usage("[<key>] [--json]")
      .addHelpText("after", CONFIG_HELP)

    this.verb(epic.command("voice"), (args) => EpicProgram.voice(args))
      .description(
        "the VOICE a kind of page is written in (readme, code ...):  its file, for a skill to read;  or every voice"
      )
      .usage("[<name> | --for <kind>] [--json]")
      .addHelpText("after", VOICE_HELP)

    this.verb(epic.command("init"), (args) => new RepoInit().run(args))
      .description(
        "set this repo up for epics, the one command to start (npx spell@next epic init):  the plugin, its " +
          ".epic/config.json5, the content repo beside it (made, or cloned from the team's), shared on GitHub, the " +
          "links and their .gitignore lines, your name and colour, then the epic server;  safe to run again"
      )
      .usage(
        "[--name <name>] [--color <colour>] [--content-repo <name> | --remote <address> | --no-remote] [--public] " +
          "[--no-plugin] [--no-server] [--dry-run] [--json]"
      )
      .addHelpText("after", INIT_HELP)

    this.verb(epic.command("whoami"), (args) => new PersonCommands().whoami(args))
      .description(
        "who you are on the epics:  your short name (kept, else your GitHub login, else git's user.name), your full " +
          "name and GitHub login;  " +
          "with a name, keeps it;  --rename also writes it over the old one on every page"
      )
      .usage("[<name>] [--rename [--dry-run]] [--json]")
      .addHelpText("after", WHOAMI_HELP)

    this.verb(epic.command("whois"), (args) => new PersonCommands().whois(args))
      .description("what the epics know about someone:  the replies and comments naming them, by place, and when last")
      .usage("<name> [--json]")
      .addHelpText("after", example("epic whois Owen"))

    this.group(
      epic.command("plugin"),
      "the epic plugin in Claude Code, epic@spell from the kit's epic/:  install (moves an old spell-epic@spell-epic);  " +
        "install --codex:  its hooks, skills and custom agents for Codex",
      (args) => new PluginInstall().run(args)
    )
  }

  ////////////////
  // ## Groups:  the docs tools
  ////////////////

  /** `ask`, `choices`, `comments`, `notes`, `agents`, `airplane`:  the docs tools passed through. */
  private addToolGroups(): void {
    const epic = this.epic
    epic.commandsGroup("Pages you answer on, agents, airplane mode:")

    const tool = (name: EpicToolName) => (args: string[]) => EpicTools.run(name, args)
    this.group(
      epic.command("ask"),
      "details pages:  a question explained on a page in VS Code's side bar, you answering on it",
      tool("details")
    )
    this.group(
      epic.command("choices"),
      "choice pages:  a table of names Claude recommends, your call on each",
      tool("choices")
    )
    this.group(
      epic.command("comments"),
      "comments you leave on docs pages:  list, wait for, gather, mark and answer them",
      tool("comments")
    )
    this.group(
      epic.command("notes"),
      "page notes you left on docs pages (before comments):  list, answer, mark done",
      tool("notes")
    )
    this.group(
      epic.command("agents"),
      "the running-agents list of this epic (else this checkout):  what each background agent is doing",
      tool("agents")
    )
    this.group(
      epic.command("airplane"),
      "airplane mode:  the docs worked on with no Claude, everything kept for /airplane land",
      tool("airplane")
    )
  }

  ////////////////
  // ## Building verbs
  ////////////////

  /**
   * Make `verb` a verb on an epic page:  run by the `epic` tool, after `planDocArgs()`.
   * - returns it, for its usage line and help
   * - `sample`:  a whole command line, for its help's "Example:"
   *   (a verb with its own help text has its examples there)
   * - its flags:  `VERB_FLAGS`', and `--here`, unlisted:  the tool accepts and ignores it, for old callers
   * - `epic.command("<name>")` stays at each call:  `spell commands` finds the verbs by that text
   */
  private page(verb: Command, description: string, sample?: string): Command {
    const name = verb.name()
    if (sample) verb.addHelpText("after", example(sample))
    return this.verb(verb, (args) => EpicTools.runPlanDoc([name, ...args]), { accepted: OLD_PAGE_FLAGS }).description(
      description
    )
  }

  /**
   * Make `command` group `name` of `epic`'s, run by `run` with its arguments verbatim.
   * - a verb of its own for each of `GROUP_VERBS`, so `epic ask create --help` prints that verb's help, its flags
   *   among it, and refuses a flag it hasn't got
   * - an unknown verb (`epic ask bogus`):  refused, exit 1, listing the group's verbs
   * - no verb (`epic agents`, `epic comments --json`):  the tool's default, or its usage
   * - a verb after a flag the tool takes (`epic agents --epic seo list`) is the tool's to read:
   *   commander can't tell a flag's value from a verb, so the group takes any of its verbs' flags
   * - `epic.command("<name>")` stays at each call:  `spell commands` finds the verbs by that text
   */
  private group(command: Command, description: string, run: (args: string[]) => Promise<number>): Command {
    const name = command.name() as GroupName
    const verbs = GROUP_VERBS[name]
    const anyVerbs: VerbFlags = Object.assign({}, ...verbs.map((verb) => verb.flags))
    command
      .description(description)
      .usage("<verb> [arguments]")
      .argument("[args...]")
      .allowUnknownOption()
      .configureHelp({ subcommandTerm: (verb) => verb.name() })
      .addHelpText("after", `${example(verbs[0]!.example)}\n\nepic ${name} <verb> --help says more about each.`)
      .action((args: string[]) => {
        // a known verb went to its own command (below):  a word here is a verb the group lacks
        if (args[0] !== undefined && !args[0].startsWith("-")) unknownVerb(command, `epic ${name} ${args[0]}`)
        return runVerb(`epic ${name}`, anyVerbs, CLI.rawArgsAfter(name), run)
      })
    for (const verb of verbs) {
      const typed = command.command(verb.name)
      this.flagged(typed, verb.flags)
        .description(verb.description)
        // a verb with no arguments (`airplane on`):  none, rather than commander's "[options] [args...]"
        .usage(verb.usage || " ")
        .argument("[args...]")
        .allowUnknownOption()
        .addHelpText("after", example(verb.example))
        .action(() => runVerb(`epic ${name} ${verb.name}`, verb.flags, CLI.rawArgsAfter(name), run))
    }
    return command
  }

  /**
   * Make `verb`, a verb of no group, run `run` with its arguments as typed (everything after its name), taking its
   * flags (`VERB_FLAGS`):  its help lists them, and any other `--flag` is refused (`runVerb()`).
   * - `accepted`:  flags it takes without listing them
   * - returns `verb`, for its usage and help
   */
  private verb(
    verb: Command,
    run: (args: string[]) => Promise<number>,
    { accepted = [] }: { accepted?: readonly string[] } = {}
  ): Command {
    const name = verb.name()
    const flags = VERB_FLAGS[name]
    return this.flagged(verb, flags)
      .argument("[args...]")
      .allowUnknownOption()
      .action(() => runVerb(`epic ${name}`, flags, CLI.rawArgsAfter(name), run, accepted))
  }

  /**
   * Show `flags` in `verb`'s help, under commander's own `Options:`;  `undefined`:  none listed.
   * - help only, to commander:  each verb's tool reads its own flags, as typed (`parseVerbArgs()`), so commander parses
   *   none:  a value that starts with `-` stays a value, and a flag's missing value is the tool's to say
   * - returns `verb`
   */
  private flagged(verb: Command, flags: VerbFlags | undefined): Command {
    const options = Object.entries(flags ?? {}).map(([spec, description]) => new Option(spec, description))
    return verb.configureHelp({
      ...verb.configureHelp(),
      visibleOptions: (command: Command) => [...options, ...new Help().visibleOptions(command)]
    })
  }

  ////////////////
  // ## Statics:  verbs of the program itself
  ////////////////

  /**
   * `epic config [<key>] [--json]`:  where this repo keeps its epic things, as `.epic/config.json5` says
   * (`EpicConfig`, epic `epic-eject` P4).
   * - `<key>`:  that value alone, on a line of its own, for a skill to use in a path:
   *   `epic config contentFolder` => `/Users/owen/www/spell-app/spell-app-dev`
   *   - folders absolute;  a window name by its dotted key, `windows.default`
   * - no key:  every value, `key:  value` a line;  `--json`:  all of them as JSON
   * - the repo:  the checkout the command runs in (any worktree reads the main checkout's file), else this code's
   * - Returns 0.
   * - Throws `EpicCommandError`:  exit 2 for an unknown key, listing the keys;  1 for a file that won't read.
   * - static:  needs no tree
   */
  static async config(args: string[]): Promise<number> {
    const json = args.includes("--json")
    const [key] = args.filter((arg) => !arg.startsWith("--"))
    let values: Record<string, string | boolean | number>
    try {
      values = EpicConfig.of(EpicCheckout.nearest({ marker: ".git" })).values()
    } catch (error) {
      throw new EpicCommandError((error as Error).message, EXIT.ERRORS)
    }
    if (key === undefined) {
      const lines = Object.entries(values).map(([name, value]) => `${name}:  ${value}`)
      process.stdout.write(json ? `${JSON.stringify(values, null, 2)}\n` : `${lines.join("\n")}\n`)
      return EXIT.OK
    }
    if (!(key in values))
      throw new EpicCommandError(`epic config ${key}?  no such key.  The keys:  ${Object.keys(values).join(", ")}`)
    process.stdout.write(json ? `${JSON.stringify(values[key])}\n` : `${values[key]}\n`)
    return EXIT.OK
  }

  /**
   * `epic voice [<name> | --for <kind>] [--json]`:  the VOICES this repo writes people-facing pages in (epic `readme`
   * P13;  `EpicConfig.voiceFile()`).
   * - `<name>`:  that voice's file, alone on a line, for a skill to read:  `epic voice readme` => `/.../readme.md`
   * - `--for <kind>`:  the file of the voice that kind of page is written in:  `epic voice --for guide`
   * - neither:  every voice, its file and the kinds of page written in it;  `--json`:  the same as JSON
   * - Returns 0.
   * - Throws `EpicCommandError`:  exit 2 for a voice this repo hasn't got, listing those it has;  1 for a config file
   *   that won't read.
   * - static:  needs no tree
   */
  static async voice(args: string[]): Promise<number> {
    const json = args.includes("--json")
    const forAt = args.indexOf("--for")
    const kind = forAt === -1 ? undefined : args[forAt + 1]
    const [named] = args.filter((arg, at) => !arg.startsWith("--") && (forAt === -1 || at !== forAt + 1))
    let config: EpicConfig
    try {
      config = EpicConfig.of(EpicCheckout.nearest({ marker: ".git" }))
    } catch (error) {
      throw new EpicCommandError((error as Error).message, EXIT.ERRORS)
    }
    if (forAt !== -1 && !kind) throw new EpicCommandError("epic voice --for <kind>?  e.g. --for guide", EXIT.USAGE)
    const name = kind ? config.voiceFor(kind) : named
    if (name === undefined) {
      const kinds = Object.entries(config.settings.pageVoices)
      const all = config.voiceNames.map((each) => ({
        name: each,
        file: config.voiceFile(each) ?? "",
        kinds: kinds.filter(([, voice]) => voice === each).map(([pageKind]) => pageKind)
      }))
      const lines = all.map(
        (each) => `${each.name.padEnd(10)} ${each.file}${each.kinds.length ? `  (${each.kinds.join(", ")})` : ""}`
      )
      process.stdout.write(json ? `${JSON.stringify(all, null, 2)}\n` : `${lines.join("\n")}\n`)
      return EXIT.OK
    }
    const file = config.voiceFile(name)
    if (!file)
      throw new EpicCommandError(
        `epic voice ${name}?  no such voice here.  The voices:  ${config.voiceNames.join(", ")}` +
          (name === "code"
            ? `.  Name the repo's house style in .epic/config.json5:  "voices": { "code": "<its file>" }`
            : ""),
        EXIT.USAGE
      )
    process.stdout.write(json ? `${JSON.stringify({ name, file })}\n` : `${file}\n`)
    return EXIT.OK
  }

  /**
   * `epic --version`:  the code this `epic` runs, `<short sha> (<branch>) <checkout>`.
   * - static:  this code's checkout, whoever calls
   */
  static version(): string {
    const sha = Git.run(["rev-parse", "--short", "HEAD"], EpicCheckout.CODE_ROOT).out || "?"
    const branch = Git.run(["branch", "--show-current"], EpicCheckout.CODE_ROOT).out || "detached"
    return `epic ${sha} (${branch}) ${EpicCheckout.CODE_ROOT}`
  }

  /**
   * `args`, a verb's as typed, when every `--flag` among them is one of `flags` (or `accepted`);  else a usage error
   * naming the one it hasn't got, and the nearest it has (`suggest()`):
   * `epic summary --jsn?  no such flag;  did you mean --json?  epic summary --help lists its flags`.
   * - a flag as the tools read one (`flagName()`):  `--name`, alone;  so a value like `"-- a note"` is never one
   * - compared camelCased, as the tools read them:  `--dry-run` and `--dryRun` are one flag
   * - `typed`:  the verb as typed, `epic ask create`, for the message;  `flags` `undefined`:  any flag goes
   * - throws `EpicCommandError` (exit 2)
   * - static:  pure
   */
  static checkFlags(
    typed: string,
    flags: VerbFlags | undefined,
    args: readonly string[],
    accepted: readonly string[] = []
  ): readonly string[] {
    if (!flags) return args
    const known = new Map(
      [...Object.keys(flags), ...accepted].map((spec) => {
        const long = LONG_FLAG.exec(spec)![1]!
        return [flagName(long)!, long] as const
      })
    )
    for (const arg of args) {
      const name = flagName(arg)
      if (name === undefined || known.has(name)) continue
      const near = suggest(
        arg.slice(2),
        [...known.values()].map((long) => long.slice(2))
      )
      throw new EpicCommandError(
        `${typed} ${arg}?  no such flag${near ? `;  did you mean --${near}?` : "."}  ${typed} --help lists its flags`
      )
    }
    return args
  }
}

/**
 * Run verb `typed` (`epic ask create`):  its `args` checked against its flags (`EpicProgram.checkFlags()`), then
 * handed to `run`;  the process exits with what it resolves to, once its output is out (`CLI.runCommand()`).
 * - an `EpicCommandError` prints just its message, in red;  anything else is a crash, and prints its stack
 */
function runVerb(
  typed: string,
  flags: VerbFlags | undefined,
  args: string[],
  run: (args: string[]) => Promise<number>,
  accepted: readonly string[] = []
): Promise<never> {
  return CLI.runCommand(async () => run([...EpicProgram.checkFlags(typed, flags, args, accepted)]))
}

/**
 * Refuse `typed`, a verb `command` doesn't have, listing those it does.
 * - exits 1, as commander exits for a mistake
 *   (a usage error, a verb's missing argument, is 2:  `EXIT.USAGE`)
 */
function unknownVerb(command: Command, typed: string): never {
  const verbs = command.createHelp().visibleCommands(command)
  const names = verbs.map((verb) => verb.name()).filter((name) => name !== "help")
  const help = command.parent ? `${typed.split(" ").slice(0, 2).join(" ")} <verb> --help` : "epic <verb> --help"
  process.stderr.write(
    `${chalk.red(`${typed}?  no such verb.`)}  The verbs:\n${wrap(names.join(", "))}\n${help} says what each does.\n`
  )
  process.exit(EXIT.ERRORS)
}

/** `text` wrapped at spaces to lines of at most 100 columns, each indented 2. */
function wrap(text: string): string {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    if (line && line.length + word.length + 1 > 98) {
      lines.push(line)
      line = ""
    }
    line = line ? `${line} ${word}` : word
  }
  return [...lines, line].map((each) => `  ${each}`).join("\n")
}

/** A verb's help's "Example:", for `addHelpText("after", ...)`. */
function example(commandLine: string): string {
  return `\nExample:\n  ${commandLine}`
}

/** A flag's long name at the start of its spec (`--epic <epic>`):  `--epic`. */
const LONG_FLAG = /^(--[\w-]+)/

/**
 * The flags every epic page's verb takes without listing them:  `--here`, which the `epic` tool accepts and ignores
 * (every checkout edits the one shared page), for old callers.
 */
const OLD_PAGE_FLAGS = ["--here"]

/** After `epic --help`'s verbs:  how to name things. */
const EPIC_HELP = `
Naming what a verb acts on:
  seo                 the epic's page, epics/seo/seo.plan.html
  seo#J3              an item:  J3 (a comment on the page, seo#C3, too;  the old cm3 reads the same)
  seo#P3              a phase:  P3, or by its id, seo#p-epic-migrate;  phase, updated and file take its name
                      too:  seo#epic-migrate, "seo#Epic Migrate"
  seo#J               a new item of that kind, for add:  epic add seo#J "Title"
  SAGA:/epics         a saga's page, sagas/epics/epics.saga.html:  epic add SAGA:/epics#T "Title"
  guides/x.html#C3    a comment on a docs page, for epic comments (and a page note, guides/x.html#n3)

Examples:
  epic summary seo
  epic phase seo#P3 done --done "<ul><li>...</li></ul>"
  epic update seo#P3 --goal "<p>...</p>" --estimate 2h
  epic update seo#J3 underway "Writing the answer"
  epic inbox wait seo

epic <verb> --help says more about each;  an id always goes after a #, never as a word of its own.`

/** After `epic loc --help`. */
const LOC_HELP = `
  --print    the by-repo table only, in the terminal;  the page is left as it is
  --json     the numbers, every column, per repo and per row

What counts:  guides/loc/loc.json5 in the content folder (written with the defaults when missing):
which folders are rows, which files are tests, the code and doc extensions, what's left out.

Examples:
  epic loc
  epic loc --print`

/** After `epic config --help`. */
const CONFIG_HELP = `
The keys (folders print absolute;  the file's are relative to the main checkout):
  contentFolder        the shared content repo:  epics, guides, sagas, the logs
  contentRemote        its address, which everyone pulls from and pushes to ("":  none);  epic init writes it
  baseBranch          the branch worktrees start from and merge into
  worktreesFolder      where new worktrees go, <worktreesFolder>/<name>;  may be beside the repo
                       (../spell-app.worktrees), the old .claude/worktrees still read then
  installCommand       what makes a new worktree ready to run
  installOnCreate      whether the worktree hook runs installCommand before handing a new worktree over
  installTimeout       the seconds that install may take
  windows.default      the window a worktree's window is opened from, by default
  windows.repoName     the repo root's folder name in every window
  windows.contentName  the content repo's folder name in every window
  windows.worktreeOnly whether every worktree's window holds only the worktree and the content folder
                       (a worktree beside the repo gets that window anyway)
  linkSessionFolders   whether the worktree hook links new worktrees' saved-session folders to main's
  sharedFolders        the content repo's folders every checkout links in, comma-separated
  repos                a MULTI-REPO top's child repos, comma-separated (its "repos":  "repos.json5", or the
                       names):  an epic's worktree is then <worktreesFolder>/<epic>, a worktree of the top with
                       one of every child repo inside it, all on branch <epic>;  empty:  a single repo
  top                  the multi-repo top's main checkout this repo is (or is a child of);  empty:  none
  voices.<name>        each voice's file:  the repo's own ("voices"), else spell-epic's voices/<name>.md
  pageVoices.<kind>    the voice each kind of page is written in ("pageVoices", over the defaults)
  checkoutPatches      the ids of the fixes every checkout gets, comma-separated:  a file copied from main, or
                       a command run once (epic worktree patch)
Any worktree reads the main checkout's file;  a key it leaves out reads as epic init would write it for
this repo.

Examples:
  epic config contentFolder
  epic config --json`

/** After `epic voice --help`. */
const VOICE_HELP = `
A VOICE is how a kind of page is written:  who reads it, what it opens with, what it never does.
  readme   READMEs, an epic's guide, reference pages:  one engineer to another, with proof
           (spell-epic's voices/readme.md)
  code     docstrings, comments, AGENTS.md files, epic pages:  the repo's own house style, which its
           .epic/config.json5 names ("voices": { "code": "agents/wwod/writing.md" });  spell-epic ships none
A repo's .epic/config.json5 adds or replaces voices ("voices", a name to a file from its main checkout) and says
which voice each kind of page takes ("pageVoices":  readme, guide, code, epic-page ...).

Examples:
  epic voice readme
  epic voice --for guide
  epic voice --json`

/** After `epic init --help`. */
const INIT_HELP = `
From any folder of the repo (a worktree's too), each step skipped when it's done:
  the plugin           epic, installed for Claude Code when it isn't yet (epic plugin install):  the machine's,
                       once;  --no-plugin skips it
  .epic/config.json5   written for this repo:  content folder ../<repo>.epics, worktrees ../<repo>.worktrees,
                       the base branch from git, the install command its lock file names (none without one),
                       window names from the repo's;  a file already there is kept
  ../<repo>.epics      the content repo, a git repo of its own:  epics/, sagas/, guides/, pages/;
                       cloned instead, when the config names the team's (contentRemote) and it isn't here
  the shared repo      the content repo on GitHub, so the team shares the plans:  asks what to call it
                       (<repo>-epics) and "Private or public?" (private), makes it, pushes, and writes its
                       address in the config (contentRemote);  needs GitHub's command, gh, logged in:  without
                       it, says how to get it
  the links            each of those folders linked in at the checkout's root
  .gitignore           the links listed between # shared:start and # shared:end
  your name            "What do you want to be called?" (--name), kept in ~/.spell-epic/person.json5
  your colour          "Which colour should your words be?", from the colour names nobody has (--color), kept
                       with the plans, in the content repo's people/
  the epic server      started, serving this repo:  its address the last line;  --no-server skips it
Then commit .epic/config.json5 and .gitignore on the base branch, and push it:  a teammate's epic init then
clones the plans.

--content-repo <name> names the shared repo without asking;  --remote <address> uses one made already;
--no-remote makes none, and the plans stay on this machine.
--public makes the shared repo public without asking;  with no terminal to ask in, it's private unless --public.
A public one shows everything in the plans (epic pages, guides, comments) to anyone.

--name <name> is the name you go by on the epics, kept in ~/.spell-epic/person.json5 (epic whoami);
without it, epic init asks in a terminal, suggesting your GitHub login (else git's user.name), and takes that
anywhere else.

Examples:
  npx spell@next epic init        the same, before anything is installed
  epic init --dry-run
  epic init --name Ana --color green
  epic init --content-repo my-app-epics
  epic init --remote git@github.com:my-team/my-app-epics.git
  epic init`

const WHOAMI_HELP = `
Your short name is who you are on the epics, and what's stamped on what you write:  kept in
~/.spell-epic/person.json5 ($SPELL_EPIC_HOME), else your GitHub login, else git's user.name.  Your full name is git's.
whoami looks your GitHub login up (gh api user) and keeps it there, so pages never run gh.  epic init asks too.

  owenoak  (Owen Williams, github: owenoak)       nothing kept:  the GitHub login
  Owen  (Owen Williams, github: owenoak)          epic whoami Owen kept it

The name is who you are:  --rename writes the new one over the old wherever it says who wrote something (a reply's
from, a comment's by, "Ana's run", "Ana picked B" ...), on every page, part and inbox;  never in running text.

Examples:
  epic whoami
  epic whoami Ana
  epic whoami --rename Ana Lima --dry-run`

/** After `epic file --help`. */
const FILE_HELP = `
Into a phase, the request's words, context and screenshots go into its Requests field, and the request is marked
filed there (P3).  With no phase, it's only marked, saying where it went.

Examples:
  epic file seo#P3 r3
  epic file seo r3 "dropped:  done in P2"`

/** After `epic update --help`. */
const UPDATE_HELP = `
A phase (seo#P3):
  --symptom, --changes, --goal, --files, --verify <html>   its body ("" removes one)
  --estimate <time>                                       its estimate, e.g. 1-2h
  --title "New name" [--html]                             rename it:  links that say the old name follow
An item (seo#J3):
  --title "New title" [--html]                            retitle it
  --calm  /  --loud                                       not urgent (yellow)  /  urgent (red)
The page (seo):
  --standing [on | off],  --no-standing                   a standing epic:  open for good, never done
Claude's status card on an item (seo#J3;  an Overview sub-section seo#o3, a phase seo#P3, seo#summary), a state
word after the target, never with fields:
  underway "<reading>"                                    a blue card:  what Claude took the task to be;  spinner on
  done ["<summary>"]                                      the item's WORK finished:  that card green, the summary
                                                          under it;  an open issue or todo closes (as close does)
  noted "<what>"                                          a STEP done, the item not finished:  your choice
                                                          recorded, an answer or details written:  a Noted card

Examples:
  epic update seo#P3 --goal "<p>...</p>" --estimate 2h
  epic update seo#J3 --title "Clearer title"
  epic update epic-workflow --standing
  epic update seo#I3 underway "Reading the routes"
  epic update seo#I3 done "Fixed;  one test skipped"
  epic update seo#J3 noted "Answered his note:  options A and B"`

/** After `epic saga --help`. */
const SAGA_HELP = `
The sagas' list, in your order:  sagas/sagas.json5.  An epic names its saga:  <epic-page saga="<id>">.
  epic saga list [--json]                         the sagas in order, each with its epics and guide count
  epic saga set <epic> <saga>                     the saga an epic serves (--none:  no saga);  logged
  epic saga create <id> "Title" --purpose "..." [--after <id>]
                                                  a new saga, last or after <id>;  its id one or two words
  epic saga move <id> --before <id> | --after <id>
                                                  its place in the list
  epic saga title <id> "Title"                    its title
  epic saga rename <old> <new>                    its id:  epic pages, guides' saga metas, its folder and
                                                  SAGA:/<old> addresses in the shared pages follow
  epic saga page <id> [--force]                   its page, sagas/<id>/<id>.saga.html, from the template;
                                                  --force remakes it;  every epic verb edits it as SAGA:/<id>

Example:
  epic saga set python-target output-targets`

/** After `epic add --help`. */
const ADD_HELP = `
Prints the new item's id.  The letter after # is its kind:
  J judgement   Q question   I issue   T todo   M manual test (checked by hand)   D decision (a question born answered)
A todo (T) is work still to do;  --limit:  a limit to know about, not work.
The letters before epic-engine P44 (C caveat, T test) moved:  #C is refused, naming these;  C is a comment's now.
--calm (last):  a judgement or issue that wouldn't surprise you, yellow rather than red.
A manual test (M), answered by you on the epic page, its fields HTML, or plain text:
steps as "1. ... 2. ..." become a numbered list, "- " lines bullets (epic details seo#M3 takes them too):
  --step <html>       exactly what to do;  <a class="epic-test-action" href="...">Open ...</a> a page to open;
                      the app, window and menu or keys named;  everything to type in a <pre><code> block (or a
                      fenced block in plain text), which the page shows with a Copy button;  a wait its own step
  --should <html>     what should happen
  --example <png>     a screenshot of it, copied to tests/<id>.png beside the page;  or a line of text
  --if-not <html>     what to tell Claude when it doesn't

Examples:
  epic add seo#J "Kept one file per template" --details "<p>Why ...</p>" --calm
  epic add seo#T "Retry the upload once it's online"
  epic add seo#T "Find-in-page misses folded text" --limit
  epic add seo#M "The sitemap lists every page" --step "Open /sitemap.xml" --should "Every guide is in it"
  epic add seo#choices "Upgrades on offer" --multiple   (a standing option set, s-upgrades-on-offer, in the Choices section)`

/** After `epic test --help`. */
const TEST_HELP = `
You answer each test where it is, in the epic page's Manual tests section:  Approve if it passed, a note (a
screenshot pasted or dropped in it) for what you saw, the note box's x if it no longer applies;  Send hands them to the
session listening (epic inbox apply seo).  Start testing, first, has Claude prepare them:  the open tests checked
where Claude can, the rest written out (epic details seo#M3 --step ... --prepared 1), then the first one opens.

Examples:
  epic test seo                   the page in the Review tab, Start testing pressed (?test=1)
  epic test seo#M3                ... landing on M3
  epic test seo --list [--json]   its open tests, in your order:  prepared first, then page order, Not now last
  epic test --all [--list]        every epic with open tests, in your saga order;  the first one opened,
                                  its Manual tests section linking the next once all are answered`

/** After `epic inbox --help`. */
const INBOX_HELP = `
The inbox's own verb first, then the epic:  epic inbox wait seo, epic inbox done seo#J3.

Examples:
  epic inbox seo                  what you sent from the page:  requests, marks, comments
  epic inbox watch seo            this session waits on the inbox (the page says someone's reviewing);  ignore:  stopped
  epic inbox wait seo             block until there's work, print it, exit 0 (run it in the background)
  epic inbox apply seo [ids...]   apply the sent approve / pick / todo marks and test answers;  --all:  sent or not
  epic inbox working seo#J3 on    the page's spinner on an item (or a comment, seo#C3);  off:  stopped
  epic inbox status seo "Responding" --items q3,c2   the toolbar's line:  what the session is doing;  --clear:  idle
  epic inbox done seo#J3          an agent finished the item:  its mark and spinner go
  epic inbox clear seo#J3         drop its marks (a revisit talked over)`
