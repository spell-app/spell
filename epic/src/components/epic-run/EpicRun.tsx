import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import type { RunAnswers, RunColumn, RunEffortChoice, RunPass, RunProgress, RunRow } from "spell/server/runs/runs.types"

import { PlanDates } from "spell-epic/dates"
import { RunForm, type SendFill } from "spell-epic/answers"
import { RUN_ANSWER, type RunAnswerDetail } from "spell-epic/components/epic-run-row/EpicRunRow.types"
import {
  SEND_ASKED,
  type SendAskedDetail,
  type SendState
} from "spell-epic/components/epic-send-buttons/EpicSendButtons.types"

import { epicRunVocabulary } from "./EpicRun.en"

import runCSS from "./EpicRun.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicRun`
 * The component behind `<epic-run>`:  a run page's body (epic `epic-engine` P23).  A command stopped to ask Owen,
 * through the kit's `SRV.CommandRun`, and waits for his Send.
 * - Draws the page's `RunForm` (`spell-epic/answers`), for the run `run` names:
 *   - who is waiting:  the command, with a green dot, while its heartbeat is fresh;  else why nobody is
 *   - the command's line about what it asks (`description`)
 *   - the STATUS CARD (epic `epic-engine` P25), when the command writes passes or offers an effort:
 *     - the effort picker:  the choices as a segmented control, the one the run is on chosen;  a change is saved at
 *       once (`RunForm.pickEffort()`), and takes effect at the next pass
 *     - a line per pass:  its name, a small bar and `212 of 380`, its calls, its time;  the running one in full ink,
 *       the done ones muted
 *   - its progress:  the latest line, then every line, folded;  with passes, only the fold (the card is the progress)
 *   - the table:  the command's columns' heads and the answer's, then a row per thing to answer, `<epic-run-row>`,
 *     each given its row, the columns and Owen's answer so far
 *   - the Send bar, stuck to the window's bottom:  where the answers stand, the last save, Send (no countdown:  `manual`;  a command carries on with exactly what was sent)
 *     (`<epic-send-buttons>`, blue by the fill rule), and why a read, save or Send failed
 * - A row's answer (`epic-run-answer`) goes to the form, which saves it:  a keystroke half a second later, a pick or a
 *   tick at once.
 * - SIDE EFFECT:  as it connects, the form reads the run, and keeps it fresh while the page is open
 *   (`RunForm.watch()`:  the run's files changing, every 30s for the waiting state);  what's unsaved goes as the
 *   page goes away.
 ****************/
export class EpicRun extends E.UIComponent<typeof epicRunVocabulary> {
  @E.proto static vocabulary = epicRunVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-run": runCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The page's form, for its run, once connected;  none in a server render, or with no `run`. */
  @E.state accessor form: RunForm | undefined = undefined

  /** The form's `version`, as last heard:  every getter below reads it, so the page redraws on each change. */
  @E.state accessor version = 0

  /** The page's clock, for a running pass's time:  set every second while one runs (`tickWhileRunning()`). */
  @E.state accessor now = Date.now()

  /** While connected:  the clock ticks every second while a pass runs in an open run;  returns the undo. */
  @E.onChange("isConnected")
  protected tickWhileRunning(isConnected: boolean) {
    if (!isConnected || isServer) return undefined
    return E.every(1, () => {
      if (this.form?.status === "open" && this.passes.some((pass) => pass.state === "running")) this.now = Date.now()
    })
  }

  /** The run's rows;  none before it's read. */
  get rows(): RunRow[] {
    void this.version
    return this.form?.rows ?? []
  }

  /** The run's columns. */
  get runColumns(): RunColumn[] {
    void this.version
    return this.form?.page?.columns ?? []
  }

  /** Owen's answers so far. */
  get answers(): RunAnswers {
    void this.version
    return this.form?.answers ?? { rows: {} }
  }

  /** The command's progress lines, oldest first. */
  get progress(): RunProgress[] {
    void this.version
    return this.form?.page?.progress ?? []
  }

  /** The run's passes, for the status card, the current one last. */
  get passes(): RunPass[] {
    void this.version
    return this.form?.passes ?? []
  }

  /** The effort Owen may pick;  none:  no picker. */
  get effortChoice(): RunEffortChoice | undefined {
    void this.version
    return this.form?.effortChoice
  }

  /** The effort the run is on:  his pick, else the command's. */
  get effort(): string {
    void this.version
    return this.form?.effort ?? ""
  }

  /** The run is over:  finished, stopped, or its wait ran out. */
  @E.cssState("ended")
  get isEnded(): boolean {
    void this.version
    return !!this.form?.page && this.form.status !== "open"
  }

  /** A command waits on the run now. */
  @E.cssState("waiting")
  get isWaiting(): boolean {
    void this.version
    return !!this.form?.isWaiting && this.form.status === "open"
  }

  /** Where Send stands, by the fill rule. */
  get fill(): SendFill {
    void this.version
    return this.form?.fill ?? "rest"
  }

  /** Sent, with nothing given since. */
  @E.cssState("sent")
  get isSent(): boolean {
    return this.fill === "sent"
  }

  /** Who is waiting:  the command's line, or why nobody is;  `""` before the run is read. */
  get whoLine(): { text: string; title: string } {
    void this.version
    const form = this.form
    if (!form?.page) return { text: "", title: "" }
    if (form.status === "done") return { text: this.translationForKey("finished"), title: "" }
    if (form.status === "stopped") return { text: this.translationForKey("stopped"), title: "" }
    if (form.status === "timed-out") return { text: this.translationForKey("timedOut"), title: "" }
    if (this.isWaiting)
      return { text: this.translationForKey("isWaiting"), title: this.translationForKey("waitingTip") }
    return { text: this.translationForKey("notRunning"), title: this.translationForKey("notRunningTip") }
  }

  /** The errors to show:  the run unread, an answer unsaved, a Send that failed. */
  get errors(): string[] {
    void this.version
    const form = this.form
    return form ? [form.loadError, form.saveError, form.sendError].filter(Boolean) : []
  }

  /**
   * The table's columns, for its grid:  the command's, each its share, then the answer's, wider;
   * on a phone the answer's FIRST (`NARROW_COLUMNS_PROPERTY`, Owen, 2026-10-23:  "Answer first on phones").
   */
  get tableStyle(): Record<string, string> {
    const commands = `repeat(${this.runColumns.length}, minmax(min-content, 1fr))`
    return {
      [COLUMNS_PROPERTY]: `${commands} minmax(14em, 2fr)`,
      [NARROW_COLUMNS_PROPERTY]: `minmax(12em, 2fr) ${commands}`
    }
  }

  /**
   * While connected:  the page's form for its run, read now and kept fresh, followed;  returns the undo.
   * - none without a `run`, or in a server render
   */
  @E.whileConnected
  protected followForm() {
    const runId = this.run
    if (isServer || !runId) return undefined
    const form = RunForm.forPage(runId)
    this.form = form
    this.version = form.version
    const unsubscribe = form.subscribe(() => (this.version = form.version))
    const unwatch = form.watch(window)
    void form.load()
    return () => {
      unwatch()
      unsubscribe()
    }
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.whoLine.text} fallback={<p class={WHO}>{this.translationForKey("loading")}</p>}>
          <p class={WHO} part={this.partForName("who")} title={this.whoLine.title}>
            <Show when={this.isWaiting}>
              <code>{this.form?.page?.command}</code>{" "}
            </Show>
            {this.whoLine.text}
          </p>
        </Show>
        <Show when={this.form?.page?.description}>
          <p class={DESCRIPTION} part={this.partForName("description")}>
            {this.form?.page?.description}
          </p>
        </Show>
        <Show when={this.passes.length || this.effortChoice}>{this.statusCard()}</Show>
        <Show when={this.progress.length}>{this.progressBlock()}</Show>
        <Show when={this.rows.length}>{this.table()}</Show>
        {this.bar()}
      </div>
    )
  }

  /** The status card:  the effort picker, when the run offers one, then a line per pass. */
  private statusCard(): JSX.Element {
    return (
      <section class={STATUS} part={this.partForName("status")} aria-label={this.translationForKey("status")}>
        <Show when={this.effortChoice}>{this.effortPicker()}</Show>
        <Show when={this.passes.length}>
          <ol class={PASSES} part={this.partForName("passes")}>
            <For each={this.passes} keyed={(pass) => pass.name}>
              {(pass) => this.passLine(pass)}
            </For>
          </ol>
        </Show>
      </section>
    )
  }

  /**
   * The effort picker:  its label, the choices as a segmented control (native radios, so the arrow keys move along
   * it), and when a change takes effect;  disabled once the run is over.
   */
  private effortPicker(): JSX.Element {
    const label = () => this.effortChoice?.label || this.translationForKey("effort")
    return (
      <div class={EFFORT} part={this.partForName("effort")}>
        <span class={EFFORT_LABEL} id={EFFORT_LABEL_ID}>
          {label()}
        </span>
        <div class={SEGMENTS} role="radiogroup" aria-labelledby={EFFORT_LABEL_ID}>
          <For each={this.effortChoice?.choices ?? []} keyed={false}>
            {(choice) => (
              <label class={SEGMENT}>
                <input
                  type="radio"
                  name={EFFORT_GROUP}
                  value={choice()}
                  checked={this.effort === choice()}
                  disabled={this.isEnded}
                  onChange={this.onEffort}
                />
                <span>{choice()}</span>
              </label>
            )}
          </For>
        </div>
        <Show when={!this.isEnded}>
          <span class={EFFORT_NOTE} part={this.partForName("effort-note")}>
            {this.translationForKey("effortNote")}
          </span>
        </Show>
      </div>
    )
  }

  /** One pass's line:  a check (done) or a dot (running), its name, a bar and how far, its calls, its time. */
  private passLine(pass: () => RunPass): JSX.Element {
    const isRunning = () => pass().state === "running"
    return (
      <li class={[PASS, { running: isRunning() }]} part={this.partForName("pass")}>
        <span class={PASS_NAME}>
          <Show when={isRunning()} fallback={<ui-icon name="check" label={this.translationForKey("passDone")} />}>
            <span class={DOT} role="img" aria-label={this.translationForKey("passRunning")} />
          </Show>
          {pass().name}
        </span>
        <span class={PASS_HOW_FAR}>
          <Show when={pass().total && isRunning()}>
            <progress max={pass().total} value={pass().done ?? 0} aria-label={pass().name} />
          </Show>
          <span class={NUMBER}>{this.howFar(pass())}</span>
        </span>
        <span class={NUMBER}>{this.callsText(pass().calls)}</span>
        <span class={NUMBER}>
          {this.timeText(isRunning() ? this.runningMs(pass()) : pass().ms)}
          <Show when={pass().effort}>
            <span class={PASS_EFFORT}> {this.translationForKey("passEffort", { effort: pass().effort! })}</span>
          </Show>
        </span>
      </li>
    )
  }

  /** How far a pass is:  `212 of 380`, `212` with no total, `""` with neither. */
  private howFar({ done, total }: RunPass): string {
    if (total !== undefined) return this.translationForKey("count", { done: String(done ?? 0), total: String(total) })
    return done === undefined ? "" : String(done)
  }

  /** A pass's calls:  `1 call`, `14 calls`;  `""` for none said. */
  private callsText(calls: number | undefined): string {
    if (calls === undefined) return ""
    return calls === 1 ? this.translationForKey("oneCall") : this.translationForKey("calls", { count: String(calls) })
  }

  /**
   * A running pass's time so far:  counted from its start by the page's clock (`now`), never less than the command
   * last wrote, so a slow pass reads as slow, not stuck (Owen, 2026-10-23:  "Tick it on the page").
   * - an ended run's:  as the command wrote it
   */
  private runningMs(pass: RunPass): number | undefined {
    if (this.form?.status !== "open") return pass.ms
    const started = Date.parse(pass.started)
    return Number.isNaN(started) ? pass.ms : Math.max(pass.ms ?? 0, this.now - started)
  }

  /** A pass's time:  `6 s`, `2 min 5 s`;  `""` for none said. */
  private timeText(ms: number | undefined): string {
    if (ms === undefined) return ""
    const total = Math.round(ms / 1000)
    if (total < 60) return this.translationForKey("seconds", { seconds: String(total) })
    return this.translationForKey("minutes", { minutes: String(Math.floor(total / 60)), seconds: String(total % 60) })
  }

  /**
   * The progress:  the latest line, then every line, folded.
   * - with passes, the status card IS the progress:  only the fold, closed (Owen, 2026-10-23:  "Fold them away")
   */
  private progressBlock(): JSX.Element {
    return (
      <div class={PROGRESS} part={this.partForName("progress")}>
        <Show when={!this.passes.length}>
          <p class={LATEST}>{this.progressLine(this.progress.at(-1)!)}</p>
        </Show>
        <Show when={this.progress.length > 1 || this.passes.length}>
          <details>
            <summary>{this.translationForKey("progress", { count: String(this.progress.length) })}</summary>
            <ol>
              <For each={this.progress} keyed={false}>
                {(line) => <li>{this.progressLine(line())}</li>}
              </For>
            </ol>
          </details>
        </Show>
      </div>
    )
  }

  /** One progress line:  its time, then what. */
  private progressLine(line: RunProgress): JSX.Element {
    return (
      <>
        <time class={TIME} datetime={line.at}>
          {PlanDates.clock(new Date(line.at))}
        </time>{" "}
        {line.text}
      </>
    )
  }

  /** The table:  the heads, then a row per thing to answer;  in a box it scrolls sideways in, when too narrow. */
  private table(): JSX.Element {
    return (
      <div class={SCROLL}>
        <div class={TABLE} part={this.partForName("table")} role="table" style={this.tableStyle}>
          <div class={HEAD} part={this.partForName("head")} role="row">
            <For each={this.runColumns} keyed={(column) => column.key}>
              {(column) => <span role="columnheader">{column().label}</span>}
            </For>
            <span role="columnheader">{this.form?.page?.answerLabel}</span>
          </div>
          <For each={this.rows} keyed={(row) => row.id}>
            {(row) => (
              <epic-run-row
                row={row()}
                columns={this.runColumns}
                answer={this.answers.rows[row().id]}
                answer-label={this.form?.page?.answerLabel ?? ""}
                taken={this.form?.takenAt(row().id)}
              />
            )}
          </For>
        </div>
      </div>
    )
  }

  /** The Send bar:  where the answers stand, the last save, Send;  the errors under it. */
  private bar(): JSX.Element {
    return (
      <div class={BAR} part={this.partForName("bar")}>
        <div class={BAR_ROW}>
          <span class={STATE} part={this.partForName("state")}>
            {this.stateLine()}
          </span>
          <Show when={this.savedTime()}>
            <span class={SAVED} part={this.partForName("saved")}>
              {this.translationForKey("saved", { time: this.savedTime() })}
            </span>
          </Show>
          <epic-send-buttons
            class={SEND}
            part={this.partForName("send")}
            state={SEND_STATES_OF[this.fill]}
            busy={this.isSending() ? "" : undefined}
            send-tip={this.translationForKey("sendTip")}
            manual=""
          />
        </div>
        <For each={this.errors} keyed={false}>
          {(error) => (
            <p class={ERROR} part={this.partForName("error")} role="alert">
              {error()}
            </p>
          )}
        </For>
      </div>
    )
  }

  /** Where the answers stand, for the bar. */
  private stateLine(): string {
    void this.version
    return this.form?.page ? this.form.stateLine : ""
  }

  /** The last save's time;  `""` before one, or while one failed. */
  private savedTime(): string {
    void this.version
    return this.form && !this.form.saveError ? this.form.savedAt : ""
  }

  /** A Send on its way. */
  private isSending(): boolean {
    void this.version
    return !!this.form?.isSending
  }

  ////////////////
  // ## Events
  ////////////////

  /** A row answered:  into the form, which saves it. */
  @E.on(RUN_ANSWER, { target: "renderRoot" })
  protected onAnswer(event: CustomEvent<RunAnswerDetail>) {
    event.stopPropagation()
    const { rowId, outcome, value, ticked, now } = event.detail
    this.form?.answer(rowId, { outcome, value, ticked }, now)
  }

  /** An effort picked:  into the form, which saves it at once. */
  private readonly onEffort = (event: Event) => {
    this.form?.pickEffort((event.currentTarget as HTMLInputElement).value)
  }

  /** Send asked for (`<epic-send-buttons>`):  a press, or the countdown running out. */
  @E.on(SEND_ASKED, { target: "renderRoot" })
  protected onSendAsked(event: CustomEvent<SendAskedDetail>) {
    event.stopPropagation()
    void this.form?.send()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicRun extends E.AttributeValues<typeof epicRunVocabulary> {}

/** The table's grid columns, per instance:  set on it, read by its sheet. */
const COLUMNS_PROPERTY = "--_epic-run-cols"

/** The same on a phone, the answer's first:  the sheet swaps them under its narrow-screen rule. */
const NARROW_COLUMNS_PROPERTY = "--_epic-run-cols-narrow"

/** Classes of the shadow markup. */
const WHO = "who"
const DESCRIPTION = "description"
const STATUS = "status"
const EFFORT = "effort"
const EFFORT_LABEL = "effort-label"
const EFFORT_NOTE = "effort-note"
const SEGMENTS = "segments"
const SEGMENT = "segment"
const PASSES = "passes"
const PASS = "pass"
const PASS_NAME = "pass-name"
const PASS_HOW_FAR = "pass-how-far"
const PASS_EFFORT = "pass-effort"
const DOT = "dot"
const NUMBER = "number"
const PROGRESS = "progress"
const LATEST = "latest"
const TIME = "time"
const SCROLL = "scroll"
const TABLE = "table"
const HEAD = "head"
const BAR = "bar"
const BAR_ROW = "bar-row"
const STATE = "state"
const SAVED = "saved"
const SEND = "send"
const ERROR = "error"

/** The effort label's id, naming the picker:  one per page, in this element's own shadow root. */
const EFFORT_LABEL_ID = "effort-label"

/** The effort radios' group. */
const EFFORT_GROUP = "effort"

/** The Send group's state for each fill of the form's (`<epic-send-buttons>` `state`). */
const SEND_STATES_OF: Record<SendFill, SendState> = { rest: "idle", pending: "unsent", sent: "sent" }
