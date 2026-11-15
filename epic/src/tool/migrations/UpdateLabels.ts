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
 * - A label with no status word gets the one its item's status says (`became`):  `FIXED` for an open item
 *   fixed for review, `DONE`, `CANCELED`, `DECIDED` for a closed one;  an open item's stays a plain `UPDATE`.
 *   - Owen, same day, on I84:  "This shuld say `update:fixed` or whatnot"
 *   - T75 names the change as it happens;  this is for the labels written before it
 * - An open item whose latest status card is Underway says so, `UNDERWAY` (epic `epic-engine` I295);
 *   once that card is finished, the word goes back to what the status says (or a plain `UPDATE`)
 *   - Owen, 2026-11-15, on language's I98, filed under way:  "`Update` should say `Underway`"
 * - cheap markup, so every edit runs it too (`everyEdit`)
 * - IDEMPOTENT:  a label with its word, or gone, is left as it is
 ****************/
export class UpdateLabels implements Migration {
  readonly name = "update-labels"
  readonly kind = "epic"
  readonly date = "2026-11-15"
  readonly everyEdit = true
  readonly description =
    "an UPDATE label Owen has checked since goes;  one with no status word gets its item's (FIXED, UNDERWAY)"

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
      const was = label.getAttribute("became")
      // a word other than UNDERWAY was set as it happened:  kept;  UNDERWAY follows the item's latest card (I295)
      if (was && was !== "underway") continue
      const became = UpdateLabels.becameOf(item)
      if ((became ?? null) === was) continue
      if (became) label.setAttribute("became", became)
      else label.removeAttribute("became")
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

  /**
   * The status word `item`'s status says, if any:  `underway` while open and its latest status card is Underway
   * (I295), `fixed` while open and fixed (first), else its closed status.
   */
  private static becameOf(item: Element): UpdateBecame | undefined {
    const status = item.getAttribute("status")
    if (status === "open" || !status) {
      if (item.hasAttribute("fixed")) return "fixed"
      const latest = Array.from(item.querySelectorAll(":scope > epic-status")).at(-1)
      return latest?.getAttribute("state") === "underway" ? "underway" : undefined
    }
    return (BECAME_OF_STATUS as Record<string, UpdateBecame>)[status]
  }
}

/** A log line of Owen's ✓ on an item:  `I84 approved:  ...`, `J3 picked B ...;  approved ...`;  its id. */
const CHECK_LINE = /^([A-Za-z]+\d+) (?:approved|picked)\b/

/** A closed status, as a label's word. */
const BECAME_OF_STATUS = { done: "done", canceled: "canceled", decided: "decided" } as const
