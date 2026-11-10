import type { Disposer, ToastHandle, ToastOptions, ToastProvider } from "./runtime.types"

/****************
 * ### `Toasts`
 * Programmatic toasts, as `UI.toasts` (and the `UI.toast()` shortcut).
 * - A thin front door:  the `ui-toast` family registers its provider (`register()`) when it's imported, so the
 *   runtime chunk carries no toast markup or CSS.
 * - Until then `show()` throws, rather than silently dropping a message.
 ****************/
export class Toasts {
  /**
   * The provider rendering toasts:  set by the `ui-toast` family through `register()`.
   * - STATIC:  one per page, like the runtime;  tests set and clear it without reaching the instance.
   */
  static provider?: ToastProvider

  /**
   * Make `provider` render the toasts;  returns the undo (which restores the previous one).
   * - Through the INSTANCE (`UI.toasts.register()`):  a component can't reach the class, which lives in the lazy
   *   runtime chunk (the barrel exports it as a type only).
   */
  register(provider: ToastProvider): Disposer {
    const previous = Toasts.provider
    Toasts.provider = provider
    return () => {
      if (Toasts.provider === provider) Toasts.provider = previous
    }
  }

  /** How this page imports the `ui-toast` family:  `loadFamilyWith()`. */
  private familyLoader: (() => Promise<unknown>) | undefined

  /** Say how to import the `ui-toast` family, for a page that doesn't define it up front:  `RootLoader` does. */
  loadFamilyWith(loader: () => Promise<unknown>): void {
    this.familyLoader = loader
  }

  /**
   * Resolves once a toast can show, importing the `ui-toast` family the first time it's needed.
   * - So a page that never shows one doesn't pay for it (epic `data` T137).
   * - rejects if the family can't be imported;  a page with no way to import it resolves, and `show()` says what's wrong
   */
  async ready(): Promise<void> {
    if (!Toasts.provider) await this.familyLoader?.()
  }

  /** Show a toast;  see `ToastOptions`. */
  show(options: ToastOptions): ToastHandle {
    return this.registeredProvider.show(options)
  }

  /** Remove toast `id` early. */
  dismiss(id: string) {
    this.registeredProvider.dismiss(id)
  }

  /** `Toasts.provider`;  throws until the `ui-toast` family has registered one. */
  private get registeredProvider(): ToastProvider {
    if (!Toasts.provider) {
      throw new Error("UI.toasts:  ui-toast not registered;  import its family (`spell/ui/ui-toast`) first")
    }
    return Toasts.provider
  }
}
