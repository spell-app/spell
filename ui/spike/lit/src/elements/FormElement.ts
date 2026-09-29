import { state } from "lit/decorators.js"
import type { PropertyValues } from "lit"

import { Validator } from "$/elements/Validator"

// Through the `core` ENTRY, never its leaves:  otherwise Rolldown hoists what `core` and `forms` share into a
// third, hashed chunk
import { type FieldValue, type ValidationRule, UIElement } from "../core"

/**
 * Form-associated base:  `static formAssociated = true` plus the `ElementInternals` plumbing every form control
 * repeats -- submission value, validity from `Validator`, reset / disabled callbacks, the constraint API.
 * - Subclasses implement `formValue()` (and optionally `validationRules()`, `validationAnchor()`,
 *   `formResetCallback()`);  `name` / `disabled` / `required` come from their vocabulary.
 * - Arrays submit one `FormData` entry per value under `name` (multiple dropdown).
 * - Sync runs after every update:  cheap (one `setFormValue` + one validation), and it can't miss a change.
 * - `:state(invalid)` mirrors validity for page styling;  `:user-invalid` works natively from `setValidity()`.
 */
export class FormElement extends UIElement {
  static formAssociated = true

  /** `<fieldset disabled>` (or a disabled form) disabled us */
  @state() accessor formDisabled = false

  /** Shared rule engine. */
  private static validator = new Validator()

  ////////////////
  // ## Hooks for subclasses
  ////////////////

  /** Current value as the form and validator see it. */
  protected formValue(): FieldValue {
    return undefined
  }

  /** Rules to validate against;  default `notEmpty` when `required`. */
  protected validationRules(): ValidationRule[] {
    return this.field.required ? ["notEmpty"] : []
  }

  /** Element `reportValidity()` focuses and anchors its bubble to. */
  protected validationAnchor(): HTMLElement | undefined {
    return undefined
  }

  /** Disabled by attribute or by an ancestor `<fieldset>`. */
  get isDisabled(): boolean {
    return !!this.field.disabled || this.formDisabled
  }

  ////////////////
  // ## Sync
  ////////////////

  protected override updated(changed: PropertyValues) {
    super.updated(changed)
    this.syncForm()
  }

  /** Push value and validity into `ElementInternals`. */
  protected syncForm() {
    const value = this.formValue()
    const { name } = this.field
    if (!name || this.isDisabled) this.internals.setFormValue(null)
    else if (Array.isArray(value)) {
      const data = new FormData()
      for (const item of value as readonly string[]) data.append(name, item)
      this.internals.setFormValue(data)
    } else this.internals.setFormValue(value == null || value === "" ? null : String(value))
    const result = FormElement.validator.validate(value, this.validationRules(), { name })
    if (result.valid) this.internals.setValidity({})
    else this.internals.setValidity(result.flags, result.message, this.validationAnchor())
    this.setState("invalid", !result.valid)
  }

  ////////////////
  // ## Form callbacks
  ////////////////

  /** Called by the browser when an ancestor fieldset / form toggles disabled. */
  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled
  }

  /** Called by the browser on `form.reset()`;  subclasses restore their default value. */
  formResetCallback() {}

  ////////////////
  // ## Constraint validation API
  ////////////////

  get form(): HTMLFormElement | null {
    return this.internals.form
  }
  get labels(): NodeList {
    return this.internals.labels
  }
  get validity(): ValidityState {
    return this.internals.validity
  }
  get validationMessage(): string {
    return this.internals.validationMessage
  }
  get willValidate(): boolean {
    return this.internals.willValidate
  }
  checkValidity(): boolean {
    return this.internals.checkValidity()
  }
  reportValidity(): boolean {
    return this.internals.reportValidity()
  }

  /** The vocabulary properties every form control has. */
  private get field(): FormFields {
    return this as unknown as FormFields
  }
}

/** Properties `FormElement` expects its subclass's vocabulary to declare. */
type FormFields = {
  name?: string
  disabled?: boolean
  required?: boolean
}
