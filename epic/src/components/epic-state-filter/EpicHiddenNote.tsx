import type { JSX } from "@solidjs/web"

import { E } from "$/ui/core"

import { epicHiddenNoteVocabulary } from "./EpicHiddenNote.en"
import { SHOW_ALL } from "./EpicStateFilter.types"

import tooltipCSS from "$/epics/components/epic-item/Tooltip.css?inline"
import noteCSS from "./EpicHiddenNote.css?inline"

/****************
 * ### `<epic-hidden-note>`
 * Under a list the state filter hides items of (epic `airplane` P8;  ONE element since epic `epic-engine` P3):
 * `3 hidden · show all`, a quiet line drawn as a link.
 * - a click asks the owner to show everything again (`epic-show-all`):  it clears the filter
 * - drawn by `<epic-section>` under its items, and by the docs runtime under the Epics page's lists
 *   (`wireItemFilters()`);  with nothing hidden, the owner leaves it out
 ****************/
export class EpicHiddenNote extends E.UIComponent<typeof epicHiddenNoteVocabulary> {
  @E.proto static vocabulary = epicHiddenNoteVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-hidden-note": noteCSS }
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <button
        type="button"
        class={this.rootClass}
        part={this.partForName("base")}
        title={this.translationForKey("hiddenTip")}
        onClick={() => this.send(SHOW_ALL, {})}
      >
        {this.translationForKey("hiddenNote", { count: this.count ?? 0 })}
      </button>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicHiddenNote extends E.AttributeValues<typeof epicHiddenNoteVocabulary> {}
