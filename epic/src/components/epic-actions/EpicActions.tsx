import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { epicActionsVocabulary } from "./EpicActions.en"

import actionsCSS from "./EpicActions.css?inline"

/****************
 * ### `<epic-actions>`
 * A block's ACTIONS ROW on an epic page (epic `epic-engine` P45;  Owen, 2026-10-25:  "You should be creating web
 * elements for the things inside an `<epic-phase>` ... e.g. `<epic-actions>`").
 * - a line of no height just before its block, its controls over the block's top right corner:
 *   the comments' bullhorn, then a table's expand button (Owen, 2026-10-19:  "The expand button should be to the
 *   right of the bullhorn rather than in its own line")
 * - its place and look are its own sheet's;  where the block's top edge lies is the docs runtime's to measure
 *   (`alignBlockActions()`:  the block's own top margin may lie between them), handed in as `--spell-block-gap`
 *   and, for a table, `--spell-block-head` and `head-row`
 * - made by the docs runtime on epic pages (`addBlockAction()`), never written in a page:  `data-spell-added`, so a
 *   live update steps around it;  elsewhere the runtime still makes its `div.spell-block-actions`
 ****************/
export class EpicActions extends E.UIComponent<typeof epicActionsVocabulary> {
  @E.proto static vocabulary = epicActionsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-actions": actionsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <span class={[this.rootClass, BUTTONS]} part={this.partForName("base")}>
        <slot />
      </span>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicActions extends E.AttributeValues<typeof epicActionsVocabulary> {}

/** Class word of the controls' box. */
const BUTTONS = "buttons"
