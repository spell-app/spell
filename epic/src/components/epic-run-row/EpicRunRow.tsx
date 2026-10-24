import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import type { RunAnswer, RunColumn, RunOutcome, RunRow } from "spell/server/runs/runs.types"

import { epicRunRowVocabulary } from "./EpicRunRow.en"
import { RUN_ANSWER, type RunAnswerDetail } from "./EpicRunRow.types"

import runRowCSS from "./EpicRunRow.css?inline"

/****************
 * ### `EpicRunRow`
 * The component behind `<epic-run-row>`:  one row of a run page (epic `epic-engine` P23), a thing a command asks Owen
 * about, drawn by `<epic-run>` in its table.
 * - The command's columns first, each a cell of plain text (`columns`, `row.cells`).
 * - Then the answer cell:
 *   - the box, pre-filled with the command's proposal (`row.value`), or Owen's answer once he gave one;  one line of
 *     text that wraps and grows (Enter adds no line, a pasted line break goes)
 *   - changed from the proposal:  orange, with a round button putting the proposal back
 *   - the pick, when the command offers alternatives:  the proposal, then each one, as small pills;  the one the box
 *     holds is filled, so typing an alternative picks it too
 *   - the tick box, with the command's own label (`row.tick`)
 *   - its details, folded:  a line each (`row.details`)
 * - It draws what it's given and says what Owen did (`epic-run-answer`):  `<epic-run>` keeps and saves it.
 *   - the outcome comes from the value:  the proposal is `accepted`, an alternative `picked`, anything else `typed`
 ****************/
export class EpicRunRow extends E.UIComponent<typeof epicRunRowVocabulary> {
  @E.proto static vocabulary = epicRunRowVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-run-row": runRowCSS },
    delegatesFocus: false,
    aria: { role: "row" }
  } satisfies Partial<E.ElementSetup>

  /** What Owen typed here;  `undefined` until he types:  the answer given, else the proposal. */
  @E.state accessor typed: string | undefined = undefined

  /** The row, as given. */
  get runRow(): RunRow {
    return (this.row as RunRow | undefined) ?? { id: "", cells: {}, value: "" }
  }

  /** Owen's answer so far, as given;  none before he answered. */
  get runAnswer(): RunAnswer | undefined {
    return this.answer as RunAnswer | undefined
  }

  /** The columns to show, as given. */
  get runColumns(): RunColumn[] {
    return (this.columns as RunColumn[] | undefined) ?? []
  }

  /** What the box holds:  what he typed, else his answer, else the proposal. */
  get value(): string {
    return this.typed ?? this.runAnswer?.value ?? this.runRow.value
  }

  /** The pick's pills:  the proposal first, then each alternative not the same. */
  get choices(): string[] {
    const { value, alternatives = [] } = this.runRow
    return alternatives.length ? [value, ...alternatives.filter((each) => each !== value)] : []
  }

  /** The tick box's state:  his answer's, else the command's. */
  get isTicked(): boolean {
    return this.runAnswer?.ticked ?? !!this.runRow.tick?.checked
  }

  /** The box isn't the proposal. */
  @E.cssState("changed")
  get isChanged(): boolean {
    return this.value.trim() !== this.runRow.value
  }

  /** Owen answered it. */
  @E.cssState("answered")
  get isAnswered(): boolean {
    return !!this.runAnswer
  }

  /** How `value` answers the row:  the proposal, one of the alternatives, or typed. */
  outcomeOf(value: string): RunOutcome {
    if (value === this.runRow.value) return "accepted"
    return this.runRow.alternatives?.includes(value) ? "picked" : "typed"
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <div class={[this.rootClass, ROW_BOX]} part={this.partForName("base")}>
        <For each={this.runColumns} keyed={(column) => column.key}>
          {(column) => (
            <div class={CELL} part={this.partForName("cell")} role="cell">
              {this.runRow.cells[column().key] ?? ""}
            </div>
          )}
        </For>
        <div class={[CELL, ANSWER]} part={this.partForName("answer")} role="cell">
          {this.field()}
          <Show when={this.choices.length}>{this.picks()}</Show>
          <Show when={this.runRow.tick}>{this.tick()}</Show>
          <Show when={this.runRow.details?.length}>{this.details()}</Show>
        </div>
      </div>
    )
  }

  /** The box, and the round button putting the proposal back once it differs. */
  private field(): JSX.Element {
    return (
      <div class={FIELD}>
        <textarea
          class={BOX}
          part={this.partForName("box")}
          rows="1"
          spellcheck={false}
          autocomplete="off"
          aria-label={this.translationForKey("boxLabel", {
            label: this.answerLabel ?? "",
            first: this.firstCell
          })}
          value={this.value}
          onInput={this.onInput}
          onKeyDown={this.onKeyDown}
        />
        <Show when={this.isChanged}>
          <button
            type="button"
            class={RESET}
            part={this.partForName("reset")}
            aria-label={this.translationForKey("reset")}
            title={this.translationForKey("resetTip", { value: this.runRow.value })}
            onClick={this.onReset}
          >
            <ui-icon name="clock rotate left" />
          </button>
        </Show>
      </div>
    )
  }

  /** The pick:  a pill per choice, the one the box holds filled;  native radios, so the arrow keys move along it. */
  private picks(): JSX.Element {
    return (
      <div
        class={PICKS}
        part={this.partForName("picks")}
        role="radiogroup"
        aria-label={this.translationForKey("picks")}
      >
        <For each={this.choices} keyed={false}>
          {(choice, index) => (
            <label
              class={[PICK, { proposed: index === 0 }]}
              part={this.partForName("pick")}
              title={index === 0 ? this.translationForKey("proposed") : undefined}
            >
              <input
                type="radio"
                name={PICK_GROUP}
                value={choice()}
                checked={this.value.trim() === choice()}
                onChange={this.onPick}
              />
              <span>{choice()}</span>
            </label>
          )}
        </For>
      </div>
    )
  }

  /** The tick box, with the command's label. */
  private tick(): JSX.Element {
    return (
      <label class={TICK} part={this.partForName("tick")}>
        <input type="checkbox" checked={this.isTicked} onChange={this.onTick} />
        <span>{this.runRow.tick?.label}</span>
      </label>
    )
  }

  /** The details, folded:  a line each. */
  private details(): JSX.Element {
    const lines = () => this.runRow.details ?? []
    return (
      <details class={DETAILS} part={this.partForName("details")}>
        <summary>{this.translationForKey("details", { count: String(lines().length) })}</summary>
        <ul>
          <For each={lines()} keyed={false}>
            {(line) => <li>{line()}</li>}
          </For>
        </ul>
      </details>
    )
  }

  /** The first column's value, naming the row for a screen reader. */
  private get firstCell(): string {
    const first = this.runColumns[0]
    return first ? (this.runRow.cells[first.key] ?? "") : this.runRow.id
  }

  ////////////////
  // ## Events
  ////////////////

  /** Say the row's answer is `value` (`now`:  save it at once). */
  private tell(value: string, { now = false, ticked = this.runRow.tick ? this.isTicked : undefined } = {}) {
    const detail: RunAnswerDetail = { rowId: this.runRow.id, outcome: this.outcomeOf(value), value, now }
    if (ticked !== undefined) detail.ticked = ticked
    this.send(RUN_ANSWER, detail)
  }

  /** A keystroke in the box:  one line of text (a pasted line break goes);  said, saved a moment later. */
  private readonly onInput = (event: InputEvent) => {
    const box = event.currentTarget as HTMLTextAreaElement
    if (/\n/.test(box.value)) box.value = box.value.replace(/\s*\n\s*/g, " ")
    this.typed = box.value
    this.tell(box.value.trim())
  }

  /** Enter in the box adds no line. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") event.preventDefault()
  }

  /** A pill picked:  into the box, said, saved at once. */
  private readonly onPick = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value
    this.typed = value
    this.tell(value, { now: true })
  }

  /** The tick box:  said with the box's value, saved at once. */
  private readonly onTick = (event: Event) => {
    const ticked = (event.currentTarget as HTMLInputElement).checked
    this.tell(this.value.trim(), { now: true, ticked })
  }

  /** The reset button:  the proposal back in the box, said, saved at once. */
  private readonly onReset = () => {
    this.typed = this.runRow.value
    this.tell(this.runRow.value, { now: true })
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicRunRow extends E.AttributeValues<typeof epicRunRowVocabulary> {}

/** Classes of the shadow markup. */
/** Its cells' box:  out of the way (`display: contents`), so the cells sit on the table's columns. */
const ROW_BOX = "row-box"
const CELL = "cell"
const ANSWER = "answer"
const FIELD = "field"
const BOX = "box"
const RESET = "reset"
const PICKS = "picks"
const PICK = "pick"
const TICK = "tick"
const DETAILS = "details"

/** The pick's radios' group:  one per row, each row its own shadow root. */
const PICK_GROUP = "pick"
