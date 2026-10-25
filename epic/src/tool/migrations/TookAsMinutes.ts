import { PlanTime } from "spell-epic/tool/PlanTime"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `TookAsMinutes`
 * The migration `took-as-minutes` (epic `epic-engine` P41):  every phase's `took`, the time Claude really worked on it,
 * in the one form the tool writes and the page draws:  `21m`, `1h 30m` (`PlanTime.formatMinutes()`).
 * - `took` is new markup:  `epic phase … done` writes it, `epic phase … took` works it out for a phase done before
 *   - a page without one is left as it is:  older phases get a time only when asked
 * - fixes a `took` written by hand in another form:  `21 min`, `1.5h`, `took 21m`, `~45m`
 * - one that won't parse is left, and reported;  an empty one goes
 * - IDEMPOTENT:  a written `took` is already in the tool's form
 * - Cheap markup:  every edit runs it too (`everyEdit`)
 ****************/
export class TookAsMinutes implements Migration {
  readonly name = "took-as-minutes"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = true
  readonly description = "a phase's `took` (the time Claude worked on it) in the tool's form:  `21m`, `1h 30m`"

  /** Rewrite every phase's `took` in `document` to the tool's form, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    let changed = false
    for (const phase of Array.from(document.querySelectorAll("epic-phase[took]"))) {
      const written = phase.getAttribute("took")!
      const said = written.replace(TOOK_WORD, "").trim()
      if (!said) {
        phase.removeAttribute("took")
        changed = true
        continue
      }
      const duration = PlanTime.parseDuration(said)
      if (!duration) {
        context.notes?.push(`took-as-minutes:  ${phase.id}:  took="${written}" won't read as a time;  left`)
        continue
      }
      const took = PlanTime.formatMinutes(duration.min)
      if (took === written) continue
      phase.setAttribute("took", took)
      context.notes?.push(`took-as-minutes:  ${phase.id}:  took="${written}" -> "${took}"`)
      changed = true
    }
    return changed
  }
}

/** A leading "took", as a hand-written value may say it. */
const TOOK_WORD = /^\s*took\b:?/i
