import { html, nothing, type PropertyValues, type TemplateResult } from "lit"
import { property } from "lit/decorators.js"
import { ifDefined } from "lit/directives/if-defined.js"

import { proto } from "$/util"
import { Shorthand } from "$/elements"
import { buttonVocabulary } from "$/components/button/button.vocabulary.en"
import type { ButtonToggleDetail } from "$/components/components.types"
import { IconRenderer, UIElement } from "../../elements"

import buttonCSS from "$/components/button/button.css?inline"

/****************
 * ### `<ui-button>`
 * A semantic `<button>` (or `<a>` with `href`) in Fomantic's class grammar:  `<button class="ui primary button">`.
 * - Shorthand:  `icon` (name, or `{ name }`), `label` (joined label), `content` (text, property only --
 *   `button.vocabulary.en.ts` has no `content` attribute).  Slotted content wins over shorthand.
 * - `label` wraps the button in `<div class="ui labeled button">`;  size / colour go on that wrapper so the
 *   button AND the label pick them up.
 * - `toggle`:  click flips `active` (controlled:  `ui-toggle` first, host may revert), `aria-pressed`.
 * - `type="submit" | "reset"`:  the inner button can't reach the outer form, so the element is form-associated
 *   and calls `internals.form.requestSubmit()` / `reset()`.  `name` / `value` submit through a transient
 *   `setFormValue()` around `requestSubmit()`.
 * - `disabled`:  real `disabled` on the inner button (`aria-disabled` on a link), and a capture listener
 *   swallows clicks on the host.
 ****************/
export class UIButton extends UIElement.for(buttonVocabulary) {
  static formAssociated = true
  @proto static delegatesFocus = true
  @proto static forwardsAriaLabel = true
  @proto static sheets = [[buttonVocabulary.noun, buttonCSS]] as const

  /** Text shorthand;  the default slot wins.  Property only:  the vocabulary has no `content` attribute. */
  @property({ attribute: false }) accessor content: string | undefined = undefined

  /** `<fieldset disabled>` disabled us. */
  private formDisabled = false

  /** icon templates */
  private readonly icons = new IconRenderer(this)

  constructor() {
    super()
    this.addEventListener("click", this.onHostClick, { capture: true })
  }

  ////////////////
  // ## Rendering
  ////////////////

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    const { attached, floated } = this
    this.setState("active", this.active)
    this.setState("disabled", this.isDisabled)
    this.setState("loading", this.loading)
    this.setState("fluid", this.fluid || attached === true || attached === "top" || attached === "bottom")
    this.setState("left-floated", floated === "left")
    this.setState("right-floated", floated === "right")
  }

  protected override render() {
    const label = this.hasLabel()
    if (!label) return this.renderButton(this.classes(this.iconClass()))
    const side = this.labeled === "left" ? "left" : true
    const wrapper = this.classes(undefined, { ...this.onlyKinds(WRAPPER_KINDS), labeled: side })
    const inner = this.classes(this.iconClass(), { ...this.withoutKinds(WRAPPER_KINDS), labeled: false })
    return html`<div class=${wrapper}>
      ${this.renderButton(inner)}<span class="ui basic label" part=${this.partName("label")}
        ><slot name=${this.slotName("label")} @slotchange=${this.onSlotChange}>${this.label}</slot></span
      >
    </div>`
  }

  /** The `<button>` or `<a>` itself. */
  private renderButton(classes: string) {
    const disabled = this.isDisabled
    const content = this.renderContent()
    const ariaLabel = this.ariaLabelled()
    if (this.href) {
      return html`<a
        class=${classes}
        part=${this.partName("button")}
        href=${ifDefined(disabled ? undefined : this.href)}
        target=${ifDefined(this.target)}
        role=${ifDefined(disabled ? "link" : undefined)}
        aria-disabled=${ifDefined(disabled ? "true" : undefined)}
        aria-label=${ifDefined(ariaLabel)}
        aria-busy=${ifDefined(this.loading ? "true" : undefined)}
        @click=${this.onClick}
        >${content}</a
      >`
    }
    return html`<button
      class=${classes}
      part=${this.partName("button")}
      type="button"
      ?disabled=${disabled}
      aria-label=${ifDefined(ariaLabel)}
      aria-pressed=${ifDefined(this.toggle ? String(this.active) : undefined)}
      aria-busy=${ifDefined(this.loading ? "true" : undefined)}
      @click=${this.onClick}
    >
      ${content}
    </button>`
  }

  /** Icon + text, or the two faces of an `animated` button. */
  private renderContent(): TemplateResult {
    const text = html`<slot @slotchange=${this.onSlotChange}>${this.content ?? nothing}</slot>`
    const icon = this.renderIcon()
    if (this.animated) {
      return html`<span class="visible content">${text}</span><span class="hidden content">${icon}</span>`
    }
    return html`${icon}${text}`
  }

  /**
   * `<span class="icon">` around the icon slot / shorthand, or a bare slot waiting for content.
   * - HACK: the shorthand svg is a SIBLING of the slot, not its fallback content as `button.css`'s contract
   *   says:  the sheet sizes `.icon > svg` and `.icon > ::slotted(svg)`, and fallback content inside `<slot>`
   *   matches neither, so a labeled-icon glyph filled its whole block.
   */
  private renderIcon() {
    const slot = this.slotName("icon")
    if (!this.hasIcon()) return html`<slot name=${slot} @slotchange=${this.onSlotChange}></slot>`
    const svg = this.slotted("icon").length ? nothing : this.icons.template(this.iconName())
    return html`<span class="icon" part=${this.partName("icon")}
      >${svg}<slot name=${slot} @slotchange=${this.onSlotChange}></slot
    ></span>`
  }

  ////////////////
  // ## Content detection
  ////////////////

  /** Icon name from the `icon` shorthand. */
  private iconName(): string | undefined {
    const props = Shorthand.resolve(this.icon, Shorthand.map.name)
    return typeof props?.name === "string" ? props.name : undefined
  }

  /** `icon` for an icon-only button;  `labeled` + icon makes `labeled icon`. */
  private iconClass(): string | undefined {
    if (!this.hasIcon() || this.animated) return undefined
    return !this.hasText() || (this.labeled && !this.hasLabel()) ? ICON_CLASS : undefined
  }

  private hasIcon(): boolean {
    return !!this.iconName() || this.slotted("icon").length > 0
  }

  private hasLabel(): boolean {
    return (this.label !== undefined && this.label !== "") || this.slotted("label").length > 0
  }

  /** Default-slot content (or `content`) that isn't whitespace. */
  private hasText(): boolean {
    if (this.content) return true
    // SSR:  the DOM shim has no `childNodes`
    for (const node of this.childNodes ?? []) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true
      if (node instanceof Element && !node.slot) return true
    }
    return false
  }

  /** A slot's assignment changed:  icon / text / label presence may have too. */
  private readonly onSlotChange = () => this.requestUpdate()

  /** Overrides keeping only attributes of `kinds` (everything else `undefined`). */
  private onlyKinds(kinds: ReadonlySet<string>) {
    return this.filterKinds((kind) => !kinds.has(kind))
  }

  /** Overrides dropping attributes of `kinds`. */
  private withoutKinds(kinds: ReadonlySet<string>) {
    return this.filterKinds((kind) => kinds.has(kind))
  }

  /** `{ [attribute]: undefined }` for every attribute whose kind `drop` accepts. */
  private filterKinds(drop: (kind: string) => boolean) {
    const overrides: Record<string, undefined> = {}
    for (const spec of this.vocabulary.attributes) if (drop(spec.kind)) overrides[spec.name] = undefined
    return overrides
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /** Disabled by attribute or by a disabled fieldset. */
  get isDisabled(): boolean {
    return this.disabled || this.formDisabled
  }

  /** Swallow clicks while disabled, before any other listener on the host. */
  private readonly onHostClick = (event: Event) => {
    if (!this.isDisabled) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  /** Toggle, submit or reset. */
  private readonly onClick = (event: MouseEvent) => {
    if (this.isDisabled || this.loading) return
    if (this.toggle) {
      const detail: ButtonToggleDetail = { active: !this.active, originalEvent: event }
      this.transition("active", !this.active, "ui-toggle", detail)
    }
    const form = this.internals.form
    if (!form) return
    if (this.type === "submit") this.submit(form)
    else if (this.type === "reset") form.reset()
  }

  /**
   * `requestSubmit()`, contributing `name=value` for the duration only -- a form-associated element can't be
   * the `submitter`, but its form value is read synchronously while the submit event builds `FormData`.
   */
  private submit(form: HTMLFormElement) {
    const named = !!this.name
    if (named) this.internals.setFormValue(this.value ?? "")
    try {
      form.requestSubmit()
    } finally {
      if (named) this.internals.setFormValue(null)
    }
  }

  /** Called by the browser when an ancestor fieldset toggles disabled. */
  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled
    this.requestUpdate()
  }
}

/** Kinds that style the labeled wrapper rather than the inner button. */
const WRAPPER_KINDS: ReadonlySet<string> = new Set(["size", "color"])

/** `ClassBuilder` extra for icon-only / labeled icon buttons -- grammar, not vocabulary. */
const ICON_CLASS = "icon"
