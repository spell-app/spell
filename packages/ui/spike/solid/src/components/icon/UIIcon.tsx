import { createEffect } from "solid-js"
import type { JSX } from "@solidjs/web"

import { proto } from "$/util"
import { iconVocabulary } from "$/components/icon/icon.vocabulary.en"

import { IconGlyph } from "$spike/IconGlyph"
import { PartContext } from "$spike/PartContext"
import { UIElement } from "$spike/UIElement"

import iconCSS from "$/components/icon/icon.css?inline"

/****************
 * ### `<ui-icon>`
 * An SVG glyph:  `<span class="ui … icon" part="icon"><svg aria-hidden></span>`, the data from `Icons`.
 * - Host is `display: contents`:  the span IS the inline box, where Fomantic's `<i class="icon">` sat.
 * - Accessible name on the HOST, through internals:  `label` => `role=img` + `aria-label`;  none =>
 *   `aria-hidden`, a decorative glyph.
 * - `:state(in-icons)` when its flat-tree parent is a `<ui-icons>` (`PartContext`, direct mode):  `icon.css`
 *   stacks and positions it by that, since the group can't reach into its children's shadow roots.
 * - NOTE: the vocabulary's `style` attribute shadows `HTMLElement.style`, so its PROPERTY is `iconStyle`
 *   (`ElementDefinition.safeKey()`);  the attribute also collides with inline CSS, see REPORT.md.
 ****************/
export class UIIcon extends UIElement<typeof iconVocabulary> {
  @proto static vocabulary = iconVocabulary
  @proto static styles = { icon: iconCSS }

  /** `<ui-icons>` parent, if any. */
  readonly context = new PartContext(this.host, this.vocabulary.noun, { direct: true })

  /** The glyph for `name` / `style`. */
  readonly glyph = new IconGlyph(
    () => this.attrs.name,
    () => this.attrs.style
  )

  constructor(...args: ConstructorParameters<typeof UIElement>) {
    super(...args)
    const { internals } = this.host
    createEffect(
      () => this.attrs.label,
      (label) => {
        internals.role = label ? IMG : null
        internals.ariaLabel = label ?? null
        internals.ariaHidden = label ? null : TRUE
      }
    )
  }

  protected hostStates() {
    return { disabled: this.attrs.disabled, loading: this.attrs.loading }
  }

  render(): JSX.Element {
    return (
      <span class={this.classes()} part={this.part("icon")}>
        {this.glyph.svg()}
      </span>
    )
  }
}

/** Role of a labelled icon. */
const IMG = "img"

/** ARIA boolean. */
const TRUE = "true"
