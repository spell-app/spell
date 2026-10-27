/**
 * Shared by the `properties` rule files:  the words a member's name stops at,
 * and how the `its_*` rules read `it`.
 */
import { NONE } from "spell/util"
import { P } from "spell-parser/parser"

/** What `its_*` rules stash on their matches. */
export type ItsMatchData = {
  /**
   * `it` in scope when parsed, or `NONE` => means `this`.
   * - Looked up THEN, not in `getAST()` -- see `SpellIdentifier`.
   */
  itVar?: P.ScopeVariable | typeof NONE
}

/** `it` as an object to read from:  the `it` we noted while parsing, else `this` -- see `ItsMatchData`. */
export function itsObject(match: P.Match<P.AnyGroups, ItsMatchData>): P.ASTExpression {
  const itVar = match.data.itVar === NONE ? undefined : match.data.itVar
  if (!itVar) return new P.ASTSelfLiteral(match)
  return new P.ASTVariableExpression(match, { raw: "it", name: itVar.output || itVar.name })
}
