import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import type { RunAnswers, RunColumn, RunProgress, RunRow } from "spell/server/runs/runs.types"

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
 *   - its progress:  the latest line, then every line, folded
 *   - the table:  the command's columns' heads and the answer's, then a row per thing to answer, `<epic-run-row>`,
 *     each given its row, the columns and Owen's answer so far
 *   - the Send bar, stuck to the window's bottom:  where the answers stand, the last save, Send and its countdown
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

  /** The table's columns, for its grid:  the command's, each its share, then the answer's, wider. */
  get tableStyle(): Record<string, string> {
    return { [COLUMNS_PROPERTY]: `repeat(${this.runColumns.length}, minmax(min-content, 1fr)) minmax(14em, 2fr)` }
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
        <Show when={this.progress.length}>{this.progressBlock()}</Show>
        <Show when={this.rows.length}>{this.table()}</Show>
        {this.bar()}
      </div>
    )
  }

  /** The progress:  the latest line, then every line, folded. */
  private progressBlock(): JSX.Element {
    return (
      <div class={PROGRESS} part={this.partForName("progress")}>
        <p class={LATEST}>{this.progressLine(this.progress.at(-1)!)}</p>
        <Show when={this.progress.length > 1}>
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

/** Classes of the shadow markup. */
const WHO = "who"
const DESCRIPTION = "description"
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

/** The Send group's state for each fill of the form's (`<epic-send-buttons>` `state`). */
const SEND_STATES_OF: Record<SendFill, SendState> = { rest: "idle", pending: "unsent", sent: "sent" }
