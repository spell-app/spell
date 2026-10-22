/**
 * Types for the language's `spell` commands (`spell compile`, `spell run`, `spell lint` ...):  their flags, and the
 * hook their work comes through (`LanguageCommands`).
 * - Types only:  `spell help` loads the command list, which must load nothing of spell.
 * - spell-app implements `LanguageCommands` (its `"language"` hook) and imports these flags' types from here:
 *   every arrow points down.
 */
import type { GlobalOptions } from "spell-kit/cli"

////////////////
// ## The hook
////////////////

/**
 * The language commands' work, by command:  what the `"language"` hook loads (`CLI.needHook()`).
 * - Each takes the command's arguments and flags, and resolves to its exit code.
 * - spell-app's `src/cli/hooks.ts` provides it today:  every one of them loads projects the app's way (addresses like
 *   `@spell/examples/solitaire`, the editor's language service), until spell-lang can (epic `repo-split` P13).
 */
export type LanguageCommands = {
  compile(projects: string[], options: CompileOptions): Promise<number>
  lint(projects: string[], options: LintOptions): Promise<number>
  describe(args: string[], options: DescribeOptions): Promise<number>
  run(project: string[], options: RunOptions): Promise<number>
  test(projects: string[], options: TestOptions): Promise<number>
  watch(projects: string[], options: WatchOptions): Promise<number>
  format(projects: string[], options: FormatOptions): Promise<number>
  speedtest(module: string[], options: SpeedtestOptions): Promise<number>
  parse(text: string[], options: ParseOptions): Promise<number>
  repl(project: string[], options: GlobalOptions): Promise<number>
  explain(word: string[], options: ExplainOptions): Promise<number>
}

/** One of the language's commands, by name:  `compile`, `lint` ... */
export type LanguageCommand = keyof LanguageCommands

////////////////
// ## Flags
////////////////

/**
 * `spell compile` flags.
 * - `stdout`:  print a project's compiled output rather than writing `<Project>.spell.js`
 * - `force`:  recompile the projects it imports, too, even those already compiled
 * - `stale`:  compile only the projects whose build is missing or out of date
 * - `target`:  compile to this target, this run, instead of the project file's (`SP.TARGETS`)
 */
export type CompileOptions = GlobalOptions & {
  stdout?: boolean
  force?: boolean
  stale?: boolean
  target?: string
}

/**
 * `spell lint` flags (`spell check` until epic `repo-split` P13).
 * - `json`:  print problems as a JSON array, rather than lines
 * - `fix`:  put each editor page right, and write it back
 */
export type LintOptions = GlobalOptions & {
  json?: boolean
  fix?: boolean
}

/**
 * `spell describe` flags.
 * - `inherited`:  list members types inherit, too
 * - `compiled`:  show the javascript something compiles to -- when describing ONE thing
 * - `json`:  print the Type Explorer's own data, rather than text
 */
export type DescribeOptions = GlobalOptions & {
  inherited?: boolean
  compiled?: boolean
  json?: boolean
}

/**
 * `spell watch` flags.
 * - `checkOnly`:  re-check on each change, rather than recompile -- writes nothing
 * - `test`:  run each project's tests after each rebuild with no errors -- `spell test --watch`
 * - `name`:  with `test`, only tests whose names contain it
 */
export type WatchOptions = GlobalOptions & {
  checkOnly?: boolean
  test?: boolean
  name?: string
}

/**
 * The flag `spell run` and `spell test` share.
 * - `seed`:  start the program's random numbers from it, so every run deals the same cards --
 *   a whole number from 1 to 2147483646, see `core.seedRandom()`.  Left out:  a different deal each run.
 */
export type SeedOptions = {
  seed?: number
}

/**
 * `spell run` flags.
 * - `browser`:  `true` opens the project in a browser even if it shows no UI;  `false` never does;  left out:  only if
 *   it tried to show one
 * - `target`:  `ts` or `py` (or a target's full name):  run as that target compiles it
 */
export type RunOptions = GlobalOptions &
  SeedOptions & {
    browser?: boolean
    target?: string
  }

/**
 * `spell test` flags.
 * - `name`:  only tests whose names contain it, e.g. `deck` -- ignoring case, and spaces ~== `-` ~== `_`
 * - `watch`:  run them again whenever the project changes -- `spell watch --test`
 */
export type TestOptions = GlobalOptions &
  SeedOptions & {
    name?: string
    watch?: boolean
  }

/**
 * `spell speedtest` flags (`spell speed` until epic `repo-split` P13).
 * - `runs`:  how many runs per side, each a fresh process -- default 3
 * - `against`:  a git ref, e.g. `HEAD`, to time as well, as "Previous"
 * - `json`:  print each side's combined results as JSON
 */
export type SpeedtestOptions = GlobalOptions & {
  runs?: number
  against?: string
  json?: boolean
}

/**
 * `spell format` flags.
 * - `check`:  write nothing:  list the files that would change, and exit 1 if any would
 */
export type FormatOptions = GlobalOptions & {
  check?: boolean
}

/**
 * `spell parse` flags.
 * - `rule`:  parse as this rule only, e.g. `expression`
 * - `in`:  parse inside this project's scope, e.g. `@spell/test/solitaire`
 * - `json`:  print the result as JSON
 * - `tree`:  print the spell tree (what it means), not the match tree
 * - `html`:  with `tree`, print it as a `<ui-tree-diagram>` for a docs page
 */
export type ParseOptions = GlobalOptions & {
  rule?: string
  in?: string
  json?: boolean
  tree?: boolean
  html?: boolean
}

/**
 * `spell explain` flags.
 * - `in`:  look in this project, too, e.g. `@spell/test/solitaire`
 * - `json`:  print what was found as JSON
 */
export type ExplainOptions = GlobalOptions & {
  in?: string
  json?: boolean
}
