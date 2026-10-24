import { spawn } from "node:child_process"
import { existsSync, mkdirSync, rmSync, statSync, watch, type FSWatcher } from "node:fs"
import { delimiter, join } from "node:path"

import { SRV } from "spell/server"

import {
  CommandRunError,
  RUN_FILES,
  RUN_PAGE_PATH,
  RUNS_FOLDER,
  WAITING_HEARTBEAT_MS,
  WAITING_STALE_MS,
  type RunAnswers,
  type RunOpenProps,
  type RunPage,
  type RunRow,
  type RunStatus,
  type RunWaitProps,
  type RunWaitResult,
  type RunWaiting
} from "./runs.types"

/****************
 * ### `CommandRun`
 * A COMMAND RUN (epic `epic-engine` P23):  a command that stops to ask Owen on a page, waits for his answers,
 * and carries on with them.  The first is spell-parser's translator, with the names it drafted.
 *
 * ```ts
 * const run = SRV.CommandRun.open({ root, command: "spell translate todos --to es", title: "Names for todos",
 *   columns: [{ key: "english", label: "English" }], answerLabel: "Spanish", rows })
 * await run.show()                                        // the page, in VS Code's side bar or a browser
 * run.progress("names:  41 drafted in 6 s")
 * const answers = await run.wait({ timeoutMs: 30 * 60_000 })
 * if (!answers.timedOut) use(answers.rows)                // per row id:  { outcome, value, ticked }
 * run.finish()
 * ```
 *
 * - A run is a folder of the content folder, `pages/runs/<id>/`;  its files and their shapes are `runs.types.ts`,
 *   the contract with the page side (spell-epic's `<epic-run>` and its route module, which serve `/runs/<id>/`).
 *   - `run.json5`:  written ONLY here, whole, under its `FileLock`
 *   - `answers.json5`:  read ONLY here;  the page writes it
 *   - `waiting.json5`:  the heartbeat, while `wait()` runs
 * - Knows nothing of the page's elements, nor of any child repo:  it writes files, and reads them back.
 * - Node only:  node's own modules, and of the kit `DataFile`, `FileLock`, `contentFolderOf()`, `isProcessAlive()`,
 *   `openBrowser()`, all through `SRV`.
 ****************/
export class CommandRun {
  /** the run's id:  its folder's name */
  readonly id: string

  /** the run's folder, absolute:  `<content folder>/pages/runs/<id>` */
  readonly folder: string

  /** the folder of the checkout it was opened from:  which page server shows it (`show()`) */
  readonly root: string

  constructor({ id, folder, root }: CommandRunProps) {
    this.id = id
    this.folder = folder
    this.root = root
  }

  /**
   * Open a new run:  make its folder, and write its `run.json5`, status `open`.
   * - its id:  `props.id`, else a slug of the command and the local time (`spell-translate-20261023-1912`),
   *   `-2`, `-3` ... added when that folder is there
   * - throws `CommandRunError`:  no content folder (`no-content-folder`), or a given `id` already there (`run-exists`)
   * - SIDE EFFECT:  makes the folder, writes `run.json5`
   * - static:  a factory, since the id is found while the folder is made
   */
  static open({ root, id: _id, ...asked }: RunOpenProps): CommandRun {
    const runs = join(CommandRun.contentFolderOrDie(root), RUNS_FOLDER)
    mkdirSync(runs, { recursive: true })
    const id = _id ?? CommandRun.newId(runs, asked.command)
    const folder = join(runs, id)
    if (_id !== undefined) {
      if (existsSync(folder))
        throw new CommandRunError(`CommandRun.open():  run ${id} is there already;  pass another id`, {
          cause: { kind: "run-exists", folder }
        })
      mkdirSync(folder)
    }
    const run = new CommandRun({ id, folder, root })
    run.write({ id, ...asked, progress: [], status: "open", updated: new Date().toISOString() })
    return run
  }

  /**
   * The run `id` opened before, from checkout `root`:  for a command picking its run back up, and for tests.
   * - throws `CommandRunError`:  no content folder (`no-content-folder`), or no `run.json5` there (`no-run`)
   * - static:  a factory
   */
  static at(root: string, id: string): CommandRun {
    const folder = join(CommandRun.contentFolderOrDie(root), RUNS_FOLDER, id)
    if (!existsSync(join(folder, RUN_FILES.page)))
      throw new CommandRunError(`CommandRun.at():  no run ${id} in ${folder}`, { cause: { kind: "no-run", folder } })
    return new CommandRun({ id, folder, root })
  }

  /**
   * Whether a command is waiting on the run in `folder` now:  its heartbeat is fresh (`WAITING_STALE_MS`), and its
   * process still runs.  For the page side, which says "... is waiting" while it is.
   * - NEVER throws:  an unreadable heartbeat is nobody waiting
   * - static:  it needs only the folder, not a run
   */
  static isWaiting(folder: string): boolean {
    try {
      const waiting = SRV.DataFile.read<RunWaiting>(join(folder, RUN_FILES.waiting))
      if (!waiting) return false
      return Date.now() - Date.parse(waiting.seen) < WAITING_STALE_MS && SRV.isProcessAlive(waiting.pid)
    } catch {
      return false
    }
  }

  ////////////////
  // ## The page
  ////////////////

  /** the page's URL path, `/runs/<id>/` */
  get path(): string {
    return `${RUN_PAGE_PATH}${encodeURIComponent(this.id)}/`
  }

  /** the page's URL on the page server at `base` (`http://127.0.0.1:4747`) */
  url(base: string): string {
    return `${base.replace(/\/$/, "")}${this.path}`
  }

  /**
   * What the run asks, as `run.json5` holds it now.
   * - throws `CommandRunError` (`no-run`) once its folder is gone
   */
  get page(): RunPage {
    const page = SRV.DataFile.read<RunPage>(this.pageFile)
    if (!page)
      throw new CommandRunError(`CommandRun.page:  no run.json5 in ${this.folder}`, {
        cause: { kind: "no-run", folder: this.folder }
      })
    return page
  }

  /**
   * Show the page to Owen;  returns where:  its URL, else its path, when nothing could open it.
   * - an `epic` program on the `PATH` (spell-epic's):  `epic pages open <run folder> --review`, the side bar's Review
   *   tab;  run as a PROGRAM, never imported, since the kit imports no child repo
   * - else a page server running for this checkout (its main checkout's first):  its URL, in the browser
   *   (`openBrowser()`).  It starts none:  without spell-epic, no server answers `/runs/`.
   * - else nothing opens:  the caller prints the path
   * - NEVER throws:  best effort
   */
  async show(): Promise<string> {
    try {
      if (CommandRun.onPath("epic")) {
        const child = spawn("epic", ["pages", "open", this.folder, "--review"], { stdio: "ignore", detached: true })
        child.on("error", (error) => console.error(`CommandRun.show():  epic pages open failed:  ${error.message}`))
        child.unref()
        return this.path
      }
      const main = SRV.checkoutOf(this.root)?.main
      for (const root of new Set([main, this.root].filter((each) => each !== undefined))) {
        const running = await new SRV.PidFile(root).status()
        if (!running) continue
        const url = this.url(running.base)
        SRV.openBrowser(url)
        return url
      }
    } catch (error) {
      console.error(`CommandRun.show():  ${(error as Error).message}`)
    }
    return this.path
  }

  ////////////////
  // ## Changing it
  ////////////////

  /**
   * Replace the rows.  Owen's answers stay:  they're kept by row id, in `answers.json5`, so a row he answered keeps
   * his answer while it's still there.
   * - SIDE EFFECT:  rewrites `run.json5`, under its lock
   */
  setRows(rows: RunRow[]): this {
    this.edit((page) => ({ ...page, rows }))
    return this
  }

  /**
   * Add a progress line, `text` (`names:  41 drafted in 6 s`), after the others.
   * - SIDE EFFECT:  rewrites `run.json5`, under its lock
   */
  progress(text: string): this {
    this.edit((page) => ({ ...page, progress: [...page.progress, { at: new Date().toISOString(), text }] }))
    return this
  }

  /**
   * End the run:  its page says so (`done`:  the command read the answers;  `stopped`:  it gave up), and nobody waits.
   * - SIDE EFFECT:  rewrites `run.json5`, removes `waiting.json5`
   */
  finish(status: Exclude<RunStatus, "open"> = "done"): this {
    this.edit((page) => ({ ...page, status }))
    rmSync(this.waitingFile, { force: true })
    return this
  }

  ////////////////
  // ## Answers
  ////////////////

  /**
   * Owen's answers so far, as `answers.json5` holds them:  per row id, `{ outcome, value, ticked, at }`, and `sent`
   * once he pressed Send.
   * - a row he hasn't answered has no entry:  `unanswered()` lists those rows
   * - no file yet:  `{ rows: {} }`
   * - throws `SyntaxError` on a file that won't read
   */
  answers(): RunAnswers {
    const answers = SRV.DataFile.read<RunAnswers>(this.answersFile)
    return { ...answers, rows: answers?.rows ?? {} }
  }

  /** The rows of `run.json5` with no answer in `answers` (default:  the answers now). */
  unanswered(answers: RunAnswers = this.answers()): RunRow[] {
    return this.page.rows.filter((row) => !answers.rows[row.id])
  }

  /**
   * Wait for Owen to press Send:  resolves with his answers once `answers.json5` holds a `sent` from this wait's
   * start on;  or, at `timeoutMs`, with the answers so far and `timedOut: true`.
   * - returns rather than throwing on the time limit:  a command just says so, and carries on or stops
   * - `signal` aborted:  rejects with its `reason`
   * - while it waits, `waiting.json5` (the heartbeat:  pid, command, seen, until) is rewritten every
   *   `WAITING_HEARTBEAT_MS`, so the page says the command is waiting (`isWaiting()`)
   * - watches the folder (`fs.watch`), and looks every `POLL_MS` too, for file systems that don't tell
   * - SIDE EFFECT:  writes `waiting.json5`, and ALWAYS removes it when the wait ends:  by answer, time, abort,
   *   or the process exiting (`exit`, `SIGINT`, `SIGTERM`)
   */
  wait({ timeoutMs, signal }: RunWaitProps): Promise<RunWaitResult> {
    const start = Date.now()
    const until = new Date(start + timeoutMs).toISOString()
    const command = this.page.command
    return new Promise<RunWaitResult>((resolve, reject) => {
      let watcher: FSWatcher | undefined
      const timers: NodeJS.Timeout[] = []

      //////
      // the heartbeat, and its removal however the wait ends
      const beat = () =>
        SRV.DataFile.write(this.waitingFile, {
          pid: process.pid,
          command,
          seen: new Date().toISOString(),
          until
        } satisfies RunWaiting)
      const removeHeartbeat = () => rmSync(this.waitingFile, { force: true })
      const onSignal = (name: NodeJS.Signals) => {
        end()
        // ours was the only listener, which kept the process alive:  raise it again, for node's own handling
        if (process.listenerCount(name) === 0) process.kill(process.pid, name)
      }
      const end = () => {
        for (const timer of timers) clearInterval(timer)
        watcher?.close()
        signal?.removeEventListener("abort", onAbort)
        process.off("exit", removeHeartbeat)
        process.off("SIGINT", onSignal)
        process.off("SIGTERM", onSignal)
        removeHeartbeat()
      }

      //////
      // how it ends
      const check = () => {
        let answers: RunAnswers
        try {
          answers = this.answers()
        } catch {
          return // half-written by a writer that doesn't rename:  look again at the next change
        }
        if (answers.sent && Date.parse(answers.sent) >= start) {
          end()
          resolve({ ...answers, timedOut: false })
        }
      }
      const onAbort = () => {
        end()
        reject(signal?.reason)
      }
      if (signal?.aborted) return reject(signal.reason)

      beat()
      process.on("exit", removeHeartbeat)
      process.once("SIGINT", onSignal)
      process.once("SIGTERM", onSignal)
      signal?.addEventListener("abort", onAbort, { once: true })
      timers.push(setInterval(beat, WAITING_HEARTBEAT_MS), setInterval(check, CommandRun.POLL_MS))
      timers.push(
        setTimeout(() => {
          end()
          resolve({ ...this.answers(), timedOut: true })
        }, timeoutMs)
      )
      try {
        watcher = watch(this.folder, (_event, name) => {
          if (!name || name === RUN_FILES.answers) check()
        })
        watcher.on("error", () => watcher?.close())
      } catch {
        // no watching here:  the poll still looks
      }
      check()
    })
  }

  ////////////////
  // ## Its files
  ////////////////

  /** `run.json5` */
  private get pageFile(): string {
    return join(this.folder, RUN_FILES.page)
  }

  /** `answers.json5` */
  private get answersFile(): string {
    return join(this.folder, RUN_FILES.answers)
  }

  /** `waiting.json5` */
  private get waitingFile(): string {
    return join(this.folder, RUN_FILES.waiting)
  }

  /** Write `page` as `run.json5`, under its lock.  SIDE EFFECT. */
  private write(page: RunPage): void {
    SRV.FileLock.run(this.pageFile, () => SRV.DataFile.write(this.pageFile, page))
  }

  /** Read `run.json5`, `change` it, stamp `updated`, write it back:  all under its lock.  SIDE EFFECT. */
  private edit(change: (page: RunPage) => RunPage): void {
    SRV.FileLock.run(this.pageFile, () =>
      SRV.DataFile.write(this.pageFile, { ...change(this.page), updated: new Date().toISOString() })
    )
  }

  ////////////////
  // ## Static helpers
  ////////////////

  /** How often `wait()` looks at `answers.json5` besides watching it, ms:  static, the same for every run. */
  static POLL_MS = 2_000

  /** Checkout `root`'s content folder;  throws `CommandRunError` (`no-content-folder`) when it names none. */
  private static contentFolderOrDie(root: string): string {
    const content = SRV.contentFolderOf(root)
    if (!content)
      throw new CommandRunError(
        `CommandRun:  ${root} names no content folder;  set contentFolder in .epic/config.json5, or SPELL_SHARED_DIR`,
        { cause: { kind: "no-content-folder", folder: root } }
      )
    return content
  }

  /**
   * A new run's id in folder `runs`, made there at once (`mkdirSync` fails on one that's there, so two commands
   * never share one):  `<slug of command>-<YYYYMMDD-HHMM>`, then `-2`, `-3` ...
   * - the slug:  the command's words before its first flag, at most 4
   * - SIDE EFFECT:  makes the folder
   */
  private static newId(runs: string, command: string): string {
    const words = command.split(/\s+/).filter(Boolean)
    const flag = words.findIndex((word) => word.startsWith("-"))
    const slug =
      (flag < 0 ? words : words.slice(0, flag))
        .slice(0, 4)
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "run"
    const now = new Date()
    const two = (n: number) => String(n).padStart(2, "0")
    const time = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}`
    for (let count = 1; ; count++) {
      const id = `${slug}-${time}${count === 1 ? "" : `-${count}`}`
      try {
        mkdirSync(join(runs, id))
        return id
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      }
    }
  }

  /** Whether a program `name` is on the `PATH`. */
  private static onPath(name: string): boolean {
    return (process.env.PATH ?? "")
      .split(delimiter)
      .filter(Boolean)
      .some((dir) => statSync(join(dir, name), { throwIfNoEntry: false })?.isFile() ?? false)
  }
}

/** `new CommandRun()`'s props:  made by `CommandRun.open()` and `CommandRun.at()`. */
export type CommandRunProps = {
  /** the run's id */
  id: string
  /** its folder, absolute */
  folder: string
  /** the checkout it was opened from */
  root: string
}
