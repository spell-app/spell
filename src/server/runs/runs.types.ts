/**
 * The shapes of a COMMAND RUN (epic `epic-engine` P23, request r18):  a command that stops to ask Owen on a page, and
 * carries on with his answers.  The kit's `CommandRun` writes and reads these files;  spell-epic's route module and
 * `<epic-run>` page serve and draw them.  This file is the contract between the two:  change both sides together.
 * - Types, the few names both sides share, and the kit side's own:  node-safe, no imports.
 *   - The kit side's (`CommandRun`'s answers, its wait's result, its error) are at the end:  the page never needs them.
 *
 * A run is ONE folder in the content folder, `pages/runs/<run id>/`, holding:
 * - `run.json5`:  what the command asks (`RunPage`):  its title, columns, rows, progress lines;  only the command
 *   writes it
 * - `answers.json5`:  what Owen answered (`RunAnswers`):  per row, saved as he gives it;  only the page writes it
 * - `waiting.json5`:  the command's heartbeat while it waits (`RunWaiting`);  gone once the wait ends
 * - served at `/runs/<run id>/` (`RUN_PAGE_PATH`) by spell-epic's route module, from its template
 */

/** The run folders' folder, in the content folder:  scratch, like details pages. */
export const RUNS_FOLDER = "pages/runs"

/** Where a run's page is served, `/runs/<run id>/`:  spell-epic's route module answers it. */
export const RUN_PAGE_PATH = "/runs/"

/** The files of a run's folder. */
export const RUN_FILES = { page: "run.json5", answers: "answers.json5", waiting: "waiting.json5" } as const

/** How long a heartbeat counts after it was last written:  older, or its process gone, nobody is waiting. */
export const WAITING_STALE_MS = 90_000

/** How often a waiting command writes its heartbeat. */
export const WAITING_HEARTBEAT_MS = 30_000

/** What a command asks:  `run.json5`. */
export type RunPage = {
  /** the run's id:  its folder's name, `<command slug>-<time>` (`spell-parser-translate-20261023-1912`) */
  id: string
  /** the command, as Owen would type it:  `spell parser translate todos --to es` */
  command: string
  /** the page's title:  `Names for todos, in Spanish` */
  title: string
  /** a line or two under the title:  what's asked, and what happens after Send */
  description?: string
  /** the columns each row shows, in order, before its answer:  `English`, `Gender`, `From` */
  columns: RunColumn[]
  /** the label of the answer's column:  `Spanish` */
  answerLabel: string
  /** the rows to answer, in order */
  rows: RunRow[]
  /** progress lines, oldest first, as the command writes them */
  progress: RunProgress[]
  /**
   * the run's passes, as DATA, for the page's status card (epic `epic-engine` P25):  in order, the current one last
   * - none:  the page shows only `progress`
   */
  passes?: RunPass[]
  /**
   * the effort Owen may pick on the page (P25), the translator's `--effort`:  the choices, and the one the command
   * started with;  none:  no picker
   */
  effort?: RunEffortChoice
  /** rows the command has taken (acted on), by row id:  when, ISO (P25);  the page marks them */
  taken?: Record<string, string>
  /** `open` while the command can still take answers;  `done` once it read them;  `stopped` if it gave up */
  status: RunStatus
  /** when the command last wrote this file, ISO */
  updated: string
}

/**
 * A run's state, as its page shows it.
 * - `open`:  it can still take answers;  `done`:  it read them and finished;  `stopped`:  it gave up;
 *   `timed-out`:  its wait ran out (P25)
 */
export type RunStatus = "open" | "done" | "stopped" | "timed-out"

/** One column a row shows. */
export type RunColumn = {
  /** the key of its value in each row's `cells` */
  key: string
  /** its header */
  label: string
}

/** One thing to answer:  a drafted name, a fixed line. */
export type RunRow = {
  /** stable across updates:  an answer is kept by it */
  id: string
  /** the columns' values, by column key:  plain text */
  cells: Record<string, string>
  /** what the command proposes:  accepting it answers with this */
  value: string
  /** other values to pick one of instead (a few at most);  none:  accept or type over */
  alternatives?: string[]
  /** a tick box on the row, the command's own label:  `Use for every project`;  none:  no tick box */
  tick?: { label: string; checked?: boolean }
  /** more about the row, folded under it:  plain text lines (the lines a name appears in) */
  details?: string[]
}

/** One progress line. */
export type RunProgress = {
  /** when, ISO */
  at: string
  /** what:  `names:  41 drafted in 6 s` */
  text: string
}

/** One pass of a run, for the status card (P25):  `names:  41 drafted in 6 s`, `lines:  212 of 380`. */
export type RunPass = {
  /** its name:  `names`, `lines`, `fix-ups` */
  name: string
  /** `running` while it runs;  `done` once it's over */
  state: "running" | "done"
  /** how far:  `done` of `total` (`212` of `380`);  either may be missing */
  done?: number
  total?: number
  /** the calls it made (to Claude, say) */
  calls?: number
  /** how long it took, or has taken so far, in ms */
  ms?: number
  /** the effort it ran at */
  effort?: string
  /** when it started, ISO */
  started: string
}

/** The effort Owen may pick for a run (P25). */
export type RunEffortChoice = {
  /** the choices, in order:  `["fast", "balanced", "best"]` */
  choices: string[]
  /** the one the command started with */
  initial: string
  /** the picker's label:  `Effort` */
  label?: string
}

/** What Owen answered:  `answers.json5`. */
export type RunAnswers = {
  /** per row id, his answer, saved as he gives it (not only at Send) */
  rows: Record<string, RunAnswer>
  /** when he pressed Send, ISO;  none:  not yet */
  sent?: string
  /** the effort he picked on the page (P25), one of `RunPage.effort.choices`;  none:  the command's `initial` */
  effort?: string
}

/** One row's answer. */
export type RunAnswer = {
  /** `accepted` the proposal, `typed` over it, or `picked` an alternative */
  outcome: RunOutcome
  /** the value it comes to:  the proposal, what he typed, or the alternative */
  value: string
  /** the row's tick box, when it has one */
  ticked?: boolean
  /** when, ISO */
  at: string
}

/** How a row was answered. */
export type RunOutcome = "accepted" | "typed" | "picked"

/** The heartbeat of a command waiting on its page:  `waiting.json5`. */
export type RunWaiting = {
  /** the waiting process */
  pid: number
  /** the command, as `RunPage.command` */
  command: string
  /** its last heartbeat, ISO */
  seen: string
  /** when the wait gives up, ISO */
  until: string
}

////////////////
// ## The kit side's own:  `CommandRun`
////////////////

/** `CommandRun.open()`'s props:  what the page asks, and where. */
export type RunOpenProps = Pick<
  RunPage,
  "command" | "title" | "description" | "columns" | "answerLabel" | "rows" | "effort"
> & {
  /** a folder of the checkout:  the run goes in its content folder (`contentFolderOf()`) */
  root: string
  /** the run's id, its folder's name;  default:  a slug of `command`, then the local time (`RunPage.id`) */
  id?: string
}

/** `CommandRun.wait()`'s props. */
export type RunWaitProps = {
  /** longest wait, ms:  then it ends, `timedOut` */
  timeoutMs: number
  /** ends the wait early:  `wait()` rejects with its `reason` */
  signal?: AbortSignal
}

/** What `CommandRun.wait()` comes back with:  the answers so far, and whether Owen sent them or time ran out. */
export type RunWaitResult = RunAnswers & {
  /** `true`:  the time limit came first, and `sent` is not this wait's */
  timedOut: boolean
}

/** `CommandRun.answersAsTheyCome()`'s props (P25). */
export type RunAnswersProps = {
  /** longest it listens, ms;  default `CommandRun.ANSWERS_TIMEOUT_MS` (4 hours) */
  timeoutMs?: number
  /** ends it early:  the loop just ends, `aborted` */
  signal?: AbortSignal
}

/** One row's answer as `CommandRun.answersAsTheyCome()` gives it:  new, or changed since it last gave that row's. */
export type RunRowAnswer = {
  /** the row's id, as `RunRow.id` */
  rowId: string
  /** his answer now */
  answer: RunAnswer
}

/**
 * How `CommandRun.answersAsTheyCome()` ended, its generator's return value:
 * - `sent`:  Owen pressed Send;  `timed-out`:  its time limit;  `aborted`:  its `signal`;
 *   `finished`:  the command called `finish()`
 */
export type RunAnswersEnd = "sent" | "timed-out" | "aborted" | "finished"

/** What `CommandRun.startPass()` / `updatePass()` / `endPass()` take:  how far a pass has got (P25). */
export type RunPassFacts = Pick<RunPass, "done" | "total" | "calls">

/**
 * Thrown by `CommandRun` when it can't find or make a run;  `kind` says why:
 * - `no-content-folder`:  the checkout names no content folder (`.epic/config.json5`'s `contentFolder`)
 * - `no-run`:  `CommandRun.at()` found no `run.json5` in the run's folder
 * - `run-exists`:  `CommandRun.open()` was given an `id` whose folder is there already
 */
export class CommandRunError extends Error {
  declare cause: CommandRunErrorCause | undefined
  /** why it was thrown */
  get kind() {
    return this.cause?.kind
  }
}
CommandRunError.prototype.name = "CommandRunError"

/** `CommandRunError`'s cause:  why, and the folder it was about. */
export type CommandRunErrorCause = { kind: "no-content-folder" | "no-run" | "run-exists"; folder: string }
