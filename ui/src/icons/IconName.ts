// `.ts` extension:  node tooling loads this file directly (`src/tools/IconPackBuilder.ts`)
import { ICON_PREFIX_SEPARATOR } from "./icons.types.ts"

/****************
 * ### `IconName`
 * Icon names:  ONE name per icon, lowercase words separated by single spaces (`address book outline`).
 * - Plain functions of strings, no DOM:  shared by the runtime (`UI.icons`), the node pack builder (which imports
 *   this file by relative path), `spell icon`, `<ui-icon-picker>` and the docs' icon browser.
 *   So it imports nothing but `icons.types`.
 * - The ONE icon search (`search()`), so the same words find the same icons everywhere.
 * - STATIC and instance-free on purpose:  a name is a string, with nothing to hold.
 * - Within one pack, who gets a name (`IconName.claim()`):
 *   - an explicit `alias` beats a name derived from a file name
 *   - otherwise the FIRST entry to claim it keeps it
 *   - Why aliases win:  a hand-edit (or the Fomantic pack) must be able to take a word from a file name, e.g.
 *     alias `shield` on `solid/shield-halved` over the file `solid/shield`.
 ****************/
export class IconName {
  /**
   * `name` as the one canonical spelling:  lowercase, dashes / underscores -> spaces, whitespace collapsed.
   * - So names pasted from Font Awesome's site (`address-book`) work.
   */
  static normalize(name: string): string {
    return name.toLowerCase().replace(SEPARATORS, " ").trim()
  }

  /** Name an index key gives its icon:  its file name, normalized (`solid/address-book` -> `address book`). */
  static fromKey(key: string): string {
    return IconName.normalize(IconName.fileOf(key))
  }

  /**
   * An index key's file name, Font Awesome's spelling:  `solid/address-book` -> `address-book`.
   * - The key of its search terms (`IconSearchFile.terms`).
   */
  static fileOf(key: string): string {
    return key.slice(key.lastIndexOf("/") + 1)
  }

  /** The one name an icon is shown by:  its file's own (`fromKey()`) when it has it, else its first of `names`. */
  static labelOf(key: string, names: readonly string[]): string {
    const own = IconName.fromKey(key)
    return names.includes(own) ? own : (names[0] ?? own)
  }

  /** An entry's `alias` field as a list of normalized names. */
  static aliases(alias: string | string[] | undefined): string[] {
    if (alias === undefined) return []
    return (Array.isArray(alias) ? alias : [alias]).map(IconName.normalize).filter(Boolean)
  }

  /**
   * `prefix:name` split, both normalized.
   * - `prefix`:  the pack id or prefix before the separator (`lucide`);  `undefined` without a separator
   * - `name`:  the icon's name, normalized (`bell`)
   * - Only the FIRST separator splits, so a name itself never contains one.
   */
  static split(name: string): { prefix?: string; name: string } {
    const at = name.indexOf(ICON_PREFIX_SEPARATOR)
    if (at < 0) return { name: IconName.normalize(name) }
    return { prefix: name.slice(0, at).trim().toLowerCase(), name: IconName.normalize(name.slice(at + 1)) }
  }

  /**
   * Name -> index key for every name the entries give, by the rules above.
   * - `entries` in index order.
   */
  static claim(entries: Iterable<[key: string, alias: string | string[] | undefined]>): Map<string, string> {
    const byAlias = new Map<string, string>()
    const byFile = new Map<string, string>()
    for (const [key, alias] of entries) {
      for (const name of IconName.aliases(alias)) if (!byAlias.has(name)) byAlias.set(name, key)
      const derived = IconName.fromKey(key)
      if (derived && !byFile.has(derived)) byFile.set(derived, key)
    }
    for (const [name, key] of byAlias) byFile.set(name, key)
    return byFile
  }

  ////////////////
  // ## Search
  ////////////////

  /**
   * The items of `items` that `query` finds, best first;  all of them, as they are, for an empty query.
   * - The WHOLE query, read as an icon name (`normalize()`):  Font Awesome's `arrow-up` ~== `arrow up`.
   * - Best first (`rankOf()`):  a name that IS it, then names starting with it, then names holding it,
   *   then a search term holding it (`bell` finds `brain` by its term `cerebellum`).
   * - Stable:  within a rank, `items`' own order (A-Z when they are).
   * - `names(item)`:  every name it goes by, aliases too;  `terms(item)`:  its search terms (Font Awesome's)
   */
  static search<Item>(items: readonly Item[], query: string, { names, terms }: IconSearchKeys<Item>): readonly Item[] {
    const wanted = IconName.normalize(query)
    if (!wanted) return items
    const ranked: { item: Item; rank: number }[] = []
    for (const item of items) {
      const rank = IconName.rankOf(names(item), terms(item), wanted)
      if (rank < NO_MATCH) ranked.push({ item, rank })
    }
    // `sort()` is stable
    return ranked.sort((a, b) => a.rank - b.rank).map((entry) => entry.item)
  }

  /** How well an icon with `names` and `terms` matches `wanted` (normalized):  0 best ... `NO_MATCH` none. */
  private static rankOf(names: readonly string[], terms: readonly string[], wanted: string): number {
    let rank = NO_MATCH
    for (const name of names) {
      if (name === wanted) return 0
      if (name.startsWith(wanted)) rank = Math.min(rank, 1)
      else if (name.includes(wanted)) rank = Math.min(rank, 2)
    }
    if (rank < NO_MATCH) return rank
    return terms.some((term) => IconName.normalize(term).includes(wanted)) ? 3 : NO_MATCH
  }
}

/** What `IconName.search()` reads of each item. */
export type IconSearchKeys<Item> = {
  /** every name it goes by, aliases too, normalized */
  names: (item: Item) => readonly string[]
  /** its search terms, as written (Font Awesome's) */
  terms: (item: Item) => readonly string[]
}

/** `rankOf()`'s "doesn't match". */
const NO_MATCH = 4

/** Runs of dashes, underscores and whitespace:  each becomes one space. */
const SEPARATORS = /[\s_-]+/g
