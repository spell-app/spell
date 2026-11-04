import { PlanItem } from "spell/epic/tool/PlanItem"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ItemBodies`
 * The migration `item-bodies` (epic `epic-engine` I209):  every item with only a title gets its title's words as its
 * body, so it opens, and takes a comment like any other (`PlanItem.giveBody()`).
 * - Owen, 2026-11-03, on epic `data`'s T98, a todo with no details:  "This has no body ... so I can't comment"
 * - new items get theirs as they're made (`PlanDoc.addItem()`);  this is for the ones made before
 * - cheap markup, so every edit runs it too (`everyEdit`):  a page comes up to date the first time anything edits it
 * - IDEMPOTENT:  an item with a body (or a part file) is left as it is
 ****************/
export class ItemBodies implements Migration {
  readonly name = "item-bodies"
  readonly kind = "epic"
  readonly date = "2026-11-03"
  readonly everyEdit = true
  readonly description = "an item with only a title gets its title's words as its body, so it opens and takes a comment"

  /** Give every bodiless item of `document` its body, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const given = [...document.querySelectorAll("epic-item")].filter((item) => PlanItem.giveBody(item))
    if (given.length) context.notes?.push(`item-bodies:  ${given.map((item) => item.id.toUpperCase()).join(", ")}`)
    return given.length > 0
  }
}
