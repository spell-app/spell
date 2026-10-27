/**
 * The table family:  defines `<ui-table>` and `<ui-cell>`, and exports their components, `UITable` and `UICell`.
 * - `<ui-row>` is the grid family's:  in a table it's a table row (epic `ui-gaps` P7).
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell/ui/ui-table` entry (its size is in `notes/report.md`).
 * - NOTE: `TableClassMirror`, `TableGrammar`, `TableRows` and `TableSort` are internal helpers, not exported.
 */

import { UITable } from "./UITable"
import { UICell } from "./UICell"
// a rows-mode table's rows:  the grid family's `<ui-row>` (SIDE EFFECT:  defines the grid's tags)
import "spell/ui/components/ui-grid"

UITable.define()
UICell.define()

export { UITable, UICell }
