import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/element"

import { PlanDates } from "spell/epic/dates"
import { EpicAddress, PageTargets } from "spell/epic/links"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"

import { epicChangeVocabulary } from "./EpicChange.en"

import changeCSS from "./EpicChange.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `<epic-change>`
 * A CHANGE MARK (epic `epic-engine` P30;  Q13, B):  words an answer changed or added, marked in the text itself.
 * - The words on an orange ground (our colour for "changed since you looked") while the change is NEW:  stamped less
 *   than `PlanDates.QUIET_DAYS` ago.  No approval (Owen, 2026-10-25:  "i shouldn't have to approve those -- I already answered
 *   the question"):  then it goes quiet by itself.
 * - After them, a small chip naming the question (`Q16`), folded;  a click unfolds the question's title and its answer,
 *   in a line, after it.
 *   - the title from the page itself (`PageTargets`:  the item's line is in the skeleton, its body may not be loaded)
 *   - the answer from `answer`, which the epic tool copied when the words changed
 * - A click on the words (or Enter / Space, they're focusable) opens a POPUP under them (epic `epic-engine` I160;
 *   Owen, 2026-10-29:  "Show popup on click rather than hover"):  a click elsewhere or Escape closes it
 *   - "Changed by Q53 (10/29/26 08:04)"
 *   - "Originally:  <the words it replaced>", from `was`, which the epic tool finds as it stamps the mark;
 *     none for new words, or a mark from before I160
 *   - while the page is reviewed and the change is new:  Reopen (`<epic-review buttons="change">`), for when Owen
 *     disagrees;  its mark goes under its id (`ch3`) in the page's inbox, and `epic inbox apply` reopens the
 *     question.  None without an id:  just written by hand, the tool hasn't stamped it yet
 *   - opaque, its arrow too:  a theme's glass blurs what's behind the box but can't blur behind its arrow, which
 *     showed the text under it (Owen:  "Arrow tip doesn't match opacity of the popup")
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

  /** Its view of the review inbox, keyed by its id:  Reopen shows while the page is reviewed. */
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
   * QUIET:  no orange.  Older than `PlanDates.QUIET_DAYS` (`PlanDates.isQuiet()`, the one rule), or `accepted` (written on a page from before changes needed no
   * approval).
   */
  @E.cssState("quiet")
  get isQuiet(): boolean {
    if (this.accepted !== undefined && this.accepted !== null) return true
    return PlanDates.isQuiet(this.at, new Date())
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

  /** The popup's first line:  which answer changed the words, and when (`Changed by Q53 (10/29/26 08:04)`). */
  get changedBy(): string {
    const when = this.at ? ` (${PlanDates.format(this.at)})` : ""
    return this.translationForKey("changedBy", { item: this.itemLabel, when })
  }

  render(): JSX.Element {
    return (
      <span class={this.rootClass} part={this.partForName("base")}>
        <mark
          id={WORDS_ID}
          class={WORDS}
          part={this.partForName("words")}
          tabindex="0"
          role="button"
          onKeyDown={(event: KeyboardEvent) => this.onWordsKey(event)}
        >
          <slot />
        </mark>
        {/* on a click, never a hover (Owen, 2026-10-29):  `<ui-popup>` closes it on a click elsewhere or Escape */}
        <ui-popup
          for={WORDS_ID}
          open-on="click"
          position="bottom left"
          wide=""
          class={POPUP}
          part={this.partForName("popup")}
          on-ui-opening={(event: Event) => this.onOpening(event)}
        >
          <span class={TIP_WORDS}>
            <span class={TIP_LINE}>{this.changedBy}</span>
            <Show when={this.was}>
              {(was) => (
                <span class={ORIGINAL}>
                  <i>{this.translationForKey("originally")}</i> {was()}
                </span>
              )}
            </Show>
            <Show when={this.showsButtons}>
              <epic-review
                of={this.id}
                shows="buttons"
                buttons="change"
                label={this.translationForKey("buttonsLabel", { item: this.itemLabel })}
              />
            </Show>
          </span>
        </ui-popup>
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

  /** Enter or Space on the focused words:  as a click, which opens or closes the popup. */
  @E.untracked
  private onWordsKey(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).click()
  }

  /** The popup about to open:  not when the click ended a text selection (words being copied, not asked about). */
  @E.untracked
  private onOpening(event: Event) {
    const selection = this.domElement.ownerDocument.getSelection()
    if (selection && !selection.isCollapsed && selection.containsNode(this.domElement, true)) event.preventDefault()
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

/** Classes of the shadow markup:  the words, the chip's box, the chip, the words' popup, the Q&A. */
const WORDS = "words"
const CHIP_BOX = "chip-box"
const CHIP = "chip"
const POPUP = "popup"
const QA = "qa"

/** The Q&A's id in its shadow root:  the chip's `aria-controls`. */
const QA_ID = "qa"

/** The changed words' id:  the popup points at them. */
const WORDS_ID = "words"

/** Inside the popup:  its box, its line saying which answer changed the words, and the words they replaced. */
const TIP_WORDS = "tip-words"
const TIP_LINE = "tip-line"
const ORIGINAL = "original"
