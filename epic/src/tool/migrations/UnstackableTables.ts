import { unstackTables } from "../../tools/to-components.js"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `UnstackableTables`
 * The migration `unstackable-tables` (epic `epic-engine` I36;  Owen, 2026-10-19, on a table drawn at the side bar's
 * width as its header cells, then each row's cells one under another:  "I hate it"):  every `<ui-table>` on an epic
 * page is `unstackable`, so no table ever stacks.
 *
 * ```text
 * <ui-table compact celled>   =>  <ui-table compact celled unstackable>
 * ```
 *
 * - `spell-doc.css` holds every table unstacked whatever its markup;  this keeps the page true without it
 * - the docs pages' share:  `components-not-markup` (`src/tools/to-components.js`), by the same rule
 *   (`unstackTables()`)
 * - a table that asks to stack (`stackable`, `stack-by`) is left, in the notes:  a demo of stacking
 * - the log and Original Discussions too:  an attribute changes no word of the history
 * - IDEMPOTENT:  an unstackable table is never touched
 * - Runs on command (`migrate`), never on every edit:  the pages move when the main session migrates them, after
 *   the merge, not when an edit from a worktree happens to touch one
 ****************/
export class UnstackableTables implements Migration {
  readonly name = "unstackable-tables"
  readonly kind = "epic"
  readonly date = "2026-10-19"
  readonly everyEdit = false
  readonly description = "every <ui-table> is unstackable:  no table stacks its cells at a narrow width"

  /** Make `document`'s tables unstackable, IN PLACE;  did it change anything? */
  run(document: Document, context: MigrationContext): boolean {
    const { unstacked, left } = unstackTables(document)
    if (unstacked) context.notes?.push(`${this.name}:  ${unstacked} <ui-table>s made unstackable`)
    for (const why of left) context.notes?.push(`${this.name}:  LEFT:  ${why}`)
    return unstacked > 0
  }
}
