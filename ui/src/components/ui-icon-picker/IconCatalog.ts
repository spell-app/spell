import { E } from "spell-ui/core"

/****************
 * ### `IconCatalog`
 * The icons an `<ui-icon-picker>` offers, and how a search finds them.
 *
 * - Its icons are every icon the PICKER's icon packs know:
 *   its nearest `<ui-root icons>`'s, else the page's (`IconGlyph.packsFor()`), whatever names they take there.
 *   - ONE choice per glyph (per SVG file), so the Fomantic pack's names over Font Awesome's files add no copies:
 *     each name goes to the glyph it draws on this page (the last pack that has it wins, as `UI.icons` resolves it).
 *   - A choice is labelled by its file's own name when it has it (`address book`), else its first name;
 *     its other names are found by a search too.
 *   - Sorted by that name, A-Z.
 * - A search matches, best first:
 *   - a name that IS the query, then names starting with it, then names holding it
 *   - then Font Awesome's search terms for the glyph's file (`envelope` for `mail`),
 *     from `spell-ui/icons/data/search.json`:  ~100 KB, so loaded (`terms()`) on the first search only
 * - STATIC and instance-free on purpose:  a page's packs are the page's, and the terms are one file;
 *   each picker holds the list it was given.
 * - Library-neutral:  no Solid, no DOM beyond what `UI.icons` holds, so a test can drive it with any packs.
 ****************/
export class IconCatalog {
  /**
   * The choices `packs` offer, A-Z, once every pack added so far has loaded.
   * - The list is remade only when the packs change (a root's `icons` changed):  same packs, same list.
   * - NEVER rejects:  a pack that failed to load offers nothing.
   */
  static async choicesFor(packs: E.IconPacks): Promise<readonly IconChoice[]> {
    await packs.ready
    const loaded = packs.packs
    const cached = IconCatalog.cache.get(packs)
    if (cached && E.isSameList(cached.packs, loaded)) return cached.choices
    const choices = IconCatalog.choicesOf(loaded)
    IconCatalog.cache.set(packs, { packs: loaded, choices })
    return choices
  }

  /** The choices of `packs`, in order:  one per glyph, named as above. */
  private static choicesOf(packs: readonly E.IconPack[]): IconChoice[] {
    // each name goes to the glyph of the LAST pack that has it, as `UI.icons` resolves a name
    const iconForName = new Map<string, E.IconPackIcon>()
    for (const pack of packs)
      for (const icon of pack.icons()) for (const name of icon.names) iconForName.set(name, icon)
    const choiceForUrl = new Map<string, { name: string; names: string[]; file: string }>()
    for (const [name, icon] of iconForName) {
      const choice = choiceForUrl.get(icon.url)
      if (choice) choice.names.push(name)
      else choiceForUrl.set(icon.url, { name, names: [name], file: IconCatalog.fileOf(icon.key) })
    }
    const choices = [...choiceForUrl.values()]
    for (const choice of choices) {
      const own = choice.file.replaceAll("-", " ")
      if (choice.names.includes(own)) choice.name = own
    }
    return choices.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  }

  /** An index key's file name, Font Awesome's spelling, the search terms' key:  `solid/address-book` => `address-book`. */
  private static fileOf(key: string): string {
    return key.slice(key.lastIndexOf("/") + 1)
  }

  /** The lists made so far, per set of packs, with the packs they were made from. */
  private static readonly cache = new WeakMap<
    E.IconPacks,
    { packs: readonly E.IconPack[]; choices: readonly IconChoice[] }
  >()

  ////////////////
  // ## Search
  ////////////////

  /**
   * Font Awesome's search terms, by file name (`address-book` => `["contact", "directory" ...]`):
   * loaded on the first call, once per page.
   * - NEVER rejects:  terms that won't load are `{}` (names still match), and the next call tries again.
   */
  static terms(): Promise<IconSearchTerms> {
    IconCatalog.loading ??= import("spell-ui/icons/data/search.json").then(
      (module) => module.default as IconSearchTerms,
      () => {
        IconCatalog.loading = undefined
        return {}
      }
    )
    return IconCatalog.loading
  }

  /** The terms' load, once started. */
  private static loading?: Promise<IconSearchTerms>

  /**
   * The choices that match `query`, best first (see the class doc);  all of them for an empty query.
   * - `query` is read as an icon name is (`IconName.normalize()`):  `Address-Book` ~== `address book`.
   * - `terms`:  Font Awesome's search terms, once loaded;  without them, names alone match.
   */
  static matches(choices: readonly IconChoice[], query: string, terms: IconSearchTerms = {}): readonly IconChoice[] {
    const wanted = E.IconName.normalize(query)
    if (!wanted) return choices
    const ranked: { choice: IconChoice; rank: number }[] = []
    for (const choice of choices) {
      const rank = IconCatalog.rankOf(choice, wanted, terms)
      if (rank < NO_MATCH) ranked.push({ choice, rank })
    }
    // `sort()` is stable:  A-Z within a rank
    return ranked.sort((a, b) => a.rank - b.rank).map((entry) => entry.choice)
  }

  /** How well `choice` matches `wanted`:  0 best ... `NO_MATCH` none. */
  private static rankOf(choice: IconChoice, wanted: string, terms: IconSearchTerms): number {
    let rank = NO_MATCH
    for (const name of choice.names) {
      if (name === wanted) return 0
      if (name.startsWith(wanted)) rank = Math.min(rank, 1)
      else if (name.includes(wanted)) rank = Math.min(rank, 2)
    }
    if (rank < NO_MATCH) return rank
    const ownTerms = terms[choice.file] ?? []
    return ownTerms.some((term) => term.toLowerCase().includes(wanted)) ? 3 : NO_MATCH
  }
}

/** One icon a picker offers. */
export type IconChoice = {
  /** what picking it writes, and its label:  its file's own name when it has it, else its first name */
  readonly name: string
  /** every name that reaches this glyph on the page, `name` among them */
  readonly names: readonly string[]
  /** its file's name, Font Awesome's spelling (`address-book`):  the key of its search terms */
  readonly file: string
}

/** Font Awesome's search terms, by file name (`address-book` => `["contact", "directory" ...]`). */
export type IconSearchTerms = Readonly<Record<string, readonly string[]>>

/** `rankOf()`'s "doesn't match". */
const NO_MATCH = 4
