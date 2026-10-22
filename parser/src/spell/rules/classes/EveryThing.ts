import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell-lang/spell/rules/expressions"

/**
 * `every_thing` rule:  every thing of a type the program has made, in the order made (epic page `outline-spell`, P16).
 * - e.g. `every pile`:  the stock, the discards, the foundations and the tableaus, sub-types included
 * - e.g. `the first pile in every pile where it can take the card`
 * - Compiles to core's `core.everyThing(Pile)`, a scratch list:  it takes none of them from the lists that hold them.
 * - Only the program's things:  a thing a test made isn't in it.
 */
export class EveryThing extends SpellExpression<"type"> {
  /** A list of the type, e.g. `list of piles`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOf(SP.typeName(`${match.groups.type.value}`))
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "everyThing",
      args: [P.matchAST<P.ASTTypeExpression>(match.groups.type)]
    })
  }
}
