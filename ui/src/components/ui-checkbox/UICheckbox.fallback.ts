import { E } from "spell-ui/core"
import { checkboxVocabulary } from "./UICheckbox.en"
import { radioVocabulary } from "./UIRadio.en"
import { type CheckPartName } from "./UICheckbox.types"

/****************
 * ### `CheckboxFallback`
 * The native fallback of `<ui-checkbox>` and `<ui-radio>`:  what they show when their component breaks,
 * so the chosen state and value are still submitted and validated with the form.
 *
 * - Its shadow DOM:  `<div part="checkbox" class="ui … checkbox">` holding a native `<input part="control">`
 *   and its `<label for part="label">` around the slot.
 *   A `<ui-radio>` gets `type="radio"`, and the `radio` class.
 * - Still a form control.  Every `change`:
 *   - sets `domElement.selected`
 *   - sets the DOM element's form value to what the box submits:  the DOM element's `chosenValue` /
 *     `unchosenValue` (class defaults included), else the `value` (default `on`) / `off-value` attributes
 *   - copies the input's validity onto the DOM element
 *   - sends a composed `ui-changed`.
 * - Its starting state is the DOM element's `selected` PROPERTY, else its `selected` / `checked` attributes.
 * - Its accessible name is the slotted text, else the DOM element's `aria-label`.
 ****************/
export class CheckboxFallback extends E.NativeFallback<typeof checkboxVocabulary> {
  @E.proto static vocabulary = checkboxVocabulary
  @E.proto static degraded = [
    "radio grouping across elements (each fallback radio is alone in its shadow root) and arrow keys",
    "`ui-changed` cannot be vetoed by re-setting `selected`",
    "`:state(invalid)`, form reset of the chosen state",
    "labels from `<label for>` (only `aria-label` names a fitted box)"
  ]

  /** The native input, once built, for `sync()`. */
  private input: HTMLInputElement | undefined

  protected override build() {
    const domElement = this.domElement as CheckDOMElement
    const isRadio = domElement.localName === radioVocabulary.tag
    const id = `${domElement.localName}-fallback-${++CheckboxFallback.counter}`
    const input = this.create("input", {
      id,
      type: isRadio ? "radio" : "checkbox",
      disabled: this.flag("disabled"),
      required: this.flag("required"),
      role: !isRadio && this.look ? "switch" : undefined
    })
    this.decorate(input, "control")
    input.checked = domElement.selected ?? (this.flag("selected") || domElement.hasAttribute("checked"))
    input.indeterminate = !isRadio && this.flag("indeterminate")
    const label = this.create("label", { for: id, part: LABEL_PART }, this.slot(this.attr("label")))
    const root = this.create("div", { class: this.classes(), part: ROOT_PART }, input, label)
    // a radio without a `slider` / `toggle` look says `radio` before its noun, as the component does
    if (isRadio && !this.look) root.className = root.className.replace(NOUN_AT_END, " radio checkbox")
    this.listen(input, "click", (event) => {
      if (this.flag("readonly")) event.preventDefault()
    })
    this.listen(input, "change", (event) => {
      domElement.selected = input.checked
      this.sync()
      const value = (input.checked ? undefined : this.unchosenValue()) ?? this.chosenValue()
      const detail = { selected: input.checked, value, originalEvent: event }
      this.send(this.vocabulary.events[0].name, detail)
    })
    this.input = input
    return [root]
  }

  /** What the box submits, chosen or not, and the input's validity. */
  protected override sync() {
    const { input } = this
    if (input) this.syncForm({ value: input.checked ? this.chosenValue() : this.unchosenValue(), control: input })
  }

  /** What the box submits while chosen:  the DOM element's `chosenValue`, else its `value`, else the native default. */
  private chosenValue(): string {
    return (this.domElement as CheckDOMElement).chosenValue ?? this.attr("value") ?? "on"
  }

  /**
   * What the box submits while unchosen:  the DOM element's `unchosenValue`, else its `off-value`;  a radio:  nothing.
   */
  private unchosenValue(): string | undefined {
    const domElement = this.domElement as CheckDOMElement
    if (domElement.localName === radioVocabulary.tag) return undefined
    return domElement.unchosenValue ?? this.attr("off-value")
  }

  /**
   * The counter behind the ids of fallback inputs.
   * - Static:  page-wide, so two fallbacks never share an id.
   */
  private static counter = 0

  /** The `appearance`:  `toggle`, `slider`. */
  private get look(): string | undefined {
    return this.attr("appearance")
  }
}

/**
 * What the fallback reads and writes of the DOM element (`DOMCheckElement`).
 * - All optional:  the element may not have upgraded.
 */
type CheckDOMElement = HTMLElement & {
  /** chosen now */
  selected?: boolean
  /** submitted while chosen */
  chosenValue?: string
  /** submitted while unchosen */
  unchosenValue?: string
}

/** The part of the root box. */
const ROOT_PART: CheckPartName = "checkbox"

/** The part of the `<label>`. */
const LABEL_PART: CheckPartName = "label"

/** The noun ending the class string, which a plain radio's `radio` goes before. */
const NOUN_AT_END = / checkbox$/
