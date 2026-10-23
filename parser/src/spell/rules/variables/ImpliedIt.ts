import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority } from "spell-lang/spell/rules/rules.types"

/**
 * `implied_it` rule:  `it` LEFT OUT, before `is`, where the language drops its subject (epic `spanish` J96).
 * - e.g. Spanish's `si es un trébol` in a card's method:  `if it is a club`, `this.isATrébol`
 * - e.g. `rojo si es diamantes o corazones`, in `el "color" de un palo es:`:  `it` is the suit
 * - An operand taking NO tokens:  the verb after it is the expression's suffix, `is a club`.
 *   - So `CompoundExpression` takes it only with a suffix after it.
 *   - `Priority.preferred`:  before `no es`, it beats `no` read as a value, `false`.
 *     Nothing else can START with its words, which are the language's own.
 * - Only where `it` means something:  in a method or getter of a thing, or after `obtener`.
 * - Its `syntax` is the WORDS it may come before, each language's own:
 *   Spanish's `(es|está|esta|son|están|estan|no es|no está ...)`.
 *   - Registered with none, it never matches:  English writes its `it`.
 * - Compiles as the language's word for `it` would (`eso`):  the thing a method runs on, else the `it` variable.
 */
export class ImpliedIt extends P.Rule<P.RuleProps, never, ImpliedItMatchData> {
  @proto static alias = "expression"
  @proto static priority = Priority.preferred
  /** Editors colour it as they colour `it`:  a variable -- but it has no tokens to colour. */
  @proto static highlightAs?: P.HighlightKind = "variable"

  /** The words we may come before, compiled from our registered `syntax` -- `undefined` registered with none. */
  declare wordRule: P.Rule | undefined

  /** Our `syntax` is the words we come BEFORE, not our structure:  see class docs. */
  protected initFromSyntax(syntax: string) {
    this.wordRule ??= P.Rule.compileSyntax(syntax, this)
  }

  /** Are the tokens at `start` words we may come before, and does `it` mean something here? */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return (
      tokens[start] instanceof P.WordToken &&
      !!this.wordRule?.parse(scope, tokens.slice(start, start + 2)) &&
      !!scope.variables?.get("it")
    )
  }

  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!this.test(scope, tokens)) return undefined
    const match: P.MatchFor<this> = new P.Match({ rule: this, matched: [], value: "it", tokens: [], scope })
    match.data.scopeVar = scope.variables?.get("it")
    return match
  }

  /** Its value, `it`:  what a parser with no writer (rulex's) would make of it. */
  compile(match: P.MatchFor<this>) {
    return match.value
  }

  /** What `it` holds, if known. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.data.scopeVar?.datatype
  }

  /** The thing a method runs on (`this`), else the `it` variable:  as `SpellIdentifier.getAST()` writes `it`. */
  getAST(match: P.MatchFor<this>): P.ASTVariableExpression | P.ASTSelfLiteral {
    const variable = match.data.scopeVar
    if (variable?.output === "this") return new P.ASTSelfLiteral(match, { value: "this", raw: "" })
    const name = variable?.output || "it"
    return new P.ASTVariableExpression(match, { raw: "", name, variable, plurality: "singular" })
  }
}

/** What `implied_it` stashes on its matches. */
type ImpliedItMatchData = {
  /** The `it` variable it reads, looked up while parsing:  `getAST()` must be pure. */
  scopeVar?: P.ScopeVariable
}
