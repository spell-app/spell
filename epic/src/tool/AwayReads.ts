import { AWAY_ID } from "spell/epic/definitions/definitions.types"

import { PlanDocFiles } from "./PlanDocFiles"
import { ReviewInbox } from "./ReviewInbox"
import type { MarkResult, PlanMark } from "./planDoc.types"

/****************
 * ### `AwayReads`
 * A Read in "0. While you were out", applied the moment Owen ticks it (epic `epic-engine` I268;  Owen, 2026-11-14:
 * "this shouldn't require a "send" to take effect, it should happen immediately").
 * - Which marks:  every Seen on `away` (Done reading) or `away:<line>` (a line, or a part's heading) in the page's
 *   inbox, sent or not:  reading is no request for Claude, so nothing waits for a Send or a session.
 * - Applied as `epic inbox apply` applies them (`PlanDoc.applyMark()`, in one `PlanDocFiles.edit()`), then cleared
 *   from the inbox, each only while it's still the mark applied (`clearApplied()`).
 *   - so the section, the lines' update blocks (`PlanDoc.seeUpdatesFor()`) and the page every viewer has change at
 *     once:  the page server's live reload carries the edit
 * - The review routes call it after a mark is set (`reviewRoutes.ts`, `POST mark`), loading it lazily:
 *   it brings `PlanDoc` with it, which the routes otherwise never load.
 ****************/
export class AwayReads {
  /** Is inbox key `key` a Read in the section:  `away`, or `away:<line>`? */
  static isAwayKey(key: string): boolean {
    return key === AWAY_ID || key.startsWith(`${AWAY_ID}:`)
  }

  /**
   * SIDE EFFECT:  every Read waiting in epic page `file`'s inbox applied to the page, and cleared;  what each did.
   * - `root`:  the checkout the page server serves (`PlanDocFiles`)
   * - none waiting:  touches nothing
   * - throws what the edit throws (a page in the old markup, a lock held too long):  the marks stay, for the next
   *   `epic inbox apply`
   */
  static async applyNow(file: string, root: string): Promise<AppliedRead[]> {
    const path = ReviewInbox.pathFor(file)
    const reads = ReviewInbox.read(path).markList.filter(
      (mark) => AwayReads.isAwayKey(mark.id) && mark.action === "seen"
    )
    if (!reads.length) return []
    const files = new PlanDocFiles({ root })
    const results = await files.edit(file, (plan) =>
      reads.map((mark): AppliedRead => ({ mark, ...plan.applyMark(mark as PlanMark) }))
    )
    const cleared = results.filter((each) => each.applied || each.gone).map((each) => each.mark)
    if (cleared.length) ReviewInbox.update(path, (box) => box.clearApplied(cleared))
    return results
  }
}

/** A Read and what `PlanDoc.applyMark()` did with it. */
export type AppliedRead = MarkResult & {
  /** the mark, as the inbox held it */
  mark: { id: string; at: string }
}
