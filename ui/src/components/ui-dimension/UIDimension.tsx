import type { JSX } from "@solidjs/web"

import { BUILT_IN, type Dimension } from "spell/util/measures/Dimension"
import { BUILT_IN_DIMENSIONS } from "spell/util/measures/dimensions.generated"
import { MeasureSystem } from "spell/util/measures/MeasureSystem"
import { E } from "spell/ui/core"
import { dimensionVocabulary } from "./UIDimension.en"

import dimensionCSS from "./UIDimension.css?inline"

/****************
 * ### `<ui-dimension>`
 * The component behind `<ui-dimension>`:  one measure, in the reader's own units (epic `language` P24, Owen's C4).
 *
 * - `<ui-dimension value="172" dimension="length" unit="cm">`:  5 ft 8 in to a US reader, 172 cm to everyone else.
 *   - The reader's units:  their choice, else their region's (the kit's `MeasureSystem`, which Spell's runtime shows
 *     every measure by too).
 *   - `in="feet and inches"`:  those units instead, largest first.
 * - Spell passes `dimension` and `unit` itself for a measure:  `<ui-dimension value={its height}>`.
 * - Spell's built-in dimensions only (length, weight, temperature, volume, speed, proportion):  the kit's table,
 *   compiled from the ones Spell writes;  a program's own isn't known here.
 * - A proportion is a percent, shown with its % sign the reader's way:  `18%`, Spanish `18 %` (epic `language` P34).
 * - Nothing to show (no value, an unknown dimension or unit):  an empty span, which keeps its line box, with a warning
 *   for the unknowns.
 ****************/
export class UIDimension extends E.UIComponent<typeof dimensionVocabulary> {
  @E.proto static vocabulary = dimensionVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { dimension: dimensionCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The dimension `dimension` names:  `length` or `longitud` is `Length`. */
  @E.derived
  get measured(): Dimension | undefined {
    return UIDimension.dimensionNamed(this.dimension)
  }

  /** The measure, written:  `5 ft 8 in`;  `""` with nothing to show. */
  @E.derived
  get text(): string {
    const { measured, value } = this
    const unit = measured?.unitNamed(this.unit ?? "")
    if (!measured || !unit) {
      if (this.dimension || this.unit) E.Warnings.warn("<ui-dimension>", `can't show ${this.unit} of ${this.dimension}`)
      return ""
    }
    if (value === undefined || value === null || Number.isNaN(Number(value))) return ""
    const units = this.unitsIn(measured)
    return units ? measured.text(Number(value), unit.id, units) : MeasureSystem.shown(value, measured, unit.id)
  }

  /** The units `in` names, by id:  `"feet and inches"` => `["foot", "inch"]` -- `undefined` when it says none. */
  private unitsIn(measured: Dimension): string[] | undefined {
    const and = this.translationForKey("and")
    const said = (this.in ?? "").split(new RegExp(`\\s*(?:,|\\b(?:and|${and})\\b)\\s*`)).filter(Boolean)
    const units = said.map((name) => measured.unitNamed(name)?.id)
    return units.length && units.every((id) => !!id) ? (units as string[]) : undefined
  }

  render(): JSX.Element {
    return (
      <span class={this.rootClass} part={this.partForName("measure")}>
        {this.text}
      </span>
    )
  }

  /** Spell's built-in dimension `name`:  its type name (`Length`), or its word in any language (`length`, `longitud`). */
  static dimensionNamed(name: string | undefined): Dimension | undefined {
    if (!name) return undefined
    const lower = name.toLowerCase()
    const entry = BUILT_IN_DIMENSIONS.find(
      (it) => it.name.toLowerCase() === lower || Object.values(it.words).some((word) => word === lower)
    )
    return entry && BUILT_IN.get(entry.name)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDimension extends E.AttributeValues<typeof dimensionVocabulary> {}
