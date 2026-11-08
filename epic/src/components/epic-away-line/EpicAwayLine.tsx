import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { AWAY_ID } from "spell/epic/definitions/definitions.types"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"

import { epicAwayLineVocabulary } from "./EpicAwayLine.en"

import awayLineCSS from "./EpicAwayLine.css?inline"

/****************
 * ### `<epic-away-line>`
 * One line of "0. While you were out", or one of its parts' headings, with its own tick (epic `epic-engine` I206;
 * Owen:  "a tick per section as well, so I can say 'that's good' on part but not on the whole thing").
 * - Its ✓ Read at the line's start, while the page is reviewed:  a Seen on `away:<line>` through the review inbox;
 *   `epic inbox apply` writes when he read it into the page (`<epic-page away-seen>`), and the section is drawn again
 *   without it.  A heading's (`done`, `todo`) takes its whole part.
 * - Read and not applied yet:  faded at once (`:state(read)`), as an update block goes quiet.
 *   - and the same the moment Owen marks the item the line is about (Do this, Approve ...):  it leaves the section
 *     when that's applied (`NightSummary.isAddressed()`, epic `epic-engine` I235)
 * - The epic tool writes every one (`PlanDoc.refreshAway()`);  no one writes it by hand.
 ****************/
export class EpicAwayLine extends E.UIComponent<typeof epicAwayLineVocabulary> {
  @E.proto static vocabulary = epicAwayLineVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-away-line": awayLineCSS },
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

  /** Its Read mark is in the inbox, or a mark on the item it's about:  faded until it's applied. */
  @E.cssState("read")
  get isRead(): boolean {
    return this.review.mark()?.action === "seen" || (!!this.line && this.review.isMarked(this.line))
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
            part={this.partForName("read")}
            label={this.translationForKey("buttonsLabel")}
          />
        </Show>
        <div part={this.partForName("body")}>
          <slot />
        </div>
      </div>
    )
  }
}

/** A phase under way:  the load indicator its row shows, standing still (epic `epic-engine` I226). */
const WORKING_ICON = "circle notch"

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicAwayLine extends E.AttributeValues<typeof epicAwayLineVocabulary> {}
