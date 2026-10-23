import { proto, upperFirst } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { getKnownType } from "spell-parser/spell/rules/types"
// Import directly to avoid circular import
import { Wording } from "spell-parser/spell/rules/expressions"
import { negatableSyntaxBits } from "spell-parser/spell/rules/methods"
import { SpellStatement } from "spell-parser/spell/rules/Statement"
import { placeholderData, placeholderForms, type QuotedPropertyFormulaBits } from "./classes.shared"
import { QuotedPropertyRule } from "./QuotedPropertyRule"

/**
 * `quoted_property_formula` rule:  `a card "is a (rank) of (suits)" for its ranks and its suits`.
 * - Defines a templated boolean method from a quoted phrase with `(placeholder)`s,
 *   plus a matching quoted-expression rule to call it, e.g. `a card is the queen of spades`.
 * - NOTE: the first word in quotes must be `"is"` !!
 * - `Priority.declaration`, so this wins over plainer statement rules that could otherwise partially match.
 * - SIDE EFFECT: `getBits()` derives (and caches in `match.data.bits`) what `mutateScope()` / `getAST()` use below:
 *   rulex `syntax`, per-placeholder `ruleData`, `vars` and the generated `property` name.
 * - SIDE EFFECT: `mutateScope()` registers a `QuotedPropertyRule` for the quoted phrase,
 *   e.g. `is (not)? a queen`, so it can be used like `card is a club`.
 * - Compiles to an instance method testing each placeholder against its property:
 *   e.g. `a card "is the (rank) of (suits)" for its ranks and its suits`
 *   => an `isTheRankOfSuits(rank, suit)` method returning `this.rank === rank && this.suit === suit`.
 */
export class QuotedPropertyFormula extends SpellStatement<"type|alias|sources?", QuotedPropertyFormulaMatchData> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "method", name: "alias", of: "type" }

  /**
   * Reject the match unless `alias`'s first quoted word is `"is"`:  see rule NOTE above.
   * - No `for its ...` (an outline body's `it "is a (suit)"`, epic page `outline-spell` P3, J9):
   *   INFER what each blank reads (see `inferPlaceholders()`).
   * - Only when the line is the phrase and nothing more, and then (J9, option A):
   *   - no blank at all, e.g. `it "is a suit"`:  an error, not an empty method (the parens are required)
   *   - a blank naming no property with a list of values, e.g. `it "is a (color)"`:  an error naming it
   *   - a blank of several words, e.g. `it "is near (another as a card)"`:  not ours, a `quoted_type_expression`
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // If the first word of `alias` isn't the language's `is` (`es` in Spanish), forget it
    const phrase = `${match.groups.alias.value}`.replace(/^["']|["']$/g, "")
    const alias = phrase.split(" ")
    if (!Wording.reads(scope, "is_or_is_not", alias[0] ?? "")) return undefined
    if (match.groups.sources) return QuotedPropertyFormula.resolveSources(match)
    // more after the phrase, e.g. `it "is face up" if ...`:  not ours, a `quoted_type_expression`
    if (tokens.slice(match.length).join("").trim()) return undefined
    const language = SP.Language.of(scope)
    if (!phrase.includes("(")) {
      return SpellStatement.refuse(match, language.parserMessage("phrase-without-blank", { phrase }))
    }
    const type = getKnownType(match.groups.type)
    const inferred = QuotedPropertyFormula.inferPlaceholders(alias, type)
    if (!inferred) return undefined
    if ("unlisted" in inferred) {
      const typeWords = SpellStatement.subjectWords(match) ?? language.wordFor("thing")
      const aType = language.withArticle("indefinite", typeWords, type)
      const message = language.parserMessage("blank-without-values", {
        word: inferred.unlisted,
        type: typeWords,
        aType
      })
      return SpellStatement.refuse(match, message)
    }
    match.data.inferred = inferred
    return match
  }

  /**
   * `match`, its `for its ...` properties found while parsing (into `data.sources`);
   * or a parse error naming the first with no list of values.
   * - As written, else by its singular:
   *   `for its suits` is a value kind's `suit` (epic page I5), or the sentence style's own `suits` list.
   */
  private static resolveSources(match: P.MatchFor<QuotedPropertyFormula>): P.Match {
    const type = getKnownType(match.groups.type)
    const sources: string[] = []
    for (const source of match.groups.sources!.items) {
      const name = `${(source.groups.property as P.Match | undefined)?.value}`
      const listed = QuotedPropertyFormula.listedProperty(type, [name, P.singularize(name)])
      if (!listed) {
        const language = SP.Language.of(match.scope)
        const typeWords = `${match.groups.type.raw}`
        const aType = language.withArticle("indefinite", typeWords, type)
        const message = language.parserMessage("source-without-values", { name, type: typeWords, aType })
        return SpellStatement.refuse(match, message)
      }
      sources.push(listed)
    }
    match.data.sources = sources
    return match
  }

  /**
   * The first of `names` which is a property of `type` with a list of values:
   * its own (`as one of ...`), or a value kind's (`its "suit" is a suit`),
   * maybe declared further down (a stub, so far).
   */
  private static listedProperty(type: P.TypeScope, names: string[]): string | undefined {
    for (const name of names) {
      const variable = type.variables.get(name)
      if (!variable) continue
      // its own list of values is kept as its plural, e.g. `Suits` for `its "suit" is one of ...`
      if (QuotedPropertyFormula.enumerationOf(type, name)) return variable.name
      const kind = type.getType(variable.datatype)
      if (kind?.valueKind || kind?.stub) return variable.name
    }
    return undefined
  }

  /**
   * `it "is a (suit)"` => `a card "is a (suit)" for its suits`:  the sources it inferred, written out.
   * See `SpellStatement.getLongForm()`.
   */
  getLongForm(match: P.MatchFor<this>): string | undefined {
    const params = SpellStatement.longFormParams(match)
    const { inferred } = match.data
    if (!params || !inferred) return super.getLongForm(match)
    const language = SP.Language.of(match.scope)
    const sources = inferred.sources
      .map((source) => {
        const plural = P.Inflector.using(language.inflector, () => P.pluralize(source))
        return language.parserMessage("long-form-source", { plural })
      })
      .join(language.parserMessage("long-form-and"))
    return language.parserMessage("long-form-phrase-for", { ...params, phrase: inferred.words.join(" "), sources })
  }

  /**
   * `alias`'s blanks (its words in parens), and the property each reads:
   * e.g. `is the (rank) of (suits)` on a card => `["rank", "suit"]`, what `for its ranks and its suits` would say.
   * - ONLY a word in parens is a blank;  a bare word is always just a word (epic page J9, Owen:  "require the parens").
   * - A blank names a property by its singular, e.g. `(suits)` => `suit`, as `for its suits` does.
   * - Only a property with a list of values:  its own (`as one of ...`), or a value kind's (`its "suit" is a suit`).
   * - `{ unlisted }`:  the first blank naming no such property, e.g. `color` for `is a (color)`.
   * - `undefined` if there's no one-word blank.
   *   Then it's a phrase method's argument, e.g. `it "nerds out with (another as a thing)"` (`quoted_type_expression`).
   */
  private static inferPlaceholders(
    alias: string[],
    type: P.TypeScope
  ): InferredPlaceholders | { unlisted: string } | undefined {
    const sources: string[] = []
    for (const word of alias) {
      // only a blank in parens:  a bare word is always just a word (epic page J9:  "require the parens")
      const blank = /^\((.+)\)$/.exec(word)?.[1]
      if (!blank) continue
      const listed = QuotedPropertyFormula.listedProperty(type, [P.singularize(blank)])
      if (!listed) return { unlisted: blank }
      sources.push(listed)
    }
    return sources.length ? { words: alias, sources } : undefined
  }

  /**
   * Property `name`'s own list of values on `type`, if it has one:
   * kept on the property, or as its plural class variable's instance twin,
   * e.g. `Suits` for `suit` (`define_property_has`).
   */
  private static enumerationOf(type: P.TypeScope, name: string): Array<string | number> | undefined {
    return type.variables.get(name)?.enumeration ?? type.variables.get(P.pluralize(upperFirst(name)))?.enumeration
  }

  /** Compute (and cache in `match.data.bits`) `bits` for making rules and AST nodes -- see the type. */
  getBits(match: P.MatchFor<this>): QuotedPropertyFormulaBits {
    return (match.data.bits ??= this.computeBits(match))
  }

  /** Actual work for `getBits()` -- see rule SIDE EFFECTs above. */
  private computeBits(match: P.MatchFor<this>): QuotedPropertyFormulaBits {
    const { groups } = match
    const alias = `${groups.alias.value}`
    const type = groups.type.value
    const { inferred } = match.data
    // the source properties' names, written (`for its suits`, found by `resolveSources()`) or inferred
    const sourceNames = inferred?.sources ?? match.data.sources ?? []

    const words: string[] = inferred?.words ?? alias.replace(/^["']|["']$/g, "").split(" ")
    const syntaxParts: string[] = []
    const ruleData: QuotedPropertyFormulaBits["ruleData"] = []
    const vars: string[] = []
    let sourceNum = 0
    const property = words
      .map((word) => {
        // output keywords directly into words/keywords immediately
        if (!word.startsWith("(")) {
          syntaxParts.push(word)
          return word
        }
        const instanceVar = word.slice(1, -1)
        vars.push(P.singularize(instanceVar))

        // Try to find the enumeration:  the property's own, or its value kind's
        const propertyName = sourceNames[sourceNum]
        const typeScope = match.scope.types?.get(type)
        const variable = typeScope?.variables.get(propertyName)
        const kindType = variable?.datatype ? typeScope?.getType(variable.datatype) : undefined
        const enumeration =
          (typeScope && QuotedPropertyFormula.enumerationOf(typeScope, `${propertyName}`)) ??
          kindType?.valueKind?.values
        // set up enumeration matcher
        if (variable && enumeration) {
          const placeholder = placeholderData(instanceVar, variable.enumerationValues || enumeration)
          ruleData.push(placeholder)
          // either inflection, e.g. `club` or `clubs` for `(suit)`;  a number as is, e.g. `2` for `(rank)`
          syntaxParts.push(`(expression:${placeholderForms(placeholder.values).join("|")})`)
        }
        // a value kind declared further down:  checked where the phrase is used -- see `QuotedPropertyRule`
        else if (kindType?.stub) {
          ruleData.push(placeholderData(instanceVar, [], kindType.name))
          syntaxParts.push("(expression:{constant}|{number})")
        } else {
          // FIXME: this routine is (somehow) geting called twice, once when type/variable IS NOT set up (???)
          // and then once later, when it IS set up.  Figure out why!
          // TODO: parse error instead?
          console.warn("couldn't figure out enumeration for ", type, propertyName)
        }
        sourceNum++
        return `$${instanceVar}`
      })
      .join("_")
    // `is` => every form of it, e.g. `isn't`, which negates;  `is a` => `are not a` too -- see `Negatable`
    const syntax = negatableSyntaxBits(match.scope, syntaxParts)
      // any other article matches every form of it, e.g. `a` or `an`, `el` or `la`:  the language's own
      .map((bit) => {
        const article = isWord(bit) && ARTICLES.find((rule) => Wording.reads(match.scope, rule, bit))
        return article ? `{${article}}` : bit
      })
      .join(" ")
    return { type, syntax, ruleData, vars, property, ...QuotedPropertyFormula.staticArgFor(match.scope, type) }
  }

  /**
   * `{ staticArg }` for a phrase on a sub-type of another of the project's types, e.g. `card` for a joker's:
   * see `QuotedPropertyFormulaBits.staticArg`.
   * - Why:  a phrase on a sub-type is used on its super-type's values, `the card is the red joker`,
   *   where an instance method would be missing:  a card has no `isTheColorJoker()`.
   * - A built-in super-type doesn't count, e.g. `a card is a drawable thing`:  only cards say a card's phrases.
   * - A lookup:  `getBits()` makes it while parsing.
   */
  private static staticArgFor(scope: P.Scope, type: string): { staticArg?: string } {
    const superType = scope.types?.get(type)?.superType
    const superScope = superType ? scope.types?.get(superType) : undefined
    if (!superScope || SP.isBuiltInTypeScope(superScope)) return {}
    return { staticArg: superScope.instanceName }
  }

  /** Register the quoted-phrase's generated `expression_suffix` rule -- see rule SIDE EFFECTs above. */
  mutateScope(match: P.MatchFor<this>) {
    const { syntax, property, ruleData, type, staticArg } = this.getBits(match)

    // Create an expression suffix to match the quoted statement, e.g. `is not? a queen`.
    // See `scope.addRule()` -- registers on the parser and records the pair for export.
    const kinds = ruleData.filter(({ kind }) => kind).map(({ instanceVar, kind }) => [instanceVar, kind!])
    match.scope.addRule(
      QuotedPropertyRule.specialize({
        output: property,
        of: type,
        values: Object.fromEntries(ruleData.map(({ instanceVar, values }) => [instanceVar, values])),
        ...(kinds.length ? { kinds: Object.fromEntries(kinds) } : {}),
        // a sub-type's phrase:  its static method, `Joker.isTheColorJoker(card, 'red')`
        ...(staticArg ? { staticOf: type } : {})
      }),
      { syntax },
      match
    )
  }

  /**
   * Its method:  each placeholder against its property, all of them true.
   * - Usually an instance method:  `isTheRankOfSuits(rank, suit) { return this.rank === rank && ... }`
   * - On a sub-type (`staticArg`), a static one checking the type first:
   *   `static isTheColorJoker(card, color) { return card instanceof Joker && card.color === color }`
   */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type } = match.groups
    const { vars, property, staticArg } = this.getBits(match)
    const args = vars.map((varName) => new P.ASTVariableExpression(match, { name: varName }))
    // a sub-type's phrase:  any of its super-type's things, e.g. `card: Card`
    const thing = staticArg
      ? new P.ASTVariableExpression(match, { name: staticArg, datatype: P.typeCase(staticArg) })
      : new P.ASTSelfLiteral(match)
    const expressions: P.ASTExpression[] = args.map(
      (variable, index) =>
        new P.ASTInfixExpression(match, {
          lhs: new P.ASTPropertyExpression(match, {
            object: thing,
            property: new P.ASTPropertyLiteral(match, vars[index]!)
          }),
          operator: "exactly equals",
          rhs: variable
        })
    )
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    // a sub-type's phrase:  is it one first, as `is a` asks -- see `is_a`
    if (staticArg) {
      const typeName = new P.ASTTypeNameLiteral(match, { value: typeAST.runtimeName, quote: "'" })
      expressions.unshift(
        new P.ASTCoreMethodInvocation(match, { methodName: "isOfType", args: [thing, typeName], datatype: "choice" })
      )
    }
    const method = new P.ASTMethodDefinition(match, {
      args: staticArg ? [thing as P.ASTVariableExpression, ...args] : args,
      body: new P.ASTReturnStatement(match, {
        value: P.ASTMultiInfixExpression(match, { expressions, operator: "and" })
      }),
      datatype: "choice"
    })
    const statements: Array<P.ASTStatement | P.ASTExpression | P.ASTComment | P.ASTBlankLine> = [
      staticArg
        ? new P.ASTStaticMethod(match, { type: typeAST, name: property, method })
        : new P.ASTPropertyDefinition(match, { type: typeAST, property, method })
    ]
    return new P.ASTStatementGroup(match, { statements })
  }
}

/** What `quoted_property_formula` stashes in `match.data`. */
type QuotedPropertyFormulaMatchData = {
  /** Cached result of `getBits()` -- see the type above. */
  bits?: QuotedPropertyFormulaBits
  /** Placeholders worked out while parsing, for a phrase with no `for its ...` -- see `inferPlaceholders()`. */
  inferred?: InferredPlaceholders
  /** The properties `for its ...` names, found while parsing, e.g. `["suit"]` -- see `resolveSources()`. */
  sources?: string[]
}

/** What `QuotedPropertyFormula.inferPlaceholders()` works out. */
type InferredPlaceholders = {
  /** The phrase's words, a placeholder in parens, e.g. `["is", "a", "(suit)"]`. */
  words: string[]
  /** Each placeholder's property, in order, e.g. `["suit"]`. */
  sources: string[]
}

/** Is `bit` of a syntax a plain word, not a `{rule}` or a `(group)`? */
function isWord(bit: string): boolean {
  return !bit.startsWith("{") && !bit.startsWith("(")
}

/** The article word rules a phrase's own article becomes, so it matches every form:  `el` matches `la` too. */
const ARTICLES = ["indefinite_article", "definite_article"]
