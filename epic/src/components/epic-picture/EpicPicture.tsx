import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { PictureDeletes } from "spell/epic/review"

// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"

import { epicPictureVocabulary } from "./EpicPicture.en"

import pictureCSS from "./EpicPicture.css?inline"

/****************
 * ### `<epic-picture>`
 * A picture the person gave an item (epic `epic-engine` T87):  pasted into the chat that filed it
 * (`epic add ... --pasted 1`), or handed to `epic add --picture <file>`.
 * - Its picture is the `<img>` inside it, light DOM:  a page with no script shows it too, and the docs runtime opens
 *   it full size on a click (`ImageZoom`), as every picture on the page.
 *   - the file:  beside the page, `pictures/<item>-<time>.png` (`ItemPictures`, in the epic tool)
 * - A thumbnail:  at most 320px wide and 240px tall, its own shape kept.
 * - While the page is reviewed, a trash at its top right corner (`delete`):
 *   - ONE click, no dialog, as a comment's trash:  the picture goes at once, "Picture deleted" with Undo in the
 *     page's notices
 *   - once Undo has had its 6 seconds, the page server takes it out of the item and deletes its file
 *     (`PictureDeletes`, `POST delete-picture`);  the page's live update then carries the item without it
 * - Its item:  the `<epic-item>` it's written in (`closest()`).
 ****************/
export class EpicPicture extends E.UIComponent<typeof epicPictureVocabulary> {
  @E.proto static vocabulary = epicPictureVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-picture": pictureCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its item's view of the review inbox:  is the page reviewed? */
  readonly review = new ReviewState(() => this.itemId)

  /** Deleted, its Undo still open:  hidden. */
  @E.state accessor isDeleted = false

  /** Follow the inbox while connected;  a picture deleted and drawn again (a live patch) stays hidden. */
  @E.whileConnected
  protected followReviews() {
    const src = this.src
    if (src && PictureDeletes.isPending(src)) this.isDeleted = true
    return this.review.connect()
  }

  /** Its item's id, lower-case as the inbox keys it;  none outside one. */
  get itemId(): string | undefined {
    return this.domElement.closest("epic-item")?.id.toLowerCase() || undefined
  }

  /** Its picture's address, as the page has it:  its `<img src>`. */
  get src(): string | undefined {
    return this.domElement.querySelector("img")?.getAttribute("src") || undefined
  }

  /** Hidden while deleted, waiting on its Undo. */
  @E.cssState("deleted")
  get isHidden(): boolean {
    return this.isDeleted
  }

  /** The trash shows:  in an item, the page reviewed (served, so it can post). */
  get canDelete(): boolean {
    return !!this.itemId && this.review.reviewing()
  }

  /**
   * The trash clicked:  hidden at once, the delete sent once its Undo has had its time (`PictureDeletes`).
   * - NEVER throws:  a failed post is the client's notice
   */
  readonly delete = (event: MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    const { itemId: id, src } = this
    const client = this.review.client
    if (!id || !src || !client) return
    this.isDeleted = true
    PictureDeletes.start(client, {
      id,
      src,
      words: { deleted: this.translationForKey("deleted"), undo: this.translationForKey("undo") },
      undo: () => {
        this.isDeleted = false
      }
    })
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <slot />
        <Show when={this.canDelete}>
          <ui-button
            appearance="circular basic"
            size="mini"
            icon="trash can"
            part={this.partForName("delete")}
            title={this.translationForKey("deleteTip")}
            aria-label={this.translationForKey("deleteTip")}
            onClick={this.delete}
          />
        </Show>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPicture extends E.AttributeValues<typeof epicPictureVocabulary> {}
