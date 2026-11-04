import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"

/**
 * `first_few_where` rule:  a few of a type, by its plural (epic `data` P11).
 * - e.g. `the first 20 recipes where it is quick`
 * - Asks a place for no more than it needs, when it can tell it can.
 * - Compiles to `core.firstFew(core.filter(every, ...), 20)`;  a place's own where it can:  `EveryThing.savedAST()`.
 */
export class FirstFewWhere extends SpellExpression<"number|type|body?"> {
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOfType(SP.typeName(`${match.groups.type.value}`))
  }

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    return getWhereScope(match, type, match, P.instanceCase(SP.typeName(`${type.value}`)))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type, number } = match.groups
    const body = this.getBody(match)
    const predicate = getWhereMethod(match, type, body)
    const count = P.asAST<P.ASTExpression>(number.AST)
    const handed = EveryThing.savedAST(match, type, { predicate, first: Number(number.raw) })
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
