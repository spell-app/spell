import { PageNotices } from "./PageNotices"
import type { ReviewClient } from "./ReviewClient"
import { NOTICE_MS } from "./review.types"

/****************
 * ### `PictureDeletes`
 * An item's picture deleted from the page (`<epic-picture>`'s trash, epic `epic-engine` T87):  hidden at once,
 * Undo in the page's notices for `NOTICE_MS`, then deleted for good by the page server (`ReviewClient.deletePicture()`).
 * - the delete WAITS for its Undo, rather than being undone afterwards:  the file is gone once posted, so a put-back
 *   would have to send the picture back up;  as a comment's trash does, ONE click, no dialog
 * - the page going away with a delete still waiting sends it at once, as a request that outlives the page
 *   (`keepalive`)
 * - keyed by the picture's `src`:  a live patch that redraws the item draws a new `<epic-picture>`, which asks
 *   `isPending()` and stays hidden
 * - plain DOM and timers:  no Solid, no `spell/element`;  the page's ONE list, on the class
 ****************/
export class PictureDeletes {
  /** The deletes waiting on their Undo, by `src`. */
  private static readonly waiting = new Map<string, WaitingDelete>()

  /** The page's `pagehide` listener, once added. */
  private static listening = false

  /**
   * Delete item `id`'s picture `src` from page `client` once its Undo has had its time.
   * - the caller hides it first;  SIDE EFFECT:  a notice with Undo, `undo` run on Undo
   * - NEVER throws:  a failed post is the client's notice
   */
  static start(client: ReviewClient, { id, src, words, undo }: PictureDeleteProps): void {
    PictureDeletes.listen()
    PictureDeletes.cancel(src)
    const timer = setTimeout(() => void PictureDeletes.send(src), NOTICE_MS)
    PictureDeletes.waiting.set(src, { client, id, timer })
    PageNotices.show(words.deleted, {
      tone: "success",
      ms: NOTICE_MS,
      actions: [
        {
          text: words.undo,
          icon: "rotate left",
          click: () => {
            if (PictureDeletes.cancel(src)) undo()
          }
        }
      ]
    })
  }

  /** Is picture `src` deleted, waiting on its Undo? */
  static isPending(src: string): boolean {
    return PictureDeletes.waiting.has(src)
  }

  /** Call off picture `src`'s waiting delete;  whether there was one. */
  static cancel(src: string): boolean {
    const waiting = PictureDeletes.waiting.get(src)
    if (!waiting) return false
    clearTimeout(waiting.timer)
    PictureDeletes.waiting.delete(src)
    return true
  }

  /**
   * Send picture `src`'s waiting delete now;  whether it was done.
   * - `keepalive`:  the page is going away
   */
  static async send(src: string, { keepalive = false }: { keepalive?: boolean } = {}): Promise<boolean> {
    const waiting = PictureDeletes.waiting.get(src)
    if (!waiting) return false
    PictureDeletes.cancel(src)
    return waiting.client.deletePicture(waiting.id, src, { keepalive })
  }

  /** SIDE EFFECT:  the page going away sends every waiting delete at once (once per page). */
  private static listen(): void {
    if (PictureDeletes.listening || typeof window === "undefined") return
    PictureDeletes.listening = true
    window.addEventListener("pagehide", () => {
      for (const src of [...PictureDeletes.waiting.keys()]) void PictureDeletes.send(src, { keepalive: true })
    })
  }
}

/** `PictureDeletes.start()`'s props. */
export type PictureDeleteProps = {
  /** its item's id, lower-case */
  id: string
  /** its `<img src>`, as the page has it */
  src: string
  /** the notice's words, in the page's language */
  words: { deleted: string; undo: string }
  /** put it back on the page:  Undo was pressed */
  undo: () => void
}

/** A delete waiting on its Undo. */
type WaitingDelete = { client: ReviewClient; id: string; timer: ReturnType<typeof setTimeout> }
