import { E } from "spell-ui/core"
import { iconPickerVocabulary } from "./UIIconPicker.en"

/****************
 * ### `IconPickerFallback`
 * The native fallback of `<ui-icon-picker>`:  what it shows when its component breaks,
 * so the icon's name is still typed in, validated and submitted with its form.
 *
 * - Its shadow DOM:  the field as a native text box, `<input class="ui … icon picker" part="field">`,
 *   holding the icon's NAME:  no glyphs, no grid.
 * - Still a form control.  Every `input` event:
 *   - sets `domElement.value`, and the DOM element's form value
 *   - copies the text box's validity onto the DOM element (`required`)
 *   - and `change` sends a composed `ui-changed`.
 * - Its starting value is the DOM element's `value` PROPERTY, else its attribute.
 * - Its accessible name is the DOM element's `aria-label`, else `placeholder`.
 ****************/
export class IconPickerFallback extends E.NativeFallback<typeof iconPickerVocabulary> {
  @E.proto static vocabulary = iconPickerVocabulary
  @E.proto static degraded = [
    "the glyphs, the search and the grid:  the icon's name is typed",
    "`:state(invalid)`, form reset of the value, labels from `<label for>`"
  ]

  /** The text box, once built, for `sync()`. */
  private control: HTMLInputElement | undefined

  protected override build() {
    const domElement = this.domElement as IconPickerDOMElement
    const placeholder = this.attr("placeholder")
    const control = this.create("input", {
      type: "text",
      class: this.classes(),
      placeholder,
      required: this.flag("required"),
      disabled: this.flag("disabled"),
      readonly: this.flag("readonly"),
      autocomplete: "off"
    })
    this.decorate(control, "field")
    this.nameFromPlaceholder(control)
    control.value = domElement.value ?? this.attr("value") ?? ""
    this.listen(control, "input", () => {
      domElement.value = control.value
      this.sync()
    })
    this.listen(control, "change", (originalEvent) => {
      const detail = { value: control.value, originalEvent }
      this.send("ui-changed", detail)
    })
    this.control = control
    return [control]
  }

  /** The text box's value (none while empty) and validity. */
  protected override sync() {
    const { control } = this
    if (control) this.syncForm({ value: control.value || undefined, control })
  }
}

/** What the fallback reads and writes of the DOM element:  `value` is optional, the element may not have upgraded. */
type IconPickerDOMElement = HTMLElement & {
  /** the icon's name, once set as a property */
  value?: string
}
