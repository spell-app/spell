import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `PictureLabels`
 * The migration `picture-labels` (epic `epic-engine` P75):  every picture an item shows (`<epic-picture>`, T87) gets
 * its label, `label="IMG1"`, `IMG2` ... in its order in the item, as the epic tool writes a new item's
 * (`ItemPictures.html()`).
 * - why:  the person names a picture in words ("IMG2 is wrong"), so each one carries its label, drawn on its corner
 * - one already labelled keeps its label, and the next ones count on from the highest:  a picture deleted from the
 *   page leaves a gap (P75's choice B), which this never closes
 * - every edit runs it (`everyEdit`):  cheap, one query
 * - IDEMPOTENT:  a labelled picture isn't touched again
 ****************/
export class PictureLabels implements Migration {
  readonly name = "picture-labels"
  readonly kind = "epic"
  readonly date = "2026-11-17"
  readonly everyEdit = true
  readonly description = "an item's pictures each get their label, IMG1, IMG2 ..., in their order in the item"

  /** Label every unlabelled item picture `document` holds, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const labelled: string[] = []
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      const pictures = Array.from(item.querySelectorAll("epic-picture")).filter(
        (picture) => picture.closest("epic-item") === item
      )
      if (pictures.every((picture) => picture.hasAttribute("label"))) continue
      let number = Math.max(0, ...pictures.map((picture) => numberOf(picture.getAttribute("label"))))
      for (const picture of pictures) {
        if (picture.hasAttribute("label")) continue
        picture.setAttribute("label", `${LABEL}${++number}`)
      }
      labelled.push(item.id.toUpperCase())
    }
    if (labelled.length) context.notes?.push(`picture-labels:  labelled the pictures of ${labelled.join(", ")}`)
    return labelled.length > 0
  }
}

/** A label's number:  `IMG3` => 3;  none, or not a label, 0. */
function numberOf(label: string | null): number {
  const digits = /^IMG(\d+)$/.exec(label ?? "")?.[1]
  return digits ? Number(digits) : 0
}

/** What a label starts with:  `IMG2` (`Pictures`' words, in the page). */
const LABEL = "IMG"
