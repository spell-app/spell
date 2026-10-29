import { PhaseIds } from "spell/epic/phases"
import { PlanDates } from "spell/epic/dates"
import { PlanTime } from "spell/epic/tool/PlanTime"
import { UpdateMarks } from "spell/epic/tool/UpdateMarks"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `OwensAnswersSeen`
 * The migration `owens-answers-seen` (epic `epic-engine` I179):  a NEW Update block carrying out Owen's own answer is
 * stamped seen, and leaves its host's `to-see`.
 * - Owen, 2026-10-29, on debut's P21 and P22 drawn orange for blocks recording his picks on Q39 and Q41:
 *   "If its 'accepting the update' I shouldn't have to do that if you are doing what I said."
 * - which blocks:  dated, not `seen`, not quiet yet (`PlanDates.isQuiet()`), never in an Original Discussion,
 *   and Owen's own answer by the tool's rule (`UpdateMarks.owensAnswer()`):  every item they name he answered,
 *   no file and no estimate named
 * - `seen`:  the block's own `at`;  its `<id>@<at>` comes out of the `to-see` that lists it (the skeleton's)
 * - the same rule every write runs since I179 (`PlanDoc.updateUpdates()`):  this is for the pages nothing has
 *   written since
 * - each block is a note, and ONE log line names where they were
 * - Runs on command (`epic migrate`), never on every edit:  the write's own pass does that
 * - IDEMPOTENT:  a stamped block is `seen`
 ****************/
export class OwensAnswersSeen implements Migration {
  readonly name = "owens-answers-seen"
  readonly kind = "epic"
  readonly date = "2026-10-29"
  readonly everyEdit = false
  readonly description = "a new Update block carrying out Owen's own answer is seen:  no news for him"

  /** Stamp every such block of `document` seen, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const places: string[] = []
    for (const block of Array.from(document.querySelectorAll("epic-update[at]"))) {
      const at = block.getAttribute("at")!
      if (block.hasAttribute("seen") || block.closest("epic-original") || PlanDates.isQuiet(at, context.now)) continue
      const ids = UpdateMarks.owensAnswer(block)
      if (!ids.length) continue
      block.setAttribute("seen", at)
      if (block.id) OwensAnswersSeen.unlist(document, block.id)
      const phase = block.closest("epic-phase")
      const where = phase ? PhaseIds.labelOf(phase) : (block.parentElement?.closest("[id]")?.id ?? "the page")
      if (!places.includes(where)) places.push(where)
      const summary = block.getAttribute("summary") ?? ""
      context.notes?.push(
        `owens-answers-seen:  ${where}'s "Update:  ${summary}" (${at}) is Owen's own answer (${ids.join(", ")}):  seen`
      )
    }
    if (places.length)
      OwensAnswersSeen.log(
        document,
        `Update blocks carrying out Owen's own answers marked seen:  ${places.join(", ")}`,
        context.now
      )
    return places.length > 0
  }

  /** Take block `id` out of every `to-see` listing it (`up16@2026-10-26T21:54`, or a bare `up16`). */
  private static unlist(document: Document, id: string) {
    for (const host of Array.from(document.querySelectorAll("[to-see]"))) {
      const tokens = host.getAttribute("to-see")!.split(/\s+/).filter(Boolean)
      const kept = tokens.filter((token) => token.split("@")[0] !== id)
      if (kept.length === tokens.length) continue
      if (kept.length) host.setAttribute("to-see", kept.join(" "))
      else host.removeAttribute("to-see")
    }
  }

  // REFACTOR:  one copy for every step (five now);  NOT on `Migrations`, which a step can't import (the registry
  // imports the step first, and its `new` finds the class undefined)
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
