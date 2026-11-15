import { PlanItem } from "spell/epic/tool/PlanItem"
import { PlanTime } from "spell/epic/tool/PlanTime"
import type { UpdateBecame } from "spell/epic/tool/planDoc.types"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `UpdateLabels`
 * The migration `update-labels` (epic `epic-engine` I285):  the bare UPDATE labels written before T75 and I285
 * come up to date.
 * - A label Owen has checked since its change goes:  the item's `review-as="approve"`, and a log line of his ✓ on it
 *   (`I84 approved: ...`, `I84 picked ...`) at or after the item's `changed` stamp.
 *   - Owen, 2026-11-15, on language's I84 (approved at 18:34, its label left on):  "I think that I checked it
 *     before, in which case the `update` marker should go away"
 *   - since I285 his ✓ takes it off as it's applied (`PlanDoc.reviewedAs()`);  this is for the ones before
 * - A label with no status word gets the one its item's status says (`became`):  `UPDATE : FIXED` for an open item
 *   fixed for review, `DONE`, `CANCELED`, `DECIDED` for a closed one;  an open item's stays a plain `UPDATE`.
 *   - Owen, same day, on I84:  "This shuld say `update:fixed` or whatnot"
 *   - T75 names the change as it happens;  this is for the labels written before it
 * - cheap markup, so every edit runs it too (`everyEdit`)
 * - IDEMPOTENT:  a label with its word, or gone, is left as it is
 ****************/
export class UpdateLabels implements Migration {
  readonly name = "update-labels"
  readonly kind = "epic"
  readonly date = "2026-11-15"
  readonly everyEdit = true
  readonly description =
    "an UPDATE label Owen has checked since goes;  one with no status word gets its item's (UPDATE : FIXED)"

  /** Bring every bare label of `document` up to date, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const dropped: string[] = []
    let named = 0
    const checks = UpdateLabels.checksOf(document)
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      const label = PlanItem.updateLabelOf(item)
      if (!label) continue
      if (UpdateLabels.isChecked(item, checks)) {
        PlanItem.dropUpdateLabel(item)
        dropped.push(item.id.toUpperCase())
        continue
      }
      if (label.hasAttribute("became")) continue
      const became = UpdateLabels.becameOf(item)
      if (!became) continue
      label.setAttribute("became", became)
      named++
    }
    if (dropped.length) context.notes?.push(`update-labels:  checked, label off:  ${dropped.join(", ")}`)
    if (named) context.notes?.push(`update-labels:  ${named} label(s) given their status word`)
    return dropped.length > 0 || named > 0
  }

  /** Has Owen checked `item` since its last change:  approved, his ✓ logged at or after its `changed` minute? */
  private static isChecked(item: Element, checks: Map<string, string>): boolean {
    if (item.getAttribute("review-as") !== "approve") return false
    const checked = checks.get(item.id.toLowerCase())
    const changed = item.getAttribute("changed")
    if (!checked || !changed) return false
    return PlanTime.isoMinutes(new Date(checked)) >= PlanTime.isoMinutes(new Date(changed))
  }

  /** Each item's last logged ✓ (`I84 approved: ...`, `Q3 picked B ...`), by its id in lower case:  when, as written. */
  private static checksOf(document: Document): Map<string, string> {
    const checks = new Map<string, string>()
    const log = document.querySelector('epic-page > epic-section[kind="log"]')
    for (const event of Array.from(log?.querySelectorAll("epic-event") ?? [])) {
      const said = CHECK_LINE.exec(event.textContent?.trim() ?? "")
      const at = event.getAttribute("at")
      if (said && at) checks.set(said[1]!.toLowerCase(), at)
    }
    return checks
  }

  /** The status word `item`'s status says, if any:  `fixed` while open and fixed, else its closed status. */
  private static becameOf(item: Element): UpdateBecame | undefined {
    const status = item.getAttribute("status")
    if (status === "open" || !status) return item.hasAttribute("fixed") ? "fixed" : undefined
    return (BECAME_OF_STATUS as Record<string, UpdateBecame>)[status]
  }
}

/** A log line of Owen's ✓ on an item:  `I84 approved:  ...`, `J3 picked B ...;  approved ...`;  its id. */
const CHECK_LINE = /^([A-Za-z]+\d+) (?:approved|picked)\b/

/** A closed status, as a label's word. */
const BECAME_OF_STATUS = { done: "done", canceled: "canceled", decided: "decided" } as const
