import { ThreadFacts } from "spell/epic/comments"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `MoreRequestsFirst`
 * The migration `more-requests-first` (epic `epic-engine` P27;  Owen, 2026-10-24:  "my comment should be ABOVE your
 * 'MORE DETAILS' and should be initially collapsed.  The way you have it, the flow of what was done when was
 * reversed"):  Owen's note asking for More Details goes just BEFORE Claude's card.
 * - which notes:  his reply (`<epic-reply from="Owen">`) asking for them (`re="details"` or `re="revisit now"`) right
 *   after an item's `<epic-more>` card:  `inbox done` kept it there, after the card it asked for
 *   - moved to just before that card, every word kept;  the item then draws it folded (`AnswerThread`)
 *   - since P27, `PlanDoc.keepNote()` writes it there itself
 * - NOT a later "revisit soon" after the card:  that's a reply to it, in its place
 * - IDEMPOTENT:  a moved note is before the card, where nothing matches again
 * - Cheap markup:  every edit runs it too (`everyEdit`)
 ****************/
export class MoreRequestsFirst implements Migration {
  readonly name = "more-requests-first"
  readonly kind = "epic"
  readonly date = "2026-10-24"
  readonly everyEdit = true
  readonly description = "Owen's note asking for More Details moved above Claude's card, which answers it"

  /** Move every such note in `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    let changed = false
    for (const more of Array.from(document.querySelectorAll("epic-item > epic-more"))) {
      const note = more.nextElementSibling
      if (note?.localName !== "epic-reply" || !MoreRequestsFirst.asksForMore(note)) continue
      more.before(note)
      context.notes?.push(
        `more-requests-first:  ${more.parentElement?.id?.toUpperCase()}:  Owen's note moved above More Details`
      )
      changed = true
    }
    return changed
  }

  /** Is `reply` a person's note asking for More Details? */
  private static asksForMore(reply: Element): boolean {
    return !ThreadFacts.isAgents(reply) && ASKS_FOR_MORE.test(reply.getAttribute("re") ?? "")
  }
}

/** What `keepNote()` names a request for More Details by:  Add Details, revisit now. */
const ASKS_FOR_MORE = /^(details|revisit now)$/
