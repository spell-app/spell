import type { ChooseModalOptions, Disposer, ModalOptions, ModalProvider } from "./runtime.types"

/****************
 * ### `Modals`
 * Promise-based dialogs, as `UI.modals`:  `confirm()`, `alert()`, `prompt()` -- the Fomantic
 * `$.modal('confirm', ...)` shortcuts -- and `choose()`, a pick from a list.
 * - A thin front door:  the `ui-modal` family registers its provider (`register()`) when it's imported, so the
 *   runtime chunk carries no modal markup.
 * - Until then every method throws, rather than falling back to `window.confirm()` with different behaviour;
 *   `await UI.modals.ready()` first imports the family on a page with a `<ui-root>` that hasn't (`loadFamilyWith()`).
 * - Strings accept plain text or options:  `UI.modals.confirm("Delete?")`.
 ****************/
export class Modals {
  /**
   * The provider rendering dialogs:  set by the `ui-modal` family through `register()`.
   * - STATIC:  one per page, like the runtime;  tests set and clear it without reaching the instance.
   */
  static provider?: ModalProvider

  /**
   * Make `provider` render the dialogs;  returns the undo (which restores the previous one).
   * - Through the INSTANCE (`UI.modals.register()`):  a component can't reach the class, which lives in the lazy
   *   runtime chunk (the barrel exports it as a type only).
   */
  register(provider: ModalProvider): Disposer {
    const previous = Modals.provider
    Modals.provider = provider
    return () => {
      if (Modals.provider === provider) Modals.provider = previous
    }
  }

  /** How this page imports the `ui-modal` family:  `loadFamilyWith()`. */
  private familyLoader: (() => Promise<unknown>) | undefined

  /** Say how to import the `ui-modal` family, for a page that doesn't define it up front:  `RootLoader` does. */
  loadFamilyWith(loader: () => Promise<unknown>): void {
    this.familyLoader = loader
  }

  /**
   * Resolves once a dialog can show, importing the `ui-modal` family the first time it's needed (as `UI.toasts.ready()`).
   * - for a component pack's element, which can't import the family itself (`PACK_MODULES`)
   * - rejects if the family can't be imported;  a page with no way to import it resolves, and a dialog says what's wrong
   */
  async ready(): Promise<void> {
    if (!Modals.provider) await this.familyLoader?.()
  }

  /** Resolves `true` on approve, `false` on deny / dismiss. */
  confirm(options: ModalOptions | string): Promise<boolean> {
    return this.registeredProvider.confirm(this.optionsFor(options))
  }

  /** Resolves once acknowledged. */
  alert(options: ModalOptions | string): Promise<void> {
    return this.registeredProvider.alert(this.optionsFor(options))
  }

  /** Resolves with the entered text, or `undefined` on deny / dismiss. */
  prompt(options: ModalOptions | string): Promise<string | undefined> {
    return this.registeredProvider.prompt(this.optionsFor(options))
  }

  /**
   * Resolves with the positions of the rows picked, or `undefined` on deny / dismiss (epic `language` P66).
   * - One:  a row picks itself;  several (`options.several`):  each row turns on and off, and OK picks them.
   */
  choose(options: ChooseModalOptions): Promise<number[] | undefined> {
    return this.registeredProvider.choose(options)
  }

  /** `Modals.provider`;  throws until the `ui-modal` family has registered one. */
  private get registeredProvider(): ModalProvider {
    if (!Modals.provider) {
      throw new Error("UI.modals:  ui-modal not registered;  import its family (`spell/ui/ui-modal`) first")
    }
    return Modals.provider
  }

  /** Options for `input`:  a bare string is the message. */
  private optionsFor(input: ModalOptions | string): ModalOptions {
    return typeof input === "string" ? { message: input } : input
  }
}
