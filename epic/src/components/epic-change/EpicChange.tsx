import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/element"

import { PlanDates } from "spell-epic/dates"
import { EpicAddress, PageTargets } from "spell-epic/links"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell-epic/components/epic-review/ReviewState"

import { epicChangeVocabulary } from "./EpicChange.en"
import { CHANGE_ANSWERED } from "./EpicChange.types"

import changeCSS from "./EpicChange.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `<epic-change>`
 * A CHANGE MARK (epic `epic-engine` P30;  Q13, B):  words an answer changed or added, marked in the text itself.
 * - The words on an orange ground (our colour for "changed since you looked"), until Owen accepts them.
 * - After them, a small chip naming the question (`Q16`), folded;  a click unfolds the question's title and its answer,
 *   in a line, after it.
 *   - the title from the page itself (`PageTargets`:  the item's line is in the skeleton, its body may not be loaded)
 *   - the answer from `answer`, which the epic tool copied when the words changed
 * - While the page is reviewed and the change waits:  Accept and Reopen (`<epic-review buttons="change">`), over the
 *   chip on hover or focus, and while it's unfolded (a phone has no hover).
 *   - their marks go under its id (`ch3`) in the page's inbox;  `epic inbox apply` makes Accept `accepted`, and
 *     reopens the question for Reopen
 *   - none without an id:  just written by hand, the tool hasn't stamped it yet
 * - Accepted:  no orange, the chip muted, the buttons gone;  the chip stays for good (Q13, B).
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
   * Owen accepted it:  no orange.  `accepted` written, or his Accept pressed and not applied yet (Owen, 2026-10-25:
   * "When I accept a mark, change highlight right away").
   */
  @E.cssState("accepted")
  get isAccepted(): boolean {
    return this.isWrittenAccepted || this.review.mark()?.action === "accept"
  }

  /** `accepted` written:  the session applied his Accept. */
  get isWrittenAccepted(): boolean {
    return this.accepted !== undefined && this.accepted !== null
  }

  /** Accept and Reopen show:  reviewed, stamped (an id) and not accepted in the file (his Accept still undoable). */
  get showsButtons(): boolean {
    return !this.isWrittenAccepted && !!this.id && this.review.reviewing()
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

  /** The words' tooltip:  which answer changed them, when, and whether Owen has accepted it. */
  get wordsTip(): string {
    const when = this.at ? ` on ${PlanDates.format(this.at)}` : ""
    if (!this.isWrittenAccepted) return this.translationForKey("waitingTip", { item: this.itemLabel, when })
    const accepted = PlanDates.format(this.accepted)
    return this.translationForKey("acceptedTip", { item: this.itemLabel, when, accepted })
  }

  render(): JSX.Element {
    return (
      <span class={this.rootClass} part={this.partForName("base")}>
        <mark class={WORDS} part={this.partForName("words")} title={this.wordsTip}>
          <slot />
        </mark>
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
          <Show when={this.showsButtons}>
            <span
              class={BUTTONS}
              part={this.partForName("buttons")}
              // a native listener, capturing:  the press comes from inside `<epic-review>`, which stops it going further
              ref={(element: HTMLElement) => this.wireAnswered(element)}
            >
              <epic-review
                of={this.id}
                shows="buttons"
                buttons="change"
                label={this.translationForKey("buttonsLabel", { item: this.itemLabel })}
              />
            </span>
          </Show>
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

  /**
   * Accept or Reopen pressed:  `epic-change-answered` (bubbling, composed), so the page lands on the NEXT change
   * waiting (Owen, 2026-10-25:  "Clicking 'accept or revisit' on one should jump to next one to revisit").
   */
  /** Listen on `buttons` for a press, once however often it's handed over. */
  private wireAnswered(buttons: HTMLElement) {
    if (this.wired === buttons) return
    this.wired = buttons
    buttons.addEventListener("click", () => this.answered(), true)
  }

  /** When a press was last told (`answered()`). */
  private lastAnswered = -Infinity

  /** The buttons' box listened on (`wireAnswered()`). */
  private wired: HTMLElement | undefined

  @E.untracked
  private answered() {
    // one press is two clicks (the button's host and the button in it):  told once
    if (performance.now() - this.lastAnswered < ONE_PRESS_MS) return
    this.lastAnswered = performance.now()
    this.domElement.dispatchEvent(
      new CustomEvent(CHANGE_ANSWERED, { bubbles: true, composed: true, detail: { id: this.id } })
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

/** Clicks closer together than this are one press (`answered()`). */
const ONE_PRESS_MS = 300

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
