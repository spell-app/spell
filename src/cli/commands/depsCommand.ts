import { CLI } from "spell/cli"
import { DependencyCheck, DependencyCheckUnavailable, repoFindings } from "spell/cli/commands/deps"

/**
 * `spell deps check [--json]`:  the lockfile against the rules, in `DependencyCheck` (epic `epic-engine` P67).
 * - exits 1 on a deprecated package, a critical or high advisory that isn't on the known-open list, or a stale entry
 * - no registry:  says so and exits 0, since the check couldn't run;  a push isn't held up by the network
 * - Throws `CliError` for another verb.
 */
export async function depsCommand(verb = "check", options: CLI.DepsOptions = {}): Promise<number> {
  if (verb !== "check") throw new CLI.CliError(`unknown verb '${verb}':  check`)
  const kit = CLI.findCheckout(CLI.KIT_MARKER)
  try {
    const report = DependencyCheck.forKit(kit).report("repo", repoFindings(kit))
    if (options.json) CLI.out(JSON.stringify(report, null, 2))
    else for (const line of depsLines(report)) CLI.out(line)
    return report.problems.length || report.stale.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
  } catch (error) {
    if (!(error instanceof DependencyCheckUnavailable)) throw error
    CLI.err(`spell deps check:  couldn't run, so nothing was checked:  ${error.message}`)
    return CLI.EXIT.OK
  }
}

/** A report, for a person. */
function depsLines(report: ReturnType<DependencyCheck["report"]>): string[] {
  const summary =
    `${report.surface}:  ${report.problems.length} to fix, ${report.stale.length} stale, ` +
    `${report.knownOpen} known-open;  ${report.advisories} advisories, ${report.deprecated} deprecated in all`
  return [
    summary,
    ...report.problems.map((problem) => `  FIX    ${problem}`),
    ...report.stale.map((entry) => `  STALE  ${entry}  (no longer found:  take it off the known-open list)`)
  ]
}
