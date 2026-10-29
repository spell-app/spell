import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { CLI } from "spell/cli"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"

/****************
 * ### `SkillsCheck`
 * `epic skills check [--json]`:  the epic plugin's skills hold true for BOTH agents, Claude Code and Codex
 * (epic `epic-friend` P12, J29):  ONE copy of each skill, read by both, so this keeps the copy honest.
 *
 * It fails:
 * - a step that names a Claude-only tool (`CLAUDE_ONLY_TOOLS`:  the question modal, the agent tool, the worktree
 *   tools, plan mode ...) with no `In Codex:` line within `NEAR` lines of it, saying what Codex does instead
 * - a skill naming `${CLAUDE_PLUGIN_ROOT}` with no line saying what that folder is in Codex, which fills nothing in:
 *   a line naming both it and `epic guide --root`, which prints it
 * - a Claude-only skill (its first lines say `In Codex:  Claude Code only`) without its Codex settings file,
 *   `agents/openai.yaml`, turning off `policy.allow_implicit_invocation`, so Codex never picks it by itself;
 *   or such a file on a skill that doesn't say so
 * - a front matter whose `name` isn't its folder's, or a description over `DESCRIPTION_LIMIT` characters
 * - the descriptions Codex lists over `LIST_BUDGET` characters, all told:  Codex cuts them past it
 *
 * - A Claude-only skill's own steps aren't checked one by one:  its first line says it all.
 * - SEE:  https://learn.chatgpt.com/docs/build-skills (the skill format, `agents/openai.yaml`, the list's budget)
 * - The epic folder's tests run it over the real skills (`SkillsCheck.test.ts`):  `yarn review` fails on a problem.
 * - Throws `EpicCommandError` for an unknown verb.
 ****************/
export class SkillsCheck {
  /** the skills folder:  the plugin's `skills/` */
  readonly folder: string

  constructor({ folder = SKILLS_FOLDER }: { folder?: string } = {}) {
    this.folder = folder
  }

  /** Run `epic skills <args>`;  resolves to the exit code:  1 with any problem. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["json"])
    const [verb] = positional
    if (verb !== "check") throw new EpicCommandError(`unknown verb '${verb ?? ""}':  epic skills check`)
    const report = this.check()
    if (flags.json) CLI.out(JSON.stringify(report, null, 2))
    else for (const line of SkillsCheck.lines(report)) CLI.out(line)
    return report.problems.length ? EXIT.ERRORS : EXIT.OK
  }

  /** Every skill in the folder, checked;  what's wrong, if anything. */
  check(): SkillsReport {
    const skills: SkillSummary[] = []
    const problems: SkillProblem[] = []
    for (const name of this.names()) {
      const folder = join(this.folder, name)
      const text = readFileSync(join(folder, "SKILL.md"), "utf8")
      const settings = join(folder, "agents", "openai.yaml")
      const found = SkillsCheck.problemsIn(
        name,
        text,
        existsSync(settings) ? readFileSync(settings, "utf8") : undefined
      )
      skills.push(found.summary)
      problems.push(...found.problems)
    }
    const used = skills
      .filter((skill) => skill.agents === "both")
      .reduce((sum, skill) => sum + skill.name.length + skill.description.length, 0)
    if (used > LIST_BUDGET)
      problems.push({
        skill: "*",
        message: `the descriptions Codex lists come to ${used} characters, over its ${LIST_BUDGET}:  shorten some`
      })
    return { folder: this.folder, skills, problems, budget: { used, limit: LIST_BUDGET } }
  }

  /** The skills' folder names, sorted:  each folder holding a `SKILL.md`. */
  private names(): string[] {
    return readdirSync(this.folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(this.folder, entry.name, "SKILL.md")))
      .map((entry) => entry.name)
      .sort()
  }

  /**
   * One skill's problems:  `text` its `SKILL.md`, `settings` its `agents/openai.yaml` (none:  `undefined`).
   * - pure:  a test hands in a made-up skill
   */
  static problemsIn(
    name: string,
    text: string,
    settings?: string
  ): { summary: SkillSummary; problems: SkillProblem[] } {
    const problems: SkillProblem[] = []
    const say = (message: string, line?: number) => problems.push({ skill: name, message, ...(line && { line }) })
    const [, head = "", body = ""] = FRONT_MATTER.exec(text) ?? []
    const field = (key: string) =>
      head
        .split("\n")
        .find((line) => line.startsWith(`${key}:`))
        ?.slice(key.length + 1)
        .trim() ?? ""
    const description = field("description")
    if (field("name") !== name) say(`its front matter's name is '${field("name")}', not its folder's '${name}'`)
    if (description.length > DESCRIPTION_LIMIT)
      say(`its description is ${description.length} characters, over the skill format's ${DESCRIPTION_LIMIT}`)

    // line numbers in the whole file:  the body starts after the front matter
    const offset = text.slice(0, text.length - body.length).split("\n").length - 1
    const lines = body.split("\n")
    const claudeOnly = lines.slice(0, NOTE_WITHIN).some((line) => CLAUDE_ONLY_NOTE.test(line))
    const picksItself = !settings || !NO_IMPLICIT.test(settings)
    if (claudeOnly && picksItself)
      say("is Claude Code only, but has no agents/openai.yaml with policy.allow_implicit_invocation: false")
    if (!claudeOnly && !picksItself)
      say(
        `turns off Codex's picking it (agents/openai.yaml), but its first lines don't say "In Codex:  Claude Code only"`
      )

    if (!claudeOnly) {
      const codexLines = lines.flatMap((line, at) => (IN_CODEX.test(line) ? [at] : []))
      lines.forEach((line, at) => {
        for (const tool of CLAUDE_ONLY_TOOLS) {
          if (!tool.pattern.test(line)) continue
          if (codexLines.some((codexAt) => Math.abs(codexAt - at) <= NEAR)) continue
          say(`names ${tool.name} with no "In Codex:" line within ${NEAR} lines`, offset + at + 1)
        }
      })
      const pluginRoot = lines.findIndex((line) => line.includes(CLAUDE_PLUGIN_ROOT))
      if (pluginRoot !== -1 && !lines.some((line) => line.includes(CLAUDE_PLUGIN_ROOT) && line.includes(ROOT_COMMAND)))
        say(
          `names ${CLAUDE_PLUGIN_ROOT} with no line saying what it is in Codex (${ROOT_COMMAND})`,
          offset + pluginRoot + 1
        )
    }
    return { summary: { name, agents: claudeOnly ? "claude" : "both", description }, problems }
  }

  /** What `report` says, a line each:  the counts, then every problem. */
  static lines(report: SkillsReport): string[] {
    const both = report.skills.filter((skill) => skill.agents === "both")
    const claude = report.skills.filter((skill) => skill.agents === "claude")
    const head =
      `skills check:  ${report.skills.length} skills, ${both.length} for Claude Code and Codex, ` +
      `${claude.length} Claude Code only (${claude.map((skill) => skill.name).join(", ")});  ` +
      `Codex's list ${report.budget.used} of ${report.budget.limit} characters`
    if (!report.problems.length) return [`${head}:  all good`]
    return [
      `${head}:  ${report.problems.length} problem(s)`,
      ...report.problems.map(
        ({ skill, line, message }) =>
          `  ${skill === "*" ? "skills" : `skills/${skill}/SKILL.md`}${line ? `:${line}` : ""}  ${message}`
      )
    ]
  }
}

/** What `check()` found. */
export type SkillsReport = {
  /** the skills folder checked */
  folder: string
  /** every skill, sorted by name */
  skills: SkillSummary[]
  /** what's wrong;  none:  `[]` */
  problems: SkillProblem[]
  /** the characters Codex's skills list takes (`name` + `description` of each skill it may pick), and its limit */
  budget: { used: number; limit: number }
}

/** One skill, as the check sees it. */
export type SkillSummary = {
  /** its folder's name, and its front matter's:  `epic` */
  name: string
  /** who runs it:  `both`, or `claude` (Claude Code only;  Codex calls it only by name, `$bg`) */
  agents: "both" | "claude"
  /** its front matter's description */
  description: string
}

/** One problem with a skill. */
export type SkillProblem = {
  /** the skill's name;  `*` for the skills together (the list's budget) */
  skill: string
  /** the line in its `SKILL.md`, when it's about one */
  line?: number
  /** what's wrong, and so what to do */
  message: string
}

/**
 * The tools only Claude Code has, as a skill's text names them:  each needs an `In Codex:` line beside it.
 * - the long form of each Codex way:  `epic guide claude-only-tools` (the epic skill's `guide.md`)
 */
export const CLAUDE_ONLY_TOOLS: { name: string; pattern: RegExp }[] = [
  { name: "AskUserQuestion", pattern: /\bAskUserQuestion\b/ },
  { name: "the question modal", pattern: /\bmodal\b/i },
  { name: "the Agent tool", pattern: /`Agent`|\bAgent (?:tool|call)s?\b/ },
  { name: "background agents", pattern: /\bbackground agents?\b/i },
  { name: "EnterWorktree", pattern: /\bEnterWorktree\b/ },
  { name: "ExitWorktree", pattern: /\bExitWorktree\b/ },
  { name: "SendMessage", pattern: /\bSendMessage\b/ },
  { name: "ListAgents", pattern: /\bListAgents\b/ },
  { name: "TaskStop", pattern: /\bTaskStop\b/ },
  { name: "TaskOutput", pattern: /\bTaskOutput\b/ },
  { name: "ScheduleWakeup", pattern: /\bScheduleWakeup\b/ },
  { name: "run_in_background", pattern: /\brun_in_background\b/ },
  { name: "plan mode", pattern: /\bplan mode\b|\b(?:Enter|Exit)PlanMode\b/i }
]

/** How many lines from a Claude-only tool its `In Codex:` line may be. */
export const NEAR = 10

/** The skill format's limit on a description (the open agent-skills format's, which both agents read). */
export const DESCRIPTION_LIMIT = 1024

/** What Codex gives its skills list when it can't tell its context's size:  its descriptions are cut past it. */
export const LIST_BUDGET = 8000

/** A skill's line saying what Codex does instead:  `- In Codex:  ask in the chat, the options numbered`. */
const IN_CODEX = /\bIn Codex:/

/** A Claude-only skill's note, in its first lines:  `In Codex:  Claude Code only ...`. */
const CLAUDE_ONLY_NOTE = /\bIn Codex:\s+Claude Code only\b/

/** How many of the body's first lines the Claude-only note may be in. */
const NOTE_WITHIN = 8

/** A Codex settings file that keeps Codex from picking the skill by itself. */
const NO_IMPLICIT = /^\s*allow_implicit_invocation:\s*false\b/m

/** What a skill names the plugin's folder by, which Claude Code fills in and Codex doesn't. */
const CLAUDE_PLUGIN_ROOT = "${CLAUDE_PLUGIN_ROOT}"

/** What prints the plugin's folder, for an agent that doesn't fill in `${CLAUDE_PLUGIN_ROOT}`. */
const ROOT_COMMAND = "epic guide --root"

/** A Markdown file's front matter and the rest. */
const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

/** The plugin's skills:  `epic/skills/`. */
const SKILLS_FOLDER = join(dirname(dirname(import.meta.dirname)), "skills")
