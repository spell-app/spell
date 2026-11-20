import chalk from "chalk"

import { CLI } from "spell/cli"
import { Runbook, RunbookProgress, Runbooks, RunbookWalk } from "spell/cli/runbook"

/**
 * `spell runbook start | status | reset | list | check`:  a runbook walked, and looked after (epic `epic-engine` P78).
 * The work:  `spell/cli/runbook`.
 * - `start <name>`:  walks it from the first step not done
 * - `status <name>`:  each step, done or not, and when the walk started and expires
 * - `reset <name>`:  forgets the walk, so the next start begins at step 1;  the secrets typed stay, offered again
 * - `list`:  every runbook found, with how far its walk got
 * - `check [names...]`:  each runbook read, its mistakes said;  none named:  every one.  Exits 1 on a mistake
 * - A name finds its file (`Runbooks.find()`);  a path works too.
 * - throws `CliError` for an unknown verb, a runbook that isn't there, or one with mistakes (but `check`)
 */
export async function runbookCommand(verb: string, names: string[]): Promise<number> {
  const runbooks = new Runbooks()
  if (verb === "list") return list(runbooks)
  if (verb === "check") return check(runbooks, names)
  const [name, ...rest] = names
  if (!name || rest.length) throw new CLI.CliError(`spell runbook ${verb} takes one runbook:  its name, or its file`)
  const walk = new RunbookWalk(read(runbooks.find(name)))
  if (verb === "start") return walk.start()
  if (verb === "status") {
    CLI.out(walk.statusLines().join("\n"))
    return CLI.EXIT.OK
  }
  if (verb === "reset") {
    CLI.out(
      walk.reset()
        ? `Forgot how far you'd got.  The next start begins at step 1:  spell runbook start ${walk.runbook.name}`
        : `There was nothing to forget:  ${walk.runbook.name} wasn't started.`
    )
    return CLI.EXIT.OK
  }
  throw new CLI.CliError(`unknown verb '${verb}':  start, status, reset, list, check`)
}

/** Every runbook found:  its name, its title, how far its walk got. */
function list(runbooks: Runbooks): number {
  const files = runbooks.files()
  if (!files.length) {
    CLI.out("No runbooks here yet.  A runbook is a file named <name>.runbook.md, in a runbooks/ folder.")
    return CLI.EXIT.OK
  }
  const progress = new RunbookProgress()
  for (const file of files) {
    const name = Runbook.nameOf(file)
    let title: string
    let steps: number | undefined
    try {
      const runbook = Runbook.read(file)
      title = runbook.title
      steps = runbook.steps.length
    } catch {
      title = chalk.red("has mistakes:  spell runbook check " + name)
    }
    const done = Object.keys(progress.read(name)?.steps ?? {}).length
    const far = steps === undefined ? "" : done ? `  ${done} of ${steps} steps done` : `  ${steps} steps`
    CLI.out(`${chalk.bold(name)}  ${title}${chalk.gray(far)}\n  ${chalk.gray(CLI.relativePath(file))}`)
  }
  return CLI.EXIT.OK
}

/** Each runbook named, else every one, read:  `EXIT.ERRORS` when any has a mistake. */
function check(runbooks: Runbooks, names: string[]): number {
  const files = names.length ? names.map((name) => runbooks.find(name)) : runbooks.files()
  let wrong = 0
  for (const file of files) {
    try {
      const runbook = Runbook.read(file)
      CLI.out(`${chalk.green("✓")} ${runbook.name}:  ${runbook.steps.length} steps`)
    } catch (error) {
      wrong++
      CLI.out(`${chalk.red("✗")} ${(error as Error).message}`)
    }
  }
  if (!files.length) CLI.out("No runbooks to check.")
  return wrong ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The runbook at `file`, read.  - throws `CliError` naming its mistakes */
function read(file: string): Runbook {
  try {
    return Runbook.read(file)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CLI.CliError(`${error.message}\nFix them, then try again.  spell runbook check says them too.`)
    }
    throw error
  }
}
