import { Warnings } from "spell/ui/util"

import type { Disposer, ToastHandle, ToastOptions, ToastProvider } from "./runtime.types"

/****************
 * ### `Toasts`
 * Programmatic toasts, as `UI.toasts` (and the `UI.toast()` shortcut).
 * - A thin front door:  the `ui-toast` family registers its provider (`register()`) when it's imported, so the
 *   runtime chunk carries no toast markup or CSS.
 * - Each toast loads its own code:  `show()` before the family is in hands back its handle at once, and shows the
 *   toast once `ready()` has imported it (`loadFamilyWith()`), so no caller has to remember.
 *   - That handle has no `element`;  its `id` and `closed` work as a shown toast's do, and `dismiss(id)` before it
 *     shows means it never does.
 * - A page with no way to import it:  `show()` throws, rather than silently dropping a message.
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

  /** Toasts asked for before the family was in, by id:  `dismiss()` before they show takes them back. */
  private readonly waiting = new Set<string>()

  /** Ids of `waiting` toasts given none:  `waitingId()`. */
  private waitingCount = 0

  /**
   * Show a toast;  see `ToastOptions`.
   * - Before the `ui-toast` family is in:  imports it (`ready()`), then shows the toast (`showOnceReady()`).
   */
  show(options: ToastOptions): ToastHandle {
    if (Toasts.provider || !this.familyLoader) return this.registeredProvider.show(options)
    return this.showOnceReady(options)
  }

  /** Remove toast `id` early;  a toast still waiting for the family never shows. */
  dismiss(id: string) {
    if (this.waiting.delete(id)) return
    Toasts.provider?.dismiss(id)
  }

  /**
   * A handle for `options` now, and the toast once `ready()` has imported the family.
   * - `closed` follows the toast shown;  it resolves at once when the toast is dismissed first, or can't show
   *   (a warning on the console says why).
   */
  private showOnceReady(options: ToastOptions): ToastHandle {
    const id = options.id ?? this.waitingId()
    this.waiting.add(id)
    const closed = this.ready()
      .then(() => {
        if (!this.waiting.delete(id)) return
        return this.registeredProvider.show({ ...options, id }).closed
      })
      .catch((error: unknown) => {
        this.waiting.delete(id)
        Warnings.warn("UI.toasts", "can't show a toast", error)
      })
    return { id, closed }
  }

  /** An id for a waiting toast given none:  unique on the page, as the provider's own are. */
  private waitingId(): string {
    return `${WAITING_ID_PREFIX}${++this.waitingCount}`
  }

  /** `Toasts.provider`;  throws when the `ui-toast` family hasn't registered one. */
  private get registeredProvider(): ToastProvider {
    if (!Toasts.provider) {
      throw new Error("UI.toasts:  ui-toast not registered;  import its family (`spell/ui/ui-toast`) first")
    }
    return Toasts.provider
  }
}

/** Prefix of the ids `Toasts` gives toasts asked for before the family was in. */
const WAITING_ID_PREFIX = "ui-toast-waiting-"
