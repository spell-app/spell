import { Show, createMemo } from "solid-js"
import { Dynamic, type JSX } from "@solidjs/web"

import { proto } from "$/util"
import { labelVocabulary } from "$/components/label/label.vocabulary.en"

import { HostAttribute } from "$spike/HostAttribute"
import { IconGlyph } from "$spike/IconGlyph"
import { PartContext } from "$spike/PartContext"
import { SlotContent } from "$spike/SlotContent"
import { UIElement } from "$spike/UIElement"

import labelCSS from "$/components/label/label.css?inline"
import partsCSS from "$/components/parts/parts.css?inline"

/****************
 * ### `<ui-label>`
 * A label:  `<span class="ui … label" part="label">` (`<a>` with `href`) holding, in order, the `image` `<img>`,
 * the icon box, the default slot, the `detail` shorthand and the `removable` delete button.
 * - `icon` class (after the noun) when there's an icon and no text:  the icon centres.
 * - `image`:  a URL renders `<img class="image" part="image" alt="">`;  bare `image` styles a slotted `<img>`.
 * - `removable`:  a real `<button class="delete icon">` named by the `remove` text;  a click dispatches the
 *   cancelable `ui-remove` -- the label never removes itself, the page does.
 * - Inside a statistic (an owner of `label`, `PartContext`) it is that statistic's `.label` PART:  it renders
 *   `<div class="label" part="label">`, adopts `parts.css` after `label.css` and sets `:state(in-statistic)`.
 * - Host `aria-label` is forwarded to the root, so an icon-only or corner label has a name.
 ****************/
export class UILabel extends UIElement<typeof labelVocabulary> {
  @proto static vocabulary = labelVocabulary
  @proto static styles = { label: labelCSS, parts: partsCSS }

  /** Owner, when it's a statistic's label. */
  readonly context = new PartContext(this.host, this.vocabulary.noun)

  /** Light-DOM slot occupancy. */
  readonly slots = new SlotContent(this.host)

  /** Glyph of the `icon` shorthand. */
  readonly glyph = new IconGlyph(() => this.attrs.icon)

  /** Glyph of the delete button. */
  readonly deleteGlyph = new IconGlyph(() => (this.attrs.removable ? DELETE_ICON : undefined))

  /** Host `aria-label`, forwarded to the root. */
  readonly ariaLabel = new HostAttribute(this.host, ARIA_LABEL)

  ////////////////
  // ## Derived state
  ////////////////

  /** Has an icon (shorthand or `icon` slot)? */
  readonly hasIcon = createMemo(() => !!this.attrs.icon || this.slots.has(this.slot("icon")))

  /** Has text (default slot or `detail`)? */
  readonly hasText = createMemo(() => this.slots.has("") || !!this.attrs.detail)

  /** `image` attribute as a URL, or `undefined` when bare / boolean. */
  readonly imageSrc = createMemo(() => {
    const raw = this.props[this.definition.attribute("image").key]
    return typeof raw === "string" && !BOOLEAN_WORDS.has(raw.toLowerCase()) ? raw : undefined
  })

  isDisabled(): boolean {
    return this.attrs.disabled
  }

  protected extraClasses(): string | undefined {
    return this.hasIcon() && !this.hasText() ? ICON : undefined
  }

  protected hostStates() {
    return { active: this.attrs.active, disabled: this.attrs.disabled }
  }

  /** `parts.css` only while a statistic owns it. */
  protected sheetNames(): string[] {
    return this.context.ownerNoun() ? ["label", "parts"] : ["label"]
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <Show when={this.context.ownerNoun()} fallback={this.label()}>
        <div class={this.vocabulary.noun} part={this.part("label")}>
          <slot />
        </div>
      </Show>
    )
  }

  /** The standalone label box. */
  private label(): JSX.Element {
    return (
      <Dynamic
        component={this.attrs.href ? "a" : "span"}
        class={this.classes()}
        part={this.part("label")}
        href={this.attrs.disabled ? undefined : this.attrs.href}
        target={this.attrs.href ? this.attrs.target : undefined}
        aria-label={this.ariaLabel.get() ?? undefined}
        aria-disabled={this.attrs.disabled && this.attrs.href ? "true" : undefined}
        role={this.ariaLabel.get() && !this.attrs.href ? IMG : undefined}
      >
        <Show when={this.imageSrc()}>
          <img class={IMAGE} part={this.part("image")} src={this.imageSrc()} alt="" />
        </Show>
        <Show when={this.hasIcon()}>
          <span class={ICON} part={this.part("icon")}>
            <slot name={this.slot("icon")}>{this.glyph.svg()}</slot>
          </span>
        </Show>
        <slot />
        <Show when={this.attrs.detail}>
          <span class={DETAIL} part={this.part("detail")}>
            {this.attrs.detail}
          </span>
        </Show>
        <Show when={this.attrs.removable}>
          <button
            type="button"
            class={DELETE_CLASS}
            part={this.part("delete")}
            aria-label={this.text("remove")}
            disabled={this.attrs.disabled}
            onClick={this.onRemove}
          >
            {this.deleteGlyph.svg()}
          </button>
        </Show>
      </Dynamic>
    )
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /** Delete button:  announce;  the page removes the label (or cancels). */
  private readonly onRemove = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    this.emit("ui-remove", { originalEvent: event })
  }
}

/** Grammar words the element adds itself:  the icon box / icon-only class. */
const ICON = "icon"

/** Class of the `image` `<img>`. */
const IMAGE = "image"

/** Class of the `detail` shorthand box. */
const DETAIL = "detail"

/** Classes of the delete button. */
const DELETE_CLASS = "delete icon"

/** Glyph of the delete button (Fomantic's `delete icon`). */
const DELETE_ICON = "xmark"

/** Host attribute forwarded to the root. */
const ARIA_LABEL = "aria-label"

/** Role of a named, non-link label (an icon-only label is a picture of its name). */
const IMG = "img"

/** `image` values that mean "bare", not a URL. */
const BOOLEAN_WORDS = new Set(["", "true", "yes", "false", "no", "image"])
