import { UIHost } from "./UIHost"

/**
 * Host base of form-associated components (`ui-dropdown`, and `ui-button` for `type=submit|reset`).
 * - `static formAssociated = true` has to be on the class `customElements.define()` sees;  `component-register`
 *   builds that class by EXTENDING its `BaseElement`, so a static here is inherited -- the one place it can go
 *   (`customElement()` has no base-class option, which is why `ElementDefinition` calls `register()` itself).
 * - Form callbacks land on the host and are forwarded to the connection's `FormElement` controller.
 * - Exposes the usual form-control API (`form`, `validity`, `checkValidity()` ...) from `internals`.
 */
export class FormHost extends UIHost {
  static formAssociated = true

  /** Disabled by an ancestor `<fieldset disabled>` (or its own `disabled`), per `formDisabledCallback`. */
  formDisabled = false

  /** Form owner. */
  get form(): HTMLFormElement | null {
    return this.internals.form
  }

  /** Constraint validation state. */
  get validity(): ValidityState {
    return this.internals.validity
  }

  /** Current validation message. */
  get validationMessage(): string {
    return this.internals.validationMessage
  }

  /** Takes part in constraint validation? */
  get willValidate(): boolean {
    return this.internals.willValidate
  }

  /** `<label>`s pointing at this element. */
  get labels(): NodeList {
    return this.internals.labels
  }

  /** Valid?  Fires `invalid` when not. */
  checkValidity(): boolean {
    return this.internals.checkValidity()
  }

  /** Valid?  Shows the browser's message when not. */
  reportValidity(): boolean {
    return this.internals.reportValidity()
  }

  /** The form was reset. */
  formResetCallback() {
    this.formController?.formReset?.()
  }

  /** An ancestor fieldset (or own `disabled`) changed. */
  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled
    this.formController?.onFormDisabled?.(disabled)
  }

  /** The current controller's form callbacks, if it has them (a `FormElement`, or `UIButton`). */
  private get formController(): Partial<FormCallbacks> | undefined {
    return this.controller as Partial<FormCallbacks> | undefined
  }
}

/** What a controller implements to hear the host's form callbacks. */
type FormCallbacks = {
  /** `formResetCallback` */
  formReset(): void
  /** `formDisabledCallback` */
  onFormDisabled(disabled: boolean): void
}
