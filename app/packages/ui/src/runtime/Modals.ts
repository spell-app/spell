import type { ModalOptions, ModalProvider } from "./runtime.types"

/**
 * Promise-based dialogs, as `UI.modals`:  `confirm()`, `alert()`, `prompt()` -- the Fomantic
 * `$.modal('confirm', ...)` shortcuts.
 * - A thin front door:  the `ui-modal` component registers itself as `Modals.provider` when it's defined,
 *   so the runtime chunk carries no modal markup.
 * - Until then every method throws, rather than falling back to `window.confirm()` with different behaviour.
 * - Strings accept plain text or options:  `UI.modals.confirm("Delete?")`.
 */
export class Modals {
  /** set by the modal component on definition */
  static provider?: ModalProvider

  /** Resolves `true` on approve, `false` on deny / dismiss. */
  confirm(options: ModalOptions | string): Promise<boolean> {
    return this.provider.confirm(this.options(options))
  }

  /** Resolves once acknowledged. */
  alert(options: ModalOptions | string): Promise<void> {
    return this.provider.alert(this.options(options))
  }

  /** Resolves with the entered text, or `null` on deny / dismiss. */
  prompt(options: ModalOptions | string): Promise<string | null> {
    return this.provider.prompt(this.options(options))
  }

  /** The registered provider, or a helpful error. */
  private get provider(): ModalProvider {
    if (!Modals.provider) throw new Error("ui-modal not registered:  import the modal component first")
    return Modals.provider
  }

  /** Accept a bare message string. */
  private options(options: ModalOptions | string): ModalOptions {
    return typeof options === "string" ? { message: options } : options
  }
}
