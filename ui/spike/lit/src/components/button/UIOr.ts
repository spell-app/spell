import { html } from "lit"

import { proto, UIElement } from "../../core"
import { buttonVocabulary, orVocabulary } from "$/components/button/button.vocabulary.en"

import buttonCSS from "$/components/button/button.css?inline"

/****************
 * ### `<ui-or>`
 * The "or" badge between two grouped buttons:  `<span class="or" data-text="or">`, text from `UI.i18n`
 * (or the `text` attribute).  `:state(or)` keeps a group from stretching it.
 ****************/
export class UIOr extends UIElement.for(orVocabulary) {
  @proto static sheets = [[buttonVocabulary.noun, buttonCSS]] as const

  override connectedCallback() {
    super.connectedCallback()
    this.setState("or", true)
  }

  protected override render() {
    return html`<span class="or" part=${this.partName("or")} data-text=${this.text || this.t("or")}></span>`
  }
}
