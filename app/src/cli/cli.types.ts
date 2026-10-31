/**
 * Shared types for spell-app's `spell` commands (`cli/commands.ts`) and the language commands' work (`cli/hooks.ts`).
 * - Runtime-light:  types, plus `normalizedName()` and `checkProjectName()`.
 * - The kit's (`spell/cli`) and the language's (`spell/parser/cli`) are re-exported here, so every file of this
 *   folder says `CLI.CliError`, `CLI.CompileOptions` ...:  ONE `CliError` class for every repo's commands.
 */
import type { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"
import { CliError, type GlobalOptions } from "spell/cli"

export { CliError, EXIT, type GlobalOptions } from "spell/cli"
export type {
  CompileOptions,
  DescribeOptions,
  ExplainOptions,
  FormatOptions,
  LintOptions,
  ParseOptions,
  RunOptions,
  SeedOptions,
  SpeedtestOptions,
  SpellxConvertOptions,
  TestOptions,
  TranslateOptions,
  TranslateTimeOptions,
  WatchOptions
} from "spell/parser/cli"

////////////////
// ## Projects
////////////////

/**
 * What one command-line argument names -- see `resolveProject()`.
 * - `arg`:  what was typed, for messages.
 * - `project`:  one spell project, e.g. `@spell/examples/Solitaire`, a project folder, `@here`.
 * - `file`:  one `.spell` file, inside its project.
 * - `root`:  a whole project root, e.g. `@spell/library` -- commands turn it into projects with `CliSession.projectsFor()`.
 */
export type CliProject =
  | { kind: "project"; arg: string; project: SP.SpellProject }
  | { kind: "file"; arg: string; file: SP.SpellFile }
  | { kind: "root"; arg: string; title: string; projectIds: string[] }

/** A `CliProject` once any `root` has become the projects in it. */
export type ResolvedProject = Exclude<CliProject, { kind: "root" }>

////////////////
// ## Options
////////////////

/**
 * Throw if spell can't use `name` for a project:  a letter, then letters, digits, `-` or `_`.
 * - Here, where nothing loads spell:  `spell app create` asks before `loadApp()` loads all of spell
 *   (seconds on CI), and `newCommand()` asks too, for its other callers.
 */
export function checkProjectName(name: string): void {
  if (!/^[A-Za-z][\w-]*$/.test(name)) {
    throw new CliError(`'${name}' won't do as a project name:  a letter, then letters, digits, - or _`)
  }
}

/**
 * `name` for comparing as people would:  lower case, with spaces, `-`, `_` and a word's capital all one space.
 * - So `stock pile` finds `StockPile` (a type's name since epic `drawable-thing` P11),
 *   and `short-suit` finds `short_suit` and `shortSuit`.
 */
export function normalizedName(name: string): string {
  return name
    .replace(/(?<=[a-z0-9])(?=[A-Z])/g, " ")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim()
}

/**
 * `spell projects` flags.
 * - `json`:  print the list as JSON
 */
export type ProjectsOptions = GlobalOptions & {
  json?: boolean
}

/**
 * `spell content check` flags.
 * - `bless`:  rewrite every content snapshot instead of checking against it
 */
export type ContentCheckOptions = GlobalOptions & {
  bless?: boolean
}

/**
 * `spell content update` flags.
 * - `json`:  print what's new as JSON, for the session
 * - `done`:  record the update's end instead:  the stop commit moves to now
 * - `always`:  with `done`, ids (or their start, `component`) to upgrade from now on without asking
 */
export type ContentUpdateOptions = GlobalOptions & {
  json?: boolean
  done?: boolean
  always?: string[]
}

/**
 * `spell app preview serve` flags.
 * - `port`:  where to serve the static build -- default 4848 (`PREVIEW_PORT`), else any free one
 * - `headless`:  don't open a browser
 */
export type PreviewOptions = GlobalOptions & {
  port?: number
  headless?: boolean
}

/**
 * `spell app serve` flags.
 * - `port`:  the editor's port -- default 3000;  its server's is the next one up
 * - `headless`:  don't open a browser
 */
export type ServeOptions = GlobalOptions & {
  port?: number
  headless?: boolean
}

/**
 * `spell app create` flags (`spell new` until epic `repo-split` P13).
 * - `in`:  make the project in this folder -- default `owen@spell`'s, your space's (`<spell-spaces>/@spell/owen@/`)
 */
export type NewOptions = GlobalOptions & {
  in?: string
}

////////////////
// ## Running
////////////////

/**
 * What `runProject.ts` -- the child process `spell run` / `spell test` start -- is to do.
 * - Passed as JSON, in env var `SPELL_RUN`.
 * - `mode`:  `run` the project, or run its `test ...` functions and report
 * - `name`:  the project's, for messages
 * - `entry`:  URL of its compiled javascript -- a temp file, never in the project
 * - `projects`:  URL of each project it imports' `<Project>.spell.js`, by id -- for `@spell/project/<id>`
 * - `core`:  URL of `core`'s `src/index.ts`, for `@spell/core`
 * - `verbose`:  `test` shows every check, and anything printed, not just failures
 * - `filter`:  `test` runs only tests whose names contain it -- see `runProject.ts`
 * - `dom`:  run in a fake page, drawing what it draws, and print it -- see `fakeDom()` in `runProject.ts`
 * - `seed`:  start its random numbers from it, before it loads -- see `core.seedRandom()`.
 *   Left out:  random, as in a browser.
 * - `messages`:  what the core says, e.g. a test's lines, in the language the program speaks (epic `spanish` P12, P19):
 *   see `core.useMessages()`.
 *   Left out:  English.
 * - `reports`:  `test` also sends how each test went (`TestsReport`) over IPC, for the lines its failures are on
 *   (epic `spanish` P25:  `spell translate`'s fix-ups)
 */
export type RunSpec = {
  mode: "run" | "test"
  name: string
  entry: string
  projects: Record<string, string>
  core: string
  verbose?: boolean
  filter?: string
  dom?: boolean
  seed?: number
  messages?: Record<string, string>
  reports?: boolean
}

/**
 * What `runProject.ts` tells `spell run` once the project has loaded, over IPC.
 * - `skipped`:  what it tried which needs a browser, e.g. `start the game` -- see `headless()`
 */
export type RunReport = {
  skipped: string[]
}

/**
 * What `runProject.ts` tells its parent once `test` has run, over IPC, when asked (`RunSpec.reports`):
 * how each test went, as the language server reads it to put each failure on its line (`spell/testDiagnostics`).
 */
export type TestsReport = {
  tests: LSP.TestReport[]
}

////////////////
// ## Places
////////////////

/**
 * Where something in the Type Explorer's tree is declared -- see `CLI.declaredAt()`.
 * - `uri`:  of the file it's in
 * - `line`:  line its statement starts on, from 1
 */
export type DeclaredAt = {
  uri: string
  line: number
}

////////////////
// ## Problems
////////////////

/**
 * One error in the spell, as `spell lint` reports it -- see `CliSession.problems()`.
 * - Or a warning, which says so in `severity` -- see `CliSession.warnings()`.
 * - `project`:  its project's id
 * - `path`:  absolute path of the file it's in -- none if the whole parse crashed
 * - `line`, `column`:  where, from 1
 * - `severity`:  `"warning"` for a warning;  none for an error
 */
export type Problem = {
  project: string
  path?: string
  line?: number
  column?: number
  message: string
  severity?: "warning"
}

////////////////
// ## Status
////////////////

/** Where a `StatusRow`'s work has got to. */
export type StatusState = "running" | "ok" | "errors" | "failed"

/**
 * One line of progress in a `StatusReporter`, e.g. one project compiling.
 * - `label`:  what's being worked on, e.g. a project id
 * - `note`:  short outcome after the label, e.g. `3 errors · wrote Foo.spell.js`
 * - `details`:  lines listed under it, e.g. each error
 */
export type StatusRow = {
  label: string
  state: StatusState
  note?: string
  details?: string[]
}

////////////////
// ## Content updates
////////////////

/**
 * What `spell content update` remembers between updates, in the content epic's folder of the epic repo
 * (`epics/content/content-updates.json5`;  `ContentUpdate`).
 * - `last`:  the commit the last update stopped at, and its commit time;  none before the first `--done`
 * - `always`:  the "always upgrade" rules, oldest first
 */
export type ContentUpdateMemory = {
  last?: { commit: string; date: string }
  always: AlwaysRule[]
}

/**
 * An "always upgrade" rule:  every listed change whose id is `id`, or starts `<id>:`, is upgraded without asking.
 * - `id`:  `component:ui-toast`, `component` (every new component), `epic:debut`, `grammar:SpellIfChain` ...
 * - `added`:  the day it was added, `2026-10-29`
 */
export type AlwaysRule = { id: string; added: string }

/**
 * What changed in the parser and Spell UI since the last content update (`ContentUpdate.gather()`).
 * - `since`:  where it starts:  the last update's stop commit, or a first guess (`guessed`) before any `--done`
 * - `head`:  where it ends, this checkout's `HEAD`
 * - `epics`:  the commits under `parser/` and `ui/`, grouped by the epic their subjects name, most commits first
 * - `components`, `attributes`, `grammar`:  Spell UI's new components, existing components' new attributes, and the
 *   parser's new grammar rules
 * - `options`:  what's in the epic page's standing set "Upgrades on offer" already
 */
export type ContentUpdateReport = {
  since: { commit: string; date: string; guessed: boolean }
  head: { commit: string; date: string }
  epics: EpicChanges[]
  components: NewComponent[]
  attributes: NewAttribute[]
  grammar: NewRule[]
  options: OfferedOption[]
}

/**
 * One epic's commits since the last update.
 * - `id`:  `epic:<name>`, or `epic:other` for commits that name none
 * - `epic`:  its name;  `null` for the others
 * - `changelog`:  its entry in the changelog:  whether it's there, and its heading
 * - `commits`:  newest first
 * - `marks`:  an always rule it matches, options that cover it
 */
export type EpicChanges = {
  id: string
  epic: string | null
  changelog?: { found: boolean; title?: string; path: string; anchor: string }
  commits: UpdateCommit[]
  marks: UpdateMark[]
}

/**
 * One commit, as its subject says it.
 * - `sha`:  short;  `date`:  its commit time, ISO;  `subject`:  the whole line
 * - `phases`, `items`:  what the subject names (`P3`, `i3`), as `PlanCommits.parseCommitSubject()` reads it
 */
export type UpdateCommit = { sha: string; date: string; subject: string; phases: string[]; items: string[] }

/**
 * A Spell UI component that's new since the last update.
 * - `id`:  `component:<tag>`;  `tag`:  `ui-space`;  `name`:  `Space`;  `description`:  its one line
 */
export type NewComponent = { id: string; tag: string; name: string; description: string; marks: UpdateMark[] }

/**
 * A new attribute on a component that was there before.
 * - `id`:  `attribute:<tag>:<name>`;  `description`:  its one line, when it has one
 */
export type NewAttribute = { id: string; tag: string; name: string; description: string; marks: UpdateMark[] }

/**
 * A grammar rule that's new since the last update (the parser's syntax table, `spellSyntax.json`).
 * - `id`:  `grammar:<className>`;  `module`:  its table (`lists`);  `ruleNames`:  what the grammar calls it;
 *   `purpose`:  its docstring's first line
 */
export type NewRule = {
  id: string
  className: string
  module: string
  ruleNames: string[]
  purpose: string
  marks: UpdateMark[]
}

/**
 * Why a listed change is marked:
 * - `always`:  it matches always rule `rule`
 * - `offered` / `picked` / `removed`:  an option of the standing set names its id in its title or note
 *   (`letter`, `title`):  still on offer, picked by Owen, or turned down
 */
export type UpdateMark = { kind: "always"; rule: string } | { kind: OptionState; letter: string; title: string }

/** Where a standing set's option stands:  on offer, picked (`slot="picked"`), or turned down (`slot="removed"`). */
export type OptionState = "offered" | "picked" | "removed"

/**
 * An option of the standing set "Upgrades on offer".
 * - `text`:  its title and note together, its earlier versions left out:  what the marks search for ids
 */
export type OfferedOption = { letter: string; title: string; text: string; state: OptionState }
