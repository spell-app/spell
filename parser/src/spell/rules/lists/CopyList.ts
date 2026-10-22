import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell-lang/spell/rules/expressions"

/**
 * `copy_list` rule:  duplicate a list, e.g. `a copy of the piles` => `core.duplicateList(piles)`.
 * - QUESTIONABLE SYNTAX: `as (a|an) {type}` clause ??? -- picks constructor for result, e.g.
 *   `a duplicate of list the piles as a list` => `core.duplicateList(piles, List)`.
 */
export class CopyList extends SpellExpression<"expression|type?"> {
  /** The type it's copied `as`, else what it copies. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const { expression, type } = match.groups
    return type ? SP.typeName(`${type.value}`) : expression.datatype
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { expression, type } = match.groups
    const args = [P.matchAST(expression)]
    if (type) args.push(P.matchAST(type))
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "duplicateList",
      args
    })
  }
}
