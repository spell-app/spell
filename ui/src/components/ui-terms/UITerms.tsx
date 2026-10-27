import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { termsVocabulary } from "./UITerms.en"

import termsCSS from "./UITerms.css?inline"

/****************
 * ### `<ui-terms>`
 * The component behind `<ui-terms>`:  a list of facts, a label and a value each (epic `ui-gaps` P12).
 *
 * - A grid of two columns:  each `<ui-term>` a row of it, so every value starts at the same place.
 * - `direction="horizontal"`:  the terms side by side, wrapping.
 * - It owns its terms (`ownsParts`):  each knows it's in one, and whether it's a row.
 * - HTML's `<dl>`, `<dt>` and `<dd>` can't reach across each term's own shadow root, so the terms carry the ARIA
 *   roles themselves (`term`, `definition`).
 ****************/
export class UITerms extends E.UIComponent<typeof termsVocabulary> {
  @E.proto static vocabulary = termsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { terms: termsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Side by side, not a term a line. */
  @E.cssState("horizontal")
  get isHorizontal(): boolean {
    return this.direction === HORIZONTAL
  }

  /** Its `:host` rule:  the gaps `spacing` asks for. */
  get hostLayout(): string {
    const gap = SPACING[this.spacing as keyof typeof SPACING] ?? SPACING.md
    return this.isHorizontal ? `:host { gap: ${gap} var(--ui-space-l) }` : `:host { row-gap: ${gap} }`
  }

  render(): JSX.Element {
    return (
      <>
        <style>{this.hostLayout}</style>
        <slot />
      </>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITerms extends E.AttributeValues<typeof termsVocabulary> {}

/** `direction`'s row. */
const HORIZONTAL = "horizontal"

/** `spacing` => the gap between terms. */
const SPACING = { sm: "var(--ui-space-2xs)", md: "var(--ui-space-xs)", lg: "var(--ui-space-m)" } as const
