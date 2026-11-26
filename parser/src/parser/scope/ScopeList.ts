import type { P } from "spell/parser/parser"

/**
 * Ordered list of `ListType` items in a scope, e.g. its `variables`, keyed by a `keyProp` on each item for
 * `get()` / `replace()` lookup.
 * - Optionally chains to a "parent" list (via `target` / `parentProp`) so an unresolved `get()` here
 *   falls through to the parent -- e.g. a `BlockScope`'s `variables` list falls through to
 *   `parentScope.variables`, so nested scopes see outer-scope declarations.
 * - `InputType` lets `add()` / `replace()` accept raw input (e.g. plain props) that gets normalized
 *   to `ListType` via `transformer`.
 * - SIDE EFFECT: `add()` / `replace()` record themselves in `target.parser.journal`, if there is one, so
 *   incremental parsing can take them back -- see `P.ParseJournal`.  They swap in a NEW items array
 *   rather than changing the old one:  undo swaps the old one back.
 *   - Redo adds the same items again, onto the items as they are THEN (epic `language` P59):
 *     so a later file's records go back after an earlier file's NEW ones -- see `P.IncrementalProject`.
 * - SIDE EFFECT: while a file parses, `get()` notes what it looked up in its `P.Outline` (`ScopeList.outline`):
 *   after an earlier file changes, a file whose lookups all find the same is kept.
 */
export class ScopeList<ListType = any, InputType = ListType> {
  /**
   * What the file parsing now looks up, if anyone's asking -- see `P.Outline`.
   * - Set by `P.IncrementalParse` while it parses;  `undefined` the rest of the time, and nothing's noted.
   */
  static outline: P.Outline | undefined

  /** Backing array of items, in insertion order.  NEVER changed in place -- see above. */
  #items: readonly ListType[] = []

  /**
   * Each item's normalized key, worked out once:  `get()` reads every item's key on every lookup.
   * - An item's key never changes once it's in a list:  each record sets its name in its constructor.
   */
  #keys = new WeakMap<object, string | undefined>()

  /**
   * Each key's first item, for the items as they are now:  so `get()` needn't look through them all.
   * - Made on the first lookup after a change;  an add (to the end) extends it, else it's made again.
   * - First wins, as `get()`'s `find()` did:  an item later in the list with the same key is never found by it.
   * - NOT aliases:  a type's can change after it's in the list (`TypeScope.claim()`), so `getByAlias()` looks.
   */
  #index: ScopeIndex<ListType> | undefined

  /** `props.parentProp` split at its dots, e.g. `["parentScope", "variables"]`, so `parent` needn't parse it. */
  #parentPath: string[] | undefined

  /** Props this instance was constructed with -- see `ScopeListProps`. */
  props: ScopeListProps

  /** Throws if `keyProp` is missing, or if `parentProp` is passed without `target`. */
  constructor(props: ScopeListProps) {
    if (!props || !props.keyProp) throw new TypeError("new ScopeList() must be passed at least `{ keyProp }`.")
    if (props.parentProp && !props.target)
      throw new TypeError("new ScopeList() must pass `target` if you're passing parentProp.")

    this.props = props
    this.#parentPath = props.parentProp?.split(".")
  }

  /** Return our `parent`. */
  get parent(): ScopeList | undefined {
    let parent = this.props.target
    if (!parent || !this.#parentPath) return undefined
    for (const step of this.#parentPath) parent = parent?.[step]
    return parent
  }

  /** Given an `item`, return its normalized key in our list. */
  getKeyFor(item: ListType): string | undefined {
    if (!item) return undefined
    if (typeof item !== "object") return this.normalizeKey((item as Record<string, any>)[this.props.keyProp])
    if (this.#keys.has(item)) return this.#keys.get(item)
    const key = this.normalizeKey((item as Record<string, any>)[this.props.keyProp])
    this.#keys.set(item, key)
    return key
  }

  /**
   * Get first item by (normalized) `key`.
   * - By default, if not found locally, recursively checks `parent`'s list (if any).
   * - Pass `LOCAL_ONLY` to only search this list's own items, skipping the parent chain.
   * - With no `key`, returns ALL our own items.  NEVER change that array -- see class docs.
   * - With an `aliasProp`, an item's alias finds it too, after every key in this list, e.g. a type's short name.
   */
  get(): readonly ListType[]
  get(key: string, localOnly?: "LOCAL_ONLY"): ListType
  get(key?: string, localOnly?: "LOCAL_ONLY") {
    if (key === undefined) {
      ScopeList.outline?.lookedUp(this, undefined)
      return this.#items
    }
    key = this.normalizeKey(key)
    const index = this.indexed()
    const item = index.keys.get(key) ?? this.getByAlias(key)
    ScopeList.outline?.lookedUp(this, key, item)
    if (!item && !localOnly) return this.parent?.get(key)
    return item
  }

  /**
   * ALL our own items, for a caller looking through them for those `test` passes -- e.g. every property listing a value.
   * - Same as `get()` with no key, but an outline notes only `test`, not every item:
   *   after an earlier file changes, a file is kept if no item that changed passes it (`P.Outline`, epic `language` P59).
   * - `test`:  would this item matter to the caller?  Generous is fine:  one passed too many only re-parses a file.
   * - NEVER change the array -- see the class.
   */
  scan(test: (item: ListType) => boolean): readonly ListType[] {
    ScopeList.outline?.lookedUp(this, test as P.OutlineTest)
    return this.#items
  }

  /**
   * Does `test` pass any of our own items?  As `scan(test).some(test)`, but an outline notes the item it found:
   * after an earlier file changes, a file is kept if that item didn't change, or, when it found none,
   * if no item that changed passes (`P.Outline`, epic `language` P59).
   */
  some(test: (item: ListType) => boolean): boolean {
    const found = this.#items.find(test)
    ScopeList.outline?.lookedUp(this, { test: test as P.OutlineTest, found })
    return found !== undefined
  }

  /** Our own item whose alias is (normalized) `key`, if we have an `aliasProp`. */
  private getByAlias(key: string): ListType | undefined {
    const { aliasProp } = this.props
    if (!aliasProp) return undefined
    return this.#items.find((it) => {
      const alias = (it as Record<string, any>)[aliasProp]
      return alias !== undefined && key === this.normalizeKey(alias)
    })
  }

  /** Our index, for our items as they are now -- see `#index`. */
  private indexed(): ScopeIndex<ListType> {
    if (this.#index?.items === this.#items) return this.#index
    const index: ScopeIndex<ListType> = { items: [], keys: new Map() }
    this.indexInto(index, this.#items)
    return (this.#index = index)
  }

  /** SIDE EFFECT:  `items`, now at the end of `index.items`, go in `index`, each key's first item kept. */
  private indexInto(index: ScopeIndex<ListType>, items: readonly ListType[]): void {
    for (const item of items) {
      const key = this.getKeyFor(item)
      if (!index.keys.has(key)) index.keys.set(key, item)
    }
    index.items = this.#items
  }

  /**
   * Add one or more `items` to end of our list, running each through `transformer` first.
   * - SIDE EFFECT: an item with a `declaredBy` match is noted on it too -- see `noteDeclared()`.
   */
  add(...items: Array<ListType | InputType>) {
    const transformed = items.map(this.transform)
    this.change(transformed, (current) => [...current, ...transformed], undefined, true)
    for (const item of transformed) ScopeList.noteDeclared(item)
    return transformed
  }

  /**
   * Note scope record `item` on the match which declared it, `item.declaredBy`, as `match.data.declared`.
   * - Why:  so compiling that statement can say what it declared, inline -- see `SP.SpellDeclarations`.
   *   A lookup after the fact would break `getAST()`'s rule:  NEVER look up scope, it may have moved on.
   * - Live records:  read them when compiling, e.g. a type claimed later has a new `declaredBy`.
   * - `TypeScope.claim()` notes its type the same way.
   */
  static noteDeclared(item: unknown) {
    const { declaredBy } = (item ?? {}) as { declaredBy?: unknown }
    if (!declaredBy || typeof declaredBy !== "object" || !("data" in declaredBy)) return
    const data = (declaredBy as { data: { declared?: unknown[] } }).data
    const declared = (data.declared ??= [])
    if (!declared.includes(item)) declared.push(item)
  }

  /**
   * Replace an item with the same `key` if found, otherwise add it.
   * - NOTE: we place the new item at the end.
   * - TODO: add in the same place?
   */
  replace(...items: Array<ListType | InputType>) {
    const transformed = items.map(this.transform)
    this.change(
      transformed,
      (current) => {
        let next = current
        for (const item of transformed) {
          const key = this.getKeyFor(item)
          next = [...next.filter((it) => this.getKeyFor(it) !== key), item]
        }
        return next
      },
      true
    )
    return transformed
  }

  /**
   * Swap in the items `apply` makes of ours, recording it in our scope's journal (if any) so it can be undone.
   * - Redone, it's applied to our items as they are then:  see the class.
   */
  private change(
    items: ListType[],
    apply: (current: readonly ListType[]) => readonly ListType[],
    replace?: true,
    appended?: true
  ) {
    let previous = this.#items
    const redo = () => {
      previous = this.#items
      this.#items = apply(previous)
      // added to the end of items the index has:  it takes them too, else it's made again when it's next needed
      const index = this.#index
      if (appended && index?.items === previous) this.indexInto(index, items)
    }
    redo()
    const journal = (this.props.target as P.Scope | undefined)?.parser?.journal
    journal?.record({
      undo: () => (this.#items = previous),
      redo,
      change: { kind: "list", list: this, items, ...(replace && { replace }) }
    })
  }

  /** Normalize `key` via `props.normalizeKey` if provided, e.g. `_.snakeCase`, else pass through unchanged. */
  private normalizeKey(key: string) {
    if (this.props.normalizeKey) return this.props.normalizeKey(key)
    return key
  }

  /** Convert raw `InputType` input to `ListType` via `props.transformer` if provided, else pass through. */
  private transform = (item: ListType | InputType) => {
    if (this.props.transformer) return this.props.transformer(item) as ListType
    return item as ListType
  }
}

/** What `ScopeList` keeps to find an item at once:  see its `#index`. */
type ScopeIndex<ListType> = {
  /** The items it's for:  out of date once they're swapped for others. */
  items: readonly ListType[]
  /** Each (normalized) key's first item. */
  keys: Map<string | undefined, ListType>
}

/** Constructor props for `ScopeList`. */
export type ScopeListProps<ListType = any, InputType = ListType> = {
  /** Name of key to use for index. */
  keyProp: string

  /** Scope we're a list of, e.g. whose `variables` we are.  Required if `parentProp`, and to be journaled. */
  target?: any

  /**
   * Optional name of key which yields instance "parent".
   * - If lookup is not found on this list instance, we'll recursively look up values in parents.
   */
  parentProp?: string

  /** Optional method to use to normalize key. e.g. `_.snakeCase`. */
  normalizeKey?: (key: string) => string

  /**
   * Optional name of a second key, which finds an item too, e.g. `aka` for a type's short name.
   * - Normalized as keys are;  a key always wins over an alias.
   */
  aliasProp?: string

  /** Optional method to transform raw input during `add()`. */
  transformer?: (thing: ListType | InputType) => ListType
}
