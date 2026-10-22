import { P } from "spell-lang/parser"

import { SPELL_BASE_TYPES } from "spell-lang/core/core.types"
import { SP } from "spell-lang/spell"

/**
 * A LANGUAGE PACK:  everything spell needs to read programs written in one human language (epic `spanish`).
 * - English is the first, `SP.languages.en`;  Spanish the second.
 * - What a pack holds:
 *   - its parser:  every rule class, registered with this language's syntax and tests (`<module>.<lang>.ts`)
 *   - its inflector:  how its words go singular and plural (`P.Inflector`)
 *   - its words for spell's built-in types, e.g. `text`, `yes or no` (`typeWords`)
 *   - its root scope:  the built-in types and their members, which every project's scope descends from
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

  constructor(props: LanguageProps) {
    this.lang = props.lang
    this.name = props.name
    this.parser = props.parser
    this.inflector = props.inflector
    this.typeWords = props.typeWords
    this.words = props.words
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
