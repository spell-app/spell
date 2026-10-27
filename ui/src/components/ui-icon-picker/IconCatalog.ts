import { E } from "spell/ui/core"

/****************
 * ### `IconCatalog`
 * The icons an `<ui-icon-picker>` offers, how they're grouped, and how a search finds them.
 *
 * - Its icons are every icon the PICKER's icon packs know:
 *   its nearest `<ui-root icons>`'s, else the page's (`IconGlyph.packsFor()`), whatever names they take there.
 *   - ONE choice per glyph (per SVG file), so the Fomantic pack's names over Font Awesome's files add no copies:
 *     each name goes to the glyph it draws on this page (the last pack that has it wins, as `UI.icons` resolves it).
 *   - A choice is labelled by its file's own name when it has it (`address book`), else its first name;
 *     its other names are found by a search too.
 *   - Sorted by that name, A-Z.
 * - Grouped by Font Awesome's own categories (`groupsOf()`):  Accessibility, Alert ... Writing, in its order,
 *   A-Z within each;  a glyph in none goes last, under "Other" (the picker's word for it).
 *   - A glyph in several categories is in EACH, as on Font Awesome's own site:
 *     someone looking through Weather expects every weather glyph there, not only those no earlier category took.
 *   - A pack of other glyphs (not Font Awesome's files) is all "Other".
 * - A search matches, best first:
 *   - a name that IS the query, then names starting with it, then names holding it
 *   - then Font Awesome's search terms for the glyph's file (`envelope` for `mail`)
 * - The categories and the terms are ONE file, `spell/ui/icons/data/search.json` (`IconSearchFile`):
 *   ~110 KB, so it's loaded (`searchWords()`) only as a picker first opens, once per page.
 * - STATIC and instance-free on purpose:  a page's packs are the page's, and the search words are one file;
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
  // ## Groups
  ////////////////

  /**
   * `choices` in Font Awesome's `categories`, in their order (see the class doc);  those in none last, "Other".
   * - "Other" has no `label`:  the picker words it, in its own language.
   * - A category with none of `choices` is left out, and so is "Other" when every choice has a category.
   */
  static groupsOf(choices: readonly IconChoice[], categories: readonly IconCategory[]): readonly IconGroup[] {
    const other: IconGroup & { choices: IconChoice[] } = { id: OTHER_GROUP, choices: [] }
    const groups = [...categories.map(({ id, label }) => ({ id, label, choices: [] as IconChoice[] })), other]
    // each file's groups' lists, so a choice finds every group it's in at once
    const listsOfFile = new Map<string, IconChoice[][]>()
    for (const [at, category] of categories.entries()) {
      for (const file of category.files) {
        const lists = listsOfFile.get(file)
        if (lists) lists.push(groups[at].choices)
        else listsOfFile.set(file, [groups[at].choices])
      }
    }
    // `choices` are A-Z, so each group is too
    for (const choice of choices) for (const list of listsOfFile.get(choice.file) ?? [other.choices]) list.push(choice)
    return groups.filter((group) => group.choices.length)
  }

  ////////////////
  // ## Search words
  ////////////////

  /**
   * Font Awesome's search terms and categories (`IconSearchWords`), from `search.json`:  loaded on the first call,
   * once per page.
   * - NEVER rejects:  words that won't load are none (names still match, the grid isn't grouped),
   *   and the next call tries again.
   */
  static searchWords(): Promise<IconSearchWords> {
    IconCatalog.loading ??= import("spell/ui/icons/data/search.json").then(
      (module) => IconCatalog.wordsOf(module.default as E.IconSearchFile),
      () => {
        IconCatalog.loading = undefined
        return NO_WORDS
      }
    )
    return IconCatalog.loading
  }

  /** The search words' load, once started. */
  private static loading?: Promise<IconSearchWords>

  /** `search.json`, its categories' icons turned back into file names (`IconSearchFileCategory`). */
  private static wordsOf(file: E.IconSearchFile): IconSearchWords {
    const files = Object.keys(file.terms)
    const categories = file.categories.map(({ id, label, icons }) => {
      let place = 0
      return { id, label, files: icons.map((gap) => files[(place += gap)]) }
    })
    return { terms: file.terms, categories }
  }

  ////////////////
  // ## Search
  ////////////////

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

/** What `searchWords()` loads:  Font Awesome's search terms and categories. */
export type IconSearchWords = {
  /** search terms, by file name */
  readonly terms: IconSearchTerms
  /** Font Awesome's categories, in its order */
  readonly categories: readonly IconCategory[]
}

/** One of Font Awesome's categories. */
export type IconCategory = {
  /** Font Awesome's id:  `charts-diagrams` */
  readonly id: string
  /** Font Awesome's label, in English:  `Charts + Diagrams` */
  readonly label: string
  /** its icons' file names (`chart-pie`), as `IconChoice.file` */
  readonly files: readonly string[]
}

/** A group of the picker's grid:  a category's choices, or "Other". */
export type IconGroup = {
  /** the category's id, or `"other"` */
  readonly id: string
  /** what its heading says:  the category's label;  none for "Other", which the picker words itself */
  readonly label?: string
  /** its choices, A-Z */
  readonly choices: readonly IconChoice[]
}

/** `searchWords()` when the file won't load. */
const NO_WORDS: IconSearchWords = { terms: {}, categories: [] }

/** The id of the group of choices in no category. */
const OTHER_GROUP = "other"

/** `rankOf()`'s "doesn't match". */
const NO_MATCH = 4
