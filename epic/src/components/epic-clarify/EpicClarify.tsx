import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"

import { epicClarifyVocabulary } from "./EpicClarify.en"

import clarifyCSS from "./EpicClarify.css?inline"

/****************
 * ### `<epic-clarify>`
 * "Clarify", after the words an item with no details is given ("_What it says on the tin._"):  a click asks Claude
 * for the item's details at once, no Send (epic `epic-engine` I281;  Owen, 2026-11-14:  "a link that instructs you to
 * provide more details, without waiting for send").
 * - Its item:  the `<epic-item>` it's written in (`closest()`);  the epic tool writes it there (`PlanItem.giveBody()`).
 * - The click is the old Add Details:  `ReviewClient.askNow(id, "details")`, which posts it to the page server's
 *   requests for now and wakes the epic when nobody listens;  the item then shows it under way, as any request for now.
 * - Drawn only while the page is reviewed (served, so it can post), and not while the request is on its way or under
 *   way:  the item's busy button says so then, and calls it off.
 * - A link, not a button:  it reads as part of the sentence, as Owen asked.
 ****************/
export class EpicClarify extends E.UIComponent<typeof epicClarifyVocabulary> {
  @E.proto static vocabulary = epicClarifyVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-clarify": clarifyCSS }
  } satisfies Partial<E.ElementSetup>

  /** Its item's view of the review inbox. */
  readonly review = new ReviewState(() => this.itemId)

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /** Its item's id, lower-case as the inbox keys it;  none outside an item. */
  get itemId(): string | undefined {
    return this.domElement.closest("epic-item")?.id.toLowerCase() || undefined
  }

  /** The link shows:  in an item, the page reviewed, nothing asked for it now. */
  get shows(): boolean {
    return !!this.itemId && this.review.reviewing() && !this.review.running()
  }

  /** Ask for its item's details now.  NEVER throws:  a failed post is the client's notice. */
  readonly clarify = (event: MouseEvent): void => {
    event.preventDefault()
    const id = this.itemId
    if (id) void this.review.client?.askNow(id, "details").catch((error) => console.error(error))
  }

  render(): JSX.Element {
    return (
      <Show when={this.shows}>
        <a
          href="#"
          role="button"
          class={this.rootClass}
          part={this.partForName("base")}
          title={this.translationForKey("clarifyTip")}
          onClick={this.clarify}
        >
          {this.translationForKey("clarify")}
        </a>
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicClarify extends E.AttributeValues<typeof epicClarifyVocabulary> {}
