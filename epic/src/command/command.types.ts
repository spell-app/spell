/**
 * Types for the `epic` command's verb groups (`spell-epic/command/`):
 * - spell ui rename: leave this file (its merge report's example quotes an old name on purpose)
 * Claude Code sessions, worktrees, parked work, taking stock, shared content, requests.
 * - Runtime-light:  types, constants, the exit codes and error class (the kit's), and pure helpers over them:
 *   the ONE reader of a verb's command line (`parseVerbArgs()`, `stringFlag()`, `duration()`).
 * - Its position:  the BOTTOM of the folder's imports, and loaded by plain `node` too (types stripped):
 *   - the prompt gate (`PromptGate.ts`, which the `UserPromptSubmit` hook imports by path) needs `TITLE_ICONS`
 *   - the docs tools' plain scripts (`details.js`, `migrate.js`, the window script) read their command lines with it
 *   - So NEVER give it an alias, an `enum` or a parameter property, nor a value import plain `node` can't load:
 *     only files that import nothing (by their extension, `spell/util/string.ts`), and the kit's `spell/cli/cli.types.ts`,
 *     which imports types only.
 */
import { camelCase } from "spell/util/string.ts"
import { CliError, EXIT, type ToolSpec as CliToolSpec } from "spell/cli/cli.types.ts"
import type { RunningSession } from "spell-epic/config/ClaudeHome.ts"
import type { PendingQuestion } from "spell-epic/config/Transcript.ts"

////////////////
// ## Exit codes and errors
////////////////

/**
 * What every verb exits with (`EXIT`), and a verb's own failure (`EpicCommandError`):  the kit's command base's
 * (`spell/cli`), ONE table and ONE error class for every repo's commands.
 * - `EpicCommandError` IS the kit's `CliError`, as spell-app's `CLI.CliError` is:  its message is all there is to say,
 *   so the program prints it (no stack) and exits its `exitCode`, by default `EXIT.USAGE`
 *   (most are a command line that can't work:  `find:  which name?`)
 * - anything else thrown is a bug, and prints its stack
 */
export { EXIT, CliError as EpicCommandError }

////////////////
// ## A verb's command line
////////////////

/**
 * A verb's arguments, read from the command line as typed (`parseVerbArgs()`):
 * `--key value` flags, `--switch` switches, the rest in order.
 * - `flags`:  each flag's value, the LAST one given;  a switch, or a flag with no value after it, is `true`
 * - `lists`:  each flag's values in order, for a flag given more than once (`--title a --title b`)
 * - flag names camelCased:  `--dry-run` is `dryRun`
 */
export type VerbArgs = { positional: string[]; flags: Record<string, string | true>; lists: Record<string, string[]> }

/** A flag, as `parseVerbArgs()` takes one:  `--` and its name. */
const FLAG = /^--([\w-]+)$/

/** A bare number of seconds, `duration()`'s:  `3300`, `1.5`. */
const SECONDS = /^\d+(?:\.\d+)?$/

/** One part of a time with its unit, `duration()`'s:  `8h`, `30m`, `90s`. */
const TIME_PART = /(\d+(?:\.\d+)?)\s*(h|m|s)/g

/** Each of `duration()`'s units, in ms. */
const UNIT_MS = { h: 3_600_000, m: 60_000, s: 1000 }

/**
 * `argv` as `VerbArgs`:  the ONE reader of every `epic` verb's and docs tool's command line (`pages.js`, the window
 * script, the epic tool's `PlanDocCommands` read theirs with it too).
 * - a flag is `--name`, alone:  a letter, digit, `_` or `-` after the dashes;  anything else (`-x`, `--x=y`, `--`)
 *   is a positional
 * - `switches`:  the flags that take no value, camelCased:  a word after one is a positional (`--all seo`)
 * - any other flag takes the next word as its value, unless that starts with `--`
 * - which flags a verb takes, and its help, are `epic`'s (`EpicProgram`):  this reads them, whatever they are
 */
export function parseVerbArgs(argv: readonly string[], switches: readonly string[] = []): VerbArgs {
  const positional: string[] = []
  const flags: Record<string, string | true> = {}
  const lists: Record<string, string[]> = {}
  for (let i = 0; i < argv.length; i++) {
    const name = flagName(argv[i]!)
    if (name === undefined) {
      positional.push(argv[i]!)
      continue
    }
    const next = argv[i + 1]
    if (switches.includes(name) || next === undefined || next.startsWith("--")) {
      flags[name] = true
      continue
    }
    flags[name] = next
    ;(lists[name] ??= []).push(next)
    i++
  }
  return { positional, flags, lists }
}

/** The text flag `value` was given (`--epic seo`:  `"seo"`);  `undefined` for none, or a bare `--epic`. */
export function stringFlag(value: string | true | undefined): string | undefined {
  return typeof value === "string" ? value : undefined
}

/** `word`'s name as a flag, camelCased as `parseVerbArgs()` keys it (`--dry-run`:  `dryRun`);  `undefined`:  no flag. */
export function flagName(word: string): string | undefined {
  const match = FLAG.exec(word)
  return match ? camelCase(match[1]!) : undefined
}

/**
 * How long a time flag says, in ms:  `8h`, `30m`, `90s`, `1h30m`, or a bare number, of SECONDS (`3300`).
 * - the ONE reader of every wait's times:  `--timeout` (`ask`, `choices`, `comments` and `inbox wait`), `--every` and
 *   `--max` (`park wait`, `agents wait`);  each takes a unit, or seconds, as it took one or the other before
 * - throws `EpicCommandError` (a usage error) for anything else:  a time it can't read never waits for ever
 *   (`--max 2h` was `NaN` seconds, a deadline that never came)
 */
export function duration(text: string): number {
  const value = String(text).trim()
  if (SECONDS.test(value)) return Number(value) * 1000
  const parts = [...value.matchAll(TIME_PART)]
  if (!parts.length) throw new CliError(`a duration is like 8h, 30m, 1h30m, or seconds (3300):  '${text}'`)
  return parts.reduce((total, [, amount, unit]) => total + Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS], 0)
}

////////////////
// ## Sessions
////////////////

/** A live Claude Code session, its registry record (`ClaudeHome.liveSessions()`):  `ClaudeHome`'s, named here too. */
export type { RunningSession }

/**
 * One saved session, summarized from its transcript `~/.claude/projects/<slug>/<id>.jsonl` -- `Sessions.summarize()`.
 * - `title`:  the last `custom-title` (`/rename`), else the last `ai-title`, else the first prompt (60 chars)
 * - `cwd`:  the LATEST folder it worked in, so a session that moved into a worktree shows the worktree
 * - `last`:  the transcript's mtime, in ms
 */
export type SessionSummary = {
  id: string
  title: string
  /** titled by hand (`custom-title`) */
  named: boolean
  prompt: string | null
  entrypoint: string | null
  cwd: string | null
  last: number
}

/**
 * A session found by name or worktree -- `Sessions.named()`.
 * - `last`:  ISO timestamp of its last line with a `cwd`
 */
export type NamedSession = {
  id: string
  /** its `custom-title`, or `-` */
  title: string
  last: string
  cwd: string | null
}

/**
 * What a transcript says about who it is and where it worked -- `TranscriptIndex.scan()`.
 * - `titles`:  every `customTitle` in it (a `/rename`), distinct, escapes undone
 * - `cwds`:  every `cwd` in it (folders the session worked in), distinct, escapes undone
 * - the same strings `Sessions.named()` looks for, so a transcript with none of them can't be a match
 */
export type TranscriptFacts = {
  titles: string[]
  cwds: string[]
}

/**
 * What another session has been doing -- `Sessions.digest()`.
 * - `prompts`:  what Owen typed, oldest first (`when` is the timestamp's first 16 chars)
 * - `pending`:  an `AskUserQuestion` still waiting, with its options
 */
export type TranscriptDigest = {
  path: string
  prompts: { when: string; text: string }[]
  lastReply: string | null
  pending: PendingQuestion[] | null
}

/** One question of a waiting `AskUserQuestion` (`Transcript.pendingQuestion()`):  `Transcript`'s, named here too. */
export type { PendingQuestion }

/**
 * A running session, as `/worktrees` sees it -- `Sessions.live()`.
 * - `name`:  its title
 * - `agent`:  what `ListAgents` and `SendMessage` call it (the registry's name)
 * - `checkout`:  `main checkout`, `worktree <name>` or `(not in git)`
 * - `folder`:  `cwd` inside it (`""` at its root)
 * - `state`:  the registry's `busy` / `idle` / `waiting`,
 *   or `hung` for `busy` with no transcript write for `Stock.SILENT_MINUTES`
 * - `question`:  an `AskUserQuestion` with no answer after it, `questionMin` minutes ago
 * - `this`:  the session that ran the command
 * - `used`:  it has a transcript (got a prompt)
 */
export type LiveSession = {
  id: string
  name: string
  agent: string | null
  pid: number
  cwd: string
  inRepo: boolean
  where: string | null
  checkout: string
  branch: string
  folder: string
  state: string
  waitingFor: string | null
  lastActive: string
  silentMin: number
  question: string | null
  questionMin: number
  this: boolean
  used: boolean
}

/** Entrypoints of LOCAL sessions:  web, cloud and SDK sessions are left out. */
export const LOCAL_ENTRYPOINTS = new Set(["cli", "claude-vscode", "claude-desktop"])

/** Where an entrypoint runs, in words. */
export const ENTRYPOINT_PLACES: Record<string, string> = {
  cli: "terminal",
  "claude-vscode": "VS Code",
  "claude-desktop": "Desktop"
}

/**
 * The icon a session's title starts with, saying where its work stands (Owen, 2026-10-07):
 * - 🚧 under way:  `/isolate`, `/epic <name>`, `/unpark`, `/epic resume` (the prompt gate, `PromptGate`)
 * - 📅 a future epic written down (`/epic future`)
 * - ✅ merged (`epic session done`)
 * - from its epic's state (`epic session icons`;  `spell-epic/list/EpicState`):
 *   - 🚨 errors (every phase done, items need Owen)
 *   - ⏸️ paused (phases left, untouched for days)
 */
export const TITLE_ICONS = { active: "🚧", future: "📅", done: "✅", errors: "🚨", paused: "⏸️" } as const

/** Icons titles may still start with from before:  😴, sleeping (gone 2026-10-10:  epic `airplane` P8). */
const OLD_TITLE_ICONS = ["😴"]

/** `title` without its leading icon (`TITLE_ICONS`, or an old one):  `🚧 seo` -> `seo`;  the name its work goes by. */
export function bareTitle(title: string): string {
  const icons = [...Object.values(TITLE_ICONS), ...OLD_TITLE_ICONS].join("|")
  return title.replace(new RegExp(`^(?:${icons})\\s*`, "u"), "")
}

////////////////
// ## Worktrees and parked work
////////////////

/**
 * The checkout holding a folder -- `Worktrees.checkoutOf()`.
 * - `label`:  `main checkout` or `worktree <name>`;  outside git, `root` is `undefined` and `label` `(not in git)`
 * - `inside`:  the folder relative to the root, `""` at the root
 */
export type CheckoutPlace = { root?: string; label: string; branch: string; inside: string }

/**
 * Where session / worktree / plan `name` stands -- `Worktrees.nameStatus()`.
 * - `ahead`:  commits on branch `name` not in `main`
 * - `merged`:  the branch had commits of its own (its reflog moved past "Created") and all are in `main` now
 * - `plan`:  its epic page folder
 * - `planDone`:  every phase done
 * - `finished`:  `merged` or `planDone`, `why` saying which (`park wait` adds "worktree removed", "session exited")
 */
export type NameStatus = {
  name: string
  worktree: string | null
  branch: string | null
  ahead: number
  merged: boolean
  plan: string | null
  planDone: boolean
  sessions: { id: string; title: string | null; running: boolean; pid: number | null }[]
  finished: boolean
  why: string | null
}

/**
 * What an epic page's state is read from (`spell-epic/list/EpicState` `EpicFacts`) -- `Worktrees.planFacts()`.
 * - `phases`:  each phase's status
 * - `updated`, `future`, `standing`:  the page's
 * - `urgent`:  the ids of the items that need Owen
 */
export type PlanFacts = {
  phases: string[]
  updated: string | null
  future: boolean
  standing: boolean
  urgent: string[]
}

/**
 * An epic page's summary, from the `epic` tool's `summaries` (`summary --json` per file).
 * - `error` when it couldn't read the doc
 * - only the fields read here
 */
export type PlanSummary = {
  title?: string
  phases?: { n?: number; name?: string; status?: string; estimate?: string }[]
  error?: string
}

/** Something `/wait-for ?` offers:  a worktree, an epic, or a running session. */
export type WaitCandidate = { name: string; label: string }

/**
 * A parked worktree's note, `.claude/worktrees/<name>/PARKED-<name>.md`.
 * - `state`:  from line 1, `<!-- park: <state> -->`:  `parked`, `waiting:<other>`, `resumed`
 * - `stopped`:  the first line under "## Where it stopped"
 */
export type ParkedNote = { name: string; file: string; state: string; stopped: string }

/**
 * What `Parking.waitFor()` ends with.
 * - `code`:
 *   - `0` finished (with the status, `why` saying which)
 *   - `2` time's up
 *   - `3` nothing by that name
 */
export type WaitResult = { code: number; status?: NameStatus; message?: string }

/**
 * What `epic worktree move` did to one worktree, or would do (`Worktrees.move()`).
 * - `from` / `to`:  its old folder (`.claude/worktrees/<name>`) and its new one, beside the repo
 * - `links`:  each shared link made again, `<path> <action>` (`Shared.link()`);  `[]` on a dry run
 * - `sessionFolder`:  what linking its saved-session folder did (`SessionFolders.link()`), `null` when not asked to
 * - `window`:  whether it has a window file, still naming the old folder
 */
export type MoveReport = {
  name: string
  from: string
  to: string
  links: string[]
  sessionFolder: string | null
  window: boolean
}

/** A worktree under `.claude/worktrees/` with no running session in it. */
export type IdleWorktree = { path: string; branch: string }

////////////////
// ## Taking stock
////////////////

/**
 * Everything open in the repo, grouped -- `Stock.take()`, `epic status`.
 * - `groups`:  item keys per group, in report order
 */
export type StockReport = {
  generated: string
  main: string
  /** every running session on the machine, in this repo or not */
  sessions: LiveSession[]
  /** this repo's worktrees with no session in them */
  idle: IdleWorktree[]
  groups: Record<StockGroup, string[]>
  items: StockItem[]
}

/**
 * - `active` -- in process:  a session working in it, or touched in the last `Stock.RECENT_HOURS`
 * - `stalled` -- hung or parked:
 *   - `/park`ed, waiting, a busy session gone silent, a question nobody answered
 *   - work untouched for `Stock.RECENT_HOURS`, a plan with phases left and nothing working on it
 * - `dead` -- nothing of value left:
 *   - merged or empty worktrees and branches
 *   - sessions idle for `Stock.STALE_HOURS` (`Stock.RECENT_HOURS` outside any worktree)
 *   - window files with no worktree
 */
export type StockGroup = "active" | "stalled" | "dead"

/**
 * One thing open:  a worktree, branch, plan, session, stash or window file.
 * - `key`:  `<kind>:<name>`
 * - `why`:  the reasons for its group, in words
 * - `actions`:  what `/worktrees` offers
 *   - each action's `commands` are shell lines to run one by one from the MAIN checkout
 *   - `[]` for a step Claude takes (open a session, `/wtf`, ask)
 * - the other fields depend on `kind`:
 *   - worktree / branch:  `worktree` ... `morning`
 *     - `unique`:  commits whose patch isn't in `main` yet (not squashed in)
 *     - `everCommitted`:  its reflog moved past "Created"
 *   - plan:  `plan`, `planDone`
 *   - session:  `lastTouched`
 *   - stash:  `stash` (sha)
 *   - window:  `file`
 */
export type StockItem = {
  key: string
  kind: "worktree" | "branch" | "plan" | "session" | "stash" | "window"
  name: string
  group?: StockGroup
  why?: string[]
  actions?: StockAction[]
  sessions: LiveSession[]
  worktree?: string | null
  branch?: string | null
  ahead?: number
  unique?: number
  behind?: number
  dirty?: number
  everCommitted?: boolean
  lastCommit?: string | null
  lastTouched?: string | null
  plan?: string | null
  planDone?: boolean
  parked?: { state: string; stopped: string; file: string } | null
  morning?: { file: string } | null
  stash?: string
  file?: string
}

/** Something `/worktrees` can do about an item. */
export type StockAction = { id: string; label: string; commands: string[] }

////////////////
// ## Shared content
////////////////

/**
 * The shared-content manifest (`Shared.configOf()`).
 * - `main`:  the main checkout
 * - `dir`:  the shared repo, absolute
 * - `links`:  folders every checkout links, relative to a checkout's root
 * - `worktrees`:  every folder holding worktrees, absolute, the new place first
 *   (`.epic/config.json5`'s `worktreesFolder`, then the old `.claude/worktrees` when it moved:
 *   `EpicConfig.worktreesFolders`)
 */
export type SharedConfig = { main: string; dir: string; worktrees: string[]; links: string[] }

/**
 * One link in one checkout:  its `state` (`Shared.linkState()`), and what `Shared.link()` did about it (`action`).
 */
export type LinkReport = {
  path: string
  state: "ok" | "tracked" | "missing" | "real" | "dangling" | "elsewhere" | "dropped"
  action?: "ok" | "tracked" | "linked" | "replaced" | "diverged" | "no-shared" | "unlinked"
}

/**
 * `epic shared status`.
 * - `dir`, `exists`, `isRepo`:  the shared repo
 * - `dirty`:  files not committed
 * - `last`:  its newest commit
 * - `checkouts`:  each checkout (`.` the main one) and its links
 */
export type SharedStatus = {
  dir: string
  exists: boolean
  isRepo: boolean
  dirty: number
  last: string
  checkouts: { checkout: string; links: LinkReport[] }[]
}

/**
 * What `SharedMigration` does with one shared file of a worktree.
 * - `action`:
 *   - `skip`:  the worktree didn't change it, or matches
 *   - `take`:  the worktree's copy goes into the shared repo
 *   - `delete`:  the worktree deleted it
 *   - `union`:  a log changed on both sides:  merged, `text`
 *   - `rebuild`:  a built file changed on both sides:  the shared copy stays, its tool runs again
 *   - `conflict`
 */
export type FoldReport = {
  file: string
  action: "skip" | "take" | "delete" | "union" | "rebuild" | "conflict"
  text?: string
}

/**
 * `epic shared migrate`'s answer.
 * - `folds`:  every shared file's fate
 * - `conflicts`:  the files that stopped it
 * - `done`:  it went through (not a dry run, no conflicts)
 */
export type MigrateReport = {
  worktree: string
  branch: string
  folds: FoldReport[]
  conflicts: string[]
  done: boolean
}

////////////////
// ## Merging main
////////////////

/**
 * One generated output family, and the command that rebuilds it from the merged source:
 * a line of a checkout's `.epic/generators.json5` (`MainMerge.generatorsOf()`).
 * - `outputs`:  globs, relative to a checkout's root (`path.matchesGlob()`);  a folder is `<folder>/**`
 * - `run`:  the command, run in `cwd` (relative to a checkout's root)
 */
export type Generator = { name: string; outputs: string[]; cwd: string; run: string[] }

/**
 * A snapshot entry the merge's regenerated `.snap` holds with a value NEITHER side had:  nobody reviewed it.
 * - `file`:  the `.snap`, relative to the checkout;  `keys`:  its `exports[...]` names
 */
export type SnapshotReview = { file: string; keys: string[] }

/**
 * What `epic worktree patch` did in one checkout (`CheckoutPatches.patch()`).
 * - `checkout`:  its folder
 * - `applied`:  each patch that did something there, and what (`copied .ignore from main`, `ran yarn install`);  with
 *   `--dry-run`, what it would do
 * - `failed`:  each patch that failed there, and why;  the others still ran
 * - `busy`:  another run was patching it, so nothing was done
 */
export type PatchReport = {
  checkout: string
  applied: { id: string; did: string[] }[]
  failed: { id: string; error: string }[]
  busy?: boolean
}

/**
 * `epic worktree merge-main`'s answer.
 * - `result`:
 *   - `up-to-date`:  `main` is already in the branch
 *   - `fast-forward`:  the branch had nothing of its own, so it moved to `main`
 *   - `merged`:  a merge commit, generated files regenerated
 *   - `conflicts`:  stopped mid-merge on `conflicts`;  resolve them, `git add` them, then `--continue`
 * - `untracked`:  conflicted files the merged `.gitignore` ignores (generated output no longer committed),
 *   taken out of the index and left on disk
 * - `regenerated`:  each generator that ran, and the files it staged
 * - `review`:  snapshot entries to show Owen (`SnapshotReview`)
 * - `unstaged`:  files a generator changed outside its `outputs`, left for a person to look at
 */
/**
 * What `epic merge` did in one repo (`Requests.merge()`, `mergeEach()`).
 * - `repo`:  a multi-repo top's repo, its folder name;  left out for a single repo
 * - `base`:  its base branch;  `commits`:  the ones brought onto it, oldest first
 * - `ditched`:  the stray files moved aside first (`StrayFiles`), from the checkout's root;  `ditchedTo`:  where
 */
export type MergeResult = { repo?: string; base: string; commits: string[]; ditched: string[]; ditchedTo?: string }

/**
 * `Requests.merge()`'s options.
 * - `ditch`:  move aside the few hand-made stray files too, once Owen said so (`StrayFiles.ASK_LIMIT`)
 * - `ditched`:  the folder they go into;  default a new one in the epic home (`StrayFiles.folderFor()`)
 * - `label`:  how its errors name the checkout
 */
export type MergeOptions = { ditch?: boolean; ditched?: string; label?: string }

export type MergeMainReport = {
  branch: string
  result: "up-to-date" | "fast-forward" | "merged" | "conflicts"
  conflicts: string[]
  untracked: string[]
  regenerated: { name: string; files: string[] }[]
  review: SnapshotReview[]
  unstaged: string[]
  /** a multi-repo top's epic worktree (`MainMerge.runAll()`):  the repo's folder name;  left out for a single repo */
  repo?: string
  /** a multi-repo top's:  why this repo's merge couldn't start or go on (the others went on) */
  error?: string
  /**
   * the install command run after it, because it changed a lockfile (`MainMerge.reinstall()`):  `command`, the
   * `lockfiles` changed, whether it worked;  left out when none changed
   */
  installed?: { command: string; lockfiles: string[]; ok: boolean }
  /** generated files left uncommitted, moved aside before the merge (`StrayFiles`);  `ditchedTo`:  where */
  ditched?: string[]
  ditchedTo?: string
  /**
   * Spell UI's old names the branch brought in, rewritten after the merge by `spell ui rename --write`
   * (`MainMerge.renameOldNames()`, epic `epic-engine` I143), committed on their own:
   * each file, from the kit's root, with its renames (`<ui-docs-toc> => <ui-toc> (2)`);  left out when none
   */
  renamed?: { file: string; renames: string[] }[]
  /** why that step didn't run, in one line:  a kit with no `spell ui rename`, a failure;  never fails the merge */
  renameSkipped?: string
}

/**
 * One repo's checkout in an epic's worktree, as it stands (`Worktrees.repoStates()`, `epic worktree repos`):
 * - `repo`:  its folder name;  `worktree`:  its folder in the epic's worktree;  `made`:  that's there
 * - `branch`:  the epic's branch, `null` when the repo has none;  `base`:  its base branch
 * - `ahead` / `behind`:  commits the branch has that `base` lacks, and the other way
 * - `dirty`:  `git status --short`'s lines in its worktree
 */
export type RepoState = {
  repo: string
  worktree: string
  made: boolean
  branch: string | null
  base: string
  ahead: number
  behind: number
  dirty: string[]
}

////////////////
// ## Requests
////////////////

/**
 * One request Owen sent an epic from another session (`Requests`):  its `request.md`, read.
 * - `from`:  the sending session's title and id, `🚧 python (83d39e12)`
 * - `at`:  when, local time to the minute
 * - `status`:  `new` until the epic's session files it, then `filed`
 * - `filed`:  where it went, `P7 · Comment Threads`
 * - `phase`:  the stable id of the phase it was filed into (`p-comment-threads`), when it went into one
 *   (epic `epic-engine` I4):  `epic requests` shows that phase's number TODAY, so a phase inserted ahead of it moves
 *   it along (`Requests.shown()`);  `filed` says the number it had then
 * - `text`:  Owen's words, verbatim
 * - `context`:  what the sender was looking at
 * - `images`:  file names beside `request.md`
 */
export type EpicRequest = {
  id: string
  epic: string
  from: string
  at: string
  status: string
  filed?: string
  phase?: string
  text: string
  context?: string
  images: string[]
}

/**
 * What `Requests.send()` takes.
 * - `epic`:  the epic it goes to
 * - `text`:  Owen's words, kept verbatim
 * - `from`:  the sending session's id (`CLAUDE_CODE_SESSION_ID`);  its pasted images come from its transcript
 * - `images`:  how many of the newest images Owen pasted to keep (0:  none)
 * - `context`:  what the sender was looking at:  a page, a file, an item id
 */
export type SendRequestProps = {
  epic: string
  text: string
  from?: string
  images?: number
  context?: string
}

/**
 * What `Requests.send()` did.
 * - `folder`:  where the request was written
 * - `receivers`:  the epic's running sessions, to tell (`SendMessage`);  none:  open its window
 * - `fromEpic`:  the sender IS one of the epic's sessions:  it takes the request up itself
 */
export type SentRequest = {
  request: EpicRequest
  folder: string
  receivers: RunningSession[]
  fromEpic: boolean
}

/** One image from a transcript:  its type (`image/png`) and its bytes, base64. */
export type PastedImage = {
  mediaType: string
  data: string
}

////////////////
// ## Tools
////////////////

/**
 * How the `epic` command runs one of its tools, a script in a child `node` -- `EpicTools.run()`:  the kit's
 * `ToolSpec` (`spell/cli`, its `runTool()`'s), plus whose copy of the script runs.
 * - `tool`:  the script, relative to a checkout's root
 * - `tsx`:  the `tsconfig.json` it runs under `tsx` with, relative to a checkout's root
 *   - none:  plain `node`
 * - `cwd`:  the folder it runs in, relative to the DATA checkout's root (the caller's)
 *   - none:  the caller's folder
 *   - the docs tools run at the caller's checkout's root (spell-app's `yarn workspace` ran them in `packages/epics`),
 *     and print paths relative to it
 * - `code`:  whose copy of the script runs
 *   - `own` (default):  the one beside the running `epic`, so every checkout runs ONE copy of the epic code
 *   - `caller`:  the caller's checkout's, for a tool that serves that checkout (`serve`)
 * - `package`:  the package the script is in, by its names, as the caller's checkout's install resolves the first one
 *   there (`firstPackageDir()`):  `tool` and `tsx` are relative to its folder, and `code` is moot
 *   (the page server, in the kit:  `spell`, or `spell-kit` in a checkout from before epic `repo-split` P17)
 */
export type ToolSpec = Prettify<CliToolSpec & { code?: "own" | "caller"; package?: string[] }>

////////////////
// ## Lines of code
////////////////

/**
 * One row's sizes in `epic loc` (`LinesOfCode`):  its code files and its doc files, by extension.
 * - `codeLines`:  non-blank lines left once comments are taken out;  `codeChars`:  their characters, indentation
 *   trimmed
 * - `allLines`, `allChars`:  the same code files, whole
 * - `docLines`, `docChars`:  the doc files, whole
 */
export type LocCounts = {
  /** code files */
  files: number
  /** non-blank lines, comments taken out */
  codeLines: number
  /** characters on those lines, indentation trimmed */
  codeChars: number
  /** every line of the code files */
  allLines: number
  /** every character of the code files */
  allChars: number
  /** doc files */
  docFiles: number
  /** every line of the doc files */
  docLines: number
  /** every character of the doc files */
  docChars: number
}

/** `LocCounts`' keys, in the tables' column order. */
export const LOC_COLUMNS = [
  "files",
  "codeLines",
  "codeChars",
  "allLines",
  "allChars",
  "docFiles",
  "docLines",
  "docChars"
] as const satisfies readonly (keyof LocCounts)[]

/** One repo scanned by `epic loc`. */
export type LocRepo = {
  /** its name:  its main checkout's folder name (`spell`, `spell-ui`) */
  name: string
  /** its checkout scanned, absolute */
  folder: string
  /** every file that isn't a test */
  code: LocCounts
  /** its tests (`LocSettings` `tests`) */
  tests: LocCounts
  /** `code`, split into its rows (`src/cli/`, `docs/`, `other`), by name;  tests are in no row */
  rows: Record<string, LocCounts>
}

/** A file `epic loc` left out though its extension counts, and why:  only the ones a person might have written. */
export type LocSkipped = {
  /** `<repo>/<path>` */
  file: string
  /** `generated`:  a GENERATED marker on its first line;  `bundled`:  lines over 400 characters on average */
  why: "generated" | "bundled"
}

/** What `epic loc` found:  `LinesOfCode.scan()`. */
export type LocScan = {
  /** the day it ran, `YYYY-MM-DD` */
  scanned: string
  /** the checkout scanned:  the top repo's */
  root: string
  /** the top repo first, then each installed child repo, lowest first */
  repos: LocRepo[]
  /** the files left out for what's in them (`LocSkipped`) */
  skipped: LocSkipped[]
  /** files left out as `linguist-generated` (git's attribute), a count */
  generatedByAttribute: number
}

/**
 * How one repo is counted, in `guides/loc/loc.json5` (`LocSettingsFile`):  every key a list.
 * - `rows`:  the folders that are rows, as globs from the repo's root (`src/*`:  each folder of `src/`);  the files
 *   right in a `<folder>/*` pattern's folder are its `<folder>/ (top files)` row;  the rest roll up into `other`
 * - `rowsWithoutSrc`:  `rows` for a repo with no `src/`
 * - `tests`:  globs of test files;  in no row, but their own line
 * - `code`, `docs`:  the extensions counted, each with its dot
 * - `leaveOut`:  globs of files never counted (vendored, packed, snapshots ...)
 */
export type LocSettings = {
  rows: string[]
  rowsWithoutSrc: string[]
  tests: string[]
  code: string[]
  docs: string[]
  leaveOut: string[]
}

/**
 * `guides/loc/loc.json5`, in the content folder:  `LocSettings` per repo, by folder name, `"*"` for every repo.
 * - a repo's own entry is laid over `"*"`'s key by key:  a key it names replaces `"*"`'s, but `leaveOut`, which adds
 *   to it
 */
export type LocSettingsFile = { repos: Record<string, Partial<LocSettings>> }

/** `epic loc`'s settings when the file has none:  what the first scan counted (`experiments/scan.mjs`). */
export const LOC_DEFAULTS: LocSettings = {
  rows: ["src/*", "docs"],
  rowsWithoutSrc: ["*"],
  tests: ["tests/**", "**/*.test.*", "**/*.spec.*"],
  code: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".py", ".spell"],
  docs: [".md", ".html"],
  leaveOut: [
    "**/__pack/**",
    "vendor/**",
    ".yarn/**",
    "**/node_modules/**",
    "**/*.min.js",
    "**/*.min.css",
    "app/static/**",
    "**/*.snap",
    "**/__snapshots__/**",
    "**/*.generated.*"
  ]
}

/**
 * The LOC tables' columns, in groups:  the group's name over its columns (`Code`), each column's short name under it
 * (`Files`), and the `LocCounts` key it shows.
 * - Owen, 2026-10-25:  no doc chars ("I don't care about 'doc chars'"), and a two-row header
 * - the numbers (`--json`) keep every key
 */
export const LOC_TABLE: { group: string; columns: { key: keyof LocCounts; name: string; title: string }[] }[] = [
  {
    group: "Code",
    columns: [
      { key: "files", name: "Files", title: "code files" },
      { key: "codeLines", name: "Lines", title: "non-blank lines, comments taken out" },
      { key: "codeChars", name: "Chars", title: "characters on those lines, indentation trimmed" }
    ]
  },
  {
    group: "All",
    columns: [
      { key: "allLines", name: "Lines", title: "every line of the code files" },
      { key: "allChars", name: "Chars", title: "every character of the code files" }
    ]
  },
  {
    group: "Doc",
    columns: [
      { key: "docFiles", name: "Files", title: "doc files" },
      { key: "docLines", name: "Lines", title: "every line of the doc files" }
    ]
  }
]

////////////////
// ## Working time (epic `epic-engine` P41)
////////////////

/** A stretch of time, `[from, to)`, in ms since the epoch:  Claude at work (`ActiveTime`). */
export type TimeSpan = {
  /** when it began, ms */
  from: number
  /** when it ended, ms */
  to: number
}

/**
 * How long Claude worked on something -- `WorkTime.ofPhase()`, `WorkTime.ofAgent()`.
 * - `minutes`:  the working time, rounded;  parallel work counted once (wall clock)
 * - `agents`:  the background agents it counted, by full name (`epic-engine-p40`)
 * - `sessions`:  the sessions it counted, by id (only when no agent of its own did the work)
 */
export type WorkMeasure = {
  minutes: number
  agents: string[]
  sessions: string[]
}
