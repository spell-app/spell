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
 * - LABELLED (epic `epic-engine` P75):  `label="IMG2"` draws a small chip on the thumbnail's top left corner, so the
 *   person can name it in words ("IMG2 is wrong");  the epic tool writes an item's, in order (`ItemPictures`)
 * - Every picture the person gives a page draws through it (P75):  a comment's words (`<epic-thread>`), a note box's
 *   strip (`<epic-review>`), the kickoff box (`<epic-kickoff>`), the quoted kickoff prompt (`<epic-prompt>`)
 *   - in a box still being written, `removable` draws an x in place of the trash:  `epic-picture-removed` hands the
 *     box its label, and the box takes its words out (`Pictures.without()`)
 *   - in a shadow root it has no item (`closest()` stops there), so no trash
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

  /**
   * The trash shows:  in an item, one of its `pictures/` (the page server deletes no other:  a note's kept picture is
   * in `tests/`), the page reviewed (served, so it can post);  never with the x (`removable`).
   */
  get canDelete(): boolean {
    return !this.removable && !!this.itemId && ITEM_PICTURE.test(this.src ?? "") && this.review.reviewing()
  }

  /** The x pressed (`removable`):  `epic-picture-removed`, the box takes its words out. */
  readonly remove = (event: MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    this.send("epic-picture-removed", { label: this.label ?? "", src: this.src ?? "" })
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

  /** The x's tooltip and name:  `Take IMG2 out`. */
  get removeTip(): string {
    return this.translationForKey("removeTip", { label: this.label || this.translationForKey("thisPicture") })
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <slot />
        <Show when={this.label}>
          <span class="label" part={this.partForName("label")} aria-hidden="true">
            {this.label}
          </span>
        </Show>
        <Show when={this.removable}>
          <ui-button
            appearance="circular basic"
            size="mini"
            icon="xmark"
            part={this.partForName("remove")}
            data-tooltip={this.removeTip}
            aria-label={this.removeTip}
            onClick={this.remove}
          />
        </Show>
        <Show when={this.canDelete}>
          <ui-button
            appearance="circular basic"
            size="mini"
            icon="trash can"
            part={this.partForName("delete")}
            data-tooltip={this.translationForKey("deleteTip")}
            aria-label={this.translationForKey("deleteTip")}
            onClick={this.delete}
          />
        </Show>
      </div>
    )
  }
}

/** A picture the trash may delete:  one in the page's `pictures/` folder (`ItemPictures`' `PICTURE_SRC`). */
const ITEM_PICTURE = /(?:^|\/)pictures\/[\w.-]+$/

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPicture extends E.AttributeValues<typeof epicPictureVocabulary> {}
