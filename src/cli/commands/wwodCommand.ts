import { CLI } from "spell-kit/cli"
import { agentRulesLines, checkAgentRules } from "spell-kit/cli/commands/wwod"

/**
 * `spell wwod [check] [files...] [--json]`:  WWOD, the agents' rules (epic `wwod`).  The logic:  `wwod.ts`.
 * - `check` (the only verb, and the default):  every `WWOD §N › "title"` citation and backticked repo path in WWOD,
 *   `AGENTS.md`, `CLAUDE.md` and the skills;  exits 1 on a broken one
 * - Which checkout:  the nearest repo from the current folder up (its `tsconfig.base.json`):  each child repo has
 *   WWOD through its `agents` link.
 * - Throws `CliError` for another verb.
 */
export async function wwodCommand(
  verb = "check",
  files: string[] = [],
  options: CLI.WwodOptions = {}
): Promise<number> {
  if (verb !== "check") throw new CLI.CliError(`unknown verb '${verb}':  check`)
  const report = checkAgentRules(CLI.findCheckout("tsconfig.base.json"), files)
  if (options.json) CLI.out(JSON.stringify(report, null, 2))
  else for (const line of agentRulesLines(report)) CLI.out(line)
  return report.problems.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}
