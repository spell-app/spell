import { P } from "spell/parser/parser"

/**
 * What one file's parse looked up in shared state:  every name it asked a scope list for, every note it asked a type,
 * and every record it found (epic `language` P59).
 * - Why:  after an EARLIER file parses again, a later file whose lookups all find the same records needn't parse
 *   again;  `P.IncrementalProject` keeps it, its changes put back onto the earlier file's new records.
 * - Filled while `P.IncrementalParse` parses its file, as `P.ScopeList.outline`:
 *   - `ScopeList.get()` notes the list and the key it was asked, at each list it falls through to,
 *     and what it found there
 *   - a type's own lookups note the type and a key of their own:  `TypeScope.knowsPropertyAhead()` (`ahead:<name>`),
 *     spell's `NewThing.namesGiven()` (`named:<name>`)
 * - Generous:  a lookup by a line that's since been re-parsed stays noted until the whole file parses again.
 *   One noted too many can only make the file parse again when it needn't.
 *   - But held WEAKLY (epic `solid-2-final` P10):  a list or record nothing else holds any more, an old line's,
 *     is let go;  no diff can name it, so forgetting it changes no answer.
 * - Knows nothing of files or projects:  `P.ParseDiff` says what changed, and asks `isAffectedBy()`.
 */
export class Outline {
  /**
   * Each list (or type) asked, and the keys it was asked for.
   * - `undefined` among them:  asked for every item, `list.get()` with no key.
   * - A test:  looked through every item for those it passes, `list.scan(test)`.
   * - A test and what it found:  asked if any item passes, `list.some(test)`.
   */
  private lookups = new WeakMap<object, Set<OutlineKey>>()

  /**
   * The owner of each list asked (a type, for its members):  its change affects us too.
   * - Weak, as `lookups` is:  a list of a line parsed again since, e.g. an old method's scope, is let go
   *   (epic `solid-2-final` P10:  kept, every edit typed kept the old lines' scopes, and their parses).
   */
  private owners = new WeakSet<object>()

  /**
   * Every record a lookup found.
   * - Weak:  a record of a line parsed again since is let go, as nothing asks for it any more
   *   (epic `solid-2-final` P10:  kept, every edit typed kept its line's old parse).
   */
  private found = new WeakSet<object>()

  /** Note that `list` (or a type) was asked for `key` -- see `lookups` -- and found `item`. */
  lookedUp(list: object, key: OutlineKey, item?: unknown): void {
    let keys = this.lookups.get(list)
    if (!keys) {
      this.lookups.set(list, (keys = new Set()))
      const owner = (list as { props?: P.ScopeListProps }).props?.target as object | undefined
      if (owner) this.owners.add(owner)
    }
    keys.add(key)
    if (item && typeof item === "object") this.found.add(item)
  }

  /** Forget everything:  the file parses from scratch. */
  clear(): void {
    this.lookups = new WeakMap()
    this.owners = new WeakSet()
    this.found = new WeakSet()
  }

  /**
   * Run `parse` noting its lookups in us, then put back whoever was noting before.
   * - Returns what `parse` returned.
   */
  noting<T>(parse: () => T): T {
    const before = P.ScopeList.outline
    P.ScopeList.outline = this
    try {
      return parse()
    } finally {
      P.ScopeList.outline = before
    }
  }

  /**
   * Would our file's lookups find something else after `diff`'s changes?
   * - A key it asked for changed;  or any, when it asked for every item;
   *   or one a test of its passes, then or now, when it looked through them (`P.ScopeList.scan()`).
   * - Or a record it found, or a list's owner it asked, changed itself:  e.g. a type's `superType`.
   */
  isAffectedBy(diff: P.ParseDiff): boolean {
    // read from the diff's side:  what we noted is weak, so it can't be listed
    for (const [list, changed] of diff.changedKeys) {
      for (const key of this.lookups.get(list) ?? []) {
        if (isAffected(key, changed, diff.changedItems.get(list))) return true
      }
    }
    for (const record of diff.changedRecords) {
      if (this.lookups.has(record) || this.owners.has(record) || this.found.has(record)) return true
    }
    return false
  }
}

/** A key an outline notes:  see `Outline.lookups`. */
export type OutlineKey = string | undefined | OutlineTest | { test: OutlineTest; found: unknown }

/** Would the lookup `key` find something else, `changed` the keys of its list that changed, `items` their records? */
function isAffected(key: OutlineKey, changed: Set<OutlineKey>, items: Set<unknown> | undefined): boolean {
  if (key === undefined || typeof key === "string") return key === undefined || changed.has(key)
  if (typeof key === "function") return passes(key, items)
  // `some()`:  what it found changed, or it found nothing and a record that changed passes
  return key.found === undefined ? passes(key.test, items) : !!items?.has(key.found)
}

/** What `P.ScopeList.scan()` looks for:  would `item` matter to the caller? */
export type OutlineTest = (item: any) => boolean

/** Does `test` pass any of `items`?  A test that throws passes:  it can't say the item doesn't matter. */
function passes(test: OutlineTest, items: Iterable<unknown> | undefined): boolean {
  for (const item of items ?? []) {
    try {
      if (test(item)) return true
    } catch {
      return true
    }
  }
  return false
}
