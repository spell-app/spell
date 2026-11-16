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
 * - An item fixed for Owen's review (open, `fixed`:  its pill orange) with NO label gets one, `FIXED`
 *   (epic `epic-engine` I298), unless he has checked it since its change (as above)
 *   - items fixed before every epic got labels (I290) never had one:  only labels that existed were brought up to date
 *   - Owen, 2026-11-15, on editor's I133 (fixed 11/14, no label):  "This should show with the `FIXED` marker in the
 *     item header"
 *   - only the orange ones:  a closed item is either reviewed or long settled;  labelling every old done item would
 *     paint hundreds of them (J226)
 *   - the label has no `phase`:  only his ✓ takes it off (`PlanItem.dropUpdateLabel()`), as on a standing epic
 * - cheap markup, so every edit runs it too (`everyEdit`)
 * - IDEMPOTENT:  a label with its word, or gone, is left as it is
 ****************/
export class UpdateLabels implements Migration {
  readonly name = "update-labels"
  readonly kind = "epic"
  readonly date = "2026-11-15"
  readonly everyEdit = true
  readonly description =
    "an UPDATE label Owen has checked since goes;  one with no status word gets its item's (FIXED, UNDERWAY);  " +
    "an item fixed for review with none gets FIXED"

  /** Bring every bare label of `document` up to date, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const dropped: string[] = []
    const added: string[] = []
    let named = 0
    const checks = UpdateLabels.checksOf(document)
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      const label = PlanItem.updateLabelOf(item)
      if (!label) {
        if (UpdateLabels.isAwaitingReview(item) && !UpdateLabels.isChecked(item, checks)) {
          UpdateLabels.addFixedLabel(item)
          added.push(item.id.toUpperCase())
        }
        continue
      }
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
    if (added.length) context.notes?.push(`update-labels:  fixed for review, label added:  ${added.join(", ")}`)
    return dropped.length > 0 || named > 0 || added.length > 0
  }

  /** Is `item` fixed and waiting for Owen's review:  open, `fixed` (its pill orange)? */
  private static isAwaitingReview(item: Element): boolean {
    const status = item.getAttribute("status")
    return (status === "open" || !status) && item.hasAttribute("fixed")
  }

  /**
   * Give `item` a `FIXED` label at the end of its title, as `PlanDoc.markUpdate()` writes one with no phase:
   * the title made a `slot="title"` child first when it's still the `title` attribute.
   */
  private static addFixedLabel(item: Element): void {
    const document = item.ownerDocument
    let slot = item.querySelector(':scope > [slot="title"]')
    if (!slot) {
      slot = document.createElement("span")
      slot.setAttribute("slot", "title")
      slot.textContent = item.getAttribute("title") ?? ""
      item.removeAttribute("title")
      item.prepend(slot)
    }
    const label = document.createElement("epic-update")
    label.setAttribute("became", "fixed")
    slot.append(document.createTextNode(" "), label)
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
