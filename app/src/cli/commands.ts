/**
 * spell-app's `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):
 * - `spell app create <name>`:  a new spell project, in your space
 * - `spell app serve [project]`:  the editor and its page server, opened in a browser
 * - `spell app preview build | serve`:  the editor's static build, the public preview -- written, then shown as a host would
 * - `spell app vscode [build|install]`:  the VS Code extension
 * - `spell projects [group]`:  the project groups, or one group's projects
 * - `spell content check [--bless]`:  every check of the `@spell` space's content, its examples, notebooks and
 *   Spell guides (epic `content` P2)
 * - `spell content compare [--against <ref>]`:  what a language change did to every project's output (epic `language` P1)
 * - `spell content update [--json] [--done [--always <id> ...]]`:  what the parser and Spell UI learned since the
 *   last content update (epic `content` P3)
 * - Under `app` on purpose (Owen's names, 2026-10-21), not only on a clash as Q33 has it.
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
function contentCompareCommand(options: { against?: string }): Promise<never> {
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
