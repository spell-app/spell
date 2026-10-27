import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { rowVocabulary } from "./UIRow.en"
import { GridPart } from "./GridPart"

/****************
 * ### `UIRow`
 * The component behind `<ui-row>`:  a line of columns in a grid, `<div class="ui … row"
 * part="row"><slot></slot></div>`;  or, in a `<ui-table>`, a table row.
 *
 * - In a grid:  it declares the grid's column tokens again for its own columns (`columns`, `divided`, `reversed` ...).
 * - In a table (epic `ui-gaps` P7):  a bare slot, so its `<ui-cell>`s are the table grid's items.
 *   - ARIA `row`;  `header` makes its cells column headers, `footer` a footer row.
 *   - The table's sheet lays it out (a subgrid of the table's columns) and styles it:  its own look stays the grid's.
 *   - Which it is:  its OWNER (`PartContext`), the nearest table it sits in, kept up to date as it moves.
 ****************/
export class UIRow extends GridPart<typeof rowVocabulary> {
  @E.proto static vocabulary = rowVocabulary
  // a part, so a cell's climb to its table passes through
  @E.protoMerged static elementSetup = {
    isAPart: true,
    cssStates: ["header", "footer"]
  } satisfies Partial<E.ElementSetup>

  /** The table it's a row of, if any:  `:state(in-table)` follows it. */
  readonly context = new E.PartContext({ domElement: this.domElement, noun: this.vocabulary.noun })

  /** A row of a `<ui-table>`, not of a grid. */
  get isInTable(): boolean {
    return this.context.owner?.ownerNoun === TABLE
  }

  /** ARIA:  `row` in a table;  nothing in a grid. */
  @E.aria("role")
  get ariaRole(): string | undefined {
    return this.isInTable ? "row" : undefined
  }

  override render(): JSX.Element {
    const asGridRow = () => super.render()
    return (
      <Show when={this.isInTable} fallback={asGridRow()}>
        <slot />
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIRow extends E.AttributeValues<typeof rowVocabulary> {}

/** The owner noun of a table row:  `<ui-table>`'s. */
const TABLE = "table"
