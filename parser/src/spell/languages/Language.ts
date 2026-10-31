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
}

/** One of the parser's messages, e.g. `dont-understand` -- see `PARSER_MESSAGES`, English's. */
export type ParserMessageKey = keyof typeof PARSER_MESSAGES

/** Every one of the parser's messages, in one language:  what a language pack holds (`Language.parserMessages`). */
export type ParserMessages = Record<ParserMessageKey, string>

/**
 * The language part of a spell file's name, before its `.spell`:  `es` in `Carta.es.spell`, `pt-BR` in `x.pt-BR.spell`.
 * - A markup file says it the same way:  `Carta.es.spellml`, or the old `Carta.es.spellx` (`SP.isSpellmlName()`).
 * - A path may follow with a range, as in declarations' `defined`:  `/Carta.es.spell:71-92`.
 */
const FILE_LANGUAGE = /\.([a-z]{2}(?:-[A-Za-z]{2,4})?)\.spell(?:ml|x)?(?::[\d-]*)?$/

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
   * A notebook's example tag, in a drawing (epic `elemental-spell` P16):  English's `<example "one counter">`,
   * Spanish's `<ejemplo "un contador">` -- see `example_block`.
   * - Its tokenizer reads a quoted name after it (`P.Tokenizer.quotedNameTags`).
   */
  exampleTag: string
  /**
   * How the kind of a property's values is named, its `{type}` and `{property}` filled in (epic `spanish` P22):
   * English's `{type} {property}`, `card suit`;  Spanish's `{property} de {type}`, `palo de carta`.
   * - See `Language.propertyKindName()`.
   */
  propertyKindName: string
  /**
   * Words which name `it` as an OBJECT -- the thing a method runs on, or the last `get` -- e.g. Spanish's `eso`.
   * - None:  `it` itself, as English writes it (`print it`), the `it` variable's own name.
   * - A variable a person named the same word wins:  this is only a second name for `it`.
   */
  itWords?: Set<string>
  /**
   * A verb with `it` fused onto its end, its verb captured, e.g. Spanish's `barajarla` => `barajar` (epic `spanish` J96).
   * - In a type's outline body, `- para barajarla:` is English's `- to shuffle it:`:  the receiver goes where `it` was.
   * - None:  the language writes `it` as a word of its own, `subject_it`.
   */
  fusedIt?: RegExp
  /**
   * A little word and the two it stands for, e.g. Spanish's `{ al: "a el", del: "de el" }` (epic `spanish` J96).
   * - A method's words and its calls may say either:  `dar la vuelta al mazo` is `dar la vuelta a el mazo`,
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
   * Words for built-in types the language no longer takes, each with the words that replaced it (epic `elemental-spell`):
   * English's `{ "drawable thing": "view" }`.
   * - Still read, so the line keeps its meaning;  but each is a parse error naming its replacement,
   *   which a quick fix can put in its place -- see `SpellType.retiredWordErrorsIn()`.
   * - None:  nothing retired.
   */
  retiredTypeWords?: Record<string, string>
  /**
   * Spell's own words, outside its type words, the language no longer takes, each with the word that replaced it:
   * English's `{ parts: "slots" }` (epic `elemental-spell` P27).
   * - Two words at most:  `wait for`.
   * - A replacement of nothing, `""`:  the word is simply gone, e.g. `wait for: deal` is now `deal` (epic `language` P13).
   * - Still read where a rule spells it, so the line keeps its meaning;  but each is a parse error naming its
   *   replacement, which `spell lint --fix` puts in its place -- see `SpellType.noteRetiredLiterals()`.
   * - None:  nothing retired.
   */
  retiredWords?: Record<string, string>
  /**
   * `retiredWords` true of one rule only, by its name, where the same word has a different replacement elsewhere:
   * English's `{ start_process: { animation: "process" } }`, as `animation` alone is now `to`.
   */
  retiredRuleWords?: Record<string, Record<string, string>>
  /**
   * Its words for spellx, the tag-shaped form of a spell file (epic `elemental-spell`):  see `SpellxWords`.
   * - None:  a spellx file in this language reads English's.
   */
  spellx?: SpellxWords
}

////////////////
// ## Spellx's words
////////////////

/**
 * A language's words for SPELLX, the tag-shaped form of a spell file (epic `elemental-spell`):  a CLOSED vocabulary.
 * - Each table maps a word as a person writes it to what it means, named in English:
 *   Spanish's `{ propiedad: "property" }`.
 * - The spellx tokenizer (`SP.SpellxTokenizer`) knows no other words:
 *   one that's in none of these is an error naming the closest.
 * - Several spellings may mean one thing, e.g. `página` and `pagina`:  the first is the one a writer uses.
 */
export type SpellxWords = {
  /** The first word of a template's tag:  `spell` in `<spell-view>`, `encanto` in `<encanto-vista>`. */
  prefix: string
  /** A template's word, after the prefix and its dash:  `view` in `<spell-view>`. */
  templates: Record<string, SpellxTemplateKind>
  /** A tag that declares a member of its template:  `<property>`, `<alias>`, `<action>` ... */
  declarations: Record<string, SpellxDeclarationKind>
  /** A tag holding prose about what it's in:  `<description>`, `<comment>`. */
  notes: Record<string, SpellxNoteKind>
  /** A tag whose head is a spell phrase, handling an event:  `on` in `<on mouse down>`. */
  handlers: Record<string, SpellxHandlerKind>
  /**
   * A tag whose head is a spell phrase, deciding what a drawing shows:  `if`, `otherwise if`, `for each` ...
   * - A word of several words is written with single spaces:  `otherwise if`, Spanish's `de lo contrario si`.
   */
  controls: Record<string, SpellxControlKind>
  /**
   * An attribute's name => its English name:  Spanish's `{ "uno-de": "one-of", frase: "alias" }`.
   * - English's map each to itself, so every name a reader meets is in one table.
   * - An event's attributes are its parameters, never checked here.
   */
  attributes: Record<string, string>
  /**
   * Code spell's TWIN of each tag, in this language:  the line a spellx tag reads as (epic `elemental-spell` P6).
   * - A spellx file is read by spell's own rules:  each tag line is made into its twin's tokens, which parse as code
   *   spell's line would (`SP.SpellxTwin`).
   * - None:  a spellx file in this language can't be read yet.
   */
  twins?: SpellxTwinWords
}

/**
 * A language's code-spell twin of each spellx tag:  how `SP.SpellxTwin` writes the line a tag reads as.
 * - Each is a line of code spell with SLOTS, its words separated by spaces;  a word that isn't a slot is the
 *   language's own, e.g. `its {name} is one of {one-of}`.
 * - The slots:
 *   - `{name}`:  the tag's name, quoted (`"suit"`);  `{words}`:  its name as words (`turn it over`)
 *   - `{<attribute>}`:  an attribute's value as spell, e.g. `{one-of}`;  `{quoted <attribute>}` quoted, as text
 *   - `{phrase}`:  a handler's or control's phrase
 *   - `{super}`:  the template it extends;  `{aka}`:  its short name
 *   - `{a <slot>}`:  the indefinite article agreeing with that slot's first word (`a card`, `an app`)
 *   - `{param}` / `{value}`:  an event's parameter, its name and its kind
 */
export type SpellxTwinWords = {
  /** A template, named by a quoted name:  `{a name} {name} is {a super} {super} :`. */
  template: string
  /** A template with a short name too, `aka=`:  its name as words, `{a words} {words} aka {aka} is ...`. */
  templateAka: string
  /** A one-of-a-kind template, `<spell-app>` or `<spell-page>`:  `{words} is {a super} {super} :`. */
  singleton: string
  /** What each kind of template extends, when it names no `template=`:  `{ view: "view", "page template": "page" }`. */
  supers: Record<string, string>
  /** A property's twin, by what the tag holds. */
  property: {
    /** a list of values, `one-of=`, and nothing inside */
    list: string
    /** a list of values, and lines inside working out its value */
    listBody: string
    /** lines inside working out its value */
    body: string
    /** its value on the tag's own line:  `<property "deck">a new deck</>` */
    value: string
    /** nothing but its name */
    bare: string
  }
  /** One of a property's own aliases, `alias=`:  `it {quoted alias}`. */
  propertyAlias: string
  /** An alias tag:  `it {name}`, then its body. */
  alias: string
  /** An alias tag whose body is the indented lines:  `it {name} :`. */
  aliasBlock: string
  /** An action:  `to {words} :`. */
  action: string
  /** An action's details, by attribute:  `{ shortcut: "shortcut {shortcut}" }`. */
  actionDetails: Record<string, string>
  /** A test:  `to test {words} :`. */
  test: string
  /** An event its things send:  `it sends {name}`. */
  event: string
  /** The words before an event's parameters:  `with`. */
  eventWith: string
  /** One of an event's parameters:  `{param} as {a value} {value}`. */
  eventParam: string
  /** The word joining two of them:  `and`. */
  eventAnd: string
  /** A drawing:  `to draw it :`. */
  draw: string
  /** A slot's drawing:  `to draw its {words} :`. */
  drawSlot: string
  /** A slot placed in a drawing:  `draw its {words}`. */
  placeSlot: string
  /**
   * A menu, its `<action>`s quoted after it (epic `elemental-spell` P10):
   * `its {name} is a menu of`, then `"deal" , "-" and "undo"`.
   */
  menu: string
  /** The words between a menu's items:  the last pair's, `and`. */
  menuAnd: string
  /** An app's menu bar, its tag's `menu-bar=`:  a line ending its body, `its menu bar is {quoted menu-bar}`. */
  menuBar: string
  /**
   * A group of a template's members, a heading over the members after it (epic `elemental-spell` P16):
   * `group {name}`;  its `description=` a comment ending the line.
   */
  group: string
  /**
   * A notebook's body, a drawing of prose, markup and examples (epic `elemental-spell` P16):
   * its slot's drawing, `to draw its content :`.
   */
  notebookContent: string
  /** A notebook's `locked`:  a line in its body, `its lock is locked`. */
  notebookLocked: string
  /**
   * A template's bare `draggable`, `droppable`, `selectable`:  a line in its body, by the attribute's English name,
   * the same line `- it is draggable` writes (`DragAndDrop`), so the class gets the same `canBeDragged` flag.
   */
  viewFlags: Record<string, string>
  /** What starts a notebook, after it:  `start {words}`, as an app's file says `start the game`. */
  start: string
  /** A handler, by its kind:  `{ on: "on {phrase} :" }`. */
  handlers: Record<string, string>
  /** A control, by its kind:  `{ if: "if {phrase}", otherwise: "otherwise" }`. */
  controls: Record<string, string>
}

/** What a spellx template tag makes:  `<spell-view>` a view's template, `<spell-app>` an app ... */
export type SpellxTemplateKind = "view" | "thing" | "page" | "app" | "page template" | "app template" | "notebook"

/** What a spellx member tag declares. */
export type SpellxDeclarationKind = "property" | "alias" | "action" | "draw" | "event" | "test" | "menu" | "group"

/**
 * A spellx block of prose:  a member's long description, a comment among its lines,
 * or a template's own property editor (`<property-editor>`):  the Inspector's layout for its things, as markup.
 */
export type SpellxNoteKind = "description" | "comment" | "property editor"

/**
 * A spellx handler:  `on` and `when` a moment (Q42), `while` a state lasts (Q51);
 * or an ability, a tag of its own, `<clickable when it is face down/>` (epic `debut` P27, Q47) --
 * `items draggable` is a list's `<cards draggable when .../>`.
 */
export type SpellxHandlerKind = "on" | "when" | "while" | SpellxAbilityKind

/** An ability's tag:  `<draggable/>`, `<clickable when .../>`, a list's `<cards draggable when .../>`. */
export type SpellxAbilityKind = "draggable" | "clickable" | "selectable" | "droppable" | "items draggable"

/** The abilities' tag kinds, which need no words after them:  `<draggable/>`. */
export const SPELLX_ABILITY_KINDS: readonly string[] = [
  "draggable",
  "clickable",
  "selectable",
  "droppable",
  "items draggable"
]

/** A spellx control tag in a drawing:  an if-chain's branches (Q53), or a loop. */
export type SpellxControlKind = "if" | "otherwise if" | "otherwise" | "for each"

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
  /** A line re-opening a type, its name captured, e.g. `a solitaire:`. */
  reopenedType: RegExp
}
