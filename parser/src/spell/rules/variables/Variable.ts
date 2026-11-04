import { NONE } from "spell/util"
import { P } from "spell/parser/parser"
import { MemberReadExpression } from "spell/parser/spell/rules/properties"
import { SpellIdentifier } from "./SpellIdentifier"
import { type IdentifierMatchData } from "./variables.shared"

/**
 * `variable` rule:  `SpellIdentifier` which may or may not be known, with optional `the` prefix, e.g. `the thing`.
 * - `match.data.scopeVar` is set to the scope `ScopeVariable` if known, `NONE` if not.
 * - Inside an action, `the X` naming only its thing's property is not ours -- see `namesOwnProperty()`.
 */
export class Variable extends P.Sequence<"identifier", VariableMatchData> {
  parse(scope: P.Scope, tokens: P.Token[]) {
    // `super.parse()` is typed for any rule -- we know it's ours.
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // Remember scope variable for the identifier, if there is one.
    match.data.scopeVar = (match.groups.identifier.data as IdentifierMatchData).scopeVar ?? NONE
    if (Variable.namesOwnProperty(scope, match)) return undefined
    Variable.warnIfHidesProperty(match)
    return match
  }

  /**
   * Is this `the X` in an action whose thing has a property `X`, and no variable goes by that name?
   * - Then we step aside, and `the_own_property` takes it:  `set the side to back` writes `this.side`,
   *   rather than making a local nobody meant (epic `language`, Q1).
   * - Said without the article, `set side to back` still makes a local.
   */
  private static namesOwnProperty(scope: P.Scope, match: P.MatchFor<Variable>): boolean {
    const { identifier } = match.groups
    if (match.data.scopeVar !== NONE || match.length === identifier.length) return false
    return !!P.MethodScope.thingTypeOf(scope)?.hasProperty(`${identifier.raw}`)
  }
  /** `the X` naming a real variable (not an alias, `it` or the action's thing) may be hiding a property. */
  private static warnIfHidesProperty(match: P.MatchFor<Variable>): void {
    const { identifier } = match.groups
    const { scopeVar } = match.data
    if (scopeVar === NONE || !scopeVar || scopeVar.isAlias || match.length === identifier.length) return
    MemberReadExpression.warnIfHidesProperty(match, identifier)
  }

  /** What the variable it named holds, if known -- see `P.ScopeVariable.datatype`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const { scopeVar } = match.data
    return scopeVar === NONE ? undefined : scopeVar?.datatype
  }
  getAST(match: P.MatchFor<this>): P.ASTVariableExpression {
    // `the` adds nothing -- output is whatever the identifier outputs.
    return match.groups.identifier.AST as P.ASTVariableExpression
  }

  /**
   * Plurality of our identifier -- `the` adds nothing here either.
   * - Same signature as `SpellIdentifier.getPlurality()`, so callers needn't care which they've got.
   */
  getPlurality(match: P.MatchFor<this>): P.Plurality {
    const { identifier } = match.groups
    // Syntax guarantees this, but the type system can't know which rule `{identifier}` resolves to.
    if (!identifier.is(SpellIdentifier)) throw new TypeError(`Expected an identifier, got '${identifier.raw}'.`)
    return identifier.rule.getPlurality(identifier)
  }
}

/** What `variable` / `known_variable` stash on their matches. */
type VariableMatchData = IdentifierMatchData
