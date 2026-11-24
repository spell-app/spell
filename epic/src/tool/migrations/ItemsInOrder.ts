import { PlanItem } from "spell/epic/tool/PlanItem"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ItemsInOrder`
 * The migration `items-in-order` (epic `epic-engine` T151):  every section's items back in number order.
 * - Owen, 2026-11-22:  "Reordering new issues to the top is confusing"
 * - until then an open question went to the top of its section, and down among the answered once decided;
 *   since, an item never moves:  a new one goes last (`PlanDoc.addItem()`)
 * - each kind's items (`q`, `t` ...) are sorted in the places that kind holds:  anything between them stays put
 * - on command only (`epic migrate <epic> --step items-in-order`):  it moves what people are reading
 * - IDEMPOTENT:  a page in order is left as it is
 ****************/
export class ItemsInOrder implements Migration {
  readonly name = "items-in-order"
  readonly kind = "epic"
  readonly date = "2026-11-22"
  readonly everyEdit = false
  readonly description = "each section's items in number order, open questions no longer on top"

  /** Put every section's items in order, IN PLACE;  did any move? */
  run(document: Document, context: MigrationContext): boolean {
    const moved: string[] = []
    for (const section of Array.from(document.querySelectorAll("epic-section"))) {
      const kinds = new Map<string, Element[]>()
      for (const child of Array.from(section.children)) {
        const kind = child.localName === "epic-item" ? NUMBERED.exec(child.id)?.[1] : undefined
        if (kind) kinds.set(kind, [...(kinds.get(kind) ?? []), child])
      }
      for (const items of kinds.values()) moved.push(...ItemsInOrder.sort(items))
    }
    if (moved.length) context.notes?.push(`items-in-order:  back in number order:  ${moved.join(", ")}`)
    return moved.length > 0
  }

  /**
   * SIDE EFFECT:  `items`, one kind's in a section, by number, in the places they hold;  returns the ids that were
   * out of order.
   */
  private static sort(items: readonly Element[]): string[] {
    const sorted = [...items].sort((a, b) => PlanItem.idNumber(a.id) - PlanItem.idNumber(b.id))
    if (sorted.every((item, at) => item === items[at])) return []
    const places = items.map((item) => {
      const place = item.ownerDocument.createComment("")
      item.before(place)
      item.remove()
      return place
    })
    for (const [at, place] of places.entries()) place.replaceWith(sorted[at]!)
    // only those out of line with the one after them are named:  not everything they shifted
    return items.flatMap((item, at) => {
      const next = items[at + 1]
      return next && PlanItem.idNumber(item.id) > PlanItem.idNumber(next.id) ? [item.id.toUpperCase()] : []
    })
  }
}

/** A numbered item's id:  its kind's letter, then its number. */
const NUMBERED = /^([a-z]+)\d+$/
