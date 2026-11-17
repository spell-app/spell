import { PlanItem } from "spell/epic/tool/PlanItem"
import { PlanTime } from "spell/epic/tool/PlanTime"
import { CALM_ID } from "spell/epic/tool/planDoc.types"

import { ReopenedFixes } from "./ReopenedFixes"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `HandedOnFixes`
 * The migration `handed-on-fixes` (epic `epic-engine` I317):  a fix Owen sent back, whose note Claude handed on to
 * another item, is FIXED again once that item is:  orange, `FIXED`, its last button Accept the fix (the check).
 * - the case:  language's I147 (fixed 19:48;  Owen's Revisit at 19:56, "see my comments in its text:  C2";  the
 *   session's Noted card "Your C2 ... is being fixed as I148";  I148 fixed at 20:33), which stayed `REOPENED`, blue,
 *   its last button the x (close it, not needed)
 *   - Owen, 2026-11-16:  "This was reopened and fixed - `x` should be checkmark"
 *   - nothing ever said I147 was fixed:  its work was done in I148, and only I148 was `epic update ... fixed`
 * - which items:  an open issue or judgement call SENT BACK (`urgent`, or its label `REOPENED`), not `fixed`,
 *   whose LATEST status card is Noted, with a Done card before it (a fix, sent back), the Noted card naming other
 *   issues or todos (`I148`, `T12`) of the page, and every one of them fixed or done
 *   - not a calm call with a tidy note naming another item (data's J182:  "Maybe obsolete:  ... went with T121")
 * - fixed as `PlanDoc.fixedForReview()` fixes:  `fixed` on, `reviewed` off, its label `FIXED`;  and a Done card
 *   saying where (`What you sent back was fixed as I148:  <its title>`), at the time that one was fixed
 *   - the Done card keeps `reopened-fixes` from reopening it again:  that step reopens a fix whose latest card is Noted
 * - `PlanDoc` runs it after every fix or close (`fixHandedOn()`), so the item turns in the same write;
 *   every edit runs it too (`everyEdit`), for the pages from before
 * - IDEMPOTENT:  a fixed item isn't picked again
 ****************/
export class HandedOnFixes implements Migration {
  readonly name = "handed-on-fixes"
  readonly kind = "epic"
  readonly date = "2026-11-16"
  readonly everyEdit = true
  readonly description =
    "a fix sent back whose note was handed on to another item (its Noted card names it) is fixed once that one is"

  /** Fix every such item `document` holds, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const fixed = HandedOnFixes.fixAll(document, context.now)
    if (fixed.length) context.notes?.push(`handed-on-fixes:  fixed again:  ${fixed.map(({ id }) => id).join(", ")}`)
    return fixed.length > 0
  }

  /**
   * Fix every item of `document` whose sent-back note was handed on to items now fixed or done, IN PLACE;
   * each one's id (`I147`) and the ids it was handed on to (`["I148"]`).
   * - `now`:  the Done card's time when the items it names have no Done card to take it from
   */
  static fixAll(document: Document, now: Date): { id: string; handedTo: string[] }[] {
    const fixed: { id: string; handedTo: string[] }[] = []
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      const handedTo = HandedOnFixes.handedToFixed(item)
      if (!handedTo.length) continue
      HandedOnFixes.fix(item, handedTo, now)
      fixed.push({ id: item.id.toUpperCase(), handedTo: handedTo.map((other) => other.id.toUpperCase()) })
    }
    return fixed
  }

  /**
   * The items `item`'s sent-back note was handed on to, when every one is fixed or done;  else none (`[]`).
   * - `item`:  an open issue or call, sent back (`urgent`, or labelled `REOPENED`), not `fixed`,
   *   its latest status card Noted with a Done card before it
   * - the Noted card's text names them (`I148`), each an item of the same page
   */
  static handedToFixed(item: Element): Element[] {
    const status = item.getAttribute("status")
    if (!(status === "open" || !status) || item.hasAttribute("fixed") || !CALM_ID.test(item.id)) return []
    // sent back:  wanted again (`urgent`), or labelled `REOPENED`
    if (!item.hasAttribute("urgent") && PlanItem.updateLabelOf(item)?.getAttribute("became") !== "reopened") return []
    const cards = Array.from(item.querySelectorAll(':scope > epic-status[slot="status"]'))
    const latest = cards.at(-1)
    if (latest?.getAttribute("state") !== "noted") return []
    if (!cards.slice(0, -1).some((card) => card.getAttribute("state") === "done")) return []
    const ids = new Set(Array.from((latest.textContent ?? "").matchAll(ITEM_NAME), ([name]) => name.toLowerCase()))
    ids.delete(item.id)
    const named = Array.from(ids, (id) => item.ownerDocument.getElementById(id)).filter(
      (other): other is HTMLElement => other?.localName === "epic-item"
    )
    if (!named.length || named.length !== ids.size) return []
    return named.every(HandedOnFixes.isFixed) ? named : []
  }

  /** Is `item` fixed (waiting for Owen's review) or done? */
  private static isFixed(item: Element): boolean {
    return item.hasAttribute("fixed") || item.getAttribute("status") === "done"
  }

  /** Fix `item`, its note handed on to `handedTo`:  a Done card saying so, `fixed`, `reviewed` off, `FIXED`. */
  private static fix(item: Element, handedTo: Element[], now: Date): void {
    const document = item.ownerDocument
    const at =
      handedTo
        .map(HandedOnFixes.doneAt)
        .filter((time): time is string => !!time)
        .sort((a, b) => a.localeCompare(b))
        .at(-1) ?? PlanTime.clockTime(now)
    const card = document.createElement("epic-status")
    for (const [name, value] of Object.entries({ slot: "status", state: "done", at, "done-at": at, agent: "claude" }))
      card.setAttribute(name, value)
    const line = document.createElement("p")
    line.append("What you sent back was fixed as ")
    handedTo.forEach((other, index) => {
      if (index) line.append(", ")
      const link = document.createElement("a")
      link.setAttribute("href", `#${other.id}`)
      link.textContent = other.id.toUpperCase()
      line.append(link)
    })
    line.append(`:  ${handedTo.map((other) => PlanItem.titleOf(other)).join(";  ")}`)
    card.append(line)
    const cards = item.querySelectorAll(':scope > epic-status[slot="status"]')
    cards[cards.length - 1].after(card)
    item.setAttribute("fixed", "")
    item.removeAttribute("reviewed")
    const label = PlanItem.updateLabelOf(item) ?? ReopenedFixes.addLabel(item)
    label.setAttribute("became", "fixed")
  }

  /** When `item` was fixed:  its latest Done card's `done-at` (or `at`);  `undefined` for none. */
  private static doneAt(item: Element): string | undefined {
    const done = Array.from(item.querySelectorAll(':scope > epic-status[state="done"]')).at(-1)
    return done?.getAttribute("done-at") ?? done?.getAttribute("at") ?? undefined
  }
}

/** An issue or todo named in a card's text:  `I148`, `T12`. */
const ITEM_NAME = /\b[IT]\d+\b/g
