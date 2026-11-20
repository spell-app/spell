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
 * - Drawn as a link, so it reads as part of the sentence, as Owen asked;  but a `<button>`, never `<a href="#">`
 *   (epic `epic-engine` I289):  a hash-only link is a jump to the page's top for anything that follows it (a webview's
 *   own link handling, a middle-click, a click before the pack has loaded), and Owen saw the page jump to its top
 * - The click moves nothing:  no focus, no scroll;  the item's icon turning is the feedback (I289)
 * - With `icon` (epic `epic-engine` T76):  an (i) button, last on an item's line, which `<epic-item>` draws while the
 *   page is reviewed, on every kind of item (T95;  Owen, 2026-11-18:  "add (i) clarify button to everything, issues,
 *   judgement calls, the lot").
 *   - a circle-question at the right of an item's body, drawn once the item was opened, until T95 (Owen, 2026-11-15:
 *     "a circle-question icon which ask for clarification on the body text, without waiting for send")
 *   - the same ask as the link:  its item's details asked for now (`ReviewState.clarify()`);  his own ask only (I295)
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
    return !!this.itemId && this.review.reviewing() && (!!this.icon || !this.review.clarifying())
  }

  /**
   * The icon, while Owen's own ask for its item's details is on its way or being answered:  it turns.
   * - only his ask (`ReviewState.clarifying()`, epic `epic-engine` I295):  an agent merely at work on the item
   *   (an issue taken up, its working flag on) leaves it still
   */
  @E.cssState("turning")
  get isTurning(): boolean {
    return !!this.icon && this.review.clarifying()
  }

  /**
   * Clicked:  its item's details asked for now (`ReviewState.clarify()`), so link and icon are ONE ask;
   * while the icon turns, called off.
   * - only Owen's own ask is called off:  an agent at work on the item goes on (epic `epic-engine` I295)
   * - NEVER throws:  a failed post is the client's notice
   */
  readonly clarify = (event: MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    if (this.itemId) this.review.clarify()
  }

  render(): JSX.Element {
    if (this.icon)
      return (
        <Show when={this.shows}>
          <button
            type="button"
            class={this.rootClass}
            part={this.partForName("base")}
            data-tooltip={this.translationForKey(this.isTurning ? "turningTip" : "iconTip")}
            aria-label={this.translationForKey(this.isTurning ? "turningTip" : "iconTip")}
            onClick={this.clarify}
          >
            <ui-icon name={CLARIFY_ICON} part={this.partForName("icon")} />
          </button>
        </Show>
      )
    return (
      <Show when={this.shows}>
        <button
          type="button"
          class={[this.rootClass, LINK]}
          part={this.partForName("base")}
          data-tooltip={this.translationForKey("clarifyTip")}
          onClick={this.clarify}
        >
          {this.translationForKey("clarify")}
        </button>
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicClarify extends E.AttributeValues<typeof epicClarifyVocabulary> {}

/** The icon's glyph:  Spell UI's info circle, Owen's "(i)" (T95;  a circle-question before). */
const CLARIFY_ICON = "info circle"

/** The link's class:  a `<button>` drawn as a word of the sentence (`EpicClarify.css`). */
const LINK = "link"

// its tag, drawn by `<epic-item>` on its line, in its shadow root (the icon, T76, T95)
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-clarify": EpicJSXAttributes
    }
  }
}
