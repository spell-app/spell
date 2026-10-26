import type { JSX } from "@solidjs/web"

import { E, UI } from "spell-ui/core"
import { textareaVocabulary } from "./UITextarea.en"
import { InputFallback } from "./UIInput.fallback"
import { TextControl } from "./TextControl"
import type { CommonAttributes } from "./UIInput.types"

import inputCSS from "./UIInput.css?inline"

/****************
 * ### `UITextarea`
 * The component behind `<ui-textarea>`:  a text field of several lines.
 *
 * - Its shadow DOM:  `<div class="ui … input" part="input">` around a native `<textarea part="control">`.
 * - A form control like `<ui-input>` (see `TextControl`);  Enter types a new line, and never submits.
 * - Without `rows`, it takes the height of Fomantic's form textarea (`UIInput.css`).
 * - `grow` (epic `ui-gaps` P14;  Owen's standing rule:  every "tell me more" field grows with its text):
 *   - `rows` lines to start (one without it), taller as its text wraps, up to `max-rows` lines
 *     (else a third of the window), then it scrolls;  shorter again as text goes
 *   - the browser's own `field-sizing: content` where it has it (`UI.browser.supports.fieldSizing`);
 *     elsewhere it MEASURES, on every change of its value (`fitHeight()`)
 *   - NOT on a width change alone, where it measures:  a field narrowed under its text keeps its height until typed in
 ****************/
export class UITextarea extends TextControl<typeof textareaVocabulary> {
  @E.proto static vocabulary = textareaVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { input: inputCSS },
    Fallback: InputFallback
  } satisfies Partial<E.ElementSetup>

  protected get constraints(): Record<string, unknown> {
    return { required: this.required, minlength: this.minlength, maxlength: this.maxlength }
  }

  /** The lines it shows:  `rows`;  with `grow`, the lines it starts at, one without `rows`. */
  get visibleRows(): number | undefined {
    return this.grow ? (this.rows ?? 1) : this.rows
  }

  /** With `grow`:  the lines it starts at and stops at, for its sheet. */
  get growStyle(): JSX.CSSProperties | undefined {
    if (!this.grow) return undefined
    const style: JSX.CSSProperties = { "--_textarea-rows": String(this.visibleRows) }
    if (this.maxRows) style["--_textarea-max"] = `calc(${this.maxRows} * 1lh + var(--_textarea-chrome))`
    return style
  }

  /**
   * With `grow`, where the browser can't grow it (`field-sizing`):  its height measured again, on every change of its
   * value and its settings.
   */
  @E.onChange("value", "isReady", "grow", "rows", "maxRows")
  protected onGrowChanged() {
    this.fitHeight()
  }

  /**
   * As tall as its text, measured:  where the browser has no `field-sizing`.
   * - Its sheet caps it (`max-rows`, or a third of the window), and keeps `rows` lines at least.
   * - SIDE EFFECT:  writes the native control's inline height;  takes it off again without `grow`.
   */
  @E.untracked
  protected fitHeight() {
    const control = this.control
    if (!control) return
    if (!this.grow || UI.browser.supports.fieldSizing) {
      control.style.removeProperty("block-size")
      return
    }
    // the control may not show the new value yet:  this effect can run before `onValueChanged()`'s
    this.syncControl()
    control.style.blockSize = "auto"
    const borders = control.offsetHeight - control.clientHeight
    control.style.blockSize = `${control.scrollHeight + borders}px`
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("input")}>
        <textarea
          ref={(element) => (this.control = element)}
          class={this.grow ? GROW : undefined}
          style={this.growStyle}
          part={this.partForName("control")}
          rows={this.visibleRows}
          placeholder={this.placeholder}
          autocomplete={this.autocomplete as never}
          disabled={this.isDisabled}
          readonly={this.readonly}
          {...this.constraints}
          {...this.controlAria}
          {...this.staticControl}
          onInput={this.onInput}
          onChange={this.onChange}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
        />
      </div>
    )
  }
}

/** The native control's class with `grow`:  its sheet's growing rules. */
const GROW = "grow"

/** The vocabulary getters, typed;  `TextControl` types the shared ones, and owns `value`. */
export interface UITextarea extends Omit<
  E.AttributeValues<typeof textareaVocabulary>,
  keyof CommonAttributes | "value"
> {}
