import { PlanItem } from "spell/epic/tool/PlanItem"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ClarifiedBodies`
 * The migration `clarified-bodies` (epic `epic-engine` I301):  an item clarified before More Details replaced its
 * text keeps "_What it says on the tin._  Clarify" over its More Details card;  this takes that given body off.
 * - Owen, 2026-11-15:  "When you `clarify` you can remove 'What it says on the tin' or the original unclear text"
 * - only the GIVEN body (`PlanItem.isTitleBody()`), never prose anyone wrote:  an older Add Details card built on
 *   its item's text, so that text stays where it is
 * - cheap markup, so every edit runs it too (`everyEdit`)
 * - IDEMPOTENT:  an item with no More Details card, or no given body, is left as it is
 ****************/
export class ClarifiedBodies implements Migration {
  readonly name = "clarified-bodies"
  readonly kind = "epic"
  readonly date = "2026-11-15"
  readonly everyEdit = true
  readonly description = 'an item with More Details loses the "What it says on the tin" body it was given'

  /** Take the given body off every item of `document` with a More Details card, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const cleared = [...document.querySelectorAll("epic-item")].filter(
      (item) => !!item.querySelector(":scope > epic-more") && [...item.children].some((c) => PlanItem.isTitleBody(c))
    )
    for (const item of cleared) PlanItem.dropTitleBody(item)
    if (cleared.length)
      context.notes?.push(`clarified-bodies:  ${cleared.map((item) => item.id.toUpperCase()).join(", ")}`)
    return cleared.length > 0
  }
}
