import type { JSX } from "@solidjs/web"

import { E, UIT } from "spell-ui/core"
import { segmentsVocabulary } from "./UISegments.en"

import segmentCSS from "./UISegment.css?inline"

/****************
 * ### `UISegments`
 * The component behind `<ui-segments>`:  a group of segments in one box.
 *
 * - Its shadow DOM is one box, `<div class="ui … segments" part="group">`, around a slot for the segments.
 * - `UISegment.css` hands the group's look to the slotted segments, through `--_ui-segments-*` tokens.
 ****************/
export class UISegments extends E.UIComponent<typeof segmentsVocabulary> {
  @E.proto static vocabulary = segmentsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { segment: segmentCSS },
    // `loading`:  Fomantic's veil
    loading: "its own"
  } satisfies Partial<E.ElementSetup>

  /** `appearance="piled"`:  `:state(piled)`, the element the stacking context its rotated sheets sit behind. */
  @E.cssState("piled")
  get isPiled(): boolean {
    return String(this.appearance ?? "")
      .split(UIT.WHITESPACE)
      .includes(PILED)
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("group")}>
        <slot />
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UISegments extends E.AttributeValues<typeof segmentsVocabulary> {}

/** The `piled` look word of `appearance`. */
const PILED = "piled"
