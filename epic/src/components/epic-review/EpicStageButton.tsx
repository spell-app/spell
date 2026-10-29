import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { STAGE_ID } from "spell/epic/review"

import { epicStageButtonVocabulary } from "./EpicStageButton.en"
import { ReviewState } from "./ReviewState"

import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"
import stageButtonCSS from "./EpicStageButton.css?inline"

/****************
 * ### `<epic-stage-button>`
 * The STAGE BUTTON (epic `epic-engine` P29):  ends a stage of planning, on the work it accepts (I180).
 * - "Accept Overview" on the Overview's title row (`<epic-overview>`), "Accept Phases" on the Phases section's
 *   (`<epic-section kind="phases">`, before its gear):  each draws it while the page is reviewed and in that stage
 *   - Owen, 2026-10-29, on the green pill where Send's plane sat:  "This should just be normal paper plane";
 *     the header's Send is the plane in every stage now, and the stage's Accept sits where its work is
 *   - on the title row, so it's there while the section is folded
 * - a green check and its words;  outlined green once pressed (`:state(accepted)`), until the session moves the page on
 * - a press (`accept()`):  the page's accept mark (`{ action: "accept", stage }`, keyed `stage`), then Send, so it goes
 *   at once with whatever else is unsent, and wakes the epic when nobody listens
 *   - pressed again once accepted:  sent again, nothing more (the mark stands until the session applies it)
 * - its tooltip says what's still open ("2 questions open", `open` from its owner):  a reminder, never a lock
 * - its view of the inbox is its own `ReviewState`, keyed `stage`;  the countdown's Send never accepts (J143)
 ****************/
export class EpicStageButton extends E.UIComponent<typeof epicStageButtonVocabulary> {
  @E.proto static vocabulary = epicStageButtonVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-stage-button": stageButtonCSS }
  } satisfies Partial<E.ElementSetup>

  /** Its view of the page's review inbox, keyed `stage`. */
  readonly review = new ReviewState(() => STAGE_ID)

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /** Pressed:  the inbox holds its accept mark for the stage it ends. */
  @E.cssState("accepted")
  get isAccepted(): boolean {
    const mark = this.review.mark()
    return mark?.action === "accept" && mark.stage === this.stage
  }

  /** Its texts, by the stage it ends. */
  get texts(): (typeof STAGE_TEXTS)[keyof typeof STAGE_TEXTS] {
    return STAGE_TEXTS[this.stage === "phases" ? "phases" : "overview"]
  }

  /**
   * Its tooltip:  what a press does, what's still open, what it sends along;  once pressed, that it waits for Claude.
   */
  get tip(): string {
    if (this.isAccepted) return this.translationForKey(this.texts.accepted)
    const open = this.open ?? 0
    const unsent = this.review.unsentCount()
    return [
      this.translationForKey(this.texts.tip),
      open
        ? this.translationForKey(open === 1 ? "openQuestionsOne" : "openQuestionsMany", { count: open })
        : this.translationForKey("nothingOpen"),
      unsent ? this.translationForKey("acceptSends", { count: unsent }) : ""
    ]
      .filter(Boolean)
      .join(" · ")
  }

  render(): JSX.Element {
    return (
      <button
        type="button"
        class={this.rootClass}
        part={this.partForName("base")}
        data-state={this.isAccepted ? "accepted" : "idle"}
        title={this.tip}
        aria-label={this.tip}
        onClick={(event: MouseEvent) => {
          // a title row's tool:  not a click on the title, which would fold it
          event.stopPropagation()
          void this.accept()
        }}
      >
        <ui-icon name="circle check" />
        <span class={WORDS}>{this.translationForKey(this.texts.label)}</span>
      </button>
    )
  }

  /** Mark the stage accepted (unless it is), then send:  see the class's docstring. */
  @E.untracked
  async accept() {
    const client = this.review.client
    const stage = this.stage
    if (!client || (stage !== "overview" && stage !== "phases")) return
    const mark = client.markOf(STAGE_ID)
    if (mark?.action !== "accept" || mark.stage !== stage) {
      if (!(await client.save(STAGE_ID, { action: "accept", stage }))) return
    }
    await client.send()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicStageButton extends E.AttributeValues<typeof epicStageButtonVocabulary> {}

/** Classes of the shadow markup. */
const WORDS = "words"

/** Its texts' keys, by the stage it ends. */
const STAGE_TEXTS = {
  overview: { label: "acceptOverview", tip: "acceptOverviewTip", accepted: "acceptedOverview" },
  phases: { label: "acceptPhases", tip: "acceptPhasesTip", accepted: "acceptedPhases" }
} as const
