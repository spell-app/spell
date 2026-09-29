import { contentVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-content>`
 * A content block:  `<div class="content">`;  `image` / `scrolling` for modal content.
 * - A `scrolling` block is focusable (`tabindex="0"`), so keyboard users can scroll it.
 ****************/
export class UIContent extends PartElement.for(contentVocabulary) {
  protected override render() {
    return this.renderBox(this.classes(), this.renderContent(), { tabindex: this.scrolling ? "0" : undefined })
  }
}
