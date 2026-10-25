import { PhaseTakes } from "spell-epic/tool/PhaseTakes"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `TakenInPhase`
 * The migration `taken-in-phase` (epic `epic-engine` I128):  every closed item a phase's text links gets the phase that
 * took it up, `<epic-item taken-in="p-fix-open-issues">`, so its line shows `in P1` as a handled question's does.
 * - the rule, which phase when several link it:  `PhaseTakes` (the latest done one;  else the active one)
 * - for the pages nobody edits:  every edit works it out anyway (`PlanDoc.updateStates()`), so it's not `everyEdit`
 * - IDEMPOTENT:  an item already `taken-in` is left as it is
 ****************/
export class TakenInPhase implements Migration {
  readonly name = "taken-in-phase"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = false
  readonly description = "a closed item a phase's text links names that phase (`taken-in`):  its line shows `in P1`"

  /** Stamp `taken-in` on every closed item of `document` a phase took up, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const stamped = PhaseTakes.stamp(document)
    for (const id of stamped) {
      const phase = document.getElementById(document.getElementById(id)!.getAttribute("taken-in")!)!
      context.notes?.push(`taken-in-phase:  ${id.toUpperCase()} in ${phase.id}`)
    }
    return stamped.length > 0
  }
}
