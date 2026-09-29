import { html, nothing } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"

import { proto, IconRenderer, UIElement } from "../../core"
import { dividerVocabulary } from "$/components/divider/divider.vocabulary.en"
import { DividerFallback } from "$/components/divider/divider.fallback"

import dividerCSS from "$/components/divider/divider.css?inline"

/****************
 * ### `<ui-divider>`
 * A rule, optionally with text:  `<div class="ui ... divider" role="separator" part="divider">`, then an
 * `icon` shorthand's `span.icon` and the text slot.
 * - `role="separator"` rather than `<hr>`:  a horizontal / vertical divider carries text, which `<hr>` can't.
 * - `vertical` adds `aria-orientation="vertical"`;  a `hidden` divider is spacing only, `role="none"`.
 * - `hidden` is property `dividerHidden`:  `hidden` is the host's own boolean.  The ATTRIBUTE keeps its name;
 *   `divider.css`'s `:host([hidden]) { display: contents }` overrides the UA's `display: none`.
 ****************/
export class UIDivider extends UIElement.for(dividerVocabulary) {
  @proto static sheets = [[dividerVocabulary.noun, dividerCSS]] as const
  @proto static Fallback = DividerFallback

  /** icon templates */
  private readonly icons = new IconRenderer(this)

  protected override render() {
    const icon = this.icon
      ? html`<span class="icon" part=${this.partName("icon")}>${this.icons.template(this.icon)}</span>`
      : nothing
    return html`<div
      class=${this.classes()}
      role=${this.dividerHidden ? "none" : "separator"}
      aria-orientation=${ifDefined(this.vertical && !this.dividerHidden ? "vertical" : undefined)}
      part=${this.partName("divider")}
    >
      ${icon}<slot></slot>
    </div>`
  }
}
