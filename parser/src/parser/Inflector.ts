import { upperFirst } from "spell-kit/util"

/**
 * How a human language makes a word singular or plural:  `cards` => `card`, `corazones` => `corazón`.
 * - Each language pack brings its own (epic `spanish` P3):  English's is spell's `languages/en/inflector.ts`.
 *   The parser knows no language, so it has none of its own.
 * - A parser carries its language's (`P.Parser.inflector`), and puts it IN PLAY while it parses (`using()`):
 *   the helpers below (`P.singularize()`, `P.typeCase()` ...) read the one in play.
 * - Out of a parse (an editor's lookup, a test), the FALLBACK is in play:  the first language pack loaded.
 * - Memoized:  a parse asks the same few words over and over.
 * - The compiled program never inflects:  only parsing and compiling do, so a running program never loads one.
 */
export class Inflector {
  /** The language's code, e.g. `en`. */
  readonly lang: string
  /** `word` made singular, e.g. `cards` => `card`;  a word that's already singular as it is. */
  protected readonly singular: (word: string) => string
  /** `word` made plural, e.g. `card` => `cards`;  a word that's already plural as it is. */
  protected readonly plural: (word: string) => string

  constructor(props: InflectorProps) {
    this.lang = props.lang
    this.singular = props.singular
    this.plural = props.plural
  }

  ////////////////
  // ## Words
  ////////////////

  /** `word` made singular, memoized, e.g. `cards` => `card`. */
  singularize(word: string): string {
    return (this.singulars[word] ??= this.singular(`${word}`))
  }

  /** `word` made plural, memoized, e.g. `card` => `cards`;  its case kept. */
  pluralize(word: string): string {
    return (this.plurals[word] ??= this.plural(`${word}`))
  }

  /**
   * Is `word` singular, plural, or `"either"`:  a word that doesn't change (`sheep`, `lunes`) is both.
   * - Memoized:  parsers ask this about the same few words over and over.
   */
  plurality(word: string): Plurality {
    const known = this.pluralities[word]
    if (known !== undefined) return known
    const isSingular = word === this.singularize(word)
    const isPlural = word === this.pluralize(word)
    return (this.pluralities[word] = isSingular && isPlural ? "either" : isSingular ? "singular" : "plural")
  }

  ////////////////
  // ## Names
  ////////////////

  /**
   * `text` as a type's name:  singular, in PascalCase, e.g. `bank-accounts` => `BankAccount`.
   * - Words are split at a dash or an underscore:  `bank-account`, `bank_account` and `Bank_Account`
   *   all name `BankAccount`.  (spell joins a name of several words with dashes first:  `SpellType.joined()`.)
   * - A word's own capitals stay:  `DrawableList` is itself.
   * - spell's ONE name for a type (epic `drawable-thing` P11);  each output language writes it its own way --
   *   see `P.Naming`.
   */
  typeCase(text: string): string {
    return (this.typeCases[text] ??= this.singularize(`${text}`)
      .split(/[-_]+/)
      .map((bit) => upperFirst(bit))
      .join(""))
  }

  /** `text` as one thing of a type, lowercase and singular, e.g. `Piles` => `pile`. */
  instanceCase(text: string): string {
    return (this.instanceCases[text] ??= this.singularize(`${text}`).toLowerCase())
  }

  private readonly singulars: Record<string, string> = Object.create(null)
  private readonly plurals: Record<string, string> = Object.create(null)
  private readonly pluralities: Record<string, Plurality> = Object.create(null)
  private readonly typeCases: Record<string, string> = Object.create(null)
  private readonly instanceCases: Record<string, string> = Object.create(null)

  ////////////////
  // ## In play
  ////////////////

  /** The inflector in play:  the parsing parser's (`using()`), else the fallback. */
  static get active(): Inflector {
    const active = Inflector.current ?? Inflector.fallback
    if (!active) {
      throw new TypeError(
        "Inflector.active:  no language is loaded;  import a language pack (spell's English is `spell-lang/spell`) first"
      )
    }
    return active
  }

  /**
   * Run `work` with `inflector` in play, then put back the one before.
   * - `undefined`:  as it was, e.g. a parser with no language of its own (rulex's).
   * - A parse within a parse (another project's) puts its own in play, and gives it back after.
   */
  static using<T>(inflector: Inflector | undefined, work: () => T): T {
    if (!inflector || inflector === Inflector.current) return work()
    const before = Inflector.current
    Inflector.current = inflector
    try {
      return work()
    } finally {
      Inflector.current = before
    }
  }

  /** In play while a parser with a language parses:  see `using()`. */
  private static current: Inflector | undefined

  /** In play out of a parse:  the first language pack loaded sets it (`Inflector.fallback ??= ...`). */
  static fallback: Inflector | undefined
}

/** What makes an `Inflector`:  its language and its two rules. */
export type InflectorProps = {
  /** The language's code, e.g. `en`. */
  lang: string
  /** `word` made singular;  a singular word as it is. */
  singular: (word: string) => string
  /** `word` made plural;  a plural word as it is. */
  plural: (word: string) => string
}

/** Plurality of a word -- see `Inflector.plurality()`. */
export type Plurality = "singular" | "plural" | "either"

////////////////
// ## The inflector in play
////////////////

/** `word` made singular, by the language in play:  `Inflector.active.singularize()`. */
export const singularize = (word: string): string => Inflector.active.singularize(word)
/** `word` made plural, by the language in play:  `Inflector.active.pluralize()`. */
export const pluralize = (word: string): string => Inflector.active.pluralize(word)
/** Is `word` singular, plural or both, by the language in play:  `Inflector.active.plurality()`. */
export const getPlurality = (word: string): Plurality => Inflector.active.plurality(word)
/** `text` as a type's name, by the language in play:  `Inflector.active.typeCase()`. */
export const typeCase = (text: string): string => Inflector.active.typeCase(text)
/** `text` as one thing of a type, by the language in play:  `Inflector.active.instanceCase()`. */
export const instanceCase = (text: string): string => Inflector.active.instanceCase(text)
