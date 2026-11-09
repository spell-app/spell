/**
 * spell-app's `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):
 * - `spell app create <name>`:  a new spell project, in your space
 * - `spell app serve [project]`:  the editor and its page server, opened in a browser
 * - `spell app preview build | serve`:  the editor's static build, the public preview -- written, then shown as a host would
 * - `spell app changes wait | done | list`:  the changes people ask for in the editor, for a Claude session (epic `editor` P18)
 * - `spell space takedown hide | delete | restore | list <target>`:
 *   Spell taking down a record, a space or an account, for Spell's admins,
 *   with a reason in a log beside it (epic `atmosphere` P6)
 * - `spell space backup now | list | status | restore <space>`:  every space's nightly backups (epic `atmosphere` P7)
 * - `spell space cloud serve | status | invite | mail | service`:  Spell's server for people outside this machine,
 *   the cloud a program's `... is saved in the cloud` keeps its things in (epic `atmosphere` P8)
 * - `spell space local setup | start | mail | sign-in`:  the cloud at real-looking addresses, for one house network
 *   (epic `atmosphere` T57)
 * - `spell space org host start | stop`:  Spell's own Spaces host on this machine, with two throwaway accounts,
 *   for the Spaces trial to run against (epic `atmosphere` P13)
 * - `spell space org create <org> --name "RS" --admin ana@example.org [--team "Events Team"]`:
 *   an org set up on Spell's own server in one go, its Admin space, first Admins and spaces;
 *   run again, it doubles nothing (epic `atmosphere` P35)
 * - `spell space org codes <org> [holders...]`, `spell space org recover <org> --part ... --board ...`:
 *   an org's recovery codes, and its Board taking it back with them (epic `atmosphere` P21)
 * - `spell space org leave <org> <who> [--to <space>]`:  someone leaving it,
 *   their own space there offered to them (epic `atmosphere` P28)
 * - `spell space org audit <org>`:  every space of the org whose member list differs from its roles,
 *   and how (epic `atmosphere` P24)
 * - `spell space lexicon read <lexicon> | publish <project>`:
 *   Lexicons, AT Protocol's schema language, both ways (epic `atmosphere` P10)
 *   - another app's read in as a Spell type
 *   - a library's published types as schema records
 * - `spell space export <space> <folder>`:  a space as a folder of plain JSON, leaving Spell (epic `atmosphere` P7)
 * - `spell space delete <space | account> --yes`:  a space, or an account, deleted for good (epic `atmosphere` P7)
 * - `spell app vscode [build|install]`:  the VS Code extension
 * - `spell projects [group]`:  the project groups, or one group's projects
 * - `spell content check [--bless]`:  every check of the `@spell` space's content, its examples, notebooks and
 *   Spell guides (epic `content` P2)
 * - `spell content compare [--against <ref>] [--target <name>]`:  what a language change did to every project's output (epic `language` P1)
 * - `spell content update [--json] [--done [--always <id> ...]]`:  what the parser and Spell UI learned since the
 *   last content update (epic `content` P3)
 * - Under `app` on purpose (Owen's names, 2026-10-21), not only on a clash as Q33 has it.
 * - Spell's hosting is its own noun, `spell space` (Owen, 2026-11-06, epic `atmosphere` P14):
 *   takedown, backup, cloud, org, lexicon, export, delete.
 * - The language commands are spell-parser's list;  their work comes from here, through `hooks.ts`.
 * - Loads fast:  nothing of spell until a command runs.
 * - NOTE: `spell commands` reads this file's TEXT, for each `spell.command(...)` and `<group>.command(...)` call:
 *   keep each command's name a literal at its call.
 */
import type { Command } from "commander"

import { CLI } from "spell/cli"
import { checkProjectName } from "spell/app/cli/cli.types"
import { loadApp } from "./hooks"

export default function appCommands(spell: Command): void {
  const app = spell
    .command("app")
    .description("the spell app:  a new project, the editor, its static build, the VS Code extension")

  app
    .command("create")
    .description("make a spell project:  <name>/__project.json5 and a starter <name>.spell")
    .argument("<name>", "the project's name, e.g. Snake")
    .option("--in <folder>", "make it in this folder -- default owen@spell's, your space in spell.spaces")
    .action((name: string, _options, command: Command) =>
      CLI.runCommand(async () => {
        checkProjectName(name)
        return (await loadApp()).appCommands.create([name], command.optsWithGlobals())
      })
    )

  app
    .command("serve")
    .description("run the spell app -- editor and server, which saves to disk -- and open it, until Ctrl-C")
    .argument(
      "[project]",
      "open the editor on this, e.g. @spell/examples/Solitaire -- default the project here, else the chooser"
    )
    .option(
      "--port <port>",
      "the editor's port, for a page server this starts -- default 3000, else any free one",
      (value) => Number(value)
    )
    .option("--headless", "don't open a browser:  just print the URL")
    .action((project: string | undefined, _options, command: Command) =>
      CLI.runCommand(async () =>
        (await loadApp()).appCommands.serve(project ? [project] : [], command.optsWithGlobals())
      )
    )

  const changes = app
    .command("changes")
    .description("the changes people ask for in the editor (select, right click, Change This), for a Claude session")

  changes
    .command("wait")
    .description("listen until a request comes, then print it:  exit 2 at the timeout")
    .option("--timeout <seconds>", "how long to wait -- default an hour", (value) => Number(value))
    .action((_options, command: Command) => runChanges(["wait"], command))

  changes
    .command("done")
    .description("a request is finished:  the editor shows the new files and this line")
    .argument("<id>", "the request, c3")
    .argument("[summary...]", "what changed, in a few plain words;  or, with --failed, why it couldn't")
    .option("--failed", "it couldn't be done")
    .action((id: string, summary: string[], _options, command: Command) =>
      runChanges(["done", id, ...summary], command)
    )

  changes
    .command("list")
    .description("every request kept")
    .action((_options, command: Command) => runChanges(["list"], command))

  const preview = app
    .command("preview")
    .description("the editor's static build, the public preview:  plain files, edits kept in the visitor's browser")

  preview
    .command("build")
    .description("build it into app/dist-static/:  the editor, the examples and guides compiled, their lists")
    .action((_options, command: Command) =>
      CLI.runCommand(async () => (await loadApp()).appCommands.preview(["build"], command.optsWithGlobals()))
    )

  preview
    .command("serve")
    .description("show the build as a host would, with no page server, and open it, until Ctrl-C")
    .option("--port <port>", "its port -- default 4848, else any free one", (value) => Number(value))
    .option("--headless", "don't open a browser:  just print the URL")
    .action((_options, command: Command) =>
      CLI.runCommand(async () => (await loadApp()).appCommands.preview(["serve"], command.optsWithGlobals()))
    )

  const vscode = app
    .command("vscode")
    .description("the VS Code extension:  build its .vsix, install it into VS Code -- no verb does both")
    .option("--force", "build or install even from a branch behind main (which downgrades every window)")
    .action((options: { force?: boolean }) => vscodeCommand(undefined, options))

  vscode
    .command("build")
    .description("build the extension's .vsix")
    .option("--force", "even from a branch behind main")
    .action((_options, command: Command) => vscodeCommand("build", command.optsWithGlobals()))

  vscode
    .command("install")
    .description("install the built .vsix into VS Code")
    .option("--force", "even from a branch behind main")
    .action((_options, command: Command) => vscodeCommand("install", command.optsWithGlobals()))

  spell
    .command("projects")
    .description("list the project groups -- or, given one, the projects in it")
    .argument("[group]", "a project group, e.g. @spell/library or owen@spell")
    .option("--json", "print the list as JSON")
    .action((group: string | undefined, _options, command: Command) =>
      CLI.runCommand(async () =>
        (await loadApp()).appCommands.projects(group ? [group] : [], command.optsWithGlobals())
      )
    )

  // Spell's hosting:  its own noun, apart from the app (Owen, 2026-11-06, epic `atmosphere` P14)
  const space = spell
    .command("space")
    .description("Spell's hosting:  spaces, orgs, the cloud, takedowns, backups and lexicons")

  const takedown = space
    .command("takedown")
    .description("for Spell's admins:  take down a record, a space or an account, or put it back, with a reason logged")

  takedown
    .command("hide")
    .description("neither read nor written, through Spell's server or read direct;  its files stay")
    .argument(
      "<target>",
      "a space's folder, @family/cookbook (with --record, one thing of it), or an account, ana@spell"
    )
    .option("--record <collection/id>", "one thing of the space, e.g. recipes/r-1")
    .requiredOption("--reason <words>", 'why, for the log, e.g. "doxxing:  a stranger\'s home address"')
    .action((target: string, _options, command: Command) => runTakedown("hide", target, command))

  takedown
    .command("delete")
    .description("hidden, and its files removed:  a record's file, or every thing of a space;  not an account")
    .argument("<target>", "a space's folder, @family/cookbook (with --record, one thing of it)")
    .option("--record <collection/id>", "one thing of the space, e.g. recipes/r-1")
    .requiredOption("--reason <words>", "why, for the log")
    .action((target: string, _options, command: Command) => runTakedown("delete", target, command))

  takedown
    .command("restore")
    .description("put it back as it was, what wasn't deleted")
    .argument(
      "<target>",
      "a space's folder, @family/cookbook (with --record, one thing of it), or an account, ana@spell"
    )
    .option("--record <collection/id>", "one thing of the space, e.g. recipes/r-1")
    .requiredOption("--reason <words>", "why, for the log")
    .action((target: string, _options, command: Command) => runTakedown("restore", target, command))

  takedown
    .command("list")
    .description("the takedowns logged in a space's folder, or an account's, oldest first")
    .argument("<target>", "a space's folder, @family/cookbook, or an account, ana@spell")
    .action((target: string, _options, command: Command) => runTakedown("list", target, command))

  const backup = space
    .command("backup")
    .description("every space's nightly backups, on this machine:  a week kept (SPELL_BACKUPS_DIR:  where)")

  backup
    .command("now")
    .description("back up every space now;  the oldest past a week goes")
    .action((_options, command: Command) => runBackup("now", undefined, command))

  backup
    .command("list")
    .description("every backup, newest first")
    .action((_options, command: Command) => runBackup("list", undefined, command))

  backup
    .command("status")
    .description("where they go, the newest, and any night missed;  exits 1 for a missed night")
    .action((_options, command: Command) => runBackup("status", undefined, command))

  backup
    .command("restore")
    .description("bring one space back as a backup had it, over what's there now")
    .argument("<space>", "a space's folder, @family/cookbook, or a person's whole space, ana@spell")
    .option("--from <backup>", "which backup, by its name (spell space backup list);  default the newest")
    .action((space: string, _options, command: Command) => runBackup("restore", space, command))

  const cloud = space
    .command("cloud")
    .description("Spell's server for people outside this machine:  the cloud programs save in, invite only")

  cloud
    .command("serve")
    .description("run it on this machine, for whatever gives it its address (a tunnel, a proxy), until Ctrl-C")
    .option(
      "--address <url>",
      "where people reach it, e.g. https://spell.example.org;  give more than one for more addresses, the first its main one, a sign-in at each its own -- default this machine only",
      collect,
      []
    )
    .option("--port <port>", "its port on this machine -- default 4949", (value) => Number(value))
    .action((_options, command: Command) => runCloud("serve", undefined, command))

  cloud
    .command("status")
    .description("is it running, where, and its backups;  exits 1 when it isn't, or a night was missed")
    .action((_options, command: Command) => runCloud("status", undefined, command))

  cloud
    .command("invite")
    .description("make an account for an email, and send its mail:  the running cloud's own invite")
    .argument("<email>", "whose, e.g. ana@example.com")
    .action((email: string, _options, command: Command) => runCloud("invite", email, command))

  cloud
    .command("mail")
    .description("the newest mail it caught, with its link and code:  until a mail service is picked")
    .argument("[email]", "only theirs, e.g. ana@example.com")
    .action((email: string | undefined, _options, command: Command) => runCloud("mail", email, command))

  cloud
    .command("service")
    .description("print the file that starts it with this machine, and again if it stops:  launchd's, or systemd's")
    .option("--address <url>", "where people reach it, e.g. https://spell.example.org;  give one or more", collect, [])
    .option("--port <port>", "its port on this machine -- default 4949", (value) => Number(value))
    .action((_options, command: Command) => runCloud("service", undefined, command))

  const local = space
    .command("local")
    .description("Spell's cloud at real-looking addresses, for one house network, on a Mac:  nothing public changes")

  local
    .command("setup")
    .description("this Mac's certificate, names and trust, and a folder to set up another Mac with")
    .option(
      "--address <url>",
      "where it's reached;  give one or more -- default https://test.spell.app and .space",
      collect,
      []
    )
    .option("--undo", "take the names away again")
    .action((_options, command: Command) => runLocal("setup", [], command))

  local
    .command("start")
    .description(
      "run the site in this terminal, to watch it, until Ctrl-C:  the page server runs it by itself once `setup` has run"
    )
    .option("--address <url>", "where it's reached;  each needs `setup` -- default what `setup` made", collect, [])
    .action((_options, command: Command) => runLocal("start", [], command))

  local
    .command("mail")
    .description("send real mail from this Mac:  its postfix relays through Gmail, with a Gmail app password")
    .option("--gmail <address>", "the Gmail address it sends as -- default this machine's person's email")
    .option("--new-password", "ask for the app password again")
    .action((_options, command: Command) => runLocal("mail", [], command))

  local
    .command("sign-in")
    .description("sign in on the running site:  asks for the link, opens it, then opens the page")
    .argument("[email]", "whose -- default this machine's person's")
    .argument("[page]", "e.g. @rs/OrgAdmin -- default the last one")
    .action((email: string | undefined, page: string | undefined, _options, command: Command) =>
      runLocal(
        "sign-in",
        [email, page].filter((each) => each !== undefined),
        command
      )
    )

  const org = space
    .command("org")
    .description(
      "an org's accounts and spaces:  setting it up, Spell's own Spaces host, its recovery codes, its member lists' audit"
    )

  const host = org
    .command("host")
    .description("Spell's own Spaces host on this machine, with two throwaway accounts:  for the Spaces trial")

  host
    .command("start")
    .description("run it until Ctrl-C, and print how to run the Spaces trial against it;  stopping deletes everything")
    .option("--port <port>", "its accounts' network's port, the host on the next one up -- default 4960", (value) =>
      Number(value)
    )
    .action((_options, command: Command) => runOrg("start", command))

  host
    .command("stop")
    .description("stop the one running:  its accounts, and all they wrote, are gone")
    .action((_options, command: Command) => runOrg("stop", command))

  org
    .command("codes")
    .description(
      "an org's recovery codes:  who holds a part;  with holders, new codes, a part each, shown once to hand over"
    )
    .argument("<org>", "the org, e.g. rs")
    .argument("[holders...]", "who holds a part, by address:  three of its Board, e.g. ana@rs bo@rs cy@rs")
    .option("--needed <n>", "how many parts a recovery takes -- default 2", (value) => Number(value))
    .option("--reason <text>", "why, for the org's log")
    .action((org: string, holders: string[], _options, command: Command) =>
      runOrgRecover("codes", org, holders, command)
    )

  org
    .command("recover")
    .description("take an org back with its recovery codes:  its Board and Admins named anew, the codes spent")
    .argument("<org>", "the org, e.g. rs")
    .option("--part <code>", "a part of its code, as its holder reads it out:  give as many as it takes", collect, [])
    .option("--board <who>", "its new Board, by address:  give one or more", collect, [])
    .option("--admin <who>", "its new Admins, by address -- default none:  the Board names them", collect, [])
    .option("--reason <text>", "why, for the org's log")
    .action((org: string, _options, command: Command) => runOrgRecover("recover", org, [], command))

  org
    .command("audit")
    .description("every space of an org whose member list differs from its roles, and how;  exits 1 if any does")
    .argument("<org>", "the org, e.g. rs")
    .action((org: string) =>
      CLI.runCommand(async () => {
        const { orgAuditCommand } = await import("spell/app/cli/commands/orgAuditCommand")
        return orgAuditCommand(org)
      })
    )

  org
    .command("create")
    .description("set up an org on Spell's own server:  its file, Admin space, first Admins, teams and spaces")
    .argument("<org>", "the org's id, a folder's name, e.g. rs")
    .option("--name <name>", 'what people call it, e.g. "Rock Society" -- default its id')
    .option(
      "--admin <email>",
      "a first Admin, by email:  the first is its first Board too;  give one or more",
      collect,
      []
    )
    .option("--team <name>", 'a standing team, by name, e.g. "Events Team";  give any number', collect, [])
    .action((org: string, _options, command: Command) =>
      CLI.runCommand(async () => {
        const { orgCreateCommand } = await import("spell/app/cli/commands/orgCreateCommand")
        return orgCreateCommand(org, command.optsWithGlobals())
      })
    )

  org
    .command("leave")
    .description("someone leaving an org:  their terms ended, off every list;  their own space there offered to them")
    .argument("<org>", "the org, e.g. rs")
    .argument("<who>", "who's leaving, by address, e.g. ana@rs")
    .option("--to <space>", "copy their own space in the org into another space of theirs, e.g. ana@spell/from-rs")
    .option("--reason <text>", "why, for the org's log")
    .action((org: string, who: string, _options, command: Command) =>
      CLI.runCommand(async () => {
        const { orgLeaveCommand } = await import("spell/app/cli/commands/orgLeaveCommand")
        return orgLeaveCommand(org, who, command.optsWithGlobals())
      })
    )

  const lexicon = space
    .command("lexicon")
    .description(
      "Lexicons, AT Protocol's schema language:  another app's read in as a Spell type, a library's published"
    )

  lexicon
    .command("read")
    .description("another app's Lexicon as a Spell type:  the declaration you'd write, printed or written to a file")
    .argument("<lexicon>", "its file, or its https:// address, e.g. lexicons/xyz.statusphere.status.json")
    .option("--write <file>", "write it into this .spell file instead of printing it")
    .action((from: string, _options, command: Command) =>
      CLI.runCommand(async () => (await loadApp()).appCommands.lexicon(["read", from], command.optsWithGlobals()))
    )

  lexicon
    .command("publish")
    .description(
      "a library's types marked \"- it is published\", each a schema record in the account that holds Spell's schemas"
    )
    .argument("<project>", "the library, compiled, e.g. @spell/library/people")
    .option(
      "--as <handle>",
      "that account, a handle or DID -- default $ATMOSPHERE_HANDLE;  its app password $ATMOSPHERE_APP_PASSWORD"
    )
    .option("--dry-run", "print the Lexicons it would publish:  no sign-in, nothing written")
    .option("--json", "print what it did as JSON")
    .action((project: string, _options, command: Command) =>
      CLI.runCommand(async () => (await loadApp()).appCommands.lexicon(["publish", project], command.optsWithGlobals()))
    )

  space
    .command("export")
    .description("a space as a folder of plain JSON:  a program runs on it with one line changed")
    .argument("<space>", "a space's folder, @family/cookbook")
    .argument("<folder>", "where to write it, e.g. ./my-export")
    .action((space: string, folder: string) =>
      CLI.runCommand(async () => (await import("spell/app/cli/commands/spaceCommand")).exportCommand(space, folder))
    )

  const projection = space
    .command("projection")
    .description("part of a space's data, written into another space:  what it projects, and rebuilding one")
  projection
    .command("list")
    .description("what a space projects, by name:  into which space, which fields")
    .argument("<space>", "the source space's folder, @rs/picnic-private")
    .action((source: string) =>
      CLI.runCommand(async () =>
        (await import("spell/app/cli/commands/spaceCommand")).projectionCommand("list", source)
      )
    )
  projection
    .command("rebuild")
    .description("write a projection again from nothing:  its source's every thing, through its view")
    .argument("<space>", "the source space's folder, @rs/picnic-private")
    .argument("[name]", "which projection, published_sheet:  default every one")
    .action((source: string, name: string | undefined) =>
      CLI.runCommand(async () =>
        (await import("spell/app/cli/commands/spaceCommand")).projectionCommand("rebuild", source, name)
      )
    )

  space
    .command("delete")
    .description("delete a space, or an account, for good:  its managers', or a Spell admin's")
    .argument("<target>", "a space's folder, @family/cookbook, or an account, ana@spell")
    .option("--yes", "yes, for good")
    .action((target: string, _options, command: Command) =>
      CLI.runCommand(async () =>
        (await import("spell/app/cli/commands/spaceCommand")).deleteCommand(target, command.optsWithGlobals())
      )
    )

  const content = spell
    .command("content")
    .description("the @spell space's content:  its examples, notebooks and Spell guides")

  content
    .command("check")
    .description("run every content check:  snapshots, every target's run, spellx, notebooks, README-examples")
    .option("--bless", "rewrite every content snapshot instead, then read the diff")
    .action((_options, command: Command) => contentCheckCommand(command.optsWithGlobals()))

  content
    .command("compare")
    .description("compile every project here and at a commit, then list each change to its output, errors and warnings")
    .option("--against <ref>", "the commit to compare with", "HEAD")
    .option("--target <name>", "the target whose code to compare, e.g. py (default:  the running one, javascript)")
    .action((_options, command: Command) => contentCompareCommand(command.optsWithGlobals()))

  content
    .command("update")
    .description(
      "what the parser and Spell UI learned since the last content update:  commits by epic, new components, grammar"
    )
    .option("--json", "print it as JSON, for the session")
    .option("--done", "record the update's end instead:  the next update starts from here")
    .option("--always <ids...>", "with --done:  upgrade these from now on without asking (component, epic:debut ...)")
    .action((_options, command: Command) => contentUpdateCommand(command.optsWithGlobals()))
}

/** `spell content update`:  loads no spell, only git and the epic tool's files (`contentUpdateCommand.ts`). */
function contentUpdateCommand(options: { json?: boolean; done?: boolean; always?: string[] }): Promise<never> {
  return CLI.runCommand(async () =>
    (await import("spell/app/cli/commands/contentUpdateCommand")).contentUpdateCommand(options)
  )
}

/** `spell content compare`:  loads no spell, each side's child loads its own (`contentCompareCommand.ts`). */
function contentCompareCommand(options: { against?: string; target?: string }): Promise<never> {
  return CLI.runCommand(async () =>
    (await import("spell/app/cli/commands/contentCompareCommand")).contentCompareCommand(options)
  )
}

/** `spell content check`:  loads no spell, its tests load their own (`contentCheckCommand.ts`). */
function contentCheckCommand(options: { bless?: boolean }): Promise<never> {
  return CLI.runCommand(async () =>
    (await import("spell/app/cli/commands/contentCheckCommand")).contentCheckCommand(options)
  )
}

/** `spell app vscode [verb]`:  loads no spell (`vscodeCommand.ts`). */
function vscodeCommand(verb: string | undefined, options: { force?: boolean }): Promise<never> {
  return CLI.runCommand(async () => (await import("spell/app/cli/commands/vscodeCommand")).vscodeCommand(verb, options))
}

/** Run a `spell space backup` verb:  no `loadApp()`, only spaces' node side (`spaceCommand.ts`). */
function runBackup(verb: string, space: string | undefined, command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { backupCommand } = await import("spell/app/cli/commands/spaceCommand")
    return backupCommand(verb, space, command.optsWithGlobals())
  })
}

/** Run a `spell space cloud` verb:  no `loadApp()`, only spaces' node side (`cloudCommand.ts`). */
function runCloud(verb: string, target: string | undefined, command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { cloudCommand } = await import("spell/app/cli/commands/cloudCommand")
    return cloudCommand(verb, target, command.optsWithGlobals())
  })
}

/** Run a `spell space local` verb:  no `loadApp()`, only spaces' node side (`localCommand.ts`). */
function runLocal(verb: string, targets: string[], command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { localCommand } = await import("spell/app/cli/commands/localCommand")
    return localCommand(verb, targets, command.optsWithGlobals())
  })
}

/** Run a `spell space org host` verb:  no `loadApp()`, only spaces' node side (`orgCommand.ts`). */
function runOrg(verb: string, command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { orgCommand } = await import("spell/app/cli/commands/orgCommand")
    return orgCommand(verb, command.optsWithGlobals())
  })
}

/** Run `spell space org codes` or `recover`:  no `loadApp()`, only spaces' node side (`orgRecoverCommand.ts`). */
function runOrgRecover(verb: "codes" | "recover", org: string, holders: string[], command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { orgRecoverCommand } = await import("spell/app/cli/commands/orgRecoverCommand")
    return orgRecoverCommand(verb, org, holders, command.optsWithGlobals())
  })
}

/** A repeated option's values, in order:  `--part a --part b` is `["a", "b"]`. */
function collect(value: string, values: string[]): string[] {
  return [...values, value]
}

/** Run a `spell space takedown` verb:  no `loadApp()`, only spaces' node side (`takedownCommand.ts`). */
function runTakedown(verb: string, target: string, command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { takedownCommand } = await import("spell/app/cli/commands/takedownCommand")
    return takedownCommand(verb, target, command.optsWithGlobals())
  })
}

/** Run a `spell app changes` verb:  no `loadApp()`, since it needs no spell, so a session's wait starts at once. */
function runChanges(args: string[], command: Command): Promise<void> {
  return CLI.runCommand(async () => {
    const { changesCommand } = await import("spell/app/cli/commands/changesCommand")
    return changesCommand(args, command.optsWithGlobals())
  })
}
