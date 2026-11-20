/**
 * The runbooks' shapes (`spell/cli/runbook`):  a runbook's steps, what's kept of a walk through one, and what the walk
 * does outside itself.
 * - Types and constants only.
 */

/** What a runbook's file name ends in:  `netbox-demo.runbook.md`. */
export const RUNBOOK_EXTENSION = ".runbook.md"

/** The folder runbooks are found in, in each of the kit's folders, and in each epic's folder. */
export const RUNBOOKS_FOLDER = "runbooks"

/** Sets where walks' progress is kept, e.g. a test's temporary folder. */
export const RUNBOOK_PROGRESS_SETTING = "SPELL_RUNBOOKS_DIR"

/** One step of a runbook:  a `##` heading, and what's under it. */
export type RunbookStep = {
  /** its place, from 1 */
  number: number
  /** its heading's words:  what the walk calls it, and how its progress is kept */
  title: string
  /** its heading's line in the file, from 1 */
  line: number
  /** what it says to do, as written (Markdown), without its `ask` and `sh` blocks, its Should and its If not */
  words: string
  /** the first web address its words name:  the walk offers to open it */
  link?: string
  /** what you should see once it's done:  its `Should:` paragraph */
  should?: string
  /** what to do when it doesn't work:  its `If not:` paragraph */
  ifNot?: string
  /** what the walk does for it, in order:  none, and it's done by hand */
  actions: RunbookAction[]
}

/** Something a step has the walk do:  ask for a value, or run commands. */
export type RunbookAction = RunbookAsk | RunbookRun

/** A value to type in:  an ```` ```ask NAME [secret] ```` block, its text the question. */
export type RunbookAsk = {
  kind: "ask"
  /** the value's name:  the environment variable the later commands get it as */
  name: string
  /** hidden as it's typed, and kept with the secrets (`SRV.Secrets`), never with the progress */
  secret: boolean
  /** what's asked */
  question: string
  /** the block's line, from 1 */
  line: number
}

/** Commands the walk runs:  an ```` ```sh ```` block, and the Output fold after it, if any. */
export type RunbookRun = {
  kind: "run"
  /** the block's text, run by `bash` */
  commands: string
  /** what they should print (`...` for what varies), from the Output fold */
  output?: string
  /** the block's line, from 1 */
  line: number
}

/** What's kept of a walk, in `~/.spell/runbooks/<name>.json5`:  never a secret. */
export type RunbookRecord = {
  /** the runbook's file, where it was walked from */
  file: string
  /** when the walk started, ISO:  what `fresh until` counts from */
  startedAt: string
  /** each step's state, by its title:  one not here is still to do */
  steps: Record<string, "done" | "skipped">
  /** each plain value typed in, by its name */
  values: Record<string, string>
  /** the step it stopped at, and why:  a failed command, or you stopped it */
  stoppedAt?: { step: string; why: "failed" | "stopped" }
}

/** What a walk does outside itself:  a test's stand-in does none of it. */
export type RunbookTools = {
  /** run `commands` with `bash` in `folder`, `env` their environment;  each piece of output as it comes, then the status */
  run(
    commands: string,
    options: { folder: string; env: NodeJS.ProcessEnv; onOutput: (text: string) => void }
  ): Promise<number>
  /** open `url` in the default browser */
  open(url: string): void
  /** now */
  now(): Date
}
