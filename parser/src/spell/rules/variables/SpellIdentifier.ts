import { NONE, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { type IdentifierMatchData } from "./variables.shared"

/**
 * Single word variable name, known or unknown.
 * - Looks the word up in `scope.variables` WHILE PARSING, as `match.data.scopeVar`:
 *   if found, you can override what's output with `variable.output`.
 *   NOT when building the AST:  scope may have changed by then, e.g. `it` redefined by a later `get`.
 * - Its `datatype` is the scope variable's -- see `getDatatype()`.
 * - TODO: higher priority if variable is known?
 */
export class SpellIdentifier<MatchData extends P.AnyMatchData = P.AnyMatchData> extends P.Pattern<
  never,
  MatchData & IdentifierMatchData
> {
  /** Editors colour every identifier as a variable -- `SpellLanguageService` refines to `parameter` for arguments. */
  @proto static highlightAs?: P.HighlightKind = "variable"

  /**
   * Every identifier rule matches the same thing:
   * an alpha-numeric word (dashes / underscores OK), not the language's own (`test()`).
   */
  constructor(props?: Partial<P.PatternProps>) {
    super({ pattern: P.ALPHANUMERIC_WORD_WITH_DASHES, ...props })
  }

  /** Matches our `pattern`, and isn't one of the language's own words (its `blacklist`, `SP.LanguageWords`). */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return super.test(scope, tokens, start) && !SP.Language.of(scope).words.blacklist[`${tokens[start]!.value}`]
  }

  /**
   * Plurality of the word `match`ed:  `"either"` for uncountable words like `sheep`.
   * - A METHOD rather than something stashed in `parse()`:  only worked out when someone asks,
   *   and subclasses which know better override it, e.g. `singular_identifier` always says `"singular"`.
   * - Ask from elsewhere as `if (match.is(SpellIdentifier)) match.rule.getPlurality(match)`.
   * - A type's name in another language's grammar counts as that language does (epic `spanish` J89):
   *   `cards`, in a Spanish file naming an English `Card`, is plural -- see `SP.typeInItsOwnLanguage()`.
   */
  getPlurality(match: P.MatchFor<this>): P.Plurality {
    const word = `${match.raw ?? match.value}`
    const plurality = P.getPlurality(word)
    if (plurality === "plural") return plurality
    // a type's name in another language's grammar counts as that language does:  `cards` in Spanish (J89)
    const inItsOwn = SP.typeInItsOwnLanguage(match.scope, word)
    return inItsOwn ? P.Inflector.using(inItsOwn.language.inflector, () => P.getPlurality(word)) : plurality
  }

  /** Map value by converting dashes and whitespace to underscores. */
  mapValue<T = string>(value: string): T {
    return `${value}`.replace(/-/g, "_").replace(/\s/g, "_") as T
  }

  /** Match a word, remembering the scope variable it names as `match.data.scopeVar` -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) match.data.scopeVar = SpellIdentifier.scopeVariableFor(scope, match.value) ?? NONE
    return match
  }

  /**
   * The scope variable `name` names, if any.
   * - A language's word for `it` as an object (Spanish's `eso`, `SP.LanguageWords.itWords`) names the `it` variable,
   *   unless a variable of that name is in scope.
   */
  static scopeVariableFor(scope: P.Scope, name: string): P.ScopeVariable | undefined {
    const variables = scope.variables
    if (!variables) return undefined
    const named = variables.get(name)
    if (named || !SP.Language.of(scope).words.itWords?.has(name)) return named
    return variables.get("it")
  }

  /** What the variable it named holds, if known -- see `P.ScopeVariable.datatype`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const { scopeVar } = match.data
    return scopeVar === NONE ? undefined : scopeVar?.datatype
  }

  /**
   * Build `P.ASTVariableExpression`, resolving `match.value` to the scope variable it named when parsed, if any.
   * - A name that means the thing a method runs on (`it` in a card's method, or the method's own `(a card)`):
   *   the self literal, which each writer spells its way, `this` or `self`.
   *   Epic `python-target` P3, output-targets' T4.
   * - AST only knows singular / plural, so `"either"` goes out as `"singular"`.
   */
  getAST(match: P.MatchFor<this>): P.ASTVariableExpression | P.ASTSelfLiteral {
    // Scope variable it named when parsed, if any
    const { scopeVar } = match.data
    const variable = scopeVar === NONE ? undefined : scopeVar
    if (variable?.output === "this") return new P.ASTSelfLiteral(match, { value: "this", raw: match.raw })
    // Allow variable to override name if it wants to (e.g. "it");  a word for `it` (Spanish's `eso`) writes `it`
    const name = variable?.output ? variable.output : variable?.name === "it" ? "it" : match.value
    const plurality = this.getPlurality(match) === "plural" ? "plural" : "singular"
    return new P.ASTVariableExpression(match, { raw: match.raw, name, variable, plurality })
  }
}
