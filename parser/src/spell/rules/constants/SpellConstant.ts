import { NONE, proto, upperFirst } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { TextLiteral } from "spell/parser/spell/rules/core/TextLiteral"

/**
 * Base pattern rule for matching a single-word constant identifier (alpha-numeric, dashes/underscores).
 * - Sets `match.data.scopeConstant` to the existing `ScopeConstant` looked up by `scope.constants`, if any.
 *   Subclasses (e.g. `known_constant`) use this to require/reject a known constant.
 * - Other rules read it as `if (match.is(SpellConstant)) match.data.scopeConstant`.
 */
export class SpellConstant extends P.Pattern<never, ConstantMatchData> {
  /** Editors colour every constant as an enum member -- they're the values of enumerated properties. */
  @proto static highlightAs?: P.HighlightKind = "enumMember"

  /**
   * Every constant rule matches the same thing:
   * an alpha-numeric word (dashes / underscores OK), not the language's own (`test()`).
   */
  constructor(props?: Partial<P.PatternProps>) {
    super({ pattern: P.ALPHANUMERIC_WORD_WITH_DASHES, ...props })
  }

  /** Matches our `pattern`, and isn't one of the language's own words (its `blacklist`, `SP.LanguageWords`). */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return super.test(scope, tokens, start) && !SP.Language.of(scope).words.blacklist[`${tokens[start]!.value}`]
  }

  /** Match, then look up (but don't require) `match.data.scopeConstant` from `scope.constants`. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // Remember scope constant, if there is one.
    match.data.scopeConstant = scope.constants?.get(match.value) ?? NONE
    return match
  }

  /**
   * Build `P.ASTConstantExpression`, falling back to a fresh, unnamed `ScopeConstant` if unknown.
   * - Uses ONLY the constant found while parsing -- NOT looked up again, as scope may have changed by now.
   *   A statement which declares a constant it also uses records it on that match, e.g. `property_value_either`.
   */
  getAST(match: P.MatchFor<this>): P.ASTConstantExpression {
    const scopeConst = match.data.scopeConstant === NONE ? undefined : match.data.scopeConstant
    const name: string = scopeConst ? scopeConst.name : match.value
    const { valueOutput } = match.data
    return new P.ASTConstantExpression(match, {
      name,
      value: valueOutput ?? (scopeConst ? scopeConst.value : name),
      constant: scopeConst
    })
  }

  /**
   * SIDE EFFECT:  when `value` is a constant said for `property`, a built-in template's property in another language,
   * notes what it compiles to there, `match.data.valueOutput`:  `up` for `arriba`, in
   * `poner la dirección de c a arriba` and `si la dirección de c es arriba` (epic `language` T74).
   * - `property`:  a read of a property, `la dirección de c`, whose variable has `valueOutputs`;
   *   either side may be the property (`si arriba es la dirección de c`).
   * - Only where the value is said for the property:  `arriba` alone stays `arriba` -- see `P.ScopeVariable.valueOutputs`.
   * - Anything else:  nothing.  A lookup's result:  call it WHILE PARSING.
   */
  static sayFor(property: P.Match | undefined, value: P.Match | undefined) {
    const member = SpellConstant.memberOf(property) ?? SpellConstant.memberOf(value)
    const constant = SpellConstant.constantIn(value) ?? SpellConstant.constantIn(property)
    const output = member?.valueOutputs && constant ? member.valueOutputs[`${constant.value}`] : undefined
    if (constant && output !== undefined) constant.data.valueOutput = output
  }

  /**
   * SIDE EFFECT:  when `value` is one of `member`'s values, a constant or a quoted text, notes what it compiles to:
   * `locked` for `"bloqueado"`, in `- su candado es "bloqueado"`, on a line giving an inherited member a value.
   * - Anything else, or a member whose values are themselves:  nothing.  A lookup's result:  call it WHILE PARSING.
   */
  static sayForMember(member: P.ScopeVariable | undefined, value: P.Match | undefined) {
    if (!member?.valueOutputs) return
    const constant = SpellConstant.constantIn(value)
    if (constant) {
      const output = member.valueOutputs[`${constant.value}`]
      if (output !== undefined) constant.data.valueOutput = output
      return
    }
    for (let each = value; each; each = SpellConstant.onlyChild(each)) {
      if (each.is(TextLiteral)) return TextLiteral.sayAs(each as P.MatchFor<TextLiteral>, member.valueOutputs)
    }
  }

  /**
   * What's wrong with `value`, as a value of `member`:  the message, in `scope`'s language, or `undefined` if nothing is.
   * - Only a plain quoted text, `"banana"`:  anything else (`x`, `"[rank]"`) can only be known when it runs.
   * - Fine:  a value on its list, a word that stands for one, or the value itself (`"bloqueado"` or `"locked"`).
   * - A lookup's result:  call it WHILE PARSING.
   */
  static wrongValueMessage(
    scope: P.Scope,
    member: P.ScopeVariable | undefined,
    value: P.Match | undefined
  ): string | undefined {
    if (!member?.listedValues) return undefined
    const text = SpellConstant.plainTextIn(value)
    if (!text || SpellConstant.isListed(member, text.inner)) return undefined
    return SpellConstant.notOneOfMessage(scope, member, text.raw)
  }

  /**
   * As `wrongValueMessage()`, for a line naming both sides of a comparison or an assignment:
   * either may be the property (`if "banana" is its lock`).
   */
  static wrongValueOf(scope: P.Scope, property: P.Match | undefined, value: P.Match | undefined): string | undefined {
    const member = SpellConstant.memberOf(property)
    if (member) return SpellConstant.wrongValueMessage(scope, member, value)
    return SpellConstant.wrongValueMessage(scope, SpellConstant.memberOf(value), property)
  }

  /** Is `text` one of `member`'s values, a word that stands for one, or what one compiles to? */
  static isListed(member: P.ScopeVariable, text: string): boolean {
    const outputs = member.valueOutputs ?? {}
    return (
      (member.listedValues ?? []).some((value) => `${P.spellValueOf(value)}` === text) ||
      text in outputs ||
      Object.values(outputs).includes(text)
    )
  }

  /** `The lock can't be "banana":  it's one of unlocked, locked`, in `scope`'s language -- see `listedWordsOf()`. */
  static notOneOfMessage(scope: P.Scope, member: P.ScopeVariable, value: string): string {
    const language = SP.Language.of(scope)
    const what = upperFirst(language.withArticle("definite", member.asWritten ?? member.name))
    return language.parserMessage("not-one-of-its-values", {
      what,
      value,
      values: SpellConstant.listedWordsOf(member).join(", ")
    })
  }

  /** The words `member` can be, to show a person:  one for each value it compiles to, so `bloqueado`, not `bloqueada` too. */
  static listedWordsOf(member: P.ScopeVariable): string[] {
    const outputs = member.valueOutputs ?? {}
    const seen = new Set<string>()
    const words: string[] = []
    for (const listed of member.listedValues ?? []) {
      const word = `${P.spellValueOf(listed)}`
      const output = outputs[word] ?? word
      if (seen.has(output)) continue
      seen.add(output)
      words.push(word)
    }
    return words
  }

  /** SIDE EFFECT:  `value`, a constant's match, compiles as `output`:  `clubs` for `it is a club`. */
  static compileAs(value: P.Match | undefined, output: string): void {
    const constant = SpellConstant.constantIn(value)
    if (constant) constant.data.valueOutput = output
  }

  /** The plain quoted text `match` is, through matches of one child:  `undefined` for anything else, a fill-in's too. */
  private static plainTextIn(match: P.Match | undefined): { raw: string; inner: string } | undefined {
    for (let each = match; each; each = SpellConstant.onlyChild(each)) {
      if (!each.is(TextLiteral)) continue
      if ((each.data as { fillIns?: unknown }).fillIns) return undefined
      const token = each.matched[0] as P.TextToken
      return { raw: `${each.value}`, inner: TextLiteral.plainText(`${each.value}`, token) }
    }
    return undefined
  }

  /** The property variable `match` reads, through matches of one child (`expression`), if any. */
  private static memberOf(match: P.Match | undefined): P.ScopeVariable | undefined {
    for (let each = match; each; each = SpellConstant.onlyChild(each)) {
      const { member } = (each.data ?? {}) as { member?: unknown }
      if (member instanceof P.ScopeVariable) return member
    }
    return undefined
  }

  /** The constant `match` is, through matches of one child (`expression`), if any. */
  private static constantIn(match: P.Match | undefined): P.MatchFor<SpellConstant> | undefined {
    for (let each = match; each; each = SpellConstant.onlyChild(each)) {
      if (each.is(SpellConstant)) return each
    }
    return undefined
  }

  /** `match`'s one child match, if it has exactly one. */
  private static onlyChild(match: P.Match): P.Match | undefined {
    const children = (Array.isArray(match.matched) ? match.matched : []).filter((it) => it instanceof P.Match)
    return children.length === 1 ? (children[0] as P.Match) : undefined
  }

  /**
   * SIDE EFFECT:  if `constant` is an unknown constant's match, declares it in the project's constants,
   * by `statement` -- and records it on the match, for `getAST()`.
   * - e.g. `red` in `the color of a card is red if ...`, or in `red if it is diamonds or hearts`:
   *   later lines then know `red`, e.g. `expect the color of the card to be red`.
   * - Anything else, e.g. an expression's match:  nothing.  Call it from `mutateScope()`.
   */
  static declareValue(statement: P.Match, constant: P.Match | undefined) {
    if (!constant?.is(SpellConstant)) return
    const found = constant.data.scopeConstant
    if (found && found !== NONE) return
    const { scope } = statement
    const name = `${constant.raw}`
    const known = scope.constants?.get(name) ?? scope.constants?.add({ name, declaredBy: statement })[0]
    if (known) constant.data.scopeConstant = known
  }
}

/** What constant rules stash on their matches. */
type ConstantMatchData = {
  /** Existing `ScopeConstant` looked up in `scope.constants` while parsing, or `NONE` if scope doesn't know it. */
  scopeConstant?: P.ScopeConstant | typeof NONE
  /** What it compiles to as the value of a built-in template's property, said in another language -- see `sayFor()`. */
  valueOutput?: string
}
