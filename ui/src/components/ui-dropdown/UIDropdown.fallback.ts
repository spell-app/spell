import { E, UIT } from "spell-ui/core"
import { dropdownVocabulary } from "./UIDropdown.en"
import { SlottedItems } from "./SlottedItems"

/****************
 * ### `DropdownFallback`
 * The native fallback of `<ui-dropdown>`:  what it shows when its component breaks,
 * so the chosen value(s) are still submitted and validated with the form.
 *
 * - Its shadow DOM:  a native `<select part="trigger select" class="ui … dropdown">`, `multiple` when `multiple`.
 * - The options come from the DOM element's light-DOM `<ui-item>`s (`header` => `<optgroup>`, `divider` skipped),
 *   read as the component reads them (`SlottedItems`), then its `options` PROPERTY.
 * - The chosen values come from the `value` property, else the attribute (a comma / space list).
 * - A single select starts with an empty `<option>` (the `placeholder` text) when nothing is chosen,
 *   so the browser doesn't silently choose the first option.
 * - On `change`:  the form value follows (`FormData` for `multiple`), `domElement.value` is set,
 *   and a composed `ui-changed` is sent.
 *   The form value is also set on the first render, so the form submits without a change.
 * - Its accessible name is the DOM element's `aria-label`, else `placeholder`.
 ****************/
export class DropdownFallback extends E.NativeFallback<typeof dropdownVocabulary> {
  @E.proto static vocabulary = dropdownVocabulary
  @E.proto static degraded = [
    "`search` (typing only jumps to a matching option)",
    "`allow-additions`, `clearable`, `max-selections`",
    "multiple-value labels (a native multi-select list)",
    "option `icon` / `image` / `flag` / `description`",
    "keyboard pattern:  the native `<select>`'s, not the combobox listbox",
    "invoker commands, `ui-opening` / `ui-closing` / `ui-searched` / `ui-added` / `ui-removed`",
    "`readonly` is a disabled select (the value still submits)"
  ]

  /** The native select, once built, for `sync()`. */
  private select: HTMLSelectElement | undefined

  protected override build() {
    const domElement = this.domElement as DropdownDOMElement
    const isMultiple = this.flag("multiple")
    const placeholder = this.attr("placeholder")
    const select = this.create("select", {
      class: this.classes(),
      name: this.attr("name"),
      multiple: isMultiple,
      required: this.flag("required"),
      disabled: this.flag("disabled") || this.flag("readonly"),
      "aria-readonly": this.flag("readonly") ? "true" : undefined
    })
    this.decorate(select, "trigger", SELECT_PART)
    this.nameFromPlaceholder(select)

    const chosen = new Set(SlottedItems.valuesIn(domElement.value ?? this.attr("value"), isMultiple))
    const entries = [...SlottedItems.itemsOf(domElement).map(SlottedItems.entryOf), ...(domElement.options ?? [])]
    const picked = entries.filter(
      (entry): entry is E.MenuOption => !("type" in entry) && (!!entry.selected || chosen.has(entry.value))
    )
    if (!isMultiple && !picked.length) {
      select.append(this.create("option", { value: "", selected: true }, placeholder ?? ""))
    }

    let group: HTMLElement = select
    for (const entry of entries) {
      if (!("type" in entry)) {
        const option = this.create("option", { value: entry.value, disabled: entry.disabled }, entry.text)
        option.selected = picked.includes(entry) && (isMultiple || entry === picked[0])
        group.append(option)
      } else if (entry.type === UIT.HEADER) select.append((group = this.create("optgroup", { label: entry.text })))
    }

    this.listen(select, "change", (event) => {
      this.sync()
      const value = this.chosenValue()
      domElement.value = value
      this.send(CHANGE_EVENT, { value, originalEvent: event })
    })
    this.select = select
    return [select]
  }

  /** The select's value, and its validity (`required`). */
  protected override sync() {
    const { select } = this
    if (select) this.syncForm({ value: this.chosenValue(), control: select })
  }

  /** What the select has chosen:  a list when `multiple`, else one value (`""` for none). */
  private chosenValue(): UIT.DropdownValue {
    const select = this.select!
    return select.multiple ? [...select.selectedOptions].map((option) => option.value) : select.value
  }
}

/** What the fallback reads and writes of the DOM element:  all optional, the element may not have upgraded. */
type DropdownDOMElement = HTMLElement & {
  /** the chosen value(s), once set as a property */
  value?: UIT.DropdownValue
  /** the `options` property, once set */
  options?: readonly E.MenuOption[]
}

/** The select's second part name, beside the vocabulary's `trigger`:  `::part(select)` styles the native one. */
const SELECT_PART = "select"

/** The event the select's `change` becomes. */
const CHANGE_EVENT: E.EventName<typeof dropdownVocabulary> = "ui-changed"
