import { E } from "spell/ui/core"
import type { F } from "spell/ui/forms"

/****************
 * ### `DOMFormControl`
 * The DOM element of a form control (`<ui-dropdown>`, `<ui-input>`, `<ui-checkbox>` ...):
 * it adds the platform's form-control API (`form`, `validity`, `checkValidity()` ...), read from `internals`.
 * - Its component is a `FormComponent`, whose `elementSetup.DOMElement` names this class.
 *   A control's own subclass names its component class (`DOMCheckElement extends F.DOMFormControl<CheckControl>`).
 * - Form association itself is `elementSetup.isAFormControl`
 *   (DOM API `static formAssociated`, set per tag by `UIComponent.define()`).
 * - The browser's form callbacks reach the component as its methods (`onFormReset()`, `onFormDisabled()` ...),
 *   through `DOMElement`.
 *   - A reset clears the component's `isTouched` first:  so no control's `onFormReset()` has to.
 * - `<ui-button type="submit|reset">` is form-associated too, but keeps `DOMElement`:  it needs no value or validity.
 * - Part of the `forms` entry:  extends `E.DOMElement` through the `spell/ui/core` ENTRY, never its leaf.
 *   Safe while this module evaluates, since the core never imports `forms` (see `FormComponent`).
 * - `null` where the platform says it (`form`):  the same API as a native control.
 ****************/
export class DOMFormControl<C extends F.FormComponent<any> = F.FormComponent<any>> extends E.DOMElement<C> {
  /** Form owner;  `null` outside a form, as a native control's. */
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

  /**
   * Its value reaches a form only as it SETTLES (`ui-changed`), never on each keystroke's `input`:
   * a `<ui-search>`, which waits for a pause in typing (`delay`).  Read by the form's binding.
   */
  get settlesItself(): boolean {
    return this.component?.settlesItself ?? false
  }

  /** Valid?  Fires `invalid` when not. */
  checkValidity(): boolean {
    return this.internals.checkValidity()
  }

  /** Valid?  Shows the browser's message when not. */
  reportValidity(): boolean {
    return this.internals.reportValidity()
  }

  /**
   * DOM API:  the form was reset.
   * - The component forgets the interaction (`isTouched`), then restores its starting value (`onFormReset()`).
   */
  formResetCallback() {
    if (this.component) this.component.isTouched = false
    super.formResetCallback()
  }
}
