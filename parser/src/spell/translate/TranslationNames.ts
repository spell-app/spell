import { P } from "spell-parser/parser"
import type { SP } from "spell-parser/spell"
import type { DeclarationStatement, MissingName, NamesData, NamesKind, TranslatedType } from "./translate.types"

/**
 * A project's NAMES DICTIONARY for one other language:  what each name its people chose says there
 * (epic `spanish` P24).
 * - Saved beside the project as `<Project>.<lang>.names.json5`, e.g. `Solitaire.es.names.json5`.
 * - Its sections (`NamesData`):  types (with their gender), names, phrases, texts, comments,
 *   and the genders of the nouns in `names` (epic `spanish` P25).
 * - Beneath its own, the names of the projects it imports (`addImported()`):  looked up, never written to the file.
 * - A lookup that finds nothing notes what it asked for in `missing`, and gives back `undefined`:
 *   the `Translator` keeps the English and marks the line, until a person, or `claude -p`, fills it in.
 * - Pure data:  reading and writing the file is the command's (spell-app's `translateCommand`).
 */
export class TranslationNames {
  /** What a name nobody has translated yet says, in the file. */
  static readonly TODO = "TODO"

  /** Its sections, every one there. */
  readonly data: Required<NamesData>
  /** The language its keys are in, e.g. English. */
  readonly from: SP.Language
  /** The language its values are in, e.g. Spanish. */
  readonly to: SP.Language
  /** Every name asked for and not found since the last `takeMissing()`, in the order asked. */
  missing: MissingName[] = []
  /** The names of the projects it imports, looked up after our own:  see `addImported()`. */
  readonly imported: Required<NamesData> = emptyNames()

  constructor(data: NamesData, { from, to }: { from: SP.Language; to: SP.Language }) {
    this.from = from
    this.to = to
    this.data = {
      types: { ...data.types },
      names: { ...data.names },
      phrases: { ...data.phrases },
      texts: { ...data.texts },
      comments: { ...data.comments },
      genders: { ...data.genders }
    }
  }

  /**
   * The names `statements` (a project's declarations) declare, in its own words, by section:
   * - `types`:  each type's words, `stock pile` (its name is `StockPile`)
   * - `names`:  each property (`rank`), and each value of one (`ace`, `clubs`) and constant (`red`)
   * - `phrases`:  each method's and function's words, quotes off, `is a (rank)`, `turn it face up`, `card setup`
   * - Each once, in the order declared.
   */
  static declaredIn(statements: DeclarationStatement[]): { types: string[]; names: string[]; phrases: string[] } {
    const types = new Set<string>()
    const names = new Set<string>()
    const phrases = new Set<string>()
    const addValues = (values: unknown[] | undefined) =>
      values?.forEach((value) => typeof value === "string" && /\p{L}/u.test(value) && names.add(value))
    for (const statement of statements) {
      if (statement.type) types.add(wordsOfTypeName(statement.type))
      if (statement.property) names.add(unquote(statement.property))
      // a hook nothing calls by its words (`- when created:`, no `output`) is written in the other language's own
      if (statement.name && statement.output && (statement.kind === "method" || statement.kind === "function")) {
        phrases.add(unquote(statement.name))
      }
      addValues(statement.enumeration)
      Object.values(statement.values ?? {}).forEach(addValues)
      addValues(statement.constants)
    }
    return { types: [...types], names: [...names], phrases: [...phrases] }
  }

  /**
   * Add the names of a project we import, beneath our own:  looked up after ours, never written to our file.
   * - `data`:  its own dictionary, when we import its translation;
   *   else its names as it declares them (`declaredIn()`), each itself:
   *   the only words the other language's parser reads for a project in ours, `increment el contador`.
   * - Also the pack's glossary's `genders` (`NamesGlossary`):  beneath ours, never written to our file.
   */
  addImported(data: NamesData): void {
    for (const kind of NAMES_KINDS) Object.assign(this.imported[kind], data[kind])
  }

  /** `statements`' names (`declaredIn()`), each as itself:  what `addImported()` takes for an untranslated import. */
  static asDeclared(statements: DeclarationStatement[]): NamesData {
    const { types, names, phrases } = TranslationNames.declaredIn(statements)
    const same = (words: string[]) => Object.fromEntries(words.map((each) => [each, each]))
    return {
      types: Object.fromEntries(types.map((each) => [each, { name: each }])),
      names: same(names),
      phrases: same(phrases)
    }
  }

  ////////////////
  // ## Lookups
  ////////////////

  /**
   * Type `words` (singular or plural, as written:  `card`, `cards`, `stock pile`) in the other language,
   * plural if `words` is -- `undefined` if the dictionary lacks it.
   * - A built-in type is the language pack's own word, e.g. `text` => `texto`:  never missing.
   */
  type(words: string): TranslatedType | undefined {
    const builtIn = this.builtInType(words)
    if (builtIn) return builtIn
    const singular = this.from.inflector.singularize(words)
    // a kind's values first, `card ranks`:  its name is its type's and its property's
    const kind = words.includes(" ") ? this.kindName(words) : undefined
    if (kind) return { name: kind }
    const found = this.typeEntry(words) ?? this.typeEntry(singular)
    if (!found) return this.miss("types", TranslationNames.typeKey(singular))
    const isPlural = singular !== words && !this.typeEntry(words)
    return isPlural ? { ...found, name: this.to.inflector.pluralize(found.name) } : found
  }

  /**
   * Name `words` (a property, variable, value or event, as written) in the other language -- `undefined` if missing.
   * - A plural whose singular is known goes plural by the other language's rules:  `ranks` => `rangos`.
   * - A kind's values (`card ranks`):  the other language's `propertyKindName`, `rangos de carta`;  one, `palo de carta`.
   */
  name(words: string): string | undefined {
    if (!/\p{L}/u.test(words)) return words
    const found = this.entry("names", words)
    if (found) return found
    const singular = this.from.inflector.singularize(words)
    const singularFound = singular !== words && this.entry("names", singular)
    if (singularFound) return this.to.inflector.pluralize(singularFound)
    // a singular whose plural is known:  `club`, from `clubs` => `tréboles`, so `trébol`
    const plural = this.from.inflector.pluralize(words)
    const pluralFound = plural !== words && this.entry("names", plural)
    if (pluralFound) return this.to.inflector.singularize(pluralFound)
    // a type's name, used as a name:  `cards` in `the number of cards in the deck`
    const type = this.typeEntry(singular)
    if (type) return singular === words ? type.name : this.to.inflector.pluralize(type.name)
    return this.kindName(words) ?? this.miss("names", words)
  }

  /** A type's words as the dictionary keys them:  lowercase, a space between words, `todos-app` => `todos app`. */
  static typeKey(words: string): string {
    return words.toLowerCase().replace(/[-_\s]+/g, " ")
  }

  /** Is `words` one of our own names (a property, variable or value), not an import's:  filled in or not? */
  hasOwnName(words: string): boolean {
    return words in this.data.names
  }

  /** Phrase `words` -- a method's or a quoted phrase's, as declared -- in the other language;  `undefined` if missing. */
  phrase(words: string): string | undefined {
    return this.entry("phrases", words) ?? this.miss("phrases", words)
  }

  /** Quoted text `words` in the other language;  `undefined` if missing. */
  text(words: string): string | undefined {
    if (!/\p{L}/u.test(words)) return words
    return this.entry("texts", words) ?? this.miss("texts", words)
  }

  /** A comment's words in the other language;  `undefined` if missing. */
  comment(words: string): string | undefined {
    if (!/\p{L}/u.test(words)) return words
    return this.entry("comments", words) ?? this.miss("comments", words)
  }

  /**
   * The gender of a noun in the OTHER language, `words` as written there (`cartas`, `pila de reserva`):
   * its type's, if it names one;  else the dictionary's `genders` (`imagen` => `feminine`, epic `spanish` J146),
   * then an import's or the glossary's (epic `spanish` P26);
   * else the pack's guess by its ending -- `undefined` for a language with none.
   */
  genderOf(words: string): string | undefined {
    const articles = this.to.articles
    if (!articles?.genderOf) return undefined
    const singular = this.to.inflector.singularize(words)
    const type = [...Object.values(this.data.types), ...Object.values(this.imported.types)].find(
      ({ name }) => name === singular || name === words
    )
    if (type?.gender) return type.gender
    // ours, else beneath them:  an import's, the glossary's (`addImported()`)
    for (const genders of [this.data.genders, this.imported.genders]) {
      const known = genders[singular] ?? genders[words] ?? genders[words.split(" ")[0]!]
      if (known) return known
    }
    // its guess, by the other language's own rules for singular and plural:  `as` is one ace
    const article = P.Inflector.using(this.to.inflector, () => articles.article("definite", singular, undefined))
    return articles.genderOf(article)
  }

  ////////////////
  // ## Changes
  ////////////////

  /** Add `value` for `words` in section `kind`, over any there. */
  add(kind: NamesKind, words: string, value: string | TranslatedType): void {
    const section = this.data[kind] as Record<string, string | TranslatedType>
    section[words] = value
  }

  /** Add every name `drafts` has that we lack, or have as `TODO`;  returns how many. */
  merge(drafts: NamesData): number {
    let added = 0
    for (const kind of NAMES_KINDS) {
      for (const [words, value] of Object.entries(drafts[kind] ?? {})) {
        const section = this.data[kind] as Record<string, unknown>
        if (!isMissing(section[words]) || isMissing(value)) continue
        section[words] = value
        added++
      }
    }
    return added
  }

  /** Note each of `names` as `TODO` in the file, so a person sees what's left;  returns how many were new. */
  markTodo(names: MissingName[]): number {
    let added = 0
    for (const { kind, words } of names) {
      const section = this.data[kind] as Record<string, unknown>
      const value = kind === "types" ? { name: TranslationNames.TODO } : TranslationNames.TODO
      if (words in section && (!isMissing(section[words]) || section[words] === TranslationNames.TODO)) continue
      section[words] = value
      added++
    }
    return added
  }

  /** `missing` since the last call, each once, and empty it. */
  takeMissing(): MissingName[] {
    const seen = new Set<string>()
    const taken = this.missing.filter(({ kind, words }) => {
      const key = `${kind}:${words}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    this.missing = []
    return taken
  }

  /** What we hold, for the file:  each section sorted, so a diff shows what changed. */
  toJSON(): Required<NamesData> {
    const sorted = <T>(section: Record<string, T>) =>
      Object.fromEntries(Object.entries(section).sort(([a], [b]) => a.localeCompare(b)))
    return {
      types: sorted(this.data.types),
      names: sorted(this.data.names),
      phrases: sorted(this.data.phrases),
      texts: sorted(this.data.texts),
      comments: sorted(this.data.comments),
      genders: sorted(this.data.genders)
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `words` in section `kind`, if there and filled in;  exactly, else lowercased;  ours, else an import's. */
  private entry(kind: Exclude<NamesKind, "types">, words: string): string | undefined {
    for (const section of [this.data[kind], this.imported[kind]]) {
      const found = section[words] ?? section[words.toLowerCase()]
      if (!isMissing(found)) return found
    }
    return undefined
  }

  /**
   * Type `words` in `types`, if there and filled in;  ours, else an import's.
   * - Its words joined by a dash or a space are one type, as its class says:  `todos-app` is `todos app`, `TodosApp`.
   */
  private typeEntry(words: string): TranslatedType | undefined {
    const spaced = TranslationNames.typeKey(words)
    for (const types of [this.data.types, this.imported.types]) {
      const found = types[words] ?? types[words.toLowerCase()] ?? types[spaced]
      if (!isMissing(found?.name)) return found
    }
    return undefined
  }

  /** Built-in type `words`, e.g. `text`, in the other language's own word for it, `texto`. */
  private builtInType(words: string): TranslatedType | undefined {
    const singular = this.from.inflector.singularize(words)
    const meaning = this.from.typeWords[words] ?? this.from.typeWords[singular] ?? builtInMeaning(words)
    if (!meaning) return undefined
    // the word for it of as many words as ours:  `drawable thing` => `cosa dibujable`
    const theirs = Object.entries(this.to.typeWords)
      .filter(([, each]) => each === meaning)
      .map(([word]) => word)
    const count = (text: string) => text.split(/[ -]/).length
    const word = theirs.find((each) => count(each) === count(singular)) ?? theirs[0]
    if (!word) return undefined
    return { name: singular === words ? word : this.to.inflector.pluralize(word) }
  }

  /**
   * A kind's values, `card ranks`, by the other language's `propertyKindName` (`{property} de {type}`):
   * `rangos de carta` -- if both its type and its property are known.
   */
  private kindName(words: string): string | undefined {
    const parts = words.split(" ")
    for (let at = 1; at < parts.length; at++) {
      const type = this.typeEntry(parts.slice(0, at).join(" "))
      const ourProperty = parts.slice(at).join(" ")
      const singular = this.from.inflector.singularize(ourProperty)
      const property = this.entry("names", singular)
      if (!type || !property) continue
      return this.to.words.propertyKindName
        .replace("{property}", singular === ourProperty ? property : this.to.inflector.pluralize(property))
        .replace("{type}", type.name)
    }
    return undefined
  }

  /** Note `words` missing from section `kind`;  always `undefined`. */
  private miss(kind: NamesKind, words: string): undefined {
    this.missing.push({ kind, words })
    return undefined
  }
}

/** The dictionary's sections, in the file's order. */
export const NAMES_KINDS: NamesKind[] = ["types", "names", "phrases", "texts", "comments", "genders"]

/** A dictionary with every section, and nothing in it. */
function emptyNames(): Required<NamesData> {
  return { types: {}, names: {}, phrases: {}, texts: {}, comments: {}, genders: {} }
}

/** A type's name as its words, `StockPile` => `stock pile`. */
function wordsOfTypeName(name: string): string {
  return name.replace(/(?<=[\p{Ll}\p{N}])(?=\p{Lu})/gu, " ").toLowerCase()
}

/** `words` without the quotes around them, `"is a (rank)"` => `is a (rank)`. */
function unquote(words: string): string {
  return words.replace(/^"|"$/g, "")
}

/** Is `value` missing:  absent, empty or `TODO`? */
function isMissing(value: unknown): boolean {
  if (value && typeof value === "object") return isMissing((value as TranslatedType).name)
  return value === undefined || value === "" || value === TranslationNames.TODO
}

/** Spell's own names for its built-in types, which every language's `typeWords` means, e.g. `list`. */
function builtInMeaning(words: string): string | undefined {
  return BUILT_IN_MEANINGS.has(words) ? words : undefined
}

/** The meanings `P.TypeWords` maps to, which a type's name may also be written as. */
const BUILT_IN_MEANINGS = new Set(["text", "number", "integer", "character", "choice", "date", "list", "thing", "app"])
