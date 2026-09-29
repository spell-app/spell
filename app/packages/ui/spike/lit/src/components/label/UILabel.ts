import { html, nothing, type PropertyValues, type TemplateResult } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"

import { proto, type LabelRemoveDetail, IconRenderer, OwnerController, PARTS_SHEET, UIElement } from "../../core"
import { labelVocabulary } from "$/components/label/label.vocabulary.en"
import { LabelFallback } from "$/components/label/label.fallback"

import labelCSS from "$/components/label/label.css?inline"

/****************
 * ### `<ui-label>`
 * A label:  `<span class="ui ... label" part="label">` (`<a>` with `href`), host `display: contents`, holding in
 * order `img.image`, `span.icon`, the default slot, `span.detail`, and a `removable` label's delete button.
 * - `image`:  a string attribute.  Present (bare / `""`) => class `image` around a slotted `<img>`;  a non-empty
 *   value is the `src` of the label's own `img.image`.  `ClassBuilder` emits nothing for a string kind, so the
 *   `image` class goes in as `extra`.
 * - `icon` class (ClassBuilder `extra`) when there's an icon and no text:  the icon centres.
 * - `removable`:  `button.delete.icon` dispatches the cancelable `ui-remove` (`LabelRemoveDetail`);  the
 *   element never removes itself -- the host decides.
 * - A host `aria-label` is forwarded onto the root (an icon-only label);  a `<span>` root then becomes
 *   `role=img`, since `aria-label` is prohibited on a generic element.
 * - Inside a statistic (an owner whose `ownsParts` lists `label`) it IS that statistic's label part:
 *   `<div class="label" part="label">`, `:state(in-statistic)`, and it adopts `parts.css` by name.
 ****************/
export class UILabel extends UIElement.for(labelVocabulary) {
  @proto static sheets = [[labelVocabulary.noun, labelCSS]] as const
  @proto static Fallback = LabelFallback
  @proto static forwardsAriaLabel = true

  /** icon templates */
  private readonly icons = new IconRenderer(this)

  /** a statistic owning this label as its part */
  protected readonly statistic = new OwnerController(this, labelVocabulary.noun, {
    onChange: () => this.adoptSheets()
  })

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    this.setState("active", this.active)
    this.setState("disabled", this.disabled)
  }

  /** Also adopt `parts.css` while owned by a statistic. */
  protected override sheetNames(): string[] {
    const names = super.sheetNames()
    return this.statistic.owner ? [...names, PARTS_SHEET] : names
  }

  protected override render() {
    if (this.statistic.owner) {
      return html`<div class=${labelVocabulary.noun} part=${this.partName("label")}><slot></slot></div>`
    }
    const icon = this.hasIcon()
    const extra = [this.image === undefined ? "" : IMAGE_CLASS, icon && !this.hasText() ? ICON_CLASS : ""]
    const classes = this.classes(extra.filter(Boolean).join(" ") || undefined)
    const content = this.renderContent(icon)
    const ariaLabel = this.ariaLabelled()
    if (this.href) {
      return html`<a
        class=${classes}
        part=${this.partName("label")}
        href=${ifDefined(this.disabled ? undefined : this.href)}
        target=${ifDefined(this.target)}
        role=${ifDefined(this.disabled ? "link" : undefined)}
        aria-disabled=${ifDefined(this.disabled ? "true" : undefined)}
        aria-label=${ifDefined(ariaLabel)}
        >${content}</a
      >`
    }
    return html`<span
      class=${classes}
      part=${this.partName("label")}
      role=${ifDefined(ariaLabel ? "img" : undefined)}
      aria-label=${ifDefined(ariaLabel)}
      >${content}</span
    >`
  }

  /** Image, icon, text, detail, delete button -- in the contract's order. */
  private renderContent(icon: boolean): TemplateResult {
    const image = this.imageUrl()
    return html`${image ? html`<img class="image" part=${this.partName("image")} src=${image} alt="" />` : nothing}${
        icon
          ? html`<span class="icon" part=${this.partName("icon")}
              ><slot name=${this.slotName("icon")} @slotchange=${this.onSlotChange}
                >${this.icons.template(this.icon)}</slot
              ></span
            >`
          : html`<slot name=${this.slotName("icon")} @slotchange=${this.onSlotChange}></slot>`
      }<slot @slotchange=${this.onSlotChange}></slot>${
        this.detail ? html`<span class="detail" part=${this.partName("detail")}>${this.detail}</span>` : nothing
      }${
        this.removable
          ? html`<button
              type="button"
              class="delete icon"
              part=${this.partName("delete")}
              aria-label=${this.t("remove")}
              ?disabled=${this.disabled}
              @click=${this.onDelete}
            >
              ${this.icons.template(DELETE_ICON)}
            </button>`
          : nothing
      }`
  }

  ////////////////
  // ## Content detection
  ////////////////

  /**
   * `image="<url>"`:  the URL, or `undefined` for a plain image label (bare `image`), which styles a slotted
   * `<img>` instead.
   */
  private imageUrl(): string | undefined {
    return this.image?.trim() || undefined
  }

  private hasIcon(): boolean {
    return !!this.icon || this.slotted("icon").length > 0
  }

  /** Default-slot text or elements (a slotted `<img>` of an image label doesn't count). */
  private hasText(): boolean {
    // SSR:  the DOM shim has no `childNodes`
    for (const node of this.childNodes ?? []) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true
      if (node instanceof Element && !node.slot && node.localName !== "img") return true
    }
    return false
  }

  /** A slot's assignment changed:  icon / text presence may have too. */
  private readonly onSlotChange = () => this.requestUpdate()

  ////////////////
  // ## Behaviour
  ////////////////

  /** Delete button:  cancelable `ui-remove`;  the host removes (or keeps) the label. */
  private readonly onDelete = (event: MouseEvent) => {
    const detail: LabelRemoveDetail = { originalEvent: event }
    this.emit("ui-remove", detail, { cancelable: true })
  }
}

/** `ClassBuilder` extra for an icon-only label -- grammar, not vocabulary. */
const ICON_CLASS = "icon"

/** Glyph of the delete button. */
const DELETE_ICON = "xmark"

/**
 * `ClassBuilder` extra for an image label.
 * - The vocabulary's `image` is a string attribute (it may carry a URL), and `ClassBuilder` emits no class for
 *   the string kind, so the word is added here.
 */
const IMAGE_CLASS = "image"
