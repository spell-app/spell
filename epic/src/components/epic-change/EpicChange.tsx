import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/element"

import { PlanDates } from "spell-epic/dates"
import { EpicAddress, PageTargets } from "spell-epic/links"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell-epic/components/epic-review/ReviewState"

import { epicChangeVocabulary } from "./EpicChange.en"

import changeCSS from "./EpicChange.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `<epic-change>`
 * A CHANGE MARK (epic `epic-engine` P30;  Q13, B):  words an answer changed or added, marked in the text itself.
 * - The words on an orange ground (our colour for "changed since you looked") while the change is NEW:  stamped less
 *   than `NEW_DAYS` ago.  No approval (Owen, 2026-10-25:  "i shouldn't have to approve those -- I already answered
 *   the question"):  then it goes quiet by itself.
 * - After them, a small chip naming the question (`Q16`), folded;  a click unfolds the question's title and its answer,
 *   in a line, after it.
 *   - the title from the page itself (`PageTargets`:  the item's line is in the skeleton, its body may not be loaded)
 *   - the answer from `answer`, which the epic tool copied when the words changed
 * - While the page is reviewed and the change is new:  Reopen (`<epic-review buttons="change">`), in a tooltip on the
 *   words, for when Owen disagrees
 *   - its mark goes under its id (`ch3`) in the page's inbox;  `epic inbox apply` reopens the question
 *   - none without an id:  just written by hand, the tool hasn't stamped it yet
 * - Quiet (older, or `accepted` on a page from before):  no orange, the chip muted;  the chip stays for good (Q13, B).
 * - Inline, as running text:  the words wrap with the paragraph, the buttons float and never move a line.
 ****************/
export class EpicChange extends E.UIComponent<typeof epicChangeVocabulary> {
  @E.proto static vocabulary = epicChangeVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-change": changeCSS },
    // inline text:  a click on its words must not jump to the chip
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its view of the review inbox, keyed by its id:  Accept and Reopen show while the page is reviewed. */
  readonly review = new ReviewState(() => this.id)

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /** Its chip unfolded:  the question and answer show.  Page state, never written. */
  @E.state accessor unfolded = false

  /** Unfolded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.unfolded
  }

  /**
   * QUIET:  no orange.  Older than `NEW_DAYS`, or `accepted` (written on a page from before changes needed no
   * approval).
   */
  @E.cssState("quiet")
  get isQuiet(): boolean {
    if (this.accepted !== undefined && this.accepted !== null) return true
    const at = this.at ? Date.parse(this.at.replace(" ", "T")) : NaN
    return Number.isFinite(at) && Date.now() - at > NEW_DAYS * DAY_MS
  }

  /** Reopen shows:  reviewed, stamped (an id), still new. */
  get showsButtons(): boolean {
    return !this.isQuiet && !!this.id && this.review.reviewing()
  }

  /** The question's id as people see it:  `Q16`. */
  get itemLabel(): string {
    return (this.item ?? "").toUpperCase()
  }

  /** The question's title, from the page it's on;  `""` off an epic page, or when it isn't there. */
  get itemTitle(): string {
    if (isServer || !this.item) return ""
    try {
      return new PageTargets(this.domElement.ownerDocument).find(new EpicAddress({ item: this.item }))?.title ?? ""
    } catch {
      return ""
    }
  }

  /** The words' tooltip:  which answer changed them, and when. */
  get wordsTip(): string {
    const when = this.at ? ` on ${PlanDates.format(this.at)}` : ""
    return this.translationForKey(this.showsButtons ? "newTip" : "changedTip", { item: this.itemLabel, when })
  }

  render(): JSX.Element {
    return (
      <span class={this.rootClass} part={this.partForName("base")}>
        <mark
          id={WORDS_ID}
          class={WORDS}
          part={this.partForName("words")}
          title={this.showsButtons ? undefined : this.wordsTip}
        >
          <slot />
        </mark>
        {/*
          Reopen ON the words:  a tooltip with an arrow, on hover, kept 2 seconds after the pointer leaves so
          it can reach them (Owen, 2026-10-25:  "hard to get to this because it's not attached to the text")
        */}
        <Show when={this.showsButtons}>
          <ui-popup
            for={WORDS_ID}
            open-on="hover"
            hoverable=""
            hide-delay="2000"
            position="bottom left"
            class={BUTTONS}
            part={this.partForName("buttons")}
          >
            <span class={TIP_WORDS}>
              <span class={TIP_LINE}>{this.wordsTip}</span>
              <epic-review
                of={this.id}
                shows="buttons"
                buttons="change"
                label={this.translationForKey("buttonsLabel", { item: this.itemLabel })}
              />
            </span>
          </ui-popup>
        </Show>
        <span class={CHIP_BOX}>
          <button
            type="button"
            class={CHIP}
            part={this.partForName("chip")}
            aria-expanded={this.unfolded ? "true" : "false"}
            aria-controls={QA_ID}
            title={this.translationForKey(this.unfolded ? "foldTip" : "unfoldTip", { item: this.itemLabel })}
            onClick={(event: MouseEvent) => this.toggle(event)}
          >
            {this.itemLabel}
          </button>
        </span>
        <span id={QA_ID} class={QA} part={this.partForName("qa")} hidden={!this.unfolded}>
          <Show when={this.itemTitle}>
            {(title) => (
              <>
                <b>{title()}</b>
                {" · "}
              </>
            )}
          </Show>
          {this.answer || this.translationForKey("noAnswer")}
        </span>
      </span>
    )
  }

  /** The chip clicked:  its question and answer unfold, or fold;  the click goes no further (an item would fold). */
  @E.untracked
  private toggle(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.unfolded = !this.unfolded
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicChange extends E.AttributeValues<typeof epicChangeVocabulary> {}

/** Classes of the shadow markup:  the words, the chip's box (it holds the floating buttons), the chip, the buttons, the Q&A. */
const WORDS = "words"
const CHIP_BOX = "chip-box"
const CHIP = "chip"
const BUTTONS = "buttons"
const QA = "qa"

/** The Q&A's id in its shadow root:  the chip's `aria-controls`. */
const QA_ID = "qa"

/** How long a change stays NEW, orange, in days (`isQuiet`). */
const NEW_DAYS = 3

/** A day, in ms. */
const DAY_MS = 24 * 60 * 60 * 1000

/** The changed words' id:  the buttons' tooltip points at them. */
const WORDS_ID = "words"

/** Inside the buttons' tooltip:  its box, and its line saying which answer changed the words. */
const TIP_WORDS = "tip-words"
const TIP_LINE = "tip-line"
