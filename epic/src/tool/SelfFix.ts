import { ThreadFacts } from "spell/epic/comments"
import { Markup } from "spell/epic/markup"
import { partOf } from "spell/epic/review/review.types"
import { PlanItem } from "spell/epic/tool/PlanItem"
import { ISSUE_ID } from "spell/epic/tool/planDoc.types"

import type { ReviewInbox } from "./ReviewInbox"

/****************
 * ### `SelfFix`
 * An issue Claude found and fixed before the person got to it (epic `epic-engine` T143):
 * grey at once, its line reading `FIXED - <description>`, with nothing for them to press.
 * - Owen, 2026-11-22:  "Issues which are fixed before I get to them can just be labeled `FIXED - <description>` and
 *   go to grey automatically";  asked which:  "Only ones Claude found"
 * - never one from their own words (`requested`):  that waits for their look, light orange
 * - never one they got to first (`isGotTo()`):  that waits for their check, orange
 * - on the page:  `<epic-item status="done" self-fixed>`
 *   - closed, so whatever reads a closed item leaves it be
 *   - `FIXED - ` starts its line, as any fix's (`TitlePrefix`):  the stored title never changes
 * - the ONE place the rule lives:  the fix (`PlanDoc`) and the migration `self-fixed-issues` both ask here
 * - reads only what it's handed, never a file:  the inbox's share is `actedOn()`, worked out by whoever read it
 ****************/
export class SelfFix {
  /**
   * Does fixing `item` need nothing from the person:  an issue, not `requested`, that they hadn't got to?
   * - `actedOn`:  the items they acted on in the page's review inbox (`actedOn()`)
   */
  static isTheirsToSkip(item: Element, actedOn: ReadonlySet<string> = new Set()): boolean {
    return ISSUE_ID.test(item.id) && !item.hasAttribute("requested") && !SelfFix.isGotTo(item, actedOn)
  }

  /**
   * Has the person got to `item`?
   * - Do this (`urgent`), or a review, deferral or queued work
   * - a mark of theirs already handled (`review-as`:  a Revisit, say), or their reply in it
   * - a mark, comment or urgency waiting in the inbox (`actedOn`)
   * - what only the Log keeps:
   *   - their click on its id chip (urgent, or not), once applied
   *   - a review, deferral or queued work:  a fix for their review takes `reviewed` off, and starting the work
   *     `queued` (I375, 2026-11-22:  OK'd, then greyed by the migration)
   */
  static isGotTo(item: Element, actedOn: ReadonlySet<string> = new Set()): boolean {
    if (actedOn.has(item.id.toLowerCase()) || ACTED_ATTRIBUTES.some((name) => item.hasAttribute(name))) return true
    const replies = Array.from(item.querySelectorAll("epic-reply"))
    if (replies.some((reply) => !PlanItem.inOriginal(reply) && !ThreadFacts.isAgents(reply))) return true
    const label = item.id.toUpperCase()
    const events = item.ownerDocument.querySelectorAll('epic-page > epic-section[kind="log"] epic-event')
    return Array.from(events).some((event) => {
      const line = event.textContent?.trim() ?? ""
      return ACTED_LINES.some((acted) => acted.exec(line)?.[1] === label)
    })
  }

  /**
   * The ids (lower case) of what the person acted on in `inbox`, sent or not:
   * - their marks, waiting or taken, and their requests for now
   * - their urgency, from an id chip
   * - their comments, answered and closed ones too
   */
  static actedOn(inbox: ReviewInbox): Set<string> {
    const ids = [
      ...Object.keys(inbox.marks),
      ...Object.keys(inbox.taken),
      ...Object.keys(inbox.urgency),
      ...inbox.now.map((request) => request.id),
      ...Object.values(inbox.comments).map((comment) => partOf(comment.anchor))
    ]
    return new Set(ids.map((id) => id.toLowerCase()))
  }

  /**
   * SIDE EFFECT:  `item` is fixed with nothing for the person to do.
   * - closed, `self-fixed`, no longer waiting for their review
   * - its UPDATE label, if any, says `fixed`:  the line's prefix shows that word, the label only `Not in main`
   */
  static mark(item: Element): void {
    Markup.set<"epic-item">(item, { status: "done", selfFixed: true, fixed: undefined })
    PlanItem.updateLabelOf(item)?.setAttribute("became", "fixed")
  }
}

/** An item's own attributes saying the person got to it. */
const ACTED_ATTRIBUTES = ["urgent", "reviewed", "deferred", "queued", "review-as"] as const

/**
 * The Log's lines saying the person got to an item;  each one's id.
 * - their click on its id chip (`AuthorWords.fromChip()`)
 * - `epic review`, `epic defer`, `epic queue`:  it was talked through with them
 */
const ACTED_LINES = [/^([A-Z]+\d+) (?:not )?urgent\b.*from its id chip\)/, /^([A-Z]+\d+) (?:reviewed|deferred|to do):/]
