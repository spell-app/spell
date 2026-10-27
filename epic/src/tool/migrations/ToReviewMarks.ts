import { isItemId } from "spell-epic/definitions"
import { Markup } from "spell-epic/markup"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ToReviewMarks`
 * The migration `to-review-marks` (epic `epic-engine` P45;  Owen, 2026-10-25:  "`<epic-mark link>` for rendering the
 * I126 mark"):  a phase's To review links become item marks, which draw their own chips.
 * - `<a href="#j1">J1</a>` => `<epic-mark item="j1" link></epic-mark>`, the commas between them kept
 *   - before P45 the field coloured its links by writing `data-spell-state` on them as the page drew
 *   - since P45 the tool writes marks itself (`PlanDoc.updateToReview()`)
 * - a link whose words aren't its id (written by hand) is left, and reported:  every word kept
 * - IDEMPOTENT:  a migrated field holds no `<a>`
 * - Cheap markup:  every edit runs it too (`everyEdit`)
 ****************/
export class ToReviewMarks implements Migration {
  readonly name = "to-review-marks"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = true
  readonly description = "a phase's To review links as `<epic-mark item link>`s, drawn in their items' state colours"

  /** Turn every To review link in `document` into a mark, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    let changed = false
    for (const link of Array.from(document.querySelectorAll(LINKS))) {
      const id = decodeURIComponent(link.getAttribute("href")!.slice(1))
      const words = (link.textContent ?? "").trim()
      if (!isItemId(id) || words.toLowerCase() !== id.toLowerCase()) {
        const phase = link.closest("epic-phase")?.id ?? "?"
        context.notes?.push(`to-review-marks:  ${phase}:  <a href="#${id}">${words}</a> isn't an item's id;  left`)
        continue
      }
      link.replaceWith(Markup.element(document, MARK, { item: id.toLowerCase(), link: true }))
      changed = true
    }
    return changed
  }
}

/** The links a To review field held before P45. */
const LINKS = 'epic-phase > epic-field[name="to-review"] > a[href^="#"]'

/** An item mark's tag. */
const MARK = "epic-mark" as const
