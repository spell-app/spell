import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"

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
 * - The click is the old Add Details (`ReviewClient.press(id, "details")`, its `askNow()`):
 *   posted to the page server's requests for now, which wakes the epic when nobody listens;
 *   the item then shows it under way, as any request for now.
 * - Drawn only while the page is reviewed (served, so it can post);  the link not while the request is on its way or
 *   under way:  the item's icon turns then, and calls it off.
 * - A link, not a button:  it reads as part of the sentence, as Owen asked.
 * - With `icon` (epic `epic-engine` T76):  a circle-question button at the right of an item's body, which
 *   `<epic-item>` draws while the page is reviewed (Owen, 2026-11-15:  "a circle-question icon which ask for
 *   clarification on the body text, without waiting for send").
 *   - the same ask as the link:  its item's Add Details press (`ReviewState.press("details")`)
 *   - kept while Claude works on it, turning like a coin (`turning`);  a click then calls it off, as a busy button's does
 *   - its item:  `of`, as `<epic-review>`'s, since it's drawn in the item's shadow root, where `closest()` can't reach
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

  /** Its item's id, lower-case as the inbox keys it:  `of`, else the `<epic-item>` it's written in;  none outside one. */
  get itemId(): string | undefined {
    return (this.of || this.domElement.closest("epic-item")?.id)?.toLowerCase() || undefined
  }

  /**
   * It shows:  in an item, the page reviewed;
   * the link only while nothing's asked for it now (the icon stays, turning).
   */
  get shows(): boolean {
    return !!this.itemId && this.review.reviewing() && (!!this.icon || !this.review.running())
  }

  /** The icon, while Claude works on its item's details (the item's busy button is Add Details'):  it turns. */
  @E.cssState("turning")
  get isTurning(): boolean {
    return !!this.icon && this.review.busyButton() === "details"
  }

  /**
   * Clicked:  its item's Add Details press (`ReviewClient.press()`), so link and icon are ONE ask:
   * its details asked for now;  while the icon turns, called off.
   * - NEVER throws:  a failed post is the client's notice
   */
  readonly clarify = (event: MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    if (this.itemId) this.review.press("details")
  }

  render(): JSX.Element {
    if (this.icon)
      return (
        <Show when={this.shows}>
          <button
            type="button"
            class={this.rootClass}
            part={this.partForName("base")}
            title={this.translationForKey(this.isTurning ? "turningTip" : "iconTip")}
            aria-label={this.translationForKey(this.isTurning ? "turningTip" : "iconTip")}
            onClick={this.clarify}
          >
            <ui-icon name={CLARIFY_ICON} part={this.partForName("icon")} />
          </button>
        </Show>
      )
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

/** The icon's glyph. */
const CLARIFY_ICON = "circle question"

// its tag, drawn by `<epic-item>` in its shadow root (the icon, T76)
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-clarify": EpicJSXAttributes
    }
  }
}
