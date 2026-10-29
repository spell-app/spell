import { PhaseIds } from "spell/epic/phases"
import { PlanDates } from "spell/epic/dates"
import { PlanTime } from "spell/epic/tool/PlanTime"
import { UpdateMarks } from "spell/epic/tool/UpdateMarks"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `UpdatesSaidByMarks`
 * The migration `updates-said-by-marks` (epic `epic-engine` I159;  Owen, 2026-10-29, on P51's orange "Update:  No
 * answer buttons;  Start testing prepares the tests" under its Q53 change marks:  "Do we still need the orange update
 * section like this?";  his pick:  only when no mark says it):  a phase's `<epic-update>` block written in the same
 * pass as its change marks goes.
 * - before I159 the plan-rewrite agents ran `epic change`, then `epic updated`, for one answer:  the marks and a block
 *   saying the same;  since, `updated --for <ids>` writes nothing when the marks say it (`UpdateMarks`)
 * - which blocks:  a phase's own (`epic-phase > epic-update`, dated, never in an Original Discussion), when
 *   - it was stamped within `UpdateMarks.SAME_PASS_MINUTES` of a change mark in that phase
 *   - AND it names an item one of those same-pass marks names (`Owen answered Q53 ...`)
 * - CONSERVATIVE:  what the marks can't say keeps a block
 *   - a block HOLDING change marks (epic `epic-friend`'s:  its words are the marks', and would go with it)
 *   - a block naming a file or folder (a move), or an estimate (`the estimate goes from 8-12h to 11-16h`)
 *   - every block of a phase whose marks are from another time (the backfill's, stamped days after the block)
 * - each drop is a note, and ONE log line names the phases
 * - Runs on command (`epic migrate`), never on every edit:  it removes blocks
 * - IDEMPOTENT:  a dropped block is gone
 ****************/
export class UpdatesSaidByMarks implements Migration {
  readonly name = "updates-said-by-marks"
  readonly kind = "epic"
  readonly date = "2026-10-29"
  readonly everyEdit = false
  readonly description = "a phase's Update block written with change marks saying the same goes:  the marks say it"

  /** Drop every such block of `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const phases: string[] = []
    for (const phase of Array.from(document.querySelectorAll("epic-phase"))) {
      if (phase.closest("epic-original")) continue
      for (const block of Array.from(phase.querySelectorAll(":scope > epic-update"))) {
        const at = PlanDates.read(block.getAttribute("at") ?? "")?.date
        if (!at) continue
        const summary = block.getAttribute("summary") ?? ""
        const text = `${summary} ${block.textContent ?? ""}`.replace(/\s+/g, " ").trim()
        if (block.querySelector("epic-change") || UpdateMarks.namesFile(text) || ESTIMATE.test(text)) continue
        const said = UpdateMarks.marked(phase, UpdateMarks.idsIn(text), at)
        if (!said.length) continue
        block.remove()
        const label = PhaseIds.labelOf(phase)
        if (!phases.includes(label)) phases.push(label)
        const ids = said.map((id) => id.toUpperCase()).join(", ")
        context.notes?.push(
          `updates-said-by-marks:  ${label}'s "Update:  ${summary}" (${block.getAttribute("at")}), ${ids}'s marks say it`
        )
      }
    }
    if (phases.length)
      UpdatesSaidByMarks.log(
        document,
        `Update blocks the change marks already say dropped:  ${phases.join(", ")}`,
        context.now
      )
    return phases.length > 0
  }

  /** Add `line` to the page's log, at `now`. */
  private static log(document: Document, line: string, now: Date) {
    const log = document.querySelector('epic-page > epic-section[kind="log"]')
    if (!log) return
    const event = document.createElement("epic-event")
    event.setAttribute("at", PlanTime.isoMinutes(now))
    event.textContent = line
    log.append(event)
  }
}

/** An estimate in text:  the word, or a duration in hours (`4-5h`, `1.5h`). */
const ESTIMATE = /\bestimate\b|\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?h\b/i
