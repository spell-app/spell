import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { AWAY_ID } from "spell/epic/definitions/definitions.types"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
// the badge's class:  its file, not `epic-item`'s barrel (which defines that family)
import { BADGE } from "spell/epic/components/epic-item/EpicItem.types"
import { TitlePrefix } from "spell/epic/components/epic-item/TitlePrefix"

import { epicAwayLineVocabulary } from "./EpicAwayLine.en"

import badgeCSS from "spell/epic/components/epic-item/ItemBadge.css?inline"
import awayLineCSS from "./EpicAwayLine.css?inline"

/****************
 * ### `<epic-away-line>`
 * One line of "0. While you were out", or one of its parts' headings, with its own tick (epic `epic-engine` I206;
 * Owen:  "a tick per section as well, so I can say 'that's good' on part but not on the whole thing").
 * - Its ✓ Read at the line's start, while the page is reviewed:  a Seen on `away:<line>` through the review inbox;
 *   `epic inbox apply` writes when he read it into the page (`<epic-page away-seen>`), and the section is drawn again
 *   without it.  A heading's (`done`, `fixed`, `asks` ...) takes its whole part.
 * - Read:  faded at once (`:state(read)`), as an update block goes quiet;  the page server applies it straight away
 *   (`InstantMarks`, epic `epic-engine` I268, I304:  no Send), and the section is drawn again without it.
 *   - a line under a part's heading Read fades with it, at once (`partHeading()`):  the whole part is read
 *   - what the line is about is Seen too:  its new update blocks go quiet (`PlanDoc.seeUpdatesFor()`)
 *   - and the same the moment Owen marks the item the line is about (Do this, Approve ...):  it leaves the section
 *     when that's applied (`NightSummary.isAddressed()`, epic `epic-engine` I235)
 * - The epic tool writes every one (`PlanDoc.refreshAway()`);  no one writes it by hand.
 ****************/
export class EpicAwayLine extends E.UIComponent<typeof epicAwayLineVocabulary> {
  @E.proto static vocabulary = epicAwayLineVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-away-line": awayLineCSS, "epic-badge": badgeCSS },
    cssStates: ["heading", "working"],
    // a line of text:  a click on its words must not jump to its tick
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its view of the review inbox, keyed `away:<line>`. */
  readonly review = new ReviewState(() => (this.line ? `${AWAY_ID}:${this.line}` : undefined))

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /**
   * Its Read mark is in the inbox, or its part's (its heading's), or a mark on the item it's about:  faded until
   * it's applied.
   */
  @E.cssState("read")
  get isRead(): boolean {
    const part = this.partHeading()
    return (
      (!!this.line && this.review.wasRead(`${AWAY_ID}:${this.line}`)) ||
      (!!part && this.review.wasRead(`${AWAY_ID}:${part}`)) ||
      (!!this.line && this.review.isMarked(this.line))
    )
  }

  /** The key of the part it's in (`done`, `fixed`, `asks` ...):  the nearest heading before it;  none for a heading itself. */
  partHeading(): string | undefined {
    if (this.heading) return undefined
    for (let before = this.domElement.previousElementSibling; before; before = before.previousElementSibling)
      if (before.localName === "epic-away-line" && before.hasAttribute("heading"))
        return before.getAttribute("line") ?? undefined
    return undefined
  }

  /** Read shows:  a line to key it by, the page reviewed, and not still under way. */
  get showsRead(): boolean {
    return !!this.line && !this.working && this.review.reviewing()
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.working}>
          <ui-icon name={WORKING_ICON} part={this.partForName("working")} />
        </Show>
        <Show when={this.showsRead}>
          <epic-review
            of={`${AWAY_ID}:${this.line}`}
            shows="buttons"
            buttons="away-line"
            tone={STATE_TONES[this.state ?? ""]}
            part={this.partForName("read")}
            label={this.translationForKey("buttonsLabel")}
          />
        </Show>
        <div part={this.partForName("body")}>
          {/* with a badge (I435):  its number, the badge, then the rest, as the item's row */}
          <Show when={TitlePrefix.knownBadge(this.badge)}>
            {(badge) => (
              <>
                <slot name={this.slotForName("lead")} />{" "}
                <span class={BADGE} part={this.partForName("badge")} data-state={this.badgeState}>
                  {this.translationForKey(`badge_${badge()}`, { id: this.badgeItem?.toUpperCase() ?? "" })}
                </span>{" "}
              </>
            )}
          </Show>
          <slot />
        </div>
      </div>
    )
  }
}

/** Its tick's colour:  its badge's, on the section's title. */
const STATE_TONES: Record<string, string> = {
  recent: "green",
  progress: "blue",
  replied: "orange",
  open: "yellow",
  attention: "red"
}

/** A phase under way:  the load indicator its row shows, standing still (epic `epic-engine` I226). */
const WORKING_ICON = "circle notch"

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicAwayLine extends E.AttributeValues<typeof epicAwayLineVocabulary> {}
