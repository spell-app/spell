import { For } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { F } from "spell/ui/forms"
import { sidesVocabulary } from "./UISides.en"
import { SidesFallback } from "./UISides.fallback"

import sidesCSS from "./UISides.css?inline"

/****************
 * ### `DOMSidesElement`
 * The DOM element of `<ui-sides>`:  a form control's (`DOMFormControl`).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMSidesElement extends F.DOMFormControl<UISides> {}

/****************
 * ### `UISides`
 * The component behind `<ui-sides>`:  four lengths, top, left, right and bottom, for a margin or a padding
 * (epic `debut` P31).
 *
 * - Its shadow DOM:  `<div class="ui … sides" part="sides" role="group">`, holding one
 *   `<label class="side top" part="side">` per side shown, its faded letter (`part="letter"`) inside its native
 *   number box (`part="input"`).
 *   - All four:  a cross, top / left and right / bottom.  `sides="top bottom"`:  only those, in one row.
 * - Its `value` takes either form, and gives back the form it was given (`SidesValue`):
 *   - CSS's text, one to four numbers, top right bottom left:  `value="10 20 10 20"`
 *   - an object, `{ top, left, right, bottom }`, as the property or as JSON text in the attribute
 *     (text starting with `{`);  a side left out is empty
 * - `value` is controlled (`@controlled`):  a change sends `ui-changed` first;  a handler that sets `el.value` again wins.
 * - A form control:  it submits CSS's text of all four (an empty side `0`);  `required` wants one shown side set.
 *   A property editor's binding reads `value` itself, so it gets the form it gave.
 ****************/
export class UISides extends F.FormComponent<typeof sidesVocabulary> {
  @E.proto static vocabulary = sidesVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { sides: sidesCSS },
    Fallback: SidesFallback,
    DOMElement: DOMSidesElement
  } satisfies Partial<E.ElementSetup>

  /** Shows as invalid only once a person has interacted. */
  @E.proto static invalidShows: E.InvalidTiming = "once touched"

  onFormStateRestore(state: File | string | FormData | null) {
    if (typeof state === "string") this.value = state
  }

  ////////////////
  // ## The lengths
  ////////////////

  /** `value`:  set by the page, or edited;  either form (`SidesValue`). */
  @E.controlled("value") accessor value: SidesValue | undefined = undefined

  /** The four lengths, by side;  a side with none is missing. */
  get lengths(): SidesObject {
    return UISides.lengthsOf(this.value)
  }

  /** The sides it shows:  `sides`, else all four, in the order drawn. */
  get shownSides(): readonly Side[] {
    const asked = E.Converters.list(this.sides ?? "").filter((side): side is Side => SIDES.includes(side as Side))
    return asked.length ? SIDES.filter((side) => asked.includes(side)) : SIDES
  }

  /** Only two sides, across or up and down:  one row. */
  get isRow(): boolean {
    return this.shownSides.length < SIDES.length
  }

  /**
   * A person typed a length for `side`:  send `ui-changed` with the new value, in the form it was given,
   * then set it, unless a handler set it first.
   */
  @E.untracked
  edit(side: Side, text: string, originalEvent?: Event) {
    this.isTouched = true
    const length = text.trim() === "" ? undefined : Number(text)
    const next = UISides.withLength(this.value, side, Number.isFinite(length) ? length : undefined)
    this.requestChange("value", next, () => this.send("ui-changed", { value: next, originalEvent }))
  }

  ////////////////
  // ## Form
  ////////////////

  /** CSS's text of all four (an empty side `0`);  `null` while every side is empty. */
  get formValue(): E.FieldValue {
    return UISides.textOf(this.lengths)
  }

  /** Back to the `value` ATTRIBUTE. */
  onFormReset() {
    this.value = E.Converters.json<SidesValue>(this.attributes.value)
  }

  protected get validationLabel(): string | undefined {
    return this.labels.accessibleName ?? this.name
  }

  protected get validationAnchor(): HTMLElement | undefined {
    return this.inputs[0]
  }

  /** `row` while it shows two sides;  else the cross. */
  protected get extraClass(): string | undefined {
    return this.isRow ? ROW : undefined
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Its number boxes, as drawn. */
  private readonly inputs: HTMLInputElement[] = []

  render(): JSX.Element {
    return (
      <div
        class={this.rootClass}
        part={this.partForName("sides")}
        role="group"
        aria-label={this.labels.accessibleName}
        aria-invalid={this.isShownInvalid ? "true" : undefined}
      >
        <For each={this.shownSides}>{(side) => this.sideBox(side)}</For>
      </div>
    )
  }

  /** One side:  its letter inside its number box. */
  private sideBox(side: Side): JSX.Element {
    return (
      <label class={`${side} side`} part={this.partForName("side")}>
        <span class={LETTER} part={this.partForName("letter")} aria-hidden="true">
          {this.translationForKey(`${side}Letter`)}
        </span>
        <input
          ref={(input) => this.inputs.push(input)}
          type="number"
          part={this.partForName("input")}
          aria-label={this.translationForKey(side)}
          value={this.lengths[side] ?? ""}
          disabled={this.isDisabled}
          readonly={!!this.readonly}
          required={!!this.required}
          onChange={(event) => this.edit(side, event.currentTarget.value, event)}
        />
      </label>
    )
  }

  protected activateControl() {
    this.inputs[0]?.focus()
  }

  ////////////////
  // ## Statics:  the two forms of a value
  ////////////////

  /**
   * The lengths of `value`, by side:  an object (or JSON text) by its side names, other text as CSS's numbers
   * (one to four, top right bottom left).
   * - STATIC:  pure.
   */
  static lengthsOf(value: SidesValue | undefined): SidesObject {
    const given = typeof value === "string" ? E.Converters.json<SidesValue>(value) : value
    if (given && typeof given === "object") {
      const lengths: SidesObject = {}
      for (const side of SIDES) {
        const length = Number(given[side])
        if (given[side] != null && Number.isFinite(length)) lengths[side] = length
      }
      return lengths
    }
    const numbers = (given ?? "").trim().split(/\s+/).filter(Boolean).map(Number)
    if (!numbers.length || numbers.some((each) => !Number.isFinite(each))) return {}
    const [top, right = top, bottom = top, left = right] = numbers
    return { top, right, bottom, left }
  }

  /**
   * `value` with `side`'s length changed (`undefined`:  emptied), in the form `value` was given:
   * an object stays an object, text stays CSS's text.
   * - STATIC:  pure.
   */
  static withLength(value: SidesValue | undefined, side: Side, length: number | undefined): SidesValue {
    const lengths = { ...UISides.lengthsOf(value), [side]: length }
    if (length === undefined) delete lengths[side]
    if (UISides.isObjectForm(value)) return lengths
    return UISides.textOf(lengths) ?? ""
  }

  /** `value` was given as an object (or JSON text of one). */
  static isObjectForm(value: SidesValue | undefined): boolean {
    return typeof value === "object" || (typeof value === "string" && value.trim().startsWith("{"))
  }

  /** CSS's text of `lengths`, top right bottom left, an empty side `0`;  `null` while all are empty. */
  static textOf(lengths: SidesObject): string | null {
    if (CSS_ORDER.every((side) => lengths[side] === undefined)) return null
    return CSS_ORDER.map((side) => lengths[side] ?? 0).join(" ")
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UISides extends E.AttributeValues<typeof sidesVocabulary> {}

/** One side. */
export type Side = (typeof SIDES)[number]

/** Lengths by side, a side with none left out. */
export type SidesObject = Partial<Record<Side, number>>

/** A `<ui-sides>` value:  CSS's text (`"10 20 10 20"`), or lengths by side. */
export type SidesValue = string | SidesObject

/** The sides, in the order they're drawn:  top, then left and right, then bottom. */
const SIDES = ["top", "left", "right", "bottom"] as const

/** The sides in CSS's order. */
const CSS_ORDER = ["top", "right", "bottom", "left"] as const

/** Class words. */
const ROW = "row"
const LETTER = "letter"
