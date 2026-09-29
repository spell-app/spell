import { html } from "lit"

import { proto, UIElement } from "../../core"
import { labelsVocabulary, labelVocabulary } from "$/components/label/label.vocabulary.en"

import labelCSS from "$/components/label/label.css?inline"

/****************
 * ### `<ui-labels>`
 * A group sharing one look:  `<div class="ui ... labels" part="group"><slot>`.  `label.css` hands the look to
 * the slotted labels through inherited tokens, so the element only builds classes.
 ****************/
export class UILabels extends UIElement.for(labelsVocabulary) {
  @proto static sheets = [[labelVocabulary.noun, labelCSS]] as const

  protected override render() {
    return html`<div class=${this.classes()} part=${this.partName("group")}><slot></slot></div>`
  }
}
