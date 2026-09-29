import { Show, createEffect, createMemo, untrack } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { Cell, Icons, proto, SlotContent, UIElement, type AttributeName, type IconData } from "$spike/core"
import { buttonVocabulary } from "$/components/button/button.vocabulary.en"

import { ButtonFallback } from "$/components/button/button.fallback"

import buttonCSS from "$/components/button/button.css?inline"

/****************
 * ### `<ui-button>`
 * A button:  a semantic `<button>` (or `<a>` with `href`) in the shadow root, in Fomantic's class grammar.
 * - Form-associated (the fork's `formAssociated`) only so `type=submit|reset` can reach `internals.form`;  it
 *   submits no value of its own except while it is the submitter (see `submit()`).  No `FormHost`:  a page with
 *   buttons only never loads the `forms` entry.
 * - `active` is auto-controlled:  `toggle` flips it on click and dispatches `ui-toggle` first.
 * - Icons come from `Icons` asynchronously;  the `.icon` box is sized by CSS, so the SVG arriving shifts nothing.
 ****************/
export class UIButton extends UIElement<typeof buttonVocabulary> {
  @proto static vocabulary = buttonVocabulary
  @proto static styles = { button: buttonCSS }
  @proto static formAssociated = true
  @proto static Fallback = ButtonFallback

  /** `active`:  host-controlled, or toggled internally. */
  readonly active = this.controlled("active", false)

  /** Light-DOM slot occupancy. */
  readonly slots = new SlotContent(this.host)

  /** Loaded icon data for the `icon` attribute;  starts from the cache, so a known icon draws at once. */
  private readonly iconData = new Cell<IconData | undefined>(
    untrack(() => (this.attrs.icon ? Icons.peek(this.attrs.icon) : undefined))
  )

  /** Host `aria-label`, forwarded to the inner control (an icon-only button's name). */
  private readonly ariaLabel = new Cell(this.host.getAttribute(ARIA_LABEL))

  /** The inner `<button>` / `<a>`. */
  private control?: HTMLElement

  /** Icon name last asked for. */
  private iconName?: string

  constructor(...args: ConstructorParameters<typeof UIElement>) {
    super(...args)
    createEffect(
      () => this.attrs.icon,
      (name) => void this.loadIcon(name)
    )
    if (isServer) return
    const observer = new MutationObserver(() => this.ariaLabel.set(this.host.getAttribute(ARIA_LABEL)))
    observer.observe(this.host, { attributeFilter: [ARIA_LABEL] })
    this.host.addReleaseCallback(() => observer.disconnect())
  }

  ////////////////
  // ## Derived state
  ////////////////

  /** Has text content (slotted, or the `content` shorthand)? */
  readonly hasText = createMemo(() => this.slots.has("") || !!this.attrs.content)

  /** Has an icon (attribute or `icon` slot)? */
  readonly hasIcon = createMemo(() => !!this.attrs.icon || this.slots.has(this.slot("icon")))

  /** Has a joined label (attribute or `label` slot)? */
  readonly hasLabel = createMemo(() => !!this.attrs.label || this.slots.has(this.slot("label")))

  /** SVG for the `icon` attribute. */
  readonly iconSvg = createMemo(() => {
    const data = this.iconData.get()
    return data ? Icons.svg(data) : undefined
  })

  isDisabled(): boolean {
    return this.attrs.disabled || this.formDisabled.get()
  }

  protected classValue(name: AttributeName<typeof buttonVocabulary>): unknown {
    if (name === "active") return this.active.get()
    if (name === "disabled") return this.isDisabled()
    // with a joined label, `labeled` goes on the wrapper, not the inner button
    if (name === "labeled" && this.hasLabel()) return false
    return super.classValue(name)
  }

  /** `icon` for icon-only buttons and for `labeled icon` buttons. */
  protected extraClasses(): string | undefined {
    if (!this.hasIcon() || this.attrs.animated) return undefined
    const labeledIcon = !!this.attrs.labeled && !this.hasLabel()
    return !this.hasText() || labeledIcon ? ICON_CLASS : undefined
  }

  protected hostStates() {
    const { attached, floated } = this.attrs
    return {
      active: this.active.get(),
      disabled: this.isDisabled(),
      loading: this.attrs.loading,
      fluid: this.attrs.fluid || attached === true || attached === "top" || attached === "bottom",
      "left-floated": floated === "left",
      "right-floated": floated === "right"
    }
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <Show when={this.hasLabel()} fallback={this.control_()}>
        <div
          class={this.buildClasses({
            size: this.attrs.size,
            color: this.attrs.color,
            labeled: this.attrs.labeled || true
          })}
        >
          {this.control_()}
          <span class="ui basic label" part={this.part("label")}>
            <slot name={this.slot("label")}>{this.attrs.label}</slot>
          </span>
        </div>
      </Show>
    )
  }

  /** The inner `<button>`, or `<a>` with `href`. */
  private control_(): JSX.Element {
    const content = () => this.content()
    return (
      <Show
        when={this.attrs.href}
        fallback={
          <button
            ref={(element) => (this.control = element)}
            type="button"
            class={this.classes()}
            part={this.part("button")}
            disabled={this.isDisabled()}
            aria-pressed={this.attrs.toggle ? (this.active.get() ? "true" : "false") : undefined}
            aria-busy={this.attrs.loading ? "true" : undefined}
            aria-label={this.ariaLabel.get() ?? undefined}
            onClick={this.onClick}
          >
            {content()}
          </button>
        }
      >
        <a
          ref={(element) => (this.control = element)}
          class={this.classes()}
          part={this.part("button")}
          href={this.isDisabled() ? undefined : this.attrs.href}
          target={this.attrs.target}
          role={this.isDisabled() ? "link" : undefined}
          aria-disabled={this.isDisabled() ? "true" : undefined}
          aria-busy={this.attrs.loading ? "true" : undefined}
          aria-label={this.ariaLabel.get() ?? undefined}
          onClick={this.onClick}
        >
          {content()}
        </a>
      </Show>
    )
  }

  /** Icon + text, or the two `.content` boxes of an `animated` button. */
  private content(): JSX.Element {
    const text = <slot>{this.attrs.content}</slot>
    return (
      <Show when={this.attrs.animated} fallback={[<Show when={this.hasIcon()}>{this.icon()}</Show>, text]}>
        <span class="visible content">{text}</span>
        <span class="hidden content">{this.icon()}</span>
      </Show>
    )
  }

  /** The icon box:  the `icon` slot, falling back to the `icon` attribute's SVG. */
  private icon(): JSX.Element {
    return (
      <span class={ICON_CLASS} part={this.part("icon")}>
        <slot name={this.slot("icon")}>{this.iconSvg()}</slot>
      </span>
    )
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /** Click:  toggle, then submit / reset the form for those types. */
  private readonly onClick = (event: MouseEvent) => {
    if (this.isDisabled()) {
      event.preventDefault()
      return
    }
    if (this.attrs.toggle) {
      const next = !this.active.get()
      this.active.request(next, () => this.emit("ui-toggle", { active: next, originalEvent: event }))
    }
    const { form } = this.host.internals
    if (!form) return
    if (this.attrs.type === "submit") this.submit(form)
    else if (this.attrs.type === "reset") form.reset()
  }

  /**
   * `form.requestSubmit()`, with this button's `name=value` in the submission.
   * - A custom element can't be `requestSubmit()`'s submitter (it throws), so the button sets its own form
   *   value for the duration of the synchronous submit algorithm, then clears it.
   */
  private submit(form: HTMLFormElement) {
    const { name, value } = this.attrs
    const { internals } = this.host
    if (name) internals.setFormValue(value ?? "")
    try {
      form.requestSubmit()
    } finally {
      if (name) internals.setFormValue(null)
    }
  }

  /** Load the icon's data;  a later name wins over an earlier, slower one. */
  private async loadIcon(name: string | undefined) {
    this.iconName = name
    const data = name ? await Icons.get(name) : undefined
    if (this.iconName === name) this.iconData.set(data)
  }

  /** Focus the inner control. */
  focus() {
    this.control?.focus()
  }
}

/** Grammar words the element adds itself (not attributes):  the `icon` class / box. */
const ICON_CLASS = "icon"

/** Host attribute forwarded to the inner control. */
const ARIA_LABEL = "aria-label"
