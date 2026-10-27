import { E } from "spell/ui/core"
import { contentVocabulary } from "./UIContent.en"

/****************
 * ### `UIContent`
 * The component behind `<ui-content>`:  an owner's main block of content,
 * `<div class="[image] [scrolling] [text-align] [vertical-align] content">`.
 *
 * - `image` and `scrolling` are a modal's layouts;  `text-align` and `vertical-align` are Fomantic's
 *   `center aligned content` (in a card, an item, a list).
 * - No `floated` since epic `ui-gaps` P8:  a `<ui-stack>` places content left and right.
 * - `scrolling`:  the root is a keyboard stop (`tabindex=0`), as every scrollable region must be.
 * - Finding its owner, the markup and the sheet all come from `PartComponent`.
 ****************/
export class UIContent extends E.PartComponent<typeof contentVocabulary> {
  @E.proto static vocabulary = contentVocabulary

  protected get rootTabIndex(): number | undefined {
    return this.scrolling ? 0 : undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIContent extends E.AttributeValues<typeof contentVocabulary> {}
