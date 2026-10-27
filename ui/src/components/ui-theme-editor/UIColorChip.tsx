import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { colorChipVocabulary } from "./UIColorChip.en"

import colorChipCSS from "./UIColorChip.css?inline"

/****************
 * ### `<ui-color-chip>`
 * The component behind `<ui-color-chip>`:  one colour, as a small rounded square (epic `debut` P24).
 * - Read-only (Owen:  "the chips are not interactive"):  its colour and name in its tooltip, an image to a screen
 *   reader (`role="img"`).
 * - A `light-dark()` colour resolves in `scheme`, else the page's.
 * - A see-through colour shows over a checkerboard;  a ring keeps it visible on a background of its own colour.
 ****************/
export class UIColorChip extends E.UIComponent<typeof colorChipVocabulary> {
  @E.proto static vocabulary = colorChipVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "color-chip": colorChipCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its name for people:  `label`, else the colour itself. */
  get chipName(): string {
    return this.label || this.color || ""
  }

  render(): JSX.Element {
    return (
      <span
        class={["ui color-chip", this.scheme !== "auto" && this.scheme]}
        part={this.partForName("chip")}
        role="img"
        aria-label={this.chipName}
        title={this.label && this.color ? `${this.label}:  ${this.color}` : this.chipName}
        style={`--_ui-color-chip-color: ${this.color ?? "transparent"}`}
      />
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIColorChip extends E.AttributeValues<typeof colorChipVocabulary> {}
