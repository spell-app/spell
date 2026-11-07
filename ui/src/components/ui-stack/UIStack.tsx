import type { JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import { stackVocabulary } from "./UIStack.en"

import stackCSS from "./UIStack.css?inline"

/****************
 * ### `<ui-stack>`
 * The component behind `<ui-stack>`:  a box that lays its children out in a column or a row (epic `ui-gaps` P8).
 *
 * - Web Awesome's stack AND cluster in one tag:  a column by default;
 *   `direction="horizontal"` a row, `wrap` one that wraps.
 * - No look:  no padding, border or colour.  For a drawing, which holds no `<div>` to put `.ui-stack` on.
 * - The shadow root is a bare slot:  the children are the DOM element's flex items.
 * - In a row, a `fluid` child (`<ui-input fluid>`, `<ui-dropdown fluid>` ...) takes the room left (epic `language` T57):
 *   a task's title field fills its row, between its checkbox and its priority.
 *   - A `fluid` stack too (`:state(fluid)`, epic `language` T88):  a picture's details beside it.
 * - `stackable="34em"`:  a row that becomes a column when the room it's in is narrower (epic `language` P35, I63).
 *   - The room:  the nearest size container around it (`@container`), or the window (`@media`), whichever is
 *     narrower.  NOT its own width:  a stack sized by what's in it would be a row or a column by its own choice.
 *   - Nested in its `:host` rule, so each stack queries its own length.
 *   - While a column, it hands its children `--_ui-stack-turn: 90deg`:  an icon `rotated="when stacked"` turns.
 * - Its attributes become one `:host` rule of its own (`hostLayout`, written by `UIComponent`),
 *   so the page's own `style` stays the author's.
 * - Nothing focusable:  no `delegatesFocus`.
 ****************/
export class UIStack extends E.UIComponent<typeof stackVocabulary> {
  @E.proto static vocabulary = stackVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { stack: stackCSS },
    delegatesFocus: false,
    // a `fluid` stack in another stack's row takes the room left, as a `fluid` input does (epic `language` T88)
    cssStates: ["fluid"]
  } satisfies Partial<E.ElementSetup>

  /** A row, not a column:  `:state(horizontal)`, where a `fluid` child takes the row's leftover room. */
  @E.cssState("horizontal")
  get isHorizontal(): boolean {
    return this.direction === HORIZONTAL
  }

  /**
   * The width of room below which a `stackable` row becomes a column:  its length, or a phone's (768px) when bare;
   * `undefined` when it isn't `stackable`, or isn't a row.
   */
  @E.cssState("stackable")
  get stacksBelow(): string | undefined {
    const { stackable } = this
    if (!this.isHorizontal || !E.Converters.boolean(stackable)) return undefined
    return /^(|true|yes|stackable)$/i.test(stackable!.trim()) ? PHONE_WIDTH : stackable
  }

  /** Its `:host` rule:  direction, wrap, spacing, alignment, width;  and, `stackable`, the column it becomes. */
  @E.derived
  protected get hostLayout(): string {
    const rules = [`gap: ${UIT.SpaceSteps[this.spacing as UIT.SpaceStep] ?? UIT.SpaceSteps.md}`]
    if (this.isHorizontal) rules.push("flex-direction: row", "align-items: center")
    if (this.wrap) rules.push("flex-wrap: wrap")
    const align = ALIGN[this.align as keyof typeof ALIGN]
    if (align) rules.push(`align-items: ${align}`)
    const justify = JUSTIFY[this.justify as keyof typeof JUSTIFY]
    if (justify) rules.push(`justify-content: ${justify}`)
    if (this.fluid) rules.push("inline-size: 100%")
    const below = this.stacksBelow
    if (below) {
      // a column, its arrows turned;  a `fluid` child keeps its own height in a column
      const column = `flex-direction: column;  ${STACK_TURN}: 90deg;  & > slot::slotted(:state(fluid)) { flex: none }`
      rules.push(`@container (width < ${below}) { ${column} }`, `@media (width < ${below}) { ${column} }`)
    }
    return rules.join(";  ")
  }

  render(): JSX.Element {
    return <slot />
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIStack extends E.AttributeValues<typeof stackVocabulary> {}

/** `direction`'s row. */
const HORIZONTAL = "horizontal"

/** A bare `stackable`'s width:  a phone's, as every other family's `stackable` (`media.css`'s `--ui-mobile`). */
const PHONE_WIDTH = "768px"

/** What a stacked stack hands its children:  an icon `rotated="when stacked"` turns by it (`UIIcon.css`). */
const STACK_TURN = "--_ui-stack-turn"

/** `align` => `align-items`. */
const ALIGN = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline"
} as const

/** `justify` => `justify-content`. */
const JUSTIFY = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around"
} as const
