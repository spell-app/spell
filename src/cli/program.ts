import chalk from "chalk"
import { Command } from "commander"

import { CLI } from "spell/cli"

/**
 * The `spell` program itself:  its global flags, every repo's commands under one roof, and `spell help`.
 * - Each repo adds its commands to a program of its own (`CommandList`);  `addRepoCommands()` then moves them into
 *   `spell`, by the clash rule (epic `repo-split` Q33):
 *   - a name only one repo has:  at the top level, `spell compile`
 *   - a name two or more repos have:  under EACH one's short name, `spell parser check` and `spell app check`;
 *     the bare word only says where they are
 * - `spell help` lists them grouped by repo, lowest first.
 */

/** The `spell` program, with the flags every command takes, before any repo's commands. */
export function spellProgram(): Command {
  return new Command("spell")
    .description("Spell's command line:  every installed repo's commands, under one name.")
    .option("--all", "a group of projects, e.g. @spell/library, means ALL its projects")
    .option("--verbose", "show a command's own logging, on stderr")
    .showHelpAfterError("(spell help lists the commands)")
}

/**
 * Move every command each of `lists` adds into `program`, by the clash rule (above);  `program`'s help groups them
 * by repo.
 * - Pure but for `program`:  loads nothing (`commandLists()` loaded the lists).
 * - Returns each clashing name, with the repos that have it.
 */
export function addRepoCommands(
  program: Command,
  lists: Array<[CLI.SpellRepo, CLI.CommandList]>
): Map<string, CLI.SpellRepo[]> {
  const byRepo = lists.map(([repo, list]) => {
    const own = new Command(repo.name)
    list(own)
    return { repo, commands: [...own.commands] }
  })
  const owners = new Map<string, CLI.SpellRepo[]>()
  for (const { repo, commands } of byRepo) {
    for (const command of commands) owners.set(command.name(), [...(owners.get(command.name()) ?? []), repo])
  }
  const clashes = new Map([...owners].filter(([, repos]) => repos.length > 1))

  for (const { repo, commands } of byRepo) {
    const heading = `${repo.name}:`
    for (const command of commands) {
      if (!clashes.has(command.name())) {
        program.addCommand(command.helpGroup(heading))
        continue
      }
      // under the repo's own word:  `spell parser check`;  in its group when it has one already (`spell app ...`)
      groupFor(program, byRepo, repo, heading).addCommand(command)
    }
  }
  for (const [name, repos] of clashes) {
    const spellings = repos.map((repo) => `spell ${repo.short} ${name}`)
    program
      .command(name, { hidden: true })
      .allowUnknownOption()
      .helpOption(false)
      .argument("[args...]")
      .action(() => {
        process.stderr.write(chalk.red(`"${name}" is in ${repos.length} repos:  ${spellings.join(", or ")}\n`))
        process.exit(CLI.EXIT.USAGE)
      })
  }
  return clashes
}

/**
 * The command `repo`'s clashing commands go under, `spell <short> ...`:  the one it added itself by that word, else
 * a new one in `program`.
 */
function groupFor(
  program: Command,
  byRepo: { repo: CLI.SpellRepo; commands: Command[] }[],
  repo: CLI.SpellRepo,
  heading: string
): Command {
  const own = byRepo.find((each) => each.repo === repo)!.commands.find((command) => command.name() === repo.short)
  const found = own ?? program.commands.find((command) => command.name() === repo.short)
  if (found) return found
  return program
    .command(repo.short)
    .description(`${repo.name}'s commands whose names another repo has too`)
    .helpGroup(heading)
}

/**
 * Add `spell help [command...]` to `program`:  our own, not commander's, so an unknown command is a mistake, not a
 * reason to print the general help.
 * - `spell help server start`:  a sub-command's help too.
 */
export function addHelp(program: Command): void {
  program.helpCommand(false)
  program
    .command("help")
    .description("show help -- for one command, e.g. spell help compile, spell help server start")
    .argument("[command...]", "the command to show help for")
    .helpGroup("spell:")
    .action((names: string[]) => {
      let command: Command | undefined = program
      for (const name of names) command = command?.commands.find((each) => each.name() === name)
      if (!command) {
        process.stderr.write(chalk.red(`No command '${names.join(" ")}' -- \`spell help\` lists them\n`))
        process.exit(CLI.EXIT.USAGE)
      }
      command.outputHelp()
    })
}
