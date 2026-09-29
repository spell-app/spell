import type { JSX } from "@solidjs/web"

import { proto } from "$/util"
import { segmentsVocabulary } from "$/components/segment/segment.vocabulary.en"

import { UIElement } from "$spike/UIElement"

import segmentCSS from "$/components/segment/segment.css?inline"

/****************
 * ### `<ui-segments>`
 * A group of segments in one box:  `<div class="ui … segments" part="group"><slot></slot></div>`.
 * - `segment.css` hands the group look to slotted segments through `--ui-segments-*` tokens.
 ****************/
export class UISegments extends UIElement<typeof segmentsVocabulary> {
  @proto static vocabulary = segmentsVocabulary
  @proto static styles = { segment: segmentCSS }

  protected hostStates() {
    return { piled: this.attrs.piled }
  }

  render(): JSX.Element {
    return (
      <div class={this.classes()} part={this.part("group")}>
        <slot />
      </div>
    )
  }
}
