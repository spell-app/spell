import { html, type PropertyValues } from "lit"

import { proto, UIElement } from "../../core"
import { buttonsVocabulary, buttonVocabulary } from "$/components/button/button.vocabulary.en"

import buttonCSS from "$/components/button/button.css?inline"

/****************
 * ### `<ui-buttons>`
 * A group:  `<div class="ui ... buttons" role="group"><slot>`.  `button.css` hands the look to the slotted
 * buttons through inherited tokens, so the element only builds classes and host states.
 ****************/
export class UIButtons extends UIElement.for(buttonsVocabulary) {
  @proto static sheets = [[buttonVocabulary.noun, buttonCSS]] as const

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    const { attached, floated } = this
    const block = attached === true || attached === "top" || attached === "bottom"
    this.setState("fluid", this.fluid || !!this.width || block)
    this.setState("left-floated", floated === "left")
    this.setState("right-floated", floated === "right")
  }

  protected override render() {
    return html`<div class=${this.classes()} role="group" part=${this.partName("group")}><slot></slot></div>`
  }
}
