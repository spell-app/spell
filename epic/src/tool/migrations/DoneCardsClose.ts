import { Markup } from "spell-epic/markup"
import { PhaseTakes } from "spell-epic/tool/PhaseTakes"
import { PlanTime } from "spell-epic/tool/PlanTime"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `DoneCardsClose`
 * The migration `done-cards-close` (epic `epic-engine` I148;  Owen, 2026-10-26, on repo-split's I65:  "why is this
 * showing as red if it is fixed?"):  an issue or todo whose work Claude said was finished is closed.
 * - before I148, `epic update <epic>#I3 done` wrote the Done card and left the item open, so a fixed issue stayed
 *   red;  since, the same command closes it (`PlanDoc.finishWork()`)
 * - which items:  open work (an issue, or a todo that isn't a `limit`:  `PhaseTakes.isWork()`) with a Done card
 *   NEWER than its last reopening (the log's `I3 reopened:  ...`), and no underway card (Claude is on it again)
 * - closed as `epic close` closes:  `status="done"`, one log line each;  the runner recolours it and stamps the phase
 *   that took it up (`updateStates()`, `PhaseTakes`)
 * - each one closed is a note, with its card's time, so a dry run lists them for Owen to check:  an older page's
 *   Done card may mean only "this step done" (an answer written), which is `noted` now
 * - Runs on command (`epic migrate`), never on every edit:  it closes items
 * - IDEMPOTENT:  a closed item is left alone
 ****************/
export class DoneCardsClose implements Migration {
  readonly name = "done-cards-close"
  readonly kind = "epic"
  readonly date = "2026-10-26"
  readonly everyEdit = false
  readonly description = "an open issue or todo with a Done card newer than its last reopening is closed (done)"

  /** Close every such item of `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const reopened = DoneCardsClose.reopenings(document)
    let closed = 0
    for (const item of Array.from(document.querySelectorAll("epic-page > epic-section > epic-item"))) {
      if (item.getAttribute("status") !== "open" || !PhaseTakes.isWork(item)) continue
      const cards = Array.from(item.querySelectorAll(":scope > epic-status"))
      if (cards.some((card) => card.getAttribute("state") === "underway")) continue
      const done = cards.filter((card) => card.getAttribute("state") === "done").at(-1)
      const doneAt = done && (done.getAttribute("done-at") ?? done.getAttribute("at") ?? "")
      if (!done || doneAt === undefined) continue
      const label = item.id.toUpperCase()
      const reopenedAt = reopened.get(label)
      if (reopenedAt && !(doneAt > reopenedAt)) continue
      Markup.set<"epic-item">(item, { status: "done" })
      DoneCardsClose.log(
        document,
        `${label} closed:  its Done card (${doneAt}) said the work was finished`,
        context.now
      )
      context.notes?.push(`done-cards-close:  ${label} closed, its Done card ${doneAt}:  ${item.getAttribute("title")}`)
      closed++
    }
    return closed > 0
  }

  /** Each item's LAST reopening, by its label (`I3`), as the log says it:  local `YYYY-MM-DD HH:MM`. */
  private static reopenings(document: Document): Map<string, string> {
    const last = new Map<string, string>()
    for (const event of Array.from(document.querySelectorAll('epic-page > epic-section[kind="log"] epic-event'))) {
      const label = event.textContent?.trim().match(REOPENED)?.[1]?.toUpperCase()
      const at = event.getAttribute("at")
      if (!label || !at) continue
      const when = PlanTime.clockTime(new Date(at))
      if (!(last.get(label)! >= when)) last.set(label, when)
    }
    return last
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

/** A log line reopening an item:  `I3 reopened:  ...`;  the id. */
const REOPENED = /^([a-z]\d+) reopened\b/i
