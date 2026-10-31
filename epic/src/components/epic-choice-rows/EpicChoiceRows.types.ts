/**
 * Constants the `epic-choice-rows` family's components share (`EpicChoiceRows`, `EpicChoiceRow`), and the one rule
 * both read off the page.
 */

/** The tags:  a section's table, and one row of it. */
export const ROWS_TAG = "epic-choice-rows"
export const ROW_TAG = "epic-choice-row"

/**
 * Does table `rows` have an Explanation column:  does any of its rows have a `note` (epic `epic-engine` P58, r51)?
 * - The table draws the column's head, and every row its cell (empty for a row without one), so they agree.
 */
export function hasNotes(rows: Element): boolean {
  return Array.from(rows.children).some((row) => row.localName === ROW_TAG && !!row.getAttribute("note"))
}
