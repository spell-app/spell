/**
 * Types and constants for the `spell` command (`spell/cli`):  exit codes, `CliError`, the flags every command
 * takes, and the shapes a repo hands the kit its commands and hooks in.
 * - Runtime-light:  `import type` only, plus the small `CliError` class and `EXIT` codes.
 * - NEVER imports another repo:  every repo's commands import THIS (`spell/cli`), never the other way.
 */
import type { Command } from "commander"

////////////////
// ## Exit codes and errors
////////////////

/** Process exit codes. */
export const EXIT = {
  /** all went well */
  OK: 0,
  /** the work had errors, e.g. a line of spell that doesn't parse, or a stale bundle */
  ERRORS: 1,
  /** the command line itself was wrong, e.g. an unknown project or verb */
  USAGE: 2
} as const

/**
 * A problem to tell people about in plain words, then exit:  NOT a crash, so no stack trace.
 * - `exitCode` defaults to `EXIT.USAGE`.
 * - Every repo's commands throw THIS class (spell-app's `CLI.CliError` re-exports it), so `runCommand()` knows it.
 */
export class CliError extends Error {
  exitCode: number
  constructor(message: string, exitCode: number = EXIT.USAGE) {
    super(message)
    this.exitCode = exitCode
  }
}
CliError.prototype.name = "CliError"

////////////////
// ## Options
////////////////

/**
 * Flags every command takes, before or after its name.
 * - `verbose`:  let a command's own logging through, on stderr (spell's, for the language commands)
 * - `all`:  a group of projects, e.g. `@spell/library`, means ALL its projects, rather than asking which
 */
export type GlobalOptions = {
  verbose?: boolean
  all?: boolean
}

/**
 * `spell bundle` flags.
 * - `stale`:  build only the bundles that need it
 * - `json`:  print the report as JSON
 */
export type BundleOptions = GlobalOptions & {
  stale?: boolean
  json?: boolean
}

/**
 * `spell commands` flags.
 * - `json`:  print every command, and the problems, as JSON
 */
export type CommandsOptions = GlobalOptions & {
  json?: boolean
}

/**
 * `spell wwod` flags.
 * - `json`:  `check` prints the report as JSON
 */
export type WwodOptions = GlobalOptions & {
  json?: boolean
}

/**
 * `spell publish` flags.
 * - `dryRun`:  build, pack and check every package, then install them in a scratch project;  publish nothing
 * - `scratch`:  `false` (`--no-scratch`) skips the scratch install, which needs the network
 * - `json`:  print the packed packages and every check as JSON
 */
export type PublishOptions = GlobalOptions & {
  dryRun?: boolean
  scratch?: boolean
  json?: boolean
}

/**
 * `spell map` flags.
 * - `docs`:  ask the docs map, not the code map
 * - `budget`:  `query`'s answer, at most this many tokens (graphify's `--budget`)
 * - `json`:  `status` and `build` print their report as JSON
 */
export type MapOptions = GlobalOptions & {
  docs?: boolean
  budget?: string
  json?: boolean
}

/**
 * `spell coherence score` flags (epic `coherence` P15).
 * - `json`:  print the snapshot, or the comparison, as JSON
 * - `save`:  write a snapshot to the shared content's `epics/coherence/details/scores/`
 * - `compare`:  a snapshot to compare with:  its file name, or `last`
 * - `at`:  count the code as it was:  a revision each repo reads (`main@{2026-10-25 14:00}`), a commit of the kit,
 *   or a time (`2026-10-25 14:00`)
 */
export type CoherenceOptions = GlobalOptions & {
  json?: boolean
  save?: boolean
  compare?: string
  at?: string
}

/**
 * `spell pony` flags.
 * - `gallop`:  her legs gallop (epic `property-editor` P8)
 */
export type PonyOptions = GlobalOptions & {
  gallop?: boolean
}

////////////////
// ## What repos contribute
////////////////

/**
 * A repo's commands, the default export of the file its `package.json` names
 * (`"spell": { "commands": "./cli/commands.ts" }`, epic `repo-split` Q33).
 * - It adds its commands to `spell`, as to any commander program:  `spell.command("compile")...`
 * - `spell` is the repo's OWN program:  the kit then moves each command into the real one (`addRepoCommands()`),
 *   under the repo's name only when another repo has a command of the same name.
 * - MUST load fast:  `spell help` loads every repo's list.  An action imports its work when it runs (`import()`).
 */
export type CommandList = (spell: Command) => void

/**
 * A repo's hooks, the default export of the file its `package.json` names (`"spell": { "hooks": "./cli/hooks.ts" }`):
 * what it plugs into commands of the repos BELOW it, by name.
 * - Each is a loader, so nothing loads until a command asks:  `language: () => import(...)`
 * - E.g. spell-app's `language`:  the language commands' work, spell-parser's commands, while it needs spell-app's
 *   projects (epic `repo-split` P13).
 */
export type HookList = Record<string, () => Promise<unknown>>

/**
 * A repo whose `package.json` has a `"spell"` entry, as `spellRepos()` finds it.
 * - `name`:  its package's, `spell-parser`;  `short`:  that less `spell-` (the kit's, `spell`:  `kit`),
 *   the word its commands go under in a clash
 * - `root`:  its folder, absolute
 * - `commands`, `hooks`:  its files' absolute paths, when it names them
 */
export type SpellRepo = {
  name: string
  short: string
  root: string
  version: string
  commands?: string
  hooks?: string
}

/** The `"spell"` entry of a repo's `package.json`:  paths from its root. */
export type SpellEntry = { commands?: string; hooks?: string }

////////////////
// ## Running other tools
////////////////

/**
 * How `runTool()` runs one repo tool, the way its yarn script did.
 * - `tool`:  the script, relative to a checkout's root
 * - `tsx`:  the `tsconfig.json` it runs under `tsx` with, relative to a checkout's root;  none:  plain `node`
 * - `cwd`:  the folder it runs in, relative to a checkout's root;  none:  the caller's
 */
export type ToolSpec = { tool: string; tsx?: string; cwd?: string }

////////////////
// ## The WWOD check
////////////////

/**
 * One broken citation or path (`checkAgentRules()`).
 * - `file`:  relative to the checkout;  `cite`:  what it says (`§12 › "title"`, a backticked path)
 */
export type AgentRulesProblem = { file: string; line: number; cite: string; problem: string }

/** `spell wwod check`'s answer:  WWOD's size, how many files were read, and what's broken. */
export type AgentRulesReport = { sections: number; rules: number; files: number; problems: AgentRulesProblem[] }

////////////////
// ## The commands page
////////////////

/**
 * The commands page's data, from the shared content folder (`spell commands`).
 * - the content folder:  `contentFolderOf()` (`spell/server/contentFolder`)
 * - a data file (`DataFile`, epic `epic-workflow` P21), JSON5
 */
export const COMMANDS_JSON = "guides/dev/commands/commands.json5"
