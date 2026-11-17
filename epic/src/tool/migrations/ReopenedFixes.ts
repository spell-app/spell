import { PlanItem } from "spell/epic/tool/PlanItem"
import { CALM_ID } from "spell/epic/tool/planDoc.types"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ReopenedFixes`
 * The migration `reopened-fixes` (epic `epic-engine` I303):  a fix Owen sent back, and Claude took up again, is
 * REOPENED:  no longer orange and waiting for his review, but blue, Claude's, its label `REOPENED`.
 * - the case:  an open issue or judgement call still `fixed`, whose LATEST status card is Underway or Noted, after a
 *   Done card:  his Revisit (or Send it back) on the fix was taken, and the work started again
 *   - Owen, 2026-11-15, on editor's I139 (fixed 11/14, his revisit "Restore link is there but clicking it doesn't do
 *     anything", then "Noted · Queued:  agent editor-restore is finding why Restore does nothing", its pill still
 *     orange with `FIXED`):  "This pill should be blue, remove `FIXED` and replace with `REOPENED`"
 *   - since I303 the card that takes it up reopens it as it's written (`PlanDoc.addStatus()`);  this is for the ones
 *     taken up before
 * - reopened as `PlanDoc.reopenFix()` does:  `fixed` off, `urgent` on (wanted:  `handed`, blue outlined, until Claude
 *   fixes it again, then orange), `calm` off;  its label `REOPENED`, added when it has none
 * - cheap markup, so every edit runs it too (`everyEdit`)
 * - IDEMPOTENT:  a reopened item isn't `fixed` any more
 ****************/
export class ReopenedFixes implements Migration {
  readonly name = "reopened-fixes"
  readonly kind = "epic"
  readonly date = "2026-11-15"
  readonly everyEdit = true
  readonly description =
    "a fix sent back and taken up again (its latest card Underway or Noted, after a Done) is reopened"

  /** Reopen every fix `document` holds that was sent back and taken up, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const reopened: string[] = []
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      if (!ReopenedFixes.isTakenBack(item)) continue
      ReopenedFixes.reopen(item)
      reopened.push(item.id.toUpperCase())
    }
    if (reopened.length) context.notes?.push(`reopened-fixes:  sent back and taken up again:  ${reopened.join(", ")}`)
    return reopened.length > 0
  }

  /**
   * Is `item` a fix sent back and taken up again:  open, `fixed`, an issue or judgement call, its latest status card
   * Underway or Noted with a Done card before it?
   */
  static isTakenBack(item: Element): boolean {
    const status = item.getAttribute("status")
    if (!(status === "open" || !status) || !item.hasAttribute("fixed") || !CALM_ID.test(item.id)) return false
    const cards = Array.from(item.querySelectorAll(':scope > epic-status[slot="status"]'))
    const latest = cards.at(-1)?.getAttribute("state")
    if (latest !== "underway" && latest !== "noted") return false
    return cards.slice(0, -1).some((card) => card.getAttribute("state") === "done")
  }

  /** Reopen `item`:  `fixed` and `calm` off, `urgent` on, its label `REOPENED` (one added when it has none). */
  static reopen(item: Element): void {
    item.removeAttribute("fixed")
    item.removeAttribute("calm")
    item.setAttribute("urgent", "")
    const label = PlanItem.updateLabelOf(item) ?? ReopenedFixes.addLabel(item)
    label.setAttribute("became", "reopened")
  }

  /**
   * A label at the end of `item`'s title, as `PlanDoc.markUpdate()` writes one with no phase:
   * the title made a `slot="title"` child first when it's still the `title` attribute.
   */
  static addLabel(item: Element): Element {
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
    slot.append(document.createTextNode(" "), label)
    return label
  }
}
