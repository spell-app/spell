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
 * - Its attributes become one `:host` rule of its own (`hostLayout`, written by `UIComponent`),
 *   so the page's own `style` stays the author's.
 * - Nothing focusable:  no `delegatesFocus`.
 ****************/
export class UIStack extends E.UIComponent<typeof stackVocabulary> {
  @E.proto static vocabulary = stackVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { stack: stackCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** A row, not a column. */
  get isHorizontal(): boolean {
    return this.direction === HORIZONTAL
  }

  /** Its `:host` rule:  direction, wrap, spacing, alignment, width. */
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
