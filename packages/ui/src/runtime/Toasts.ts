import type { ToastHandle, ToastOptions, ToastProvider } from "./runtime.types"

/**
 * Programmatic toasts, as `UI.toasts` (and the `UI.toast()` shortcut).
 * - A thin front door:  the `ui-toast` component does the rendering and registers itself as
 *   `Toasts.provider` when it's defined, so the runtime chunk carries no toast markup or CSS.
 * - Until then `show()` throws, rather than silently dropping a message.
 */
export class Toasts {
  /** set by the toast component on definition */
  static provider?: ToastProvider

  /** Show a toast;  see `ToastOptions`. */
  show(options: ToastOptions): ToastHandle {
    return this.provider.show(options)
  }

  /** Remove toast `id` early. */
  dismiss(id: string) {
    this.provider.dismiss(id)
  }

  /** The registered provider, or a helpful error. */
  private get provider(): ToastProvider {
    if (!Toasts.provider) throw new Error("ui-toast not registered:  import the toast component first")
    return Toasts.provider
  }
}
