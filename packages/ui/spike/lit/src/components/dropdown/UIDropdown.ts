import { html, nothing, type PropertyValues, type TemplateResult } from "lit"
import { state } from "lit/decorators.js"
import { ifDefined } from "lit/directives/if-defined.js"
import { live } from "lit/directives/live.js"
import { repeat } from "lit/directives/repeat.js"

import { proto } from "$/util"
import { Converters } from "$/vocabulary"
import { type FieldValue, type MenuAddition, type MenuOption, MenuOptions, Shorthand } from "$/elements"
import type { OverlayEntry } from "$/runtime"
import { buttonVocabulary } from "$/components/button/button.vocabulary.en"
import { dropdownVocabulary } from "$/components/dropdown/dropdown.vocabulary.en"
import {
  DROPDOWN_ANCHOR_PROPERTY,
  type DropdownChangeDetail,
  type DropdownItemDetail,
  type DropdownOpenDetail,
  type DropdownOptions,
  type DropdownSearchDetail,
  type DropdownValue
} from "$/components/components.types"
import { FormElement, IconRenderer, UIElement } from "../../elements"

import { type MenuEntry, UIItem } from "./UIItem"

import buttonCSS from "$/components/button/button.css?inline"
import dropdownCSS from "$/components/dropdown/dropdown.css?inline"

/****************
 * ### `<ui-dropdown>`
 * Combobox + listbox, in the markup contract of `dropdown.css`:  labels, `input.search`, `.sizer`,
 * `button.trigger`, `.text`, `button.remove.icon`, `.dropdown.icon`, then `.menu[role=listbox][popover]`.
 * - Model:  slotted `<ui-item>`s (read from light DOM on `slotchange` / `MutationObserver`) then the `options`
 *   property, filtered through `MenuOptions` (`excludeSelected` => `filter` => `withAdditions`) per keystroke.
 * - Menu:  `popover="manual"`, anchor-positioned (`--ui-dropdown-anchor` set inline to a per-instance ident),
 *   registered with `UI.overlays` for Escape / outside click.  Items render only while open, keyed by value.
 * - Controlled:  `value` and `open` change through `transition()` -- `ui-change` / `ui-open` / `ui-close`
 *   first;  a cancelled event or a host write from the handler wins.
 * - Form-associated (`FormElement`):  `multiple` submits one entry per value.
 * - Keyboard:  APG combobox.  Select-only (`button.trigger`):  arrows / Home / End / PageUp / PageDown,
 *   Enter / Space choose, type-ahead.  Editable (`search`):  typing filters, arrows move, Enter chooses,
 *   Backspace on an empty query removes the last label.  Escape comes from `UI.overlays`.
 ****************/
export class UIDropdown extends FormElement.for<
  typeof FormElement,
  typeof dropdownVocabulary,
  { value: DropdownValue | undefined; options: DropdownOptions | undefined }
>(dropdownVocabulary) {
  @proto static delegatesFocus = true
  @proto static sheets = [
    [buttonVocabulary.noun, buttonCSS],
    [dropdownVocabulary.noun, dropdownCSS]
  ] as const

  /** Search query (`search`). */
  @state() accessor query = ""

  /** Keyboard-highlighted index into `visible.options`, `-1` for none. */
  @state() accessor highlighted = -1

  /** Entries read from child `<ui-item>`s. */
  @state() accessor entries: readonly MenuEntry[] = []

  /** Options created by `allow-additions`, so a chosen addition keeps its text. */
  private added: MenuOption[] = []

  /** Every option, in order:  items, then `options`, then additions. */
  private all: MenuOptions = new MenuOptions()

  /** `all` by value. */
  private byValue = new Map<string, MenuOption>()

  /** Stable id suffix per option, for `aria-activedescendant`. */
  private ordinals = new Map<MenuOption, number>()

  /** What the menu lists right now. */
  private visible: MenuOptions = new MenuOptions()

  /** Value at first render, for `formResetCallback()`. */
  private defaultValue: DropdownValue | undefined

  /** Ids, assigned on first render (the runtime is in by then). */
  private ids?: { anchor: string; menu: string; text: string }

  /** Type-ahead buffer and its reset timer. */
  private typed = ""
  private typedTimer?: ReturnType<typeof setTimeout>

  /** Items (and slotted parts) changed. */
  private readonly observer = new MutationObserver(() => this.readItems())

  /** icon templates */
  private readonly icons = new IconRenderer(this)

  /** `UI.overlays` entry while open. */
  private readonly overlay: OverlayEntry = {
    element: this,
    kind: "popover",
    restoreFocus: false,
    onDismiss: () => this.closeMenu()
  }

  constructor() {
    super()
    this.addEventListener("focusout", this.onFocusOut)
  }

  /** Also watch the host's `aria-label`, used as the combobox's name. */
  static override get observedAttributes() {
    return [...super.observedAttributes, ARIA_LABEL]
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name === ARIA_LABEL) this.requestUpdate()
    else super.attributeChangedCallback(name, old, value)
  }

  override connectedCallback() {
    super.connectedCallback()
    this.observer.observe(this, { childList: true, subtree: true, attributes: true, characterData: true })
    this.readItems()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.observer.disconnect()
    UIElement.runtime?.overlays.close(this.overlay)
  }

  ////////////////
  // ## Values
  ////////////////

  /** Chosen values as an array, whatever shape `value` has. */
  get values(): string[] {
    const { value } = this
    if (Array.isArray(value)) return [...(value as readonly string[])]
    if (!value) return []
    return this.multiple ? Converters.list(value) : [value]
  }

  /** Option for `value`, including additions. */
  optionFor(value: string): MenuOption | undefined {
    return this.byValue.get(value)
  }

  /** Disabled by attribute or by an ancestor fieldset. */
  private get locked(): boolean {
    return this.isDisabled || this.readonly
  }

  protected override formValue(): FieldValue {
    return this.multiple ? this.values : (this.values[0] ?? "")
  }

  protected override validationAnchor(): HTMLElement | undefined {
    return this.combobox() ?? undefined
  }

  override formResetCallback() {
    this.value = this.defaultValue
    this.query = ""
  }

  ////////////////
  // ## Model
  ////////////////

  /** Re-read child items. */
  private readItems() {
    const entries: MenuEntry[] = []
    for (const child of this.children) {
      if (child.slot) continue
      const entry = UIItem.entryOf(child)
      if (entry) entries.push(entry)
    }
    this.entries = entries
  }

  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    if (changed.has("entries") || changed.has("options")) this.buildModel()
    if (changed.has("open") && !this.open) {
      this.query = ""
      this.highlighted = -1
    }
    this.visible = this.filtered()
    if (changed.has("open") && this.open && this.highlighted < 0) this.highlighted = this.defaultHighlight()
    if (this.highlighted >= this.visible.length) this.highlighted = this.visible.length - 1
    this.setState("open", this.open)
    this.setState("disabled", this.isDisabled)
    this.setState("loading", this.loading)
    this.setState("fluid", this.fluid)
  }

  /** Merge items, `options` and additions;  chosen items become the value if nothing else set one. */
  private buildModel() {
    const options: MenuOption[] = []
    for (const entry of this.entries) if (entry.option) options.push(entry.option)
    options.push(...(this.options ?? []), ...this.added)
    this.all = new MenuOptions(options)
    this.byValue = new Map(options.map((option) => [option.value, option]))
    this.ordinals = new Map(options.map((option, index) => [option, index]))
    if (!this.values.length) {
      const chosen = options.filter((option) => option.selected).map((option) => option.value)
      if (chosen.length) this.value = this.multiple ? chosen : chosen[0]
    }
  }

  /** `all` minus chosen labels, filtered by the query, plus the addition. */
  private filtered(): MenuOptions {
    let list = this.multiple ? this.all.excludeSelected(this.values) : this.all
    list = list.filter(this.query, { minCharacters: this.minCharacters })
    return list.withAdditions(this.query, { allowAdditions: this.allowAdditions, additionLabel: "" })
  }

  /** Highlight on open:  the chosen option, else the first enabled one. */
  private defaultHighlight(): number {
    const chosen = this.multiple ? -1 : this.visible.options.findIndex((option) => option.value === this.values[0])
    return chosen >= 0 ? chosen : this.visible.nextEnabledIndex(-1, 1)
  }

  ////////////////
  // ## Rendering
  ////////////////

  protected override render() {
    const ui = UIElement.runtime
    this.ids ??= ui
      ? { anchor: `--${ui.ids.next(ANCHOR_PREFIX)}`, menu: ui.ids.next(MENU_PREFIX), text: ui.ids.next(TEXT_PREFIX) }
      : undefined
    const ids = this.ids
    const classes = this.classes(undefined, { disabled: this.isDisabled })
    return html`<div
        class=${classes}
        style=${ids ? `${DROPDOWN_ANCHOR_PROPERTY}: ${ids.anchor}` : nothing}
        @click=${this.onRootClick}
      >
        ${this.multiple ? this.renderLabels() : nothing}${this.renderCombobox()}${
          this.labeled
            ? html`<span class="icon" part=${this.partName("icon")}>${this.icons.template(this.iconName())}</span>`
            : nothing
        }${this.renderText()}${
          this.clearable && this.values.length
            ? html`<button
                class="remove icon"
                part=${this.partName("clear")}
                type="button"
                tabindex="-1"
                aria-label=${this.t("clear")}
                @click=${this.onClear}
              ></button>`
            : nothing
        }<span class="dropdown icon" part=${this.partName("icon")}
          >${this.slotted("icon").length ? html`<slot name=${this.slotName("icon")}></slot>` : nothing}</span
        >${this.renderMenu()}
      </div>
      <slot hidden @slotchange=${this.onItemsSlotChange}></slot>`
  }

  /** `input.search` (+ `.sizer`) or `button.trigger`:  the combobox. */
  private renderCombobox() {
    const ids = this.ids
    const active =
      this.open && this.highlighted >= 0 ? this.optionId(this.visible.options[this.highlighted]) : undefined
    const name = this.accessibleName()
    if (this.search) {
      return html`<input
          class="search"
          part=${this.partName("search")}
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded=${String(this.open)}
          aria-controls=${ifDefined(ids?.menu)}
          aria-activedescendant=${ifDefined(active)}
          aria-label=${ifDefined(name)}
          aria-labelledby=${ifDefined(name ? undefined : ids?.text)}
          aria-required=${ifDefined(this.required ? "true" : undefined)}
          aria-busy=${ifDefined(this.loading ? "true" : undefined)}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readonly}
          .value=${live(this.query)}
          @input=${this.onInput}
          @keydown=${this.onKeyDown}
        />${this.multiple ? html`<span class="sizer" aria-hidden="true">${this.query}</span>` : nothing}`
    }
    return html`<button
      class="trigger"
      part=${this.partName("trigger")}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded=${String(this.open)}
      aria-controls=${ifDefined(ids?.menu)}
      aria-activedescendant=${ifDefined(active)}
      aria-label=${ifDefined(name)}
      aria-labelledby=${ifDefined(name ? undefined : ids?.text)}
      aria-required=${ifDefined(this.required ? "true" : undefined)}
      aria-readonly=${ifDefined(this.readonly ? "true" : undefined)}
      aria-busy=${ifDefined(this.loading ? "true" : undefined)}
      ?disabled=${this.isDisabled}
      @click=${this.onTriggerClick}
      @keydown=${this.onKeyDown}
    ></button>`
  }

  /** Chosen values as removable labels (`multiple`). */
  private renderLabels() {
    return repeat(
      this.values,
      (value) => value,
      (value) => {
        const text = this.optionFor(value)?.text ?? value
        return html`<span class="ui label" part=${this.partName("label")}
          >${text}<button
            class="delete icon"
            type="button"
            tabindex="-1"
            aria-label=${`${this.t("clear")} ${text}`}
            @click=${(event: MouseEvent) => this.removeValue(value, event)}
          ></button
        ></span>`
      }
    )
  }

  /**
   * `.text`:  current value (with its icon / image / flag), else `text`, else the placeholder (`default`).
   * - `multiple` always shows the placeholder here, as Fomantic:  CSS hides it behind the labels.
   * - HACK: the content is NOT fallback content of the `trigger` slot (`dropdown.css` sizes
   *   `.text > img` / `.text > .icon`, which fallback content inside `<slot>` never matches);  the slot is
   *   rendered only when something is slotted into it.
   */
  private renderText() {
    const option = this.multiple ? undefined : this.optionFor(this.values[0] ?? "")
    const empty = !this.values.length
    const placeholder = this.multiple || (empty && this.text === undefined)
    const filtered = this.search && this.query !== ""
    const classes = `${placeholder ? "default " : ""}${filtered ? "filtered " : ""}text`
    const content = placeholder
      ? (this.placeholder ?? "")
      : option
        ? html`${this.renderDecorations(option)}${option.text}`
        : (this.text ?? this.values[0])
    const slotted = this.slotted("trigger").length > 0
    return html`<span class=${classes} part=${this.partName("text")} id=${ifDefined(this.ids?.text)}
      >${slotted ? html`<slot name=${this.slotName("trigger")}></slot>` : content}</span
    >`
  }

  /** The listbox popover;  items only while open (or when `simple` keeps it in the page). */
  private renderMenu() {
    const shown = this.open || this.simple
    const classes = this.direction === DIRECTION_LEFT ? "left menu" : "menu"
    return html`<div
      class=${classes}
      role="listbox"
      part=${this.partName("menu")}
      id=${ifDefined(this.ids?.menu)}
      popover=${this.simple ? nothing : "manual"}
      aria-multiselectable=${ifDefined(this.multiple ? "true" : undefined)}
      aria-label=${ifDefined(this.accessibleName())}
      @mousedown=${this.onMenuMouseDown}
      @click=${this.onMenuClick}
    >
      <slot name=${this.slotName("header")}></slot>${shown ? this.renderRows() : nothing}${
        shown && !this.visible.length
          ? html`<div class="message" role="option" aria-disabled="true" aria-selected="false">
              ${this.noResultsText ?? this.t("noResults")}
            </div>`
          : nothing
      }
    </div>`
  }

  /** Items, plus headers / dividers while nothing filters them. */
  private renderRows() {
    const rows: Row[] = []
    const indexes = new Map<MenuOption, number>()
    this.visible.options.forEach((option, index) => indexes.set(option, index))
    if (this.query) {
      for (const [index, option] of this.visible.options.entries()) rows.push({ key: option.value, option, index })
    } else {
      const addition = this.visible.addition
      if (addition) rows.push({ key: ADDITION_KEY, option: addition, index: indexes.get(addition)! })
      for (const [position, entry] of this.entries.entries()) {
        if (entry.option) {
          const index = indexes.get(entry.option)
          if (index !== undefined) rows.push({ key: entry.option.value, option: entry.option, index })
        } else rows.push({ key: `${entry.type}:${position}`, entry })
      }
      for (const option of [...(this.options ?? []), ...this.added]) {
        const index = indexes.get(option)
        if (index !== undefined) rows.push({ key: option.value, option, index })
      }
    }
    return repeat(
      rows,
      (row) => row.key,
      (row) => (row.option ? this.renderOption(row.option, row.index!) : this.renderEntry(row.entry!))
    )
  }

  /** One `.item[role=option]`. */
  private renderOption(option: MenuOption | MenuAddition, index: number): TemplateResult {
    const addition = "addition" in option
    const chosen = !addition && this.values.includes(option.value)
    const highlight = index === this.highlighted
    const classes = `${chosen ? "active " : ""}${highlight ? "selected " : ""}${option.disabled ? "disabled " : ""}${addition ? "addition " : ""}item`
    return html`<div
      class=${classes}
      role="option"
      part=${this.partName("item")}
      id=${this.optionId(option)}
      data-index=${index}
      aria-selected=${chosen ? "true" : "false"}
      aria-disabled=${ifDefined(option.disabled ? "true" : undefined)}
    >
      ${addition ? this.renderAddition(option.value) : this.renderOptionContent(option)}
    </div>`
  }

  /** Icon / image / flag, description, then the text with `<mark>`ed matches. */
  private renderOptionContent(option: MenuOption) {
    const description = option.description ? html`<span class="description">${option.description}</span>` : nothing
    return html`${this.renderDecorations(option)}${description}<span class="text"
        >${this.query ? this.highlight(option) : option.text}</span
      >`
  }

  /** `.icon`, `img.image` and `.flag` before an option's text. */
  private renderDecorations(option: MenuOption) {
    const icon = Shorthand.resolve(option.icon as never, Shorthand.map.name)?.name
    const image = Shorthand.resolve(option.image as never, Shorthand.map.src)?.src
    const flag = typeof option.flag === "string" ? UIDropdown.flagEmoji(option.flag) : undefined
    return html`${typeof icon === "string" ? html`<span class="icon">${this.icons.template(icon)}</span>` : nothing}${
      typeof image === "string" ? html`<img class="ui avatar image" src=${image} alt="" />` : nothing
    }${flag ? html`<span class="flag">${flag}</span>` : nothing}`
  }

  /** "Add <b>query</b>", from `addition-text` or the `addItem` text. */
  private renderAddition(value: string) {
    const template = this.additionText ?? this.t("addItem")
    const [before, after = ""] = template.split(VALUE_PLACEHOLDER)
    return html`${before}<b>${value}</b>${after}`
  }

  /** A header or divider. */
  private renderEntry(entry: MenuEntry) {
    if (entry.type === DIVIDER) return html`<hr class="divider" role="none" />`
    return html`<div class="header" role="presentation">${entry.text}</div>`
  }

  /** `option.text` with every matched range in `<mark>`. */
  private highlight(option: MenuOption) {
    const ranges = this.visible.highlights(option, this.query)
    if (!ranges.length) return option.text
    const parts: (string | TemplateResult)[] = []
    let at = 0
    for (const [start, end] of ranges) {
      parts.push(option.text.slice(at, start), html`<mark>${option.text.slice(start, end)}</mark>`)
      at = end
    }
    parts.push(option.text.slice(at))
    return parts
  }

  protected override updated(changed: PropertyValues) {
    super.updated(changed)
    if (this.defaultValue === undefined && !this.hasUpdatedOnce) {
      this.hasUpdatedOnce = true
      this.defaultValue = this.value
    }
    if (changed.has("open")) this.syncPopover()
    if (changed.has("highlighted") && this.open) {
      this.renderRoot.querySelector(".menu > .selected.item")?.scrollIntoView({ block: "nearest" })
    }
  }

  /** First `updated()` seen, so `defaultValue` is captured once. */
  private hasUpdatedOnce = false

  /** Show / hide the popover and (un)register with `UI.overlays` to match `open`. */
  private syncPopover() {
    const menu = this.menu()
    const ui = UIElement.runtime
    if (!menu || !ui || this.simple) return
    if (this.open && this.isConnected) {
      if (!menu.matches(":popover-open")) menu.showPopover()
      ui.overlays.open(this.overlay)
    } else {
      if (menu.matches(":popover-open")) menu.hidePopover()
      ui.overlays.close(this.overlay)
    }
  }

  ////////////////
  // ## Actions
  ////////////////

  /** Open, unless `ui-open` is cancelled. */
  openMenu(originalEvent?: Event) {
    if (this.open || this.locked) return
    const detail: DropdownOpenDetail = { open: true, originalEvent }
    this.transition("open", true, "ui-open", detail, { cancelable: true })
  }

  /** Close, unless `ui-close` is cancelled. */
  closeMenu(originalEvent?: Event) {
    if (!this.open) return
    const detail: DropdownOpenDetail = { open: false, originalEvent }
    this.transition("open", false, "ui-close", detail, { cancelable: true })
  }

  /** Choose `option`:  replaces the value, or adds a label with `multiple`. */
  select(option: MenuOption | MenuAddition, originalEvent?: Event) {
    if (option.disabled || this.locked) return
    const value = option.value
    const values = this.values
    if (this.multiple && this.maxSelections !== undefined && values.length >= this.maxSelections) return
    if ("addition" in option && !this.byValue.has(value)) {
      this.added = [...this.added, { value, text: option.text }]
      this.buildModel()
    }
    const add: DropdownItemDetail = { value, originalEvent }
    if (this.multiple || "addition" in option) this.emit("ui-add", add)
    const next: DropdownValue = this.multiple ? [...values, value] : value
    if (!this.multiple || !values.includes(value)) this.change(next, originalEvent)
    this.query = ""
    if (!this.multiple) this.closeMenu(originalEvent)
  }

  /** Remove `value` from a `multiple` dropdown. */
  removeValue(value: string, originalEvent?: Event) {
    if (this.locked) return
    const detail: DropdownItemDetail = { value, originalEvent }
    this.emit("ui-remove", detail)
    this.change(
      this.values.filter((item) => item !== value),
      originalEvent
    )
  }

  /** Clear every value. */
  clear(originalEvent?: Event) {
    if (this.locked || !this.values.length) return
    this.change(this.multiple ? [] : "", originalEvent)
  }

  /** `ui-change`, then the new value unless the host set one in its handler. */
  private change(value: DropdownValue, originalEvent?: Event) {
    const detail: DropdownChangeDetail = { value, originalEvent }
    this.transition("value", value, "ui-change", detail)
  }

  /** Move the highlight by `delta` enabled options. */
  private move(delta: number) {
    const next = this.visible.nextEnabledIndex(this.highlighted, delta)
    if (next >= 0) this.highlighted = next
  }

  ////////////////
  // ## Events
  ////////////////

  private readonly onItemsSlotChange = () => this.readItems()

  private readonly onTriggerClick = (event: MouseEvent) => {
    if (this.open) this.closeMenu(event)
    else this.openMenu(event)
  }

  /** Clicks on the box around a search input focus it and open. */
  private readonly onRootClick = (event: MouseEvent) => {
    if (!this.search || this.locked) return
    const input = this.combobox()
    if (event.composedPath()[0] !== input) input?.focus()
    this.openMenu(event)
  }

  private readonly onClear = (event: MouseEvent) => {
    event.stopPropagation()
    this.clear(event)
  }

  /** Keep focus on the combobox while clicking the menu. */
  private readonly onMenuMouseDown = (event: MouseEvent) => event.preventDefault()

  /** Delegated option clicks. */
  private readonly onMenuClick = (event: MouseEvent) => {
    event.stopPropagation()
    const item = (event.target as Element).closest?.(`[${INDEX_ATTRIBUTE}]`)
    const index = Number(item?.getAttribute(INDEX_ATTRIBUTE) ?? -1)
    const option = this.visible.options[index]
    if (option) this.select(option, event)
  }

  private readonly onInput = (event: Event) => {
    this.query = (event.target as HTMLInputElement).value
    const detail: DropdownSearchDetail = { query: this.query, originalEvent: event }
    this.emit("ui-search", detail)
    this.openMenu(event)
    this.visible = this.filtered()
    this.highlighted = this.visible.nextEnabledIndex(-1, 1)
  }

  /** Focus left the element (and its shadow root):  close. */
  private readonly onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null
    if (next && (next === this || this.contains(next))) return
    this.closeMenu(event)
  }

  /** The combobox keyboard pattern -- see class docs. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || this.locked || event.isComposing) return
    const { open } = this
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!open) this.openMenu(event)
        else if (event.altKey && event.key === "ArrowUp") this.closeMenu(event)
        else this.move(event.key === "ArrowDown" ? 1 : -1)
        break
      }
      case "Home":
      case "End":
        if (this.search) return
        if (!open) this.openMenu(event)
        this.highlighted =
          event.key === "Home" ? this.visible.nextEnabledIndex(-1, 1) : this.visible.nextEnabledIndex(-1, -1)
        break
      case "PageDown":
      case "PageUp":
        if (!open) return
        this.move(event.key === "PageDown" ? PAGE_STEP : -PAGE_STEP)
        break
      case "Enter":
        if (open && this.highlighted >= 0) this.select(this.visible.options[this.highlighted]!, event)
        else if (!open && !this.search) this.openMenu(event)
        else return
        break
      case " ":
        if (this.search) return
        if (open && this.highlighted >= 0) this.select(this.visible.options[this.highlighted]!, event)
        else this.openMenu(event)
        break
      case "Tab":
        this.closeMenu(event)
        return
      case "Backspace":
        if (!this.multiple || !this.search || this.query || !this.values.length) return
        this.removeValue(this.values.at(-1)!, event)
        break
      default:
        if (this.search || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
        this.typeAhead(event)
    }
    event.preventDefault()
  }

  /** Select-only type-ahead:  highlight the next option starting with the typed characters. */
  private typeAhead(event: KeyboardEvent) {
    clearTimeout(this.typedTimer)
    this.typed += event.key
    this.typedTimer = setTimeout(() => (this.typed = ""), TYPE_AHEAD_MS)
    const index = this.visible.selectionForKey(this.typed, this.highlighted)
    if (index < 0) return
    this.openMenu(event)
    this.highlighted = index
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The combobox element:  `input.search` or `button.trigger`. */
  private combobox(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>(this.search ? "input.search" : "button.trigger") ?? null
  }

  /** The listbox. */
  private menu(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>(".menu") ?? null
  }

  /** `aria-activedescendant` id of `option`. */
  private optionId(option: MenuOption | undefined): string | undefined {
    if (!option || !this.ids) return undefined
    return "addition" in option ? `${this.ids.menu}-add` : `${this.ids.menu}-${this.ordinals.get(option) ?? 0}`
  }

  /** Combobox name:  host `aria-label`, else `<label for>` text, else the placeholder. */
  private accessibleName(): string | undefined {
    const own = this.getAttribute(ARIA_LABEL)
    if (own) return own
    // SSR:  the shim's `ElementInternals` has no `labels`
    const labels = [...(this.internals.labels ?? [])].map((label) => label.textContent?.trim()).filter(Boolean)
    return labels.length ? labels.join(" ") : this.placeholder || undefined
  }

  /** Icon name from the `icon` attribute (labeled dropdowns). */
  private iconName(): string | undefined {
    return this.icon || undefined
  }

  /** Two-letter country code => flag emoji (regional indicators);  anything else as-is. */
  private static flagEmoji(code: string): string {
    if (!/^[a-z]{2}$/i.test(code)) return code
    const upper = code.toUpperCase()
    return String.fromCodePoint(REGIONAL_A + upper.charCodeAt(0) - 65, REGIONAL_A + upper.charCodeAt(1) - 65)
  }
}

/** One rendered row of the menu. */
type Row = {
  key: string
  option?: MenuOption | MenuAddition
  /** index into `visible.options` */
  index?: number
  entry?: MenuEntry
}

/** Platform attribute used as the combobox's name. */
const ARIA_LABEL = "aria-label"
/** `data-*` attribute carrying an option's index, read by the delegated click handler. */
const INDEX_ATTRIBUTE = "data-index"
/** `UI.ids` prefixes. */
const ANCHOR_PREFIX = "ui-dropdown"
const MENU_PREFIX = "ui-dropdown-menu"
const TEXT_PREFIX = "ui-dropdown-text"
/** `repeat()` key of the addition row. */
const ADDITION_KEY = "\u0000addition"
/** `direction` value that right-aligns the menu (`.left.menu`). */
const DIRECTION_LEFT = "left"
/** `<ui-item type>` of a divider. */
const DIVIDER = "divider"
/** Placeholder in the `addItem` text. */
const VALUE_PLACEHOLDER = "{value}"
/** Options PageUp / PageDown move. */
const PAGE_STEP = 10
/** Type-ahead buffer lifetime. */
const TYPE_AHEAD_MS = 500
/** U+1F1E6 REGIONAL INDICATOR SYMBOL LETTER A. */
const REGIONAL_A = 0x1f1e6
