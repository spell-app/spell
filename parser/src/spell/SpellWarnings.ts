/**
 * Warnings about a spell program:  something it should say, which doesn't stop it parsing or running.
 * - e.g. a property declared with no type, `a calculator has an input`:
 *   "Say what "input" is, e.g. "a calculator has an input as text"".
 * - Worded in the program's language, by its pack's messages (epic `spanish` P17):
 *   `SP.Language.of(scope).parserMessage(key, params)`, e.g. Spanish's `Di qué es "entrada" ...`.
 * - Parse errors are the other kind of problem:  a line spell can't read (`SP.Block.getParseErrors()`).
 *   A line with a warning compiles as it is.
 * - Plain matches and their `data`, no scope of its own:
 *   imports only `spell/util`, `spell-parser/parser`, and `spell-parser/spell` (read at call time),
 *   and `Synonyms`, the article word rules' class.
 */
import { upperFirst } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Synonyms } from "spell-parser/spell/rules/expressions"

/**
 * Notes warnings on matches while parsing, and gathers a file's back up.
 * - A rule notes one on its OWN match's `data.warnings` (`note()`), WHILE PARSING:
 *   in `parse()`, or `mutateScope()` for what it only knows then.
 *   NEVER in `getAST()`, which is pure.
 * - Shown under their text by editors (`SpellLanguageService.diagnostics()`, as `DiagnosticSeverity.Warning`), and
 *   listed by `spell compile` after its errors, which they never count as.
 * - STATIC and instance-free on purpose:  what it knows is on the matches, which incremental parsing keeps or
 *   replaces line by line.  So `in()` walks the file's match as it is now, never a list kept beside it.
 */
export class SpellWarnings {
  /**
   * Note `message` on `match`, about `at` (default `match` itself):  editors show it under `at`'s text.
   * - e.g. a method's untyped parameter, `(digit)` in `to append (digit) to (a calculator)`.
   * - SIDE EFFECT:  adds it to `match.data.warnings` -- once:  the same message about the same match again is ignored,
   *   e.g. a `mutateScope()` run twice.
   */
  static note(match: P.Match, message: string, at: P.Match = match): void {
    SpellWarnings.add(match, { message, at })
  }

  /**
   * Note `message` on `match`, as `note()` does, but `in()` reports it only while `stillHolds()` says so.
   * - For what a LATER line, or a later file, can settle,
   *   e.g. a property read here (`the name of the pile`) which `a pile has a name` further down declares.
   * - `stillHolds()` is asked when the warnings are gathered:  with what the whole project declares by then.
   *   So it may read scope records found while parsing (a `P.TypeScope`), but NEVER look them up afresh.
   */
  static noteIf(match: P.Match, message: string, stillHolds: () => boolean, at: P.Match = match): void {
    SpellWarnings.add(match, { message, at, stillHolds })
  }

  /**
   * Note a warning on `statement` for each article which doesn't agree with its noun (epic `spanish` P8).
   * - e.g. English's `a apple`:  "Did you mean "an apple"?";  Spanish's `el carta`:  "¿Querías decir "la carta"?".
   * - Under the article.  The language's pack says what agrees (`SP.Language.agreement()`),
   *   and words it, its `did-you-mean` message.
   * - An article is a form of the language's `indefinite_article` or `definite_article` word rule;
   *   its noun, the words after it, up to a structural word (`of`, `is` ...):
   *   - the most of them, up to 3, which name a type, e.g. `bank account`
   *   - else the first, with no type:  English's `a` / `an` needs none, Spanish's genders do
   * - Not an article a program named something, e.g. a variable `a`.
   * - Called by `BlockLine.parse()` for each line's statement, once it's committed:
   *   so a type the line itself declares, `una carta es una cosa`, already has its gender.
   *   A type only declared further down has none yet:  no warning.
   * - NEVER throws.
   */
  static noteArticles(statement: P.Match): void {
    const { scope } = statement
    const language = SP.Language.of(scope)
    if (!language.articles) return
    const { tokens } = statement
    try {
      P.Inflector.using(language.inflector, () => {
        for (let index = 0; index < tokens.length - 1; index++) {
          const article = ARTICLE_RULES.map((rule) => Synonyms.matchAt(scope, rule, tokens, index)).find(Boolean)
          if (!article) continue
          const form = Synonyms.formOf(article)
          if (scope.variables?.get(form)) continue
          const noun = SpellWarnings.nounAt(scope, tokens, index + article.length, language)
          const expected = noun && language.agreement(form, noun.words.toLowerCase(), noun.type)
          if (!noun || !expected) continue
          const phrase = `${expected} ${noun.words}`
          SpellWarnings.note(statement, language.parserMessage("did-you-mean", { phrase }), article)
        }
      })
    } catch (error) {
      // only a warning:  never stop the line parsing
      console.error("SpellWarnings.noteArticles():  couldn't check the line's articles", error)
    }
  }

  /**
   * The noun at `tokens[start]`, after an article:  its words as written, and the type they name, if any.
   * - The most words, up to 3, naming a type;  else the first word, `type` `undefined`.
   * - Words only, up to a structural one (`memberStopWords`, the blacklist):  `undefined` if there's none.
   */
  private static nounAt(
    scope: P.Scope,
    tokens: P.Token[],
    start: number,
    language: SP.Language
  ): { words: string; type: P.TypeScope | undefined } | undefined {
    const { memberStopWords, blacklist } = language.words
    const words: string[] = []
    for (const token of tokens.slice(start, start + MAX_NOUN_WORDS)) {
      const word = `${token.value}`
      if (
        !(token instanceof P.WordToken) ||
        memberStopWords.has(word.toLowerCase()) ||
        Object.hasOwn(blacklist, word.toLowerCase())
      ) {
        break
      }
      words.push(word)
    }
    for (let count = words.length; count > 0; count--) {
      const written = words.slice(0, count).join(" ")
      const type = scope.getType(SP.typeName(written))
      if (type) return { words: written, type }
    }
    return words.length ? { words: words[0]!, type: undefined } : undefined
  }

  /** Add `warning` to `match.data.warnings` -- once:  the same message about the same match again is ignored. */
  private static add(match: P.Match, warning: NotedWarning): void {
    const data = match.data as WarningsData
    if (data.warnings?.some(({ at, message }) => at === warning.at && message === warning.message)) return
    ;(data.warnings ??= []).push(warning)
  }

  /**
   * Every warning noted on `match` and the matches below it, in the order of their text.
   * - `match` is a file's or a block's, e.g. `file.match`.
   * - Walks what each match `matched`, and the matches rules keep in their `data`, e.g. a statement's parsed body, or
   *   what JSX parses out of `{...}`.
   * - Only those about `match`'s own TOKENS:  a rule's `data` may point at a match in another file,
   *   or at one parsed from a string, e.g. the signature in `a card "is the (color) joker" if ...`,
   *   whose positions are in that string.  Such a rule notes its warnings again, about its own text.
   * - Only those which still hold, for one noted with `noteIf()`.
   */
  static in(match: P.Match): SP.SpellWarning[] {
    const tokens = new Set<P.Token>()
    P.Tokenizer.forEachToken(match.tokens, (token) => tokens.add(token))
    const found = new Set<NotedWarning>()
    const seen = new Set<P.Match>()
    const visit = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      const { warnings } = each.data as WarningsData
      for (const warning of warnings ?? []) found.add(warning)
      for (const item of each.matched) if (item instanceof P.Match) visit(item)
      for (const value of Object.values(each.data)) {
        for (const item of [value].flat()) if (item instanceof P.Match) visit(item)
      }
    }
    visit(match)
    return [...found]
      .filter(({ at, stillHolds }) => tokens.has(at.tokens[0]!) && (stillHolds?.() ?? true))
      .sort((one, other) => (one.at.start ?? 0) - (other.at.start ?? 0))
      .map(({ message, at }) => ({ message, at }))
  }

  /**
   * A type to suggest for something called `words`, as a program would write it after `as`, in `scope`'s language:
   * - `a deck` when `words` names a type `scope` knows, e.g. a property called `deck`;  Spanish's `un mazo`
   * - else `text`, the most common;  Spanish's `texto`
   * - Only a guess, for a warning's example:  spell doesn't type anything by its name.
   */
  static exampleType(scope: P.Scope, words: string): string {
    const language = SP.Language.of(scope)
    const datatype = SP.typeName(words)
    const type = datatype === "text" ? undefined : scope.getType(datatype)
    return type ? language.withArticle("indefinite", words, type) : language.parserMessage("example-text")
  }

  /**
   * A list's item type to suggest for something called `words`, as written after `a new list of`:
   * - `words` itself, e.g. `tasks`, when it names a type `scope` knows
   * - else `text`, in `scope`'s language
   */
  static exampleItemType(scope: P.Scope, words: string): string {
    return scope.getType(SP.typeName(words)) ? words : SP.Language.of(scope).parserMessage("example-text")
  }

  /**
   * `type`, as an example writes it, with its article:  `Pile` => `a pile`, Spanish's `Carta` => `una carta`.
   * - Its name lowercase, any `_` a `-`.
   * - The kind of a property's values by its words (epic `spanish` P22):  `a card rank`, `un rango de carta`.
   * - `kind`:  `indefinite` (default) or `definite`.
   */
  static exampleNoun(scope: P.Scope, type: P.TypeScope, kind: SP.ArticleKind = "indefinite"): string {
    const language = SP.Language.of(scope)
    const { valueKind } = type
    const words = valueKind?.property
      ? language.propertyKindName(valueKind.listOn, valueKind.property)
      : type.name.toLowerCase().replace(/_/g, "-")
    return language.withArticle(kind, words, type)
  }

  /**
   * What to say of a property or phrase on `type`, the kind of a property's values (epic `spanish` P22):
   * `A card rank is one of the values a card lists:  it can't have properties or aliases of its own`.
   * - It has no class to hold one (`P.ValueKind.property`).
   * - `undefined` for any other type, or when the type listing it isn't in `scope`.
   */
  static noMembersOnPropertyKind(scope: P.Scope, type: P.TypeScope | undefined): string | undefined {
    const listedBy = type?.valueKind?.property ? scope.types?.get(type.valueKind.listOn) : undefined
    if (!type || !listedBy) return undefined
    return SP.Language.of(scope).parserMessage("no-members-on-property-kind", {
      AKind: upperFirst(SpellWarnings.exampleNoun(scope, type)),
      aType: SpellWarnings.exampleNoun(scope, listedBy)
    })
  }
}

/** The word rules whose forms are articles, which must agree with their noun -- see `SpellWarnings.noteArticles()`. */
const ARTICLE_RULES = ["indefinite_article", "definite_article"]

/** Most words a noun after an article has, e.g. 2 for `bank account` -- see `SpellWarnings.noteArticles()`. */
const MAX_NOUN_WORDS = 3

/** What a match holding warnings has in its `data` -- see `SpellWarnings.note()`. */
type WarningsData = {
  /** Warnings noted on it, in the order noted. */
  warnings?: NotedWarning[]
}

/** A warning as noted on a match:  `in()` reports it while `stillHolds()`, if given -- see `SpellWarnings.noteIf()`. */
type NotedWarning = SP.SpellWarning & { stillHolds?: () => boolean }
