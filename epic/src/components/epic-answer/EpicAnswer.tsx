import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

// the fold pieces every `<epic-*>` fold shares:  their files, not `epic-item`'s barrel (which would define it here)
import { FOLDS, Fold } from "spell-epic/components/epic-item/Fold"
// the item it's in, for whether its Choices say it already:  the file, not `epic-item`'s barrel
import { ItemLink } from "spell-epic/components/epic-item/ItemLink"

import { epicAnswerVocabulary } from "./EpicAnswer.en"
import { BODY, BODY_ID, EMPTY, HEADER, HEADING_SEPARATOR, LABEL_ID, TITLE_ID } from "./EpicAnswer.types"

import answerCSS from "./EpicAnswer.css?inline"
import foldCSS from "spell-epic/components/epic-item/Fold.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicAnswer`
 * The component behind `<epic-answer>`:  an answered question's answer card, after its question and Choices.
 * - A warm card:  its heading band `Answer · <title>`, then the answer and why (its light children).
 *   - `D7 · <title>` when it keeps an old decision's id, so old `#d7` links land on it
 *     (the id is the DOM element's own)
 * - A title with markup:  a `slot="title"` child, in place of `title` (T12).
 * - No children:  the heading alone, a card one band tall.
 * - Folds by its band, the chevron first (Owen, 2026-10-08:  everything in a section box folds).
 *   - open to start with;  page state, never written
 *   - folded, the answer is `hidden="until-found"`
 * - REDUNDANT in an item whose Choices say "Chosen: X" already (`<epic-choices chosen>`;  epic `epic-engine` P27,
 *   Owen:  "the answer block is not necessary"):  no band
 *   - with a body (the why):  the body alone, first in the item's thread's brown block
 *   - without one:  not drawn at all
 *   - an answer with no chosen option (an issue's, a call's) keeps its card:  nothing else says it
 ****************/
export class EpicAnswer extends E.UIComponent<typeof epicAnswerVocabulary> {
  @E.proto static vocabulary = epicAnswerVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-fold-button": foldCSS, "epic-answer": answerCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Light-DOM slot occupancy:  has it a body? */
  readonly slots = new E.SlotContent(this.domElement)

  /** Open or folded:  open to start with. */
  readonly fold = new Fold(() => true)

  /** Unfolded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.fold.isOpen()
  }

  /** The item it's in:  its thread. */
  readonly link = new ItemLink(this.domElement)

  /** Its item's Choices say what was chosen:  no band;  not drawn without a body. */
  @E.cssState("redundant")
  get isRedundant(): boolean {
    return !!this.link.thread()?.chosen
  }

  /** Redundant with no body:  nothing to draw. */
  @E.cssState("unneeded")
  get isUnneeded(): boolean {
    return this.isRedundant && !this.hasBody
  }

  /** In its item's thread (redundant, with a body):  one of the brown block. */
  @E.cssState("in-thread")
  get isInThread(): boolean {
    return !!this.link.thread()?.placeOf(this.domElement)
  }

  /** First in the thread's block. */
  @E.cssState("thread-start")
  get startsThread(): boolean {
    return !!this.link.thread()?.placeOf(this.domElement)?.start
  }

  /** Last in the thread's block. */
  @E.cssState("thread-end")
  get endsThread(): boolean {
    return !!this.link.thread()?.placeOf(this.domElement)?.end
  }

  /** Follow the item it's in, while connected. */
  @E.whileConnected
  protected followItem() {
    return this.link.connect()
  }

  /** Has it an answer to fold (not just its heading)? */
  get hasBody(): boolean {
    return this.slots.hasContent("")
  }

  /** Its label:  the old decision's id (`D7`), else `Answer`. */
  get label(): string {
    const id = this.id ?? ""
    return OLD_DECISION.test(id) ? id.toUpperCase() : this.translationForKey("answer")
  }

  /** Has a title:  `title`, or a `slot="title"` child (a title with markup, T12). */
  get hasTitle(): boolean {
    return !!this.title || this.slots.hasContent(this.slotForName("title"))
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div
          ref={this.fold.heading}
          class={[HEADER, { [FOLDS]: this.hasBody }]}
          part={this.partForName("header")}
          hidden={this.isRedundant}
        >
          <Show when={this.hasBody}>
            {this.fold.button({
              controls: BODY_ID,
              labelledBy: this.hasTitle ? `${LABEL_ID} ${TITLE_ID}` : LABEL_ID,
              part: this.partForName("toggle"),
              tips: { fold: this.translationForKey("foldTip"), unfold: this.translationForKey("unfoldTip") }
            })}
          </Show>
          <b id={LABEL_ID} class={LABEL} part={this.partForName("label")}>
            {this.label}
          </b>
          <Show when={this.hasTitle}>
            {HEADING_SEPARATOR}
            <span id={TITLE_ID} class={TITLE} part={this.partForName("title")}>
              <slot name={this.slotForName("title")}>{this.title}</slot>
            </span>
          </Show>
        </div>
        <div
          ref={this.fold.watch}
          id={BODY_ID}
          class={[BODY, { [EMPTY]: !this.hasBody }]}
          part={this.partForName("body")}
          hidden={this.isRedundant ? undefined : this.fold.hidden()}
        >
          <slot />
        </div>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicAnswer extends E.AttributeValues<typeof epicAnswerVocabulary> {}

/** An old decision's id (`d7`), kept on its answer card:  the card is labelled `D7`, not `Answer`. */
const OLD_DECISION = /^d\d+$/

/** Class names inside the shadow root. */
const LABEL = "label"
const TITLE = "title"
