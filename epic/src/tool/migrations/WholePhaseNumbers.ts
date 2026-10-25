import { PhaseNumbers } from "spell-epic/tool/PhaseNumbers"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `WholePhaseNumbers`
 * The migration `whole-phase-numbers` (epic `epic-engine` I126):  every DECIMAL phase (`<epic-phase number="17.1">`,
 * added on the fly by P39's `add-phase --after 17`) a whole one, numbered by its place;  the phases after it move
 * down one.
 * - Owen, 2026-10-25:  "I'm not digging the fractional phase numbers ... ditch the 17.1 and just reorder"
 * - what names a phase by number follows, all at once (`PhaseNumbers.makeWhole()`):  items' and updates' `phase`, the
 *   `P17.1` in links' words, every `P17.1 · <name>` in the page's words;  the log and an Original Discussion keep
 *   theirs
 * - a STARTED phase whose number changes is noted:  its commits filed under the old number stay on it, but a
 *   commit subject naming the old number would file elsewhere
 * - replaces `decimal-phases-agree` (P39), which kept a decimal in step with its place:  no decimal is left to keep
 * - IDEMPOTENT:  a page with no decimal changes nothing;  so does every page from before P39 (none has one)
 * - Cheap markup:  every edit runs it too (`everyEdit`), so a page left with one is mended by its next edit
 ****************/
export class WholePhaseNumbers implements Migration {
  readonly name = "whole-phase-numbers"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = true
  readonly description = "every decimal phase (P17.1) a whole one by its place, the phases after it renumbered"

  /** Make every decimal phase in `document` whole, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const started = new Set(
      Array.from(document.querySelectorAll('epic-phase[status="done"], epic-phase[status="active"]'), (p) => p.id)
    )
    const before = PhaseNumbers.snapshot(document)
    const changed = PhaseNumbers.makeWhole(document)
    if (!changed.length) return false
    for (const line of changed) context.notes?.push(`whole-phase-numbers:  ${line}`)
    const now = PhaseNumbers.snapshot(document)
    for (const id of started)
      if (before.get(id) !== now.get(id))
        context.notes?.push(`whole-phase-numbers:  ${id} has started:  commits saying P${before.get(id)} name it`)
    return true
  }
}
