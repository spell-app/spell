import { html, nothing, type PropertyValues } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"

import { proto, PART_OWNER_TOKENS, UIElement } from "../../core"
import { segmentVocabulary } from "$/components/segment/segment.vocabulary.en"
import { SegmentFallback } from "$/components/segment/segment.fallback"

import segmentCSS from "$/components/segment/segment.css?inline"

/****************
 * ### `<ui-segment>`
 * A grouping of content:  `<div class="ui ... segment" part="segment"><slot>`, host `display: contents`.
 * - OWNER tokens:  the root declares `--ui-inverted` INLINE, `0` or `1`, default included, so a plain segment
 *   inside an inverted one doesn't hand its parts the outer value.  `segment.css` adds `color-scheme: dark`
 *   (and sets `1` again) on an inverted root;  a plain one inherits the scheme, as the sheet documents.
 * - States:  `:state(piled)` makes the host the stacking context of the rotated sheets;  `inverted`,
 *   `loading`, `disabled` are for page styling.
 * - `loading`:  `aria-busy` on the host and a visually hidden `role=status` "Loading…" (`UI.i18n`).
 * - `disabled`:  the root is `inert`, so slotted controls can't be focused or clicked.
 * - `scrolling`:  the root is focusable (`tabindex="0"`), so keyboard users can scroll it.
 ****************/
export class UISegment extends UIElement.for(segmentVocabulary) {
  @proto static sheets = [[segmentVocabulary.noun, segmentCSS]] as const
  @proto static Fallback = SegmentFallback

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    this.setState("piled", this.piled)
    this.setState("inverted", this.inverted)
    this.setState("loading", this.loading)
    this.setState("disabled", this.disabled)
    this.internals.ariaBusy = this.loading ? "true" : null
  }

  protected override render() {
    const status = this.loading
      ? html`<span class="ui-visually-hidden-force" role="status">${this.t("loading")}</span>`
      : nothing
    return html`<div
      class=${this.classes()}
      part=${this.partName("segment")}
      style=${`${PART_OWNER_TOKENS.inverted}: ${this.inverted ? 1 : 0}`}
      tabindex=${ifDefined(this.scrolling ? "0" : undefined)}
      ?inert=${this.disabled}
    >
      <slot></slot>${status}
    </div>`
  }
}
