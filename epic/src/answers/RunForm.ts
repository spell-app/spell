import type { RunAnswer, RunAnswers, RunOutcome, RunPage, RunRow, RunStatus } from "spell/server/runs/runs.types"

import { PlanDates } from "spell-epic/dates"
import { ServerLink, sentence, type ServerLinkOptions } from "spell-epic/review"

import { ANSWER_RETRY_MS, RUN_POLL_MS, RUN_SAVE_MS, RUNS_API, type SendFill } from "./answers.types"

/****************
 * ### `RunForm`
 * A RUN PAGE's answers, as `<epic-run>` holds them (epic `epic-engine` P23):  a command asked Owen through the kit's
 * `SRV.CommandRun`, and waits for his Send.
 * - One per page (`forPage()`), for the run its `<epic-run run>` names.
 * - Reads the run (`load()`):  `GET /api/runs/<id>` (`src/tools/runRoutes.ts`), what the command asks (`page`), what
 *   Owen answered so far (`answers`), and whether a command waits on it now (`isWaiting`).
 * - Each row's answer is SAVED AS HE GIVES IT (`answer()`), not only at Send:  the command's steering reads the same
 *   file as answers arrive (P24).
 *   - kept here at once, so the page shows it;  posted `RUN_SAVE_MS` (half a second) after he stops typing, a pick or
 *     a tick at once;  one save at a time, in order
 *   - a save that fails says so (`saveError`), and tries again every `ANSWER_RETRY_MS` (3s) until one goes through:
 *     a page server back on its address takes it, its new token too (`ServerLink`)
 * - Send (`send()`):  what's waiting saved first, then `POST /api/runs/<id>/send`, which stamps `sent`;  the waiting
 *   command wakes on it.  Again whenever he likes:  the page never locks.
 * - Kept fresh (`watch()`):  the run's files changing (the live client's `spell-server:file`), the page coming into
 *   view, and every `RUN_POLL_MS` (30s) for the waiting state, whose heartbeat goes stale with no file changing.
 *   - a reload never takes back what he gave and hasn't saved yet:  his rows win over the server's
 * - Node-safe at import:  no `window` / `document` touched until `forPage()` or `watch()`;  `fetch` comes in through
 *   `ServerLinkOptions`, so tests stub it.
 * - Position in the import graph:  `spell-epic/review` (the link), `spell-epic/dates`, its peers, and the kit's run
 *   types (`spell/server/runs/runs.types`, types only).  NEVER imports Solid or Spell UI.
 ****************/
export class RunForm {
  /** What the command asks, once read;  `undefined` before. */
  page: RunPage | undefined

  /** What Owen answered, by row id, his own as he gives them;  `sent` once he pressed Send. */
  answers: RunAnswers = { rows: {} }

  /** A command waits on the run now. */
  isWaiting = false

  /** Why the run couldn't be read, as a sentence;  `""` for none. */
  loadError = ""

  /** Why the last save failed, as a sentence;  `""` for none:  it tries again every 3s. */
  saveError = ""

  /** When the last save went through, `14:04`;  `""` before one. */
  savedAt = ""

  /** Why the last Send failed, as a sentence;  `""` for none. */
  sendError = ""

  /** A Send on its way. */
  isSending = false

  /** Bumped on every change:  readers compare it. */
  version = 0

  /** The answers given and not saved yet, by row id. */
  private readonly unsaved = new Map<string, RunAnswer>()

  /** The save waiting for typing to stop. */
  private timer: ReturnType<typeof setTimeout> | undefined

  /** The next try after a save failed. */
  private retryTimer: ReturnType<typeof setTimeout> | undefined

  /** The saves queued, one at a time. */
  private saving: Promise<void> = Promise.resolve()

  /** Called on every change. */
  private readonly listeners = new Set<() => void>()

  /** The page server, as answers go to it. */
  private readonly link: ServerLink

  constructor(
    readonly runId: string,
    private readonly options: ServerLinkOptions
  ) {
    this.link = new ServerLink(options)
  }

  ////////////////
  // ## The page's form
  ////////////////

  /** The page's form, once made. */
  private static current: RunForm | undefined

  /** The page's form for run `runId`, made on the first call (browser only). */
  static forPage(runId: string): RunForm {
    if (RunForm.current?.runId !== runId) RunForm.current = new RunForm(runId, ServerLink.pageOptions())
    return RunForm.current
  }

  /** Make `form` the page's from now on (`undefined`:  the next `forPage()` makes one):  tests. */
  static adopt(form: RunForm | undefined) {
    RunForm.current = form
  }

  ////////////////
  // ## What it shows
  ////////////////

  /** The run's API, `/api/runs/<id>`. */
  get api(): string {
    return `${RUNS_API}/${encodeURIComponent(this.runId)}`
  }

  /** The run's rows;  none before it's read. */
  get rows(): RunRow[] {
    return this.page?.rows ?? []
  }

  /** The run's state:  `open` while the command can take answers. */
  get status(): RunStatus {
    return this.page?.status ?? "open"
  }

  /** How many rows Owen answered, of how many. */
  get counts(): { answered: number; total: number } {
    return { answered: this.rows.filter((row) => this.answers.rows[row.id]).length, total: this.rows.length }
  }

  /** Something he gave after the last Send (or no Send yet). */
  get isStale(): boolean {
    const sent = this.answers.sent
    if (!sent) return true
    return Object.values(this.answers.rows).some((answer) => answer.at > sent)
  }

  /** Where Send stands, by the fill rule:  `sent` once sent with nothing given since;  else `pending`. */
  get fill(): SendFill {
    if (!this.page) return "rest"
    return this.isStale ? "pending" : "sent"
  }

  /** The words beside Send:  how many answered, and where the Send stands. */
  get stateLine(): string {
    const { answered, total } = this.counts
    const sent = this.answers.sent
    const counted = `${answered} of ${total} answered`
    if (!sent) return `${counted} · not sent`
    const when = PlanDates.clock(new Date(sent))
    return this.isStale ? `${counted} · changes since Send ${when}` : `${counted} · sent ${when}`
  }

  ////////////////
  // ## Answering
  ////////////////

  /**
   * Row `rowId` answered:  `outcome`, its `value`, its tick;  kept at once, saved `RUN_SAVE_MS` later (`now`:  at once,
   * a pick or a tick).
   * - an answer equal to the one kept changes nothing
   */
  answer(
    rowId: string,
    { outcome, value, ticked }: { outcome: RunOutcome; value: string; ticked?: boolean },
    now = false
  ) {
    const before = this.answers.rows[rowId]
    if (before && before.outcome === outcome && before.value === value && before.ticked === ticked) return
    const answer: RunAnswer = { outcome, value, at: new Date().toISOString(), ...(ticked !== undefined && { ticked }) }
    this.answers = { ...this.answers, rows: { ...this.answers.rows, [rowId]: answer } }
    this.unsaved.set(rowId, answer)
    this.notify()
    clearTimeout(this.timer)
    if (now) void this.flush()
    else this.timer = setTimeout(() => void this.flush(), RUN_SAVE_MS)
  }

  /** Save every answer given and not saved yet, one at a time;  resolves once they're through (or failed). */
  flush({ keepalive = false }: { keepalive?: boolean } = {}): Promise<void> {
    clearTimeout(this.timer)
    this.timer = undefined
    this.saving = this.saving.then(() => this.saveUnsaved(keepalive))
    return this.saving
  }

  /** Post each unsaved answer;  a failure keeps it, says why, and tries again in `ANSWER_RETRY_MS`. */
  private async saveUnsaved(keepalive: boolean): Promise<void> {
    for (const [rowId, answer] of Array.from(this.unsaved)) {
      try {
        await this.link.post(`${this.api}/answer`, { rowId, ...answer }, { keepalive })
        if (this.unsaved.get(rowId) === answer) this.unsaved.delete(rowId)
        this.saveError = ""
        this.savedAt = PlanDates.clock(new Date())
      } catch (failure) {
        this.saveError = `Not saved:  ${sentence((failure as Error).message)}`
        clearTimeout(this.retryTimer)
        this.retryTimer = setTimeout(() => void this.flush(), ANSWER_RETRY_MS)
        this.notify()
        return
      }
    }
    this.notify()
  }

  /** Send:  everything given saved first, then `sent` stamped;  the waiting command wakes on it. */
  async send(): Promise<void> {
    if (this.isSending) return
    this.isSending = true
    this.sendError = ""
    this.notify()
    try {
      await this.flush()
      if (this.unsaved.size) throw new Error(this.saveError || "couldn't save every answer")
      const reply = (await this.link.post(`${this.api}/send`, {})) as { answers?: RunAnswers; waiting?: boolean }
      if (reply.answers) this.answers = this.withUnsaved(reply.answers)
      if (typeof reply.waiting === "boolean") this.isWaiting = reply.waiting
    } catch (failure) {
      this.sendError = `Couldn't send:  ${sentence((failure as Error).message)}`
    } finally {
      this.isSending = false
      this.notify()
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Read the run:  what's asked, what's answered (his unsaved answers kept over it), who waits.  NEVER rejects. */
  async load(): Promise<void> {
    try {
      const response = await this.options.fetch(this.api, { cache: "no-store" })
      const reply = (await response.json().catch(() => ({}))) as Partial<RunReply> & { error?: string }
      if (!response.ok || !reply.page) throw new Error(reply.error ?? `couldn't read the run (${response.status})`)
      this.page = reply.page
      this.answers = this.withUnsaved(reply.answers ?? { rows: {} })
      this.isWaiting = !!reply.waiting
      this.loadError = ""
    } catch (failure) {
      this.loadError = sentence((failure as Error).message)
    }
    this.notify()
  }

  /** `answers` from the server, with the answers given here and not saved yet laid over them. */
  private withUnsaved(answers: RunAnswers): RunAnswers {
    const rows = { ...answers.rows }
    for (const [rowId, answer] of this.unsaved) rows[rowId] = answer
    return { ...answers, rows }
  }

  /**
   * Keep the run fresh on `window`'s page;  returns the undo.
   * - a file of the run's folder changed (`spell-server:file`):  `run.json5` (rows, progress), `waiting.json5`
   * - the page coming into view, and every `RUN_POLL_MS` while it is:  a heartbeat goes stale with no file changing
   * - the page going away:  what's unsaved goes at once, as a request that outlives it
   */
  watch(window: Window): () => void {
    const { document } = window
    const folder = `/pages/runs/${this.runId}/`
    const onFile = (event: Event) => {
      const path = decodeURIComponent((event as CustomEvent<{ path?: string }>).detail?.path ?? "")
      if (path.includes(folder)) void this.load()
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void this.load()
    }
    const onHide = () => void this.flush({ keepalive: true })
    const timer = window.setInterval(onVisible, RUN_POLL_MS)
    window.addEventListener("spell-server:file", onFile)
    window.addEventListener("pagehide", onHide)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("spell-server:file", onFile)
      window.removeEventListener("pagehide", onHide)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }

  /** Call `listener` on every change;  returns the undo. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Something changed:  `version` up, every listener told. */
  private notify() {
    this.version++
    for (const listener of this.listeners) listener()
  }
}

/** What `GET /api/runs/<id>` answers (`runRoutes.ts`' `RunReply`):  a copy, since the pack never imports the tools. */
export type RunReply = { page: RunPage; answers: RunAnswers; waiting: boolean }
