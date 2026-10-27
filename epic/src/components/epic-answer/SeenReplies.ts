import { E } from "spell/element"
// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"

/****************
 * ### `SeenReplies`
 * Has Owen SEEN Claude's newest reply on an item yet?  Until he has, it wears an orange edge and NEW
 * (epic `epic-engine` P27;  Owen:  "I like the orange border meaning 'pay attention to this'").
 * - The comment threads' seen rule, for an item's replies (`spell-doc-comments.js`' `markSeen()`, `watchSeen()`):
 *   - SEEN once the reply is on screen (half of it, or half the screen) for 1.2s while the page is in view
 *   - remembered in this browser, per page:  `spell-item-read:<path>`, `{ [item id]: time of the reply seen }`;
 *     a NEWER reply is unseen again
 *   - its own key, beside the comments' `spell-comment-read:<path>`:  an item id and a comment id never meet
 * - One per `<epic-reply>`:  it watches only while its reply is the newest and unseen (`watch()`).
 * - Best effort, through `PrefStore`:
 *   - storage refused (a private window):  what's seen is kept for this visit only
 *   - a write that fails is logged, and dropped
 ****************/
export class SeenReplies {
  /** The time of this item's reply Owen has seen, as stored;  `""` for none.  Tracked. */
  @E.state private accessor seenAt = ""

  /** Is `at` (a reply's time) seen, for item `itemId`?  Tracked. */
  isSeen(itemId: string, at: string): boolean {
    return !!at && this.seenAt >= at && this.seenItem === itemId
  }

  /** The item `seenAt` was read for. */
  private seenItem = ""

  /** Read what this browser has seen for item `itemId`.  NEVER throws. */
  load(itemId: string): void {
    this.seenItem = itemId
    this.seenAt = SeenReplies.read()[itemId] ?? ""
  }

  /** Owen has seen item `itemId`'s reply of time `at`:  remembered, its NEW gone.  NEVER throws. */
  markSeen(itemId: string, at: string): void {
    const read = SeenReplies.read()
    if ((read[itemId] ?? "") >= at) return
    read[itemId] = at
    PrefStore.setAt(SeenReplies.key(), read)
    this.seenItem = itemId
    this.seenAt = at
  }

  /**
   * Watch `element` while it's unseen:  on screen for `SEEN_SECONDS` with the page in view, `onSeen()`.
   * - Returns its stop.
   */
  static watch(element: Element, onSeen: () => void): () => void {
    if (typeof IntersectionObserver !== "function") return () => undefined
    let timer: E.CancelablePromise<void> | undefined
    const stopTimer = () => {
      timer?.cancel()
      timer = undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const screen = entry.rootBounds?.height ?? innerHeight
        const shown =
          entry.isIntersecting && (entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= screen / 2)
        if (!shown) return stopTimer()
        timer ??= E.after(SEEN_SECONDS, () => {
          timer = undefined
          if (document.visibilityState === "visible") onSeen()
        })
        timer.catch(() => undefined)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    observer.observe(element)
    return () => {
      stopTimer()
      observer.disconnect()
    }
  }

  /** This page's store:  `{ [item id]: time seen }`;  `{}` when there's none, or it won't read. */
  private static read(): Record<string, string> {
    const kept = PrefStore.getAt(SeenReplies.key())
    return kept && typeof kept === "object" ? (kept as Record<string, string>) : {}
  }

  /** This page's key. */
  private static key(): string {
    return `${SEEN_KEY_PREFIX}${location.pathname}`
  }
}

/** `localStorage` key prefix of the item replies Owen has seen on a page, per page. */
const SEEN_KEY_PREFIX = "spell-item-read:"

/** How long a reply must stay on screen to count as seen:  the comment threads' 1.2s (`SEEN_MS`). */
const SEEN_SECONDS = 1.2
