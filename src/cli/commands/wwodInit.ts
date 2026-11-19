import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import type { AgentRuleChange, AgentRuleId, AgentRulePicks } from "spell/cli"

/**
 * `spell wwod init`'s work (epic `repo-split` T66):  hand a project's agents the rules the `spell` package ships,
 * by writing their lines into its `CLAUDE.md` and `AGENTS.md`.
 * - The rules:  WWOD, the Solid 2 rules, and WWOD §21, the code is the spec (`AGENT_RULES`).
 * - `CLAUDE.md` gets `@`-imports, which Claude Code reads in every session;  created when missing.
 *   `AGENTS.md`, the file other agents (Codex ...) read, gets the same in plain words, when it exists.
 * - Each file's lines sit in ONE block between two markers (`BLOCK_START`, `BLOCK_END`), rewritten in place:
 *   so a second run changes the block, never adds a second one.
 * - A line someone wrote by hand, outside the block, counts:
 *   in `CLAUDE.md` it's kept when wanted (the block doesn't repeat it), removed when not;
 *   in `AGENTS.md` it's kept either way, and a note says to remove it by hand.
 * - Node built-ins only, and `spell/cli`'s types:  the lean npm install runs it (`npx spell@next wwod init`).
 * - Pure until `writeAgentRules()`:  `planAgentRules()` only reads, so `--dry-run` is the same plan, unwritten.
 */

/** The rules a project can take, in the order they're asked and written. */
export const AGENT_RULES: readonly AgentRule[] = [
  {
    id: "wwod",
    file: "wwod/WWOD.md",
    label: "WWOD",
    agentsLine: (path) => `**ALWAYS, before any code:  READ \`${path}\`, the house style (WWOD).**`
  },
  {
    id: "solid",
    file: "solid/solid-2.md",
    label: "the Solid 2 rules",
    agentsLine: (path) => `**Before any Solid 2 code:  READ \`${path}\` IN FULL.**`
  },
  {
    id: "code-is-the-spec",
    file: "wwod/code-is-the-spec.md",
    label: "§21, the code is the spec",
    agentsLine: (path) => `**Tests follow the code, which is the spec:  READ \`${path}\`.**`
  }
]

/** The block's first line:  what wrote it, and how to change it. */
export const BLOCK_START =
  "<!-- spell wwod init:  the agents' rules from the spell package;  run it again to change them -->"

/** The block's last line. */
export const BLOCK_END = "<!-- /spell wwod init -->"

/** Where the rules are in a project that installed `spell`. */
const INSTALLED_RULES = "node_modules/spell/agents"

/** Where they are in the kit itself, the `spell` package's own checkout. */
const OWN_RULES = "agents"

/**
 * Where `project`'s agents find the rules, from its root:  `node_modules/spell/agents`, or `agents` in the kit itself
 * (its `package.json` is named `spell`);  `undefined` when `spell` isn't installed there.
 * - NEVER throws.
 */
export function rulesFolderFor(project: string): string | undefined {
  if (packageOf(project)?.name === "spell" && existsSync(join(project, OWN_RULES, AGENT_RULES[0].file)))
    return OWN_RULES
  if (existsSync(join(project, INSTALLED_RULES, AGENT_RULES[0].file))) return INSTALLED_RULES
  return undefined
}

/**
 * Which rules `project` already has:  a rule's `@`-line anywhere in `CLAUDE.md`, or its line in `AGENTS.md`'s block.
 * - `folder`:  `rulesFolderFor()`'s
 */
export function currentAgentRules(project: string, folder: string): AgentRulePicks {
  const claude = linesOf(join(project, CLAUDE_MD))
  const agents = blockOf(linesOf(join(project, AGENTS_MD)))
  return Object.fromEntries(
    AGENT_RULES.map((rule) => {
      const path = `${folder}/${rule.file}`
      const has = claude.some((line) => line.trim() === `@${path}`) || agents.some((line) => line.includes(path))
      return [rule.id, has]
    })
  ) as AgentRulePicks
}

/** Whether `project` depends on Solid (`solid-js` in any of its `package.json`'s dependencies):  the Solid rules' default. */
export function usesSolid(project: string): boolean {
  const manifest = packageOf(project)
  return [manifest?.dependencies, manifest?.devDependencies, manifest?.peerDependencies].some(
    (dependencies) => dependencies?.["solid-js"] !== undefined
  )
}

/**
 * What `picks` would change in `project`'s `CLAUDE.md` and `AGENTS.md`:  one change per file it looked at,
 * `changed: false` for a file already right.
 * - `AGENTS.md` only when it exists;  a new `CLAUDE.md` starts with `@AGENTS.md` when there's one to load
 * - `folder`:  `rulesFolderFor()`'s
 * - reads only:  `writeAgentRules()` writes
 */
export function planAgentRules(project: string, picks: AgentRulePicks, folder: string): AgentRuleChange[] {
  const changes = [claudeChange(project, picks, folder)]
  if (existsSync(join(project, AGENTS_MD))) changes.push(agentsChange(project, picks, folder))
  return changes
}

/** Write each changed file of `changes` in `project`.  SIDE EFFECT:  writes files. */
export function writeAgentRules(project: string, changes: readonly AgentRuleChange[]): void {
  for (const change of changes) if (change.changed) writeFileSync(join(project, change.file), change.text)
}

/** One line per file:  what changed in it, or that it was already right;  `would` for a dry run. */
export function agentRuleChangeLines(changes: readonly AgentRuleChange[], { dryRun = false } = {}): string[] {
  return changes.map(({ file, added, removed, created, changed, notes }) => {
    if (!changed) return `${file}:  already right`
    const did = (verb: keyof typeof PAST) => (dryRun ? `would ${verb}` : PAST[verb])
    const parts = [
      created ? did("create") : undefined,
      added.length ? `${did("add")} ${labels(added)}` : undefined,
      removed.length ? `${did("remove")} ${labels(removed)}` : undefined
    ].filter(Boolean)
    return [`${file}:  ${parts.join(";  ") || did("tidy")}`, ...notes.map((note) => `  ${note}`)].join("\n")
  })
}

/** The report's verbs, done. */
const PAST = { create: "created", add: "added", remove: "removed", tidy: "tidied" } as const

////////////////
// ## Each file
////////////////

/** The project's Claude Code file:  `@`-imports. */
const CLAUDE_MD = "CLAUDE.md"

/** The project's file for every agent:  plain words. */
const AGENTS_MD = "AGENTS.md"

/** `CLAUDE.md`'s change:  wanted rules' `@`-lines kept or added to the block;  unwanted ones removed everywhere. */
function claudeChange(project: string, picks: AgentRulePicks, folder: string): AgentRuleChange {
  const path = join(project, CLAUDE_MD)
  const created = !existsSync(path)
  const before = created ? undefined : readFileSync(path, "utf8")
  const isRuleLine = (line: string, rule: AgentRule) => line.trim() === `@${folder}/${rule.file}`
  const { outside, at } = withoutBlock(before === undefined ? [] : before.split("\n"))
  const had = AGENT_RULES.filter((rule) => [...linesOf(path)].some((line) => isRuleLine(line, rule)))
  const kept = outside.filter((line) => !AGENT_RULES.some((rule) => !picks[rule.id] && isRuleLine(line, rule)))
  const block = AGENT_RULES.filter((rule) => picks[rule.id] && !kept.some((line) => isRuleLine(line, rule))).map(
    (rule) => `@${folder}/${rule.file}`
  )
  let lines = tidyBlanks(kept)
  if (created && existsSync(join(project, AGENTS_MD))) lines = ["@AGENTS.md", ""]
  const text = joinLines(withBlock(lines, block, at ?? "end"))
  return change(CLAUDE_MD, picks, had, before, text, [])
}

/** `AGENTS.md`'s change:  its block holds a plain line per wanted rule the file doesn't already name. */
function agentsChange(project: string, picks: AgentRulePicks, folder: string): AgentRuleChange {
  const before = readFileSync(join(project, AGENTS_MD), "utf8")
  const lines = before.split("\n")
  const { outside, at } = withoutBlock(lines)
  const namesOutside = (rule: AgentRule) => outside.some((line) => line.includes(`${folder}/${rule.file}`))
  const had = AGENT_RULES.filter((rule) => blockOf(lines).some((line) => line.includes(`${folder}/${rule.file}`)))
  const block = AGENT_RULES.filter((rule) => picks[rule.id] && !namesOutside(rule)).map((rule) =>
    rule.agentsLine(`${folder}/${rule.file}`)
  )
  const notes = AGENT_RULES.filter((rule) => !picks[rule.id] && namesOutside(rule)).map(
    (rule) => `still names ${rule.label} outside the block:  remove that line by hand`
  )
  const text = joinLines(withBlock(tidyBlanks(outside), block, at ?? afterTitle(outside)))
  return change(AGENTS_MD, picks, had, before, text, notes)
}

/** A file's change, from what it had and what's picked. */
function change(
  file: string,
  picks: AgentRulePicks,
  had: readonly AgentRule[],
  before: string | undefined,
  text: string,
  notes: string[]
): AgentRuleChange {
  return {
    file,
    created: before === undefined,
    changed: text !== before,
    added: AGENT_RULES.filter((rule) => picks[rule.id] && !had.includes(rule)).map((rule) => rule.id),
    removed: had.filter((rule) => !picks[rule.id]).map((rule) => rule.id),
    text,
    notes
  }
}

////////////////
// ## The block
////////////////

/** `lines` without the block, and the line it started at;  no block:  `at` is `undefined`. */
function withoutBlock(lines: string[]): { outside: string[]; at?: number } {
  const start = lines.indexOf(BLOCK_START)
  const end = lines.indexOf(BLOCK_END, start)
  if (start < 0 || end < 0) return { outside: lines }
  return { outside: [...lines.slice(0, start), ...lines.slice(end + 1)], at: start }
}

/** The lines inside the block;  none when there's no block. */
function blockOf(lines: string[]): string[] {
  const start = lines.indexOf(BLOCK_START)
  const end = lines.indexOf(BLOCK_END, start)
  return start < 0 || end < 0 ? [] : lines.slice(start + 1, end)
}

/**
 * `lines` with a block of `inside` put back at line `at`, or at the end, a blank line either side;
 * no block at all when `inside` is empty.
 */
function withBlock(lines: string[], inside: string[], at: number | "end"): string[] {
  if (!inside.length) return tidyBlanks(lines)
  const index = at === "end" ? lines.length : Math.min(at, lines.length)
  const before = trimBlankEnd(lines.slice(0, index))
  const after = trimBlankStart(lines.slice(index))
  return [
    ...before,
    ...(before.length ? [""] : []),
    BLOCK_START,
    ...inside,
    BLOCK_END,
    ...(after.length ? [""] : []),
    ...after
  ]
}

/** Where a new block goes in `AGENTS.md`:  after its `# Title`, else at the top. */
function afterTitle(lines: string[]): number {
  const title = lines.findIndex((line) => line.startsWith("# "))
  return title + 1
}

////////////////
// ## Helpers
////////////////

/** A rule's labels, joined:  `WWOD, the Solid 2 rules`. */
function labels(ids: readonly AgentRuleId[]): string {
  return ids.map((id) => AGENT_RULES.find((rule) => rule.id === id)!.label).join(", ")
}

/** A file's lines;  none when it's missing. */
function linesOf(path: string): string[] {
  return existsSync(path) ? readFileSync(path, "utf8").split("\n") : []
}

/** `project`'s `package.json`, or `undefined` when it has none (or it doesn't parse). */
function packageOf(project: string): ProjectPackage | undefined {
  try {
    return JSON.parse(readFileSync(join(project, "package.json"), "utf8")) as ProjectPackage
  } catch {
    return undefined
  }
}

/** `lines` with no run of blank lines longer than one, none at the start or end. */
function tidyBlanks(lines: string[]): string[] {
  const tidy = lines.filter((line, index) => line.trim() || lines[index - 1]?.trim())
  return trimBlankEnd(trimBlankStart(tidy))
}

/** `lines` without its leading blank lines. */
function trimBlankStart(lines: string[]): string[] {
  const first = lines.findIndex((line) => line.trim())
  return first < 0 ? [] : lines.slice(first)
}

/** `lines` without its trailing blank lines. */
function trimBlankEnd(lines: string[]): string[] {
  const last = lines.findLastIndex((line) => line.trim())
  return lines.slice(0, last + 1)
}

/** `lines` as a file's text, ending in one newline;  `""` for none. */
function joinLines(lines: string[]): string {
  return lines.length ? `${lines.join("\n")}\n` : ""
}

/** One rule a project can take. */
type AgentRule = {
  /** its id:  its flag (`--solid`) and its key in `AgentRulePicks` */
  id: AgentRuleId
  /** its file under the package's `agents/` */
  file: string
  /** what people call it, in the questions and the report */
  label: string
  /** its line in `AGENTS.md`, for its file's `path` from the project's root */
  agentsLine: (path: string) => string
}

/** The parts of a `package.json` read here. */
type ProjectPackage = {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}
