import type { JSX } from "@solidjs/web"

import { E } from "spell-kit/element"

import { STATUS_SLOT } from "$/epics/components/epic-item/EpicItem.types"

import { epicSummaryVocabulary } from "./EpicSummary.en"

import summaryCSS from "./EpicSummary.css?inline"
import tooltipCSS from "$/epics/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicSummary`
 * The component behind `<epic-summary>`:  the Overview's two-sentence summary, a lede at the top of `1. Overview`.
 * - Draws the lede's look:  the text is its light children, through the default slot (Q12).
 * - `<epic-overview>` draws it where it drew `<p slot="summary">`:  first, above the Kickoff prompt and the estimate.
 * - Under the lede:  Owen's kept notes (`slot="notes"`) and Claude's status cards (`slot="status"`).
 * - REVIEWED as the Overview, keyed `summary` in the inbox (epic `airplane` P2):  `<epic-overview>` draws the review
 *   controls on its title row, the note box under it (epic `epic-engine` I55;  Owen, 2026-10-20:  "The buttons on the
 *   left should move into the 1. Overview header").  Before, this drew them under the lede.
 ****************/
export class EpicSummary extends E.UIComponent<typeof epicSummaryVocabulary> {
  @E.proto static vocabulary = epicSummaryVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-summary": summaryCSS },
    // `disabled`:  only a look (the sheet dims it), so the text stays findable;  `loading`:  the shared spinner
    disabled: "its own",
    loading: "loader"
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <>
        <div class={this.rootClass} part={this.partForName("base")}>
          <slot />
        </div>
        <slot name={this.slotForName("notes")} />
        <slot name={this.slotForName(STATUS_SLOT)} />
      </>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicSummary extends E.AttributeValues<typeof epicSummaryVocabulary> {}
