import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { proto } from "$/util"
import { dividerVocabulary } from "$/components/divider/divider.vocabulary.en"

import { IconGlyph } from "$spike/IconGlyph"
import { UIElement } from "$spike/UIElement"

import dividerCSS from "$/components/divider/divider.css?inline"

/****************
 * ### `<ui-divider>`
 * A divider:  `<div class="ui … divider" role="separator" part="divider">` holding the `icon` shorthand's box,
 * then the default slot for text.
 * - `role="separator"`, not `<hr>`:  a horizontal / vertical divider carries text, which `<hr>` can't hold;
 *   `aria-orientation="vertical"` for `vertical`;  a `hidden` divider is `role="none"` (spacing only).
 * - NOTE: the vocabulary's `hidden` attribute IS the global `hidden` attribute:  the UA and `divider.css`
 *   (`:host([hidden])`) hide the whole host, so a "hidden divider" renders nothing (see REPORT.md).  Its
 *   property is `dividerHidden` (`ElementDefinition.safeKey()`).
 ****************/
export class UIDivider extends UIElement<typeof dividerVocabulary> {
  @proto static vocabulary = dividerVocabulary
  @proto static styles = { divider: dividerCSS }

  /** Glyph of the `icon` shorthand. */
  readonly glyph = new IconGlyph(() => this.attrs.icon)

  render(): JSX.Element {
    return (
      <div
        class={this.classes()}
        role={this.attrs.hidden ? NONE : SEPARATOR}
        aria-orientation={this.attrs.vertical && !this.attrs.hidden ? VERTICAL : undefined}
        part={this.part("divider")}
      >
        <Show when={this.attrs.icon}>
          <span class={ICON} part={this.part("icon")}>
            {this.glyph.svg()}
          </span>
        </Show>
        <slot />
      </div>
    )
  }
}

/** Role of a divider with a line. */
const SEPARATOR = "separator"

/** Role of a spacing-only divider. */
const NONE = "none"

/** `aria-orientation` of a vertical divider. */
const VERTICAL = "vertical"

/** Class of the icon box. */
const ICON = "icon"
