import { createEffect } from "solid-js"
import type { JSX } from "@solidjs/web"

import { IconGlyph, PartContext, proto, UIElement, type IconStyle } from "$spike/core"
import { iconVocabulary } from "$/components/icon/icon.vocabulary.en"
import { IconFallback } from "$/components/icon/icon.fallback"

import iconCSS from "$/components/icon/icon.css?inline"

/****************
 * ### `<ui-icon>`
 * An SVG glyph:  `<span class="ui … icon" part="icon"><svg aria-hidden></span>`, the data from `Icons`.
 * - Host is `display: contents`:  the span IS the inline box, where Fomantic's `<i class="icon">` sat.
 * - Accessible name on the HOST, through internals:  `label` => `role=img` + `aria-label`;  none =>
 *   `aria-hidden`, a decorative glyph.
 * - `:state(in-icons)` when its flat-tree parent is a `<ui-icons>` (`PartContext`, direct mode):  `icon.css`
 *   stacks and positions it by that, since the group can't reach into its children's shadow roots.
 * - `variant` picks the set (`regular`, `brands`);  `outline` ~== `variant="regular"` (Fomantic's spelling).
 *   Without an explicit `variant` attribute the set is inferred from the name (`Icons.resolve()`), so the
 *   vocabulary's `solid` default never overrides a brand name or a trailing `outline` word.
 ****************/
export class UIIcon extends UIElement<typeof iconVocabulary> {
  @proto static vocabulary = iconVocabulary
  @proto static styles = { icon: iconCSS }
  @proto static Fallback = IconFallback

  /** `<ui-icons>` parent, if any. */
  readonly context = new PartContext(this.host, this.vocabulary.noun, { direct: true })

  /** The glyph for `name` / `variant`. */
  readonly glyph = new IconGlyph(
    () => this.attrs.name,
    () => this.iconSet()
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

  /**
   * Font Awesome set to force, or `undefined` to infer it from the name;  tracked.
   * - `attrs.variant` is read first so a change re-runs this;  the attribute check tells an explicit
   *   `variant` from the vocabulary default.
   */
  private iconSet(): IconStyle | undefined {
    const variant = this.attrs.variant
    if (this.attrs.outline) return REGULAR
    return this.host.hasAttribute(this.definition.attribute("variant").attribute) ? variant : undefined
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

/** Set `outline` picks. */
const REGULAR = "regular"
