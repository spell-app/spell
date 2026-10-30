import { E, UI } from "spell/ui/core"
// the family barrel, not the leaf:  the lib build then imports `ui-form.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines the form family:  a property is a field, in a form)
import { DOMFieldElement, FormFields, UIField } from "spell/ui/components/ui-form"
import type { fieldVocabulary } from "spell/ui/components/ui-form/UIField.en"
import { PropertySchemas } from "spell/ui/property"
import type { AttributeSpec, PropertySchema, ValueType } from "spell/ui/vocabulary"
import type { Choice, PropertyControl } from "spell/ui/runtime"
import { propertyVocabulary } from "./UIProperty.en"
import {
  EDITOR_SELECTOR,
  EDITOR_TAG,
  GROUP_SELECTOR,
  GROUP_TAG,
  MADE_ATTRIBUTE,
  VALUE_FROM_ATTRIBUTE
} from "./UIPropertyEditor.types"

import propertyCSS from "./UIProperty.css?inline"

/****************
 * ### `DOMPropertyElement`
 * The DOM element of `<ui-property>`:  a field's (`showErrors()`, `errors`), plus what its editor reads of it.
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMPropertyElement extends DOMFieldElement {
  /**
   * The schema's rules for it:  its `rules`, and `min` / `max` / `pattern` as rules.
   * - `<ui-form>` adds them to the form's.
   */
  @E.untracked
  get schemaRules(): readonly E.ValidationRule[] | undefined {
    return (this.component as UIProperty | undefined)?.schemaRules
  }

  /** Show it as holding an edit not saved yet (`:state(changed)`);  the editor says. */
  markChanged(isChanged: boolean) {
    const component = this.component as UIProperty | undefined
    if (component) component.isChanged = isChanged
  }

  /** Its form showed a value in its control (`FormBinding`):  `:state(set)` reads it again. */
  valueShown() {
    ;(this.component as UIProperty | undefined)?.noteValueChanged()
  }
}

/**
 * The attributes a control's value shows in, as a page sets them:  `@E.watches` follows them.
 * - Above the class:  `@E.watches` reads it while the class is defined.
 */
const VALUE_ATTRIBUTES = ["value", "selected", "checked"]

/**
 * The same run, property by property (or both none):  a property's `flagRun` doesn't change for an equal one.
 * - Above the class:  `@state({ equals })` reads it while the class is defined.
 */
function isSameRun(a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean {
  return a === b || (!!a && !!b && a.length === b.length && a.every((each, index) => each === b[index]))
}

/****************
 * ### `UIProperty`
 * The component behind `<ui-property>`:  one property of the thing its `<ui-property-editor>` edits.
 *
 * - It IS a `<ui-field>` (it extends `UIField`):
 *   the label row, the tip, the hint, the error lines, `apply`, `mixed`, `rules`.
 *   `<ui-form>` finds it as a field (`:state(field)`) and binds its control.
 * - What it knows of its property comes from the editor's SCHEMA (`spec`), found by `name`
 *   (a dotted name reaches into a nested thing's attributes):
 *   - the label (`labelOf()`:  its own, else made from the name) and the tip, unless the field's own say otherwise
 *   - its value's type, so its default control (`UI.propertyControls.kindFor()`)
 *   - its choices (`values`, a `choicesFrom` source), limits and rules
 * - Its CONTROL:  one it holds already (the author's),
 *   else one it MAKES, of the kind `as` says (else the type's kind),
 *   and adds to its own light DOM, as `<ui-repeat>` adds rows.
 *   - Made with `name` = the property's name, so the editor's form binds it.
 *   - Its choices go in as the control's children.
 *   - Made again when the kind or the choices change;  taken away when the author adds their own.
 *   - SIDE EFFECT:  adds and removes elements in its light DOM, marked `data-ui-made`.
 * - `readonly` nests:  its own, or a `readonly` group or editor around it, makes the control readonly.
 * - `:state(changed)`:  its edit is held, not saved yet (the editor says, `markChanged()`).
 * - Its look in its editor (epic `debut` P31):
 *   - `:state(half)`:  half a row on the editor's grid, by its control's kind (a number, a select) or its `width`
 *   - in a `compact` editor (`:state(compact)`):  a yes or no on one line, the box then its label;  its hint at the
 *     label row's end
 *   - `:state(set)`:  its value isn't its default (`default`, else the schema's);  bold under `show-defaults`
 *   - a run of three or more yes-or-no properties in one group is ONE select of pills (`FlagRun`):
 *     the first draws it (`:state(flags)`), the rest hide (`:state(flag)`), each still its own property
 *   - choices carry their icons (`ValueSets.iconsFor()`), a hue its colour's chip;  four or fewer, all with
 *     icons, draw as a segmented row of icons (`buttons`)
 ****************/
export class UIProperty extends UIField {
  // the field's names under the property's tag, and its own:  TypeScript only knows the field's literals
  @E.proto static vocabulary = propertyVocabulary as unknown as typeof fieldVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { ...UIField.prototype.elementSetup.styleSheets, property: propertyCSS },
    DOMElement: DOMPropertyElement
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Its own attributes
  ////////////////

  /** The property it edits:  `name`. */
  get propertyName(): string {
    return this.attributes.name ?? ""
  }

  /** The control kind it was asked for:  `as`. */
  get requestedKind(): string | undefined {
    return this.attributes.as ?? undefined
  }

  /** Where its choices come from, when not the schema's:  `options`. */
  get optionsText(): string | undefined {
    return this.attributes.options ?? undefined
  }

  ////////////////
  // ## The editor and the schema
  ////////////////

  /** The `<ui-property-editor>` around it, while connected. */
  @E.state accessor editor: DOMEditorLike | undefined = undefined

  /**
   * Find the editor (and a `readonly` group or editor) on connect.
   * - The editor by what it is, the nearest element around us with a schema:
   *   so a translated one is found too (`<es-editor-propiedades>`), before its state is drawn.
   */
  @E.whileConnected
  protected watchEditor() {
    this.editor = UIProperty.editorAround(this.domElement)
    const readonly = [GROUP_TAG, EDITOR_TAG].map((tag) => `${tag}[readonly]`)
    readonly.push(`${GROUP_SELECTOR}:state(readonly)`, `${EDITOR_SELECTOR}:state(readonly)`)
    this.isInReadonly = !!this.domElement.parentElement?.closest(readonly.join(", "))
    return () => {
      this.editor = undefined
    }
  }

  /** What the schema says of its property, if the editor has a schema that names it. */
  get spec(): AttributeSpec | undefined {
    const schema = this.editor?.currentSchema
    return schema ? UIProperty.specFor(schema, this.propertyName) : undefined
  }

  /** Its label:  its own (`ownLabel`);  "Options" while it heads a run of pills. */
  get labelText(): string | undefined {
    return this.flagRun ? this.translationForKey(FLAGS_TEXT) : this.ownLabel
  }

  /** Its own label:  the field's `label`, else the schema's (or one made from its name). */
  get ownLabel(): string | undefined {
    if (this.label) return this.label
    const spec = this.spec
    return spec ? PropertySchemas.labelOf(spec) : this.propertyName && PropertySchemas.labelOf(NAMED(this.propertyName))
  }

  /** Its tip:  the field's own `description`, else the schema's `tip`;  the pills' row has none of its own. */
  get descriptionText(): string | undefined {
    if (this.flagRun) return undefined
    return this.description ?? this.spec?.tip
  }

  /** Its hint:  the field's own `hint`, else the schema's. */
  get hintText(): string | undefined {
    if (this.flagRun) return undefined
    return this.hint ?? this.spec?.hint
  }

  /** In a compact editor, its hint sits at the label row's end. */
  get hasHintInRow(): boolean {
    return this.isCompact
  }

  /** Its value's type, as a form edits it:  the schema's, else `text`. */
  get valueType(): ValueType {
    const spec = this.spec
    return spec ? PropertySchemas.typeOf(spec) : TEXT
  }

  /**
   * The schema's rules for it, as `<ui-form>` rules:  its `rules`, then its pattern.
   * - A rule may be an object with its own words, as a spell type's are:  `{ type: "empty", prompt: "Name it" }`.
   */
  get schemaRules(): readonly E.ValidationRule[] | undefined {
    const spec = this.spec
    if (!spec) return undefined
    const rules: E.ValidationRule[] =
      spec.rules === undefined ? [] : typeof spec.rules === "string" ? [spec.rules] : [...spec.rules]
    if (spec.pattern) rules.push(`regExp[/${spec.pattern}/]`)
    return rules.length ? rules : undefined
  }

  ////////////////
  // ## Readonly and changed
  ////////////////

  /** A `readonly` group or editor is around it. */
  @E.state accessor isInReadonly = false

  /** `:state(readonly)`:  its own `readonly`, or a group's or the editor's. */
  /** Always `:state(property)`:  how its family finds it, whatever its tag is called (`PROPERTY_SELECTOR`). */
  @E.cssState("property")
  get isProperty(): boolean {
    return true
  }

  @E.cssState("readonly")
  get isReadOnly(): boolean {
    return !!this.readonly || this.isInReadonly
  }

  /** `:state(changed)`:  its edit is held, not saved yet. */
  @E.cssState("changed")
  @E.state
  accessor isChanged = false

  ////////////////
  // ## The control it makes
  ////////////////

  /**
   * The kind of control it draws:  `as`, else its type's default.
   * - `undefined` until the page's runtime has loaded.
   */
  get controlKind(): string | undefined {
    if (!this.isReady) return undefined
    if (this.requestedKind) return this.requestedKind
    const choices = this.choices
    const isIconRow =
      this.valueType === CHOICE &&
      !!choices?.length &&
      choices.length <= MOST_SEGMENTS &&
      choices.every(UIProperty.hasIcon)
    return isIconRow ? SEGMENTED_KIND : UI.propertyControls.kindFor(this.valueType)
  }

  /** What its kind draws, while the runtime is in. */
  get control(): PropertyControl | undefined {
    const kind = this.controlKind
    return kind ? UI.propertyControls.get(kind) : undefined
  }

  /** `:state(buttons)`:  its control is a row of choices (a kind drawn as `radios`). */
  @E.cssState("buttons")
  get isButtonRow(): boolean {
    return this.control?.choices === RADIOS
  }

  /** Choices loaded from a source (`options`, `choicesFrom`), once they arrive. */
  @E.state accessor loadedChoices: readonly Choice[] | undefined = undefined

  /**
   * Its choices:  `options` written as a list, else a source's (once loaded), else the schema's values.
   * - The schema's values:  its own `values` (a list, or a value set's name), else its kind's set
   *   (`ValueSets.setFor()`):  a tag's `size` is the sizes, its `color` the hues.
   *   Without the kind's set, a tag's own schema drew its selects with nothing to choose (Owen:  "dropdowns don't
   *   have options").
   */
  get choices(): readonly Choice[] | undefined {
    const text = this.optionsText
    if (text && text.includes(",")) return text.split(",").map((choice) => choice.trim())
    if (text || this.spec?.choicesFrom) return this.loadedChoices
    const spec = this.spec
    const set = spec && E.ValueSets.setFor(spec)
    if (!set) return undefined
    const icons = E.ValueSets.iconsFor(spec)
    const values = E.ValueSets.get(set)
    return icons ? values.map((value) => (icons[value] ? { value, text: value, icon: icons[value] } : value)) : values
  }

  /** Its choices are colours:  each drawn with a chip of its hue (`hueChip()`). */
  get isHueChoice(): boolean {
    return !!this.spec && E.ValueSets.setFor(this.spec) === HUES
  }

  /** A choice source to load:  `options` naming one, else the schema's `choicesFrom`. */
  @E.onChange("optionsText", "spec", "isReady")
  protected onChoiceSourceChanged(text: string | undefined, spec: AttributeSpec | undefined, isReady: boolean) {
    const source = text && !text.includes(",") ? text : spec?.choicesFrom
    if (!isReady || !source) return
    let isCurrent = true
    void UI.propertyControls
      .choices(source)
      .then((choices) => {
        if (isCurrent) this.loadedChoices = choices ?? []
      })
      .catch((error) => E.Warnings.warn("<ui-property>", `can't load the choices of \`${source}\`:`, error))
    return () => {
      isCurrent = false
    }
  }

  /** Make (or make again) its control as the kind, choices, name, readonly state or limits change. */
  @E.onChange("controlKind", "choices", "propertyName", "isReadOnly", "spec")
  protected onControlNeeded(kind: string | undefined) {
    if (!kind || this.holdsOwnControl) return this.removeMadeControls()
    this.makeControl(kind)
  }

  /** The author put a control of their own in it:  any element child it didn't make, outside the named slots. */
  private get holdsOwnControl(): boolean {
    return [...this.domElement.children].some((child) => !child.hasAttribute(MADE_ATTRIBUTE) && !child.slot)
  }

  /**
   * Replace the controls it made with one of `kind`.
   * - SIDE EFFECT:  writes its light DOM.
   */
  @E.untracked
  private makeControl(kind: string) {
    const control = UI.propertyControls.get(kind)
    if (!control) {
      E.Warnings.warn("<ui-property>", `no control kind \`${kind}\`:  add it with UI.propertyControls.add()`)
      return
    }
    this.removeMadeControls()
    const made = control.choices === "radios" ? this.radios(control) : [this.controlElement(control)]
    for (const element of made) element.setAttribute(MADE_ATTRIBUTE, "")
    this.domElement.append(...made)
    this.noteValueChanged()
    FlagRun.arrangeSoon(this.domElement.parentElement)
  }

  /** One control element of `control`'s kind:  named, limited, readonly, its choices as `<ui-item>`s. */
  private controlElement(control: PropertyControl): HTMLElement {
    const element = document.createElement(control.tag)
    for (const [name, value] of Object.entries(control.attributes ?? {})) element.setAttribute(name, value)
    element.setAttribute("name", this.propertyName)
    const spec = this.spec
    if (spec?.min !== undefined) element.setAttribute("min", String(spec.min))
    if (spec?.max !== undefined) element.setAttribute("max", String(spec.max))
    if (spec?.step !== undefined) element.setAttribute("step", String(spec.step))
    if (this.isReadOnly) element.setAttribute("readonly", "")
    if (control.choices === "items") {
      const choices = this.choices ?? []
      const isSegmented = control.attributes?.appearance === SEGMENTED
      // no value and no default:  it reads "none", never blank (a segmented row always shows its choices)
      if (spec?.default === undefined && !isSegmented)
        element.setAttribute("placeholder", this.translationForKey("none"))
      // every segment an icon:  icons alone, each one's name its tooltip
      const iconsOnly = isSegmented && choices.length > 0 && choices.every(UIProperty.hasIcon)
      if (iconsOnly) element.setAttribute("icon", "")
      for (const choice of choices) {
        const item = UIProperty.item(choice, iconsOnly)
        if (this.isHueChoice)
          item.setAttribute("image", UIProperty.hueChip(item.getAttribute("value")!, this.domElement))
        element.append(item)
      }
    }
    if (control.tag === EDITOR_TAG) element.setAttribute(VALUE_FROM_ATTRIBUTE, this.propertyName)
    return element
  }

  /** One radio per choice, of one name:  the `buttons` kind. */
  private radios(control: PropertyControl): HTMLElement[] {
    return (this.choices ?? []).map((choice) => {
      const radio = this.controlElement(control)
      const { value, text } = UIProperty.choiceParts(choice)
      radio.setAttribute("value", value)
      radio.textContent = text
      return radio
    })
  }

  /**
   * Take away every control it made.
   * - SIDE EFFECT:  writes its light DOM.
   */
  @E.untracked
  private removeMadeControls() {
    for (const child of [...this.domElement.children]) {
      // the pills' select stays:  it follows its run, not its kind
      if (child.hasAttribute(MADE_ATTRIBUTE) && child.getAttribute(MADE_ATTRIBUTE) !== FLAGS) child.remove()
    }
  }

  ////////////////
  // ## Its look in its editor (epic `debut` P31)
  ////////////////

  /** `:state(compact)`:  its editor is `compact`. */
  @E.cssState("compact")
  get isCompact(): boolean {
    return !!this.editor?.isCompact
  }

  /** `:state(show-defaults)`:  its editor bolds a value other than its default. */
  @E.cssState("show-defaults")
  get showsDefaults(): boolean {
    return !!this.editor?.showsDefaults
  }

  /**
   * `:state(half)`:  half a row on its editor's grid (one column):  its own `width` (`1/2`, `8` of 16 or less),
   * else its kind's (`PropertyControl.width`).  The pills' row takes the whole.
   */
  @E.cssState("half")
  get isHalf(): boolean {
    if (this.flagRun) return false
    const width = this.attributes.width
    const columns = width ? E.ValueSets.columns(width) : undefined
    if (columns !== undefined) return columns <= HALF_OF_GRID
    return this.control?.width === HALF
  }

  /** In a compact editor, a yes or no draws on one line:  the field's `inline`, the box before its label. */
  @E.cssState("inline-check")
  get isInlineCheck(): boolean {
    return this.isCompact && !!this.control?.inline && !this.flagRun
  }

  protected classValue(name: E.AttributeName<typeof fieldVocabulary>): unknown {
    if (name === "inline" && this.isInlineCheck) return true
    return super.classValue(name)
  }

  ////////////////
  // ## Set:  a value other than its default
  ////////////////

  /** Moves each time its control's value may have:  a person's edit, or its form showing one. */
  @E.state private accessor valueVersion = 0

  /** Its control's value may have changed:  `:state(set)` reads it again. */
  @E.untracked
  noteValueChanged() {
    this.valueVersion++
  }

  /**
   * Its controls' values were set as attributes (a page drawing its own control, `value={...}`), or controls came
   * and went:  read again.
   */
  @E.watches({ childList: true, subtree: true, attributes: true, attributeFilter: VALUE_ATTRIBUTES })
  protected onControlsMutated() {
    this.noteValueChanged()
  }

  /** A person edited its control. */
  @E.on("ui-changed")
  @E.on("input")
  @E.on("change")
  protected onValueEdited() {
    this.noteValueChanged()
  }

  /** Its default:  its own `default`, else the schema's;  `undefined` for none. */
  get defaultValue(): string | number | boolean | undefined {
    return this.attributes.default ?? this.spec?.default
  }

  /**
   * `:state(set)`:  its value isn't its default (any value at all, with none).
   * - Never while its things disagree (`mixed`), or it's readonly.
   * - Read from its control, the way its form reads it (`FormFields.valueFor()`).
   */
  @E.cssState("set")
  get isSet(): boolean {
    void this.valueVersion
    if (this.isMixed || this.isReadOnly) return false
    const controls = [...this.domElement.children].filter(
      (child) => !child.slot && child.getAttribute(MADE_ATTRIBUTE) !== FLAGS && FormFields.isControl(child)
    )
    return UIProperty.differs(FormFields.valueFor(controls), this.defaultValue)
  }

  /**
   * `value` isn't `fallback`:  a yes or no compared as one, anything else as text.
   * - STATIC:  pure.
   */
  static differs(value: E.FieldValue, fallback: string | number | boolean | undefined): boolean {
    // no default:  any value, but "false" (an off switch a select shows as text, `fixed="false"`) is none
    if (fallback === undefined) return !FormFields.isBlank(value) && value !== FALSE_TEXT
    if (typeof fallback === "boolean" || fallback === "true" || fallback === "false") {
      return !FormFields.isBlank(value) !== E.Converters.boolean(fallback)
    }
    const text = Array.isArray(value) ? value.join(",") : value == null ? "" : String(value)
    return text !== String(fallback)
  }

  ////////////////
  // ## A run of yes-or-no properties, as one select of pills
  ////////////////

  /** The properties its pills stand for, while it heads a run (`:state(flags)`);  set by `FlagRun`. */
  @E.state({ equals: isSameRun }) accessor flagRun: readonly UIProperty[] | undefined = undefined

  /** The property heading its run, while it's in one and doesn't head it (`:state(flag)`, hidden). */
  @E.cssState("flag")
  @E.state
  accessor isFlagMember = false

  /** `:state(flags)`:  it heads a run, drawing its pills. */
  @E.cssState("flags")
  get isFlagLead(): boolean {
    return !!this.flagRun
  }

  /** A yes or no that may join a run:  its control is a checkbox kind, its own (not the author's). */
  get canJoinFlags(): boolean {
    return !!this.control?.inline && !this.holdsOwnControl && !this.requestedKind
  }

  /** Its checkbox's chosen state:  read again with its value. */
  get isChosen(): boolean {
    void this.valueVersion
    const checkbox = this.madeCheckbox
    return !!checkbox && FormFields.isChosen(checkbox)
  }

  /** The checkbox it made. */
  @E.untracked
  private get madeCheckbox(): Element | undefined {
    return [...this.domElement.children].find((child) => child.getAttribute(MADE_ATTRIBUTE) === "" && !child.slot)
  }

  /** The names of its run's properties that are on:  the pills shown. */
  get chosenFlags(): readonly string[] {
    return (this.flagRun ?? []).filter((property) => property.isChosen).map((property) => property.propertyName)
  }

  /** The pills' select, while it heads a run. */
  private flagsSelect: HTMLElement | undefined

  /** Heading a run, or no longer:  make the pills' select, or take it away. */
  @E.onChange("flagRun")
  protected onFlagRunChanged(run: readonly UIProperty[] | undefined) {
    this.flagsSelect?.remove()
    this.flagsSelect = undefined
    if (!run) return
    const select = document.createElement(DROPDOWN_TAG)
    select.setAttribute(MADE_ATTRIBUTE, FLAGS)
    select.setAttribute("multiple", "")
    select.setAttribute("selection", "")
    select.setAttribute("fluid", "")
    select.setAttribute("aria-label", this.translationForKey(FLAGS_TEXT))
    for (const property of run) {
      const item = UIProperty.item({ value: property.propertyName, text: property.ownLabel ?? property.propertyName })
      const tip = property.description ?? property.spec?.tip
      if (tip) item.setAttribute("title", tip)
      select.append(item)
    }
    select.addEventListener("ui-changed", this.onFlagsPicked)
    this.domElement.append(select)
    this.flagsSelect = select
    return () => select.removeEventListener("ui-changed", this.onFlagsPicked)
  }

  /** The pills shown follow its run's checkboxes. */
  @E.onChange("chosenFlags", "flagRun")
  protected onChosenFlagsChanged(chosen: readonly string[]) {
    const select = this.flagsSelect as (HTMLElement & { value?: unknown }) | undefined
    if (select) select.value = [...chosen]
  }

  /**
   * A pill added or removed:  turn each of its run's checkboxes on or off to match, as a person's click would,
   * so its form writes each property back.
   * - Its own `ui-changed` stops here:  the select is no control of the form's.
   */
  @E.untracked
  private readonly onFlagsPicked = (event: Event) => {
    event.stopPropagation()
    const picked = new Set(E.Converters.list((event as CustomEvent<{ value: unknown }>).detail?.value as string))
    for (const property of this.flagRun ?? []) {
      const checkbox = property.madeCheckbox as (Element & { checked: boolean }) | undefined
      const isOn = picked.has(property.propertyName)
      if (!checkbox || FormFields.isChosen(checkbox) === isOn) continue
      checkbox.checked = isOn
      checkbox.dispatchEvent(
        new CustomEvent("ui-changed", { detail: { selected: isOn }, bubbles: true, composed: true })
      )
    }
  }

  ////////////////
  // ## Statics
  ////////////////

  /** The editor around `element`, the nearest with a schema (`currentSchema`) -- `undefined` if none. */
  static editorAround(element: Element): DOMEditorLike | undefined {
    for (let at = element.parentElement; at; at = at.parentElement) {
      if ("currentSchema" in at) return at as DOMEditorLike
    }
    return undefined
  }

  /**
   * What `schema` says of property `name`;  a dotted name reaches into a nested thing's `attributesOf`.
   * - STATIC:  pure.
   */
  static specFor(schema: PropertySchema, name: string): AttributeSpec | undefined {
    let attributes: readonly AttributeSpec[] | undefined = schema.attributes
    let spec: AttributeSpec | undefined
    for (const key of name.split(".")) {
      spec = attributes?.find((candidate) => candidate.name === key || candidate.property === key)
      attributes = spec?.attributesOf
    }
    return spec
  }

  /** A choice's value and text (and its icon and image, if it has them). */
  private static choiceParts(choice: Choice): Exclude<Choice, string> {
    return typeof choice === "string" ? { value: choice, text: choice } : choice
  }

  /** A choice with an icon of its own. */
  private static hasIcon(choice: Choice): boolean {
    return typeof choice !== "string" && !!choice.icon
  }

  /**
   * A `<ui-item value>` for a choice, with its icon (and image);
   * `iconOnly`:  its icon alone, its text its tooltip and name.
   */
  private static item(choice: Choice, iconOnly = false): HTMLElement {
    const { value, text, icon, image } = UIProperty.choiceParts(choice)
    const item = document.createElement("ui-item")
    item.setAttribute("value", value)
    if (icon) item.setAttribute("icon", icon)
    if (image) item.setAttribute("image", image)
    if (iconOnly) {
      item.setAttribute("title", text)
      item.setAttribute("aria-label", text)
    } else item.textContent = text
    return item
  }

  /**
   * A round chip of `hue`'s colour, as an SVG `data:` URL:  a hue's choice shows it before its name.
   * - The colour is worked out on a probe inside `near`, so it's the colour the theme there paints;
   *   grey where it can't be read.
   * - SIDE EFFECT:  adds and removes the probe.
   */
  static hueChip(hue: string, near: Element): string {
    const probe = near.appendChild(document.createElement("span"))
    probe.style.color = `var(--ui-${hue}, gray)`
    const color = getComputedStyle(probe).color
    probe.remove()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="${color}"/></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }
}

/** What a property reads of its editor's DOM element. */
type DOMEditorLike = HTMLElement & {
  readonly currentSchema?: PropertySchema
  readonly isCompact?: boolean
  readonly showsDefaults?: boolean
}

/****************
 * ### `FlagRun`
 * Finds the runs of yes-or-no properties in a group (or an editor), and makes each run ONE select of pills:
 * its first property heads it (`flagRun`), the rest hide (`isFlagMember`).
 * - A run:  three or more side by side, by themselves;  a group's `flags` says otherwise
 *   (`pills`:  any run;  `checkboxes`:  none).
 * - Each property still has its checkbox, which its form binds:  the pills only turn them on and off.
 * - Arranged a moment after any property in the group makes its control, so every one of them has.
 ****************/
class FlagRun {
  /** Arrange `container`'s runs once the current code is done:  once, however many ask. */
  static arrangeSoon(container: Element | null) {
    if (!container || FlagRun.pending.has(container)) return
    FlagRun.pending.add(container)
    E.afterSolidUpdate(() => {
      FlagRun.pending.delete(container)
      FlagRun.arrange(container)
    })
  }

  /** Find `container`'s runs and tell each property its part in them. */
  static arrange(container: Element) {
    const mode = container.getAttribute("flags")
    const least = mode === PILLS ? 1 : mode === CHECKBOXES ? Infinity : LEAST_FLAGS
    const runs: UIProperty[][] = []
    let run: UIProperty[] = []
    for (const child of container.children) {
      const property = (child as E.DOMElement).component
      if (property instanceof UIProperty && property.canJoinFlags) {
        run.push(property)
        continue
      }
      if (run.length) runs.push(run)
      run = []
    }
    if (run.length) runs.push(run)
    const leads = new Map<UIProperty, readonly UIProperty[]>()
    const members = new Set<UIProperty>()
    for (const each of runs) {
      if (each.length < least) continue
      leads.set(each[0], each)
      for (const member of each.slice(1)) members.add(member)
    }
    for (const child of container.children) {
      const property = (child as E.DOMElement).component
      if (!(property instanceof UIProperty)) continue
      property.flagRun = leads.get(property)
      property.isFlagMember = members.has(property)
    }
  }

  /** Containers waiting to be arranged. */
  private static readonly pending = new WeakSet<Element>()
}

/** The label of the pills' select:  the property's own text (TypeScript knows only the field's). */
const FLAGS_TEXT = "flags" as never

/** An off switch, as a select shows it. */
const FALSE_TEXT = "false"

/** The fewest yes-or-no properties side by side that make a select of pills. */
const LEAST_FLAGS = 3

/** A group's `flags`:  every run pills, or none. */
const PILLS = "pills"
const CHECKBOXES = "checkboxes"

/** `MADE_ATTRIBUTE`'s value on the pills' select. */
const FLAGS = "flags"

/** The pills' select. */
const DROPDOWN_TAG = "ui-dropdown"

/** The value type of a choice, and the kind a row of icons draws as. */
const CHOICE: ValueType = "choice"
const SEGMENTED_KIND = "buttons"

/** A segmented menu's look word. */
const SEGMENTED = "segmented"

/** The most choices drawn as a segmented row by themselves. */
const MOST_SEGMENTS = 4

/** The value set of colours. */
const HUES = "hues"

/** `PropertyControl.width`'s half;  half of the 16-column grid a `width` counts in. */
const HALF = "half"
const HALF_OF_GRID = 8

/** A kind's choices drawn one control each. */
const RADIOS = "radios"

/** The type of a property the schema doesn't name. */
const TEXT: ValueType = "text"

/** A bare attribute named `name`, to make a label from. */
const NAMED = (name: string): AttributeSpec => ({ name, kind: "string", description: "" })
