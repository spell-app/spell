import { E } from "spell/ui/core"
import { dialVocabulary } from "./UIDial.en"
import { DEFAULT_MAX, DEFAULT_MIN, DEFAULT_STEP } from "./UIDial.types"

/****************
 * ### `DialFallback`
 * The native fallback of `<ui-dial>`:  what it shows when its component breaks,
 * so the value is still chosen and submitted with the form.
 *
 * - Its shadow DOM:  a native `<input type="range" part="control">` in the root
 *   (`<div class="ui … dial" part="dial">`), then the `label`'s words.
 * - Still a form control.  `input` / `change`:
 *   - set the DOM element's form value
 *   - set `domElement.value`
 *   - send a composed `ui-moved` / `ui-changed`.
 * - Its starting value is the DOM element's `value` PROPERTY, else the attribute;
 *   `min` / `max` / `step` default to 0 / 100 / 1, as the dial's.
 * - Named by the DOM element's `aria-*` (copied onto the input), else its `label`.
 ****************/
export class DialFallback extends E.NativeFallback<typeof dialVocabulary> {
  @E.proto static vocabulary = dialVocabulary
  @E.proto static degraded = [
    "the ring, its arc, handle, disc and ticks (the browser's range input instead)",
    "the value written in the middle, `unit`, the wheel, vetoing by re-setting `value`, form reset"
  ]

  /** The native input, once built, for `sync()`. */
  private input?: HTMLInputElement

  protected override build() {
    const domElement = this.domElement as DialDOMElement
    const min = this.number("min", DEFAULT_MIN)
    const max = Math.max(min, this.number("max", DEFAULT_MAX))
    const label = this.attr("label") ?? undefined
    const input = this.create("input", {
      type: "range",
      min: String(min),
      max: String(max),
      step: String(this.number("step", DEFAULT_STEP) || "any"),
      disabled: this.flag("disabled"),
      "aria-readonly": this.flag("readonly") ? "true" : undefined
    })
    this.decorate(input, "control")
    if (label && !input.hasAttribute("aria-label")) input.setAttribute("aria-label", label)
    input.value = String(domElement.value ?? this.number("value", min))
    this.listen(input, "input", (event) => this.changed(event, "ui-moved"))
    this.listen(input, "change", (event) => this.changed(event, "ui-changed"))
    this.listen(input, "keydown", (event: KeyboardEvent) => {
      if (this.flag("readonly")) event.preventDefault()
    })
    this.listen(input, "pointerdown", (event) => {
      if (this.flag("readonly")) event.preventDefault()
    })
    this.input = input
    const words = label ? [this.create("div", { class: LABEL, part: LABEL, "aria-hidden": "true" }, label)] : []
    // the root takes no `aria-*`:  the input carries the DOM element's name
    return [this.create("div", { class: this.classes(), part: ROOT_PART }, input, ...words)]
  }

  /** The input moved:  update the DOM element, send event `name`. */
  private changed(originalEvent: Event, name: E.EventName<typeof dialVocabulary>) {
    const domElement = this.domElement as DialDOMElement
    domElement.value = Number(this.input!.value)
    this.sync()
    this.send(name, { value: domElement.value, originalEvent })
  }

  /** The value;  a range input is never invalid, so no validity. */
  protected override sync() {
    this.syncForm({ value: this.input?.value })
  }

  /** The DOM element's attribute `name` as a number, else `fallback`. */
  private number(name: E.AttributeNameOf<typeof dialVocabulary>, fallback: number): number {
    const value = Number(this.attr(name) ?? Number.NaN)
    return Number.isFinite(value) ? value : fallback
  }
}

/** What the fallback reads and writes of the DOM element:  optional, the element may not have upgraded. */
type DialDOMElement = HTMLElement & {
  /** the value, once set as a property */
  value?: number
}

/** The root's part. */
const ROOT_PART = "dial"

/** The label's class and part. */
const LABEL = "label"
