import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { ThreadFacts } from "spell/epic/comments"
import { PlanDates } from "spell/epic/dates"
// the card's shape and its dated band are the answer family's:  one card, its fills per element
import {
  BODY,
  BODY_ID,
  DATE,
  DATED,
  EMPTY,
  HEADER,
  HEADING_SEPARATOR,
  WHO,
  WHO_ID
} from "spell/epic/components/epic-answer/EpicAnswer.types"
// the fold pieces every `<epic-*>` fold shares:  their files, not `epic-item`'s barrel (which would define it here)
import { FOLDS, Fold } from "spell/epic/components/epic-item/Fold"
// the item it's in, for its line:  the files, not `epic-item`'s barrel (which would define it here)
import { ItemLink } from "spell/epic/components/epic-item/ItemLink"
import type { StatusLine, StatusStep, ThreadPlace } from "spell/epic/components/epic-item/AnswerThread"

import { epicStatusVocabulary } from "./EpicStatus.en"

import answerCSS from "spell/epic/components/epic-answer/EpicAnswer.css?inline"
import foldCSS from "spell/epic/components/epic-item/Fold.css?inline"
import statusCSS from "./EpicStatus.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicStatus`
 * The component behind `<epic-status>`:  Claude's status card on an item (or an Overview sub-section),
 * under Owen's note (P13).  It says what Claude took his review mark to mean, then that it's done, or noted.
 * - Its band:  the fold chevron, then on the left
 *   - `Claude • Underway` (blue):  Claude is on it
 *   - `Claude • Done` (green):  work was done (an answer written, code changed, a phase built)
 *   - `Claude • Noted` (a calm outline, no fill):  Claude only RECORDED what Owen chose
 *     (a pick, a todo made or queued), so it never reads as work done (Owen, 2026-10-10)
 *   - `Claude (Ana) • Done`:  a card another person's session wrote (`from`;  epic `epic-friend` P2), to anyone but Ana
 * - the date at the right of the top line (`.header.dated`, as `EpicReply`'s):  `done-at` once finished, else `at`;
 *   once finished, the date's tooltip says when it was taken
 * - Its body:  the reading (its children), kept as it was when it turns done;
 *   then the summary (`slot="summary"`), only when there is one
 * - Folds by its band, reading and summary together (Owen, 2026-10-08:  everything in a section box folds):
 *   open to start with;  page state, never written;  folded, `hidden="until-found"`
 * - Written by the epic tool (`plan-doc status`, `inbox apply`), never by hand;
 *   a later mark on the same item adds a new card, the old ones stay
 * - IN AN ITEM, a LINE, not a card (epic `epic-engine` P27, Owen's layout A):
 *   `✓ Noted 10/24/26 15:21 → Done 15:25 · what Claude did`
 *   - a run of cards about one task is ONE line, drawn by its last card, the others hidden (`AnswerThread`):
 *     each card's state and when, then the last card's summary, else its reading
 *   - LAST in the item's thread, after Claude's reply, inside the thread's one frame (I152), hidden while the
 *     thread's head is folded;  a DRIVE-BY's (taken before Owen's first reply) first in the
 *     item's details, above the Choices (`order`, in the details' column), "your earlier comment" after its steps
 *   - outside an item (an Overview sub-section):  the card, as before
 ****************/
export class EpicStatus extends E.UIComponent<typeof epicStatusVocabulary> {
  @E.proto static vocabulary = epicStatusVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: {
      "epic-tooltip": tooltipCSS,
      "epic-fold-button": foldCSS,
      "epic-answer": answerCSS,
      "epic-status": statusCSS
    },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Light-DOM slot occupancy:  has it a reading, a summary? */
  readonly slots = new E.SlotContent(this.domElement)

  /** Open or folded:  open to start with (Owen, 2026-10-08:  everything in a section box folds). */
  readonly fold = new Fold(() => true)

  /** Unfolded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.fold.isOpen()
  }

  /** The item it's in:  its line, its place. */
  readonly link = new ItemLink(this.domElement)

  /** Follow the item it's in, while connected. */
  @E.whileConnected
  protected followItem() {
    return this.link.connect()
  }

  /** Drawn as a line (in an item), not a card. */
  @E.cssState("line")
  get isLine(): boolean {
    return this.link.inItem
  }

  /** Its line:  its item's, else its own steps alone (before the item's ready);  `undefined` when merged away. */
  get line(): StatusLine | undefined {
    const line = this.link.thread()?.lineOf(this.domElement)
    if (line === "merged") return undefined
    return line ?? { where: "thread", steps: [{ state: this.stepState, at: this.when ?? "" }] }
  }

  /** Drawn in by a later card's line:  hidden. */
  @E.cssState("merged")
  get isMerged(): boolean {
    return this.isLine && this.link.thread()?.lineOf(this.domElement) === "merged"
  }

  /** A drive-by's line:  above the Choices. */
  @E.cssState("drive-by")
  get isDriveBy(): boolean {
    return this.isLine && this.line?.where === "drive-by"
  }

  /** Its place in its item's thread's section;  `undefined` outside one. */
  get place(): ThreadPlace | undefined {
    return this.link.thread()?.placeOf(this.domElement)
  }

  /** In the thread's section:  inside its one frame. */
  @E.cssState("in-thread")
  get isInThread(): boolean {
    return !!this.place
  }

  /** Last in the thread's section:  the frame's bottom. */
  @E.cssState("thread-end")
  get endsThread(): boolean {
    return !!this.place?.end
  }

  /** After the thread's head, which is folded:  hidden with it (I152). */
  @E.cssState("thread-hidden")
  get isThreadHidden(): boolean {
    return !!this.place?.underHead && this.link.threadFolded()
  }

  /** Its state as a step says it. */
  private get stepState(): StatusStep["state"] {
    return this.isDone ? DONE : this.isNoted ? NOTED : UNDERWAY
  }

  /** Has it a summary? */
  get hasSummary(): boolean {
    return this.slots.hasContent(this.slotForName(SUMMARY_SLOT))
  }

  /** Has it a reading or a summary to fold? */
  get hasBody(): boolean {
    return this.slots.hasContent("") || this.slots.hasContent(this.slotForName(SUMMARY_SLOT))
  }

  /** Done (green):  work was done. */
  @E.cssState("done")
  get isDone(): boolean {
    return this.state === DONE
  }

  /** Noted (a calm outline):  Claude recorded what Owen chose, nothing more yet. */
  @E.cssState("noted")
  get isNoted(): boolean {
    return this.state === NOTED
  }

  /** Finished:  done or noted;  its band dated `done-at`. */
  get isFinished(): boolean {
    return this.isDone || this.isNoted
  }

  /** Underway (blue):  any `state` but `done` or `noted`, none too. */
  @E.cssState("underway")
  get isUnderway(): boolean {
    return !this.isFinished
  }

  /** When its band says:  `done-at` once finished (a card born so has `at` alone), else `at`. */
  get when(): string | undefined {
    return (this.isFinished && this.doneAt) || this.at
  }

  /**
   * Whose Claude wrote it, for its band (epic `epic-friend` P2, Q7):  `Claude (Ana)` when `from` names someone other
   * than whoever is reading (`ThreadFacts.viewer()`);  plain `Claude` for your own session's, or a card from before.
   */
  get who(): string {
    const person = this.from?.trim()
    return person && !ThreadFacts.sameName(person, ThreadFacts.viewer())
      ? this.translationForKey("claudeOf", { person })
      : this.translationForKey("claude")
  }

  /** Its band's right:  `when`, as drawn (`10/8/26 14:34`). */
  get date(): string {
    return PlanDates.format(this.when)
  }

  /** The date's tooltip once finished (`taken 10/8/26 14:20`);  none while underway, or with no `done-at`. */
  get dateTip(): string | undefined {
    const { doneAt, at } = this
    return this.isFinished && doneAt && at
      ? this.translationForKey("started", { date: PlanDates.format(at) })
      : undefined
  }

  protected get extraClass(): string | undefined {
    const last = this.line?.steps.at(-1)?.state ?? this.stepState
    return this.isLine ? `${last} ${LINE}` : this.stepState
  }

  render(): JSX.Element {
    return (
      <Show when={this.isLine} fallback={this.renderCard()}>
        {this.renderLine()}
      </Show>
    )
  }

  /**
   * The line:  `✓ Noted 10/24/26 15:21 → Done 15:25 · what Claude did`.
   * - each step's date in full, but the time alone on the day of the step before it
   * - the summary, else the reading:  what Claude did
   */
  private renderLine(): JSX.Element {
    const steps = () => this.line?.steps ?? []
    const finished = () => steps().at(-1)?.state !== UNDERWAY
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <span class={MARK} aria-hidden="true">
          {finished() ? FINISHED_MARK : UNDERWAY_MARK}
        </span>
        <span class={STEPS} part={this.partForName("steps")}>
          <For each={steps()}>
            {(step, index) => (
              <span class={STEP}>
                <Show when={index() > 0}>{STEP_ARROW}</Show>
                {this.translationForKey(STEP_KEYS[step.state])}{" "}
                <time class={DATE} datetime={step.at}>
                  {stepDate(step.at, steps()[index() - 1]?.at)}
                </time>
              </span>
            )}
          </For>
        </span>
        <Show when={this.isDriveBy}>
          <span class={EARLIER} part={this.partForName("earlier")}>
            {HEADING_SEPARATOR}
            {this.translationForKey("earlier")}
          </span>
        </Show>
        <span class={TEXT} part={this.partForName("summary")}>
          <Show when={this.hasBody}>{HEADING_SEPARATOR}</Show>
          <slot name={this.slotForName(SUMMARY_SLOT)} />
          <span class={[READING, { [EMPTY]: this.hasSummary }]} part={this.partForName("body")}>
            <slot />
          </span>
        </span>
      </div>
    )
  }

  /** The card, outside an item. */
  private renderCard(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div
          ref={this.fold.heading}
          class={[HEADER, DATED, { [FOLDS]: this.hasBody }]}
          part={this.partForName("header")}
        >
          <Show when={this.hasBody}>
            {this.fold.button({
              controls: BODY_ID,
              labelledBy: WHO_ID,
              part: this.partForName("toggle"),
              tips: { fold: this.translationForKey("foldTip"), unfold: this.translationForKey("unfoldTip") }
            })}
          </Show>
          <span id={WHO_ID} class={WHO} part={this.partForName("who")}>
            {this.translationForKey(this.isDone ? "done" : this.isNoted ? "noted" : "underway", { who: this.who })}
          </span>
          <Show when={this.date}>
            <time class={DATE} part={this.partForName("date")} datetime={this.when} title={this.dateTip}>
              {this.date}
            </time>
          </Show>
        </div>
        {/* the reading and the summary fold together */}
        <div ref={this.fold.watch} id={BODY_ID} class={FOLDED} hidden={this.fold.hidden()}>
          <div class={[BODY, { [EMPTY]: !this.slots.hasContent("") }]} part={this.partForName("body")}>
            <slot />
          </div>
          <div
            class={[BODY, SUMMARY, { [EMPTY]: !this.slots.hasContent(this.slotForName(SUMMARY_SLOT)) }]}
            part={this.partForName("summary")}
          >
            <slot name={this.slotForName(SUMMARY_SLOT)} />
          </div>
        </div>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicStatus extends E.AttributeValues<typeof epicStatusVocabulary> {}

/** `state` of a card whose work was done, and its class word:  green, its date `done-at`. */
const DONE = "done"

/** `state` of a card that only RECORDED Owen's choice, and its class word:  a calm outline, its date `done-at`. */
const NOTED = "noted"

/** Class word of a card Claude is still on:  blue. */
const UNDERWAY = "underway"

/** The summary's slot (`<p slot="summary">`), under the reading. */
const SUMMARY_SLOT = "summary"

/** Class names inside the shadow root, beside the card's (`EpicAnswer.types`' `HEADER`, `DATED` ...). */
const SUMMARY = "summary"
/** The box the band folds:  the reading and the summary. */
const FOLDED = "folded"

/** Class names of the line (in an item). */
const LINE = "line"
const MARK = "mark"
const STEPS = "steps"
const STEP = "step"
const EARLIER = "earlier"
const TEXT = "text"
const READING = "reading"

/** The line's mark:  finished (done or noted), or Claude still on it. */
const FINISHED_MARK = "✓"
const UNDERWAY_MARK = "…"

/** Between a line's steps. */
const STEP_ARROW = " → "

/** Each step's word, by state. */
const STEP_KEYS = { done: "stepDone", noted: "stepNoted", underway: "stepUnderway" } as const

/** A step's date as drawn:  in full (`10/24/26 15:21`), but the time alone on the same day as the step before. */
function stepDate(at: string, before: string | undefined): string {
  const read = PlanDates.read(at)
  const earlier = before ? PlanDates.read(before) : undefined
  if (read?.hasTime && earlier && read.date.toDateString() === earlier.date.toDateString())
    return PlanDates.clock(read.date)
  return PlanDates.format(at)
}
