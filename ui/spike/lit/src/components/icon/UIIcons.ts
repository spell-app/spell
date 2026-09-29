import { html, type PropertyValues } from "lit"

import { proto } from "$/util"
import { iconsVocabulary, iconVocabulary } from "$/components/icon/icon.vocabulary.en"
import { UIElement } from "../../elements"
import { UIIcon } from "./UIIcon"

import iconCSS from "$/components/icon/icon.css?inline"

/****************
 * ### `<ui-icons>`
 * Icons stacked into one glyph:  `<span class="ui ... icons" part="icons"><slot>`.
 * - Owns the `icon` part (`iconsVocabulary.ownsParts`):  each directly slotted `<ui-icon>` finds it and sets
 *   `:state(in-icons)`, since a group can't reach inside its children's shadow roots.
 * - `label` names the combined glyph (`role=img`);  without it the group is decorative.
 ****************/
export class UIIcons extends UIElement.for(iconsVocabulary) {
  @proto static sheets = [[iconVocabulary.noun, iconCSS]] as const

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    UIIcon.label(this.internals, this.label)
  }

  protected override render() {
    return html`<span class=${this.classes()} part=${this.partName("icons")}><slot></slot></span>`
  }
}
