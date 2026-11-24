import { isInstantDue } from "spell/epic/review/review.types"

import { InstantUndo, type ItemSnapshot } from "./InstantUndo"
import type { PlanDoc } from "./PlanDoc"
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
 * - A test's mark is never applied here;  an item gone from the page clears its mark, as `apply` does.
 * - A dry run first:  the page is written only when a mark applies, so a mark that can't (left) never rewrites it.
 * - The review routes call it after a mark is set and on an inbox read (`reviewRoutes.ts`), loading it lazily:
 *   it brings `PlanDoc` with it, which the routes otherwise never load.
 * - each applied mark on an item is kept for undo (`InstantUndo`, epic `epic-engine` T80):
 *   a second click on the still-grey item puts it back
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
    const applyAll = (plan: PlanDoc) =>
      due.flatMap((mark): AppliedInstant[] => {
        const item = plan.findItem(mark.id)
        // a test's ✓ is its own (a test run's answer):  left for the session
        if (item && PlanItem.kindOfItem(item) === "test") return []
        const before = item && InstantUndo.snapshotOf(item)
        // an open question's ✓ answers it, changing its text:  more than an undo puts back (`InstantUndo`)
        const undoable = !(item && PlanItem.kindOfItem(item) === "question" && item.getAttribute("status") === "open")
        const result = plan.applyMark(mark as PlanMark)
        const after = item && InstantUndo.snapshotOf(item)
        return [{ mark, ...result, ...(before && after && { undo: { before, after, undoable } }) }]
      })
    // a dry run on a parsed copy first, as `inbox apply`'s:  the page is written only when something applies
    const planned = applyAll(files.read(file))
    const results = planned.some((each) => each.applied) ? await files.edit(file, applyAll) : planned
    const cleared = results.filter((each) => each.applied || each.gone).map((each) => each.mark)
    // waits with timers, never blocking:  the page server's own routes may hold the lock meanwhile (I463)
    if (cleared.length) await ReviewInbox.updateAsync(path, (box) => box.clearApplied(cleared))
    // kept, so a second click on the still-grey item can put each back (epic `epic-engine` T80)
    for (const each of results)
      if (each.applied && each.undo)
        InstantUndo.keep(file, {
          id: each.mark.id,
          action: each.mark.action ?? "",
          did: each.did,
          at: new Date(now).toISOString(),
          ...each.undo
        })
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
  mark: { id: string; at: string; action?: string }
  /** its item before and after, for `InstantUndo`;  missing for a mark on no item (a Read, a Seen) */
  undo?: { before: ItemSnapshot; after: ItemSnapshot; undoable: boolean }
}
