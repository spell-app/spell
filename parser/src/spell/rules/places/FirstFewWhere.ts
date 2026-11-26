import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import { savedPlaceOfMatch } from "./places.shared"

/**
 * `first_few_where` rule:  a few of a type, by its plural (epic `data` P11).
 * - e.g. `the first 20 recipes where it is quick`
 * - e.g. `the first 8 recipes`, with no `where`:  only of a type saved in a place, asked for as one page of 8.
 * - Asks a place for no more than it needs:  all of the `where` handed over, a page of that many;
 *   some of it checked here, page by page until that many pass (`EveryThing.savedAST()`).
 * - Compiles to `core.firstFew(core.filter(every, ...), 20)`, for a type kept in memory.
 */
export class FirstFewWhere extends SpellExpression<"number|type|where?|body?"> {
  /** With no `where`, only a type saved in a place:  anything else reads as it always did. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || match.groups.where) return match
    return savedPlaceOfMatch(match.groups.type) ? match : undefined
  }

  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOf(SP.typeName(`${match.groups.type.value}`))
  }

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    return getWhereScope(match, type, match, P.instanceCase(SP.typeName(`${type.value}`)))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type, number, where } = match.groups
    const first = Number(number.raw)
    if (!where) return EveryThing.savedAST(match, type, { first })!
    const body = this.getBody(match)
    const predicate = getWhereMethod(match, type, body)
    const count = P.asAST<P.ASTExpression>(number.AST)
    const handed = EveryThing.savedAST(match, type, { predicate, first })
    if (handed) return handed
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "firstFew",
      args: [
        new P.ASTCoreMethodInvocation(match, {
          methodName: "filter",
          args: [EveryThing.listAST(match, type), predicate]
        }),
        count
      ]
    })
  }
}
