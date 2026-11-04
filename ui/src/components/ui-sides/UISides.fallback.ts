import { E } from "spell/ui/core"
import { sidesVocabulary } from "./UISides.en"

/****************
 * ### `SidesFallback`
 * The native fallback of `<ui-sides>`:  what it shows when its component breaks,
 * so its lengths are still edited and submitted with the form.
 *
 * - Its shadow DOM:  four plain number inputs, named by their side (`aria-label`), in a row.
 * - Still a form control:  each change sets the DOM element's form value to CSS's text (`top right bottom left`).
 * - Its starting value is the `value` attribute's text;  an object is read by its side names.
 ****************/
export class SidesFallback extends E.NativeFallback<typeof sidesVocabulary> {
  @E.proto static vocabulary = sidesVocabulary
  @E.proto static degraded = ["the side letters and the cross layout", "`sides`", "the form the value was given in"]

  /** The four inputs, top, right, bottom, left. */
  private inputs: HTMLInputElement[] = []

  protected override build() {
    const lengths = SidesFallback.lengthsOf(this.attr("value"))
    this.inputs = CSS_ORDER.map((side, index) => {
      const input = this.create("input", {
        type: "number",
        part: "input",
        "aria-label": side,
        disabled: this.flag("disabled"),
        readonly: this.flag("readonly")
      })
      input.value = lengths[index] ?? ""
      this.listen(input, "change", () => this.sync())
      return input
    })
    const box = this.create("div", { class: this.classes() }, ...this.inputs)
    return [this.decorate(box, "sides")]
  }

  /** CSS's text of the four, as the form value. */
  protected override sync() {
    const text = this.inputs.map((input) => input.value || "0").join(" ")
    if (this.inputs.length) this.syncForm({ value: text, control: this.inputs[0] })
  }

  /** The four lengths of `text`, top right bottom left:  CSS's numbers, or JSON by side names. */
  private static lengthsOf(text: string | undefined): string[] {
    if (!text) return []
    if (text.trim().startsWith("{")) {
      try {
        const sides = JSON.parse(text) as Record<string, number | undefined>
        return CSS_ORDER.map((side) => (sides[side] == null ? "" : String(sides[side])))
      } catch {
        return []
      }
    }
    const numbers = text.trim().split(/\s+/)
    const [top, right = top, bottom = top, left = right] = numbers
    return [top, right, bottom, left].map((each) => each ?? "")
  }
}

/** The sides in CSS's order. */
const CSS_ORDER = ["top", "right", "bottom", "left"] as const
