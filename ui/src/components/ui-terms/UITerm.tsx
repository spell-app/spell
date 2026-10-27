import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { termVocabulary } from "./UITerm.en"
import type { UITerms } from "./UITerms"

import termCSS from "./UITerm.css?inline"

/****************
 * ### `<ui-term>`
 * The component behind `<ui-term>`:  one fact, a label and its value (epic `ui-gaps` P12).
 *
 * - `<ui-term label="Suit" value="hearts">`, or written inside:  `<ui-term><b slot="label">Suit</b>hearts</ui-term>`.
 * - Its shadow:  `<span role="term" part="label">` then `<span role="definition" part="value">`, each round its slot,
 *   the attribute its slot's default.
 * - In a `<ui-terms>` (its owner, `PartContext`):  a row of the group's two columns;
 *   in a horizontal group, or alone:  the two on one line.
 ****************/
export class UITerm extends E.UIComponent<typeof termVocabulary> {
  @E.proto static vocabulary = termVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { term: termCSS },
    delegatesFocus: false,
    isAPart: true
  } satisfies Partial<E.ElementSetup>

  /** The `<ui-terms>` it's in, if any:  `:state(in-terms)` follows it. */
  readonly context = new E.PartContext({ domElement: this.domElement, noun: this.vocabulary.noun })

  /** In a horizontal group:  on one line. */
  @E.cssState("in-row")
  get isInRow(): boolean {
    return !!E.PartContext.componentFor<UITerms>(this.context.owner)?.isHorizontal
  }

  render(): JSX.Element {
    return (
      <>
        <span class={LABEL} part={this.partForName("label")} role="term">
          <slot name={this.slotForName("label")}>{this.label}</slot>
        </span>
        <span class={VALUE} part={this.partForName("value")} role="definition">
          <slot>{this.value}</slot>
        </span>
      </>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITerm extends E.AttributeValues<typeof termVocabulary> {}

/** The label's class. */
const LABEL = "label"

/** The value's class. */
const VALUE = "value"
