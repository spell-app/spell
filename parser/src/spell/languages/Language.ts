import { P } from "spell-lang/parser"

import { SPELL_BASE_TYPES, type CoreMessages } from "spell-lang/core/core.types"
import { SP } from "spell-lang/spell"
import { PARSER_MESSAGES } from "spell-lang/spell/languages/en/parserMessages"

/**
 * A LANGUAGE PACK:  everything spell needs to read programs written in one human language (epic `spanish`).
 * - English is the first, `SP.languages.en`;  Spanish the second.
 * - What a pack holds:
 *   - its parser:  every rule class, registered with this language's syntax and tests (`<module>.<lang>.ts`)
 *   - its inflector:  how its words go singular and plural (`P.Inflector`)
 *   - its words for spell's built-in types, e.g. `text`, `yes or no` (`typeWords`)
 *   - its root scope:  the built-in types and their members, which every project's scope descends from
 *   - its words for what the core says to the person running a program (`messages`)
 *   - its words for what the parser says to the person writing one (`parserMessages`)
 * - A project names its language (epic `spanish` P4);  `Language.for(lang)` finds its pack.
 * - The rule classes are shared:  a pack holds only words.
 */
export class Language {
  /** The language's code, e.g. `en`. */
  readonly lang: string
  /** Its name in English, for people choosing one, e.g. `Spanish`. */
  readonly name: string
  /** Its parser:  spell's rule classes, registered with this language's syntax. */
  readonly parser: SP.SpellParser
  /** How its words go singular and plural. */
  readonly inflector: P.Inflector
  /** How a person writes spell's built-in types in it, e.g. `{ string: "text", "yes or no": "choice" }`. */
  readonly typeWords: P.TypeWords
  /** Its small words the rules read while parsing:  the blacklist, stop words ... -- see `LanguageWords`. */
  readonly words: LanguageWords
  /**
   * What the core says to the person running a program, in this language:  a test's lines, a drawing's stand-in ...
   * - Copied into a project's words file, for the runner to hand the core -- see `SP.SpellWords.of()`.
   * - English's are the core's own:  see `CORE_MESSAGES`.
   */
  readonly messages: CoreMessages
  /**
   * What the parser says to the person WRITING a program, in this language:  warnings, errors, long forms ...
   * - Read one with `parserMessage()`.
   * - English's are every key, `PARSER_MESSAGES`;  another language's may lack some, which read English.
   */
  readonly parserMessages: Partial<ParserMessages>
  /** How its articles agree with their noun, e.g. `an apple`, `la carta` -- see `agreement()`;  none:  never warns. */
  readonly articles: ArticleAgreement | undefined

  constructor(props: LanguageProps) {
    this.articles = props.articles
    this.lang = props.lang
    this.name = props.name
    this.parser = props.parser
    this.inflector = props.inflector
    this.typeWords = props.typeWords
    this.words = props.words
    this.messages = props.messages
    this.parserMessages = props.parserMessages ?? {}
    this.parser.language = this
    this.parser.inflector ??= this.inflector
  }

  /**
   * The scope every project in this language descends from:  spell's built-in types, and their members.
   * - Its types:
   *   - spell's runtime classes (`SPELL_BASE_TYPES`:  `Object`, `Thing`, `List`, `App`)
   *   - then every other built-in type's NAME (`P.BUILT_IN_TYPES`:  `text`, `number` ...), each with its super-type,
   *     so `is a number` names a known type, and `integer` is a `number`
   * - Their members -- `the length of the name` -- from `SP.BUILT_IN_TYPE_TABLE`, see `loadBuiltInTypes()`.
   * - Built the first time it's asked for, with this language's words in play.
   */
  get rootScope(): P.RootScope {
    return (this._rootScope ??= P.Inflector.using(this.inflector, () => {
      const scope = new P.RootScope({ name: `spellRoot_${this.lang}`, parser: this.parser })
      SPELL_BASE_TYPES.forEach((type) => scope.types.add(type))
      for (const [name, superType] of Object.entries(P.BUILT_IN_TYPES)) {
        const existing = scope.types.get(name, "LOCAL_ONLY")
        if (!existing) scope.types.add({ name, superType })
        else if (superType) existing.superType = P.classCase(superType)
      }
      SP.loadBuiltInTypes(scope, this.words)
      return scope
    }))
  }
  private _rootScope: P.RootScope | undefined

  ////////////////
  // ## Messages
  ////////////////

  /**
   * Parser message `key` in this language, each `{name}` in it filled from `params` (epic `spanish` P17):
   * `SP.Language.of(scope).parserMessage("dont-understand", { text: "x y" })` => `Don't understand "x y"`.
   * - English when this language has no such key -- see `parserMessages`.
   * - A placeholder with no param stays as written, `{name}`:  so a gap shows, and an example in braces,
   *   `{the score of the game}`, is left alone.
   */
  parserMessage(key: ParserMessageKey, params: Readonly<Record<string, string | number>> = {}): string {
    const template = this.parserMessages[key] ?? PARSER_MESSAGES[key]
    return template.replace(PLACEHOLDER, (whole, name: string) => (name in params ? String(params[name]) : whole))
  }

  /**
   * How a person writes built-in type `datatype` in this language:  its first word in `typeWords`,
   * e.g. `texto` for `text` in Spanish;  any other type as it is, e.g. `Card`.
   */
  wordFor(datatype: P.Datatype): string {
    return Object.keys(this.typeWords).find((words) => this.typeWords[words] === datatype) ?? datatype
  }

  /**
   * `noun` with the article it takes, for a message's example:  `an apple`, `the card`, `una carta`, `la dirección`.
   * - `kind`:  `indefinite` (`a`, `un` ...) or `definite` (`the`, `el` ...).
   * - `type`:  the type `noun` names, if any;  Spanish's gender is the type's.
   * - A language with no `articles`:  `noun` alone.
   */
  withArticle(kind: ArticleKind, noun: string, type?: P.TypeScope): string {
    const article = P.Inflector.using(this.inflector, () => this.articles?.article(kind, noun, type))
    return article ? `${article} ${noun}` : noun
  }

  ////////////////
  // ## Agreement
  ////////////////

  /**
   * The article `noun` should have had, if not `article` -- `undefined` when they agree (epic `spanish` P8).
   * - e.g. English:  `an` for `a` + `apple`;  Spanish:  `la` for `el` + `carta`, `unas` for `un` + `cartas`.
   * - `article` and `noun` lowercase, as written;  `type` the type `noun` names, if it names one.
   * - Never for a language with no `articles`.
   * - Only a warning:  `SP.SpellWarnings.noteArticles()` notes it, and the line parses as it is.
   */
  agreement(article: string, noun: string, type: P.TypeScope | undefined): string | undefined {
    return this.articles?.expected(article, noun, type)
  }

  /** The gender a type declared with `article` has, e.g. Spanish's `feminine` for `una` -- English's none. */
  genderOf(article: string | undefined): string | undefined {
    return article === undefined ? undefined : this.articles?.genderOf?.(article)
  }

  ////////////////
  // ## Every language
  ////////////////

  /** Every language pack loaded, by its code. */
  static readonly all = new Map<string, Language>()

  /** Add `language` to the packs `for()` finds;  the first is the default.  Returns it. */
  static register(language: Language): Language {
    Language.all.set(language.lang, language)
    Language.fallback ??= language
    return language
  }

  /**
   * The pack for language `lang`, e.g. `es` -- the default (English) for `undefined`.
   * - throws a `TypeError` naming the packs there are, for a language with none
   */
  static for(lang: string | undefined): Language {
    if (lang === undefined) return Language.default
    const language = Language.all.get(lang)
    if (!language) {
      const known = [...Language.all.keys()].join(", ")
      throw new TypeError(`Language.for():  no language pack for "${lang}";  spell reads ${known}`)
    }
    return language
  }

  /** The language `scope` is read in:  its parser's, else the one in play (`active`). */
  static of(scope: P.Scope | undefined): Language {
    return (scope?.parser as SP.SpellParser | undefined)?.language ?? Language.active
  }

  /**
   * The language of the parser parsing right now (`P.Parser.current`), else the default.
   * - For rule code that meets a word with no scope to ask, e.g. a member's stop words.
   */
  static get active(): Language {
    return (P.Parser.current as SP.SpellParser | undefined)?.language ?? Language.default
  }

  /** The pack a project gets when it names none:  the first registered, English. */
  static get default(): Language {
    if (!Language.fallback) throw new TypeError("Language.default:  no language pack is loaded")
    return Language.fallback
  }
  private static fallback: Language | undefined
}

/** What makes a `Language` -- see its fields. */
export type LanguageProps = {
  lang: string
  name: string
  parser: SP.SpellParser
  inflector: P.Inflector
  typeWords: P.TypeWords
  words: LanguageWords
  messages: CoreMessages
  /** None:  every message in English. */
  parserMessages?: Partial<ParserMessages>
  articles?: ArticleAgreement
}

/** One of the parser's messages, e.g. `dont-understand` -- see `PARSER_MESSAGES`, English's. */
export type ParserMessageKey = keyof typeof PARSER_MESSAGES

/** Every one of the parser's messages, in one language:  what a language pack holds (`Language.parserMessages`). */
export type ParserMessages = Record<ParserMessageKey, string>

/** A named placeholder in a message, `{type}` -- see `Language.parserMessage()`. */
const PLACEHOLDER = /\{(\w+)\}/g

/** Which article a noun takes:  `a` or `the`, in English. */
export type ArticleKind = "indefinite" | "definite"

/**
 * How a language's articles agree with their noun -- English's in `languages/en/agreement.ts` (epic `spanish` P8).
 * - Read through `Language.agreement()` and `Language.genderOf()`.
 */
export type ArticleAgreement = {
  /**
   * The article `noun` should have had, if not `article`, e.g. `an` for `a apple` -- `undefined` when they agree.
   * - `type`:  the type `noun` names, if any;  a language whose articles agree in gender needs one.
   */
  expected(article: string, noun: string, type: P.TypeScope | undefined): string | undefined
  /** The gender a type declared with `article` has, e.g. `feminine` for `una carta es una cosa`;  none in English. */
  genderOf?(article: string): string | undefined
  /**
   * The article `noun` takes, for a message's example:  `an` for `apple`, `una` for `carta`.
   * - `type`:  the type `noun` names, if any;  without one, a language with genders guesses by the word.
   * - The warning for a wrong article is the pack's `did-you-mean` message (`Language.parserMessage()`).
   */
  article(kind: ArticleKind, noun: string, type: P.TypeScope | undefined): string
}

/** A language's small words, the tables spell's rules read while parsing -- English's in `languages/en/words.ts`. */
export type LanguageWords = {
  /** Words which may never be a one-word name, so they stay spell's own, e.g. English's `is`, `the`. */
  blacklist: P.IdentifierBlacklist
  /** Words which end a member's name of several words, e.g. `of` in `the short rank of the card`. */
  memberStopWords: Set<string>
  /** Stop words which may still START a member's name, e.g. `with` in `with jokers`. */
  memberLeadingWords: Set<string>
  /** Little words after which a method's name keeps its receiver's type, e.g. `of` in `update_the_total_of_calculator`. */
  danglingWords: Set<string>
  /** Words which end a type's name of several words, e.g. `aka`. */
  typeNameStopWords: Set<string>
  /** How a file's raw text declares things, found before it's parsed. */
  declarations: DeclarationPatterns
  /** The word between a list and what it holds:  `of` in `list of cards`, `de` in `lista de cartas`. */
  listOfWord: string
  /**
   * Words which name `it` as an OBJECT -- the thing a method runs on, or the last `get` -- e.g. Spanish's `eso`.
   * - None:  `it` itself, as English writes it (`print it`), the `it` variable's own name.
   * - A variable a person named the same word wins:  this is only a second name for `it`.
   */
  itWords?: Set<string>
  /**
   * The language's words for the built-in types' members, by their English words:  `{ length: ["largo", "longitud"] }`.
   * - Each reads as its English one does (`SP.BUILT_IN_TYPE_TABLE`'s `readAs`).
   * - A `stored` member's compiles to its English name, and sets too:  Spanish's `nombre` is `.name`.
   * - None:  the English words.
   */
  builtInMembers?: Record<string, string[]>
}

/**
 * How a language's raw text declares things, found before a file is parsed (`SpellParser.declaredTypes()` ...),
 * so a line can name a type or call a method declared further down.
 */
export type DeclarationPatterns = {
  /** A line declaring a type:  `gim`, its groups a one-word name, a several-word name, a created type, an app. */
  typeDeclaration: RegExp
  /** A line declaring a value kind:  `gim`, its plural name captured, e.g. `suits`. */
  valueKindDeclaration: RegExp
  /** A line starting a method definition, e.g. `to play a card`. */
  methodLine: RegExp
  /** A line re-opening a type, its name captured, e.g. `a solitaire:`. */
  reopenedType: RegExp
}
