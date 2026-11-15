import { isInstantDue } from "spell/epic/review/review.types"

import { PlanDocFiles } from "./PlanDocFiles"
import { PlanItem } from "./PlanItem"
import { ReviewInbox } from "./ReviewInbox"
import type { MarkResult, PlanMark } from "./planDoc.types"

/****************
 * ### `InstantMarks`
 * The marks the page server applies by itself, with no Send and no session:  a plain page update, nothing for Claude
 * (epic `epic-engine` I304;  Owen, 2026-11-15:  "Seems like the check mark shouldn't require a send -- is it invoking
 * claude code or just updating the epic marks file?").
 * - Which marks:  `isInstant()` (`spell/epic/review/review.types`), the ONE rule the page's Send count shares
 *   - a Read in "0. While you were out" (`away`, `away:<line>`;  I268, AwayReads before I304):  at once
 *   - an update block's Seen (`up3`)
 *   - an item's ✓ or x (approve, Saw it, drop, skip) with no note, comments, picture or pick:  once `INSTANT_GRACE_MS`
 *     has passed since it was made, so a second click takes it back first (`isInstantDue()`)
 * - Applied as `epic inbox apply` applies them (`PlanDoc.applyMark()`, in one `PlanDocFiles.edit()`), then cleared
 *   from the inbox, each only while it's still the mark applied (`clearApplied()`)
 *   - so the item, the section and the page every viewer has change at once:  the page server's live update carries
 *     the edit;  the log keeps a line per mark, as `apply`'s
 * - A test's mark is never applied here, nor an item gone from the page (cleared, as `apply` clears it).
 * - The review routes call it after a mark is set and on an inbox read (`reviewRoutes.ts`), loading it lazily:
 *   it brings `PlanDoc` with it, which the routes otherwise never load.
 ****************/
export class InstantMarks {
  /**
   * SIDE EFFECT:  every instant mark due in epic page `file`'s inbox applied to the page, and cleared;  what each did.
   * - `root`:  the checkout the page server serves (`PlanDocFiles`)
   * - none due:  touches nothing
   * - throws what the edit throws (a page in the old markup, a lock held too long):  the marks stay, for the next try
   *   or `epic inbox apply`
   */
  static async applyNow(file: string, root: string, now = Date.now()): Promise<AppliedInstant[]> {
    const path = ReviewInbox.pathFor(file)
    const due = InstantMarks.dueIn(ReviewInbox.read(path), now)
    if (!due.length) return []
    const files = new PlanDocFiles({ root })
    const results = await files.edit(file, (plan) =>
      due.flatMap((mark): AppliedInstant[] => {
        const item = plan.findItem(mark.id)
        // a test's ✓ is its own (a test run's answer):  left for the session
        if (item && PlanItem.kindOfItem(item) === "test") return []
        return [{ mark, ...plan.applyMark(mark as PlanMark) }]
      })
    )
    const cleared = results.filter((each) => each.applied || each.gone).map((each) => each.mark)
    if (cleared.length) ReviewInbox.update(path, (box) => box.clearApplied(cleared))
    return results
  }

  /** Does `inbox` hold an instant mark due at `now`? */
  static hasDue(inbox: ReviewInbox, now = Date.now()): boolean {
    return InstantMarks.dueIn(inbox, now).length > 0
  }

  /** The instant marks in `inbox` due at `now`, oldest first. */
  private static dueIn(inbox: ReviewInbox, now: number) {
    return inbox.markList.filter((mark) => isInstantDue(mark.id, mark, now))
  }
}

/** An instant mark and what `PlanDoc.applyMark()` did with it. */
export type AppliedInstant = MarkResult & {
  /** the mark, as the inbox held it */
  mark: { id: string; at: string }
}
