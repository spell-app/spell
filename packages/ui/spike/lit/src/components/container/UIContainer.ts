import { html } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"

import { proto } from "$/util"
import { containerVocabulary } from "$/components/container/container.vocabulary.en"
import { UIElement } from "../../elements"

import containerCSS from "$/components/container/container.css?inline"

/****************
 * ### `<ui-container>`
 * Page-width content:  `<div class="ui ... container" part="container"><slot>`.
 * - A `scrolling` container is focusable (`tabindex="0"`), so keyboard users can scroll it.
 ****************/
export class UIContainer extends UIElement.for(containerVocabulary) {
  @proto static sheets = [[containerVocabulary.noun, containerCSS]] as const

  protected override render() {
    return html`<div
      class=${this.classes()}
      part=${this.partName("container")}
      tabindex=${ifDefined(this.scrolling ? "0" : undefined)}
    >
      <slot></slot>
    </div>`
  }
}
