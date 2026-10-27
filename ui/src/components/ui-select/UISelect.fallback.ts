import { E, UIT } from "spell/ui/core"
import { SlottedItems } from "spell/ui/components/ui-dropdown/SlottedItems"
import { selectVocabulary } from "./UISelect.en"
import { DIVIDER, PLACEHOLDER, type Vocabulary } from "./UISelect.types"

/****************
 * ### `SelectFallback`
 * The native fallback of `<ui-select>`:  what it shows when its component breaks,
 * so the chosen value(s) are still submitted and validated with the form.
 *
 * - Its shadow DOM:  the plain native `<select part="select" class="ui … select">`.
 *   It's what `<ui-select>` already is in a browser without the customizable select, minus the reactive model.
 * - The options come from the DOM element's light-DOM `<ui-item>`s (`header` => `<optgroup>`, `divider` => `<hr>`),
 *   read as the component reads them (`SlottedItems`), then its `options` PROPERTY.
 * - The chosen values come from the `value` property, else the attribute (a comma / space list),
 *   else the `selected` items.
 * - A single select starts with an empty `<option>` (the `placeholder` text) when nothing is chosen,
 *   as the component does.
 * - On `change`:  the form value follows (`FormData` for `multiple`), `domElement.value` is set,
 *   and a composed `ui-changed` is sent.
 * - The form value is also set on the first render, so the form submits without a change.
 * - `readonly`:  `aria-readonly`, and a change is undone (nothing sent), as the component does.
 * - Its accessible name is the DOM element's `aria-label`, else `placeholder`.
 ****************/
export class SelectFallback extends E.NativeFallback<Vocabulary> {
  @E.proto static vocabulary = selectVocabulary
  @E.proto static degraded = [
    "the customizable picker:  option icons and images (flags and descriptions stay, as text)",
    "a `<label for>` naming the element (use `aria-label`)",
    "`:state(invalid)`, `:state(customizable)`",
    "vetoing a change by re-setting `value` in a `ui-changed` handler"
  ]

  /** The native select, once built, for `sync()`. */
  private select: HTMLSelectElement | undefined

  protected override build() {
    const domElement = this.domElement as SelectDOMElement
    const isMultiple = this.flag("multiple")
    const isRequired = this.flag("required")
    const placeholder = this.attr("placeholder")
    const select = this.create("select", {
      class: this.classes(),
      multiple: isMultiple,
      required: isRequired,
      disabled: this.flag("disabled"),
      "aria-readonly": this.flag("readonly") ? "true" : undefined
    })
    this.decorate(select, "select")
    this.nameFromPlaceholder(select)

    const entries = [...SlottedItems.itemsOf(domElement).map(SlottedItems.entryOf), ...(domElement.options ?? [])]
    const chosen = this.chosen(domElement, entries)
    if (!isMultiple && (placeholder !== undefined || !chosen.size)) {
      const empty = this.create(
        "option",
        {
          value: "",
          class: PLACEHOLDER,
          part: PLACEHOLDER_PART,
          disabled: isRequired && placeholder !== undefined
        },
        placeholder ?? ""
      )
      empty.selected = !chosen.size
      select.append(empty)
    }

    let group: HTMLElement = select
    for (const entry of entries) {
      if (!("type" in entry)) {
        const option = this.create(
          "option",
          { value: entry.value, disabled: entry.disabled, class: UIT.ITEM, part: OPTION_PART },
          SelectFallback.optionText(entry)
        )
        option.selected = chosen.has(entry.value)
        group.append(option)
      } else if (entry.type === UIT.HEADER) {
        select.append((group = this.create("optgroup", { label: entry.text, part: GROUP_PART })))
      } else {
        select.append(this.create("hr", { class: DIVIDER }))
        group = select
      }
    }

    // `readonly`:  a change is undone, as the component does (a native `<select>` has no `readonly` of its own)
    let shown = [...select.options].map((option) => option.selected)
    this.listen(select, "change", (event) => {
      if (this.flag("readonly")) {
        for (const [index, option] of [...select.options].entries()) option.selected = shown[index]!
        return
      }
      shown = [...select.options].map((option) => option.selected)
      this.sync()
      const value = this.chosenValue()
      domElement.value = value
      this.send(CHANGE_EVENT, { value, originalEvent: event })
    })
    this.select = select
    return [select]
  }

  /** The chosen values (none while nothing is), and "value missing" when `required` and nothing is chosen. */
  protected override sync() {
    const { select } = this
    if (!select) return
    const values = this.chosenValues()
    const value = !values.length ? undefined : select.multiple ? values : values[0]
    this.syncForm({ value, control: select, valueMissing: this.flag("required") && !values.length })
  }

  /** The values the DOM element says are chosen:  the `value` property, else the attribute, else `selected` items. */
  private chosen(domElement: SelectDOMElement, entries: readonly E.MenuEntry[]): Set<string> {
    const isMultiple = this.flag("multiple")
    const value = domElement.value ?? this.attr("value")
    const given = value != null && value !== "" ? value : SlottedItems.selectedValueIn(entries, isMultiple)
    return new Set(SlottedItems.valuesIn(given, isMultiple))
  }

  /** What the select has chosen, the empty first option left out:  a list when `multiple`, else one value. */
  private chosenValue(): UIT.SelectValue {
    const values = this.chosenValues()
    return this.select!.multiple ? values : (values[0] ?? "")
  }

  /** The chosen options' values, the empty first option left out. */
  private chosenValues(): string[] {
    return [...this.select!.selectedOptions].map((option) => option.value).filter((value) => value !== "")
  }

  /**
   * An option's text as a plain select shows it:  its flag's emoji, its text, then its description.
   * - Static:  pure, it needs no instance.
   */
  private static optionText(option: E.MenuOption): string {
    const flag = option.flag as string | undefined
    const description = option.description ? ` ${option.description}` : ""
    return [flag ? UIT.Flags.emojiFor(flag) || flag : "", option.text, description].join("")
  }
}

/** What the fallback reads and writes of the DOM element:  all optional, the element may not have upgraded. */
type SelectDOMElement = HTMLElement & {
  /** the chosen value(s), once set as a property */
  value?: UIT.SelectValue
  /** the `options` property, once set */
  options?: readonly E.MenuOption[]
}

/** The event the select's `change` becomes. */
const CHANGE_EVENT: E.EventName<Vocabulary> = "ui-changed"

/** The part of the empty first option. */
const PLACEHOLDER_PART: E.PartName<Vocabulary> = "placeholder"

/** The part of each `<optgroup>`. */
const GROUP_PART: E.PartName<Vocabulary> = "group"

/** The part of each `<option>`. */
const OPTION_PART: E.PartName<Vocabulary> = "option"
