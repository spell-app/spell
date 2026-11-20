import { P } from "spell/parser/parser"

import { SPELL_BASE_TYPES, type CoreMessages } from "spell/parser/core/core.types"
import { SP } from "spell/parser/spell"
import { PARSER_MESSAGES } from "spell/parser/spell/languages/en/parserMessages"

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
 * - A FILE's name says its language (epic `spanish` P19):  `Carta.es.spell` is Spanish, a plain `Card.spell` English.
 *   - `Language.forFile(name)` finds its pack;  `Language.for(lang)` finds one by its code.
 *   - So one project may mix languages:  see `rootScopeFor()`.
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
  /**
   * The mark its people write between a number's whole part and its fraction:  `.` in English, `,` in Spanish.
   * - How a place's number reads when its text can't say, `"1,200"`, and its line doesn't (epic `data` P23).
   */
  readonly decimalMark: "." | ","

  constructor(props: LanguageProps) {
    this.articles = props.articles
    this.decimalMark = props.decimalMark ?? "."
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
   * - Spell's built-in TEMPLATES written in spell, e.g. `two sided view`:  each one's type and its members, in this
   *   language's words, from its compiled declarations -- see `SP.loadBuiltInTemplates()` (epic `elemental-spell` Q71).
   *   - Their rules go on a clone of this language's `parser`, the root's own:  so `bareRootScope()` has none.
   * - Their members -- `the length of the name` -- from `SP.BUILT_IN_TYPE_TABLE`, see `loadBuiltInTypes()`.
   * - Built the first time it's asked for, with this language's words in play.
   */
  get rootScope(): P.RootScope {
    return (this._rootScope ??= P.Inflector.using(this.inflector, () => {
      const parser = this.parser.clone({ module: `spellRoot_${this.lang}` })
      const scope = new P.RootScope({ name: `spellRoot_${this.lang}`, parser })
      Language.addBuiltInTypes(scope)
      SP.loadBuiltInTemplates(scope, [this])
      SP.loadBuiltInDimensions(scope, [this])
      SP.loadBuiltInTypes(scope, this.words)
      return scope
    }))
  }
  private _rootScope: P.RootScope | undefined

  /**
   * A root like `rootScope`, WITHOUT spell's built-in templates written in spell (`SP.loadBuiltInTemplates()`):
   * where those templates compile themselves, e.g. `two sided view` -- see the core's `writeTemplates.ts`.
   * - Made afresh each time, never shared, on a clone of this language's `parser`.
   */
  bareRootScope(): P.RootScope {
    return P.Inflector.using(this.inflector, () => {
      const parser = this.parser.clone({ module: `spellRoot_${this.lang}_bare` })
      const scope = new P.RootScope({ name: `spellRoot_${this.lang}_bare`, parser })
      Language.addBuiltInTypes(scope)
      SP.loadBuiltInTypes(scope, this.words)
      return scope
    })
  }

  /**
   * The root scope of a project whose files are written in `languages`, in file order (epic `spanish` P19).
   * - One language:  its own `rootScope`, so a project in one language parses as it always has.
   * - Several:  a root of their own, its built-in types' members in EVERY one of their words:
   *   `the length of the list` and `el largo de la lista` both read `.length`.
   *   - So a type a Spanish file declares, which an English file extends, has its members in both.
   *   - Its parser is the first language's;  each file of another language parses with a twin of the project's
   *     parser in its own language (`SpellParser.twinFor()`).
   *   - Built once for each set of languages, then shared, as a language's own root is.
   * - None:  the default's.
   */
  static rootScopeFor(languages: readonly Language[]): P.RootScope {
    const [first = Language.default, ...others] = languages
    if (!others.length) return first.rootScope
    const key = languages.map((language) => language.lang).join("+")
    let root = Language.mixedRoots.get(key)
    if (!root) {
      root = P.Inflector.using(first.inflector, () => {
        const parser = first.parser.clone({ module: `spellRoot_${key}` })
        const scope = new P.RootScope({ name: `spellRoot_${key}`, parser })
        Language.addBuiltInTypes(scope)
        SP.loadBuiltInTemplates(scope, languages)
        SP.loadBuiltInDimensions(scope, languages)
        // each language's words for each member, the first's first:  one both say the same, e.g. `id`, once
        for (const language of languages) SP.loadBuiltInTypes(scope, language.words, { keepExisting: true })
        return scope
      })
      Language.mixedRoots.set(key, root)
    }
    return root
  }

  /** Root scopes of projects in several languages, by their codes joined, e.g. `en+es` -- see `rootScopeFor()`. */
  static readonly mixedRoots = new Map<string, P.RootScope>()

  /** Every root scope there is:  each language's own, then those of projects in several (`rootScopeFor()`). */
  static get rootScopes(): P.RootScope[] {
    return [...[...Language.all.values()].map((language) => language.rootScope), ...Language.mixedRoots.values()]
  }

  /**
   * Add spell's built-in types to root `scope`, with no members yet:
   * - spell's runtime classes (`SPELL_BASE_TYPES`:  `Object`, `Thing`, `List`, `App`)
   * - then every other built-in type's NAME (`P.BUILT_IN_TYPES`:  `text`, `number` ...), each with its super-type
   * - NOT a built-in template written in spell, e.g. `TwoSidedView`:  its type comes from its declarations
   *   (`SP.loadBuiltInTemplates()`), or, in a bare root, from compiling it
   */
  private static addBuiltInTypes(scope: P.RootScope): void {
    const templates = Object.values(SP.BUILT_IN_TEMPLATES)
    SPELL_BASE_TYPES.filter((type) => !templates.includes(type)).forEach((type) => scope.types.add(type))
    for (const [name, superType] of Object.entries(P.BUILT_IN_TYPES)) {
      const existing = scope.types.get(name, "LOCAL_ONLY")
      if (!existing) scope.types.add({ name, superType })
      else if (superType) existing.superType = P.classCase(superType)
    }
  }

  ////////////////
  // ## Messages
  ////////////////

  /** What this language calls a kind of place, by its word in code:  `servidor web` for `web server`.  A library's:  as it is. */
  placeKindWord(kind: string): string {
    return this.words.placeKinds?.[kind] ?? kind
  }

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
   * The words naming the kind of a property's values, in this language (epic `spanish` P22):
   * `card suit` for a card's `suit`, `palo de carta` for a carta's `palo` -- see `LanguageWords.propertyKindName`.
   * - `type`:  the type's name, e.g. `StockPile`, read as its words, `stock pile`.
   * - `property`:  the property's words, e.g. `short rank` (or its name, `short_rank`).
   * - What `its "suit" is one of ...` declares, so another type can say `its "suit" is a card suit`:
   *   see spell's `define_property_has`.
   */
  propertyKindName(type: string, property: string): string {
    const typeWords = `${type}`
      .split(/(?=\p{Lu})|[-_\s]+/u)
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    const propertyWords = `${property}`.replace(/[-_\s]+/g, " ").trim()
    return this.words.propertyKindName.replace("{type}", typeWords).replace("{property}", propertyWords)
  }

  /**
   * The type a property's kind is, by its name in this language, e.g. `CardSuit` for a card's `suit`,
   * `PaloDeCarta` for a carta's `palo`:  `propertyKindName()`'s words as one type name (`P.classCase()`).
   * - Made singular by this language's inflector, whatever the language in play.
   */
  propertyKindType(type: string, property: string): string {
    const name = this.propertyKindName(type, property).split(" ").join("-")
    return P.Inflector.using(this.inflector, () => P.classCase(name))
  }

  /**
   * The member naming the list of `listType`'s family a thing was in before its latest move (epic `language` P56):
   * `last pile`, Spanish's `última pila` -- see `LanguageWords.lastListWords`, and spell's `belongs_to_one`.
   */
  lastListName(listType: P.TypeScope): string {
    const words = this.words.lastListWords
    const word = (listType.gender && words[listType.gender]) || words.default
    return `${word} ${listType.ownerMemberName.replace(/_/g, " ")}`
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
  agreedForm(word: string, type: { gender?: string } | undefined, isPlural: boolean): string | undefined {
    return this.articles?.agreedForm?.(word, type, isPlural)
  }

  /**
   * The article an article should be, for its noun:  see `ArticleAgreement.expected()`.
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

  /**
   * The pack for the file named `file`, by its name's language (epic `spanish` P19):
   * `Carta.es.spell` => Spanish;  `Card.spell`, `Card.en.spell` => English.
   * - `file`:  a name or a path, even with a range after it, as declarations say where a statement is:
   *   `/Carta.es.spell:71-92`.
   * - throws a `TypeError` naming the packs there are, for a language with none, e.g. `Carte.fr.spell`
   */
  static forFile(file: string | undefined): Language {
    return Language.for(Language.langOfFile(file))
  }

  /**
   * The language code the file named `file` says it's written in, e.g. `es` for `Carta.es.spell` --
   * `undefined` for one that names none, e.g. `Card.spell`, which reads as English.
   * - Never throws:  `forFile()` checks there's a pack for it.
   */
  static langOfFile(file: string | undefined): string | undefined {
    return file?.match(FILE_LANGUAGE)?.[1]
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
  /** None:  a dot. */
  decimalMark?: "." | ","
}

/** One of the parser's messages, e.g. `dont-understand` -- see `PARSER_MESSAGES`, English's. */
export type ParserMessageKey = keyof typeof PARSER_MESSAGES

/** Every one of the parser's messages, in one language:  what a language pack holds (`Language.parserMessages`). */
export type ParserMessages = Record<ParserMessageKey, string>

/**
 * The language part of a spell file's name, before its `.spell`:  `es` in `Carta.es.spell`, `pt-BR` in `x.pt-BR.spell`.
 * - A page file says it the same way:  `Carta.es.spell`.
 * - A path may follow with a range, as in declarations' `defined`:  `/Carta.es.spell:71-92`.
 */
const FILE_LANGUAGE = /\.([a-z]{2}(?:-[A-Za-z]{2,4})?)\.spell(?::[\d-]*)?$/

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
   * The form an agreeing word should take for things of `type`:  `undefined` if it's right, or the language has no such thing.
   * - Spanish's `ninguno` for a `receta` is `ninguna`, its `ordenados` for one `receta` is `ordenada` (epic `data` P11).
   * - `type`:  the type, or anything with a gender, e.g. a noun's article's (`la lista`, epic `language` T89).
   */
  agreedForm?(word: string, type: { gender?: string } | undefined, isPlural: boolean): string | undefined

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

/**
 * The answers each language has words for, `<action ok />`:  `the result` once a modal's button closed it
 * (epic `language` T155).
 * - A button's own word (`<action discard />`, P64) is the program's, not the language's:
 *   it's its own answer, as written (`action_button`'s `answerOf()`), and the core keeps whatever answer a button gives.
 */
export type DialogAnswer = "ok" | "cancel"

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
  /**
   * The word before a list's name that names the one a thing was in before its latest move (epic `language` P56):
   * English's `last`, `the card's last pile`;  Spanish's `último`, or `última` for a feminine list, `la última pila`.
   * - By the list type's gender (`P.TypeScope.gender`);  `default` for one with none, or none the table names.
   * - See `belongs_to_one`.
   */
  lastListWords: { default: string } & Record<string, string>
  /**
   * The verbs an action's words may start with, given how an `after` hook says it (epic `language` P56):
   * English's gerund, `putting` => `put` (and `putt`, `putte`:  the hook takes the one an action has);
   * none:  the verb as written, Spanish's `poner` in `después de poner una carta en una pila`.
   * - See `after_hook`.
   */
  verbsForDoing?: (doing: string) => string[]
  /**
   * The verbs an action's words may start with, given how a `while` hook says it (epic `data` P50, Q94):
   * Spanish's `mientras se completa un trabajo`, `completa` => `completar`, `completer`, `completir` (the hook takes the
   * one an action has);  none:  as `verbsForDoing` says, English's `while completing a job`.
   * - See `while_hook`.
   */
  verbsForDuring?: (word: string) => string[]
  /**
   * The names a failure step tests an error by, as written in quotes, and the core's name each means
   * (epic `data` Q95):  English's `"not found"`, Spanish's `"no encontrado"`, both the core's `"not found"`.
   * - See `error_is`, `core.errorIs()`.
   */
  errorNames?: Record<string, string>
  /**
   * Little words an action's title writes in lower case, unless first:  `Put Card on Pile` (epic `language` J156).
   * - Its articles, conjunctions and short prepositions:  English's `a`, `the`, `and`, `on`;  Spanish's `la`, `y`, `en`.
   */
  titleSmallWords: Set<string>
  /** Words which end a type's name of several words, e.g. `aka`. */
  typeNameStopWords: Set<string>
  /** How a file's raw text declares things, found before it's parsed. */
  declarations: DeclarationPatterns
  /** What a warning calls each kind of place, by its word in code;  none:  the word itself, English's. */
  placeKinds?: Readonly<Record<string, string>>
  /** The word between a list and what it holds:  `of` in `list of cards`, `de` in `lista de cartas`. */
  listOfWord: string
  /** What a saved type's two times are called in this language:  `creado`.  Its rows say `created` and `modified` in every one. */
  savedTimeWords: { created: string; modified: string }
  /**
   * How an event still HAPPENING is named, which a handler can cancel (epic `elemental-spell` P9, Q27):
   * English's `-ing` (`closing`), Spanish's gerund (`cerrando`) -- see `send`'s rule.
   */
  ongoingEventName: RegExp
  /**
   * The app's own actions, as a menu names them, by their method (epic `elemental-spell` P10):
   * `{ deshacer: "undo", rehacer: "redo" }` -- see `define_menu`.
   */
  appActions: Record<string, string>
  /**
   * `<action>`'s own attribute, a button showing only its icon (epic `language` P53):
   * English's `icon-only`, Spanish's `solo-icono` -- see `action_button`.
   * - Read without accents too:  `sólo-icono` ~== `solo-icono`.
   */
  iconOnlyAttribute: string
  /**
   * `<action>`'s own attribute in a modal's actions, a button that leaves the modal open (epic `language` T155):
   * English's `keep-open`, Spanish's `mantener-abierto` -- see `SpellJSX.markDialog()`.
   * - Read without accents too.
   */
  keepOpenAttribute: string
  /**
   * The words that say which answer a modal's button gives, `<action ok />`, and that `the result` is compared to,
   * `if the result is ok` (epic `language` T155):  each word => its answer, `ok` or `cancel`.
   * - English's `{ ok: "ok", cancel: "cancel" }`, Spanish's `{ aceptar: "ok", cancelar: "cancel" }`.
   * - English's are read in every language too, as `keep-open` is;  case never matters.
   */
  answerWords: Record<string, DialogAnswer>
  /**
   * The tag of an example on a page, in a drawing (epic `elemental-spell` P16):
   * English's `<example "one counter">`, Spanish's `<ejemplo "un contador">`.
   * - SEE:  `example_block`.
   * - Its tokenizer reads a quoted name after it (`P.Tokenizer.quotedNameTags`).
   */
  exampleTag: string
  /**
   * What a quoted word after a tag becomes, for a tag two languages spell alike (`P.Tokenizer.quotedNameTags`):
   * Spanish's `<panel "Ajustes">` is `etiqueta="Ajustes"`, English's `<panel "Settings">` `label="Settings"`.
   */
  quotedNameTags?: Record<string, string>
  /**
   * An app's widget defaults, a block of sample tags (epic `language` P29):  `<ui-defaults>`, in every language --
   * see `ui_defaults`.
   * - Spell UI's own word, as `<ui-button>` is:  a Spanish page writes it the same way.
   */
  defaultsTag: string
  /**
   * How the kind of a property's values is named, its `{type}` and `{property}` filled in (epic `spanish` P22):
   * English's `{type} {property}`, `card suit`;  Spanish's `{property} de {type}`, `palo de carta`.
   * - See `Language.propertyKindName()`.
   */
  propertyKindName: string
  /**
   * How a type's line names a Spell UI element it's built on, its `{noun}` filled in (epic `from-console` P11):
   * English's `ui {noun} view`, `a "netlist column" is a ui tree view`;  Spanish's `vista ui de {noun}`,
   * `una "columna de netlist" es una vista ui de árbol`.
   * - The noun is the element's, bare, as a drawing names it (`<tree>`, `<árbol>`).
   * - See `SP.UIViews`.
   */
  uiViewName: string
  /**
   * Words which name `it` as an OBJECT -- the thing a method runs on, or the last `get` -- e.g. Spanish's `eso`.
   * - None:  `it` itself, as English writes it (`print it`), the `it` variable's own name.
   * - A variable a person named the same word wins:  this is only a second name for `it`.
   */
  itWords?: Set<string>
  /**
   * Words that point back to what a line is about, e.g. English's `it`, `its`, `them`:  a reference to read,
   * but Spell's own small word, so the bubbly look draws it plain, never bold (`SP.BubblyLayout`).
   */
  pronouns: Set<string>
  /**
   * How a condition starting `which` names its subject, the item (epic `language` T133):
   * `the cards in the deck which are face up` reads as `... where it is face up`.
   * - `subject`:  the word read before it, English's `it`
   * - `joins`:  the words joining its clauses, English's `and`, `or`:  the word after each starts a clause too
   * - `singularVerbs`:  a clause's first word, a plural verb, as the item's own:  `are` => `is`, `have` => `has`;
   *   `aren't` => `isn't`, its `'` and all (`SpellStatement.singularVerbAt()`)
   * - None:  the language leaves the subject out after `where` too, Spanish's `que están boca arriba` (`implied_it`).
   */
  whichClause?: { subject: string; joins: ReadonlySet<string>; singularVerbs: Readonly<Record<string, string>> }
  /**
   * A verb with `it` fused onto its end, its verb captured, e.g. Spanish's `barajarla` => `barajar` (epic `spanish` J96).
   * - In a type's outline body, `- para barajarla:` is English's `- to shuffle it:`:  the receiver goes where `it` was.
   * - None:  the language writes `it` as a word of its own, `subject_it`.
   */
  fusedIt?: RegExp
  /**
   * A little word and the two it stands for, e.g. Spanish's `{ al: "a el", del: "de el" }` (epic `spanish` J96).
   * - A method's words and its calls may say either:
   *   `dar la vuelta al mazo` is `dar la vuelta a el mazo`,
   *   and before an argument, `mover (una carta) a (una pila)` takes `mover la carta al montón`.
   * - None:  the language has none.
   */
  contractions?: Record<string, string>
  /**
   * The language's words for the built-in types' members, by their English words:  `{ length: ["largo", "longitud"] }`.
   * - Each reads as its English one does (`SP.BUILT_IN_TYPE_TABLE`'s `readAs`).
   * - A `stored` member's compiles to its English name, and sets too:  Spanish's `nombre` is `.name`.
   * - None:  the English words.
   */
  builtInMembers?: Record<string, string[]>
  /**
   * What a stored built-in member's values compile to, when said in the language's own words -- `undefined` if they're English:
   * e.g. `{ lock: { bloqueado: "locked", desbloqueado: "unlocked" } }`, so `- su candado es bloqueado` is `locked`.
   * - Each key names a built-in member, as `builtInMembers` does.
   */
  builtInMemberValues?: Record<string, Record<string, string>>
  /**
   * Spell's own words the language no longer takes, each with the word that replaced it:
   * English's `{ parts: "slots" }` (epic `elemental-spell` P27).
   * - Two words at most:  `wait for`.
   * - A replacement of nothing, `""`:  the word is simply gone, e.g. `wait for: deal` is now `deal` (epic `language` P13).
   * - Still read where a rule spells it, so the line keeps its meaning;  but each is a parse error naming its
   *   replacement, which `spell lint --fix` puts in its place -- see `SpellType.noteRetiredLiterals()`.
   * - None:  nothing retired.
   * - NOT a type's word:  the old words for views (`drawable thing`, `dibujable`) are gone,
   *   free for a program's own names (epic `language` T25).
   */
  retiredWords?: Record<string, string>
  /**
   * `retiredWords` true of one rule only, by its name, where the same word has a different replacement elsewhere:
   * English's `{ start_process: { animation: "process" } }`, as `animation` alone is now `to`.
   */
  retiredRuleWords?: Record<string, Record<string, string>>
  /**
   * The line saying a thing has an ability, by the ability's English name:  `it is draggable`, Spanish's `es arrastrable`.
   * - What `DragAndDrop`'s warning for the old words (`can be dragged`) says to write.
   */
  abilityLines?: Record<string, string>
  /**
   * Its words for a PAGE (epic `language` P47):  its head, `"button api" is a notebook page`, and the tags its body
   * draws with -- see `PageWords`.
   * - None:  a page in this language reads English's.
   */
  page?: PageWords
}

////////////////
// ## A page's words
////////////////

/**
 * A language's words for a PAGE (epic `language` P47):  its plain head, and the tags its body draws with.
 * - Each table maps a word as a person writes it to what it means, named in English:
 *   Spanish's `{ cuaderno: "notebook" }`.
 * - The page tokenizer (`SP.PageTokenizer`) knows no other words.
 * - Several spellings may mean one thing, e.g. `vacío` and `vacio`:  the first is the one a writer uses.
 */
export type PageWords = {
  /**
   * The language's word for Spell:  `spell`, Spanish's `encanto`.
   * - A block of plain Spell in a page's body is the word alone, `<spell>`.
   */
  prefix: string
  /** The language's word for a page, `page`, `página`:  a page's head is a tag of that word. */
  page: string
  /** A page's flags, the bare words before its `page`, by their English names:  `notebook`, `locked`. */
  flags: Record<string, string>
  /**
   * A tag whose head is a spell phrase, deciding what a drawing shows:  `if`, `otherwise if`, `for each` ...
   * - A word of several words is written with single spaces:  `otherwise if`, Spanish's `de lo contrario si`.
   */
  controls: Record<string, PageControlKind>
  /** `<for>`'s own attributes, in this language, by their English names:  a head's phrase ends at the first. */
  forAttributes: Record<string, string>
  /** A bare `empty` or `loading` right after one of these is the phrase's:  `<for films where it is empty>`. */
  forFlagsNotAfter: string[]
  /** Words that start a list of two words, `its films`:  any other first word, `films doubling`, is a flag out of place. */
  forListWords: string[]
  /**
   * A PAGE'S HEAD (epic `language` P45):  `"button api" is a notebook page`, Spanish's
   * `"api del botón" es una página cuaderno`, its body indented under it.
   * - Its groups:  `name`, the page's name;  `flags`, its bare words in the language's words, `notebook locked`.
   */
  plainPage: RegExp
  /**
   * The word a writer puts on a page's head to lock it, agreeing with the page's word (epic `language` J76):
   * Spanish's `bloqueada`, for `una página bloqueada`.
   * - Every word for `locked` still reads;  this is only what's written.
   * - None:  `locked`.
   */
  plainPageLocked?: string
  /** The code-spell line each tag reads as (`SP.PageTwin`). */
  twins: PageTwinWords
}

/**
 * A language's code-spell twin of a page's head and of each tag its body draws with:  how `SP.PageTwin` writes the
 * line it reads as.
 * - Each is a line of code spell with SLOTS, its words separated by spaces;  a word that isn't a slot is the
 *   language's own:  `{words}`, the page's name as words;  `{phrase}`, a control's phrase.
 */
export type PageTwinWords = {
  /** A page's line:  `{words} is a page :`. */
  page: string
  /** Its drawing:  `to draw it :`. */
  draw: string
  /**
   * A page's `locked`:  a line in its body, `its lock is locked` (epic `notebook` P1).
   * - Its value quoted:  a built-in member written by hand has no list of values for a bare word to name.
   */
  pageLocked: string
  /**
   * A section of a page, as its drawing writes it (epic `notebook` P3, J1):
   * Spell UI's `<section>` in the language's words, sticky and foldable as the docs pages' sections are.
   * - The twin wraps each `##` heading and what follows it in one, its `label` the heading.
   * - A `<section label="...">` written at the page's top level gets its `defaults` too, each it doesn't say itself.
   * - NOT a component of the parser's:  the words the language's component pack reads (`<es-seccion pegado>`).
   */
  pageSection: PageSectionWords
  /** A control, by its kind:  `{ if: "if {phrase}", otherwise: "otherwise" }`. */
  controls: Record<string, string>
  /** What `SP.PageTwin` writes for `<for>`'s attributes:  a line of code spell each, in the loop's body. */
  forTag: PageForWords
}

/** The words of what `<for>`'s attributes read as -- see `SP.PageTwin`. */
export type PageForWords = {
  /** The rider for what shows while waiting. */
  waiting: string
  /** The rider for what shows when there are none. */
  none: string
  /** The rider for what shows when it fails. */
  failed: string
  /** The failure's own message, its Try again kept. */
  failedSay: string
  /** The rider naming what goes around the items. */
  items: string
  /** The rider naming what goes around everything, the title. */
  whole: string
  /** A list drawn a page at a time. */
  inPages: string
  /** A list drawn whole. */
  allAtOnce: string
  /** How many a list draws at once, with `{size}` for the number. */
  atATime: string
  /** The word in `loading={no}`. */
  no: string
  /** `paging="pages"`'s value. */
  pages: string
  /** `paging="none"`'s value. */
  none_: string
  /** `as="table"`'s value. */
  table: string
  /** A row's tag, in that table. */
  row: string
  /** What a bare `empty` says. */
  nothingFound: string
}

/** A page's section, in a language's words:  see `PageTwinWords.pageSection`. */
export type PageSectionWords = {
  /** The section's tag, its bare component word:  `section`, `seccion`. */
  tag: string
  /** Its title's attribute:  `label`, `etiqueta`. */
  label: string
  /**
   * The rest of its attributes, by name:  a value, or `true` for a bare one.
   * - `{ sticky: "stack", collapsible: true, dividing: true, level: "2" }`
   */
  defaults: Record<string, string | true>
}

/**
 * The words a page or view's name is read by:  `Pinned Screens & Hardware` => `Pinned Screens Hardware`.
 * - A name is its title (epic `mockup` P17), so it can hold what no type's name can:  `&`, `?`, `'` are left out here.
 * - What it's called, with them, stays as written.
 */
export function plainPartName(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** A control tag in a page's drawing:  an if-chain's branches (Q53), or a loop. */
export type PageControlKind =
  | "if"
  | "otherwise if"
  | "otherwise"
  | "for each"
  // what a `<for>` shows in place of its items:  `<loading>`, `<empty>`, `<failed>`
  | "for waiting"
  | "for none"
  | "for failed"

/**
 * How a language's raw text declares things, found before a file is parsed (`SpellParser.declaredTypes()` ...),
 * so a line can name a type or call a method declared further down.
 */
export type DeclarationPatterns = {
  /** A line declaring a type:  `gim`, its groups a one-word name, a several-word name, a created type, an app. */
  typeDeclaration: RegExp
  /**
   * A line naming its kind:  `gim`, its groups an article (when it has one), its name, and its kind's words,
   * up to 4 of each:  `a card game is an app`, `klondike is a card game:` (epic `elemental-spell` J50).
   * - With no article, its name the first words:  never `its` / `the` / an article.
   * - Read by `SpellParser.oneOfAKindsIn()`:  a line with no article declares a one-of-a-kind only when its kind is
   *   an app or a page, or a kind of one.
   */
  kindDeclaration: RegExp
  /**
   * An ability's word, which a type's line may put beside its kind:  `iu`, the whole word,
   * e.g. `draggable` in `a "card" is a draggable two sided view` (`draggable_or_droppable`).
   * - Read by `SpellParser.declaredSuperTypes()`:  the kind is the words left, `two sided view`.
   * - And by `SP.BubblyLayout`, which draws it bold as a name, there and in a list's short forms
   *   (`it is droppable when`, `its cards are draggable when`:  Spanish's plural, `arrastrables`, too).
   */
  abilityWord: RegExp
  /** A line declaring a value kind:  `gim`, its plural name captured, e.g. `suits`. */
  valueKindDeclaration: RegExp
  /**
   * A line of a type's body declaring a property with a list of values, its property's words captured
   * (in the first group, or the second), e.g. `suit` in `- its "suit" is one of ...`:
   * it declares the kind `card suit` (epic `spanish` P22).
   * - `iu`, never `g`:  it's tried line by line.
   */
  propertyListDeclaration: RegExp
  /**
   * A line of a type's body declaring a property, the `-` gone, its words in group `has` or `is`:
   * `it has a deck as a deck`, `its "suit" is a suit`, `deck is a deck`.
   * - `iu`, never `g`:  it's tried line by line.
   */
  propertyLine: RegExp
  /**
   * A line at a file's top declaring a property, in groups `type` and `property`:
   * `a card has a suit`, `cards have a suit`, `the short rank of a card is ...`.
   * - `iu`, never `g`:  they're tried line by line.
   */
  typePropertyLines: RegExp[]
  /** A line starting a method definition, e.g. `to play a card`. */
  methodLine: RegExp
  /**
   * A line defining a type's question, what it matched its head, its body left out (epic `language` I154):
   * `it "can go up" if`, `"can go up" if`, at a file's top `a card "can go up" if`.
   * - `iu`, never `g`:  it's tried line by line.
   */
  questionLine: RegExp
  /** A line re-opening a type, its name captured, e.g. `a solitaire:`. */
  reopenedType: RegExp
  /**
   * A place's line, its name captured:  `family cookbook is a web server at "...":`, so what's under it can be found.
   * - `iu`, never `g`:  it's tried line by line.
   */
  placeDeclaration: RegExp
}
