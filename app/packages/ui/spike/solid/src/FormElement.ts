import { createEffect, createMemo, type Accessor } from "solid-js"

import { proto } from "$/util"
import { Validator, type FieldValue, type ValidationResult, type ValidationRule } from "$/elements"
import type { ComponentVocabulary } from "$/vocabulary"

import { Cell } from "./Cell"
import { FormHost } from "./FormHost"
import { UIElement } from "./UIElement"

/**
 * Controller base of form-associated components:  form value, validity, reset, fieldset-disabled.
 * - The host is a `FormHost` (`static formAssociated = true`);  this class pushes `formValue()` into
 *   `ElementInternals.setFormValue()` -- a `string[]` becomes a `FormData` with one entry per value, so
 *   `new FormData(form).getAll(name)` returns them all -- and `rules()` through `Validator` into `setValidity()`.
 * - `:state(invalid)` mirrors validity;  the anchor for the browser's bubble is `validationAnchor()`.
 */
export abstract class FormElement<V extends ComponentVocabulary = ComponentVocabulary> extends UIElement<V> {
  /** Form-associated host. */
  @proto static Host = FormHost

  /** Fomantic rules;  shared, it's stateless. */
  static validator = new Validator()

  /** Disabled by a fieldset / own `disabled`, per `formDisabledCallback`. */
  readonly formDisabled = new Cell((this.host as FormHost).formDisabled)

  /**
   * Result of `rules()` against `formValue()`.
   * - `lazy`:  it calls subclass hooks, which read subclass fields that don't exist yet here.
   */
  readonly validation: Accessor<ValidationResult> = createMemo(
    () => FormElement.validator.validate(this.formValue(), this.rules(), { label: this.validationLabel() }),
    { lazy: true }
  )

  /** The form host. */
  get formHost(): FormHost {
    return this.host as FormHost
  }

  ////////////////
  // ## Subclass hooks
  ////////////////

  /** Value to submit;  tracked.  `null` / `undefined` submits nothing. */
  abstract formValue(): FieldValue

  /** Field name for `FormData` entries of a multi-value control. */
  protected abstract formName(): string | undefined

  /** Restore the starting value (`formResetCallback`). */
  abstract formReset(): void

  /** Validation rules;  default none. */
  protected rules(): ValidationRule[] {
    return []
  }

  /** Label used in validation messages. */
  protected validationLabel(): string | undefined {
    return undefined
  }

  /** Element the browser anchors its validation bubble to. */
  protected validationAnchor(): HTMLElement | undefined {
    return undefined
  }

  ////////////////
  // ## Wiring
  ////////////////

  /** Adds the form value / validity effects to `UIElement.mount()`. */
  mount() {
    createEffect(
      () => ({ value: this.formValue(), name: this.formName() }),
      ({ value, name }) => this.formHost.internals.setFormValue(FormElement.submission(value, name))
    )
    createEffect(
      () => this.validation(),
      (result) => {
        const { internals } = this.formHost
        if (result.valid) internals.setValidity({})
        else internals.setValidity(result.flags, result.message, this.validationAnchor())
        this.host.setState(INVALID_STATE, !result.valid)
      }
    )
    return super.mount()
  }

  /** Host callback:  fieldset disabled changed. */
  onFormDisabled(disabled: boolean) {
    this.formDisabled.set(disabled)
  }

  /**
   * What `setFormValue()` takes for `value`:  a string, a `FormData` of one entry per array item, or `null`.
   * - NOTE: a `FormData` needs `name`;  unnamed controls submit nothing anyway.
   */
  static submission(value: FieldValue, name: string | undefined): string | FormData | null {
    if (value == null || value === false) return null
    if (!Array.isArray(value)) return String(value)
    if (!name) return null
    const data = new FormData()
    for (const item of value as readonly string[]) data.append(name, item)
    return data
  }
}

/**
 * `:state()` for failed validation.
 * - NOTE: every form vocabulary names it `invalid`;  here, not per component, because the base sets it.
 */
const INVALID_STATE = "invalid"
