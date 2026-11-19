import { relative } from "node:path"

import { CLI, type AgentRuleId, type AgentRulePicks } from "spell/cli"

/**
 * `spell wwod [check | init] ...`:  WWOD, the agents' rules (epic `wwod`).
 * - `check` (the default):  every `WWOD §N › "title"` citation and backticked repo path in WWOD,
 *   `AGENTS.md`, `CLAUDE.md` and the skills;  exits 1 on a broken one.  The logic:  `wwod.ts`.
 *   - Which checkout:  the nearest repo from the current folder up (its `tsconfig.base.json`):  each big folder has
 *     WWOD through its `agents` link.
 * - `init`:  a project picks which of the rules the `spell` package ships its agents read, written into its
 *   `CLAUDE.md` and `AGENTS.md` (epic `repo-split` T66;  `wwodInit()`).  The logic:  `wwodInit.ts`.
 * - Each verb's file is imported when it runs:  `init` runs in the lean npm install, which `check`'s imports aren't.
 * - Throws `CliError` for another verb.
 */
export async function wwodCommand(
  verb = "check",
  files: string[] = [],
  options: CLI.WwodOptions = {}
): Promise<number> {
  if (verb === "init") {
    if (files.length) throw new CLI.CliError(`spell wwod init takes no files:  run it in the project's folder`)
    return wwodInit(options)
  }
  if (verb !== "check") throw new CLI.CliError(`unknown verb '${verb}':  check, init`)
  const { agentRulesLines, checkAgentRules } = await import("spell/cli/commands/wwod")
  const report = checkAgentRules(CLI.findCheckout("tsconfig.base.json"), files)
  if (options.json) CLI.out(JSON.stringify(report, null, 2))
  else for (const line of agentRulesLines(report)) CLI.out(line)
  return report.problems.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/**
 * `spell wwod init`:  ask which rules the project wants, then write them in.
 * - the project:  the nearest folder from `from` up with a `package.json`, else `from`;
 *   in a workspace, its root or that nearer folder (`projectFor()`)
 * - each rule's answer:  its flag;  else, with `--yes` or no terminal, what the project has, else its default;
 *   else asked, suggesting the same
 * - the defaults:  WWOD on;  the Solid 2 rules on when the project depends on `solid-js`;  §21 OFF, since many
 *   projects write tests first, and asked only when WWOD is on
 * - throws `CliError` when `spell` isn't installed in the project:  the rules are files of the package
 */
export async function wwodInit(options: CLI.WwodOptions = {}, from = process.cwd()): Promise<number> {
  const init = await import("spell/cli/commands/wwodInit")
  const nearest = CLI.findCheckout("package.json", from, from)
  const workspaceRoot = init.workspaceRootFor(nearest)
  const project = await projectFor(nearest, workspaceRoot, options)
  const folder = init.rulesFolderFor(project)
  if (!folder)
    throw new CLI.CliError(
      [
        "The rules come with the spell package, which this project hasn't installed.",
        `Install it, then run this again:  npm install --save-dev spell@${CLI.PUBLISH_TAG}`
      ].join("\n")
    )
  const current = init.currentAgentRules(project, folder)
  const hasRules = Object.values(current).some(Boolean)
  const flags: Record<AgentRuleId, boolean | undefined> = {
    wwod: options.wwod,
    solid: options.solid,
    "code-is-the-spec": options.codeIsTheSpec
  }
  const suggested: AgentRulePicks = hasRules
    ? current
    : { wwod: true, solid: init.usesSolid(project), "code-is-the-spec": false }
  const picks = { ...suggested }
  for (const id of CLI.AGENT_RULE_IDS) {
    if (flags[id] !== undefined) picks[id] = flags[id]
    else if (id === "code-is-the-spec" && !picks.wwod) picks[id] = false
    else if (!options.yes)
      picks[id] = (await CLI.choose(QUESTIONS[id], YES_NO, { suggestion: String(picks[id]) })) === "true"
  }
  const changes = init.planAgentRules(project, picks, folder)
  if (!options.dryRun) init.writeAgentRules(project, changes)
  if (options.json) {
    const report = { project, workspaceRoot, folder, picks, dryRun: Boolean(options.dryRun), changes }
    CLI.out(JSON.stringify(report, null, 2))
    return CLI.EXIT.OK
  }
  if (workspaceRoot) CLI.out(whichFolderLine(project, nearest, workspaceRoot))
  for (const line of init.agentRuleChangeLines(changes, { dryRun: options.dryRun })) CLI.out(line)
  return CLI.EXIT.OK
}

/**
 * Which folder `init` writes in, when `nearest` (the nearest with a `package.json`) is in a workspace:
 * its root (`workspaceRoot`), or `nearest` itself.
 * - `--here`:  `nearest`;  `--yes`, or no terminal:  the root;  else asked, suggesting the root
 * - no workspace:  `nearest`
 */
async function projectFor(
  nearest: string,
  workspaceRoot: string | undefined,
  options: CLI.WwodOptions
): Promise<string> {
  if (!workspaceRoot || options.here) return nearest
  if (options.yes) return workspaceRoot
  return CLI.choose(
    "This folder is part of a workspace.  Which folder's agents should get the rules?",
    [
      { value: workspaceRoot, label: shown(workspaceRoot), hint: "the workspace's root:  every folder in it" },
      { value: nearest, label: shown(nearest), hint: "only this folder (--here)" }
    ],
    { suggestion: workspaceRoot }
  )
}

/** `folder` as a person typing in this one would:  `../..`, `.` for this one. */
function shown(folder: string): string {
  return relative(process.cwd(), folder) || "."
}

/** The report's first line, in a workspace:  which folder it wrote in, and the other it could have. */
function whichFolderLine(project: string, nearest: string, workspaceRoot: string): string {
  return project === workspaceRoot
    ? `In ${shown(project)}, the workspace's root  (--here:  only ${shown(nearest)})`
    : `In ${shown(project)}, not the workspace's root, ${shown(workspaceRoot)}`
}

/** `init`'s question for each rule. */
const QUESTIONS: Record<AgentRuleId, string> = {
  wwod: "Should your coding agents follow WWOD, Spell's house style?",
  solid: "Should they follow the Solid 2 rules?  Say yes if this project uses Solid 2.",
  "code-is-the-spec":
    "Should they treat the code as the spec, and rewrite a test to match it?  Say no if you write tests first."
}

/** The answers to each question. */
const YES_NO: CLI.Choice[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" }
]
