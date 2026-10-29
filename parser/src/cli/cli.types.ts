/**
 * Types for the language's `spell` commands (`spell compile`, `spell run`, `spell lint` ...):
 * their flags, and the hook their work comes through (`LanguageCommands`).
 * - Types only:  `spell help` loads the command list, which must load nothing of spell.
 * - spell-app implements `LanguageCommands` (its `"language"` hook) and imports these flags' types from here:
 *   every arrow points down.
 */
import type { GlobalOptions } from "spell/cli"

////////////////
// ## The hook
////////////////

/**
 * The language commands' work, by command:  what the `"language"` hook loads (`CLI.needHook()`).
 * - Each takes the command's arguments and flags, and resolves to its exit code.
 * - spell-app's `src/cli/hooks.ts` provides it today:  every one of them loads projects the app's way (addresses like
 *   `@spell/examples/solitaire`, the editor's language service), until spell-parser can (epic `repo-split` P13).
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
  translate(project: string[], options: TranslateOptions): Promise<number>
  translateTime(projects: string[], options: TranslateTimeOptions): Promise<number>
  spellxConvert(projects: string[], options: SpellxConvertOptions): Promise<number>
}

/** One of the language's commands, by name:  `compile`, `lint` ... */
export type LanguageCommand = keyof LanguageCommands

////////////////
// ## Flags
////////////////

/**
 * `spell translate` flags (epic `spanish` P24).
 * - `to`:  the language to write the project in, by its code, e.g. `es`
 * - `out`:  the folder to write it to, its dictionary and record too -- default beside it, named as the dictionary
 *   names the project
 * - `update`:  re-translate only the lines changed since the last run;  the rest stay as they are, hand edits too
 * - `ai`:  `false` (`--no-ai`) leaves each name the dictionary lacks as `TODO`, instead of asking `claude -p`
 * - `seed`:  a project translated by hand, whose names fill the dictionary first, e.g. `@spell/examples/Solitario`
 * - `learn`:  translate nothing;  add the project's dictionary to the language's shared glossary (epic `spanish` P26)
 * - `effort`:  how much every pass spends on its answers, `fast`, `balanced` or `best` -- default `balanced`
 *   (epic `spanish` P27);  the runner maps it to its own model and effort
 * - `namesEffort`, `fixUpsEffort`:  one pass's, over `effort` -- `--names-effort`, `--fix-ups-effort`
 * - `model`:  HIDDEN, for experiments:  an exact model and effort for every call, in the runner's own terms,
 *   `<model>[:<effort>]` (`claude-sonnet-5-5:medium`), over every tier
 * - `cold`:  for timing (epic `spanish` P29):  nothing pre-calculated -- no shared glossary, no dictionary of the
 *   project's, no record of fix-ups, no seed -- and nothing written but into `out`, which it needs
 * - `review`:  between the names and the lines, show the names drafted on a page in the Review tab, take a person's
 *   answers as they're given until Send, and write the lines with them (epic `spanish` P31, P32);  the page shows the
 *   passes and picks the effort;  with `ai: false`, the names still missing, to type
 * - `reviewTimeout`:  how long `review` takes answers before going on without Send:  minutes, or `90s`, `10m`, `1h` --
 *   default 30 minutes
 */
export type TranslateOptions = GlobalOptions & {
  to: string
  out?: string
  update?: boolean
  ai?: boolean
  seed?: string
  learn?: boolean
  effort?: string
  namesEffort?: string
  fixUpsEffort?: string
  model?: string
  cold?: boolean
  review?: boolean
  reviewTimeout?: string
}

/**
 * `spell translate speedtest` flags (epic `spanish` P29):  timing `spell translate`, on scratch copies.
 * - `to`:  the language, e.g. `es`
 * - `runs`:  how many runs of each project, mode and tier -- default 1
 * - `effort`:  the tiers to compare, comma-separated, e.g. `fast,balanced` -- default `balanced`
 * - `mode`:  what each run starts from, comma-separated (`TimingMode`) -- default `cold,glossary`
 * - `reference`:  a translation a person made, to compare the drafted names with -- one project only;
 *   spell-app knows the examples' twins (Solitaire's Solitario) itself
 * - `json`:  write every run and the table's numbers to this file too
 */
export type TranslateTimeOptions = GlobalOptions & {
  to: string
  runs?: number
  effort?: string
  mode?: string
  reference?: string
  json?: string
}

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
 * - `browser`:
 *   - `true`:  opens the project in a browser, even if it shows no UI
 *   - `false`:  never does
 *   - left out:  only if it tried to show one
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
 * `spell spellx convert` flags.
 * - `dryRun`:  write nothing:  print each `.spellml` file instead
 */
export type SpellxConvertOptions = GlobalOptions & {
  dryRun?: boolean
}

/**
 * `spell parse` flags.
 * - `rule`:  parse as this rule only, e.g. `expression`
 * - `in`:  parse inside this project's scope, e.g. `@spell/examples/Solitaire`
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
 * - `in`:  look in this project, too, e.g. `@spell/examples/Solitaire`
 * - `json`:  print what was found as JSON
 */
export type ExplainOptions = GlobalOptions & {
  in?: string
  json?: boolean
}

/**
 * `spell translate check|fix` flags (epic `spanish` P7).
 * - `json`:  `check` prints its report as JSON
 * - `ai`:  `fix` asks `claude -p` to translate each stub, rather than leaving it in English
 */
export type PacksOptions = GlobalOptions & {
  json?: boolean
  ai?: boolean
}
