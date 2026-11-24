import { DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"
import { CloseAllRule, type CloseAllKind } from "spell/epic/components/epic-section/CloseAllRule"

import { Hush, type HushSkips } from "./Hush"
import { InstantUndo, type UndoRecord } from "./InstantUndo"
import type { PlanDoc } from "./PlanDoc"
import { PlanDocFiles } from "./PlanDocFiles"

/****************
 * ### `CloseAll`
 * A section's Close all, on the page server (epic `epic-engine` T158):  every DECIDED judgement call, FIXED issue or
 * DONE todo the person saw counted, closed as their ✓ on each would close it, in ONE edit of the page.
 * - which items:  `CloseAllRule`, the rule the button counts by, on the page as the server has it (`candidates()`),
 *   with the inbox's marks, Claude's work and unfinished threads left out (`Hush.skipsOf()`), and what only the page
 *   file says:  one waiting on their pick, one a tidy found promised, one Claude has queued or is at work on
 * - only the ids the page sent:  never one they didn't see counted;  an id no longer closable is left, and said
 * - each closed as `inbox apply` applies their ✓ (`PlanDoc.applyAction()`, `reviewedAs()`), its log line
 *   `J4 approved:  closed (accepted) -- Close all`, then one line for the lot
 * - kept for Undo as ONE record (`InstantUndo.keepBatch()`):  Undo puts each back, unless it changed since
 * - node only:  the review routes load it lazily, as `InstantMarks`
 ****************/
export class CloseAll {
  /**
   * The ids (lower case) of `plan`'s items Close all on section kind `kind` closes now, in page order.
   * - pure:  reads the page, changes nothing
   */
  static candidates(plan: PlanDoc, kind: CloseAllKind, skip: HushSkips = {}): string[] {
    const now = plan.now.getTime()
    return plan.allItems.flatMap((item) => {
      const id = item.id
      if (skip.marked?.has(id) || skip.working?.has(id)) return []
      const facts = plan.facts(item)
      if (facts.awaitsPick || facts.underway || facts.queued !== undefined || Hush.isPromised(item)) return []
      const state = DrawnState.of({ ...DrawnState.fieldsOf(item), state: plan.itemState(item) }, NO_LIVE_REVIEW, now)
      const commented = !!skip.commented?.has(id)
      return CloseAllRule.closes(kind, item, { state, live: NO_LIVE_REVIEW, commented }) ? [id] : []
    })
  }

  /**
   * Close each of `ids` on `plan` that's still a candidate, as the person's ✓ would;  what each did, and the ids left.
   * - writes, the caller saves:  one write of the page
   */
  static apply(plan: PlanDoc, kind: CloseAllKind, ids: readonly string[], skip: HushSkips = {}): CloseAllApplied {
    const still = new Set(CloseAll.candidates(plan, kind, skip))
    const closed: UndoRecord[] = []
    const left: string[] = []
    const at = plan.now.toISOString()
    for (const raw of ids) {
      const id = raw.toLowerCase()
      if (!still.has(id)) {
        left.push(id)
        continue
      }
      const item = plan.item(id)
      const before = InstantUndo.snapshotOf(item)
      const result = plan.applyAction(item, { id, action: "approve" })
      if (!result.applied) {
        left.push(id)
        continue
      }
      plan.reviewedAs(item, "approve")
      plan.log(`${id.toUpperCase()} ${result.did} -- ${LOG_WORDS}`)
      closed.push({
        id,
        action: "approve",
        did: result.did,
        at,
        undoable: true,
        before,
        after: InstantUndo.snapshotOf(item)
      })
    }
    if (closed.length) plan.log(`${LOG_WORDS}:  ${closed.length} closed${left.length ? `, ${left.length} left` : ""}`)
    return { closed, left }
  }

  /**
   * SIDE EFFECT:  Close all on page `file`:  `ids`, of section kind `kind`, closed in one edit, kept for Undo;  what
   * was closed, what was left, and the Undo's key.
   * - `root`:  the checkout the page server serves (`PlanDocFiles`)
   * - nothing to close:  the page is not written
   */
  static async run(file: string, root: string, kind: CloseAllKind, ids: readonly string[]): Promise<CloseAllResult> {
    const files = new PlanDocFiles({ root })
    const skip = Hush.skipsOf(file)
    const planned = CloseAll.apply(files.read(file), kind, ids, skip)
    const done = planned.closed.length
      ? await files.edit(file, (plan) => CloseAll.apply(plan, kind, ids, skip))
      : planned
    const batch = `close-all:${kind}:${Date.now()}`
    if (done.closed.length) InstantUndo.keepBatch(file, batch, done.closed)
    return { closed: done.closed.map((each) => each.id), left: done.left, ...(done.closed.length ? { batch } : {}) }
  }
}

/** What `CloseAll.apply()` did:  each item closed, as Undo keeps it, and the ids left. */
export type CloseAllApplied = {
  /** each item closed, before and after */
  closed: UndoRecord[]
  /** the ids it left:  no longer closable, or the ✓ didn't apply */
  left: string[]
}

/** What a Close all did, as the page hears it. */
export type CloseAllResult = {
  /** the ids closed, lower case */
  closed: string[]
  /** the ids left as they are */
  left: string[]
  /** its Undo's key;  missing when nothing closed */
  batch?: string
}

/** What its log lines say it was. */
const LOG_WORDS = "Close all"
