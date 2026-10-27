import { NONE } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { itsObject, type ItsMatchData } from "./properties.shared"

/**
 * `its_ordinal` rule:  `its {ordinal} {arg}` -- possessive-plus-ordinal shorthand, e.g. `its third card`.
 * - Tracks `it`:  `get it` / `put its foo in the bar`.
 * - Synonym for `this` if `it` is not (yet) defined in scope.
 * - Compiles to `core.getItemAt(object, index)` rather than a plain property access:
 *   `its third card` => `core.getItemAt(it, 2)`.
 */
export class ItsOrdinal extends SpellExpression<"ordinal|arg", ItsMatchData & { itemType?: P.Datatype }> {
  /** Note `it`, and what it holds, while we can look them up. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const itVar = (match.data.itVar = scope.variables?.get("it") ?? NONE)
    if (itVar !== NONE) match.data.itemType = scope.getItemType(itVar.datatype)
    return match
  }
  /** An item of `it`, e.g. `Card` for `its first card` in a method of decks. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.data.itemType
  }
  getAST(match: P.MatchFor<this>) {
    const { ordinal } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "getItemAt",
      args: [itsObject(match), P.asAST<P.ASTExpression>(ordinal.AST)]
    })
  }
}
