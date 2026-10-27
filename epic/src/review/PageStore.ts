/****************
 * ### `PageStore`
 * The base of a page's STORE:  plain code holding what the page's form or client knows,
 * which tells the elements each time it changes (epic `coherence` P22).
 * - the review inbox's `ReviewClient`, the running agents' `AgentsClient`, Send's `SendCountdown`,
 *   and the answer pages' forms (`AnswerForm`, `ChoicesForm`, `RunForm`)
 * - `version`, bumped on every change (`changed()`), and `subscribe()`:
 *   an element keeps the version in its own state and follows it, so what it reads redraws
 *   (`@E.state accessor version`, then `store.subscribe(() => (this.version = store.version))`)
 * - ONE per page and class:  each subclass's `forPage()` makes it the first time (`onePerPage()`), handed how;
 *   a test makes its own and hands it over (`adopt()`)
 * - Node-safe at import:  touches no browser global;  what a subclass's `forPage()` makes may
 * - Position in the import graph:  imports nothing.  NEVER imports Solid, Spell UI or the `spell-epic` barrel.
 ****************/
export class PageStore {
  /** Bumped on every change:  readers compare it, elements track it. */
  version = 0

  /** Called on every change. */
  private readonly listeners = new Set<() => void>()

  /** Call `listener` on every change;  returns the undo. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Something changed:  `version` up, every listener told. */
  protected changed() {
    this.version++
    for (const listener of this.listeners) listener()
  }

  ////////////////
  // ## One per page
  ////////////////

  /**
   * This class's store for the page:  `make()`'s, made on the first call (browser only, as `make()` reads the page),
   * or again when `fits(current)` says the one made is for something else (a run page's other run).
   * - STATIC:  it finds the page's one before any instance is at hand
   */
  protected static onePerPage<T extends PageStore>(
    this: PageStoreClass<T>,
    make: () => T,
    fits: (current: T) => boolean = () => true
  ): T {
    const current = PageStore.pageStores.get(this) as T | undefined
    if (current && fits(current)) return current
    const made = make()
    PageStore.pageStores.set(this, made)
    return made
  }

  /**
   * Make `store` this class's for the page from now on (`undefined`:  the next `forPage()` makes one):  tests, on a
   * stubbed `fetch`, storage or clock.
   * - STATIC:  as `onePerPage()`
   */
  static adopt<T extends PageStore>(this: PageStoreClass<T>, store: T | undefined) {
    if (store) PageStore.pageStores.set(this, store)
    else PageStore.pageStores.delete(this)
  }

  /** Each class's store for the page, once made:  STATIC, as it's the page's, one per class. */
  private static readonly pageStores = new Map<PageStoreClass<PageStore>, PageStore>()
}

/** A class of `PageStore`s, as `onePerPage()` and `adopt()` see their `this`. */
type PageStoreClass<T extends PageStore> = abstract new (...args: never[]) => T
