import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { cellVocabulary } from "./UICell.en"
import { TableRows } from "./TableRows"

/****************
 * ### `UICell`
 * The component behind `<ui-cell>`:  one cell of a `<ui-row>` in a `<ui-table>` (epic `ui-gaps` P7).
 *
 * - The shadow root is a bare slot:  the DOM element IS the cell box, an item of its row's grid.
 * - Its look is the table's PAGE sheet's (`UITable.css`, "Rows and cells"), from the table's class words.
 * - ARIA, from where it sits:
 *   - `columnheader`:  a `header` cell in a `header` row
 *   - `rowheader`:  a `header` cell in a body row
 *   - `cell`:  any other cell of a table;  nothing outside one
 *   - `span` sets `aria-colspan` too
 * - Its own layout (`span`, `align`, `vertical-align`) is a `:host` rule of its own (`hostLayout`),
 *   so the page's own `style` stays the author's.
 * - Which table it's in:  its OWNER (`PartContext`), climbing through its row (a part too).
 ****************/
export class UICell extends E.UIComponent<typeof cellVocabulary> {
  @E.proto static vocabulary = cellVocabulary
  @E.protoMerged static elementSetup = {
    isAPart: true,
    delegatesFocus: false,
    cssStates: ["header"]
  } satisfies Partial<E.ElementSetup>

  /** The table it's a cell of, if any:  `:state(in-table)` follows it. */
  readonly context = new E.PartContext({ domElement: this.domElement, noun: this.vocabulary.noun })

  /** In a `<ui-table>`. */
  get isInTable(): boolean {
    return this.context.owner?.ownerNoun === TABLE
  }

  /** Columns it covers:  `span`, a whole number, at least 1, as its table counts it (`TableRows.spanOf()`). */
  get columnSpan(): number {
    return TableRows.spanOf(this.span)
  }

  /**
   * ARIA role, from where it sits (the class docstring).
   * - Reads its row once per owner change:  a row turning into a header row later keeps its cells' roles
   *   until they move.
   */
  @E.aria("role")
  get ariaRole(): string | undefined {
    if (!this.isInTable) return undefined
    if (!this.header) return "cell"
    const row = this.domElement.parentElement as E.DOMElement | null
    return row?.valueNamed?.(HEADER) ? "columnheader" : "rowheader"
  }

  /** `aria-colspan`, while it spans. */
  @E.aria("colSpan")
  get ariaColumnSpan(): string | undefined {
    return this.isInTable && this.columnSpan > 1 ? String(this.columnSpan) : undefined
  }

  /** Its own `:host` layout:  the columns it spans, its alignment. */
  @E.derived
  protected get hostLayout(): string {
    const rules = [`grid-column: span ${this.columnSpan}`]
    const align = this.align === "justified" ? "justify" : this.align
    if (align) rules.push(`text-align: ${align}`)
    const vertical = this.verticalAlign
    if (vertical) rules.push(`align-self: ${VERTICAL[vertical as keyof typeof VERTICAL] ?? "stretch"}`)
    return rules.join(";  ")
  }

  render(): JSX.Element {
    return <slot />
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UICell extends E.AttributeValues<typeof cellVocabulary> {}

/** The owner noun of a table cell:  `<ui-table>`'s. */
const TABLE = "table"

/** A row's `header` attribute, by its canonical name. */
const HEADER = "header"

/** `vertical-align` => the cell box's `align-self` in its row. */
const VERTICAL = { top: "start", middle: "center", bottom: "end" } as const
