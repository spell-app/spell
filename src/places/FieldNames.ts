/**
 * How a server spells a field's name:  each style, by an example of it.
 * - `snake`:  `hair_color`, `camel`:  `hairColor`, `pascal`:  `HairColor`, `kebab`:  `hair-color`, `words`:  `Hair Color`
 */
export type NameStyle = "snake" | "camel" | "pascal" | "kebab" | "words"

/** A name that's ours as it is:  a plain word, or camelCase. */
const PLAIN_NAME = /^[a-z][a-zA-Z0-9]*$/

/** Where one word of a name ends and the next starts:  `_`, `-`, a space, or a capital after a small letter or digit. */
const WORD_BREAK = /[\s_-]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/

/** Our name for a row's id. */
const ID = "id"

/** Spell's two times, as a program names a server's field to be one (epic `data` T57). */
const TIMES = ["created", "modified"]

/**
 * A name a program gave as plain words, `"created at"`:  it finds the field however the server spells those words.
 * - Any other name, `"created_at"` or `"Dish Name"`, is that spelling exactly.
 */
const NAMED_IN_WORDS = /^[a-z0-9]+(?: [a-z0-9]+)+$/

/****************
 * ### `FieldNames`
 * One collection's field names:  ours (`hairColor`, what compiled Spell calls them) and the server's (`hair_color`).
 * - A server field matches ours by its WORDS:  `hair_color`, `hairColor`, `HairColor` and `Hair Color` all read as `hairColor`.
 *   So a program says `its "hair color" is text`, and nothing about how the server spells it.
 * - `named`:  the names a program gave by hand (`stored as "avg_ht"`), which win.
 *   - One given as plain words (`its "created at"`) finds the server's spelling of them, `created_at` or `createdAt`:
 *     the exact words first, else the first spelling it reads.
 * - It remembers each spelling it reads, and writes under it:  a save goes back as the server spelled it.
 * - A field named to be our `id` (`its id is its "login"`) reads as itself too, `login`,
 *   unless the row has one already.
 * - Before it's read anything:  `style`, how the server spells names (`it writes names like "hair_color"`), else ours.
 * - A sheet's columns, known before a row is read:  `FieldNames.ofColumns()`.
 * - NEVER throws.
 ****************/
export class FieldNames {
  /** Theirs, by ours:  what a program named, then what it's read. */
  private readonly theirs = new Map<string, string>()
  /** Ours, by theirs. */
  private readonly ours = new Map<string, string>()
  /** Names a program gave in plain words, by those words, until a spelling of them turns up:  see `NAMED_IN_WORDS`. */
  private readonly namedInWords = new Map<string, string>()

  constructor(
    named: Readonly<Record<string, string>> = {},
    /** How the server spells a name it hasn't been seen to spell yet. */
    private readonly style?: NameStyle
  ) {
    for (const [our, their] of Object.entries(named)) {
      this.pair(our, their)
      if (NAMED_IN_WORDS.test(their)) this.namedInWords.set(their, our)
    }
  }

  /**
   * The names of a sheet's `columns`, each known before anything's written.
   * - `named`:  the columns a program's lines name, by our names
   * - `asWritten`:  the fields that keep their name:  the id column, which a place's `idOf` says as it's written
   */
  static ofColumns(
    columns: Iterable<string>,
    named: Readonly<Record<string, string>> = {},
    asWritten: Iterable<string | undefined> = []
  ): FieldNames {
    const names = new FieldNames(named)
    for (const field of asWritten) if (field !== undefined) names.pair(field, field)
    names.note(columns)
    return names
  }

  /**
   * Of `fields`, those a sheet has a column for under that very word, which no line of the program's named:
   * what Spell may write there by itself, so it never adds a column, or writes one a program only reads (epic `data` T57).
   */
  columnsHeld(fields: readonly string[], named: Readonly<Record<string, string>> = {}): string[] {
    return fields.filter((field) => this.theirs.has(field) && !(field in named))
  }

  /** Of `fields`, those every sheet read so far holds (`columnsHeld()`):  a place says one answer for all its sheets. */
  static columnsHeldInEvery(
    sheets: Iterable<readonly [FieldNames, Readonly<Record<string, string>> | undefined]>,
    fields: readonly string[]
  ): string[] {
    let held: string[] | undefined
    for (const [names, named] of sheets) held = names.columnsHeld(held ?? fields, named)
    return held ?? []
  }

  /** Remember how each of `columns` is spelled, for writing:  a sheet's header, or a schema. */
  note(columns: Iterable<string>): void {
    const names = [...columns]
    this.keepNamesFoundExactlyIn(names)
    for (const column of names) if (column) this.ourName(column)
  }

  /** SIDE EFFECT:  a name given in words that `fields` holds exactly looks no further:  the exact words come first. */
  private keepNamesFoundExactlyIn(fields: readonly string[]): void {
    if (this.namedInWords.size) for (const field of fields) this.namedInWords.delete(field)
  }

  /** Our name for the server's field `their`;  its spelling remembered, for writing. */
  ourName(their: string): string {
    const our = this.ours.get(their) ?? this.namedByItsWords(their) ?? ourNameFor(their)
    if (!this.theirs.has(our)) this.pair(our, their)
    return our
  }

  /**
   * Ours, if `their` is the first spelling seen of a name a program gave in words:
   * `a recipe's created is its "created at"` finds `created_at`, and remembers that's how it's spelled.
   * - One field a time:  a second spelling of the same words is a field of its own.
   */
  private namedByItsWords(their: string): string | undefined {
    if (!this.namedInWords.size) return undefined
    const words = wordsOf(their).join(" ")
    const our = this.namedInWords.get(words)
    if (our === undefined) return undefined
    this.namedInWords.delete(words)
    this.pair(our, their)
    return our
  }

  /** `row` from the server, each field by our name;  each spelling remembered, for writing. */
  fromServer(row: Readonly<Record<string, unknown>>): Record<string, unknown> {
    this.keepNamesFoundExactlyIn(Object.keys(row))
    const read: Record<string, unknown> = {}
    for (const [their, value] of Object.entries(row)) {
      const our = this.ourName(their)
      // two of the server's spellings for one of ours:  the one named, else the first, wins
      if (our in read && this.theirs.get(our) !== their) continue
      read[our] = value
    }
    // a field that's its id is still itself too:  GitHub's user `login`, Wikipedia's `title`, which a page shows
    const theirId = this.theirs.get(ID)
    if (theirId !== undefined && theirId in row) read[ourNameFor(theirId)] ??= row[theirId]
    // so is one that's named as one of Spell's two times:  `a post's created is its "created at"`, and `its created at` still reads
    for (const time of TIMES) {
      const theirTime = this.theirs.get(time)
      if (theirTime !== undefined && theirTime in row) read[ourNameFor(theirTime)] ??= row[theirTime]
    }
    return read
  }

  /** `row`, each field as the server spells it. */
  toServer(row: Readonly<Record<string, unknown>>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(row).map(([our, value]) => [this.serverName(our), value]))
  }

  /** What the server calls our field `our`. */
  serverName(our: string): string {
    const their = this.theirs.get(our)
    if (their === undefined) return this.style ? theirNameFor(our, this.style) : our
    // named in words, and no spelling of them seen yet:  the server's style, else ours
    if (!this.namedInWords.has(their)) return their
    return this.style ? theirNameFor(ourNameFor(their), this.style) : ourNameFor(their)
  }

  /** `our` is `their` on the server, both ways. */
  private pair(our: string, their: string): void {
    this.theirs.set(our, their)
    this.ours.set(their, our)
  }
}

/** The style `example` is written in:  `hair_color` => `snake`.  One word says nothing:  `undefined`. */
export function nameStyleLike(example: string): NameStyle | undefined {
  const name = example.trim()
  if (name.includes("_")) return "snake"
  if (name.includes("-")) return "kebab"
  if (/\s/.test(name)) return "words"
  if (/^[A-Z][a-z]/.test(name)) return "pascal"
  if (/^[a-z][a-z0-9]*[A-Z]/.test(name)) return "camel"
  return undefined
}

/**
 * Our name for the server's field `their`, by its words:  `hair_color`, `HairColor`, `Hair Color` => `hairColor`.
 * - A plain word or a camelCase name stays as it is:  `url`, `episodeId`.
 * - All capitals is one word:  `MGLT` => `mglt`.
 */
export function ourNameFor(their: string): string {
  if (PLAIN_NAME.test(their)) return their
  const words = wordsOf(their)
  if (!words.length) return their
  return words.map((word, index) => (index ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join("")
}

/** What a server writing names in `style` calls our field `our`:  `hairColor`, `snake` => `hair_color`. */
export function theirNameFor(our: string, style: NameStyle): string {
  const words = wordsOf(our)
  if (style === "snake") return words.join("_")
  if (style === "kebab") return words.join("-")
  if (style === "words") return words.map(capitalized).join(" ")
  if (style === "pascal") return words.map(capitalized).join("")
  return our
}

/** The words of a name, in small letters:  `hair_color`, `hairColor`, `MGLT` => `["hair", "color"]`, `["mglt"]`. */
function wordsOf(name: string): string[] {
  return name
    .trim()
    .split(WORD_BREAK)
    .filter((word) => word)
    .map((word) => word.toLowerCase())
}

/** `word` with a capital first letter. */
function capitalized(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
