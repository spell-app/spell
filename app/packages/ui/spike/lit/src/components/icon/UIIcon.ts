import { html, type PropertyValues } from "lit"

import { proto, type IconStyle, IconRenderer, OwnerController, UIElement } from "../../core"
import { iconVocabulary } from "$/components/icon/icon.vocabulary.en"
import { IconFallback } from "$/components/icon/icon.fallback"

import iconCSS from "$/components/icon/icon.css?inline"

/****************
 * ### `<ui-icon>`
 * A Font Awesome glyph:  `<span class="ui ... icon" part="icon"><svg>` (`IconRenderer`), host `display: contents`.
 * - `variant` picks the set (`regular`, `brands`);  `outline` ~== `variant="regular"` (Fomantic's spelling).
 *   Without an explicit `variant` attribute the set is inferred from the name (`Icons.resolve()`), so the
 *   vocabulary's `solid` default never overrides a brand name or a trailing `outline` word.
 * - Accessible name on the HOST, through internals:  `label` => `role=img` + `aria-label`;  none =>
 *   `aria-hidden`, a decorative glyph.
 * - `:state(in-icons)` while its flat-tree parent is a `<ui-icons>` (an `OwnerController` for the `icon` part,
 *   `direct`), which `icon.css` stacks and positions it by.
 * - An unknown or still-loading name keeps the empty box, so layout doesn't jump.
 ****************/
export class UIIcon extends UIElement.for(iconVocabulary) {
  @proto static sheets = [[iconVocabulary.noun, iconCSS]] as const
  @proto static Fallback = IconFallback

  /** svg templates */
  private readonly icons = new IconRenderer(this)

  /** `<ui-icons>` group, when directly inside one */
  protected readonly group = new OwnerController(this, iconVocabulary.noun, { direct: true })

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    this.setState("disabled", this.disabled)
    this.setState("loading", this.loading)
    UIIcon.label(this.internals, this.label)
  }

  protected override render() {
    return html`<span class=${this.classes()} part=${this.partName("icon")}
      >${this.icons.template(this.name, this.iconSet())}</span
    >`
  }

  /** Font Awesome set to force, or `undefined` to infer it from the name. */
  private iconSet(): IconStyle | undefined {
    if (this.outline) return "regular"
    const attribute = this.localized?.names.attributes.get("variant") ?? "variant"
    return this.hasAttribute(attribute) ? this.variant : undefined
  }

  /**
   * Name `internals` as an image (`label`), or hide it from assistive technology.
   * - Shared with `<ui-icons>`, whose group is one image with one name.
   */
  static label(internals: ElementInternals, label: string | undefined) {
    internals.role = label ? "img" : null
    internals.ariaLabel = label || null
    internals.ariaHidden = label ? null : "true"
  }
}
