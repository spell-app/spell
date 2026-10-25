import { PhaseNumbers } from "spell-epic/tool/PhaseNumbers"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `DecimalPhasesAgree`
 * The migration `decimal-phases-agree` (epic `epic-engine` P39):  a DECIMAL phase (`<epic-phase number="11.1">`, a
 * phase added on the fly after P11) whose number no longer fits its place takes the one that does.
 * - out of place only by a hand edit:  `add-phase`, `epic move` and a drag keep the numbers right themselves
 *   - a decimal of the whole-numbered phase before it, after the decimals before it (`PhaseIds.misplacedDecimals()`)
 *   - none before it:  a whole number again
 * - what names it by number follows (`PhaseNumbers.follow()`):  items' `phase`, the `P11.1` in links' words
 *   - NOT the `P11.1 · Name` text in prose:  `PlanDoc.relabelPhaseNames()`, on the next move or insert
 * - IDEMPOTENT:  a page whose decimals fit changes nothing;  so does every page from before P39 (none has one)
 * - Cheap markup:  every edit runs it too (`everyEdit`)
 ****************/
export class DecimalPhasesAgree implements Migration {
  readonly name = "decimal-phases-agree"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = true
  readonly description = "a decimal phase (P11.1) out of place takes the number that fits it;  what names it follows"

  /** Renumber every decimal phase out of place in `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const before = PhaseNumbers.snapshot(document)
    const fixed = PhaseNumbers.fixDecimals(document)
    if (!fixed.length) return false
    PhaseNumbers.follow(document, before)
    for (const line of fixed) context.notes?.push(`decimal-phases-agree:  ${line}`)
    return true
  }
}
