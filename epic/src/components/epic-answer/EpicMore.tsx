import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { epicMoreVocabulary } from "./EpicMore.en"
import { BODY } from "./EpicAnswer.types"

import answerCSS from "./EpicAnswer.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicMore`
 * The component behind `<epic-more>`:  More Details on an item, what Clarify / Add Details wrote IN PLACE of its
 * unclear text (`PlanDoc.addMore()`) -- a plain card headed "More Details".
 * - never folds (epic `epic-engine` I301;  Owen, 2026-11-15:  "Change title to 'More Details', not collapsable"):
 *   it IS the item's text now, so hiding it hid what the item says
 * - its heading in the text's own size, bold, as a Net effect's label (`<epic-net-effect>`)
 ****************/
export class EpicMore extends E.UIComponent<typeof epicMoreVocabulary> {
  @E.proto static vocabulary = epicMoreVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-answer": answerCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div class={HEADING} part={this.partForName("heading")}>
          {this.translationForKey("more")}
        </div>
        <div class={BODY} part={this.partForName("body")}>
          <slot />
        </div>
      </div>
    )
  }
}

/** Class of its heading, "More Details". */
const HEADING = "more-heading"
