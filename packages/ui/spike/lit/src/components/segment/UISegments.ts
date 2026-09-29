import { html, type PropertyValues } from "lit"

import { proto, UIElement } from "../../core"
import { segmentsVocabulary, segmentVocabulary } from "$/components/segment/segment.vocabulary.en"

import segmentCSS from "$/components/segment/segment.css?inline"

/****************
 * ### `<ui-segments>`
 * Segments in one box:  `<div class="ui ... segments" part="group"><slot>`.  `segment.css` hands the group
 * look to the slotted segments through `--ui-segments-*` tokens, so the element builds classes and states.
 ****************/
export class UISegments extends UIElement.for(segmentsVocabulary) {
  @proto static sheets = [[segmentVocabulary.noun, segmentCSS]] as const

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    this.setState("piled", this.piled)
    this.internals.ariaBusy = this.loading ? "true" : null
  }

  protected override render() {
    return html`<div class=${this.classes()} part=${this.partName("group")} ?inert=${this.disabled}>
      <slot></slot>
    </div>`
  }
}
