import { NONE, proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { longestNameIn, namesWithGrammarWords } from "spell-lang/spell/rules/rules.types"

/**
 * Base pattern rule for matching a type name, singular or plural, known or unknown:
 * - one word (alpha-numeric, dashes / underscores), e.g. `card`, `bank-account`
 * - or SEVERAL words, if they're a name someone declared, e.g. `bank account(s)` after `a bank account is a thing`
 *   - only declared names, the longest first:  `a big card` stays a card, unless a `big card` was declared
 * - A type's short name names it too, compiled as the type's own name:
 *   `account` => `BankAccount`, after `a bank account aka account is a thing` -- see `P.TypeScope.aka`.
 * - Sets `match.data.scopeType` to the existing `TypeScope` looked up by `scope.types`,
 *   `NONE` if scope doesn't know it.
 * - Other rules read it as `if (match.is(SpellType)) match.data.scopeType`.
 */
export class SpellType extends P.Pattern<never, TypeMatchData> {
  /** Editors colour every type name as a type. */
  @proto static highlightAs?: P.HighlightKind = "type"

  /** Most words a type's name may have, e.g. 2 for `bank account`. */
  static MAX_NAME_WORDS = 4

  /**
   * Every type rule matches the same thing:
   * an alpha-numeric word (dashes / underscores OK), not the language's own (`test()`).
   */
  constructor(props?: Partial<P.PatternProps>) {
    super({
      pattern: P.ALPHANUMERIC_WORD_WITH_DASHES,
      datatype: "type",
      ...props
    })
  }

  /** Matches our `pattern`, and isn't one of the language's own words (its `blacklist`, `SP.LanguageWords`). */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return super.test(scope, tokens, start) && !SP.Language.of(scope).words.blacklist[`${tokens[start]!.value}`]
  }

  /**
   * Is `typeName` one of the built-in VALUE types (`number`, `text`, `choice` ...), as opposed to a class?
   * - So a method on one can't be an instance method -- see `P.isValueType()`.
   */
  static isSimpleType(typeName: string): boolean {
    return P.isValueType(SP.typeName(typeName))
  }

  /**
   * Name compiled code uses for the type written as `value`:
   *   its datatype (`SP.typeName()`), but a class in PascalCase.
   * - a value type in spell's words, e.g. `string` => `text`, `boolean` => `choice`, `numbers` => `number`
   * - a class, singular, e.g. `Thing`, `List` for `array`, `BankAccount`, `Drawable` for `drawable thing`
   *   -- see `P.classCase()`
   */
  mapValue<T = string>(value: string): T {
    const datatype = SP.typeName(value)
    return (P.isValueType(datatype) ? datatype : P.classCase(datatype)) as T
  }

  /**
   * Match a declared name of several words, else one word;
   * then look up `match.data.scopeType` from `scope.types` by canonical, singular type name.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const declared = this.parseDeclaredWords(scope, tokens)
    if (declared) return declared
    // `super.parse()` is typed for any rule -- we know it's ours.
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // Pick up `type` scope based on canonical, singular type name
    const scopeType = scope.types?.get(match.value) ?? this.inItsOwnLanguage(scope, match)
    // NOTE: `scopeType.name` is the class name
    //       `scopeType.instanceName` is the instance case name
    if (scopeType && SpellType.isShortName(scopeType, match.value))
      return this.typeMatch(scope, [tokens[0]!], scopeType)
    match.data.scopeType = scopeType ?? NONE
    return match
  }

  /**
   * The type `match` names in ANOTHER language's grammar:  `cards` in a Spanish file names `Card`, declared in English.
   * - See `SP.typeInItsOwnLanguage()` (epic `spanish` J89).
   * - SIDE EFFECT:  sets `match.value` to the type's name, so what reads it (`NewList`, `CreateListType` ...)
   *   names that type;  and `data.readIn`, the language, for `inflectingAsRead()`.
   * - `undefined` if no other language's singular names one.
   */
  private inItsOwnLanguage(scope: P.Scope, match: P.MatchFor<this>): P.TypeScope | undefined {
    const found = SP.typeInItsOwnLanguage(scope, `${match.raw ?? match.value}`)
    if (!found) return undefined
    match.value = found.type.name
    ;(match.data as TypeMatchData).readIn = found.language
    return found.type
  }

  /**
   * The LONGEST run of 2 or more words from the first token which names a type in `scope`, if any,
   * e.g. `bank accounts`.
   * - A name someone declared, or a short name:  never just any run of words -- see class docs.
   */
  private parseDeclaredWords(scope: P.Scope, tokens: P.Token[]): P.MatchFor<this> | undefined {
    const { types } = scope
    if (!types) return undefined
    let count = 0
    while (count < SpellType.MAX_NAME_WORDS && count < tokens.length && this.test(scope, tokens, count)) count++
    if (count && count < tokens.length) {
      const withGrammarWords = this.declaredWithGrammarWords(scope, types, tokens)
      if (withGrammarWords) return withGrammarWords
    }
    for (; count > 1; count--) {
      const words = tokens.slice(0, count)
      const scopeType = types.get(this.mapValue(SpellType.joined(words)))
      if (scopeType) return this.typeMatch(scope, words, scopeType)
    }
    return undefined
  }

  /**
   * A declared name holding a grammar word, from the first token,
   * e.g. `card in play`, `carta de juego` (epic `spanish` P14).
   * - Only a name declared whole, longest first:  `namesWithGrammarWords()`.
   * - Its first word passes `test()`;  the others may be on the blacklist.
   */
  private declaredWithGrammarWords(
    scope: P.Scope,
    types: NonNullable<P.Scope["types"]>,
    tokens: P.Token[]
  ): P.MatchFor<this> | undefined {
    const { blacklist } = SP.Language.of(scope).words
    const names = namesWithGrammarWords(types, "type", SpellType.wordsOfTypeName, (word) => !!blacklist[word])
    if (!names.length) return undefined
    const written = SpellType.lowerWords(tokens, SpellType.MAX_NAME_WORDS)
    // plural by its first word, as a person writes it:  `cards in play`, `cartas de juego`
    const singular = written.length ? [P.singularize(written[0]!), ...written.slice(1)] : written
    const count = longestNameIn(written, names) || longestNameIn(singular, names)
    if (!count) return undefined
    const words = tokens.slice(0, count)
    const scopeType = types.get(this.mapValue(singular.slice(0, count).join("-")))
    if (!scopeType) return undefined
    const match = this.typeMatch(scope, words, scopeType, scopeType.name)
    match.data.numberWord = `${words[0]!.value}`
    return match
  }

  /**
   * The words of a type's name, e.g. `CardInPlay` => `["Card", "In", "Play"]`:
   * split where each word was capitalized.
   */
  static wordsOfTypeName(type: P.TypeScope): string[] {
    return `${type.name}`.split(/(?=\p{Lu})/u)
  }

  /** The first words of `tokens`, at most `max`, lowercase:  up to the first token which isn't a word. */
  static lowerWords(tokens: P.Token[], max: number): string[] {
    const words: string[] = []
    for (const token of tokens) {
      if (words.length >= max || !(token instanceof P.WordToken)) break
      words.push(`${token.value}`.toLowerCase())
    }
    return words
  }

  /**
   * Match of `words` naming `scopeType`.
   * - `value`:  how its words compile, e.g. `BankAccount` for `bank accounts`;
   *   for a short name, the type's own name.
   * - `raw`:  its words as written, e.g. `bank accounts`.
   * - `written`:  how its words compile, if not as `mapValue()` has them.
   */
  private typeMatch(
    scope: P.Scope,
    words: P.Token[],
    scopeType: P.TypeScope,
    written = this.mapValue<string>(SpellType.joined(words))
  ): P.MatchFor<this> {
    const match = new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value: SpellType.isShortName(scopeType, written) ? scopeType.name : written,
      tokens: words,
      scope
    }) as P.MatchFor<this>
    match.data.scopeType = scopeType
    return match
  }

  /**
   * The word saying whether `match` names one or several, e.g. `cards` for `cards in play`:
   * its first word, for a name holding a grammar word, else all of it (`bank accounts`).
   */
  static numberWordOf(match: P.Match): string {
    return (match.data as TypeMatchData).numberWord ?? `${match.raw}`
  }

  /**
   * Run `work` with the inflector of the language `match` was read in:  its type's own, for `cards` in Spanish
   * (`inItsOwnLanguage()`), else the one in play.  So `singular_type` and `plural_type` count it as written.
   */
  static inflectingAsRead<T>(match: P.Match, work: () => T): T {
    return P.Inflector.using((match.data as TypeMatchData).readIn?.inflector, work)
  }

  /** `words` as one dashed name, e.g. `bank-accounts`:  how `typeCase()` reads a name of several words. */
  static joined(words: P.Token[]): string {
    return words.map((token) => token.value).join("-")
  }

  /** Is `value` (PascalCase) `scopeType`'s short name, not its own name? */
  static isShortName(scopeType: P.TypeScope, value: string): boolean {
    return scopeType.aka === value && scopeType.name !== value
  }

  /** Build `P.ASTTypeExpression` from `match.value` -- throws if the match somehow produced a non-string. */
  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    const { value, raw } = match
    if (typeof value !== "string") throw new TypeError(`Expected a string value, got ${typeof value}`)
    return new P.ASTTypeExpression(match, { raw, name: value })
  }
}

/** What type rules stash on their matches. */
type TypeMatchData = {
  /** Existing `TypeScope` looked up in `scope.types` while parsing, or `NONE` if scope doesn't know it. */
  scopeType?: P.TypeScope | typeof NONE
  /** The word saying whether it names one or several, when not all of it:  see `SpellType.numberWordOf()`. */
  numberWord?: string
  /** The language whose grammar it was read in, when not the file's:  see `SpellType.inItsOwnLanguage()`. */
  readIn?: SP.Language
}

/**
 * `TypeScope` found by a `known_type` (or other `SpellType`) `match`.
 * - Use where syntax guarantees it, e.g. `{type:known_type}`.
 * - Throws otherwise, which means grammar and code disagree -- better than a confusing `undefined` later.
 */
export function getKnownType(match: P.Match): P.TypeScope {
  const scopeType = match.is(SpellType) ? match.data.scopeType : undefined
  if (!scopeType || scopeType === NONE) throw new TypeError(`Expected match for a known type, got '${match.raw}'.`)
  return scopeType
}
