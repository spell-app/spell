import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { CLI } from "spell/cli"
import { NameCheck, nameReportLines, PrivateNames } from "spell/cli/commands/names"

/**
 * `spell names check [revisions...] [--push <remote>] [--json]`:  the names on this machine's private list
 * (`~/.spell/private-names`), looked for in what's about to leave it (`NameCheck`;  epic `epic-engine` T153).
 * - revisions (default `HEAD`):  the files there, and every commit behind them not on a remote yet:
 *   its message, the lines it adds, its pictures;  and the branch you're on
 * - `--push <remote>`:  what git's pre-push hook hands it on stdin, a line per ref (`tools/pre-push.ts` runs this)
 * - exits 1 on a hit;  no names on the list:  says so and exits 0
 * - throws `CliError` for another verb, or a list line it can't read
 */
export async function namesCommand(
  verb = "check",
  revisions: string[] = [],
  options: CLI.NamesOptions = {}
): Promise<number> {
  if (verb !== "check") throw new CLI.CliError(`unknown verb '${verb}':  check`)
  let names: PrivateNames
  try {
    names = PrivateNames.load()
  } catch (error) {
    if (error instanceof SyntaxError) throw new CLI.CliError(error.message, CLI.EXIT.ERRORS)
    throw error
  }
  const check = new NameCheck({ names })
  const repo = process.cwd()
  const report = options.push
    ? check.push(repo, readFileSync(0, "utf8"), options.push)
    : check.revisions(repo, {
        tips: revisions.length ? revisions : ["HEAD"],
        exclude: ["--remotes"],
        refs: revisions.length ? [] : [currentBranch(repo)].filter(Boolean)
      })
  if (options.json) CLI.out(JSON.stringify(report, null, 2))
  else for (const line of nameReportLines(report, options.push ? "this push" : "these commits")) CLI.out(line)
  return report.hits.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The branch checked out in `repo`;  `""` when none. */
function currentBranch(repo: string): string {
  const run = spawnSync("git", ["symbolic-ref", "-q", "HEAD"], { cwd: repo, encoding: "utf8" })
  return run.status === 0 ? run.stdout.trim() : ""
}
